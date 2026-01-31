import { ipcMain } from 'electron';
import { LauncherService } from '../LauncherService.js';
import { LauncherDetectionService } from '../LauncherDetectionService.js';
import { TrayService } from '../ui/tray.js';

export function registerLauncherIPCHandlers(
    launcherService: LauncherService,
    launcherDetectionService: LauncherDetectionService,
    trayService: TrayService | null
) {
    ipcMain.handle('launcher:launchGame', async (_event, gameId: string) => {
        try {
            console.log(`[Launcher] Launching game: ${gameId}`);
            const result = await launcherService.launchGame(gameId);

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
}
