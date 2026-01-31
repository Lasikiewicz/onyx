import { BrowserWindow, ipcMain } from 'electron';
import { GameStore } from '../GameStore.js';
import { AppConfigService } from '../AppConfigService.js';
import { ImportService } from '../ImportService.js';
import { MetadataFetcherService } from '../MetadataFetcherService.js';
import { ImageCacheService } from '../ImageCacheService.js';

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
                        winReference.current.webContents.send('startup:new-games', { count: newGames.length });
                    }

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

    return { performBackgroundScan, startBackgroundScan, stopBackgroundScan };
}
