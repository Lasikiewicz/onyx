import { BrowserWindow, ipcMain } from 'electron';
import { GameStore } from '../GameStore.js';
import { AppConfigService } from '../AppConfigService.js';
import { ImportService } from '../ImportService.js';
import { MetadataFetcherService } from '../MetadataFetcherService.js';
import { ImageCacheService } from '../ImageCacheService.js';
import { existsSync } from 'node:fs';

let backgroundScanInterval: NodeJS.Timeout | null = null;

export function registerScanningHandlers(
    winReference: { readonly current: BrowserWindow | null },
    gameStore: GameStore,
    appConfigService: AppConfigService,
    importService: ImportService,
    metadataFetcher: MetadataFetcherService,
    imageCacheService: ImageCacheService
) {
    const performBackgroundScan = async (skipEnabledCheck: boolean = false) => {
        try {
            if (!skipEnabledCheck) {
                const enabled = await appConfigService.getBackgroundScanEnabled();
                if (!enabled) {
                    return;
                }
            }

            console.log('[BackgroundScan] Starting background scan...');
            const scannedResults = await importService.scanAllSources((message) => {
                if (winReference.current && !winReference.current.isDestroyed()) {
                    winReference.current.webContents.send('startup:progress', { message });
                }
            });
            console.log(`[BackgroundScan] Scanned ${scannedResults.length} total games`);

            if (scannedResults.length > 0) {
                const existingLibrary = await gameStore.getLibrary();
                const existingGameIds = new Set(existingLibrary.map(g => g.id));
                const existingExePaths = new Set(
                    existingLibrary
                        .map(g => g.exePath)
                        .filter((path): path is string => !!path)
                        .map(path => path.toLowerCase().replace(/\\/g, '/').trim())
                );

                const newGames = scannedResults.filter(g => {
                    if (g.source === 'steam' && g.appId) {
                        if (existingGameIds.has(`steam-${g.appId}`)) return false;
                    }
                    if (g.exePath) {
                        const normalized = g.exePath.toLowerCase().replace(/\\/g, '/').trim();
                        if (existingExePaths.has(normalized)) return false;
                    }
                    return true;
                });

                if (newGames.length > 0) {
                    console.log(`[BackgroundScan] Found ${newGames.length} new games to import`);
                    if (winReference.current && !winReference.current.isDestroyed()) {
                        winReference.current.webContents.send('background:newGamesFound', {
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

            const missingGames = existingLibrary.filter(game => {
                // Special handling for Steam games (check against scan results instead of file system)
                if (game.source === 'steam') {
                    if (!isSteamEnabled) return false; // Skip if scanning disabled
                    return !scannedSteamIds.has(game.id);
                }

                // Skip games without exe paths (like some Steam games that launch via protocol)
                if (!game.exePath || game.exePath.trim() === '') {
                    return false;
                }

                // Check if the exe file still exists
                const fileExists = existsSync(game.exePath);
                if (!fileExists) {
                    console.log(`[BackgroundScan] Game missing: ${game.title} (${game.exePath})`);
                }
                return !fileExists;
            });

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
        if (backgroundScanInterval) return;
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

    ipcMain.handle('app:performBackgroundScan', async (_event, quiet: boolean = false) => {
        await performBackgroundScan(quiet);
        return { success: true };
    });

    // Handle manual scan all sources request from the Game Importer
    ipcMain.handle('import:scanAllSources', async () => {
        try {
            console.log('[ImportService] Starting manual scan from Game Importer...');
            const scannedResults = await importService.scanAllSources((message) => {
                if (winReference.current && !winReference.current.isDestroyed()) {
                    winReference.current.webContents.send('import:scanProgress', { message });
                }
            });

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

    return { performBackgroundScan, startBackgroundScan, stopBackgroundScan };
}
