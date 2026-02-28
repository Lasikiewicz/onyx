import { ipcMain, dialog } from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { SteamService } from '../SteamService.js';
import { XboxService } from '../XboxService.js';
import { GameStore, Game } from '../GameStore.js';
import { ImageCacheService } from '../ImageCacheService.js';
import type { UserPreferencesService, UserPreferences } from '../UserPreferencesService.js';
import type { ImageQueueItem } from '../ImageOptimizationQueue.js';
import type { ImageJobStatus } from '../ImageOptimizationController.js';

type ImageQueue = { add: (gameId: string, gameTitle: string, urls: ImageQueueItem['urls']) => void };

export type OptimizationControllerAPI = {
    startRun: (mode: 'importer' | 'cache') => string;
    addJobs: (runId: string, jobs: (Omit<ImageJobStatus, 'jobId'> & { jobId?: string })[]) => void;
    updateJob: (runId: string, jobId: string, patch: Partial<Pick<ImageJobStatus, 'phase' | 'fileName' | 'originalBytes' | 'optimizedBytes' | 'error'>>) => void;
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
    // Return library as-is. Do not validate/fix onyx-local URLs here - it caused reload to hang
    // (hundreds of cache lookups). URL resolution happens when loading images in the UI.
    ipcMain.handle('gameStore:getLibrary', async () => {
        try {
            return await gameStore.getLibrary();
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
            const hasImageUrls = [game.boxArtUrl, game.bannerUrl, game.alternativeBannerUrl, game.logoUrl, game.heroUrl, game.iconUrl].some(Boolean);
            if (imageQueue && hasImageUrls) {
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

    ipcMain.handle('imageCache:optimizeExisting', async (event, options?: { webpOnly?: boolean }) => {
        try {
            const runId = optimizationController?.startRun('cache') ?? null;
            if (runId && optimizationController) {
                const toProcess = imageCacheService.listFilesToOptimize(options);
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
            }
            const optimizationPerformance = (await userPreferencesService?.getPreferences())?.optimizationPerformance;
            const result = await imageCacheService.optimizeExistingCache((data) => {
                if (runId && optimizationController) {
                    const phase =
                        data.status === 'ok' ? 'done' : data.status === 'fail' ? 'failed' : 'optimizing';
                    optimizationController.updateJob(runId, data.fileName, {
                        phase,
                        fileName: data.fileName,
                        originalBytes: data.originalBytes,
                        optimizedBytes: data.optimizedBytes,
                        error: data.status === 'fail' ? 'Optimization failed' : undefined,
                    });
                }
                event.sender.send('imageCache:optimizeProgress', data);
            }, {
                ...options,
                optimizationPerformance,
            });
            if (runId && optimizationController) optimizationController.finishRun(runId);
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
                    boxArtUrl: game.boxArtUrl,
                    bannerUrl: game.bannerUrl,
                    alternativeBannerUrl: game.alternativeBannerUrl,
                    logoUrl: game.logoUrl,
                    heroUrl: game.heroUrl,
                    iconUrl: game.iconUrl,
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
}
