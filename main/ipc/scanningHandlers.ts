import { BrowserWindow, ipcMain } from 'electron';
import { dirname } from 'node:path';
import { GameStore } from '../GameStore.js';
import { AppConfigService } from '../AppConfigService.js';
import { ImportService } from '../ImportService.js';
import { MetadataFetcherService } from '../MetadataFetcherService.js';
import { ImageCacheService } from '../ImageCacheService.js';
import type { UserPreferencesService } from '../UserPreferencesService.js';
import { promises as fsp } from 'node:fs';

let backgroundScanInterval: NodeJS.Timeout | null = null;
let runningGames = new Set<string>();
let backgroundScanPaused = false;

/**
 * Async replacement for fs.existsSync - this runs on the main process, so a sync fs call here
 * (checking every library game's exe, potentially hundreds of them) blocks window paint/input
 * and IPC handling for its duration, same class of bug as the ImportService scanners.
 */
async function pathExists(path: string): Promise<boolean> {
    try {
        await fsp.access(path);
        return true;
    } catch {
        return false;
    }
}

export function getBackgroundScanUiChannels(fromStartup: boolean): {
    progressChannel: 'startup:progress' | null;
    newGamesChannel: 'startup:newGamesFound' | 'background:newGamesFound';
} {
    return {
        progressChannel: fromStartup ? 'startup:progress' : null,
        newGamesChannel: fromStartup ? 'startup:newGamesFound' : 'background:newGamesFound',
    };
}

export function registerScanningHandlers(
    winReference: { readonly current: BrowserWindow | null },
    gameStore: GameStore,
    appConfigService: AppConfigService,
    importService: ImportService,
    metadataFetcher: MetadataFetcherService,
    imageCacheService: ImageCacheService,
    userPreferencesService: Pick<UserPreferencesService, 'getPreferences'>,
) {
    const performBackgroundScan = async (skipEnabledCheck: boolean = false, fromStartup: boolean = false) => {
        try {
            const channels = getBackgroundScanUiChannels(fromStartup);
            if (backgroundScanPaused) {
                console.log('[BackgroundScan] Skipping scan - background scanning is paused');
                return;
            }

            if (!skipEnabledCheck) {
                const enabled = await appConfigService.getBackgroundScanEnabled();
                if (!enabled) {
                    return;
                }
            }

            // Skip background scan if games are currently running
            if (runningGames.size > 0) {
                console.log(`[BackgroundScan] Skipping scan - ${runningGames.size} game(s) currently running`);
                return;
            }

            console.log('[BackgroundScan] Starting background scan...');
            const scannedResults = await importService.scanAllSources((message) => {
                if (channels.progressChannel && winReference.current && !winReference.current.isDestroyed()) {
                    winReference.current.webContents.send(channels.progressChannel, { message });
                }
            });
            console.log(`[BackgroundScan] Scanned ${scannedResults.length} total games`);

            if (backgroundScanPaused) {
                console.log('[BackgroundScan] Ignoring scan results - background scanning was paused while scan was running');
                return;
            }

            if (scannedResults.length > 0) {
                const existingLibrary = await gameStore.getLibrary();
                const preferences = await userPreferencesService.getPreferences();
                const ignoredGames = new Set(preferences.ignoredGames || []);
                const existingGameIds = new Set(existingLibrary.map(g => g.id));
                const existingExePaths = new Set(
                    existingLibrary
                        .map(g => g.exePath)
                        .filter((path): path is string => !!path)
                        .map(path => path.toLowerCase().replace(/\\/g, '/').trim())
                );
                const normalizeDir = (p: string) =>
                    p.toLowerCase().replace(/\\/g, '/').trim().replace(/\/+$/, '');
                const existingInstallDirs = new Set(
                    existingLibrary
                        .map(g => {
                            const dir = g.installationDirectory || (g.exePath ? dirname(g.exePath) : '');
                            return dir ? normalizeDir(dir) : '';
                        })
                        .filter(Boolean)
                );
                const isExistingInstallDir = (candidate: string) =>
                    existingInstallDirs.has(candidate) ||
                    Array.from(existingInstallDirs).some(existing =>
                        candidate.startsWith(`${existing}/`) || existing.startsWith(`${candidate}/`),
                    );

                const newGames = scannedResults.filter(g => {
                    const ignoreKey = `${g.source}-${g.appId || g.originalName || g.title || ''}`;
                    if (ignoredGames.has(ignoreKey)) return false;
                    if (g.source === 'steam' && g.appId) {
                        if (existingGameIds.has(`steam-${g.appId}`)) return false;
                    }
                    if (g.exePath) {
                        const normalized = g.exePath.toLowerCase().replace(/\\/g, '/').trim();
                        if (existingExePaths.has(normalized)) return false;
                    }
                    const scannedInstallDir = normalizeDir(g.installPath || (g.exePath ? dirname(g.exePath) : ''));
                    if (scannedInstallDir && isExistingInstallDir(scannedInstallDir)) return false;
                    return true;
                });

                if (newGames.length > 0) {
                    console.log(`[BackgroundScan] Found ${newGames.length} new games to import`);
                    if (winReference.current && !winReference.current.isDestroyed()) {
                        winReference.current.webContents.send(channels.newGamesChannel, {
                            count: newGames.length,
                            games: newGames
                        });
                    }

                    // Auto-import disabled in favor of user confirmation
                    /* 
                    for (const game of newGames) {
                        try {
                            // Auto-import with basic metadata
                            await gameStore.saveGame({
                                id: game.source === 'steam' ? `steam-${game.appId}` : `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                title: game.title,
                                exePath: game.exePath,
                                source: game.source,
                                installationDirectory: game.installPath,
                                platform: 'pc',
                            } as any);
                        } catch (err) {
                            console.error(`[BackgroundScan] Error importing new game ${game.title}:`, err);
                        }
                    }
                    */
                }
            }

            // Check for missing games (games whose exe paths no longer exist)
            const existingLibrary = await gameStore.getLibrary();

            // Get app configs to check which sources are enabled
            const appConfigs = await appConfigService.getAppConfigs();
            const isSteamEnabled = appConfigs['steam']?.enabled;

            // Create set of scanned Steam IDs for efficient lookup
            const scannedSteamIds = new Set<string>();
            if (isSteamEnabled) {
                scannedResults.forEach(g => {
                    if (g.source === 'steam' && g.appId) {
                        scannedSteamIds.add(`steam-${g.appId}`);
                    }
                });
            }

            const missingGames = [];
            for (const game of existingLibrary) {
                // Special handling for Steam games (check against scan results instead of file system)
                if (game.source === 'steam') {
                    if (!isSteamEnabled) continue; // Skip if scanning disabled
                    if (!scannedSteamIds.has(game.id)) missingGames.push(game);
                    continue;
                }

                // Skip games without exe paths (like some Steam games that launch via protocol)
                if (!game.exePath || game.exePath.trim() === '') {
                    continue;
                }

                // Check if the exe file still exists
                const fileExists = await pathExists(game.exePath);
                if (!fileExists) {
                    console.log(`[BackgroundScan] Game missing: ${game.title} (${game.exePath})`);
                    missingGames.push(game);
                }
            }

            if (missingGames.length > 0) {
                console.log(`[BackgroundScan] Found ${missingGames.length} missing games`);
                if (winReference.current && !winReference.current.isDestroyed()) {
                    // Send missing games to renderer for user confirmation
                    winReference.current.webContents.send('scan:missing-games', {
                        games: missingGames.map(g => ({
                            id: g.id,
                            title: g.title,
                            exePath: g.exePath,
                            platform: g.platform,
                            source: g.source
                        }))
                    });
                }
            }
        } catch (error) {
            console.error('[BackgroundScan] Error during background scan:', error);
        }
    };

    const startBackgroundScan = async () => {
        if (backgroundScanPaused || backgroundScanInterval) return;
        const interval = 60 * 60 * 1000; // 1 hour
        backgroundScanInterval = setInterval(() => performBackgroundScan(), interval);
        console.log('[BackgroundScan] Background scan interval started (1 hour)');
    };

    const stopBackgroundScan = () => {
        if (backgroundScanInterval) {
            clearInterval(backgroundScanInterval);
            backgroundScanInterval = null;
            console.log('[BackgroundScan] Background scan interval stopped');
        }
    };

    const pauseBackgroundScan = async () => {
        if (backgroundScanPaused) return { success: true };
        backgroundScanPaused = true;
        stopBackgroundScan();
        console.log('[BackgroundScan] Background scanning paused');
        return { success: true };
    };

    const resumeBackgroundScan = async () => {
        if (!backgroundScanPaused) return { success: true };
        backgroundScanPaused = false;
        console.log('[BackgroundScan] Background scanning resumed');
        const enabled = await appConfigService.getBackgroundScanEnabled();
        if (enabled) {
            await startBackgroundScan();
        }
        return { success: true };
    };

    ipcMain.handle('app:performBackgroundScan', async (_event, quiet: boolean = false) => {
        await performBackgroundScan(quiet);
        return { success: true };
    });

    // Handle manual scan all sources request from the Game Importer
    ipcMain.handle('import:scanAllSources', async () => {
        try {
            console.log('[ImportService] Starting manual scan from Game Importer...');

            // Forward progress text as it comes in, and push each source's games to the
            // renderer as soon as that source finishes scanning — so the Add Games list
            // populates progressively instead of waiting for every launcher to finish.
            const scannedResults = await importService.scanAllSources(
                (message) => {
                    if (winReference.current && !winReference.current.isDestroyed()) {
                        winReference.current.webContents.send('import:scanProgress', { message });
                    }
                },
                (games) => {
                    if (winReference.current && !winReference.current.isDestroyed()) {
                        winReference.current.webContents.send('import:gamesFoundInSource', { games });
                    }
                }
            );

            console.log(`[ImportService] Manual scan completed: ${scannedResults.length} games found`);

            return {
                success: true,
                games: scannedResults
            };
        } catch (error) {
            console.error('[ImportService] Error during manual scan:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                games: []
            };
        }
    });

    // Handle manual scan all sources request from the Game Importer
    ipcMain.handle('import:cancelScan', async () => {
        try {
            console.log('[ImportService] Received cancel scan request from renderer');
            importService.cancelScanAllSources();
            return { success: true };
        } catch (error) {
            console.error('[ImportService] Error cancelling scan:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    // Handle getting list of missing games without removing them
    ipcMain.handle('scan:getMissingGames', async () => {
        try {
            console.log('[BackgroundScan] Getting list of missing games...');

            // Scan all sources to get current state
            const scannedResults = await importService.scanAllSources();
            const existingLibrary = await gameStore.getLibrary();

            // Get app configs to check which sources are enabled
            const appConfigs = await appConfigService.getAppConfigs();
            const isSteamEnabled = appConfigs['steam']?.enabled;

            // Create set of scanned Steam IDs for efficient lookup
            const scannedSteamIds = new Set<string>();
            if (isSteamEnabled) {
                scannedResults.forEach(g => {
                    if (g.source === 'steam' && g.appId) {
                        scannedSteamIds.add(`steam-${g.appId}`);
                    }
                });
            }

            const missingGames = [];
            for (const game of existingLibrary) {
                // Special handling for Steam games (check against scan results instead of file system)
                if (game.source === 'steam') {
                    if (!isSteamEnabled) continue; // Skip if scanning disabled
                    if (!scannedSteamIds.has(game.id)) missingGames.push(game);
                    continue;
                }

                // Skip games without exe paths (like some Steam games that launch via protocol)
                if (!game.exePath || game.exePath.trim() === '') {
                    continue;
                }

                // Check if the exe file still exists
                if (!(await pathExists(game.exePath))) {
                    missingGames.push(game);
                }
            }

            console.log(`[BackgroundScan] Found ${missingGames.length} missing games during manual scan`);

            return {
                success: true,
                games: missingGames.map(g => ({
                    id: g.id,
                    title: g.title,
                    exePath: g.exePath,
                    platform: g.platform,
                    source: g.source
                }))
            };
        } catch (error) {
            console.error('[BackgroundScan] Error getting missing games:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                games: []
            };
        }
    });

    // Handle removal of missing games
    ipcMain.handle('scan:removeMissingGames', async (_event, gameIds: string[]) => {
        try {
            console.log(`[BackgroundScan] Removing ${gameIds.length} missing games...`);
            let removedCount = 0;

            for (const gameId of gameIds) {
                try {
                    await gameStore.deleteGame(gameId);
                    removedCount++;
                    console.log(`[BackgroundScan] Removed missing game: ${gameId}`);
                } catch (err) {
                    console.error(`[BackgroundScan] Error removing game ${gameId}:`, err);
                }
            }

            console.log(`[BackgroundScan] Successfully removed ${removedCount}/${gameIds.length} missing games`);
            return { success: true, removedCount };
        } catch (error) {
            console.error('[BackgroundScan] Error removing missing games:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                removedCount: 0
            };
        }
    });

    // Track running games to pause background scanning during gameplay
    ipcMain.handle('scanning:gameStarted', (_event, gameId: string) => {
        runningGames.add(gameId);
        console.log(`[BackgroundScan] Game started: ${gameId}, running games: ${runningGames.size}`);
    });

    ipcMain.handle('scanning:gameStopped', (_event, gameId: string) => {
        runningGames.delete(gameId);
        console.log(`[BackgroundScan] Game stopped: ${gameId}, running games: ${runningGames.size}`);
    });

    ipcMain.handle('appConfig:pauseBackgroundScan', pauseBackgroundScan);
    ipcMain.handle('appConfig:resumeBackgroundScan', resumeBackgroundScan);

    return { performBackgroundScan, startBackgroundScan, stopBackgroundScan, pauseBackgroundScan, resumeBackgroundScan };
}
