import { ipcMain } from 'electron';
import { LauncherService } from '../LauncherService.js';
import { LauncherDetectionService } from '../LauncherDetectionService.js';
import { TrayService } from '../ui/tray.js';
import { GameStore } from '../GameStore.js';
import { ProcessSuspendService } from '../ProcessSuspendService.js';

export function registerLauncherIPCHandlers(
    launcherService: LauncherService,
    launcherDetectionService: LauncherDetectionService,
    trayService: TrayService | null,
    gameStore: GameStore,
    getProcessSuspendService: () => ProcessSuspendService | null,
) {
    ipcMain.handle('launcher:launchGame', async (_event, gameId: string) => {
        try {
            console.log(`[Launcher] Launching game: ${gameId}`);
            const processSuspendService = getProcessSuspendService();
            let baselinePids: number[] = [];

            if (processSuspendService?.isEnabled()) {
                try {
                    const baselineProcesses = await processSuspendService.getAllProcesses();
                    baselinePids = baselineProcesses.map((processInfo) => processInfo.pid);
                } catch (error) {
                    console.error('[Launcher] Failed to capture pre-launch process baseline:', error);
                }
            }

            const result = await launcherService.launchGame(gameId);

            if (result.success) {
                if (processSuspendService?.isEnabled()) {
                    try {
                        const library = await gameStore.getLibrary();
                        const game = library.find((item) => item.id === gameId);
                        if (game) {
                            processSuspendService.startLaunchTrackingSession({
                                gameId,
                                title: game.title,
                                exePath: game.exePath,
                                installationDirectory: game.installationDirectory,
                                platform: game.platform,
                                source: game.source,
                                knownPid: result.pid,
                                baselinePids,
                            });
                        }
                    } catch (error) {
                        console.error('[Launcher] Failed to wire launched game into suspend tracking:', error);
                    }
                }
            }

            // Update tray menu to refresh Recently Played list
            if (result.success && trayService) {
                trayService.updateTrayMenu().catch(err => {
                    console.error('[Launcher] Error updating tray menu after launch:', err);
                });
            }

            return result;
        } catch (error) {
            console.error('Error in launcher:launchGame handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('launcher:detectAll', async () => {
        try {
            console.log('[Launcher] Detecting all launchers...');
            return await launcherDetectionService.detectAllLaunchers();
        } catch (error) {
            console.error('Error in launcher:detectAll handler:', error);
            return [];
        }
    });

    ipcMain.handle('launcher:detect', async (_event, launcherId: string) => {
        try {
            console.log(`[Launcher] Detecting launcher: ${launcherId}`);
            return await launcherDetectionService.detectLauncher(launcherId);
        } catch (error) {
            console.error(`Error in launcher:detect handler for ${launcherId}:`, error);
            return null;
        }
    });

    ipcMain.handle('launcher:launchModManager', async (_event, gameId: string) => {
        try {
            console.log(`[Launcher] Launching mod manager for game: ${gameId}`);
            return await launcherService.launchModManager(gameId);
        } catch (error) {
            console.error('Error in launcher:launchModManager handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('launcher:launchModManagerTarget', async (_event, modManagerUrl: string) => {
        try {
            console.log('[Launcher] Launching mod manager target');
            return await launcherService.launchModManagerTarget(modManagerUrl);
        } catch (error) {
            console.error('Error in launcher:launchModManagerTarget handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('launcher:openGameUninstaller', async (_event, gameId: string) => {
        try {
            return await launcherService.openGameUninstaller(gameId);
        } catch (error) {
            console.error('Error in launcher:openGameUninstaller handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
}
