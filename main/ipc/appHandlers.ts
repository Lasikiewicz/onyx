import { app, ipcMain, session, BrowserWindow, shell } from 'electron';
import path from 'node:path';
import https from 'node:https';
import { existsSync, unlinkSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { GameStore } from '../GameStore.js';
import { ImageCacheService } from '../ImageCacheService.js';
import { UserPreferencesService } from '../UserPreferencesService.js';
import { AppConfigService } from '../AppConfigService.js';
import { APICredentialsService } from '../APICredentialsService.js';
import { SteamAuthService } from '../SteamAuthService.js';
import { BugReportService } from '../BugReportService.js';
import { checkForUpdates as doCheckForUpdates, downloadUpdate as doDownloadUpdate, quitAndInstall as doQuitAndInstall } from '../AppUpdateService.js';

const GITHUB_OWNER = 'Lasikiewicz';
const GITHUB_REPO = 'onyx';
const GITHUB_API_VERSION = '2022-11-28';
const GITHUB_USER_AGENT = 'OnyxApp';

const normalizeVersion = (value: string) => value.replace(/^v/i, '').trim();

const requestJson = (url: string, timeoutMs = 8000): Promise<{ ok: boolean; status: number; body: any }> => {
    return new Promise((resolve, reject) => {
        const request = https.request(
            url,
            {
                method: 'GET',
                headers: {
                    'User-Agent': GITHUB_USER_AGENT,
                    'Accept': 'application/vnd.github+json',
                    'X-GitHub-Api-Version': GITHUB_API_VERSION
                }
            },
            response => {
                let data = '';
                response.on('data', chunk => {
                    data += chunk;
                });
                response.on('end', () => {
                    const status = response.statusCode ?? 0;
                    if (!data) {
                        resolve({ ok: status >= 200 && status < 300, status, body: null });
                        return;
                    }
                    try {
                        const parsed = JSON.parse(data);
                        resolve({ ok: status >= 200 && status < 300, status, body: parsed });
                    } catch (error) {
                        reject(error);
                    }
                });
            }
        );

        request.on('error', reject);
        request.setTimeout(timeoutMs, () => {
            request.destroy(new Error('Request timed out'));
        });
        request.end();
    });
};

const formatReleaseNotes = (version: string, body: string) => {
    const normalized = normalizeVersion(version);
    const trimmedBody = body.trim();
    if (!trimmedBody) return '';
    return `## [${normalized}]\n\n${trimmedBody}`;
};

const fetchReleaseNotes = async (version: string): Promise<string | null> => {
    const normalized = normalizeVersion(version);
    const tagCandidates = Array.from(new Set([
        version,
        normalized,
        `v${normalized}`
    ].filter(Boolean)));

    for (const tag of tagCandidates) {
        const url = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/tags/${encodeURIComponent(tag)}`;
        const response = await requestJson(url);
        if (response.ok && response.body?.body) {
            return formatReleaseNotes(tag, response.body.body);
        }
        if (response.status !== 404) {
            throw new Error(`GitHub API error (${response.status}) while fetching release ${tag}`);
        }
    }

    const listUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases?per_page=30`;
    const listResponse = await requestJson(listUrl);
    if (!listResponse.ok || !Array.isArray(listResponse.body)) return null;

    const match = listResponse.body.find((release: any) => {
        const tagName = typeof release?.tag_name === 'string' ? release.tag_name : '';
        const name = typeof release?.name === 'string' ? release.name : '';
        return normalizeVersion(tagName) === normalized || normalizeVersion(name) === normalized;
    });

    if (match?.body) {
        return formatReleaseNotes(match.tag_name || version, match.body);
    }

    return null;
};

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

    ipcMain.handle('app:restoreWindow', async () => {
        if (winReference.current) winReference.current.restore();
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

    ipcMain.handle('app:toggleFullscreen', async () => {
        if (winReference.current) {
            const isFullscreen = winReference.current.isFullScreen();
            winReference.current.setFullScreen(!isFullscreen);
        }
        return { success: !!winReference.current };
    });

    ipcMain.handle('app:enterFullscreen', async () => {
        if (winReference.current) {
            winReference.current.setFullScreen(true);
        }
        return { success: !!winReference.current };
    });

    ipcMain.handle('app:exitFullscreen', async () => {
        if (winReference.current) {
            winReference.current.setFullScreen(false);
        }
        return { success: !!winReference.current };
    });

    ipcMain.handle('app:getFullscreenState', async () => {
        if (winReference.current) {
            return { isFullscreen: winReference.current.isFullScreen() };
        }
        return { isFullscreen: false };
    });

    ipcMain.handle('app:isMinimized', async () => {
        if (winReference.current) {
            return { isMinimized: winReference.current.isMinimized() };
        }
        return { isMinimized: false };
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
    ipcMain.handle('app:getChangelog', async (_event, version?: string) => {
        let lastError: string | null = null;
        if (version) {
            try {
                const releaseNotes = await fetchReleaseNotes(version);
                if (releaseNotes) {
                    return { success: true, content: releaseNotes };
                }
            } catch (error) {
                lastError = error instanceof Error ? error.message : String(error);
            }
        }

        const candidatePaths = [
            path.join(app.getAppPath(), 'CHANGELOG.md'),
            path.join(process.resourcesPath, 'app.asar', 'CHANGELOG.md'),
            path.join(process.resourcesPath, 'app.asar.unpacked', 'CHANGELOG.md'),
            path.join(process.cwd(), 'CHANGELOG.md')
        ];

        for (const candidatePath of candidatePaths) {
            if (!existsSync(candidatePath)) continue;
            try {
                const content = await readFile(candidatePath, 'utf-8');
                return { success: true, content };
            } catch (error) {
                return { success: false, error: error instanceof Error ? error.message : String(error) };
            }
        }

        return { success: false, error: lastError ?? 'Changelog not found' };
    });

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
