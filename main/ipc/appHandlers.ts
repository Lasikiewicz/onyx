import { app, ipcMain, session, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import { existsSync, unlinkSync, rmSync } from 'node:fs';
import { GameStore } from '../GameStore.js';
import { ImageCacheService } from '../ImageCacheService.js';
import { UserPreferencesService } from '../UserPreferencesService.js';
import { AppConfigService } from '../AppConfigService.js';
import { APICredentialsService } from '../APICredentialsService.js';
import { SteamAuthService } from '../SteamAuthService.js';
import { BugReportService } from '../BugReportService.js';
import { checkForUpdates as doCheckForUpdates, downloadUpdate as doDownloadUpdate, quitAndInstall as doQuitAndInstall } from '../AppUpdateService.js';

export function registerAppIPCHandlers(
    winReference: { current: BrowserWindow | null },
    gameStore: GameStore,
    imageCacheService: ImageCacheService,
    userPreferencesService: UserPreferencesService,
    appConfigService: AppConfigService,
    apiCredentialsService: APICredentialsService,
    steamAuthService: SteamAuthService,
    bugReportService: BugReportService,
    trayControls?: { createTray: () => void; destroyTray: () => void }
) {
    // System Tray & Startup Handlers
    ipcMain.handle('app:applySystemTraySettings', async (_event, settings: { showSystemTrayIcon: boolean; minimizeToTray: boolean }) => {
        if (trayControls) {
            if (settings.showSystemTrayIcon) {
                trayControls.createTray();
            } else {
                trayControls.destroyTray();
            }
        }
        return { success: true };
    });

    ipcMain.handle('app:applyStartupSettings', async (_event, settings: { startWithComputer: boolean; startClosedToTray: boolean }) => {
        app.setLoginItemSettings({
            openAtLogin: settings.startWithComputer,
            openAsHidden: settings.startClosedToTray,
            path: app.getPath('exe'),
            args: settings.startClosedToTray ? ['--hidden'] : []
        });
        return { success: true };
    });

    ipcMain.handle('app:minimizeToTray', async () => {
        if (winReference.current) winReference.current.hide();
        return { success: true };
    });
    // Window Control Handlers
    ipcMain.handle('app:minimizeWindow', async () => {
        if (winReference.current) winReference.current.minimize();
        return { success: !!winReference.current };
    });

    ipcMain.handle('app:maximizeWindow', async () => {
        if (winReference.current) {
            if (winReference.current.isMaximized()) winReference.current.unmaximize();
            else winReference.current.maximize();
        }
        return { success: !!winReference.current };
    });

    ipcMain.handle('app:closeWindow', async () => {
        if (winReference.current) winReference.current.close();
        return { success: !!winReference.current };
    });

    ipcMain.handle('app:toggleDevTools', async () => {
        if (winReference.current) winReference.current.webContents.toggleDevTools();
        return { success: !!winReference.current };
    });

    // Preferences Handlers
    ipcMain.handle('preferences:get', async () => {
        return await userPreferencesService.getPreferences();
    });

    ipcMain.handle('preferences:save', async (_event, preferences) => {
        await userPreferencesService.savePreferences(preferences);
        return { success: true };
    });

    // App Info Handlers
    ipcMain.handle('app:getVersion', () => app.getVersion());
    ipcMain.handle('app:getName', () => app.getName());

    // Auto-update Handlers (no-op when not packaged)
    ipcMain.handle('app:checkForUpdates', () => {
        doCheckForUpdates();
        return Promise.resolve();
    });
    ipcMain.handle('app:downloadUpdate', async () => {
        if (!app.isPackaged) return { success: false };
        try {
            await doDownloadUpdate();
            return { success: true };
        } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : String(err) };
        }
    });
    ipcMain.handle('app:quitAndInstall', () => {
        if (!app.isPackaged) return;
        doQuitAndInstall();
    });

    // Update notification handlers - for coordinating with startup scan
    let updateFoundCallback: (() => void) | null = null;
    let updateDismissedCallback: (() => void) | null = null;

    ipcMain.on('app:update-found', () => {
        console.log('[AppUpdate] Update found - signaling startup scan to pause');
        if (updateFoundCallback) updateFoundCallback();
    });

    ipcMain.on('app:update-dismissed', () => {
        console.log('[AppUpdate] Update dismissed - signaling startup scan to proceed');
        if (updateDismissedCallback) updateDismissedCallback();
    });

    // Export callbacks for main.ts to use
    (global as any).__updateFoundCallback = (callback: () => void) => {
        updateFoundCallback = callback;
    };
    (global as any).__updateDismissedCallback = (callback: () => void) => {
        updateDismissedCallback = callback;
    };

    ipcMain.handle('app:openExternal', async (_event, url) => {
        await shell.openExternal(url);
        return { success: true };
    });

    ipcMain.handle('app:openPath', async (_event, pathOrType) => {
        if (pathOrType === 'logs') {
            const logsPath = path.join(app.getPath('userData'), 'logs');
            if (existsSync(logsPath)) {
                await shell.openPath(logsPath);
                return { success: true };
            }
        } else if (existsSync(pathOrType)) {
            await shell.openPath(pathOrType);
            return { success: true };
        }
        return { success: false, error: 'Path not found' };
    });

    // API Credentials Handlers
    ipcMain.handle('api:getCredentials', async () => {
        return await apiCredentialsService.getCredentials();
    });

    ipcMain.handle('api:saveCredentials', async (_event, credentials) => {
        await apiCredentialsService.saveCredentials(credentials);
        return { success: true };
    });

    // App Config Handlers
    ipcMain.handle('appConfig:getAll', async () => {
        return await appConfigService.getAppConfigs();
    });

    ipcMain.handle('appConfig:get', async (_event, appId) => {
        return await appConfigService.getAppConfig(appId);
    });

    ipcMain.handle('appConfig:save', async (_event, config) => {
        await appConfigService.saveAppConfig(config);
        return { success: true };
    });

    ipcMain.handle('appConfig:saveAll', async (_event, configs) => {
        await appConfigService.saveAppConfigs(configs);
        return { success: true };
    });

    ipcMain.handle('appConfig:getBackgroundScanEnabled', async () => {
        return await appConfigService.getBackgroundScanEnabled();
    });

    ipcMain.handle('appConfig:setBackgroundScanEnabled', async (_event, enabled) => {
        await appConfigService.setBackgroundScanEnabled(enabled);
        return { success: true };
    });

    ipcMain.handle('appConfig:getBackgroundScanIntervalMinutes', async () => {
        return await appConfigService.getBackgroundScanIntervalMinutes();
    });

    ipcMain.handle('appConfig:setBackgroundScanIntervalMinutes', async (_event, minutes) => {
        await appConfigService.setBackgroundScanIntervalMinutes(minutes);
        return { success: true };
    });

    ipcMain.handle('appConfig:getLastBackgroundScan', async () => {
        return await appConfigService.getLastBackgroundScan();
    });

    // Background scan control handlers (placeholders - actual control is in scanningHandlers)
    ipcMain.handle('appConfig:pauseBackgroundScan', async () => {
        // Background scan pause/resume is handled by the scanning service
        // This is a placeholder to prevent errors
        return { success: true };
    });

    ipcMain.handle('appConfig:resumeBackgroundScan', async () => {
        // Background scan pause/resume is handled by the scanning service
        // This is a placeholder to prevent errors
        return { success: true };
    });

    // Manual Folders Handlers
    ipcMain.handle('manualFolders:get', async () => {
        return await appConfigService.getManualFolders();
    });

    ipcMain.handle('manualFolders:save', async (_event, folders) => {
        await appConfigService.saveManualFolders(folders);
        return { success: true };
    });

    ipcMain.handle('manualFolders:getConfigs', async () => {
        return await appConfigService.getManualFolderConfigs();
    });

    ipcMain.handle('manualFolders:saveConfig', async (_event, config) => {
        await appConfigService.saveManualFolderConfig(config);
        return { success: true };
    });

    ipcMain.handle('manualFolders:deleteConfig', async (_event, folderId) => {
        await appConfigService.deleteManualFolderConfig(folderId);
        return { success: true };
    });

    // Custom Defaults Handlers (Placeholders)
    ipcMain.handle('customDefaults:has', () => false);
    ipcMain.handle('customDefaults:getBaseline', async () => {
        return (await userPreferencesService.getPreferences());
    });

    // Bug Report Handlers
    ipcMain.handle('bugReport:generate', async (_event, description: string) => {
        return await bugReportService.generateBugReport(description);
    });

    ipcMain.handle('bugReport:getLogsDirectory', () => {
        return bugReportService.getLogsDirectory();
    });

    // App Control Handlers
    ipcMain.handle('app:exit', () => app.exit(0));
    ipcMain.handle('app:requestExit', () => {
        app.quit();
        return { success: true };
    });

    ipcMain.handle('app:clearGameLibrary', async () => {
        try {
            console.log('[Reset] Starting game library clearance...');
            await gameStore.clearLibrary();
            await imageCacheService.clearCache();

            const userDataPath = app.getPath('userData');
            const filesToClear = ['game-library.json', 'game-library.json.bak'];

            for (const fileName of filesToClear) {
                const filePath = path.join(userDataPath, fileName);
                if (existsSync(filePath)) {
                    try { unlinkSync(filePath); } catch (err) { console.warn(`[Reset] Could not delete ${fileName}:`, err); }
                }
            }

            try {
                const customCacheDir = imageCacheService.getCacheDir();
                if (existsSync(customCacheDir)) {
                    rmSync(customCacheDir, { recursive: true, force: true });
                }
            } catch (err) { console.warn('[Reset] Could not delete custom image cache:', err); }

            app.relaunch();
            app.exit(0);
            return { success: true };
        } catch (error) {
            console.error('[Reset] Error clearing game library:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    ipcMain.handle('app:reset', async () => {
        try {
            console.log('[Reset] Starting comprehensive app reset...');
            if (session.defaultSession) await session.defaultSession.clearStorageData();

            await gameStore.clearLibrary();
            await userPreferencesService.resetPreferences();
            await appConfigService.clearAppConfigs();
            await apiCredentialsService.clearCredentials();
            await steamAuthService.clearAuth();
            await imageCacheService.clearCache();

            const userDataPath = app.getPath('userData');
            const filesToClear = [
                'game-library.json', 'user-preferences.json', 'app-configs.json',
                'api-credentials.json', 'steam-auth.json', 'user-preferences.json.bak', 'game-library.json.bak'
            ];

            for (const fileName of filesToClear) {
                const filePath = path.join(userDataPath, fileName);
                if (existsSync(filePath)) {
                    try { unlinkSync(filePath); } catch (err) { console.warn(`[Reset] Could not delete ${fileName}:`, err); }
                }
            }

            const foldersToClear = [
                'logs', 'cache', 'Cache', 'Code Cache', 'GPUCache',
                'Local Storage', 'Session Storage', 'blob_storage', 'Network'
            ];

            for (const folderName of foldersToClear) {
                const folderPath = path.join(userDataPath, folderName);
                if (existsSync(folderPath)) {
                    try { rmSync(folderPath, { recursive: true, force: true }); } catch (err) { console.warn(`[Reset] Could not delete folder ${folderName}:`, err); }
                }
            }

            try {
                const customCacheDir = imageCacheService.getCacheDir();
                if (existsSync(customCacheDir)) {
                    rmSync(customCacheDir, { recursive: true, force: true });
                }
            } catch (err) { console.warn('[Reset] Could not delete custom image cache:', err); }

            setTimeout(() => {
                app.relaunch();
                app.exit(0);
            }, 1000);

            return { success: true };
        } catch (error) {
            console.error('Error in app:reset handler:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });
}
