import { ipcMain, dialog } from 'electron';
import path from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { SteamService } from '../SteamService.js';
import { XboxService } from '../XboxService.js';
import { GameStore, Game } from '../GameStore.js';
import { ImageCacheService } from '../ImageCacheService.js';
import type { UserPreferencesService, UserPreferences } from '../UserPreferencesService.js';
import type { ImageQueueItem } from '../ImageOptimizationQueue.js';
import type { ImageJobStatus } from '../ImageOptimizationController.js';

type ImageQueue = { add: (gameId: string, gameTitle: string, urls: ImageQueueItem['urls']) => void };

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function isAnimatedPng(buffer: Buffer): boolean {
    if (buffer.length < 8) return false;
    if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) return false;

    let offset = 8;
    while (offset + 8 <= buffer.length) {
        const chunkLength = buffer.readUInt32BE(offset);
        const chunkTypeStart = offset + 4;
        const chunkDataStart = offset + 8;
        const nextChunkStart = chunkDataStart + chunkLength + 4; // +CRC

        if (nextChunkStart > buffer.length) return false;

        const chunkType = buffer.toString('ascii', chunkTypeStart, chunkTypeStart + 4);
        if (chunkType === 'acTL') return true;
        if (chunkType === 'IEND') return false;

        offset = nextChunkStart;
    }

    return false;
}

export type OptimizationControllerAPI = {
    startRun: (mode: 'importer' | 'cache') => string;
    addJobs: (runId: string, jobs: (Omit<ImageJobStatus, 'jobId'> & { jobId?: string })[]) => void;
    updateJob: (runId: string, jobId: string, patch: Partial<Pick<ImageJobStatus, 'phase' | 'fileName' | 'originalBytes' | 'optimizedBytes' | 'error' | 'decisionReason' | 'attemptSummary'>>) => void;
    setRuntimeMetrics: (metrics: {
        profile?: 'low' | 'balanced' | 'high';
        cpuCount?: number;
        reserveCores?: number;
        availableWorkers?: number;
        maxWorkers?: number;
        activeWorkers?: number;
        queuedGames?: number;
        allStaticComplete?: boolean;
        systemCpuUsage?: number;
    }) => void;
    finishRun: (runId: string) => void;
};

export function registerGameIPCHandlers(
    steamService: SteamService,
    xboxService: XboxService,
    gameStore: GameStore,
    imageCacheService: ImageCacheService,
    userPreferencesService?: UserPreferencesService,
    imageQueue?: ImageQueue,
    optimizationController?: OptimizationControllerAPI
) {
    const resolveOnyxLocalToFileUrl = (url?: string): string | undefined => {
        if (!url || !url.startsWith('onyx-local://')) return url;
        const urlPath = url.replace(/^onyx-local:\/\/\/?/, '').replace(/\/+$/, '');
        const match = urlPath.match(/^([^-]+(?:-[^-]+)*?)-(boxart|banner|alternativeBanner|logo|hero|icon|screenshot-\d+)$/);
        if (!match) return url;

        const gameIdFromUrl = match[1];
        const imageTypeFromUrl = match[2];
        const safeGameId = gameIdFromUrl.replace(/[<>:"/\\|?*]/g, '_');
        const cacheDir = imageCacheService.getCacheDir();
        const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.ico', '.avif'];

        for (const ext of extensions) {
            const filePath = path.join(cacheDir, `${safeGameId}-${imageTypeFromUrl}${ext}`);
            if (existsSync(filePath)) {
                const normalized = filePath.replace(/\\/g, '/');
                return `file:///${encodeURI(normalized)}`;
            }
        }

        return url;
    };

    // Steam Service Handlers
    ipcMain.handle('steam:scanGames', async () => {
        try {
            let steamPath: string;
            try {
                steamPath = steamService.getSteamPath();
            } catch (pathError) {
                console.warn('Steam path not yet configured');
                return [];
            }

            if (!existsSync(steamPath)) {
                console.warn(`Steam path does not exist: ${steamPath}`);
                return [];
            }

            return steamService.scanSteamGames();
        } catch (error) {
            console.error('Error in steam:scanGames handler:', error);
            return [];
        }
    });

    ipcMain.handle('steam:getSteamPath', () => {
        try {
            return steamService.getSteamPath();
        } catch (error) {
            return '';
        }
    });

    ipcMain.handle('steam:setSteamPath', async (_event, path: string) => {
        steamService.setSteamPath(path);
        return { success: true };
    });

    ipcMain.handle('steam:scanGamesWithPath', async (_event, scanPath?: string, autoMerge: boolean = false) => {
        try {
            const games = await steamService.scanSteamGames();
            if (autoMerge) {
                await gameStore.mergeSteamGames(games, imageCacheService, true);
            }
            return games;
        } catch (error) {
            console.error('Error in steam:scanGamesWithPath handler:', error);
            return [];
        }
    });

    ipcMain.handle('steam:importAllGames', async (_event, scanPath?: string) => {
        const games = await steamService.scanSteamGames();
        await gameStore.mergeSteamGames(games, imageCacheService, true);
        return { success: true, count: games.length };
    });

    ipcMain.handle('steam:syncPlaytime', async () => {
        try {
            // SteamService doesn't have a direct syncPlaytimeWithGames method in this version,
            // so this would need to fetch playtime per game and update.
            // Placeholder returning success for now to avoid crashes.
            return { success: true };
        } catch (error) {
            console.error('Error in steam:syncPlaytime handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    // Xbox Service Handlers
    ipcMain.handle('xbox:scanGames', async (_event, path: string, autoMerge: boolean = false) => {
        try {
            const games = await xboxService.scanGames(path);
            if (autoMerge) {
                // Merge logic if needed
            }
            return games;
        } catch (error) {
            console.error('Error in xbox:scanGames handler:', error);
            return [];
        }
    });

    // GameStore Handlers
    // Return library with *IsVideo enriched from cache so onyx-local .webm assets render as <video>.
    ipcMain.handle('gameStore:getLibrary', async () => {
        try {
            const games = await gameStore.getLibrary();
            try {
                const isWebmUrl = (url?: string) => !!url && /\.webm(\?|$)/i.test(url);
                const cacheDir = imageCacheService.getCacheDir();
                if (existsSync(cacheDir)) {
                    const { readdirSync } = require('node:fs');
                    const files = readdirSync(cacheDir) as string[];
                    const webmKeys = new Set<string>();
                    for (const f of files) {
                        const fl = f.toLowerCase();
                        if (fl.endsWith('.webm')) webmKeys.add(fl.slice(0, -5));
                    }
                    const entries: { urlKey: keyof Game; flagKey: keyof Game; keySuffix: string }[] = [
                        { urlKey: 'boxArtUrl', flagKey: 'boxArtIsVideo', keySuffix: 'boxart' },
                        { urlKey: 'bannerUrl', flagKey: 'bannerIsVideo', keySuffix: 'banner' },
                        { urlKey: 'alternativeBannerUrl', flagKey: 'alternativeBannerIsVideo', keySuffix: 'alternativebanner' },
                        { urlKey: 'logoUrl', flagKey: 'logoIsVideo', keySuffix: 'logo' },
                        { urlKey: 'heroUrl', flagKey: 'heroIsVideo', keySuffix: 'hero' },
                        { urlKey: 'iconUrl', flagKey: 'iconIsVideo', keySuffix: 'icon' },
                    ];
                    for (const g of games) {
                        const safeId = g.id.replace(/[<>:"/\\|?*]/g, '_').toLowerCase();
                        for (const { urlKey, flagKey, keySuffix } of entries) {
                            const url = g[urlKey];
                            if (!url || typeof url !== 'string') continue;
                            if (g[flagKey as keyof Game]) continue;
                            if (isWebmUrl(url)) {
                                (g as unknown as Record<string, boolean>)[flagKey as string] = true;
                                continue;
                            }
                            if (url.startsWith('onyx-local://') && webmKeys.has(`${safeId}-${keySuffix}`)) {
                                (g as unknown as Record<string, boolean>)[flagKey as string] = true;
                            }
                        }
                    }
                }
            } catch (enrichErr) {
                console.warn('gameStore:getLibrary enrichment failed:', enrichErr);
            }
            return games;
        } catch (error) {
            console.error('Error in gameStore:getLibrary handler:', error);
            return [];
        }
    });

    /** Clear all games and image cache (e.g. for Nuclear → re-run importer). Does not relaunch. */
    ipcMain.handle('gameStore:clearLibrary', async () => {
        try {
            await gameStore.clearLibrary();
            await imageCacheService.clearCache();
            return { success: true };
        } catch (error) {
            console.error('Error in gameStore:clearLibrary handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    /** Clear all image URLs and cached images for every game (IMAGES ONLY → then open importer to re-fetch). */
    ipcMain.handle('gameStore:clearAllImages', async () => {
        try {
            const games = await gameStore.getLibrary();
            for (const game of games) {
                await imageCacheService.deleteAllGameImages(game.id);
                await gameStore.saveGame({
                    ...game,
                    boxArtUrl: '',
                    bannerUrl: '',
                    alternativeBannerUrl: undefined,
                    logoUrl: '',
                    heroUrl: '',
                    iconUrl: '',
                });
            }
            return { success: true };
        } catch (error) {
            console.error('Error in gameStore:clearAllImages handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    /** Clear all links for every game (LINKS ONLY → then open importer to re-fetch). */
    ipcMain.handle('gameStore:clearAllLinks', async () => {
        try {
            const games = await gameStore.getLibrary();
            for (const game of games) {
                await gameStore.saveGame({ ...game, links: [] });
            }
            return { success: true };
        } catch (error) {
            console.error('Error in gameStore:clearAllLinks handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('gameStore:saveGame', async (_event, game: Game, oldGame?: Game) => {
        try {
            if (oldGame && oldGame.id !== game.id) {
                await gameStore.deleteGame(oldGame.id);
            }

            // Use the same pipeline everywhere: Background image optimization queue (importer path).
            // Save game first, then queue images for download/optimize; queue updates game when done.
            await gameStore.saveGame(game);
            const urls = [game.boxArtUrl, game.bannerUrl, game.alternativeBannerUrl, game.logoUrl, game.heroUrl, game.iconUrl].filter(Boolean) as string[];
            const hasImageUrls = urls.length > 0;
            const allOnyxLocal = hasImageUrls && urls.every((u) => u.startsWith('onyx-local://'));
            if (imageQueue && hasImageUrls && !allOnyxLocal) {
                imageQueue.add(game.id, game.title, {
                    boxArtUrl: game.boxArtUrl,
                    bannerUrl: game.bannerUrl,
                    alternativeBannerUrl: game.alternativeBannerUrl,
                    logoUrl: game.logoUrl,
                    heroUrl: game.heroUrl,
                    iconUrl: game.iconUrl,
                });
            }
            return true;
        } catch (error) {
            console.error('Error in gameStore:saveGame handler:', error);
            return false;
        }
    });

    ipcMain.handle('gameStore:reorderGames', async (_event, games: Game[]) => {
        try {
            await gameStore.reorderGames(games);
            return true;
        } catch (error) {
            return false;
        }
    });

    ipcMain.handle('gameStore:deleteGame', async (_event, gameId: string) => {
        try {
            // Clean up cached images before deleting the game
            await imageCacheService.deleteAllGameImages(gameId);
            await gameStore.deleteGame(gameId);
            return true;
        } catch (error) {
            return false;
        }
    });

    ipcMain.handle('gameStore:migratePerGameViewSizeOverrides', async () => {
        try {
            const overrides = await gameStore.migratePerGameViewSizeOverrides();
            return { success: true, overrides };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error', overrides: {} };
        }
    });

    ipcMain.handle('gameStore:addCustomGame', async (_event, gameData: { title: string; exePath: string }) => {
        try {
            await gameStore.saveGame({
                id: `custom-${Date.now()}`,
                title: gameData.title,
                exePath: gameData.exePath,
                platform: 'other',
                boxArtUrl: '',
                bannerUrl: '',
                status: 'ready'
            } as Game);
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('gameStore:removeWinGDKGames', async () => {
        const removedCount = await gameStore.removeMissingGames(); // Reusing removeMissingGames logic or dedicated one
        return { success: true, removedCount };
    });

    // ImageCache Handlers
    ipcMain.handle('imageCache:deleteImage', async (_event, gameId: string, imageType: string) => {
        try {
            await imageCacheService.deleteCachedImage(gameId, imageType as any);
            return { success: true };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('imageCache:optimizeExisting', async (event, options?: { webpOnly?: boolean; forceProcessOverBytes?: number; forceAnimatedWebp?: boolean }) => {
        try {
            const runId = optimizationController?.startRun('cache') ?? null;
            const toProcess = imageCacheService.listFilesToOptimize(options);
            const optimizationPerformance = (await userPreferencesService?.getPreferences())?.optimizationPerformance ?? 'balanced';
            const runtimeByProfile: Record<'low' | 'balanced' | 'high', { reserveCores: number; maxImageWorkers: number }> = {
                low: { reserveCores: 4, maxImageWorkers: 1 },
                balanced: { reserveCores: 2, maxImageWorkers: 1 },
                high: { reserveCores: 1, maxImageWorkers: 2 },
            };
            const runtimeProfile = optimizationPerformance === 'low' || optimizationPerformance === 'high' ? optimizationPerformance : 'balanced';
            if (runId && optimizationController) {
                const games = await gameStore.getLibrary();
                const titleByGameId: Record<string, string> = Object.fromEntries(games.map((g) => [g.id, g.title]));
                optimizationController.addJobs(
                    runId,
                    toProcess.map((p) => ({
                        jobId: p.file,
                        gameId: p.gameId,
                        gameTitle: titleByGameId[p.gameId] ?? p.gameId,
                        imageType: p.imageType,
                        source: 'cache' as const,
                        phase: 'queued' as const,
                        fileName: p.file,
                        sourceExt: p.file.includes('.') ? p.file.split('.').pop()?.toUpperCase() : undefined,
                    }))
                );

                const profileLimits = runtimeByProfile[runtimeProfile];
                const cpuCount = cpus().length || 2;
                const availableWorkers = Math.max(1, cpuCount - profileLimits.reserveCores);
                const maxWorkers = Math.max(1, Math.min(profileLimits.maxImageWorkers, availableWorkers));
                const queuedGames = new Set(toProcess.map((entry) => entry.gameId)).size;

                optimizationController.setRuntimeMetrics({
                    profile: runtimeProfile,
                    cpuCount,
                    reserveCores: profileLimits.reserveCores,
                    availableWorkers,
                    maxWorkers,
                    activeWorkers: toProcess.length > 0 ? maxWorkers : 0,
                    queuedGames,
                    allStaticComplete: true,
                });
            }

            const result = await imageCacheService.optimizeExistingCache((data) => {
                if (runId && optimizationController) {
                    const statusText = (data.status ?? '').toLowerCase();
                    const phase =
                        statusText === 'ok'
                            ? 'done'
                            : statusText === 'fail' || statusText.startsWith('fail')
                                ? 'failed'
                                : statusText.startsWith('skipped')
                                    ? 'skipped'
                                    : 'optimizing';
                    optimizationController.updateJob(runId, data.fileName, {
                        phase,
                        fileName: data.fileName,
                        originalBytes: data.originalBytes,
                        optimizedBytes: data.optimizedBytes,
                        error:
                            phase === 'failed'
                                ? (data.status || 'Optimization failed')
                                : phase === 'skipped'
                                    ? (data.status || 'Skipped')
                                    : undefined,
                    });
                }
                event.sender.send('imageCache:optimizeProgress', data);
            }, {
                ...options,
                optimizationPerformance,
            });
            if (runId && optimizationController) {
                const profileLimits = runtimeByProfile[runtimeProfile];
                const cpuCount = cpus().length || 2;
                const availableWorkers = Math.max(1, cpuCount - profileLimits.reserveCores);
                const maxWorkers = Math.max(1, Math.min(profileLimits.maxImageWorkers, availableWorkers));
                const queuedGames = new Set(toProcess.map((entry) => entry.gameId)).size;
                optimizationController.setRuntimeMetrics({
                    profile: runtimeProfile,
                    cpuCount,
                    reserveCores: profileLimits.reserveCores,
                    availableWorkers,
                    maxWorkers,
                    activeWorkers: 0,
                    queuedGames,
                    allStaticComplete: true,
                });
                optimizationController.finishRun(runId);
            }
            return { success: true, ...result };
        } catch (error) {
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error', optimized: 0, skipped: 0, failed: 0 };
        }
    });

    ipcMain.handle('imageQueue:optimizeGames', async (_event, options?: { gameIds?: string[]; allGames?: boolean }) => {
        if (!imageQueue) {
            return { success: false, error: 'Image optimization queue is unavailable', queuedGames: 0, queuedImages: 0 };
        }

        try {
            const library = await gameStore.getLibrary();
            const requestedIds = new Set((options?.gameIds || []).filter(Boolean));
            const targetGames = options?.allGames
                ? library
                : library.filter((game) => requestedIds.has(game.id));

            let queuedGames = 0;
            let queuedImages = 0;

            for (const game of targetGames) {
                const urls = {
                    boxArtUrl: resolveOnyxLocalToFileUrl(game.boxArtUrl),
                    bannerUrl: resolveOnyxLocalToFileUrl(game.bannerUrl),
                    alternativeBannerUrl: resolveOnyxLocalToFileUrl(game.alternativeBannerUrl),
                    logoUrl: resolveOnyxLocalToFileUrl(game.logoUrl),
                    heroUrl: resolveOnyxLocalToFileUrl(game.heroUrl),
                    iconUrl: resolveOnyxLocalToFileUrl(game.iconUrl),
                };

                const imageCount = Object.values(urls).filter((value) => Boolean(value)).length;
                if (imageCount === 0) continue;

                imageQueue.add(game.id, game.title, urls);
                queuedGames += 1;
                queuedImages += imageCount;
            }

            return { success: true, queuedGames, queuedImages };
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to queue optimization jobs',
                queuedGames: 0,
                queuedImages: 0,
            };
        }
    });

    ipcMain.handle('imageCache:getFfmpegStatus', () => ImageCacheService.getFfmpegStatus());

    /** Cache a local file (e.g. .webm) for a game and return the onyx-local URL + isVideo. Used so the renderer never sets file:// URLs that break <img>. */
    ipcMain.handle('imageCache:cacheLocalFile', async (_event, filePath: string, gameId: string, imageType: string) => {
        if (!filePath || !gameId || !imageType) return { url: null, isVideo: false, error: 'Missing file or image target.' };
        const ext = (filePath.includes('.') ? (filePath.split('.').pop() ?? '') : '').toLowerCase();
        const isVideo = ext === 'webm';

        if (ext === 'png') {
            try {
                const fileBuffer = readFileSync(filePath);
                if (isAnimatedPng(fileBuffer)) {
                    return {
                        url: null,
                        isVideo: false,
                        error: 'Animated PNG (APNG) files are not supported. Please use a static PNG/JPG, or upload WEBM for animated artwork.',
                    };
                }
            } catch {
                return { url: null, isVideo: false, error: 'Failed to read selected file.' };
            }
        }

        const fileUrl = 'file:///' + filePath.replace(/\\/g, '/');
        const url = await imageCacheService.cacheImage(fileUrl, gameId, imageType as 'boxart' | 'banner' | 'logo' | 'hero' | string);
        if (!url || url.trim() === '') {
            return { url: null, isVideo, error: 'Failed to add file to cache. Try another file.' };
        }
        return { url, isVideo };
    });

    // Dialog Handlers (Moved here for convenience if no uiHandlers.ts exists yet)
    ipcMain.handle('dialog:showOpenDialog', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openFile'] });
        return result.filePaths[0] || null;
    });

    ipcMain.handle('dialog:showFolderDialog', async () => {
        const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
        return result.filePaths[0] || null;
    });

    ipcMain.handle('dialog:showImageDialog', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['jpg', 'png', 'gif', 'webp', 'ico', 'svg'] }]
        });
        return result.filePaths[0] || null;
    });

    ipcMain.handle('dialog:showImageOrWebmDialog', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openFile'],
            filters: [
                { name: 'Images & WEBM', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'ico', 'svg', 'webm'] },
                { name: 'WEBM video', extensions: ['webm'] },
                { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'ico', 'svg'] }
            ]
        });
        return result.filePaths[0] || null;
    });
}
