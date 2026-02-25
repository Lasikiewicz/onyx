import { app, BrowserWindow, ipcMain, Menu, nativeImage } from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
import dotenv from 'dotenv';
import { SteamService } from './SteamService.js';
import { GameStore } from './GameStore.js';
import { MetadataFetcherService } from './MetadataFetcherService.js';
import { LauncherService } from './LauncherService.js';
import { IGDBService } from './IGDBService.js';
import { RAWGService } from './RAWGService.js';
import { SteamGridDBService } from './SteamGridDBService.js';
import { GiantBombService } from './GiantBombService.js';
import { AppConfigService } from './AppConfigService.js';
import { XboxService } from './XboxService.js';
import { UserPreferencesService } from './UserPreferencesService.js';
import { APICredentialsService } from './APICredentialsService.js';
import { LauncherDetectionService } from './LauncherDetectionService.js';
import { ImportService } from './ImportService.js';
import { ImageCacheService } from './ImageCacheService.js';
import { SteamAuthService } from './SteamAuthService.js';
import { ProcessSuspendService } from './ProcessSuspendService.js';
import { BugReportService } from './BugReportService.js';
import { registerGameIPCHandlers } from './ipc/gameHandlers.js';
import { registerMetadataIPCHandlers } from './ipc/metadataHandlers.js';
import { registerAppIPCHandlers } from './ipc/appHandlers.js';
import { registerScanningHandlers } from './ipc/scanningHandlers.js';
import { registerSuspendHandlers } from './ipc/suspendHandlers.js';
import { registerLauncherIPCHandlers } from './ipc/launcherHandlers.js';
import { TrayService } from './ui/tray.js';
import { initAppUpdateService, checkForUpdates } from './AppUpdateService.js';
import { migrateAlphaUserDataFromOnyx } from './AlphaMigration.js';
import { registerProtocolHandler } from './ProtocolService.js';
import { createMenu } from './ui/menu.js';
import { createMainWindow } from './ui/window.js';

// Load environment variables
dotenv.config();

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

// Global Variables
let win: BrowserWindow | null = null;
let trayService: TrayService | null = null;

// Initialize services early to be available everywhere
const steamService = new SteamService();
const gameStore = new GameStore();
const appConfigService = new AppConfigService();
const xboxService = new XboxService();
const userPreferencesService = new UserPreferencesService();
const apiCredentialsService = new APICredentialsService();
const launcherDetectionService = new LauncherDetectionService();
const steamAuthService = new SteamAuthService();
const bugReportService = new BugReportService();
const imageCacheService = new ImageCacheService();
const launcherService = new LauncherService(gameStore);

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

// Migration
migrateAlphaUserDataFromOnyx(IS_ALPHA);

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

// Hardware acceleration check
userPreferencesService.getPreferences().then(prefs => {
  if (prefs.enableHardwareAcceleration === false) {
    console.log('Disabling hardware acceleration based on user preference');
    app.disableHardwareAcceleration();
  }
}).catch(err => {
  console.error('Error checking hardware acceleration preference:', err);
});

// Setup paths for window creation
if (app.isPackaged) {
  process.env.DIST = path.join(__dirname, '../dist');
} else {
  process.env.DIST = path.join(__dirname, '../dist');
}
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../');

// Window creation wrapper
const createWindow = async () => {
  win = await createMainWindow(userPreferencesService, trayService);
};

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
registerGameIPCHandlers(steamService, xboxService, gameStore, imageCacheService);
registerMetadataIPCHandlers(metadataFetcher, imageCacheService, gameStore, userPreferencesService, { get current() { return win; } });
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
      if (trayService && !trayService.hasTray()) trayService.init();
    },
    destroyTray: () => {
      if (trayService) {
        trayService.destroy();
      }
    }
  }
);
registerLauncherIPCHandlers(launcherService, launcherDetectionService, trayService);
const { performBackgroundScan, startBackgroundScan, stopBackgroundScan } = registerScanningHandlers({ get current() { return win; } }, gameStore, appConfigService, importService, metadataFetcher, imageCacheService);
const { registerSuspendShortcut, unregisterSuspendShortcut } = registerSuspendHandlers(processSuspendService);

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', async () => {
  // Check if we should minimize to tray instead of quitting
  try {
    const prefs = await userPreferencesService.getPreferences();
    if (prefs.minimizeToTray && trayService?.hasTray()) {
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
  // Clean up any broken onyx-local:// URLs
  const cacheDir = imageCacheService.getCacheDir();
  const clearedCount = await gameStore.clearBrokenOnyxLocalUrls(cacheDir);
  if (clearedCount > 0) {
    console.log(`[App] Cleaned up ${clearedCount} broken image URLs on startup`);
  }

  // Remove games that use WinGDK executables
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

  // Initialize default launcher configurations
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

  // Register protocol handler
  registerProtocolHandler(gameStore, imageCacheService);

  // On Windows, set the app user model ID for proper taskbar icon display
  if (process.platform === 'win32') {
    try {
      let appIconPath: string;
      if (app.isPackaged) {
        const icoPath = path.join(process.resourcesPath, 'icon.ico');
        const pngPath = path.join(process.resourcesPath, 'icon.png');
        appIconPath = existsSync(path.join(process.resourcesPath, 'icon.ico')) ? icoPath : pngPath;
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
      trayService?.init();
    }
  } catch (error) {
    console.error('Error checking preferences on startup:', error);
    // Default to showing tray icon
    trayService?.init();
  }

  createMenu(() => win);
  await createWindow();

  // Initialize auto-updater (only active when packaged; alpha uses prerelease channel)
  initAppUpdateService(() => win, IS_ALPHA);

  // Coordinate update check and startup scan
  (async () => {
    let updateFound = false;
    let updateCheckComplete = false;
    let updateDismissed = false;
    let startupScanResolve: (() => void) | null = null;
    let updateStatusReceived = false;

    // Set up callbacks for update found/dismissed events
    const updateFoundCallback = () => {
      updateFound = true;
      console.log('[StartupScan] Update found - pausing startup scan');
    };

    const updateDismissedCallback = () => {
      updateDismissed = true;
      console.log('[StartupScan] Update dismissed - resuming startup scan');
      if (startupScanResolve) {
        startupScanResolve();
        startupScanResolve = null;
      }
    };

    // Listen for update status to know when check completes
    const updateStatusListener = (_event: any, payload: { status: string; version?: string; error?: string }) => {
      if (payload.status === 'available' || payload.status === 'not-available' || payload.status === 'error') {
        updateStatusReceived = true;
        if (payload.status === 'available') {
          updateFound = true;
        }
        console.log(`[AppUpdate] Update check completed - status: ${payload.status}`);
      }
    };

    // Register IPC listener for update status
    ipcMain.on('app:update-status', updateStatusListener);

    // Register callbacks (set via global from appHandlers)
    if ((global as any).__updateFoundCallback) {
      (global as any).__updateFoundCallback(updateFoundCallback);
    }
    if ((global as any).__updateDismissedCallback) {
      (global as any).__updateDismissedCallback(updateDismissedCallback);
    }

    // Check for updates on startup if preference is enabled (packaged app only)
    const checkForUpdatesOnStartup = async () => {
      try {
        if (!app.isPackaged) {
          updateCheckComplete = true;
          return;
        }
        const prefs = await userPreferencesService.getPreferences();
        if (prefs.checkForUpdatesOnStartup !== false) {
          console.log('[AppUpdate] Checking for updates on startup...');
          // Wait for renderer to be ready and register listeners
          await new Promise(resolve => setTimeout(resolve, 4000));
          checkForUpdates();
          // Wait for update status to be received (max 20 seconds)
          let waited = 0;
          const maxWait = 20000;
          const checkInterval = 500;
          while (waited < maxWait && !updateStatusReceived) {
            await new Promise(resolve => setTimeout(resolve, checkInterval));
            waited += checkInterval;
          }
          if (!updateStatusReceived) {
            console.log('[AppUpdate] Update check timeout - proceeding anyway');
          }
        } else {
          console.log('[AppUpdate] Update check disabled in preferences');
        }
        updateCheckComplete = true;
      } catch (err) {
        console.error('[AppUpdate] Startup check preference error:', err);
        updateCheckComplete = true;
      } finally {
        // Clean up listener
        ipcMain.removeListener('app:update-status', updateStatusListener);
      }
    };

    // Perform startup scan if enabled in preferences
    const performStartupScan = async () => {
      try {
        const prefs = await userPreferencesService.getPreferences();
        if (!prefs.updateLibrariesOnStartup) {
          console.log('[StartupScan] Startup scan disabled in preferences');
          return;
        }

        console.log('[StartupScan] Update Libraries on Startup is enabled');

        // Wait for renderer to be ready (React app to mount and register listeners)
        console.log('[StartupScan] Waiting for renderer to be ready...');
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Wait for update check to complete BEFORE starting scan
        console.log('[StartupScan] Waiting for update check to complete...');
        while (!updateCheckComplete) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        console.log('[StartupScan] Update check completed, proceeding with scan...');

        // If update was found, wait for user to dismiss it
        if (updateFound && !updateDismissed) {
          console.log('[StartupScan] Update found - waiting for user to dismiss update notification');
          await new Promise<void>((resolve) => {
            startupScanResolve = resolve;
            // Also check periodically if update was dismissed
            const checkInterval = setInterval(() => {
              if (updateDismissed) {
                clearInterval(checkInterval);
                resolve();
              }
            }, 500);
          });
        }

        // Send initial progress message
        if (win && !win.isDestroyed()) {
          console.log('[StartupScan] Sending initial progress message to renderer');
          win.webContents.send('startup:progress', { message: 'Initializing library scan...' });
        }

        // Small additional delay
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log('[StartupScan] Performing startup scan for new games...');

        // Send progress message that scan is starting
        if (win && !win.isDestroyed()) {
          win.webContents.send('startup:progress', { message: 'Starting library scan...' });
        }

        const scanStartTime = Date.now();
        await performBackgroundScan(true);
        const scanDuration = Date.now() - scanStartTime;

        // Ensure the modal is visible for at least 2 seconds total
        // If scan was very quick, add a delay so users see the modal
        const minDisplayTime = 2000;
        const totalElapsed = Date.now() - scanStartTime;
        if (totalElapsed < minDisplayTime) {
          await new Promise(resolve => setTimeout(resolve, minDisplayTime - totalElapsed));
        }

        // Send completion message
        if (win && !win.isDestroyed()) {
          win.webContents.send('startup:progress', { message: 'Scan complete' });
        }

        console.log(`[StartupScan] Startup scan completed in ${scanDuration}ms`);
      } catch (error) {
        console.error('[StartupScan] Error during startup scan:', error);
        // Send error message to UI
        if (win && !win.isDestroyed()) {
          win.webContents.send('startup:progress', { message: 'Error during scan' });
        }
        // Keep error visible for 3 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    };

    // Run update check and startup scan in parallel (scan will wait for update check)
    await Promise.all([
      checkForUpdatesOnStartup(),
      performStartupScan()
    ]);
  })();

  // Initialize background scan interval if enabled
  const backgroundScanEnabled = await appConfigService.getBackgroundScanEnabled();
  if (backgroundScanEnabled) {
    await startBackgroundScan();
  }
});

// Cleanup global shortcuts and background scan on app quit
app.on('will-quit', () => {
  unregisterSuspendShortcut();
  stopBackgroundScan();
});
