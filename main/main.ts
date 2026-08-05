import { app, BrowserWindow, ipcMain, dialog, Menu, protocol, Tray, nativeImage, shell, session, globalShortcut, crashReporter } from 'electron';

// Early branding setup - must happen before any other modules initialize paths
// Packaged alpha runs as OnyxAlpha.exe; detect from exec path. Dev uses BUILD_PROFILE env.
const IS_ALPHA = app.isPackaged
  ? process.execPath.toLowerCase().includes('onyxalpha')
  : process.env.BUILD_PROFILE === 'alpha';
const IS_DEV = !app.isPackaged;
const baseName = IS_ALPHA ? 'Onyx Alpha' : 'Onyx';
app.setName(IS_DEV ? `${baseName} Dev` : baseName);
if (process.platform === 'win32') {
  const baseId = IS_ALPHA ? 'com.lasikiewicz.onyx.alpha' : 'com.lasikiewicz.onyx';
  app.setAppUserModelId(IS_DEV ? `${baseId}.dev` : baseId);
}
const API_CREDENTIAL_SERVICE_NAME = IS_DEV
  ? (IS_ALPHA ? 'onyx-alpha-dev-api-credentials' : 'onyx-dev-api-credentials')
  : (IS_ALPHA ? 'onyx-alpha-api-credentials' : 'onyx-api-credentials');

// Single instance lock - prevent multiple copies of the app from running
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('Another instance is already running. Quitting...');
  app.quit();
} else {
  app.on('second-instance', async (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }

    // Check if a game launch was requested from jump list
    const launchGameArg = commandLine.find(arg => arg.startsWith('--launch-game='));
    if (launchGameArg) {
      const gameId = launchGameArg.replace('--launch-game=', '').replace(/"/g, '');
      console.log(`[Jump List] Launching game from jump list: ${gameId}`);
      try {
        await launcherService.launchGame(gameId);
        const prefs = await userPreferencesService.getPreferences();
        if (prefs.minimizeOnGameLaunch && win) {
          win.minimize();
        }
      } catch (error) {
        console.error('[Jump List] Error launching game:', error);
      }
    }
  });
}

import path from 'node:path';
import { readdirSync, statSync, existsSync, readFileSync, copyFileSync, mkdirSync, unlinkSync, writeFileSync, promises as fsPromises, constants as fsConstants } from 'node:fs';
import { platform } from 'node:os';
import { analyzeCrashDumps, setupJavaScriptErrorHandler } from './crashDumpAnalyzer.js';

// Crash dumps: enabled in all builds; stored under userData so packaged builds can write
try {
  const crashDumpsDir = path.join(app.getPath('userData'), 'crash-dumps');
  if (!existsSync(crashDumpsDir)) {
    mkdirSync(crashDumpsDir, { recursive: true });
  }
  app.setPath('crashDumps', crashDumpsDir);
  crashReporter.start({ uploadToServer: false, compress: false });
  console.log('[Crash] Dumps will be saved to:', crashDumpsDir);

  // Setup custom readable error handlers and dump analyzer
  setupJavaScriptErrorHandler();
  analyzeCrashDumps();
} catch (e) {
  console.warn('[Crash] Failed to init crash reporter:', e);
}

type CrashSessionState = {
  lastStartedAt?: string;
  lastExitedCleanly?: boolean;
  lastExitAt?: string;
};

const CRASH_SESSION_STATE_FILE = 'crash-session-state.json';

function getCrashSessionStatePath(): string {
  return path.join(app.getPath('userData'), CRASH_SESSION_STATE_FILE);
}

function readCrashSessionState(): CrashSessionState | null {
  try {
    const statePath = getCrashSessionStatePath();
    if (!existsSync(statePath)) {
      return null;
    }
    return JSON.parse(readFileSync(statePath, 'utf8')) as CrashSessionState;
  } catch (error) {
    console.warn('[Crash] Failed to read crash session state:', error);
    return null;
  }
}

function writeCrashSessionState(patch: Partial<CrashSessionState>): void {
  try {
    const nextState: CrashSessionState = {
      ...(readCrashSessionState() ?? {}),
      ...patch,
    };
    writeFileSync(getCrashSessionStatePath(), JSON.stringify(nextState, null, 2), 'utf8');
  } catch (error) {
    console.warn('[Crash] Failed to write crash session state:', error);
  }
}

function isCrashArtifactFile(fileName: string): boolean {
  const lowerName = fileName.toLowerCase();
  return lowerName.endsWith('.dmp')
    || (lowerName.startsWith('js-crash-') && lowerName.endsWith('.txt'))
    || lowerName.endsWith('-report.txt');
}

/** Collect crash dump file paths from the crashDumps directory (and one level of subdirs for Crashpad). */
function getCrashDumpFilePaths(): string[] {
  const out: string[] = [];
  try {
    const dir = app.getPath('crashDumps');
    if (!existsSync(dir)) return out;
    const collect = (d: string) => {
      const entries = readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        const full = path.join(d, e.name);
        if (e.isFile()) {
          if (isCrashArtifactFile(e.name)) out.push(full);
        } else if (e.isDirectory()) {
          collect(full);
        }
      }
    };
    collect(dir);
  } catch (err) {
    console.warn('[Crash] Error listing crash dumps:', err);
  }
  return out;
}

import { SteamService } from './SteamService.js';
import { GameStore, type Game } from './GameStore.js';
import { MetadataFetcherService, IGDBConfig } from './MetadataFetcherService.js';
import { LauncherService } from './LauncherService.js';
import { IGDBService } from './IGDBService.js';
import { RAWGService } from './RAWGService.js';
import { SteamGridDBService } from './SteamGridDBService.js';
import { GiantBombService } from './GiantBombService.js';
import { AppConfigService } from './AppConfigService.js';
import { XboxService } from './XboxService.js';
import { UserPreferencesService, type UserPreferences } from './UserPreferencesService.js';
import { APICredentialsService } from './APICredentialsService.js';
import { LauncherDetectionService } from './LauncherDetectionService.js';
import { ImportService, type ScannedGameResult } from './ImportService.js';
import { ImageCacheService } from './ImageCacheService.js';
import { SteamAuthService } from './SteamAuthService.js';
import { ProcessSuspendService } from './ProcessSuspendService.js';
import { InstallerPreferenceService } from './InstallerPreferenceService.js';
import { BugReportService } from './BugReportService.js';
import { DuckDuckGoImageService } from './DuckDuckGoImageService.js';
import { registerGameIPCHandlers } from './ipc/gameHandlers.js';
import { registerMetadataIPCHandlers } from './ipc/metadataHandlers.js';
import { registerAppIPCHandlers } from './ipc/appHandlers.js';
import { registerScanningHandlers } from './ipc/scanningHandlers.js';
import { registerSuspendHandlers } from './ipc/suspendHandlers.js';
import { registerLauncherIPCHandlers } from './ipc/launcherHandlers.js';
import { TrayService } from './ui/tray.js';
import { withTimeout } from './RetryUtils.js';
import { initAppUpdateService, checkForUpdates, addUpdateStatusListener } from './AppUpdateService.js';
import { createImageOptimizationQueue } from './ImageOptimizationQueue.js';
import { registerStartupCoordinator } from './startupCoordinator.js';
import { openSafeExternal } from './SecurityUtils.js';
import { registerOnyxLocalProtocol } from './onyxLocalProtocol.js';
import { getWorkerDiagnostics, isWorkerAvailable } from './ImageOptimizerWorkerHost.js';
import {
  onStatusChange as onOptimizationStatusChange,
  getStatus as getOptimizationStatus,
  clearStatus as clearOptimizationStatus,
  startRun as optimizationStartRun,
  addJobs as optimizationAddJobs,
  updateJob as optimizationUpdateJob,
  setRuntimeMetrics as optimizationSetRuntimeMetrics,
  finishRun as optimizationFinishRun,
} from './ImageOptimizationController.js';

// Load environment variables (development only; packaged builds do not rely on .env files)
if (!app.isPackaged) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dotenv = require('dotenv') as typeof import('dotenv');
  dotenv.config();
}

// Register onyx-local protocol as privileged to allow fetch and CORS
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'onyx-local',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
]);

/**
 * One-time migration for alpha builds: copy userData from legacy "Onyx" folder to "Onyx Alpha".
 * Alpha 0.3.5 (bug) used app name "Onyx" so data lived in appData/Onyx; 0.3.6+ correctly use "Onyx Alpha".
 * Run before any service reads userData so they see migrated files.
 */
function migrateAlphaUserDataFromOnyx(): void {
  if (!IS_ALPHA || !app.isPackaged) return;
  const current = app.getPath('userData');
  const legacy = path.join(app.getPath('appData'), 'Onyx');
  const marker = path.join(current, '.alpha-migrated-from-onyx');
  if (!existsSync(legacy) || existsSync(marker)) return;
  // Skip if current already has our store files (fresh install or already migrated)
  if (existsSync(path.join(current, 'game-library.json')) || existsSync(path.join(current, 'user-preferences.json'))) {
    try {
      fsPromises.writeFile(marker, '').catch(() => { });
    } catch {
      // ignore
    }
    return;
  }
  try {
    mkdirSync(current, { recursive: true });

    // Only the store files are copied synchronously. They are small, and services read
    // them during bootstrap so they must exist first. Everything else — chiefly the image
    // cache, which can be gigabytes — is copied in the background, because doing it here
    // blocked startup entirely before the window existed.
    for (const file of ALPHA_MIGRATION_STORE_FILES) {
      const srcPath = path.join(legacy, file);
      const destPath = path.join(current, file);
      if (existsSync(srcPath) && !existsSync(destPath)) {
        copyFileSync(srcPath, destPath);
      }
    }

    void copyRemainingLegacyUserData(legacy, current, marker);
  } catch (err) {
    console.error('[Alpha] Migration from Onyx userData failed:', err);
  }
}

/** Store files services read during bootstrap; see migrateAlphaUserDataFromOnyx. */
const ALPHA_MIGRATION_STORE_FILES = [
  'game-library.json',
  'user-preferences.json',
  'app-configs.json',
  'steam-auth.json',
];

async function copyRecursiveAsync(src: string, dest: string): Promise<void> {
  const entries = await fsPromises.readdir(src, { withFileTypes: true });
  for (const e of entries) {
    const srcPath = path.join(src, e.name);
    const destPath = path.join(dest, e.name);
    if (e.isDirectory()) {
      await fsPromises.mkdir(destPath, { recursive: true });
      await copyRecursiveAsync(srcPath, destPath);
    } else {
      try {
        // COPYFILE_EXCL preserves the original "never overwrite an existing file" behaviour.
        await fsPromises.copyFile(srcPath, destPath, fsConstants.COPYFILE_EXCL);
      } catch {
        // Destination already exists, or the source vanished — skip it.
      }
    }
  }
}

async function copyRemainingLegacyUserData(legacy: string, current: string, marker: string): Promise<void> {
  try {
    await copyRecursiveAsync(legacy, current);
    await fsPromises.writeFile(marker, '');
    console.log('[Alpha] Migrated userData from Onyx to Onyx Alpha.');
  } catch (err) {
    console.error('[Alpha] Background migration from Onyx userData failed:', err);
  }
}
migrateAlphaUserDataFromOnyx();

// Global Variables
let win: BrowserWindow | null = null;
let tray: Tray | null = null;
let trayService: TrayService | null = null;
let isAppQuitting = false;
let isFlushingWindowStateBeforeQuit = false;
let hasRunBeforeQuitCleanup = false;
let flushWindowStateBeforeQuit: (() => Promise<void>) | null = null;
let previousCrashSessionState: CrashSessionState | null = null;
let minimizeToTrayEnabled = false;
let showSystemTrayIconEnabled = true;
let closeToTrayEnabled = true;

type StartupWindowMode = 'normal' | 'minimized' | 'tray';

function syncTrayPreferenceFlags(prefs: Pick<UserPreferences, 'minimizeToTray' | 'showSystemTrayIcon' | 'closeToTray'> | null | undefined) {
  minimizeToTrayEnabled = prefs?.minimizeToTray === true;
  showSystemTrayIconEnabled = prefs?.showSystemTrayIcon ?? true;
  closeToTrayEnabled = prefs?.closeToTray !== false;
}

async function showMainWindowFromTray() {
  if (!win) {
    await createWindow();
    if (!win) return;
  }

  if (win.isMinimized()) {
    win.restore();
  }

  win.show();
  win.focus();

  userPreferencesService.getPreferences()
    .then((prefs) => {
      if (!win || win.isDestroyed()) return;

      if (prefs.windowState?.isMaximized && !win.isMaximized()) {
        win.maximize();
      }

      if (prefs.windowState?.isFullscreen && !win.isFullScreen()) {
        win.setFullScreen(true);
      }
    })
    .catch((error) => {
      console.error('[Tray] Failed to apply saved window state after restore:', error);
    });
}

function getStartupModeArg(argv: string[]): StartupWindowMode | null {
  const startupModeArg = argv.find((arg) => arg.startsWith('--startup-mode='));
  if (!startupModeArg) return null;

  const requestedMode = startupModeArg.slice('--startup-mode='.length);
  if (requestedMode === 'minimized' || requestedMode === 'tray') {
    return requestedMode;
  }

  return null;
}

function resolveStartupWindowMode(
  prefs: UserPreferences | null | undefined,
  argv: string[],
  loginSettings: Electron.LoginItemSettings,
): StartupWindowMode {
  const trayAvailable = prefs?.showSystemTrayIcon ?? true;
  const requestedArgMode = getStartupModeArg(argv);

  if (requestedArgMode === 'tray') {
    return trayAvailable ? 'tray' : 'minimized';
  }
  if (requestedArgMode === 'minimized') {
    return 'minimized';
  }

  // Backward compatibility for existing login items that still use the legacy hidden flag.
  if (argv.includes('--hidden') || loginSettings.wasOpenedAsHidden) {
    if (prefs?.startClosedToTray && trayAvailable) {
      return 'tray';
    }
    if (prefs?.startMinimized) {
      return 'minimized';
    }
  }

  if (prefs?.startClosedToTray && trayAvailable) {
    return 'tray';
  }
  if (prefs?.startMinimized) {
    return 'minimized';
  }

  return 'normal';
}

// Initialize services early to be available everywhere
const steamService = new SteamService();
const gameStore = new GameStore();
const appConfigService = new AppConfigService();
const xboxService = new XboxService();
const userPreferencesService = new UserPreferencesService();
const apiCredentialsService = new APICredentialsService(undefined, API_CREDENTIAL_SERVICE_NAME);
const launcherDetectionService = new LauncherDetectionService();
const steamAuthService = new SteamAuthService();
const bugReportService = new BugReportService();
const imageCacheService = new ImageCacheService();
const launcherService = new LauncherService(gameStore);

// winReference for services that need it (GamepadService, etc.)
const winReference = { current: win };

// Initialize Metadata Services with credentials
// We init as null first to avoid authentication errors with empty keys
// These will be instantiated and injected into metadataFetcher when credentials are loaded
const igdbService: IGDBService | null = null;
const steamGridDBService: SteamGridDBService | null = null;
const rawgService: RAWGService | null = null;
const giantBombService: GiantBombService | null = null;

// Initialize providers with null services initially
const metadataFetcher = new MetadataFetcherService(igdbService, steamService, rawgService, steamGridDBService, giantBombService);
const importService = new ImportService(steamService, xboxService, appConfigService, metadataFetcher);

/** Refresh metadata fetcher with current API credentials. Call after saving credentials so Start scan uses all added APIs. */
async function refreshMetadataServices(): Promise<void> {
  const creds = await apiCredentialsService.getCredentials();
  let newIgdbService: IGDBService | null = null;
  let newSteamGridDBService: SteamGridDBService | null = null;
  let newRawgService: RAWGService | null = null;
  let newGiantBombService: GiantBombService | null = null;

  if (creds.igdbClientId && creds.igdbClientSecret) {
    newIgdbService = new IGDBService(creds.igdbClientId, creds.igdbClientSecret);
  }
  if (creds.steamGridDBApiKey) {
    newSteamGridDBService = new SteamGridDBService(creds.steamGridDBApiKey);
  }
  if (creds.rawgApiKey) {
    newRawgService = new RAWGService(creds.rawgApiKey);
  }
  if (creds.giantBombApiKey) {
    newGiantBombService = new GiantBombService(creds.giantBombApiKey);
  }

  metadataFetcher.setIGDBService(newIgdbService);
  metadataFetcher.setSteamGridDBService(newSteamGridDBService);
  metadataFetcher.setRAWGService(newRawgService);
  metadataFetcher.setGiantBombService(newGiantBombService);
  console.log('[App] Metadata services refreshed with saved credentials');
}

// Initialize metadata services at startup
refreshMetadataServices().catch(err => console.error('[App] Failed to load credentials for metadata services:', err));

// Placeholder for late-initialized services
let processSuspendService: ProcessSuspendService | null = null;

async function initializeSuspendService(): Promise<void> {
  if (process.platform !== 'win32') {
    processSuspendService = null;
    return;
  }

  if (!processSuspendService) {
    const service = new ProcessSuspendService();
    if (!service.isEnabled()) {
      processSuspendService = null;
      return;
    }
    processSuspendService = service;
    processSuspendService.startProcessMonitoring(5000);
    console.log('[Suspend] Process suspend service initialized');
  }
}

// Hardware acceleration check
userPreferencesService.getPreferences().then(prefs => {
  syncTrayPreferenceFlags(prefs);
  if (prefs.enableHardwareAcceleration === false) {
    console.log('Disabling hardware acceleration based on user preference');
    app.disableHardwareAcceleration();
  }
}).catch(err => {
  console.error('Error checking hardware acceleration preference:', err);
});

if (app.isPackaged) {
  process.env.DIST = path.join(__dirname, '../dist');
} else {
  process.env.DIST = path.join(__dirname, '../dist');
}
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../');

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const preload = path.join(__dirname, 'preload.js');

// Initialize Tray service
trayService = new TrayService(gameStore, launcherService, userPreferencesService, createWindow);

// Check if this instance was launched with a game ID (first launch)
const launchGameArg = process.argv.find(arg => arg.startsWith('--launch-game='));
if (launchGameArg) {
  const gameId = launchGameArg.replace('--launch-game=', '').replace(/"/g, '');
  console.log(`[Jump List] First instance launched with game: ${gameId}`);
  // We'll launch the game after the window is ready
  app.whenReady().then(async () => {
    // Wait a bit for the window to be created
    setTimeout(async () => {
      try {
        await launcherService.launchGame(gameId);
        const prefs = await userPreferencesService.getPreferences();
        if (prefs.minimizeOnGameLaunch && win) {
          win.minimize();
        }
      } catch (error) {
        console.error('[Jump List] Error launching game on first instance:', error);
      }
    }, 2000);
  });
}

// Register IPC Handlers

const imageQueue = createImageOptimizationQueue(imageCacheService, gameStore, undefined, {
  getOptimizationPerformance: async () => {
    const prefs = await userPreferencesService.getPreferences();
    return prefs.optimizationPerformance;
  },
});
const optimizationStartupDiagnostics = {
  collectedAt: new Date().toISOString(),
  ffmpeg: ImageCacheService.getFfmpegDiagnostics(),
  worker: getWorkerDiagnostics(),
  sharp: ImageCacheService.getSharpDiagnostics(),
};
if (!optimizationStartupDiagnostics.sharp.sharpLoadable) {
  console.warn('[Optimization] Sharp preflight failed at startup:', optimizationStartupDiagnostics.sharp.sharpLoadError);
}
onOptimizationStatusChange((status) => {
  if (win && !win.isDestroyed()) win.webContents.send('optimization:status', status);
});
ipcMain.handle('imageQueue:getStatus', () => imageQueue.getStatus());
ipcMain.handle('optimization:getStatus', () => getOptimizationStatus());
ipcMain.handle('optimization:clearStatus', () => {
  clearOptimizationStatus();
  return { success: true };
});
ipcMain.handle('optimization:getDiagnostics', async () => {
  const ffmpeg = ImageCacheService.getFfmpegDiagnostics();
  const worker = getWorkerDiagnostics();
  const sharp = ImageCacheService.getSharpDiagnostics();
  return {
    ffmpeg: { path: ffmpeg.path, available: ffmpeg.available, source: ffmpeg.source },
    workerAvailable: isWorkerAvailable(),
    worker,
    sharp,
    startupDiagnostics: optimizationStartupDiagnostics,
    appPath: app.getAppPath(),
    isPackaged: app.isPackaged,
    execPath: process.execPath,
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    versions: process.versions,
    cacheDir: imageCacheService.getCacheDir(),
    isAlpha: IS_ALPHA,
  };
});

// Crash dump: offer to save on next launch after a crash
ipcMain.handle('crash:saveDumps', async () => {
  if (!win) return { saved: false, error: 'No window' };
  const paths = getCrashDumpFilePaths();
  if (paths.length === 0) return { saved: false, error: 'No crash dumps found' };
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Save crash report',
    buttonLabel: 'Select folder',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (canceled || !filePaths?.[0]) return { saved: false, canceled: true };
  const destDir = filePaths[0];
  try {
    for (const p of paths) {
      const name = path.basename(p);
      copyFileSync(p, path.join(destDir, name));
    }
    for (const p of paths) {
      try { unlinkSync(p); } catch (_) { /* ignore */ }
    }
    return { saved: true, destDir };
  } catch (err) {
    console.error('[Crash] Failed to save dumps:', err);
    return { saved: false, error: err instanceof Error ? err.message : String(err) };
  }
});
ipcMain.handle('crash:openDumpFolder', async () => {
  const dir = app.getPath('crashDumps');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  await shell.openPath(dir);
  return { opened: true };
});
ipcMain.handle('crash:dismissDumps', async () => {
  const paths = getCrashDumpFilePaths();
  for (const p of paths) {
    try { unlinkSync(p); } catch (_) { /* ignore */ }
  }
  return { dismissed: true };
});

registerGameIPCHandlers(steamService, xboxService, gameStore, imageCacheService, userPreferencesService, imageQueue, {
  startRun: optimizationStartRun,
  addJobs: optimizationAddJobs,
  updateJob: optimizationUpdateJob,
  setRuntimeMetrics: optimizationSetRuntimeMetrics,
  finishRun: optimizationFinishRun,
});
registerMetadataIPCHandlers(metadataFetcher, imageCacheService, gameStore, userPreferencesService, { get current() { return win; } }, imageQueue);
registerAppIPCHandlers(
  { get current() { return win; } },
  gameStore,
  imageCacheService,
  userPreferencesService,
  appConfigService,
  apiCredentialsService,
  steamAuthService,
  bugReportService,
  refreshMetadataServices,
  {
    createTray: () => {
      if (!tray) createTray();
    },
    destroyTray: () => {
      if (tray) {
        tray.destroy();
        tray = null;
      }
    },
    updateSettings: syncTrayPreferenceFlags,
  }
);
registerLauncherIPCHandlers(launcherService, launcherDetectionService, trayService, gameStore, () => processSuspendService);
const { performBackgroundScan, startBackgroundScan, stopBackgroundScan } = registerScanningHandlers({ get current() { return win; } }, gameStore, appConfigService, importService, metadataFetcher, imageCacheService, userPreferencesService);
const { unregisterSuspendShortcut, syncSuspendShortcutState } = registerSuspendHandlers(() => processSuspendService, userPreferencesService, gameStore);

// Create application menu
function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: 'Import',
      submenu: [
        {
          label: 'Add Game',
          accelerator: 'Ctrl+N',
          click: () => {
            win?.webContents.send('menu:addGame');
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Scan Folder for Games',
          click: () => {
            win?.webContents.send('menu:scanFolder');
          },
        },
        {
          label: 'Update Steam Library',
          click: () => {
            win?.webContents.send('menu:updateSteamLibrary');
          },
        },
        {
          type: 'separator',
        },
        {
          label: 'Configure Steam...',
          click: () => {
            win?.webContents.send('menu:configureSteam');
          },
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo', label: 'Undo' },
        { role: 'redo', label: 'Redo' },
        { type: 'separator' },
        { role: 'cut', label: 'Cut' },
        { role: 'copy', label: 'Copy' },
        { role: 'paste', label: 'Paste' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Updates',
          click: () => {
            win?.webContents.send('menu:checkForUpdates');
          },
        },
      ],
    },
  ];

  if (IS_DEV) {
    template.splice(3, 0, {
      label: 'Develop',
      submenu: [
        { role: 'reload', label: 'Reload' },
        { role: 'forceReload', label: 'Force Reload' },
        { role: 'toggleDevTools', label: 'Toggle DevTools' },
      ],
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Create system tray
function createTray() {
  // System tray icons work better with ICO on Windows, PNG on other platforms
  let iconPath: string;
  let icon: Electron.NativeImage;

  try {
    if (app.isPackaged) {
      // In packaged app, prefer ICO for Windows system tray (best Windows support)
      if (process.platform === 'win32') {
        // Try ICO first on Windows (best for system tray)
        const icoPath = path.join(process.resourcesPath, 'icon.ico');
        const pngPath = path.join(process.resourcesPath, 'icon.png');

        if (existsSync(icoPath)) {
          iconPath = icoPath;
        } else if (existsSync(pngPath)) {
          iconPath = pngPath;
        } else {
          throw new Error('No icon file found');
        }
      } else {
        // On other platforms, prefer PNG
        const pngPath = path.join(process.resourcesPath, 'icon.png');
        const svgPath = path.join(process.resourcesPath, 'icon.svg');

        if (existsSync(pngPath)) {
          iconPath = pngPath;
        } else if (existsSync(svgPath)) {
          iconPath = svgPath;
        } else {
          throw new Error('No icon file found');
        }
      }
    } else {
      // In development, prefer ICO on Windows, PNG on other platforms
      if (process.platform === 'win32') {
        const icoPath = path.join(__dirname, '../build/icon.ico');
        const pngPath = path.join(__dirname, '../resources/icon.png');

        if (existsSync(icoPath)) {
          iconPath = icoPath;
        } else if (existsSync(pngPath)) {
          iconPath = pngPath;
        } else {
          throw new Error('No icon file found');
        }
      } else {
        const pngPath = path.join(__dirname, '../resources/icon.png');
        const svgPath = path.join(__dirname, '../resources/icon.svg');

        if (existsSync(pngPath)) {
          iconPath = pngPath;
        } else if (existsSync(svgPath)) {
          iconPath = svgPath;
        } else {
          throw new Error('No icon file found');
        }
      }
    }

    console.log('Loading tray icon from:', iconPath);
    console.log('Icon file exists:', existsSync(iconPath));

    // Load the icon
    icon = nativeImage.createFromPath(iconPath);

    // Check if icon is empty (common issue with SVG on Windows)
    if (icon.isEmpty()) {
      console.error('Icon loaded but is empty, trying fallback...');
      console.error('Icon path:', iconPath);
      console.error('File size:', existsSync(iconPath) ? statSync(iconPath).size : 'N/A');
      throw new Error('Icon loaded but is empty');
    }

    console.log('Icon loaded successfully, size:', icon.getSize());

    // For Windows, use appropriate size (16x16 is standard, but 32x32 works better for high DPI)
    // Note: On Windows, ICO files contain multiple sizes, so we might not need to resize
    if (process.platform === 'win32' && iconPath.endsWith('.ico')) {
      // For ICO files on Windows, use directly without resize (ICO contains multiple sizes)
      tray = new Tray(icon);
    } else {
      const size = process.platform === 'darwin' ? 22 : (process.platform === 'win32' ? 32 : 16);
      const resizedIcon = icon.resize({ width: size, height: size, quality: 'best' });

      // Verify resized icon is not empty
      if (resizedIcon.isEmpty()) {
        console.error('Resized icon is empty, trying without resize...');
        // Try using the original icon without resize
        if (!icon.isEmpty()) {
          tray = new Tray(icon);
        } else {
          throw new Error('Resized icon is empty');
        }
      } else {
        tray = new Tray(resizedIcon);
      }
    }

    console.log('Tray icon created successfully');
  } catch (error) {
    console.error('Error creating tray icon:', error);
    // Try to create a fallback icon from the original
    try {
      // Last resort: try to load icon directly without resize
      const fallbackPath = app.isPackaged
        ? (process.platform === 'win32'
          ? (existsSync(path.join(process.resourcesPath, 'icon.ico'))
            ? path.join(process.resourcesPath, 'icon.ico')
            : path.join(process.resourcesPath, 'icon.png'))
          : path.join(process.resourcesPath, 'icon.png'))
        : (process.platform === 'win32'
          ? (existsSync(path.join(__dirname, '../build/icon.ico'))
            ? path.join(__dirname, '../build/icon.ico')
            : path.join(__dirname, '../resources/icon.png'))
          : path.join(__dirname, '../resources/icon.png'));

      console.log('Trying fallback icon from:', fallbackPath);

      if (existsSync(fallbackPath)) {
        icon = nativeImage.createFromPath(fallbackPath);
        if (!icon.isEmpty()) {
          // Try a smaller resize for tray
          const smallIcon = icon.resize({ width: 16, height: 16, quality: 'best' });
          if (!smallIcon.isEmpty()) {
            tray = new Tray(smallIcon);
            console.log('Fallback tray icon created successfully');
          } else {
            tray = new Tray(icon);
            console.log('Fallback tray icon created (without resize)');
          }
        } else {
          throw new Error('Fallback icon is empty');
        }
      } else {
        throw new Error('No fallback icon available');
      }
    } catch (fallbackError) {
      console.error('Fallback icon creation failed:', fallbackError);
      // Last resort: create empty icon (will show as blank, but app won't crash)
      // This should not happen if icon files are properly included
      icon = nativeImage.createEmpty();
      tray = new Tray(icon);
      console.error('WARNING: Tray icon is empty. Please ensure icon.png exists in resources/');
    }
  }

  const trayTooltip = IS_DEV ? 'Onyx Dev' : (IS_ALPHA ? 'Onyx Alpha' : 'Onyx');
  tray.setToolTip(trayTooltip);

  if (trayService) {
    trayService.setTray(tray);
    trayService.updateTrayMenu();
  }

  // Update context menu on right-click to refresh recent games
  tray.on('right-click', () => {
    console.log('[Tray Menu] Right-click detected, refreshing menu...');
    if (!trayService) return;
    if (process.platform === 'win32') {
      trayService.showCustomTrayMenu().catch((err) => {
        console.error('[Tray Menu] Failed to show custom tray menu:', err);
        trayService?.updateTrayMenu();
      });
      return;
    }
    trayService.updateTrayMenu();
  });

  tray.on('click', () => {
    if (win) {
      if (win.isVisible() && !win.isMinimized() && win.isFocused()) {
        win.hide();
      } else {
        showMainWindowFromTray().catch((error) => {
          console.error('[Tray] Failed to restore window:', error);
        });
      }
    } else {
      createWindow();
    }
  });
}

async function createWindow() {
  // Load app icon (prefer PNG/ICO on Windows, SVG on other platforms)
  let appIcon: Electron.NativeImage | undefined;
  try {
    if (app.isPackaged) {
      // In packaged app, prefer ICO on Windows for better taskbar support
      if (process.platform === 'win32') {
        const icoPath = path.join(process.resourcesPath, 'icon.ico');
        const pngPath = path.join(process.resourcesPath, 'icon.png');

        if (existsSync(icoPath)) {
          appIcon = nativeImage.createFromPath(icoPath);
        } else if (existsSync(pngPath)) {
          appIcon = nativeImage.createFromPath(pngPath);
        }
      } else {
        // On other platforms, try SVG first, then PNG
        const svgPath = path.join(process.resourcesPath, 'icon.svg');
        const pngPath = path.join(process.resourcesPath, 'icon.png');

        if (existsSync(svgPath)) {
          appIcon = nativeImage.createFromPath(svgPath);
        } else if (existsSync(pngPath)) {
          appIcon = nativeImage.createFromPath(pngPath);
        }
      }
    } else {
      // In development, prefer ICO on Windows
      if (process.platform === 'win32') {
        const icoPath = path.join(__dirname, '../build/icon.ico');
        const pngPath = path.join(__dirname, '../resources/icon.png');

        if (existsSync(icoPath)) {
          appIcon = nativeImage.createFromPath(icoPath);
        } else if (existsSync(pngPath)) {
          appIcon = nativeImage.createFromPath(pngPath);
        }
      } else {
        const svgPath = path.join(__dirname, '../resources/icon.svg');
        const pngPath = path.join(__dirname, '../resources/icon.png');

        if (existsSync(svgPath)) {
          appIcon = nativeImage.createFromPath(svgPath);
        } else if (existsSync(pngPath)) {
          appIcon = nativeImage.createFromPath(pngPath);
        }
      }
    }

    // Verify icon is not empty
    if (appIcon && appIcon.isEmpty()) {
      console.warn('App icon loaded but is empty, clearing it');
      appIcon = undefined;
    } else if (appIcon) {
      console.log('Window icon loaded successfully');
    } else {
      console.warn('No window icon loaded - icon files may be missing');
    }
  } catch (error) {
    console.error('Error loading app icon:', error);
  }

  // Default window dimensions
  const defaultWidth = 1920;
  const defaultHeight = 1080;

  // Load saved window state
  let windowState: { x?: number; y?: number; width?: number; height?: number; isMaximized?: boolean; isFullscreen?: boolean } | undefined;
  let isFirstLaunch = true;
  let prefs: UserPreferences | undefined;
  try {
    prefs = await userPreferencesService.getPreferences();
    syncTrayPreferenceFlags(prefs);
    windowState = prefs.windowState;
    isFirstLaunch = prefs.isFirstLaunch !== false;
  } catch (error) {
    console.error('Error loading window state:', error);
  }

  // Safety: if saved window state is completely off-screen (e.g. monitor layout changed),
  // reset to defaults so the window is visible again.
  if (windowState) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { screen } = require('electron') as typeof import('electron');
      const displays = screen.getAllDisplays();
      const rect = {
        left: windowState.x ?? 0,
        top: windowState.y ?? 0,
        right: (windowState.x ?? 0) + (windowState.width ?? defaultWidth),
        bottom: (windowState.y ?? 0) + (windowState.height ?? defaultHeight),
      };
      const intersectsAnyDisplay = displays.some((d) => {
        const b = d.bounds;
        const bRight = b.x + b.width;
        const bBottom = b.y + b.height;
        const overlapH = rect.left < bRight && rect.right > b.x;
        const overlapV = rect.top < bBottom && rect.bottom > b.y;
        return overlapH && overlapV;
      });
      if (!intersectsAnyDisplay) {
        console.warn('[WindowState] Saved window bounds are off-screen; resetting to defaults.');
        windowState = undefined;
      }
    } catch (e) {
      console.warn('[WindowState] Failed to validate window bounds:', e);
    }
  }

  win = new BrowserWindow({
    width: windowState?.width ?? defaultWidth,
    height: windowState?.height ?? defaultHeight,
    x: windowState?.x,
    y: windowState?.y,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#1a1a1a',
    title: app.getName(),
    icon: appIcon,
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: 'rgba(0, 0, 0, 0)',
      symbolColor: '#ffffff',
      height: 40,
    },
    autoHideMenuBar: true,
    frame: true,
    resizable: true,
    show: false,
  });

  // Determine the initial window state (respecting preferences, CLI flags and login settings)
  const loginSettings = app.getLoginItemSettings();
  const startupWindowMode = resolveStartupWindowMode(prefs, process.argv, loginSettings);
  const shouldStartHidden = startupWindowMode === 'tray';

  if (!shouldStartHidden) {
    // Restore maximized state if previously maximized (for non-first-launch)
    if (!isFirstLaunch && windowState?.isMaximized) {
      win.maximize();
    }

    // Restore fullscreen state if previously in fullscreen (for non-first-launch)
    if (!isFirstLaunch && windowState?.isFullscreen) {
      win.setFullScreen(true);
    }

    // Apply startInFullscreen preference if enabled
    if (prefs?.startInFullscreen && !win.isFullScreen()) {
      win.setFullScreen(true);
    }
  } else {
    // If starting hidden, defer maximize/fullscreen until first show to avoid premature window display on Windows
    // Electron's maximize() and setFullScreen(true) automatically show the window on Windows.
    win.once('show', () => {
      if ((!isFirstLaunch && windowState?.isMaximized) || isFirstLaunch) {
        win?.maximize();
      }
      if (!isFirstLaunch && windowState?.isFullscreen) {
        win?.setFullScreen(true);
      }
      if (prefs?.startInFullscreen && !win?.isFullScreen()) {
        win?.setFullScreen(true);
      }
    });
  }

  // Handle first launch: Maximize and set resolution-optimized defaults
  if (isFirstLaunch) {
    console.log('[First Launch] Detecting resolution and applying optimized defaults...');
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;

    if (!shouldStartHidden) {
      win.maximize();
    }

    // Define optimized defaults based on resolution
    let optimizedPrefs: Partial<UserPreferences> = {
      isFirstLaunch: false,
      windowState: {
        x: 0,
        y: 0,
        width,
        height,
        isMaximized: true
      }
    };

    if (width >= 3840) { // 4K
      optimizedPrefs = {
        ...optimizedPrefs,
        gridSize: 220,
        panelWidth: 1000,
        panelWidthByView: { grid: 1000, list: 1000, logo: 1000 },
        carouselLogoSize: 200,
        logoViewSize: 300,
      };
    } else if (width >= 2560) { // 1440p
      optimizedPrefs = {
        ...optimizedPrefs,
        gridSize: 160,
        panelWidth: 900,
        panelWidthByView: { grid: 900, list: 900, logo: 900 },
        carouselLogoSize: 150,
        logoViewSize: 250,
      };
    } else { // 1080p and below
      optimizedPrefs = {
        ...optimizedPrefs,
        gridSize: 130,
        panelWidth: 800,
        panelWidthByView: { grid: 800, list: 800, logo: 800 },
        carouselLogoSize: 120,
        logoViewSize: 200,
      };
    }

    // Save optimized preferences
    userPreferencesService.savePreferences(optimizedPrefs).catch(err => {
      console.error('[First Launch] Error saving optimized preferences:', err);
    });
  }
  if (trayService) trayService.setWindow(win);

  // Save window state when window bounds or shell mode changes.
  // Maximize/fullscreen transitions are written immediately so fast reloads/relaunches
  // do not lose the latest shell state while move/resize remains debounced.
  let saveWindowStateTimeout: NodeJS.Timeout | null = null;
  let pendingWindowStateSave: Promise<void> = Promise.resolve();
  const persistWindowState = async () => {
    const targetWindow = win;
    if (!targetWindow) return;

    try {
      const bounds = targetWindow.getBounds();
      const isMaximized = targetWindow.isMaximized();
      const isFullscreen = targetWindow.isFullScreen();

      await userPreferencesService.savePreferences({
        windowState: {
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          isMaximized,
          isFullscreen,
        },
      });
    } catch (error) {
      console.error('Error saving window state:', error);
    }
  };

  const queueWindowStateSave = () => {
    pendingWindowStateSave = persistWindowState();
    return pendingWindowStateSave;
  };

  const flushWindowStateSave = async () => {
    if (saveWindowStateTimeout) {
      clearTimeout(saveWindowStateTimeout);
      saveWindowStateTimeout = null;
    }

    await pendingWindowStateSave;
    const currentSave = queueWindowStateSave();
    await currentSave;
  };

  flushWindowStateBeforeQuit = flushWindowStateSave;

  const scheduleWindowStateSave = () => {
    if (!win) return;

    if (saveWindowStateTimeout) {
      clearTimeout(saveWindowStateTimeout);
    }

    saveWindowStateTimeout = setTimeout(() => {
      saveWindowStateTimeout = null;
      void queueWindowStateSave();
    }, 500);
  };

  const saveWindowStateImmediately = () => {
    if (saveWindowStateTimeout) {
      clearTimeout(saveWindowStateTimeout);
      saveWindowStateTimeout = null;
    }

    void queueWindowStateSave();
  };

  win.on('move', scheduleWindowStateSave);
  win.on('resize', scheduleWindowStateSave);
  win.on('maximize', saveWindowStateImmediately);
  win.on('unmaximize', saveWindowStateImmediately);
  win.on('enter-full-screen', saveWindowStateImmediately);
  win.on('leave-full-screen', saveWindowStateImmediately);

  // Notify renderer of fullscreen state changes
  win.on('enter-full-screen', () => {
    win?.webContents.send('fullscreen-changed', true);
  });
  win.on('leave-full-screen', () => {
    win?.webContents.send('fullscreen-changed', false);
  });

  win.on('minimize', () => {
    if (!minimizeToTrayEnabled) return;

    if (!tray && showSystemTrayIconEnabled) {
      createTray();
    }

    if (tray) {
      win?.hide();
    }
  });

  // Set once we have confirmed the window really should close, so the re-issued
  // close() below is allowed straight through instead of re-entering this handler.
  let allowWindowClose = false;

  // Handle window close based on preferences
  win.on('close', (event) => {
    if (isAppQuitting || allowWindowClose) return;

    if (closeToTrayEnabled) {
      event.preventDefault();
      win?.hide();
      void flushWindowStateSave().catch((error) => {
        console.error('Error saving window state on close-to-tray:', error);
      });
      return;
    }

    // The cached flag says "really close", but it can be stale. Electron only honours
    // preventDefault() synchronously — after an await the close is already committed —
    // so block the close now and re-decide from the persisted preference.
    event.preventDefault();

    void (async () => {
      try {
        if (win) {
          await flushWindowStateSave();
        }

        const prefs = await userPreferencesService.getPreferences();
        syncTrayPreferenceFlags(prefs);
        // Check closeToTray (fallback to minimizeToTray if closeToTray is undefined for backward compatibility)
        if (prefs.closeToTray !== false) {
          // If closeToTray is true or undefined (default), minimize
          win?.hide();
          return;
        }
      } catch (error) {
        console.error('Error checking preferences on close:', error);
      }

      // closeToTray is genuinely off (or prefs failed to load): close for real.
      allowWindowClose = true;
      win?.close();
    })();
  });

  // Security: lock down navigation. The renderer is a local app; any attempt to
  // navigate the main window elsewhere (e.g. a crafted link in remote metadata)
  // is denied. http/https links open in the system browser via the protocol allowlist.
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const isAllowed = VITE_DEV_SERVER_URL
      ? navigationUrl.startsWith(VITE_DEV_SERVER_URL)
      : navigationUrl.startsWith('file://');
    if (!isAllowed) {
      event.preventDefault();
      console.warn(`[Security] Blocked main window navigation to: ${navigationUrl}`);
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      void openSafeExternal(url);
    } else {
      console.warn(`[Security] Blocked window.open for URL: ${url}`);
    }
    return { action: 'deny' };
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', async () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
    console.log('Window loaded, checking if electronAPI is available...');

    if (startupWindowMode === 'tray') {
      console.log('[Startup] Starting in tray mode; keeping main window hidden.');
    } else {
      win?.show();
      if (startupWindowMode === 'minimized') {
        console.log('[Startup] Starting minimized.');
        win?.minimize();
      }
    }

    // If a previous run produced crash dumps, offer to save them
    const dumpPaths = getCrashDumpFilePaths();
    const shouldPromptForPreviousCrash = previousCrashSessionState?.lastExitedCleanly === false;
    if (shouldPromptForPreviousCrash && dumpPaths.length > 0 && win && !win.isDestroyed()) {
      win.webContents.send('crash:dumpsAvailable', { paths: dumpPaths });
    }
  });

  win.on('closed', () => {
    if (flushWindowStateBeforeQuit === flushWindowStateSave) {
      flushWindowStateBeforeQuit = null;
    }
  });

  // Add error handlers for debugging
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorCode, errorDescription, validatedURL);
    // Open DevTools on error so user can see what went wrong
    if (win && !win.webContents.isDevToolsOpened()) {
      win.webContents.openDevTools();
    }
  });

  win.webContents.on('render-process-gone', (_event, details) => {
    console.error('[Renderer] Render process gone:', {
      reason: details.reason,
      exitCode: details.exitCode,
    });
  });

  // Debug: Check for preload errors
  win.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('Preload error:', preloadPath, error);
    // Open DevTools on preload error
    if (win && !win.webContents.isDevToolsOpened()) {
      win.webContents.openDevTools();
    }
  });

  // Enable DevTools in production for debugging (can be disabled later)
  // User can press F12 or Ctrl+Shift+I to open DevTools
  // F11 toggles fullscreen
  // Escape exits fullscreen
  if (win) {
    win.webContents.on('before-input-event', (event, input) => {
      if (input.type === 'keyDown') {
        if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
          if (win) {
            win.webContents.toggleDevTools();
          }
        } else if (input.key === 'F11') {
          if (win) {
            const isFullscreen = win.isFullScreen();
            win.setFullScreen(!isFullscreen);
            // Notify renderer of fullscreen state change
            win.webContents.send('fullscreen-changed', !isFullscreen);
          }
        } else if (input.key === 'Escape' && win && win.isFullScreen()) {
          win.setFullScreen(false);
          // Notify renderer of fullscreen state change
          win.webContents.send('fullscreen-changed', false);
        }
      }
    });
  }

  if (VITE_DEV_SERVER_URL) {
    // Load from Vite dev server
    win.loadURL(VITE_DEV_SERVER_URL);
    // Open DevTools automatically in development mode
    win.webContents.openDevTools();
  } else {
    // Load from built files
    let indexPath: string;

    // Use relative path from __dirname - loadFile() handles ASAR automatically
    // In packaged: __dirname = app.asar/dist-electron/main.js, so ../dist/index.html = app.asar/dist/index.html
    // In dev: __dirname = dist-electron/main.js, so ../dist/index.html = dist/index.html
    indexPath = path.join(__dirname, '../dist/index.html');
    console.log('Loading index.html from:', indexPath);
    console.log('__dirname:', __dirname);
    console.log('app.isPackaged:', app.isPackaged);
    if (app.isPackaged) {
      console.log('app.getAppPath():', app.getAppPath());
    }
    console.log('__dirname:', __dirname);
    console.log('app.isPackaged:', app.isPackaged);

    // Try to load the file
    if (!win) {
      console.error('Window is null, cannot load file');
      return;
    }

    // Use loadFile which handles ASAR paths correctly
    // loadFile() automatically handles ASAR archives when given a path inside app.asar
    try {
      console.log('Attempting to load with loadFile():', indexPath);
      // loadFile() automatically handles ASAR archives - just use the relative path
      // It will resolve app.asar/dist/index.html correctly
      win.loadFile(indexPath).catch((error) => {
        console.error('Error loading file with loadFile():', error);
        if (!win) return;

        // Try alternative paths
        const altPaths = app.isPackaged ? [
          path.join(__dirname, '../dist/index.html'), // Same as indexPath, but explicit
          path.join(app.getAppPath(), 'dist', 'index.html'), // Using getAppPath
          path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html') // Using resourcesPath
        ] : [
          path.join(__dirname, '../dist/index.html'),
          path.join(process.env.DIST || '', 'index.html')
        ];

        let pathIndex = 0;
        const tryNextPath = () => {
          if (pathIndex >= altPaths.length) {
            console.error('All paths failed. Opening DevTools for debugging.');
            if (win) {
              win.webContents.openDevTools();
            }
            return;
          }

          const nextPath = altPaths[pathIndex++];
          console.log(`Trying alternative path ${pathIndex}:`, nextPath);
          if (!win) return;

          win.loadFile(nextPath).catch((nextError) => {
            console.error(`Path ${pathIndex} failed:`, nextError);
            tryNextPath();
          });
        };

        tryNextPath();
      });
    } catch (error) {
      console.error('Exception while loading:', error);
      if (win) {
        win.webContents.openDevTools();
      }
    }

    // Enable DevTools access - user can press F12 or Ctrl+Shift+I
    // Also open automatically if there's an error (handled in error handlers above)
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', async () => {
  // Check if we should minimize to tray instead of quitting
  try {
    const prefs = await userPreferencesService.getPreferences();
    if (prefs.minimizeToTray && tray) {
      // Don't quit, just hide the window
      if (win) {
        win.hide();
      }
      return;
    }
  } catch (error) {
    console.error('Error checking preferences on window-all-closed:', error);
  }

  if (process.platform !== 'darwin') {
    app.quit();
    win = null;
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});



app.whenReady().then(async () => {
  previousCrashSessionState = readCrashSessionState();
  writeCrashSessionState({
    lastStartedAt: new Date().toISOString(),
    lastExitedCleanly: false,
  });

  // Clean up any broken onyx-local:// URLs from previous failed caching attempts
  // Only clear URLs if the files don't exist in the cache
  const cacheDir = imageCacheService.getCacheDir();
  const clearedCount = await gameStore.clearBrokenOnyxLocalUrls(cacheDir);
  if (clearedCount > 0) {
    console.log(`[App] Cleaned up ${clearedCount} broken image URLs on startup`);
  }

  try {
    const gamesNeedingRecovery = (await gameStore.getLibrary()).filter((game) => {
      const urls = [
        game.boxArtUrl,
        game.bannerUrl,
        game.alternativeBannerUrl,
        game.logoUrl,
        game.heroUrl,
        game.iconUrl,
      ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

      return urls.some((url) => !url.startsWith('onyx-local://'));
    });

    for (const game of gamesNeedingRecovery) {
      imageQueue.add(game.id, game.title, {
        boxArtUrl: game.boxArtUrl,
        bannerUrl: game.bannerUrl,
        alternativeBannerUrl: game.alternativeBannerUrl,
        logoUrl: game.logoUrl,
        heroUrl: game.heroUrl,
        iconUrl: game.iconUrl,
      });
    }

    if (gamesNeedingRecovery.length > 0) {
      console.log(`[Startup] Re-queued artwork recovery for ${gamesNeedingRecovery.length} games with uncached image URLs`);
    }
  } catch (error) {
    console.warn('[Startup] Failed to re-queue uncached artwork recovery:', error);
  }

  // Remove games that use WinGDK executables (WinGDK folders don't contain actual games)
  try {
    const games = await gameStore.getLibrary();
    const wingdkGames = games.filter(game => {
      const exePath = game.exePath?.toLowerCase() || '';
      return exePath.includes('wingdk');
    });

    if (wingdkGames.length > 0) {
      console.log(`[App] Removing ${wingdkGames.length} games with WinGDK executables on startup`);
      for (const game of wingdkGames) {
        await gameStore.deleteGame(game.id);
        console.log(`[App] Removed game: ${game.title} (${game.id}) - WinGDK path: ${game.exePath}`);
      }
    }
  } catch (error) {
    console.error('[App] Error removing WinGDK games on startup:', error);
  }

  // Initialize default launcher configurations if they don't exist
  try {
    const existingConfigs = await appConfigService.getAppConfigs();
    if (Object.keys(existingConfigs).length === 0) {
      console.log('[App] No app configs found. Detecting and initializing launchers...');
      const detected = await launcherDetectionService.detectAllLaunchers();

      if (detected.length > 0) {
        console.log(`[App] Detected ${detected.length} launchers. Initializing app configs...`);
        const configs = detected.map(launcher => ({
          id: launcher.id,
          name: launcher.name,
          path: launcher.path,
          enabled: true,
          autoAdd: true,
        }));

        await appConfigService.saveAppConfigs(configs);
        console.log(`[App] Initialized ${configs.length} default app configs`);
      } else {
        console.log('[App] No launchers detected on system');
      }
    }
  } catch (error) {
    console.error('[App] Error initializing launcher configs:', error);
  }

  // Register the onyx-local protocol handler (serves cached artwork; must run
  // before any windows are created). Implementation: main/onyxLocalProtocol.ts
  registerOnyxLocalProtocol(imageCacheService);

  // On Windows, set the app user model ID for proper taskbar icon display
  if (process.platform === 'win32') {
    // Already set early, but ensuring it matches the ID used in installer/builder
    // app.setAppUserModelId('com.onyx.launcher'); // Removed: Using builder-matched IDs set early

    // Try to set the app icon explicitly (though this is mainly for macOS/Linux)
    // On Windows, the taskbar icon comes from the executable's embedded icon resource
    try {
      let appIconPath: string;
      if (app.isPackaged) {
        const icoPath = path.join(process.resourcesPath, 'icon.ico');
        const pngPath = path.join(process.resourcesPath, 'icon.png');
        appIconPath = existsSync(icoPath) ? icoPath : pngPath;
      } else {
        const icoPath = path.join(__dirname, '../build/icon.ico');
        const pngPath = path.join(__dirname, '../resources/icon.png');
        appIconPath = existsSync(icoPath) ? icoPath : pngPath;
      }

      if (existsSync(appIconPath)) {
        const appIcon = nativeImage.createFromPath(appIconPath);
        if (!appIcon.isEmpty()) {
          // On Windows, this doesn't directly affect taskbar, but helps with window icons
          app.dock?.setIcon(appIcon); // Only works on macOS, but safe to call
        }
      }
    } catch (error) {
      console.error('Error setting app icon:', error);
    }
  }

  // Check preferences and create tray if needed
  try {
    const prefs = await userPreferencesService.getPreferences();
    if (prefs.showSystemTrayIcon ?? true) {
      createTray();
    }
  } catch (error) {
    console.error('Error checking preferences on startup:', error);
    // Default to showing tray icon
    createTray();
  }

  await initializeSuspendService();
  await syncSuspendShortcutState();

  createMenu();

  // Initialize auto-updater before the renderer can trigger the startup sequence.
  initAppUpdateService(() => win, IS_ALPHA);

  registerStartupCoordinator({
    appIsPackaged: app.isPackaged,
    userPreferencesService,
    winReference: { get current() { return win; } },
    performBackgroundScan,
    onShowWindow: () => {
      showMainWindowFromTray().catch((error) => {
        console.error('[Startup] Failed to show window:', error);
      });
    },
    cancelBackgroundScan: () => importService.cancelScanAllSources(),
    addUpdateStatusListener,
    checkForUpdates,
  });

  await createWindow();

  // Initialize background scan interval if enabled
  const backgroundScanEnabled = await appConfigService.getBackgroundScanEnabled();
  if (backgroundScanEnabled) {
    await startBackgroundScan();
  }

  // Dev-only: force image optimization to run on launch for crash capture (ONYX_FORCE_OPTIMIZE=1)
  if (process.env.ONYX_FORCE_OPTIMIZE === '1' && !app.isPackaged) {
    setTimeout(async () => {
      try {
        const library = await gameStore.getLibrary();
        let queued = 0;
        for (const game of library) {
          const urls = {
            boxArtUrl: game.boxArtUrl,
            bannerUrl: game.bannerUrl,
            alternativeBannerUrl: game.alternativeBannerUrl,
            logoUrl: game.logoUrl,
            heroUrl: game.heroUrl,
            iconUrl: game.iconUrl,
          };
          if (Object.values(urls).filter(Boolean).length === 0) continue;
          imageQueue.add(game.id, game.title, urls);
          queued += 1;
        }
        console.log(`[Force optimize] Queued ${queued} games for image optimization`);
      } catch (e) {
        console.error('[Force optimize] Failed to queue:', e);
      }
    }, 4000);
  }

  // Dev-only: full crash repro = clear library, run importer scan, then "import" all (triggers optimization)
  if (process.env.ONYX_CRASH_REPRO === '1' && !app.isPackaged) {
    setTimeout(async () => {
      try {
        console.log('[CrashRepro] Step 1: Clearing library...');
        await gameStore.clearLibrary();
        await gameStore.flushPending();
        console.log('[CrashRepro] Step 2: Scanning all sources...');
        const scanned = await importService.scanAllSources((msg) => console.log('[CrashRepro]', msg));
        console.log(`[CrashRepro] Step 3: Importing ${scanned.length} games...`);
        const randomId = () => Math.random().toString(36).slice(2, 10);
        for (const s of scanned) {
          const gameId = `custom-${Date.now()}-${randomId()}`;
          const steamHeader = s.source === 'steam' && s.appId
            ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${s.appId}/header.jpg`
            : '';
          const game: Game = {
            id: gameId,
            title: s.title || s.originalName || 'Unknown',
            platform: s.source || 'other',
            exePath: s.exePath || s.installPath || '',
            boxArtUrl: steamHeader,
            bannerUrl: steamHeader,
          };
          await gameStore.saveGame(game);
          imageQueue.add(game.id, game.title, {
            boxArtUrl: game.boxArtUrl,
            bannerUrl: game.bannerUrl,
            alternativeBannerUrl: game.alternativeBannerUrl,
            logoUrl: game.logoUrl,
            heroUrl: game.heroUrl,
            iconUrl: game.iconUrl,
          });
        }
        await gameStore.flushPending();
        console.log(`[CrashRepro] Queued ${scanned.length} games for optimization`);
      } catch (e) {
        console.error('[CrashRepro] Failed:', e);
      }
    }, 5000);
  }
});

// Cleanup global shortcuts and background scan on app quit
app.on('before-quit', (event) => {
  if (!isFlushingWindowStateBeforeQuit && flushWindowStateBeforeQuit) {
    event.preventDefault();
    isFlushingWindowStateBeforeQuit = true;
    flushWindowStateBeforeQuit()
      .catch((error) => {
        console.error('[Shutdown] Failed to flush window state before quit:', error);
      })
      .finally(() => {
        app.quit();
      });
    return;
  }

  isAppQuitting = true;
  if (hasRunBeforeQuitCleanup) {
    return;
  }
  hasRunBeforeQuitCleanup = true;

  writeCrashSessionState({
    lastExitedCleanly: true,
    lastExitAt: new Date().toISOString(),
  });
  try {
    imageQueue.cancelAll();
  } catch (error) {
    console.warn('[Shutdown] Failed to cancel image optimization queue:', error);
  }
});

app.on('will-quit', () => {
  unregisterSuspendShortcut();
  processSuspendService?.cleanup();
  stopBackgroundScan();
  gameStore.flushSync();
});

