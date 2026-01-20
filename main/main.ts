import { app, BrowserWindow, ipcMain, dialog, Menu, protocol, Tray, nativeImage, shell, session, net, globalShortcut } from 'electron';

// Early branding setup - must happen before any other modules initialize paths
const BUILD_PROFILE = process.env.BUILD_PROFILE || 'production';
const IS_ALPHA = BUILD_PROFILE === 'alpha';
app.setName(IS_ALPHA ? 'Onyx Alpha' : 'Onyx');
if (process.platform === 'win32') {
  app.setAppUserModelId(IS_ALPHA ? 'com.lasikiewicz.onyx.alpha' : 'com.lasikiewicz.onyx');
}

// Single instance lock - prevent multiple copies of the app from running
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('Another instance is already running. Quitting...');
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window.
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
  });
}

import path from 'node:path';
import { readdirSync, statSync, existsSync, readFileSync, promises as fsPromises } from 'node:fs';
import { platform } from 'node:os';
import dotenv from 'dotenv';
import { SteamService } from './SteamService.js';
import { GameStore, type Game } from './GameStore.js';
import { MetadataFetcherService, IGDBConfig } from './MetadataFetcherService.js';
import { LauncherService } from './LauncherService.js';
import { IGDBService } from './IGDBService.js';
import { RAWGService } from './RAWGService.js';
import { SteamGridDBService } from './SteamGridDBService.js';
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

// Load environment variables
dotenv.config();

// In CommonJS, __filename and __dirname are available as globals
declare const __filename: string;
declare const __dirname: string;

// Register custom protocol scheme as privileged BEFORE app is ready
// This is required for CSS background-image to work with custom protocols
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'onyx-local',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.js
// │
// In packaged app, __dirname is in app.asar/dist-electron/main.js
// In dev, __dirname is in dist-electron/main.js
// For loadFile(), we can use relative paths from __dirname
// Electron's loadFile() automatically handles ASAR archives
// Check hardware acceleration preference
const userPreferencesServiceForHA = new UserPreferencesService();
userPreferencesServiceForHA.getPreferences().then(prefs => {
  if (prefs.enableHardwareAcceleration === false) {
    console.log('Disabling hardware acceleration based on user preference');
    app.disableHardwareAcceleration();
  }
}).catch(err => {
  console.error('Error checking hardware acceleration preference:', err);
});

if (app.isPackaged) {
  // In packaged app, use relative path from __dirname
  // __dirname = app.asar/dist-electron/main.js
  // So ../dist/index.html = app.asar/dist/index.html
  process.env.DIST = path.join(__dirname, '../dist');
} else {
  process.env.DIST = path.join(__dirname, '../dist');
}
process.env.VITE_PUBLIC = app.isPackaged
  ? process.env.DIST
  : path.join(process.env.DIST, '../');

let win: BrowserWindow | null = null;
let tray: Tray | null = null;
// Here, you can also use other preload
const preload = path.join(__dirname, 'preload.js');
console.log('Preload path:', preload);
// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];

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
  ];

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

  tray.setToolTip('Onyx');


  // Build initial context menu
  updateTrayMenu();

  // Update context menu on right-click to refresh recent games
  // On Windows, we need to update before the menu is shown
  tray.on('right-click', () => {
    console.log('[Tray Menu] Right-click detected, refreshing menu...');
    updateTrayMenu();
  });

  // Note: 'context-menu' event is not available on Tray, only 'right-click' is used

  tray.on('click', () => {
    if (win) {
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
        win.focus();
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

  // Load saved window state
  let windowState: { x?: number; y?: number; width?: number; height?: number; isMaximized?: boolean } | undefined;
  let isFirstLaunch = true;
  try {
    const prefs = await userPreferencesService.getPreferences();
    windowState = prefs.windowState;
    isFirstLaunch = prefs.isFirstLaunch !== false;
  } catch (error) {
    console.error('Error loading window state:', error);
  }

  // Default window dimensions
  const defaultWidth = 1920;
  const defaultHeight = 1080;

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

  // Handle first launch: Maximize and set resolution-optimized defaults
  if (isFirstLaunch) {
    console.log('[First Launch] Detecting resolution and applying optimized defaults...');
    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.bounds;

    win.maximize();

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
  } else if (windowState?.isMaximized) {
    win.maximize();
  }

  // Save window state when window is moved or resized
  let saveWindowStateTimeout: NodeJS.Timeout | null = null;
  const saveWindowState = async () => {
    if (!win) return;

    // Debounce saves to avoid too many writes
    if (saveWindowStateTimeout) {
      clearTimeout(saveWindowStateTimeout);
    }

    saveWindowStateTimeout = setTimeout(async () => {
      try {
        const bounds = win!.getBounds();
        const isMaximized = win!.isMaximized();

        await userPreferencesService.savePreferences({
          windowState: {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            isMaximized,
          },
        });
      } catch (error) {
        console.error('Error saving window state:', error);
      }
    }, 500); // Debounce for 500ms
  };

  win.on('move', saveWindowState);
  win.on('resize', saveWindowState);
  win.on('maximize', saveWindowState);
  win.on('unmaximize', saveWindowState);

  // Handle window close based on preferences
  win.on('close', async (event) => {
    try {
      // Save window state before closing
      if (win) {
        const bounds = win.getBounds();
        const isMaximized = win.isMaximized();

        await userPreferencesService.savePreferences({
          windowState: {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            isMaximized,
          },
        });
      }

      const prefs = await userPreferencesService.getPreferences();
      // Check closeToTray (fallback to minimizeToTray if closeToTray is undefined for backward compatibility)
      if (prefs.closeToTray !== false) {
        // If closeToTray is true or undefined (default), minimize
        event.preventDefault();
        win?.hide();
        return;
      }
      // If closeToTray is false, let it close (app.quit will be called by 'window-all-closed' or similar if it's the last window)
    } catch (error) {
      console.error('Error checking preferences on close:', error);
    }
  });

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', async () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString());
    console.log('Window loaded, checking if electronAPI is available...');

    // Check if we should show the window or start closed to tray
    try {
      const prefs = await userPreferencesService.getPreferences();
      if (!prefs.startClosedToTray) {
        win?.show();
      }
    } catch (error) {
      console.error('Error checking start preferences:', error);
      win?.show();
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

  win.webContents.on('crashed', (event, killed) => {
    console.error('Renderer process crashed:', killed);
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
  if (win) {
    win.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
        if (win) {
          win.webContents.toggleDevTools();
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

// Initialize services
const steamService = new SteamService();
const gameStore = new GameStore();
const appConfigService = new AppConfigService();
const xboxService = new XboxService();
const userPreferencesService = new UserPreferencesService();
const apiCredentialsService = new APICredentialsService();
const launcherDetectionService = new LauncherDetectionService();
const steamAuthService = new SteamAuthService();
const bugReportService = new BugReportService();

// Initialize IGDB service if credentials are available
let igdbService: IGDBService | null = null;
let rawgService: RAWGService | null = null;
let steamGridDBService: SteamGridDBService | null = null;

/**
 * Utility function to add a timeout to any promise
 * Rejects with a timeout error if the promise doesn't resolve within the specified time
 */
const withTimeout = <T,>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = `Request timeout after ${timeoutMs}ms`
): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    ),
  ]);
};

// Function to initialize IGDB service with credentials
// Function to initialize IGDB service with credentials
const initializeIGDBService = async () => {
  try {
    console.log('[IGDB Init] Starting IGDB service initialization...');

    // First check stored credentials, then fall back to environment variables
    const storedCreds = await apiCredentialsService.getCredentials();
    const igdbClientId = storedCreds.igdbClientId || process.env.IGDB_CLIENT_ID;
    const igdbClientSecret = storedCreds.igdbClientSecret || process.env.IGDB_CLIENT_SECRET;

    // Log credential discovery status
    if (storedCreds.igdbClientId && storedCreds.igdbClientSecret) {
      console.log('[IGDB Init] ✓ Found IGDB credentials in stored settings');
    } else if (process.env.IGDB_CLIENT_ID && process.env.IGDB_CLIENT_SECRET) {
      console.log('[IGDB Init] ✓ Found IGDB credentials in environment variables');
    } else if (igdbClientId || igdbClientSecret) {
      console.warn('[IGDB Init] ⚠️  Partial IGDB credentials found (missing Client ID or Secret)');
    } else {
      console.warn('[IGDB Init] ✗ No IGDB credentials found in settings or environment variables');
      console.warn('[IGDB Init] → Please configure IGDB credentials in Settings > APIs to enable metadata detection');
    }

    if (igdbClientId && igdbClientSecret) {
      try {
        console.log('[IGDB Init] Creating IGDB service instance...');
        // Create service instance
        const service = new IGDBService(igdbClientId, igdbClientSecret);

        console.log('[IGDB Init] Validating IGDB credentials...');
        // Validate credentials before using the service
        const isValid = await service.validateCredentials();
        if (isValid) {
          igdbService = service;
          console.log('[IGDB Init] ✓ IGDB service initialized successfully with valid credentials');
          console.log('[IGDB Init] → Metadata detection is now available');
          return true;
        } else {
          console.error('[IGDB Init] ✗ IGDB credentials validation failed - credentials are invalid');
          console.error('[IGDB Init] → Please check your IGDB Client ID and Secret in Settings > APIs');
          igdbService = null;
          return false;
        }
      } catch (error) {
        console.error('[IGDB Init] ✗ Failed to initialize IGDB service:', error);
        console.error('[IGDB Init] → Error details:', error instanceof Error ? error.message : String(error));
        igdbService = null;
        return false;
      }
    } else {
      console.warn('[IGDB Init] ✗ IGDB credentials not configured - app will run but metadata features will be disabled');
      console.warn('[IGDB Init] → IGDB is Optional for metadata, but recommended. Please Configure in Settings > APIs');
      igdbService = null;
      return false;
    }
  } catch (error) {
    console.error('[IGDB Init] ✗ Error during IGDB initialization:', error);
    igdbService = null;
    return false;
  }
};



// Function to initialize RAWG service with API key
const initializeRAWGService = async () => {
  try {
    const storedCreds = await apiCredentialsService.getCredentials();
    const rawgApiKey = storedCreds.rawgApiKey || process.env.RAWG_API_KEY;

    if (rawgApiKey) {
      rawgService = new RAWGService(rawgApiKey);
      console.log('[RAWG Init] RAWG service initialized (Optional API enabled)');
      return true;
    } else {
      console.log('[RAWG Init] RAWG API key not found. RAWG features will be unavailable (Optional).');
      rawgService = null;
      return false;
    }
  } catch (error) {
    rawgService = null;
    return false;
  }
};

// Function to initialize SteamGridDB service with API key
const initializeSteamGridDBService = async () => {
  try {
    const storedCreds = await apiCredentialsService.getCredentials();
    const steamGridDBApiKey = storedCreds.steamGridDBApiKey || process.env.STEAMGRIDDB_API_KEY;

    if (steamGridDBApiKey) {
      steamGridDBService = new SteamGridDBService(steamGridDBApiKey);
      console.log('[SteamGridDB Init] SteamGridDB service initialized (Optional API enabled)');
      return true;
    } else {
      console.log('[SteamGridDB Init] SteamGridDB API key not found. SteamGridDB features will be unavailable (Optional).');
      steamGridDBService = null;
      return false;
    }
  } catch (error) {
    steamGridDBService = null;
    return false;
  }
};

// Initialize metadata fetcher with providers
const metadataFetcher = new MetadataFetcherService(
  null, // IGDB service (will be set after initialization)
  steamService, // Steam service (official store for metadata)
  null, // RAWG service (will be set after initialization)
  null // SteamGridDB service (will be set after initialization)
);

const duckDuckGoImageService = new DuckDuckGoImageService();

// Function to update metadata fetcher with initialized services
const updateMetadataFetcher = () => {
  metadataFetcher.setIGDBService(igdbService);
  metadataFetcher.setSteamService(steamService);
  metadataFetcher.setRAWGService(rawgService);
  metadataFetcher.setSteamGridDBService(steamGridDBService);
};

const launcherService = new LauncherService(gameStore);
const importService = new ImportService(steamService, xboxService, appConfigService, metadataFetcher);
const imageCacheService = new ImageCacheService();

// Process suspend service (initialized conditionally)
let processSuspendService: ProcessSuspendService | null = null;

// Background scan interval
let backgroundScanInterval: NodeJS.Timeout | null = null;

/**
 * Initialize the suspend service if enabled in preferences
 */
async function initializeSuspendService(): Promise<void> {
  try {
    const prefs = await userPreferencesService.getPreferences();

    // Check installer preference on first launch (if preference not set)
    if (prefs.enableSuspendFeature === undefined) {
      const installerPref = await InstallerPreferenceService.readSuspendFeaturePreference();
      if (installerPref !== null) {
        prefs.enableSuspendFeature = installerPref;
        await userPreferencesService.savePreferences({ enableSuspendFeature: installerPref });
        console.log(`[Suspend] Initialized from installer preference: ${installerPref}`);
      }
    }

    if (prefs.enableSuspendFeature) {
      processSuspendService = new ProcessSuspendService();
      if (processSuspendService.isEnabled()) {
        processSuspendService.startProcessMonitoring(5000); // Monitor every 5 seconds
        console.log('[Suspend] Service initialized and monitoring started');
      } else {
        console.warn('[Suspend] Service not available on this platform');
        processSuspendService = null;
      }
    }
  } catch (error) {
    console.error('[Suspend] Failed to initialize service:', error);
    processSuspendService = null;
  }
}

/**
 * Register IPC handlers for suspend operations
 * Handlers are always registered, but check if service is available
 */
function registerSuspendIPCHandlers(): void {
  // Remove existing handlers if any (to avoid duplicates)
  ipcMain.removeHandler('suspend:getRunningGames');
  ipcMain.removeHandler('suspend:suspendGame');
  ipcMain.removeHandler('suspend:resumeGame');
  ipcMain.removeHandler('suspend:getFeatureEnabled');
  ipcMain.removeHandler('suspend:setFeatureEnabled');

  ipcMain.handle('suspend:getRunningGames', async () => {
    try {
      if (!processSuspendService) {
        return [];
      }
      return await processSuspendService.getRunningGames();
    } catch (error) {
      console.error('[Suspend] Error getting running games:', error);
      return [];
    }
  });

  ipcMain.handle('suspend:suspendGame', async (_event, gameId: string) => {
    try {
      if (!processSuspendService) {
        return { success: false, error: 'Suspend service is not enabled' };
      }
      return await processSuspendService.suspendGame(gameId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Suspend] Error suspending game:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('suspend:resumeGame', async (_event, gameId: string) => {
    try {
      if (!processSuspendService) {
        return { success: false, error: 'Suspend service is not enabled' };
      }
      return await processSuspendService.resumeGame(gameId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Suspend] Error resuming game:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('suspend:getFeatureEnabled', async () => {
    try {
      const prefs = await userPreferencesService.getPreferences();
      return prefs.enableSuspendFeature || false;
    } catch (error) {
      console.error('[Suspend] Error getting feature enabled state:', error);
      return false;
    }
  });

  ipcMain.handle('suspend:setFeatureEnabled', async (_event, enabled: boolean) => {
    try {
      await userPreferencesService.savePreferences({ enableSuspendFeature: enabled });

      if (enabled && !processSuspendService) {
        // Initialize service
        processSuspendService = new ProcessSuspendService();
        if (processSuspendService.isEnabled()) {
          processSuspendService.startProcessMonitoring(5000);
          registerSuspendIPCHandlers();
          await registerSuspendShortcut();
          console.log('[Suspend] Service enabled and initialized');
        } else {
          processSuspendService = null;
          return { success: false, error: 'Suspend service is not available on this platform' };
        }
      } else if (!enabled && processSuspendService) {
        // Cleanup service
        unregisterSuspendShortcut();
        processSuspendService.cleanup();
        processSuspendService = null;
        console.log('[Suspend] Service disabled and cleaned up');
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Suspend] Error setting feature enabled:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('suspend:getShortcut', async () => {
    try {
      const prefs = await userPreferencesService.getPreferences();
      return prefs.suspendShortcut || 'Ctrl+Shift+S';
    } catch (error) {
      console.error('[Suspend] Error getting shortcut:', error);
      return 'Ctrl+Shift+S';
    }
  });

  ipcMain.handle('suspend:setShortcut', async (_event, shortcut: string) => {
    try {
      await userPreferencesService.savePreferences({ suspendShortcut: shortcut });
      await registerSuspendShortcut();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Suspend] Error setting shortcut:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });

  ipcMain.handle('suspend:toggleActiveGame', async () => {
    try {
      if (!processSuspendService) {
        return { success: false, error: 'Suspend service is not enabled' };
      }

      const runningGames = await processSuspendService.getRunningGames();
      if (runningGames.length === 0) {
        return { success: false, error: 'No games are currently running' };
      }

      // Get the first running game (or most recently active)
      const game = runningGames[0];

      if (game.status === 'running') {
        return await processSuspendService.suspendGame(game.gameId);
      } else {
        return await processSuspendService.resumeGame(game.gameId);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Suspend] Error toggling active game:', errorMessage);
      return { success: false, error: errorMessage };
    }
  });
}

/**
 * Register global keyboard shortcut for suspend/resume
 */
async function registerSuspendShortcut(): Promise<void> {
  try {
    // Unregister existing shortcut first
    unregisterSuspendShortcut();

    if (!processSuspendService || !processSuspendService.isEnabled()) {
      return;
    }

    const prefs = await userPreferencesService.getPreferences();
    const shortcut = prefs.suspendShortcut || 'Ctrl+Shift+S';

    if (!shortcut) {
      return; // No shortcut configured
    }

    // Electron's globalShortcut supports both single keys (like "End", "F1") 
    // and key combinations (like "Ctrl+Shift+S")
    // We'll use the shortcut as-is
    const registered = globalShortcut.register(shortcut, async () => {
      console.log(`[Suspend] Shortcut ${shortcut} pressed`);
      try {
        if (!processSuspendService) {
          return;
        }

        const games = await processSuspendService.getRunningGames();
        if (games.length === 0) {
          console.log('[Suspend] No games running');
          return;
        }

        // Get first running game (most recently active)
        const game = games[0];
        if (game.status === 'running') {
          const result = await processSuspendService.suspendGame(game.gameId);
          if (result.success) {
            console.log(`[Suspend] Suspended ${game.title} via shortcut`);
          }
        } else {
          const result = await processSuspendService.resumeGame(game.gameId);
          if (result.success) {
            console.log(`[Suspend] Resumed ${game.title} via shortcut`);
          }
        }
      } catch (error) {
        console.error('[Suspend] Error in shortcut handler:', error);
      }
    });

    if (registered) {
      console.log(`[Suspend] Global shortcut registered: ${shortcut}`);
    } else {
      console.error(`[Suspend] Failed to register global shortcut: ${shortcut}`);
    }
  } catch (error) {
    console.error('[Suspend] Error registering shortcut:', error);
  }
}

/**
 * Unregister global keyboard shortcut
 */
function unregisterSuspendShortcut(): void {
  try {
    globalShortcut.unregisterAll();
    console.log('[Suspend] All global shortcuts unregistered');
  } catch (error) {
    console.error('[Suspend] Error unregistering shortcut:', error);
  }
}


// Build dynamic tray context menu with recently played games
async function buildTrayContextMenu(): Promise<Electron.Menu> {
  const menuItems: Electron.MenuItemConstructorOptions[] = [];

  // Get the 5 most recently played games
  try {
    const games = await gameStore.getLibrary();
    console.log(`[Tray Menu] Total games in library: ${games.length}`);

    const visibleGames = games.filter(game => !game.hidden);
    console.log(`[Tray Menu] Visible games: ${visibleGames.length}`);

    const gamesWithLastPlayed = visibleGames.filter(game => game.lastPlayed);
    console.log(`[Tray Menu] Games with lastPlayed: ${gamesWithLastPlayed.length}`);

    let gamesToShow: Game[] = [];

    if (gamesWithLastPlayed.length > 0) {
      // Sort by lastPlayed date, most recent first
      gamesToShow = gamesWithLastPlayed
        .sort((a, b) => {
          const dateA = new Date(a.lastPlayed || 0).getTime();
          const dateB = new Date(b.lastPlayed || 0).getTime();
          return dateB - dateA; // Most recent first
        })
        .slice(0, 5);
    } else if (visibleGames.length > 0) {
      // Fallback: if no games have lastPlayed, show first 5 visible games
      gamesToShow = visibleGames.slice(0, 5);
      console.log(`[Tray Menu] No games with lastPlayed, showing first ${gamesToShow.length} visible games`);
    }

    console.log(`[Tray Menu] Games to show in menu: ${gamesToShow.length}`);
    if (gamesToShow.length > 0) {
      gamesToShow.forEach((game, index) => {
        const label = game.title.length > 50 ? game.title.substring(0, 47) + '...' : game.title;
        console.log(`[Tray Menu] Adding game ${index + 1}: ${label}${game.lastPlayed ? ` (lastPlayed: ${game.lastPlayed})` : ''}`);
        menuItems.push({
          label: label,
          click: async () => {
            try {
              await launcherService.launchGame(game.id);
              // Minimize window if preference is set
              try {
                const prefs = await userPreferencesService.getPreferences();
                if (prefs.minimizeOnGameLaunch && win) {
                  win.minimize();
                }
              } catch (error) {
                console.error('Error checking minimize preference:', error);
              }
            } catch (error) {
              console.error('Error launching game from tray:', error);
            }
          },
        });
      });
      menuItems.push({ type: 'separator' });
    }
  } catch (error) {
    console.error('[Tray Menu] Error building tray menu with recent games:', error);
  }

  // Add standard menu items
  menuItems.push(
    {
      label: 'Show Onyx',
      click: () => {
        if (win) {
          win.show();
          win.focus();
        } else {
          createWindow();
        }
      },
    },
    {
      label: 'Exit',
      click: () => {
        app.quit();
      },
    }
  );

  return Menu.buildFromTemplate(menuItems);
}

// Function to update the tray menu globally
async function updateTrayMenu() {
  try {
    const contextMenu = await buildTrayContextMenu();
    if (tray) {
      tray.setContextMenu(contextMenu);
      console.log('[Tray Menu] Context menu updated');
    }
  } catch (error) {
    console.error('[Tray Menu] Error updating context menu:', error);
    // Set a fallback menu
    const fallbackMenu = Menu.buildFromTemplate([
      {
        label: 'Show Onyx',
        click: () => {
          if (win) {
            win.show();
            win.focus();
          } else {
            createWindow();
          }
        },
      },
      {
        label: 'Exit',
        click: () => {
          app.quit();
        },
      },
    ]);
    tray?.setContextMenu(fallbackMenu);
  }
}

// Initialize on startup (wrapped in IIFE to handle async)
(async () => {
  // Register handlers immediately so UI doesn't error on missing handlers
  registerSuspendIPCHandlers();

  await initializeIGDBService();
  await initializeRAWGService();
  await initializeSteamGridDBService();
  updateMetadataFetcher();

  // Initialize optional services
  await initializeSuspendService();
})();

// Try to set default Steam path if it exists
try {
  if (platform() === 'win32') {
    const defaultPath = existsSync('C:\\Program Files (x86)\\Steam')
      ? 'C:\\Program Files (x86)\\Steam'
      : existsSync('C:\\Program Files\\Steam')
        ? 'C:\\Program Files\\Steam'
        : null;
    if (defaultPath) {
      steamService.setSteamPath(defaultPath);
    }
  }
} catch (error) {
  console.warn('Could not set default Steam path:', error);
}

// Set up IPC handlers
ipcMain.handle('steam:scanGames', async () => {
  try {
    // Ensure Steam path is set
    let steamPath: string;
    try {
      steamPath = steamService.getSteamPath();
      console.log(`Steam path: ${steamPath}`);
    } catch (pathError) {
      console.error('Steam path not configured:', pathError);
      // Return empty array instead of throwing - let the UI handle the error
      return [];
    }

    // Verify Steam path exists
    if (!existsSync(steamPath)) {
      console.error(`Steam path does not exist: ${steamPath}`);
      return [];
    }

    // Verify steamapps folder exists
    const steamappsPath = path.join(steamPath, 'steamapps');
    if (!existsSync(steamappsPath)) {
      console.error(`Steamapps folder does not exist: ${steamappsPath}`);
      return [];
    }

    const steamGames = steamService.scanSteamGames();
    console.log(`Found ${steamGames.length} Steam games`);

    // Don't auto-merge - let the user select which games to import
    return steamGames;
  } catch (error) {
    console.error('Error in steam:scanGames handler:', error);
    // Return empty array instead of throwing
    return [];
  }
});

ipcMain.handle('gameStore:getLibrary', async () => {
  try {
    const library = await gameStore.getLibrary();

    // Validate and fix broken onyx-local:// URLs
    const validatedLibrary = await Promise.all(library.map(async (game) => {
      const validatedGame = { ...game };

      // Check each image URL and re-cache if broken
      let needsUpdate = false;

      if (validatedGame.boxArtUrl?.startsWith('onyx-local://')) {
        const fixed = await imageCacheService.cacheImage(validatedGame.boxArtUrl, game.id, 'boxart');
        if (fixed && fixed !== validatedGame.boxArtUrl && fixed !== '') {
          // URL was fixed (converted to new format, file found, or reconstructed HTTPS URL)
          validatedGame.boxArtUrl = fixed;
          needsUpdate = true;
        } else if (!fixed || fixed === '') {
          // File not found with stored URL - try to find file with current game ID
          const foundFile = await imageCacheService.findCachedImage(game.id, 'boxart');
          if (foundFile) {
            console.log(`[getLibrary] Fixed boxart URL for ${game.title}: found file with current game ID`);
            validatedGame.boxArtUrl = foundFile;
            needsUpdate = true;
          }
        }
        // If fixed is empty or same, keep original (broken URLs will fail to load but won't spam)
      }

      if (validatedGame.bannerUrl?.startsWith('onyx-local://')) {
        const fixed = await imageCacheService.cacheImage(validatedGame.bannerUrl, game.id, 'banner');
        if (fixed && fixed !== validatedGame.bannerUrl && fixed !== '') {
          // URL was fixed (converted to new format, file found, or reconstructed HTTPS URL)
          validatedGame.bannerUrl = fixed;
          needsUpdate = true;
        }
        // If fixed is empty or same, keep original (broken URLs will fail to load but won't spam)
      }

      // Save all updates at once if any URLs were fixed
      if (needsUpdate) {
        await gameStore.updateGameMetadata(
          game.id,
          validatedGame.boxArtUrl,
          validatedGame.bannerUrl,
          validatedGame.logoUrl,
          validatedGame.heroUrl
        );
      }

      if (validatedGame.logoUrl?.startsWith('onyx-local://')) {
        const fixed = await imageCacheService.cacheImage(validatedGame.logoUrl, game.id, 'logo');
        if (fixed && fixed !== validatedGame.logoUrl) {
          // URL format was converted (old to new format) - update it
          validatedGame.logoUrl = fixed;
          needsUpdate = true;
        } else if (fixed === '') {
          // File doesn't exist - only clear if we're sure it's broken
          // Don't clear if it's just a format conversion issue
          console.warn(`[getLibrary] Logo file not found for ${game.title}, but preserving URL: ${validatedGame.logoUrl}`);
          // Keep the URL - it might be valid but in old format that will be converted on next save
        }
      }

      if (validatedGame.heroUrl?.startsWith('onyx-local://')) {
        const fixed = await imageCacheService.cacheImage(validatedGame.heroUrl, game.id, 'hero');
        if (fixed && fixed !== validatedGame.heroUrl) {
          // URL format was converted (old to new format) - update it
          validatedGame.heroUrl = fixed;
          needsUpdate = true;
        } else if (fixed === '') {
          // File doesn't exist - only clear if we're sure it's broken
          console.warn(`[getLibrary] Hero file not found for ${game.title}, but preserving URL: ${validatedGame.heroUrl}`);
          // Keep the URL - it might be valid but in old format that will be converted on next save
        }
      }

      return validatedGame;
    }));

    return validatedLibrary;
  } catch (error) {
    console.error('Error in gameStore:getLibrary handler:', error);
    return [];
  }
});

ipcMain.handle('gameStore:saveGame', async (_event, game: Game, oldGame?: Game) => {
  try {
    console.log(`[saveGame] Saving game: ${game.title} (${game.id})`);

    // If oldGame is provided and has a different ID, delete it first to prevent duplicates
    // This happens when Fix Match changes the game ID (e.g., from xbox-pc-... to steam-...)
    if (oldGame && oldGame.id !== game.id) {
      console.log(`[saveGame] Game ID changed from ${oldGame.id} to ${game.id}, deleting old entry`);
      try {
        await gameStore.deleteGame(oldGame.id);
        console.log(`[saveGame] Successfully deleted old game entry: ${oldGame.id}`);
      } catch (deleteError) {
        console.warn(`[saveGame] Failed to delete old game entry (may not exist): ${oldGame.id}`, deleteError);
        // Continue with save even if delete fails
      }
    }

    // Cache images before saving
    const cachedImages = await imageCacheService.cacheImages({
      boxArtUrl: game.boxArtUrl,
      bannerUrl: game.bannerUrl,
      logoUrl: game.logoUrl,
      heroUrl: game.heroUrl,
    }, game.id);

    // Update game with cached image URLs
    // IMPORTANT: Preserve original URLs if caching returns empty (might be old format that needs conversion)
    const gameWithCachedImages: Game = {
      ...game,
      boxArtUrl: cachedImages.boxArtUrl || game.boxArtUrl,
      bannerUrl: cachedImages.bannerUrl || game.bannerUrl,
      // For logo: if cachedImages.logoUrl is empty but game.logoUrl exists and is onyx-local, preserve it
      // The URL format will be converted on next load
      logoUrl: cachedImages.logoUrl || (game.logoUrl?.startsWith('onyx-local://') ? game.logoUrl : undefined),
      heroUrl: cachedImages.heroUrl || game.heroUrl,
    };

    // Log logo URL changes for debugging
    if (game.logoUrl && game.logoUrl !== gameWithCachedImages.logoUrl) {
      console.log(`[saveGame] Logo URL changed for ${game.title}: ${game.logoUrl.substring(0, 60)}... -> ${gameWithCachedImages.logoUrl?.substring(0, 60) || 'undefined'}...`);
    } else if (game.logoUrl && gameWithCachedImages.logoUrl) {
      console.log(`[saveGame] Logo URL preserved for ${game.title}: ${game.logoUrl.substring(0, 60)}...`);
    }

    await gameStore.saveGame(gameWithCachedImages);
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
    console.error('Error in gameStore:reorderGames handler:', error);
    return false;
  }
});

ipcMain.handle('gameStore:deleteGame', async (_event, gameId: string) => {
  try {
    await gameStore.deleteGame(gameId);
    return true;
  } catch (error) {
    console.error('Error in gameStore:deleteGame handler:', error);
    return false;
  }
});

// Remove games that use WinGDK executables
ipcMain.handle('gameStore:removeWinGDKGames', async () => {
  try {
    const games = await gameStore.getLibrary();
    const wingdkGames = games.filter(game => {
      const exePath = game.exePath?.toLowerCase() || '';
      return exePath.includes('wingdk');
    });

    if (wingdkGames.length === 0) {
      return { success: true, removedCount: 0, message: 'No games with WinGDK executables found' };
    }

    console.log(`[gameStore] Removing ${wingdkGames.length} games with WinGDK executables`);

    for (const game of wingdkGames) {
      await gameStore.deleteGame(game.id);
      console.log(`[gameStore] Removed game: ${game.title} (${game.id}) - WinGDK path: ${game.exePath}`);
    }

    return {
      success: true,
      removedCount: wingdkGames.length,
      removedGames: wingdkGames.map(g => ({ id: g.id, title: g.title, exePath: g.exePath }))
    };
  } catch (error) {
    console.error('Error removing WinGDK games:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Clear game library handler - clears only games and images
ipcMain.handle('app:clearGameLibrary', async () => {
  try {
    console.log('[Reset] Starting game library clearance...');

    // 1. Clear in-memory game store
    await gameStore.clearLibrary();
    console.log('[Reset] Game store cleared');

    // 2. Clear cached images
    await imageCacheService.clearCache();
    console.log('[Reset] Image cache cleared');

    // 3. Delete game library storage files
    const { unlinkSync } = require('node:fs');
    const userDataPath = app.getPath('userData');

    const filesToClear = [
      'game-library.json',
      'game-library.json.bak',
    ];

    for (const fileName of filesToClear) {
      const filePath = path.join(userDataPath, fileName);
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
          console.log(`[Reset] Deleted library file: ${fileName}`);
        } catch (err) {
          console.warn(`[Reset] Could not delete ${fileName}:`, err);
        }
      }
    }

    // 4. Also clear the custom image cache directory
    try {
      const { rmSync } = require('node:fs');
      const customCacheDir = imageCacheService.getCacheDir();
      if (existsSync(customCacheDir)) {
        rmSync(customCacheDir, { recursive: true, force: true });
        console.log(`[Reset] Deleted custom image cache: ${customCacheDir}`);
      }
    } catch (err) {
      console.warn('[Reset] Could not delete custom image cache:', err);
    }

    // 5. Relaunch app to ensure clean state
    app.relaunch();
    app.exit(0);

    return { success: true };
  } catch (error) {
    console.error('[Reset] Error clearing game library:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Reset app handler - clears all data
ipcMain.handle('app:reset', async () => {
  try {
    console.log('[Reset] Starting comprehensive app reset...');

    // 1. Clear browser storage data (LocalStorage, IndexedDB, Cache, etc.)
    try {
      if (session.defaultSession) {
        await session.defaultSession.clearStorageData();
        console.log('[Reset] Browser storage cleared');
      }
    } catch (storageError) {
      console.warn('[Reset] Error clearing browser storage:', storageError);
    }

    // 2. Clear all in-memory stores (already reset their underlying json files)
    await gameStore.clearLibrary();
    await userPreferencesService.resetPreferences();
    await appConfigService.clearAppConfigs();
    await apiCredentialsService.clearCredentials();
    await steamAuthService.clearAuth();

    // 3. Clear cached images
    await imageCacheService.clearCache();

    // 4. Thoroughly delete files/folders in userData
    const { readdirSync, unlinkSync, rmSync } = require('node:fs');
    const userDataPath = app.getPath('userData');

    // Files to delete (configuration files)
    const filesToClear = [
      'game-library.json',
      'user-preferences.json',
      'app-configs.json',
      'api-credentials.json',
      'steam-auth.json',
      'user-preferences.json.bak', // Fallbacks if they exist
      'game-library.json.bak',
    ];

    for (const fileName of filesToClear) {
      const filePath = path.join(userDataPath, fileName);
      if (existsSync(filePath)) {
        try {
          unlinkSync(filePath);
          console.log(`[Reset] Deleted config file: ${fileName}`);
        } catch (err) {
          console.warn(`[Reset] Could not delete ${fileName}:`, err);
        }
      }
    }

    // Folders to delete
    const foldersToClear = [
      'logs',
      'cache', // Old cache location
      path.join('Cache'), // Electron standard cache
      path.join('Code Cache'),
      path.join('GPUCache'),
      path.join('Local Storage'),
      path.join('Session Storage'),
      path.join('blob_storage'),
      path.join('Network'),
    ];

    for (const folderName of foldersToClear) {
      const folderPath = path.join(userDataPath, folderName);
      if (existsSync(folderPath)) {
        try {
          rmSync(folderPath, { recursive: true, force: true });
          console.log(`[Reset] Deleted folder: ${folderName}`);
        } catch (err) {
          console.warn(`[Reset] Could not delete folder ${folderName}:`, err);
        }
      }
    }

    // 5. Also clear the custom image cache directory (local app data on Windows)
    try {
      const customCacheDir = imageCacheService.getCacheDir();
      if (existsSync(customCacheDir)) {
        rmSync(customCacheDir, { recursive: true, force: true });
        console.log(`[Reset] Deleted custom image cache: ${customCacheDir}`);
      }
    } catch (err) {
      console.warn('[Reset] Could not delete custom image cache:', err);
    }

    console.log('[Reset] Comprehensive reset complete. Relaunching...');

    // 6. Relaunch the app to ensure fresh state
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

// Metadata fetcher IPC handlers
ipcMain.handle('metadata:searchArtwork', async (_event, title: string, steamAppId?: string, bypassCache?: boolean) => {
  try {
    console.log(`[searchArtwork] Fetching artwork for "${title}" (steamAppId: ${steamAppId})`);
    const metadata = await withTimeout(
      metadataFetcher.searchArtwork(title, steamAppId, bypassCache),
      60000, // 60 seconds - allow more time for SteamGridDB + RAWG
      `Artwork fetch timeout for "${title}"`
    );
    console.log(`[searchArtwork] Result for "${title}":`, {
      boxArtUrl: metadata?.boxArtUrl ? 'present' : 'missing',
      logoUrl: metadata?.logoUrl ? 'present' : 'missing',
      bannerUrl: metadata?.bannerUrl ? 'present' : 'missing',
    });
    return metadata;
  } catch (error) {
    console.error('Error in metadata:searchArtwork handler:', error);
    // Return partial metadata instead of null to allow fallback
    return {
      boxArtUrl: undefined,
      bannerUrl: undefined,
      logoUrl: undefined,
      heroUrl: undefined,
    };
  }
});

// Enhanced search and match with confidence scoring
ipcMain.handle('metadata:searchAndMatch', async (_event, scannedGame: any, searchQuery?: string) => {
  try {
    const game: ScannedGameResult = scannedGame;

    const matchResult = await metadataFetcher.searchAndMatchGame(game, searchQuery);

    return {
      success: true,
      match: matchResult.match,
      confidence: matchResult.confidence,
      reasons: matchResult.reasons,
      allResults: matchResult.allResults,
    };
  } catch (error) {
    console.error('Error in metadata:searchAndMatch handler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      match: null,
      confidence: 0,
      reasons: [],
      allResults: [],
    };
  }
});

// Fix match: Search by name or Steam App ID and fetch complete metadata
ipcMain.handle('metadata:fixMatch', async (_event, query: string, scannedGame?: any) => {
  try {
    // Check if query is a Steam App ID (numeric)
    const isSteamAppId = /^\d+$/.test(query.trim());

    let searchResults: any[] = [];
    let matchedGame: any = null;

    if (isSteamAppId) {
      // Search by Steam App ID
      const steamAppId = query.trim();
      try {
        // Fetch directly from Steam Store API
        const storeApiUrl = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&l=english`;
        const response = await fetch(storeApiUrl);

        if (response.ok) {
          const data = await response.json() as Record<string, any>;
          const appData = data[steamAppId];

          if (appData && appData.success && appData.data) {
            matchedGame = {
              id: `steam-${steamAppId}`,
              title: appData.data.name,
              source: 'steam',
              externalId: steamAppId,
              steamAppId: steamAppId,
            };
          }
        }
      } catch (err) {
        console.warn(`[Fix Match] Error fetching Steam App ID ${steamAppId}:`, err);
      }
    } else {
      // Search by name
      const searchResponse = await metadataFetcher.searchGames(query);
      searchResults = searchResponse;

      if (scannedGame) {
        // Use matcher to find best match
        const game: ScannedGameResult = scannedGame;
        const matchResult = await metadataFetcher.searchAndMatchGame(game, query);
        matchedGame = matchResult.match;
      } else {
        // No scanned game, use first result
        matchedGame = searchResults[0] || null;
      }
    }

    if (!matchedGame) {
      return {
        success: false,
        error: 'No game found matching the query',
        metadata: null,
      };
    }

    // Fetch complete metadata for the matched game
    const metadata = await metadataFetcher.fetchCompleteMetadata(
      matchedGame.title,
      matchedGame,
      matchedGame.steamAppId
    );

    return {
      success: true,
      matchedGame,
      metadata,
    };
  } catch (error) {
    console.error('Error in metadata:fixMatch handler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      metadata: null,
    };
  }
});

ipcMain.handle('metadata:fetchAndUpdate', async (_event, gameId: string, title: string) => {
  try {
    // Extract Steam App ID if it's a Steam game
    const steamAppId = gameId.startsWith('steam-') ? gameId.replace('steam-', '') : undefined;
    const metadata = await withTimeout(
      metadataFetcher.searchArtwork(title, steamAppId),
      60000, // 60 seconds for full metadata fetch (increased from 20s)
      `Metadata fetch timeout for "${title}"`
    );

    // Check if local storage is enabled
    const prefs = await userPreferencesService.getPreferences();
    let finalMetadata = metadata;

    if (prefs.storeMetadataLocally !== false) { // Default to true
      // Cache images locally with timeout
      try {
        const cachedImages = await withTimeout(
          imageCacheService.cacheImages({
            boxArtUrl: metadata.boxArtUrl,
            bannerUrl: metadata.bannerUrl,
            logoUrl: metadata.logoUrl,
            heroUrl: metadata.heroUrl,
            screenshots: metadata.screenshots,
          }, gameId),
          20000, // 20 seconds for image caching
          `Image cache timeout for "${title}"`
        );

        finalMetadata = {
          ...metadata,
          ...cachedImages,
        };
      } catch (cacheError) {
        console.warn(`[ImageCache] Failed to cache images for ${title}:`, cacheError);
        // Continue with uncached metadata
      }
    }

    const success = await gameStore.updateGameMetadata(
      gameId,
      finalMetadata.boxArtUrl,
      finalMetadata.bannerUrl,
      finalMetadata.logoUrl,
      finalMetadata.heroUrl
    );
    return { success, metadata: finalMetadata };
  } catch (error) {
    console.error('Error in metadata:fetchAndUpdate handler:', error);
    return { success: false, metadata: null };
  }
});

ipcMain.handle('metadata:setIGDBConfig', async (_event, config: IGDBConfig) => {
  try {
    // This handler is deprecated - use api:saveCredentials instead
    // But for backward compatibility, we'll still handle it
    // Note: IGDBConfig uses accessToken but IGDBService needs clientSecret
    // This is a legacy issue - prefer using api:saveCredentials
    console.warn('metadata:setIGDBConfig is deprecated. Use api:saveCredentials instead.');

    // Only create service if both clientId and accessToken (used as clientSecret) are provided
    if (config.clientId && config.accessToken) {
      igdbService = new IGDBService(config.clientId, config.accessToken);
      updateMetadataFetcher();
      return true;
    } else {
      // Clear IGDB service if credentials are not provided
      igdbService = null;
      updateMetadataFetcher();
      return true;
    }
  } catch (error) {
    console.error('Error in metadata:setIGDBConfig handler:', error);
    igdbService = null;
    updateMetadataFetcher();
    return false;
  }
});

ipcMain.handle('metadata:setMockMode', async (_event, enabled: boolean) => {
  // This is now handled automatically by provider availability
  // Keep for backward compatibility but don't do anything
  return true;
});

// IGDB search metadata handler
ipcMain.handle('metadata:searchMetadata', async (_event, gameTitle: string) => {
  try {
    if (!igdbService) {
      return { success: false, error: 'IGDB service not configured. Please configure your API credentials in Settings > APIs.', results: [] };
    }

    let results;
    try {
      results = await withTimeout(
        igdbService.searchGame(gameTitle),
        20000, // 20 seconds for metadata search
        `Metadata search timeout for "${gameTitle}"`
      );
    } catch (error: any) {
      // If authentication fails, disable IGDB service
      if (error?.message?.includes('authenticate') || error?.message?.includes('invalid')) {
        console.error('IGDB authentication failed. Disabling IGDB service:', error.message);
        igdbService = null;
        updateMetadataFetcher();
        return {
          success: false,
          error: 'IGDB credentials are invalid. Please check your API credentials in Settings > APIs.',
          results: [],
        };
      }
      throw error;
    }



    return { success: true, results };
  } catch (error) {
    console.error('Error in metadata:searchMetadata handler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      results: [],
    };
  }
});



// Search games across all providers (IGDB and SteamGridDB)
ipcMain.handle('metadata:searchGames', async (_event, gameTitle: string) => {
  try {
    console.log(`[IPC metadata:searchGames] Searching for "${gameTitle}"...`);

    // Enforce SteamGridDB requirement
    if (!steamGridDBService || !steamGridDBService.isAvailable()) {
      const errorMsg = 'SteamGridDB is required for searching. Please configure the API Key in Settings.';
      console.warn(`[IPC metadata:searchGames] ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        results: []
      };
    }

    // Check provider availability before searching
    const providerStatus = metadataFetcher.getProviderStatus();
    const availableProviders = providerStatus.filter(p => p.available);

    if (availableProviders.length === 0) {
      const errorMsg = 'No metadata providers are configured. Please configure IGDB credentials in Settings > APIs to enable game metadata detection.';
      console.warn(`[IPC metadata:searchGames] ${errorMsg}`);
      return {
        success: false,
        error: errorMsg,
        results: [],
      };
    }

    console.log(`[IPC metadata:searchGames] Active providers: ${availableProviders.map(p => p.name).join(', ')}`);

    // First, try to find exact match on Steam Store API
    // Priority: 1) Check user's Steam library, 2) Search SteamDB.info to find App ID, then verify with Steam Store API
    const exactSteamMatch: any = await (async () => {
      const normalizedTitle = gameTitle.trim().toLowerCase();

      // Method 1: Check user's Steam library first (if available)
      if (steamService) {
        try {
          const steamGames = steamService.scanSteamGames();
          const matchingGame = steamGames.find(g =>
            g.name.trim().toLowerCase() === normalizedTitle
          );

          if (matchingGame) {
            // Found in user's library - verify with Steam Store API
            try {
              const steamAppId = matchingGame.appId;
              const storeApiUrl = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&l=english`;
              const response = await fetch(storeApiUrl);

              if (response.ok) {
                const data = await response.json() as Record<string, any>;
                const appData = data[steamAppId];

                if (appData && appData.success && appData.data) {
                  const steamName = appData.data.name?.trim().toLowerCase();

                  // Verify exact match with Steam Store API name
                  if (steamName === normalizedTitle) {
                    console.log(`[Steam Search] Found exact match in library: "${appData.data.name}" (App ID: ${steamAppId})`);
                    // Parse release date from Steam format
                    let releaseDate: string | undefined;
                    if (appData.data.release_date && appData.data.release_date.date) {
                      const dateStr = appData.data.release_date.date;
                      if (dateStr !== 'Coming soon' && dateStr !== 'TBA') {
                        try {
                          const date = new Date(dateStr);
                          if (!isNaN(date.getTime())) {
                            releaseDate = date.toISOString().split('T')[0];
                          }
                        } catch (err) {
                          // Ignore date parsing errors
                        }
                      }
                    }

                    return {
                      id: `steam-${steamAppId}`,
                      title: appData.data.name,
                      source: 'steam',
                      externalId: steamAppId,
                      steamAppId: steamAppId,
                      releaseDate: releaseDate,
                    };
                  }
                }
              }
            } catch (err) {
              console.warn(`[Steam Search] Error verifying Steam App ID ${matchingGame.appId}:`, err);
            }
          }
        } catch (err) {
          console.warn('[Steam Search] Error checking Steam library:', err);
        }
      }

      return null;
    })();

    // Search Steam Store and other providers in PARALLEL
    const normalizedTitle = gameTitle.trim().toLowerCase();
    // 1. Steam Search Task
    const steamSearchPromise = (async () => {
      let steamGames: any[] = [];
      try {
        if (!steamService) return [];

        console.log(`[Steam Search] Searching Steam Store for "${gameTitle}" via API`);
        // Use optimized storesearch API
        const results = await steamService.searchGames(gameTitle);

        steamGames = results.map((game, index) => {
          const isExactMatch = game.name.trim().toLowerCase() === normalizedTitle;
          return {
            id: `steam-${game.appId}`,
            title: game.name,
            source: 'steam',
            externalId: game.appId,
            steamAppId: game.appId,
            // Construct high-quality boxart URL
            boxArtUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appId}/library_600x900_2x.jpg`,
            // Use tiny image as fallback or placeholder provided by API? 
            // The API provides tiny_image, but we prefer the library asset.

            // Prioritize: 3000 base + relevance (inverse index) + exact match bonus
            // This preserves the API's relevance order
            score: 3000 - index + (isExactMatch ? 100 : 0),
            isExactMatch
          };
        });

        console.log(`[Steam Search] Found ${steamGames.length} games via API`);

      } catch (err) {
        console.warn('[Steam Search] Error:', err);
      }
      return steamGames;
    })();

    // 2. MetadataProvider Search Task (SGDB, RAWG, IGDB)
    const otherSearchPromise = (async () => {
      try {
        const results = await metadataFetcher.searchGames(gameTitle);

        // Transform and hydrate
        const transformed = await Promise.all(results.map(async (result) => {
          // Skip Steam results from here to avoid dupes (we use custom search logic above)
          if (result.source === 'steam') return null;

          const item: any = { ...result };

          // Assign Score based on source
          if (item.source === 'steamgriddb') item.score = 2000;
          else if (item.source === 'rawg') item.score = 1000;
          else if (item.source === 'igdb') item.score = 500;
          else item.score = 100;

          // IGDB Hydration (Year/Platform)
          if (item.source === 'igdb' && item.externalId && igdbService) {
            try {
              const igdbRes = await igdbService.searchGame(String(item.externalId));
              const igdbGame = igdbRes.find(r => r.id === item.externalId) || igdbRes[0];
              if (igdbGame) {
                if (igdbGame.releaseDate) item.year = new Date(igdbGame.releaseDate * 1000).getFullYear();
                if (igdbGame.platform) item.platform = igdbGame.platform;
              }
            } catch (e) { }
          }
          return item;
        }));

        return transformed.filter((r: any) => r !== null);
      } catch (err) {
        console.warn('[Metadata Search] Error:', err);
        return [];
      }
    })();

    // Await both, but race otherSearchPromise with a strict timeout
    // detailed providers (IGDB/SGDB) can be slow, but Steam is fast.
    // If others are too slow, we just return Steam matches to keep UI snappy.
    const otherSearchWithTimeout = Promise.race([
      otherSearchPromise,
      new Promise<any[]>((resolve) => setTimeout(() => {
        console.warn('[Metadata Search] Timeout reached (2500ms), returning empty results for other providers');
        resolve([]);
      }, 8000))
    ]);

    const [steamResults, otherResults] = await Promise.all([steamSearchPromise, otherSearchWithTimeout]);

    // Combine and Sort
    const allResults = [...steamResults, ...otherResults].sort((a: any, b: any) => (b.score || 0) - (a.score || 0));

    return { success: true, results: allResults };
  } catch (error) {
    console.error('Error in metadata:searchGames handler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      results: [],
    };
  }
});

// Fetch and update metadata by provider ID
// Refresh all metadata for all games
// NEW: Processes one game at a time, stops when boxart is missing and requires manual selection
ipcMain.handle('metadata:refreshAll', async (event, options?: { allGames?: boolean; gameIds?: string[]; continueFromIndex?: number }) => {
  const sendProgress = (progress: { current: number; total: number; message: string; gameTitle?: string; requiresBoxart?: boolean; currentGame?: { gameId: string; title: string; steamAppId?: string } }) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('metadata:refreshProgress', progress);
    }
  };

  try {
    let games = await gameStore.getLibrary();

    // Filter games based on options
    if (options?.gameIds) {
      // Only refresh specific games
      games = games.filter(g => options.gameIds!.includes(g.id));
    } else if (options?.allGames === false) {
      // Only refresh games with missing images/metadata
      // Check for empty strings or undefined/null values
      games = games.filter(g => {
        const hasBoxArt = g.boxArtUrl && g.boxArtUrl.trim() !== '';
        const hasBanner = g.bannerUrl && g.bannerUrl.trim() !== '';
        return !hasBoxArt && !hasBanner;
      });
      console.log(`[RefreshAll] Filtered to ${games.length} games with missing images out of ${(await gameStore.getLibrary()).length} total games`);
    }
    // If allGames is true or undefined, refresh all games

    const totalGames = games.length;
    let successCount = 0;
    let errorCount = 0;
    const unmatchedGames: Array<{ gameId: string; title: string; searchResults: any[] }> = [];
    const missingBoxartGames: Array<{ gameId: string; title: string; steamAppId?: string }> = [];

    if (totalGames === 0) {
      sendProgress({
        current: 0,
        total: 0,
        message: options?.allGames === false
          ? 'No games found with missing images. All games already have metadata.'
          : 'No games to refresh.'
      });
      return {
        success: true,
        count: 0,
        errors: 0,
        unmatchedGames: [],
      };
    }

    sendProgress({ current: 0, total: totalGames, message: 'Clearing cached images...' });

    // Clear all cached images
    const { homedir } = require('node:os');
    let cacheDir: string;
    if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local');
      cacheDir = path.join(localAppData, 'onyx-launcher', 'images');
    } else if (process.platform === 'darwin') {
      cacheDir = path.join(homedir(), 'Library', 'Caches', 'onyx-launcher', 'images');
    } else {
      cacheDir = path.join(homedir(), '.cache', 'onyx-launcher', 'images');
    }

    if (existsSync(cacheDir)) {
      const { readdirSync, unlinkSync } = require('node:fs');
      const files = readdirSync(cacheDir);
      let deletedCount = 0;
      const gameIds = new Set(games.map(g => g.id));

      for (const file of files) {
        const ext = path.extname(file).toLowerCase();
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm'].includes(ext)) {
          // Check if this file belongs to one of the games being refreshed
          // File format: {gameId}-{imageType}.{ext}
          const fileNameWithoutExt = path.basename(file, ext);
          const parts = fileNameWithoutExt.split('-');
          if (parts.length >= 2) {
            // Reconstruct gameId (could be steam-123 or custom-123-abc)
            let fileGameId = parts[0];
            for (let i = 1; i < parts.length - 1; i++) {
              fileGameId += '-' + parts[i];
            }
            if (gameIds.has(fileGameId)) {
              try {
                unlinkSync(path.join(cacheDir, file));
                deletedCount++;
              } catch (e) {
                console.error(`Failed to delete ${file}:`, e);
              }
            }
          }
        }
      }
      console.log(`[RefreshAll] Cleared ${deletedCount} cached images`);
      sendProgress({ current: 0, total: totalGames, message: `Cleared ${deletedCount} cached images` });
    }

    // Refresh metadata for each game - process one at a time
    // Start from continueFromIndex if provided (for resuming after boxart fix)
    const startIndex = options?.continueFromIndex || 0;
    for (let i = startIndex; i < games.length; i++) {
      const game = games[i];
      const current = i + 1;

      sendProgress({
        current,
        total: totalGames,
        message: `Searching for boxart for ${game.title}...`,
        gameTitle: game.title
      });

      try {
        let steamAppId = game.id.startsWith('steam-') ? game.id.replace('steam-', '') : undefined;
        let foundSteamAppId = steamAppId; // Track if we found a new Steam app ID
        let shouldUpdateGameId = false; // Track if we should update the game ID to steam-{appId} format

        // Search for Steam app ID for all games (not just Steam games)
        // This allows us to use official Steam artwork even for non-Steam games
        if (!steamAppId) {
          sendProgress({
            current,
            total: totalGames,
            message: `Searching for Steam App ID for ${game.title}...`,
            gameTitle: game.title
          });

          try {
            const normalizedTitle = game.title.trim().toLowerCase();

            // Method 1: Check user's Steam library first (if available)
            if (steamService) {
              try {
                const steamGames = steamService.scanSteamGames();
                const matchingGame = steamGames.find(g =>
                  g.name.trim().toLowerCase() === normalizedTitle
                );

                if (matchingGame) {
                  // Found in user's library - verify with Steam Store API
                  try {
                    const candidateAppId = matchingGame.appId;
                    const storeApiUrl = `https://store.steampowered.com/api/appdetails?appids=${candidateAppId}&l=english`;
                    const response = await fetch(storeApiUrl);

                    if (response.ok) {
                      const data = await response.json() as Record<string, any>;
                      const appData = data[candidateAppId];

                      if (appData && appData.success && appData.data) {
                        const steamName = appData.data.name?.trim().toLowerCase();

                        // Verify exact match with Steam Store API name
                        if (steamName === normalizedTitle) {
                          console.log(`[RefreshAll] Found Steam App ID in library: "${appData.data.name}" (App ID: ${candidateAppId})`);
                          steamAppId = candidateAppId;
                          foundSteamAppId = candidateAppId;
                          shouldUpdateGameId = true;
                        }
                      }
                    }
                  } catch (err) {
                    console.warn(`[RefreshAll] Error verifying Steam App ID ${matchingGame.appId}:`, err);
                  }
                }
              } catch (err) {
                console.warn('[RefreshAll] Error checking Steam library:', err);
              }
            }

            // Method 2: Search Steam Store API to find App ID, then verify
            if (!steamAppId && steamService) {
              try {
                console.log(`[RefreshAll] Searching Steam Store for "${game.title}"`);
                const searchResults = await steamService.searchGames(game.title);
                const steamDbAppId = searchResults.length > 0 ? searchResults[0].appId : null;

                if (steamDbAppId) {
                  console.log(`[RefreshAll] Found App ID ${steamDbAppId} via SteamDB.info for "${game.title}"`);
                  // Verify with Steam Store API
                  const storeApiUrl = `https://store.steampowered.com/api/appdetails?appids=${steamDbAppId}&l=english`;
                  const response = await fetch(storeApiUrl);

                  if (response.ok) {
                    const data = await response.json() as Record<string, any>;
                    const appData = data[steamDbAppId];

                    if (appData && appData.success && appData.data) {
                      const steamName = appData.data.name?.trim().toLowerCase();
                      const steamMatches = steamName === normalizedTitle ||
                        steamName.includes(normalizedTitle) ||
                        normalizedTitle.includes(steamName);

                      if (steamMatches) {
                        console.log(`[RefreshAll] Verified App ID ${steamDbAppId} via SteamDB.info: "${appData.data.name}"`);
                        steamAppId = steamDbAppId;
                        foundSteamAppId = steamDbAppId;
                        shouldUpdateGameId = true;
                      }
                    }
                  }
                } else {
                  console.log(`[RefreshAll] No SteamDB.info results found for "${game.title}"`);
                }
              } catch (err) {
                console.warn(`[RefreshAll] Error searching SteamDB.info for "${game.title}":`, err);
              }
            }
          } catch (error) {
            console.warn(`[RefreshAll] Error searching for Steam App ID for ${game.title}:`, error);
          }
        }

        // NEW APPROACH: Use the same direct search method as manual search
        // This finds boxart even when exact game match isn't found
        // Now with Steam App ID, it will prioritize official Steam CDN artwork
        let metadata: { boxArtUrl?: string; bannerUrl?: string; logoUrl?: string; heroUrl?: string } = {};

        // First, try direct SteamGridDB search (same as manual search)


        // Keep searching all sources until we have all three: boxart, banner, logo
        let searchVariations = [game.title];

        // Add query variations for searching
        const baseVariations = [
          game.title.replace(/[^\w\s]/g, '').trim(), // Remove special chars
          game.title.replace(/\s*(?:edition|pack|dlc|remastered|remaster|definitive|ultimate|gold|platinum|deluxe|collector|special|limited|anniversary|game of the year|goty)\s*/gi, '').trim(), // Remove edition words
          game.title.split(' - ')[0].trim(), // Remove subtitle
          game.title.split(':')[0].trim(), // Remove colon subtitle
        ].filter(v => v.length > 0 && v !== game.title);

        // Add Roman numeral variations
        if (game.title.match(/\s(?:I|II|III|IV|V|VI|VII|VIII|IX|X)$/i)) {
          const numericTitle = game.title
            .replace(/\sVI\b/i, ' 6')
            .replace(/\sVII\b/i, ' 7')
            .replace(/\sVIII\b/i, ' 8')
            .replace(/\sIX\b/i, ' 9')
            .replace(/\sIV\b/i, ' 4')
            .replace(/\sV\b/i, ' 5')
            .replace(/\sIII\b/i, ' 3')
            .replace(/\sII\b/i, ' 2')
            .replace(/\sI\b/i, ' 1');
          if (numericTitle !== game.title) {
            baseVariations.push(numericTitle);
          }
        }

        searchVariations = [game.title, ...baseVariations];

        // Keep searching until we have all three
        for (const searchQuery of searchVariations) {
          // If we have all three, stop searching
          if (metadata.boxArtUrl && metadata.bannerUrl && metadata.logoUrl) {
            console.log(`[RefreshAll] Found all three (boxart, banner, logo) for ${game.title}`);
            break;
          }

          sendProgress({
            current,
            total: totalGames,
            message: `Searching for missing images for ${game.title}...`,
            gameTitle: game.title
          });

          try {
            // Fetch from all sources with proper timeouts
            const allSourcesMetadata: { boxArtUrl?: string; bannerUrl?: string; logoUrl?: string; heroUrl?: string; iconUrl?: string } = {};

            // 1. Try IGDB first (covers, screenshots, artworks, logos)
            if (igdbService) {
              try {
                const igdbResults = await withTimeout(
                  igdbService.fastSearchGame(searchQuery),
                  10000,
                  'IGDB search timeout'
                );

                if (igdbResults.length > 0) {
                  const game = igdbResults[0];
                  if (game.coverUrl && !allSourcesMetadata.boxArtUrl) {
                    allSourcesMetadata.boxArtUrl = game.coverUrl;
                  }
                  if (game.screenshotUrls && game.screenshotUrls.length > 0 && !allSourcesMetadata.bannerUrl) {
                    allSourcesMetadata.bannerUrl = game.screenshotUrls[0];
                  }
                  if (game.logoUrl && !allSourcesMetadata.logoUrl) {
                    allSourcesMetadata.logoUrl = game.logoUrl;
                  }
                }
              } catch (err) {
                console.warn(`[RefreshAll] IGDB error for "${searchQuery}":`, err);
              }
            }

            // 2. Try RAWG (background images)
            if (rawgService && !allSourcesMetadata.bannerUrl) {
              try {
                const rawgResults = await withTimeout(
                  rawgService.searchGame(searchQuery),
                  10000,
                  'RAWG search timeout'
                );

                if (rawgResults.length > 0 && rawgResults[0].background_image) {
                  allSourcesMetadata.bannerUrl = rawgResults[0].background_image;
                }
              } catch (err) {
                console.warn(`[RefreshAll] RAWG error for "${searchQuery}":`, err);
              }
            }

            // 3. Try SteamGridDB (grids, logos, heroes, icons)
            if (steamGridDBService) {
              try {
                const sgdbGames = await withTimeout(
                  steamGridDBService.searchGame(searchQuery, steamAppId),
                  15000,
                  'SGDB search timeout'
                );

                if (sgdbGames.length > 0) {
                  const sgdbGame = sgdbGames[0];

                  // Fetch all image types in parallel
                  const [grids, logos, heroes, icons] = await withTimeout(
                    Promise.allSettled([
                      steamGridDBService.getVerticalGrids(sgdbGame.id),
                      steamGridDBService.getLogos(sgdbGame.id),
                      steamGridDBService.getHeroes(sgdbGame.id),
                      steamGridDBService.getIcons(sgdbGame.id)
                    ]),
                    15000,
                    'SGDB image fetch timeout'
                  );

                  // Grids as boxart
                  if (grids.status === 'fulfilled' && grids.value.length > 0 && !allSourcesMetadata.boxArtUrl) {
                    allSourcesMetadata.boxArtUrl = grids.value[0].url;
                  }

                  // Logos
                  if (logos.status === 'fulfilled' && logos.value.length > 0 && !allSourcesMetadata.logoUrl) {
                    allSourcesMetadata.logoUrl = logos.value[0].url;
                  }

                  // Heroes as banners
                  if (heroes.status === 'fulfilled' && heroes.value.length > 0 && !allSourcesMetadata.bannerUrl) {
                    allSourcesMetadata.bannerUrl = heroes.value[0].url;
                  }

                  // Icons
                  if (icons.status === 'fulfilled' && icons.value.length > 0 && !allSourcesMetadata.iconUrl) {
                    allSourcesMetadata.iconUrl = icons.value[0].url;
                  }
                }
              } catch (err) {
                console.warn(`[RefreshAll] SteamGridDB error for "${searchQuery}":`, err);
              }
            }

            // 4. Try Steam Store if we have steamAppId
            if (steamAppId) {
              try {
                // Standard Steam CDN assets
                if (!allSourcesMetadata.boxArtUrl) {
                  allSourcesMetadata.boxArtUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/library_600x900_2x.jpg`;
                }
                if (!allSourcesMetadata.bannerUrl) {
                  allSourcesMetadata.bannerUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/library_hero.jpg`;
                }
                if (!allSourcesMetadata.logoUrl) {
                  allSourcesMetadata.logoUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/logo.png`;
                }
              } catch (err) {
                console.warn(`[RefreshAll] Steam CDN error for "${searchQuery}":`, err);
              }
            }

            if (allSourcesMetadata.boxArtUrl && !metadata.boxArtUrl) {
              metadata.boxArtUrl = allSourcesMetadata.boxArtUrl;
              console.log(`[RefreshAll] Found boxart for ${game.title} with query "${searchQuery}": ${allSourcesMetadata.boxArtUrl.substring(0, 80)}...`);
            }
            if (allSourcesMetadata.bannerUrl && !metadata.bannerUrl) {
              metadata.bannerUrl = allSourcesMetadata.bannerUrl;
              console.log(`[RefreshAll] Found banner for ${game.title} with query "${searchQuery}": ${allSourcesMetadata.bannerUrl.substring(0, 80)}...`);
            }
            if (allSourcesMetadata.logoUrl && !metadata.logoUrl) {
              metadata.logoUrl = allSourcesMetadata.logoUrl;
              console.log(`[RefreshAll] Found logo for ${game.title} with query "${searchQuery}": ${allSourcesMetadata.logoUrl.substring(0, 80)}...`);
            }
          } catch (error) {
            console.warn(`[RefreshAll] Search failed for "${searchQuery}" on ${game.title}:`, error instanceof Error ? error.message : error);
          }
        }


        console.log(`[RefreshAll] Search complete for ${game.title}:`, {
          boxArtUrl: metadata.boxArtUrl ? 'found' : 'MISSING',
          bannerUrl: metadata.bannerUrl ? 'found' : 'MISSING',
          logoUrl: metadata.logoUrl ? 'found' : 'MISSING',
        });

        // Log what we got
        console.log(`[RefreshAll] Metadata for ${game.title}:`, {
          boxArtUrl: metadata.boxArtUrl ? 'present' : 'missing',
          bannerUrl: metadata.bannerUrl ? 'present' : 'missing',
          logoUrl: metadata.logoUrl ? 'present' : 'missing',
          heroUrl: metadata.heroUrl ? 'present' : 'missing',
        });

        // If we still don't have boxart, automatically search and use first result (same as manual search)
        if (!metadata.boxArtUrl) {
          console.warn(`[RefreshAll] No boxart found for: ${game.title}, trying automatic search...`);

          sendProgress({
            current,
            total: totalGames,
            message: `Auto-searching boxart for ${game.title}...`,
            gameTitle: game.title
          });



          // If still no boxart after auto-search, mark as missing but continue
          // Only add to missing if we couldn't find at least boxart and banner
          if (!metadata.boxArtUrl || !metadata.bannerUrl) {
            console.warn(`[RefreshAll] Missing required images for: ${game.title} (boxart: ${metadata.boxArtUrl ? 'found' : 'missing'}, banner: ${metadata.bannerUrl ? 'found' : 'missing'})`);
            if (!missingBoxartGames.find(g => g.gameId === game.id)) {
              missingBoxartGames.push({
                gameId: game.id,
                title: game.title,
                steamAppId: steamAppId
              });
            }
            // Continue processing - don't stop for missing images
          }
        }

        sendProgress({
          current,
          total: totalGames,
          message: `Caching images for ${game.title}...`,
          gameTitle: game.title
        });

        // Cache images locally - only cache if URL is not empty
        const imagesToCache: { boxArtUrl?: string; bannerUrl?: string; logoUrl?: string; heroUrl?: string } = {};
        if (metadata.boxArtUrl && metadata.boxArtUrl.trim() !== '') {
          imagesToCache.boxArtUrl = metadata.boxArtUrl;
        }
        if (metadata.bannerUrl && metadata.bannerUrl.trim() !== '') {
          imagesToCache.bannerUrl = metadata.bannerUrl;
        }
        if (metadata.logoUrl && metadata.logoUrl.trim() !== '') {
          imagesToCache.logoUrl = metadata.logoUrl;
        }
        if (metadata.heroUrl && metadata.heroUrl.trim() !== '') {
          imagesToCache.heroUrl = metadata.heroUrl;
        }

        console.log(`[RefreshAll] Caching images for ${game.title}:`, Object.keys(imagesToCache));
        const cachedImages = await imageCacheService.cacheImages(imagesToCache, game.id);
        console.log(`[RefreshAll] Cached images for ${game.title}:`, {
          boxArtUrl: cachedImages.boxArtUrl ? 'cached' : 'not cached',
          bannerUrl: cachedImages.bannerUrl ? 'cached' : 'not cached',
        });

        sendProgress({
          current,
          total: totalGames,
          message: `Saving metadata for ${game.title}...`,
          gameTitle: game.title
        });

        // Update game metadata
        // Priority: cached URL > metadata URL > existing URL (if not broken onyx-local)
        let finalBoxArtUrl = '';
        let boxartFailed = false;

        // First, try cached URL
        if (cachedImages.boxArtUrl && cachedImages.boxArtUrl.trim() !== '') {
          finalBoxArtUrl = cachedImages.boxArtUrl;
        }
        // Then try metadata URL (should be HTTPS from provider)
        else if (metadata.boxArtUrl && metadata.boxArtUrl.trim() !== '') {
          finalBoxArtUrl = metadata.boxArtUrl;
        }
        // Finally, keep existing URL if it's not a broken onyx-local URL
        else if (game.boxArtUrl && game.boxArtUrl.trim() !== '') {
          // Only keep existing URL if it's not a broken onyx-local URL
          // (onyx-local URLs that don't have files should have been caught by cacheImage returning empty)
          if (!game.boxArtUrl.startsWith('onyx-local://')) {
            finalBoxArtUrl = game.boxArtUrl;
          } else {
            // Broken onyx-local URL, clear it
            console.log(`[RefreshAll] Clearing broken onyx-local boxart URL for ${game.title}`);
            finalBoxArtUrl = '';
            boxartFailed = true;
          }
        } else {
          // No boxart URL available from any source
          boxartFailed = true;
        }

        // Same logic for banner
        let finalBannerUrl = '';
        if (cachedImages.bannerUrl && cachedImages.bannerUrl.trim() !== '') {
          finalBannerUrl = cachedImages.bannerUrl;
        } else if (metadata.bannerUrl && metadata.bannerUrl.trim() !== '') {
          finalBannerUrl = metadata.bannerUrl;
        } else if (game.bannerUrl && game.bannerUrl.trim() !== '') {
          if (!game.bannerUrl.startsWith('onyx-local://')) {
            finalBannerUrl = game.bannerUrl;
          } else {
            console.log(`[RefreshAll] Clearing broken onyx-local banner URL for ${game.title}`);
            finalBannerUrl = '';
          }
        }

        // Track games with missing required images (but don't stop - continue processing)
        if ((boxartFailed && finalBoxArtUrl === '') || (!finalBannerUrl)) {
          if (!missingBoxartGames.find(g => g.gameId === game.id)) {
            missingBoxartGames.push({
              gameId: game.id,
              title: game.title,
              steamAppId: steamAppId
            });
          }
          console.warn(`[RefreshAll] Missing required images for ${game.title}: boxart=${finalBoxArtUrl ? 'found' : 'missing'}, banner=${finalBannerUrl ? 'found' : 'missing'}`);
          // Continue processing - don't stop for missing images
        }

        // If we found a Steam app ID and the game isn't already a Steam game, update the game ID
        // This stores the Steam app ID and allows the game to use Steam artwork
        let gameIdToUpdate = game.id;
        if (shouldUpdateGameId && foundSteamAppId && !game.id.startsWith('steam-')) {
          const newGameId = `steam-${foundSteamAppId}`;
          console.log(`[RefreshAll] Updating game ID from "${game.id}" to "${newGameId}" for ${game.title} (Steam App ID: ${foundSteamAppId})`);

          // Get the full game object and update it
          const games = await gameStore.getLibrary();
          const gameToUpdate = games.find(g => g.id === game.id);
          if (gameToUpdate) {
            // Check if a game with the new ID already exists
            const existingGameWithNewId = games.find(g => g.id === newGameId);
            if (existingGameWithNewId) {
              console.warn(`[RefreshAll] Game with ID "${newGameId}" already exists, skipping ID update for ${game.title}`);
            } else {
              // Update the game ID and platform
              gameToUpdate.id = newGameId;
              gameToUpdate.platform = 'steam';
              await gameStore.saveGame(gameToUpdate);
              gameIdToUpdate = newGameId;
              console.log(`[RefreshAll] Successfully updated game ID to "${newGameId}" for ${game.title}`);
            }
          }
        }

        await gameStore.updateGameMetadata(
          gameIdToUpdate,
          finalBoxArtUrl,
          finalBannerUrl,
          cachedImages.logoUrl || metadata.logoUrl,
          cachedImages.heroUrl || metadata.heroUrl
        );

        // Only count as success if we have all three: boxart, banner, and logo
        const hasAllThree = (finalBoxArtUrl && finalBoxArtUrl.trim() !== '') &&
          (finalBannerUrl && finalBannerUrl.trim() !== '') &&
          (cachedImages.logoUrl || metadata.logoUrl);

        console.log(`[RefreshAll] Updated ${game.title} with boxArtUrl: ${finalBoxArtUrl ? 'yes' : 'NO'}, bannerUrl: ${finalBannerUrl ? 'yes' : 'no'}, logoUrl: ${cachedImages.logoUrl || metadata.logoUrl ? 'yes' : 'no'}`);

        if (hasAllThree) {
          successCount++;
          console.log(`[RefreshAll] ✓ Successfully refreshed ${game.title} (all three: boxart, banner, logo)`);
        } else {
          // Track as missing required images but don't increment success count
          if (!missingBoxartGames.find(g => g.gameId === game.id)) {
            missingBoxartGames.push({
              gameId: game.id,
              title: game.title,
              steamAppId: steamAppId
            });
          }
          console.log(`[RefreshAll] ✗ Refreshed ${game.title} but missing required images: boxart=${finalBoxArtUrl ? 'found' : 'missing'}, banner=${finalBannerUrl ? 'found' : 'missing'}, logo=${cachedImages.logoUrl || metadata.logoUrl ? 'found' : 'missing'}`);
        }
      } catch (error) {
        console.error(`[RefreshAll] Failed to refresh ${game.title}:`, error);
        errorCount++;
        unmatchedGames.push({
          gameId: game.id,
          title: game.title,
          searchResults: []
        });
        // Also add to missing images if we don't have required images
        const steamAppId = game.id.startsWith('steam-') ? game.id.replace('steam-', '') : undefined;
        if (!game.boxArtUrl || game.boxArtUrl.trim() === '' || game.boxArtUrl.startsWith('onyx-local://') ||
          !game.bannerUrl || game.bannerUrl.trim() === '' || game.bannerUrl.startsWith('onyx-local://')) {
          if (!missingBoxartGames.find(g => g.gameId === game.id)) {
            missingBoxartGames.push({
              gameId: game.id,
              title: game.title,
              steamAppId: steamAppId
            });
          }
        }
        sendProgress({
          current,
          total: totalGames,
          message: `Error refreshing ${game.title}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          gameTitle: game.title
        });
      }
    }

    sendProgress({
      current: totalGames,
      total: totalGames,
      message: `Completed! Successfully refreshed ${successCount} games${unmatchedGames.length > 0 ? `, ${unmatchedGames.length} need matching` : ''}${errorCount > 0 ? `, ${errorCount} errors` : ''}`
    });

    return {
      success: true,
      count: successCount,
      errors: errorCount,
      unmatchedGames: unmatchedGames,
      missingBoxartGames: missingBoxartGames,
      requiresBoxart: false,
      currentGameIndex: games.length,
      remainingGames: 0,
    };
  } catch (error) {
    console.error('Error in metadata:refreshAll handler:', error);
    sendProgress({
      current: 0,
      total: 0,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      count: 0,
      errors: 0,
      unmatchedGames: [],
      missingBoxartGames: [],
    };
  }
});

ipcMain.handle('metadata:fetchAndUpdateByProviderId', async (_event, gameId: string, providerId: string, providerSource: string) => {
  try {
    // Get the game to know its title
    const games = await gameStore.getLibrary();
    const game = games.find(g => g.id === gameId);
    if (!game) {
      return { success: false, error: 'Game not found' };
    }

    // Extract Steam App ID if it's a Steam game
    const steamAppId = gameId.startsWith('steam-') ? gameId.replace('steam-', '') : undefined;

    // Fetch metadata using the specific provider ID
    let metadata;

    if (providerSource === 'igdb') {
      // Extract IGDB game ID from provider ID (format: "igdb-123")
      const igdbGameId = parseInt(providerId.replace('igdb-', ''), 10);

      if (isNaN(igdbGameId) || !igdbService) {
        return { success: false, error: 'Invalid IGDB ID or service not available' };
      }

      // Search IGDB for the specific game by ID
      const igdbResults = await igdbService.searchGame(String(igdbGameId));
      const igdbResult = igdbResults.find(r => r.id === igdbGameId) || igdbResults[0];

      if (igdbResult) {
        // Use the game title from IGDB result to fetch complete metadata
        metadata = await metadataFetcher.searchArtwork(igdbResult.name, steamAppId);
      } else {
        return { success: false, error: 'Game not found in IGDB' };
      }
    } else if (providerSource === 'steam') {
      // Extract Steam App ID (format: "steam-123" or just "123")
      const appId = providerId.replace('steam-', '');

      if (!steamService) {
        return { success: false, error: 'Steam service not available' };
      }

      // Get Steam store data directly
      const steamMetadata = await steamService.getGameDetails(appId);
      if (steamMetadata) {
        metadata = await metadataFetcher.searchArtwork(steamMetadata.name, appId);
      } else {
        return { success: false, error: 'Game not found on Steam' };
      }
    } else if (providerSource === 'steamgriddb') {
      if (!steamGridDBService) {
        return { success: false, error: 'SteamGridDB service not available' };
      }

      const sgdbId = parseInt(String(providerId).replace('steamgriddb-', '').replace('sgdb-', ''), 10);
      try {
        const sgdbGame = await steamGridDBService.getGameById(sgdbId);
        if (sgdbGame) {
          metadata = await metadataFetcher.searchArtwork(sgdbGame.name, steamAppId);
        } else {
          return { success: false, error: 'Game not found on SteamGridDB' };
        }
      } catch (err) {
        console.error('Error fetching SGDB game details:', err);
        return { success: false, error: 'Failed to fetch details from SteamGridDB' };
      }

    } else if (providerSource === 'rawg') {
      if (!rawgService) {
        return { success: false, error: 'RAWG service not available' };
      }

      const rawgId = parseInt(String(providerId).replace('rawg-', ''), 10);
      try {
        const rawgGame = await rawgService.getGameDetails(rawgId);
        if (rawgGame) {
          metadata = await metadataFetcher.searchArtwork(rawgGame.name, steamAppId);
        } else {
          return { success: false, error: 'Game not found on RAWG' };
        }
      } catch (err) {
        console.error('Error fetching RAWG game details:', err);
        return { success: false, error: 'Failed to fetch details from RAWG' };
      }

    } else {
      return { success: false, error: `Unknown provider source: ${providerSource}` };
    }

    if (!metadata) {
      return { success: false, error: 'Failed to fetch metadata' };
    }

    // Check if local storage is enabled
    const prefs = await userPreferencesService.getPreferences();
    let finalMetadata = metadata;

    if (prefs.storeMetadataLocally !== false) { // Default to true
      // Cache images locally
      const cachedImages = await imageCacheService.cacheImages({
        boxArtUrl: metadata.boxArtUrl,
        bannerUrl: metadata.bannerUrl,
        logoUrl: metadata.logoUrl,
        heroUrl: metadata.heroUrl,
      }, gameId);

      finalMetadata = {
        ...metadata,
        ...cachedImages,
      };
    }

    // Update game metadata in store
    const success = await gameStore.updateGameMetadata(
      gameId,
      metadata.boxArtUrl,
      metadata.bannerUrl,
      metadata.logoUrl,
      metadata.heroUrl
    );

    // Also update other metadata fields if available
    if (success) {
      const updatedGame: Game = {
        ...game,
        description: metadata.description || metadata.summary || game.description,
        genres: metadata.genres || game.genres,
        releaseDate: metadata.releaseDate || game.releaseDate,
        developers: metadata.developers || game.developers,
        publishers: metadata.publishers || game.publishers,
        ageRating: metadata.ageRating || game.ageRating,
        userScore: metadata.rating ? Math.round(metadata.rating) : game.userScore,
        platform: metadata.platforms?.join(', ') || game.platform,
      };
      await gameStore.saveGame(updatedGame);
    }

    return { success, metadata };
  } catch (error) {
    console.error('Error in metadata:fetchAndUpdateByProviderId handler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      metadata: null,
    };
  }
});

// Fetch game description via metadata providers (RAWG)
ipcMain.handle('metadata:fetchGameDescription', async (_event, steamGameId: string) => {
  try {
    const match = steamGameId.match(/^steam-(.+)$/);
    if (!match) {
      return { success: false, error: 'Invalid Steam game ID format' };
    }

    const steamAppId = match[1];

    // Prefer library title for better matching
    const library = await gameStore.getLibrary();
    const libraryGame = library.find(g => g.id === steamGameId);
    const titleForLookup = libraryGame?.title || steamGameId;

    const metadata = await metadataFetcher.fetchCompleteMetadata(titleForLookup, null, steamAppId);

    if (!metadata.description && !metadata.summary) {
      return { success: false, error: 'No description data returned from metadata providers' };
    }

    return {
      success: true,
      description: metadata.description,
      summary: metadata.summary,
      releaseDate: metadata.releaseDate,
      genres: metadata.genres,
      developers: metadata.developers,
      publishers: metadata.publishers,
      ageRating: metadata.ageRating,
      rating: metadata.rating,
      platforms: metadata.platforms,
      categories: metadata.categories,
    };
  } catch (error) {
    console.error('Error in metadata:fetchGameDescription handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// File dialog handler for selecting executable
ipcMain.handle('dialog:showOpenDialog', async () => {
  try {
    // Get the focused window or fall back to the main window
    const targetWindow = BrowserWindow.getFocusedWindow() || win;

    // dialog.showOpenDialog can work without a window, but TypeScript types are strict
    const result = await dialog.showOpenDialog((targetWindow || undefined) as any, {
      properties: ['openFile'],
      filters: [
        { name: 'Executables', extensions: ['exe'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (error) {
    console.error('Error in dialog:showOpenDialog handler:', error);
    // Return null instead of throwing to prevent unhandled promise rejection
    return null;
  }
});

// Image file dialog handler for selecting custom assets
ipcMain.handle('dialog:showImageDialog', async () => {
  try {
    const targetWindow = BrowserWindow.getFocusedWindow() || win;

    const result = await dialog.showOpenDialog((targetWindow || undefined) as any, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'ico'] },
        { name: 'All Files', extensions: ['*'] },
      ],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (error) {
    console.error('Error in dialog:showImageDialog handler:', error);
    return null;
  }
});

// Add custom game handler
ipcMain.handle('gameStore:addCustomGame', async (_event, gameData: { title: string; exePath: string }) => {
  try {
    const gameId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newGame: Game = {
      id: gameId,
      title: gameData.title,
      platform: 'other',
      exePath: gameData.exePath,
      boxArtUrl: '',
      bannerUrl: '',
    };

    await gameStore.saveGame(newGame);
    return newGame;
  } catch (error) {
    console.error('Error in gameStore:addCustomGame handler:', error);
    return null;
  }
});

// Search games metadata


// Game launcher handler
ipcMain.handle('launcher:launchGame', async (_event, gameId: string) => {
  try {
    const result = await launcherService.launchGame(gameId);

    // If game launch was successful, update lastPlayed and refresh tray menu
    if (result.success) {
      try {
        // Update lastPlayed timestamp for the game
        const games = await gameStore.getLibrary();
        const game = games.find(g => g.id === gameId);
        if (game) {
          game.lastPlayed = new Date().toISOString();
          await gameStore.saveGame(game);

          // Track process for suspend service (if enabled)
          if (processSuspendService && processSuspendService.isEnabled()) {
            // For non-Steam games, we have the PID directly
            if (result.pid) {
              processSuspendService.trackLaunchedGame(gameId, result.pid, game.title, game.exePath);
              console.log(`[Suspend] Tracking launched game: ${game.title} (PID: ${result.pid})`);
            } else if (game.exePath) {
              // For Steam games or if PID not available, try to discover the process
              // Wait a bit for process to start
              setTimeout(() => {
                if (processSuspendService && game.exePath) {
                  processSuspendService.discoverAndTrackGame(gameId, game.title, game.exePath)
                    .then(success => {
                      if (success) console.log(`[Suspend] Discovered and tracking game: ${game.title}`);
                    })
                    .catch(err => console.error(`[Suspend] Failed to track discovered game: ${err}`));
                }
              }, 5000);
            }
          }

          // Handle restoreAfterLaunch behavior
          const prefs = await userPreferencesService.getPreferences();

          // Only track if restoreAfterLaunch is enabled AND we have a valid PID to track
          if (prefs.restoreAfterLaunch && result.pid) {
            console.log(`[Launch] Tracking process ${result.pid} for window restore`);

            // Monitor the process to detect when it closes
            try {
              // We need to import 'ps-node' or use a simpler polling mechanism since we're in the main process
              // Simple polling for PID existence is safest cross-platform approach without extra deps
              const checkInterval = setInterval(() => {
                try {
                  // process.kill(pid, 0) checks for existence without killing
                  process.kill(result.pid!, 0);
                } catch (e) {
                  // Process no longer exists (threw error)
                  clearInterval(checkInterval);
                  console.log(`[Launch] Process ${result.pid} exited, restoring window`);

                  // Restore window
                  if (win) {
                    if (win.isMinimized()) win.restore();
                    win.show();
                    win.focus();
                  }
                }
              }, 2000); // Check every 2 seconds
            } catch (err) {
              console.error('[Launch] Error setting up process monitor:', err);
            }
          }

          // Refresh tray menu to show updated "Recent" list
          setTimeout(() => updateTrayMenu(), 1000);
        }

        const prefs = await userPreferencesService.getPreferences();
        if (prefs.minimizeOnGameLaunch && win) {
          win.minimize();
        }
      } catch (error) {
        console.error('Error updating game or tray menu:', error);
        // Don't fail the game launch if update fails
      }
    }

    return result;
  } catch (error) {
    console.error('Error in launcher:launchGame handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Process monitoring handler
ipcMain.handle('process:checkExists', async (_event, pid: number) => {
  try {
    // On Windows, check if process exists
    if (process.platform === 'win32') {
      const { exec } = require('child_process');
      return new Promise<boolean>((resolve) => {
        exec(`tasklist /FI "PID eq ${pid}" /NH`, (error: any, stdout: string) => {
          if (error) {
            resolve(false);
            return;
          }
          // If the process exists, tasklist will return its info
          // If not, it will return "INFO: No tasks are running..."
          const exists = !stdout.includes('No tasks') && stdout.includes(pid.toString());
          resolve(exists);
        });
      });
    }
    return false;
  } catch (error) {
    console.error('Error checking process:', error);
    return false;
  }
});

// Folder selection dialog handler
ipcMain.handle('dialog:showFolderDialog', async () => {
  try {
    const targetWindow = BrowserWindow.getFocusedWindow() || win;

    // @ts-expect-error - Electron dialog API accepts undefined, but types don't reflect this
    const result = await dialog.showOpenDialog(targetWindow || undefined, {
      properties: ['openDirectory'],
    });

    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  } catch (error) {
    console.error('Error in dialog:showFolderDialog handler:', error);
    return null;
  }
});

// Scan folder for executables handler
ipcMain.handle('import:scanFolderForExecutables', async (_event, folderPath: string) => {
  try {
    const executables: Array<{ fileName: string; fullPath: string }> = [];

    // Common non-game executables to exclude
    const excludePatterns = [
      /uninstall/i,
      /unins\d+/i,
      /setup/i,
      /install/i,
      /cleanup/i,
      /crashhandler/i,
      /unitycrashhandler/i,
      /unity/i,
      /redist/i,
      /vc_redist/i,
      /directx/i,
      /dxsetup/i,
      /vcredist/i,
      /dotnet/i,
      /\.net/i,
      /launcher/i,
      /updater/i,
      /update/i,
      /patch/i,
      /repair/i,
      /config/i,
      /gamelaunchhelper\.exe$/i,
      /bootstrapper\.exe$/i,
    ];

    const shouldExclude = (fileName: string): boolean => {
      const lowerName = fileName.toLowerCase();
      // Check exact matches first for common helper executables
      if (lowerName === 'gamelaunchhelper.exe' ||
        lowerName === 'bootstrapper.exe' ||
        lowerName === 'crashreportclient.exe' ||
        lowerName === 'battlenet.overlay.runtime.exe' ||
        lowerName === 'crashpad_handler.exe' ||
        lowerName === 'embark-crash-helper.exe' ||
        lowerName === 'blizzardbrowser.exe' ||
        lowerName === 'blizzarderror.exe' ||
        lowerName === 'gamelaunchhelper' ||
        lowerName === 'bootstrapper' ||
        lowerName === 'crashreportclient' ||
        lowerName === 'battlenet.overlay.runtime' ||
        lowerName === 'crashpad_handler' ||
        lowerName === 'embark-crash-helper' ||
        lowerName === 'blizzardbrowser' ||
        lowerName === 'blizzarderror') {
        return true;
      }
      return excludePatterns.some(pattern => pattern.test(lowerName));
    };

    const scanDirectory = (dirPath: string): void => {
      try {
        const entries = readdirSync(dirPath, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);

          try {
            if (entry.isFile() && entry.name.toLowerCase().endsWith('.exe')) {
              // Exclude common non-game executables
              if (!shouldExclude(entry.name)) {
                executables.push({
                  fileName: entry.name,
                  fullPath: fullPath,
                });
                console.log(`Found executable: ${fullPath}`);
              } else {
                console.log(`Excluded executable: ${fullPath}`);
              }
            } else if (entry.isDirectory()) {
              // Recursively scan all subdirectories (no depth limit)
              // Skip common system directories and WinGDK folders that are unlikely to contain games
              const dirName = entry.name.toLowerCase();
              if (dirName !== 'node_modules' &&
                dirName !== '.git' &&
                !dirName.startsWith('$') &&
                dirName !== 'system volume information' &&
                dirName !== 'recycle.bin' &&
                !dirName.includes('wingdk')) {
                scanDirectory(fullPath);
              }
            }
          } catch (err) {
            // Log but continue - some files/directories may not be accessible
            console.warn(`Skipping ${fullPath}:`, err instanceof Error ? err.message : err);
            continue;
          }
        }
      } catch (err) {
        console.error(`Error scanning directory ${dirPath}:`, err);
      }
    };

    scanDirectory(folderPath);

    // Deduplicate executables: if same filename exists in root and subdirectory, prefer root
    const executableMap = new Map<string, { fileName: string; fullPath: string; depth: number }>();

    for (const exe of executables) {
      const fileNameLower = exe.fileName.toLowerCase();
      const relativePath = path.relative(folderPath, exe.fullPath);
      const depth = relativePath.split(path.sep).length - 1; // Number of directory separators

      const existing = executableMap.get(fileNameLower);

      if (!existing || depth < existing.depth) {
        // Prefer executables closer to root (lower depth)
        executableMap.set(fileNameLower, {
          fileName: exe.fileName,
          fullPath: exe.fullPath,
          depth: depth,
        });
      }
    }

    // Convert back to array format
    const deduplicatedExecutables = Array.from(executableMap.values()).map(exe => ({
      fileName: exe.fileName,
      fullPath: exe.fullPath,
    }));

    return deduplicatedExecutables;
  } catch (error) {
    console.error('Error in import:scanFolderForExecutables handler:', error);
    return [];
  }
});

// Steam configuration IPC handlers
ipcMain.handle('steam:getSteamPath', async () => {
  try {
    return steamService.getSteamPath();
  } catch (error) {
    console.error('Error getting Steam path:', error);
    return null;
  }
});

ipcMain.handle('steam:setSteamPath', async (_event, steamPath: string) => {
  try {
    if (!existsSync(steamPath)) {
      return { success: false, error: 'Path does not exist' };
    }
    steamService.setSteamPath(steamPath);
    return { success: true };
  } catch (error) {
    console.error('Error setting Steam path:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('steam:scanGamesWithPath', async (_event, steamPath?: string, autoMerge: boolean = false) => {
  try {
    if (steamPath) {
      if (!existsSync(steamPath)) {
        return { success: false, error: 'Path does not exist', games: [] };
      }
      steamService.setSteamPath(steamPath);
      console.log(`Steam path set to: ${steamPath}`);
    } else {
      // Try to get existing path or use default
      try {
        steamService.getSteamPath();
      } catch (pathError) {
        return { success: false, error: 'Steam path not configured. Please set a Steam path.', games: [] };
      }
    }

    const steamGames = steamService.scanSteamGames();
    console.log(`Found ${steamGames.length} Steam games`);

    // Only merge if autoMerge is true (for backward compatibility)
    if (autoMerge && steamGames.length > 0) {
      // Check if local storage is enabled
      const prefs = await userPreferencesService.getPreferences();
      const shouldCache = prefs.storeMetadataLocally !== false; // Default to true
      await gameStore.mergeSteamGames(steamGames, imageCacheService, shouldCache);
      console.log('Steam games merged into store');
    }

    return { success: true, games: steamGames };
  } catch (error) {
    console.error('Error in steam:scanGamesWithPath handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', games: [] };
  }
});

// Steam authentication IPC handlers
ipcMain.handle('steam:authenticate', async () => {
  try {
    const result = await steamAuthService.authenticate();
    return result;
  } catch (error) {
    console.error('Error in steam:authenticate handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('steam:getAuthState', async () => {
  try {
    return await steamAuthService.getAuthState();
  } catch (error) {
    console.error('Error in steam:getAuthState handler:', error);
    return { authenticated: false };
  }
});

ipcMain.handle('steam:clearAuth', async () => {
  try {
    await steamAuthService.clearAuth();
    return { success: true };
  } catch (error) {
    console.error('Error in steam:clearAuth handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Steam auto-import all games IPC handler
ipcMain.handle('steam:importAllGames', async (_event, steamPath?: string) => {
  try {
    if (steamPath) {
      if (!existsSync(steamPath)) {
        return { success: false, error: 'Path does not exist', importedCount: 0 };
      }
      steamService.setSteamPath(steamPath);
    } else {
      try {
        steamService.getSteamPath();
      } catch (pathError) {
        return { success: false, error: 'Steam path not configured. Please set a Steam path.', importedCount: 0 };
      }
    }

    const steamGames = steamService.scanSteamGames();
    console.log(`Found ${steamGames.length} Steam games to import`);

    if (steamGames.length > 0) {
      // Check if local storage is enabled
      const prefs = await userPreferencesService.getPreferences();
      const shouldCache = prefs.storeMetadataLocally !== false; // Default to true
      await gameStore.mergeSteamGames(steamGames, imageCacheService, shouldCache);
      console.log(`Imported ${steamGames.length} Steam games`);
    }

    return { success: true, importedCount: steamGames.length };
  } catch (error) {
    console.error('Error in steam:importAllGames handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', importedCount: 0 };
  }
});

// Steam playtime sync IPC handler
ipcMain.handle('steam:syncPlaytime', async () => {
  try {
    // Check if user is authenticated
    const authState = await steamAuthService.getAuthState();
    if (!authState.authenticated || !authState.steamId) {
      return { success: false, error: 'Steam account not linked. Please link your Steam account in Settings.' };
    }

    // Get Steam Web API key if available (optional)
    // Note: Steam Web API key can be added to APICredentials in the future for better reliability
    const apiCredentials = await apiCredentialsService.getCredentials();
    const steamApiKey = undefined; // Not implemented yet - would be apiCredentials.steamApiKey

    // Fetch playtime data from Steam
    const playtimeMap = await steamService.fetchPlaytimeData(authState.steamId, steamApiKey);

    if (playtimeMap.size === 0) {
      return { success: false, error: 'No playtime data found. Make sure your Steam profile is set to public.' };
    }

    // Get all games from library
    const library = await gameStore.getLibrary();

    // Update playtime for Steam games that match
    let updatedCount = 0;
    for (const game of library) {
      // Check if this is a Steam game
      if (game.id.startsWith('steam-')) {
        const appIdMatch = game.id.match(/^steam-(.+)$/);
        if (appIdMatch && appIdMatch[1]) {
          const appId = appIdMatch[1];
          const playtime = playtimeMap.get(appId);

          if (playtime !== undefined && playtime > 0) {
            // Only update if playtime is not locked or if it's different
            const lockedFields = game.lockedFields || {};
            if (!lockedFields.playtime) {
              game.playtime = playtime;
              await gameStore.saveGame(game);
              updatedCount++;
            }
          }
        }
      }
    }

    console.log(`[Steam] Synced playtime for ${updatedCount} games`);
    return { success: true, updatedCount, totalGames: playtimeMap.size };
  } catch (error) {
    console.error('Error in steam:syncPlaytime handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', updatedCount: 0 };
  }
});

// App configuration IPC handlers
ipcMain.handle('appConfig:getAll', async () => {
  try {
    return await appConfigService.getAppConfigs();
  } catch (error) {
    console.error('Error getting app configs:', error);
    return {};
  }
});

ipcMain.handle('appConfig:get', async (_event, appId: string) => {
  try {
    return await appConfigService.getAppConfig(appId);
  } catch (error) {
    console.error('Error getting app config:', error);
    return null;
  }
});

// Open external URL handler
ipcMain.handle('app:openExternal', async (_event, url: string) => {
  try {
    await shell.openExternal(url);
    return { success: true };
  } catch (error) {
    console.error('Error opening external URL:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('appConfig:save', async (_event, config: { id: string; name: string; enabled: boolean; path: string; autoAdd?: boolean }) => {
  try {
    await appConfigService.saveAppConfig(config);
    return { success: true };
  } catch (error) {
    console.error('Error saving app config:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('appConfig:saveAll', async (_event, configs: Array<{ id: string; name: string; enabled: boolean; path: string; autoAdd?: boolean }>) => {
  try {
    await appConfigService.saveAppConfigs(configs);
    return { success: true };
  } catch (error) {
    console.error('Error saving app configs:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Launcher detection IPC handlers
ipcMain.handle('launcher:detectAll', async () => {
  try {
    const detected = await launcherDetectionService.detectAllLaunchers();
    return detected;
  } catch (error) {
    console.error('Error detecting launchers:', error);
    return [];
  }
});

ipcMain.handle('launcher:detect', async (_event, launcherId: string) => {
  try {
    const detected = await launcherDetectionService.detectLauncher(launcherId);
    return detected;
  } catch (error) {
    console.error('Error detecting launcher:', error);
    return null;
  }
});

// Background scan IPC handlers
ipcMain.handle('appConfig:getBackgroundScanEnabled', async () => {
  try {
    return await appConfigService.getBackgroundScanEnabled();
  } catch (error) {
    console.error('Error getting background scan status:', error);
    return false;
  }
});

ipcMain.handle('appConfig:setBackgroundScanEnabled', async (_event, enabled: boolean) => {
  try {
    await appConfigService.setBackgroundScanEnabled(enabled);

    // Start or stop background scan based on setting
    if (enabled) {
      await startBackgroundScan();
    } else {
      stopBackgroundScan();
    }

    return { success: true };
  } catch (error) {
    console.error('Error setting background scan status:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Background scan interval IPC handlers
ipcMain.handle('appConfig:getBackgroundScanIntervalMinutes', async () => {
  try {
    return await appConfigService.getBackgroundScanIntervalMinutes();
  } catch (error) {
    console.error('Error getting background scan interval:', error);
    return 30; // Default fallback
  }
});

ipcMain.handle('appConfig:setBackgroundScanIntervalMinutes', async (_event, minutes: number) => {
  try {
    await appConfigService.setBackgroundScanIntervalMinutes(minutes);

    // Restart background scan with new interval if it's currently enabled
    const enabled = await appConfigService.getBackgroundScanEnabled();
    if (enabled) {
      await startBackgroundScan();
    }

    return { success: true };
  } catch (error) {
    console.error('Error setting background scan interval:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Pause/resume background scan (for when ImportWorkbench is open)
ipcMain.handle('appConfig:pauseBackgroundScan', async () => {
  try {
    pauseBackgroundScan();
    return { success: true };
  } catch (error) {
    console.error('Error pausing background scan:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('appConfig:resumeBackgroundScan', async () => {
  try {
    await resumeBackgroundScan();
    return { success: true };
  } catch (error) {
    console.error('Error resuming background scan:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Manual folders IPC handlers
ipcMain.handle('manualFolders:get', async () => {
  try {
    return await appConfigService.getManualFolders();
  } catch (error) {
    console.error('Error getting manual folders:', error);
    return [];
  }
});

ipcMain.handle('manualFolders:save', async (_event, folders: string[]) => {
  try {
    await appConfigService.saveManualFolders(folders);
    return { success: true };
  } catch (error) {
    console.error('Error saving manual folders:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('manualFolders:getConfigs', async () => {
  try {
    return await appConfigService.getManualFolderConfigs();
  } catch (error) {
    console.error('Error getting manual folder configs:', error);
    return {};
  }
});

ipcMain.handle('manualFolders:saveConfig', async (_event, config: { id: string; name: string; path: string; enabled: boolean }) => {
  try {
    await appConfigService.saveManualFolderConfig(config);
    return { success: true };
  } catch (error) {
    console.error('Error saving manual folder config:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('manualFolders:deleteConfig', async (_event, folderId: string) => {
  try {
    await appConfigService.deleteManualFolderConfig(folderId);
    return { success: true };
  } catch (error) {
    console.error('Error deleting manual folder config:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('appConfig:getLastBackgroundScan', async () => {
  try {
    return await appConfigService.getLastBackgroundScan();
  } catch (error) {
    console.error('Error getting last background scan:', error);
    return undefined;
  }
});

/**
 * Start background scan interval
 */
async function startBackgroundScan(): Promise<void> {
  // Clear existing interval if any
  if (backgroundScanInterval) {
    clearInterval(backgroundScanInterval);
    backgroundScanInterval = null;
  }

  // Get interval from config
  const intervalMinutes = await appConfigService.getBackgroundScanIntervalMinutes();
  const intervalMs = intervalMinutes * 60 * 1000;

  // Don't perform initial scan here - it's already done on startup
  // Just set up the interval for periodic scans
  backgroundScanInterval = setInterval(() => {
    performBackgroundScan();
  }, intervalMs);

  console.log(`[BackgroundScan] Started background scanning (interval: ${intervalMinutes} minutes)`);
}

/**
 * Stop background scan interval
 */
function stopBackgroundScan(): void {
  if (backgroundScanInterval) {
    clearInterval(backgroundScanInterval);
    backgroundScanInterval = null;
    console.log('[BackgroundScan] Stopped background scanning');
  }
}

/**
 * Pause background scan (temporarily stop, but keep the setting enabled)
 */
function pauseBackgroundScan(): void {
  if (backgroundScanInterval) {
    clearInterval(backgroundScanInterval);
    backgroundScanInterval = null;
    console.log('[BackgroundScan] Paused background scanning');
  }
}

/**
 * Resume background scan (restart if it was paused)
 */
async function resumeBackgroundScan(): Promise<void> {
  const enabled = await appConfigService.getBackgroundScanEnabled();
  if (enabled && !backgroundScanInterval) {
    await startBackgroundScan();
    console.log('[BackgroundScan] Resumed background scanning');
  }
}

// Background scan function
// skipEnabledCheck: if true, skips the enabled check (for startup scan)
const performBackgroundScan = async (skipEnabledCheck: boolean = false) => {
  try {
    if (!skipEnabledCheck) {
      const enabled = await appConfigService.getBackgroundScanEnabled();
      if (!enabled) {
        return;
      }
    }

    console.log('[BackgroundScan] Starting background scan...');
    const configs = await appConfigService.getAppConfigs();
    const enabledConfigs = Object.values(configs).filter((config: any) => config.enabled && config.path);

    // Scan all configured launchers using ImportService
    // This will scan Steam, Xbox, Epic, GOG, Ubisoft, EA, Battle.net, Rockstar, Humble, itch.io, etc.
    try {
      const scannedResults = await importService.scanAllSources((message) => {
        if (win && !win.isDestroyed()) {
          win.webContents.send('startup:progress', { message });
        }
      });
      console.log(`[BackgroundScan] Scanned ${scannedResults.length} total games`);

      if (scannedResults.length > 0) {
        // Get existing library to find new games
        const existingLibrary = await gameStore.getLibrary();
        console.log(`[BackgroundScan] Comparing against ${existingLibrary.length} existing games in library`);

        const existingGameIds = new Set(existingLibrary.map(g => g.id));
        const existingExePaths = new Set(
          existingLibrary
            .map(g => g.exePath)
            .filter((path): path is string => !!path)
            .map(path => path.toLowerCase().replace(/\\/g, '/').trim())
        );
        const existingInstallPaths = new Set(
          existingLibrary
            .map(g => g.installationDirectory)
            .filter((path): path is string => !!path)
            .map(path => path.toLowerCase().replace(/\\/g, '/').trim())
        );

        // Debug: Log some existing paths for comparison
        if (existingExePaths.size > 0 || existingInstallPaths.size > 0) {
          console.log(`[BackgroundScan] Sample existing paths: ${Array.from(existingExePaths).slice(0, 3).join(', ') || 'none'} (exe), ${Array.from(existingInstallPaths).slice(0, 3).join(', ') || 'none'} (install)`);
        }

        // Find new games (not in existing library)
        const newGames = scannedResults.filter(g => {
          const gameTitle = g.title;
          const isJohnWick = gameTitle.toLowerCase().includes('john wick');

          if (isJohnWick) {
            console.log(`[BackgroundScan] Checking John Wick Hex: title="${gameTitle}", exe="${g.exePath}", install="${g.installPath}"`);
          }

          // Check by game ID (for Steam games)
          if (g.source === 'steam' && g.appId) {
            const gameId = `steam-${g.appId}`;
            if (existingGameIds.has(gameId)) {
              if (isJohnWick) console.log(`[BackgroundScan] John Wick Hex already exists (by ID): ${gameId}`);
              return false;
            }
          }

          // Check by exePath
          if (g.exePath) {
            const normalizedExePath = g.exePath.toLowerCase().replace(/\\/g, '/').trim();
            if (existingExePaths.has(normalizedExePath)) {
              if (isJohnWick) console.log(`[BackgroundScan] John Wick Hex already exists (by exePath): ${g.exePath} -> ${normalizedExePath}`);
              return false;
            }
            if (isJohnWick) {
              console.log(`[BackgroundScan] John Wick Hex exePath not found in existing: ${normalizedExePath}`);
              console.log(`[BackgroundScan] Existing exePaths contains similar? ${Array.from(existingExePaths).some(p => p.includes('john') || p.includes('wick'))}`);
            }
          }

          // Check by installPath
          if (g.installPath) {
            const normalizedInstallPath = g.installPath.toLowerCase().replace(/\\/g, '/').trim();
            if (existingInstallPaths.has(normalizedInstallPath)) {
              if (isJohnWick) console.log(`[BackgroundScan] John Wick Hex already exists (by installPath): ${g.installPath} -> ${normalizedInstallPath}`);
              return false;
            }

            // Also check if this installPath is a subfolder of any existing game's installationDirectory
            // This prevents detecting Battlefield 6\SP when Battlefield 6 already exists
            for (const existingInstallPath of existingInstallPaths) {
              if (normalizedInstallPath.startsWith(existingInstallPath + '/') ||
                normalizedInstallPath.startsWith(existingInstallPath + '\\')) {
                console.log(`[BackgroundScan] Skipping subfolder game: ${g.title} (${g.installPath}) - parent folder already exists in library: ${existingInstallPath}`);
                return false;
              }
            }

            if (isJohnWick) {
              console.log(`[BackgroundScan] John Wick Hex installPath not found in existing: ${normalizedInstallPath}`);
              console.log(`[BackgroundScan] Existing installPaths contains similar? ${Array.from(existingInstallPaths).some(p => p.includes('john') || p.includes('wick'))}`);
            }
          }

          if (isJohnWick) {
            console.log(`[BackgroundScan] ✓ John Wick Hex is NEW - will be included in new games list`);
          }
          return true;
        });

        if (newGames.length > 0) {
          // Group new games by source for better notifications
          const gamesBySource = new Map<string, ScannedGameResult[]>();
          for (const game of newGames) {
            if (!gamesBySource.has(game.source)) {
              gamesBySource.set(game.source, []);
            }
            gamesBySource.get(game.source)!.push(game);
          }

          // Send notification to renderer about new games
          if (win && !win.isDestroyed()) {
            win.webContents.send('background:newGamesFound', {
              count: newGames.length,
              games: newGames,
              bySource: Object.fromEntries(gamesBySource),
            });
          }
          console.log(`[BackgroundScan] Found ${newGames.length} new games across ${gamesBySource.size} source(s)`);
          for (const [source, games] of gamesBySource.entries()) {
            console.log(`[BackgroundScan]   - ${source}: ${games.length} new game(s)`);
          }
        } else {
          console.log(`[BackgroundScan] No new games found (${scannedResults.length} total games scanned)`);
        }
      }
    } catch (err) {
      console.error('[BackgroundScan] Error scanning all sources:', err);
    }

    await appConfigService.setLastBackgroundScan(Date.now());
    console.log('[BackgroundScan] Background scan completed');
  } catch (error) {
    console.error('[BackgroundScan] Error in background scan:', error);
  }
};

// Xbox Game Pass scanning IPC handler
ipcMain.handle('xbox:scanGames', async (_event, xboxPath: string, autoMerge: boolean = false) => {
  try {
    if (!xboxPath || !existsSync(xboxPath)) {
      return { success: false, error: 'Path does not exist', games: [] };
    }

    const xboxGames = xboxService.scanGames(xboxPath);
    console.log(`Found ${xboxGames.length} Xbox Game Pass games`);

    // Only merge if autoMerge is true (for backward compatibility)
    if (autoMerge && xboxGames.length > 0) {
      const games: Game[] = xboxGames.map(xboxGame => ({
        id: xboxGame.id,
        title: xboxGame.name,
        platform: 'xbox' as const,
        exePath: xboxGame.type === 'uwp' ? 'explorer.exe' : xboxGame.installPath,
        boxArtUrl: '',
        bannerUrl: '',
        xboxKind: xboxGame.type,
        packageFamilyName: xboxGame.packageFamilyName,
        appUserModelId: xboxGame.appUserModelId,
        launchUri: xboxGame.launchUri || (xboxGame.appUserModelId ? `shell:AppsFolder\\${xboxGame.appUserModelId}` : undefined),
        installationDirectory: xboxGame.installPath,
      }));

      // Save games to store
      for (const game of games) {
        await gameStore.saveGame(game);
      }
      console.log('Xbox games merged into store');
    }

    return { success: true, games: xboxGames };
  } catch (error) {
    console.error('Error in xbox:scanGames handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', games: [] };
  }
});

// Import service IPC handlers
ipcMain.handle('import:scanAllSources', async () => {
  try {
    const results = await importService.scanAllSources();
    return { success: true, games: results };
  } catch (error) {
    console.error('Error in import:scanAllSources handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', games: [] };
  }
});

// Search for specific image types from SteamGridDB
// Search for specific image types from SteamGridDB
// Search for specific image types from SteamGridDB
ipcMain.handle('metadata:searchImages', async (_event, query: string, imageType: 'boxart' | 'banner' | 'logo' | 'icon', steamAppId?: string, includeAnimated: boolean = false) => {
  try {
    const results: any[] = [];
    const addedGameIds = new Set<string>();

    console.log(`[SearchImages] Searching for "${query}" (type: ${imageType}, steamAppId: ${steamAppId}, animated: ${includeAnimated})`);

    // 1. If steamAppId is provided, fetch exact match first
    if (steamAppId) {
      try {
        const metadata = await metadataFetcher.searchArtwork(query, steamAppId);
        if (metadata) {
          const images: any[] = [];
          let url = '';

          if (imageType === 'boxart') url = metadata.boxArtUrl;
          else if (imageType === 'banner') url = metadata.bannerUrl || metadata.heroUrl || '';
          else if (imageType === 'logo') url = metadata.logoUrl || '';
          else if (imageType === 'icon') url = metadata.iconUrl || '';

          if (url) {
            images.push({ url, score: 3000, width: 0, height: 0 }); // High score for Steam Match
            results.push({
              gameId: steamAppId,
              gameName: query,
              images: images
            });
            addedGameIds.add(steamAppId);
            addedGameIds.add(String(steamAppId)); // handle number/string mismatch
          }
        }
      } catch (err) {
        console.warn(`[SearchImages] Error fetching exact match for ${steamAppId}:`, err);
      }
    }

    // Parallel Search: IGDB and SGDB
    const storedCreds = await apiCredentialsService.getCredentials();
    const hasIGDB = !!(storedCreds.igdbClientId && storedCreds.igdbClientSecret);

    const searchPromises: Promise<void>[] = [];

    // 2. IGDB Search Task
    searchPromises.push((async () => {
      if (!hasIGDB) return;
      try {
        const globalResults = await metadataFetcher.searchGames(query);
        console.log(`[SearchImages] IGDB Game Search Results for "${query}":`, globalResults.map(r => `${r.title} (ID: ${r.id})`));
        const topGames = globalResults.slice(0, 10); // Limit to top 10

        // Process top games in parallel to fetch metadata
        const limitedTopGames = topGames.slice(0, 5);

        const metadataPromises = limitedTopGames.map(async (game) => {
          // Skip if we already added this game via Steam App ID
          if (game.steamAppId && addedGameIds.has(String(game.steamAppId))) return null;

          let url = '';
          const images: any[] = [];

          try {
            // Fetch full metadata for this candidate
            const details = await metadataFetcher.searchArtwork(game.title, game.steamAppId);
            if (details) {
              if (imageType === 'boxart') url = details.boxArtUrl;
              else if (imageType === 'banner') url = details.bannerUrl || details.heroUrl || '';
              else if (imageType === 'logo') url = details.logoUrl || '';
              else if (imageType === 'icon') url = details.iconUrl || '';
            }
          } catch (ignore) { }

          if (url) {
            images.push({ url, score: 500, width: 0, height: 0 });
            return {
              gameId: game.id,
              gameName: game.title,
              images: images
            };
          }
          return null;
        });

        const parallelResults = await Promise.all(metadataPromises);
        parallelResults.forEach(result => {
          if (result) results.push(result);
        });
      } catch (err) {
        console.error('[SearchImages] IGDB search error:', err);
      }
    })());

    // 2. RAWG Search Task
    searchPromises.push((async () => {
      if (!rawgService) return;
      try {
        console.log(`[SearchImages] Searching RAWG for "${query}"...`);
        const rawgResults = await rawgService.searchGame(query);

        if (rawgResults.length > 0) {
          const topRawgGames = rawgResults.slice(0, 3);

          topRawgGames.forEach(game => {
            // RAWG IDs are numeric
            if (game.id && addedGameIds.has(String(game.id))) return;

            let url = '';
            const images: any[] = [];

            // RAWG mostly provides banners/screenshots (background_image).
            // It doesn't strictly separate "boxart" vs "banner" well, but background_image is usually banner-like (16:9).
            // However, for "boxart" requests, we might skip RAWG if it has no vertical art.
            // But usually we fallback to background_image if nothing else?
            // Actually RAWG `background_image` is widely used as main image.

            if (imageType === 'banner') {
              if (game.background_image) {
                images.push({ url: game.background_image, score: 1000, width: 0, height: 0 }); // Score 1000 (3rd Priority)
              }
            }

            if (images.length > 0) {
              results.push({
                gameId: String(game.id),
                gameName: game.name,
                images: images,
                source: 'RAWG'
              });
              console.log(`[SearchImages] Added ${images.length} images from RAWG for "${game.name}"`);
            }
          });
        }
      } catch (err) {
        console.error('[SearchImages] RAWG search error:', err);
      }
    })());

    // 3. SteamGridDB Search Task
    searchPromises.push((async () => {
      if (!steamGridDBService) return;
      const sgdbService = steamGridDBService; // Capture for closure type safety

      try {
        console.log(`[SearchImages] Searching SteamGridDB for "${query}" (type: ${imageType})...`);

        // Search for games on SteamGridDB - Increased timeout to 60s
        const sgdbGames = await withTimeout(
          sgdbService.searchGame(query, steamAppId),
          60000,
          'SteamGridDB search timeout'
        );

        if (sgdbGames.length > 0) {
          // Process top 3 games from SGDB
          const topSGDBGames = sgdbGames.slice(0, 3);

          const sgdbPromises = topSGDBGames.map(async (sgdbGame) => {
            try {
              let sgdbImages: any[] = [];
              const gameIdStr = String(sgdbGame.id);

              // Fetch the appropriate image type from SGDB
              if (imageType === 'boxart') {
                const grids = await withTimeout(
                  sgdbService.getCapsules(sgdbGame.id, includeAnimated), // Use getCapsules (vertical grids)
                  30000,
                  'SGDB grids timeout'
                );
                // Also get normal vertical grids if needed, but getCapsules is usually 600x900
                const vertical = await withTimeout(
                  sgdbService.getVerticalGrids(sgdbGame.id, includeAnimated),
                  30000,
                  'SGDB vertical timeout'
                );
                sgdbImages = [...grids, ...vertical].slice(0, 20);
              } else if (imageType === 'logo') {
                const logos = await withTimeout(
                  sgdbService.getLogos(sgdbGame.id), // Animated logos not typically supported by getLogos param but we filter
                  30000,
                  'SGDB logos timeout'
                );
                // Manual animated filter if desired, SGDB service might not support param for logos
                sgdbImages = logos.slice(0, 20);
              } else if (imageType === 'banner') {
                const heroes = await withTimeout(
                  sgdbService.getHeroes(sgdbGame.id),
                  30000,
                  'SGDB heroes timeout'
                );
                sgdbImages = heroes.slice(0, 20);
              } else if (imageType === 'icon') {
                const icons = await withTimeout(
                  sgdbService.getIcons(sgdbGame.id),
                  30000,
                  'SGDB icons timeout'
                );
                sgdbImages = icons.slice(0, 20);
              }

              // Filter animated if not requested (double check service filtering)
              // The service methods should handle `includeAnimated` if passed, but getLogos/getHeroes might not take it in current impl.
              // We'll trust the service or filter here if needed.
              if (!includeAnimated && sgdbImages.length > 0) {
                sgdbImages = sgdbImages.filter(img => img.mime !== 'image/webp' && img.mime !== 'image/gif');
              }

              if (sgdbImages.length > 0) {
                const formattedImages = sgdbImages.map(img => ({
                  url: img.url,
                  thumb: img.thumb, // Use thumb for preview
                  score: 2000 + (img.score || 0), // Base score 2000 to prioritize SGDB over IGDB (500)
                  width: img.width || 0,
                  height: img.height || 0,
                  isAnimated: img.mime === 'image/webp' || img.mime === 'image/gif'
                }));

                // Sort by score
                formattedImages.sort((a, b) => b.score - a.score);

                return {
                  gameId: gameIdStr,
                  gameName: sgdbGame.name,
                  images: formattedImages
                };
              }
            } catch (err) {
              console.warn(`[SearchImages] Error fetching ${imageType} from SGDB for game ${sgdbGame.id}:`, err);
            }
            return null;
          });

          const sgdbResults = await Promise.all(sgdbPromises);
          sgdbResults.forEach(res => {
            if (res) {
              results.push(res);
              console.log(`[SearchImages] Added ${res.images.length} ${imageType} images from SGDB for "${res.gameName}"`);
            }
          });
        }
      } catch (err) {
        console.error(`[SearchImages] SteamGridDB search error:`, err);
      }
    })());

    await Promise.allSettled(searchPromises);

    // Sort results groups?
    // We implicitly trust that the UI will sort by internal image score.
    // But we might want to sort the games themselves.
    // Steam Exact Match (3000) -> SGDB Matches (2000+) -> IGDB Matches (500)

    return { success: true, images: results };

  } catch (error) {
    console.error(`Error searching images (${imageType}) for "${query}":`, error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', images: [] };
  }
});

// ... (existing searchWebImages handler remains unchanged) ...

// Fast image search - Playnite-style instant results
// Uses fastSearchGame() which bypasses rate limiting for immediate response
ipcMain.handle('metadata:fastImageSearch', async (_event, query: string) => {
  try {
    // Enforce SteamGridDB requirement
    if (!steamGridDBService || !steamGridDBService.isAvailable()) {
      return {
        success: false,
        error: 'SteamGridDB is required for searching.',
        games: []
      };
    }

    console.log(`[FastImageSearch] Searching for "${query}"`);
    const startTime = Date.now();

    const searchPromises: Promise<any>[] = [];
    let combinedResults: any[] = [];

    // 1. IGDB Search
    if (igdbService) {
      searchPromises.push(
        igdbService.fastSearchGame(query)
          .then(results => {
            return results.map(game => ({
              id: game.id,
              name: game.name,
              coverUrl: game.coverUrl || '',
              bannerUrl: game.screenshotUrls?.[0] || '',
              logoUrl: game.logoUrl || '',
              screenshotUrls: game.screenshotUrls || [],
              steamAppId: game.steamAppId,
              releaseDate: game.releaseDate,
              source: 'igdb'
            }));
          })
          .catch(err => {
            console.error('[FastImageSearch] IGDB Error:', err);
            return [];
          })
      );
    }

    // 2. SteamGridDB Search
    if (steamGridDBService) {
      searchPromises.push(
        steamGridDBService.searchGame(query)
          .then(async (games) => {
            // SGDB search doesn't return covers, so we fetch the top one for the top 5 results
            const topGames = games.slice(0, 5);
            const enrichedGames = await Promise.all(topGames.map(async (game) => {
              let coverUrl = '';
              try {
                // Try to get a cover
                const grids = await steamGridDBService!.getVerticalGrids(game.id, false);
                if (grids && grids.length > 0) {
                  coverUrl = grids[0].thumb || grids[0].url;
                }
              } catch (e) {
                // ignore
              }

              return {
                id: String(game.id), // Ensure string ID
                name: game.name,
                coverUrl: coverUrl,
                bannerUrl: '', // Could fetch, but slow
                logoUrl: '',
                screenshotUrls: [],
                steamAppId: game.steam_app_id, // Note: SGDB property name
                releaseDate: game.release_date,
                source: 'steamgriddb'
              };
            }));
            return enrichedGames;
          })
          .catch(err => {
            console.error('[FastImageSearch] SGDB Error:', err);
            return [];
          })
      );
    }

    const resultsArray = await Promise.all(searchPromises);
    combinedResults = resultsArray.flat();

    console.log(`[FastImageSearch] Completed in ${Date.now() - startTime}ms, ${combinedResults.length} games found`);

    return { success: true, games: combinedResults };
  } catch (error) {
    console.error('Error in metadata:fastImageSearch handler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      games: []
    };
  }
});

// Fetch all images for a confirmed game from multiple sources
// Called after user confirms a game selection from quick search
ipcMain.handle('metadata:fetchGameImages', async (_event, gameName: string, steamAppId?: string, igdbId?: number, includeAnimated: boolean = false) => {
  try {
    console.log(`[FetchGameImages] Fetching images for "${gameName}" (steamAppId: ${steamAppId}, igdbId: ${igdbId}, animated: ${includeAnimated})`);
    const startTime = Date.now();

    interface ImageResult {
      url: string;
      type: 'boxart' | 'banner' | 'logo' | 'icon' | 'screenshot';
      source: string;
      name?: string;
      score?: number; // Sorting score
      isAnimated?: boolean;
    }

    const images: ImageResult[] = [];
    const errors: string[] = [];
    const tasks: Promise<void>[] = [];

    // 1. Fetch from IGDB
    if (igdbService) {
      tasks.push((async () => {
        try {
          console.log(`[FetchGameImages] Searching IGDB for "${gameName}"...`);
          const igdbResults = igdbId
            ? await igdbService!.fastSearchGame(String(igdbId))
            : await igdbService!.fastSearchGame(gameName);

          if (igdbResults.length > 0) {
            const game = igdbResults[0]; // Best match

            // Score: 500 (Base for IGDB)
            if (game.coverUrl) images.push({ url: game.coverUrl, type: 'boxart', source: 'IGDB', name: game.name, score: 500 });

            if (game.screenshotUrls && game.screenshotUrls.length > 0) {
              game.screenshotUrls.forEach((url, idx) => {
                images.push({ url, type: 'banner', source: 'IGDB', name: `${game.name} - Screenshot ${idx + 1}`, score: 500 });
                images.push({ url, type: 'screenshot', source: 'IGDB', name: `${game.name} - Screenshot ${idx + 1}`, score: 500 });
              });
            }

            if (game.artworkUrls && game.artworkUrls.length > 0) {
              game.artworkUrls.forEach((url, idx) => {
                images.push({ url, type: 'banner', source: 'IGDB', name: `${game.name} - Artwork ${idx + 1}`, score: 500 });
              });
            }

            if (game.logoUrl) images.push({ url: game.logoUrl, type: 'logo', source: 'IGDB', name: `${game.name} - Logo`, score: 500 });

            console.log(`[FetchGameImages] IGDB returned results`);
          }
        } catch (err) {
          console.error('[FetchGameImages] IGDB error:', err);
          errors.push('IGDB: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
      })());
    }

    // 2. Fetch from RAWG
    if (rawgService) {
      tasks.push((async () => {
        try {
          console.log(`[FetchGameImages] Searching RAWG for "${gameName}"...`);
          const rawgResults = await rawgService!.searchGame(gameName);

          if (rawgResults.length > 0) {
            const game = rawgResults[0];
            // Score: 1000 (Requested Priority: Steam > SGDB > RAWG > IGDB)
            // Steam: 3000, SGDB: 2000, RAWG: 1000, IGDB: 500

            if (game.background_image) {
              images.push({ url: game.background_image, type: 'banner', source: 'RAWG', name: game.name, score: 1000 });
            }
            if (game.background_image_additional) {
              images.push({ url: game.background_image_additional, type: 'banner', source: 'RAWG', name: `${game.name} - Alt`, score: 1000 });
            }
            if (game.screenshots && game.screenshots.length > 0) {
              game.screenshots.forEach((ss, idx) => {
                images.push({ url: ss.image, type: 'screenshot', source: 'RAWG', name: `${game.name} - Screenshot ${idx + 1}`, score: 1000 });
              });
            }
            console.log(`[FetchGameImages] RAWG added images`);
          }
        } catch (err) {
          console.error('[FetchGameImages] RAWG error:', err);
          errors.push('RAWG: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
      })());
    }

    // 3. Fetch from SteamGridDB
    if (steamGridDBService) {
      tasks.push((async () => {
        try {
          console.log(`[FetchGameImages] Searching SteamGridDB for "${gameName}"...`);
          // Add 30s timeout to search
          const sgdbGames = await withTimeout(
            steamGridDBService!.searchGame(gameName, steamAppId),
            30000,
            'SteamGridDB search timeout'
          );

          if (sgdbGames.length > 0) {
            const sgdbGame = sgdbGames[0];

            // Get all image types from SteamGridDB with 30s timeout
            const [grids, capsules, logos, heroes, icons] = await withTimeout(
              Promise.all([
                steamGridDBService!.getVerticalGrids(sgdbGame.id, includeAnimated), // Grids (Vertical)
                steamGridDBService!.getCapsules(sgdbGame.id, includeAnimated),      // Capsules (also Vertical)
                steamGridDBService!.getLogos(sgdbGame.id), // Logos
                steamGridDBService!.getHeroes(sgdbGame.id), // Heroes
                steamGridDBService!.getIcons(sgdbGame.id)   // Icons
              ]),
              30000,
              'SteamGridDB image fetch timeout'
            );

            // Filter animated if needed (helpers)
            const filterAnimated = (list: any[]) => includeAnimated ? list : list.filter(i => i.mime !== 'image/webp' && i.mime !== 'image/gif');

            const filteredGrids = filterAnimated(grids || []);
            const filteredCapsules = filterAnimated(capsules || []);
            const filteredHeroes = filterAnimated(heroes || []);
            // Logos/Icons usually png/ico, but apply just in case
            const filteredLogos = filterAnimated(logos || []);
            const filteredIcons = filterAnimated(icons || []);

            // Combine grids and capsules for boxart (both are vertical grids on SGDB)
            const allBoxart = [...filteredGrids, ...filteredCapsules];

            // Score: 2000 + item score (High priority for SGDB)
            if (allBoxart.length > 0) {
              // Remove duplicates by URL
              const uniqueBoxart = Array.from(new Map(allBoxart.map(img => [img.url, img])).values());
              uniqueBoxart.slice(0, 20).forEach((img, idx) => {
                images.push({
                  url: img.url,
                  type: 'boxart',
                  source: 'SteamGridDB',
                  name: `${sgdbGame.name} - Boxart ${idx + 1}`,
                  score: 2000 + (img.score || 0),
                  isAnimated: img.mime === 'image/webp' || img.mime === 'image/gif'
                });
              });
            }

            if (filteredLogos.length > 0) {
              filteredLogos.slice(0, 10).forEach((img, idx) => {
                images.push({ url: img.url, type: 'logo', source: 'SteamGridDB', name: `${sgdbGame.name} - Logo ${idx + 1}`, score: 2000 + (img.score || 0) });
              });
            }

            if (filteredHeroes.length > 0) {
              filteredHeroes.slice(0, 10).forEach((img, idx) => {
                images.push({ url: img.url, type: 'banner', source: 'SteamGridDB', name: `${sgdbGame.name} - Hero ${idx + 1}`, score: 2000 + (img.score || 0) });
              });
            }

            if (filteredIcons.length > 0) {
              filteredIcons.slice(0, 10).forEach((img, idx) => {
                images.push({ url: img.url, type: 'icon', source: 'SteamGridDB', name: `${sgdbGame.name} - Icon ${idx + 1}`, score: 2000 + (img.score || 0) });
              });
            }

            console.log(`[FetchGameImages] SteamGridDB added images`);
          }
        } catch (err) {
          console.error('[FetchGameImages] SteamGridDB error:', err);
          errors.push('SteamGridDB: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
      })());
    }

    // 5. Fetch from Steam Store Direct
    if (steamAppId) {
      // Runs in parallel too
      tasks.push((async () => {
        try {
          console.log(`[FetchGameImages] Fetching from Steam Store (AppID: ${steamAppId})...`);
          const steamImages: ImageResult[] = [];
          const steamScore = 3000; // Highest Priority

          // Boxart
          steamImages.push({ url: `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/library_600x900_2x.jpg`, type: 'boxart', source: 'Steam Store', name: 'Steam Library Vertical', score: steamScore });
          // Banner
          steamImages.push({ url: `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/library_hero.jpg`, type: 'banner', source: 'Steam Store', name: 'Steam Library Hero', score: steamScore });
          // Logo
          steamImages.push({ url: `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/logo.png`, type: 'logo', source: 'Steam Store', name: 'Steam Logo', score: steamScore });
          // Header
          steamImages.push({ url: `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/header.jpg`, type: 'banner', source: 'Steam Store', name: 'Steam Header', score: steamScore });

          // Screenshots from API
          const storeUrl = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}`;
          const storeRes = await fetch(storeUrl);
          if (storeRes.ok) {
            const storeData: any = await storeRes.json();
            if (storeData[steamAppId] && storeData[steamAppId].success) {
              const appData = storeData[steamAppId].data;
              if (appData.screenshots && Array.isArray(appData.screenshots)) {
                appData.screenshots.slice(0, 8).forEach((ss: any, idx: number) => {
                  steamImages.push({ url: ss.path_full, type: 'banner', source: 'Steam Store', name: `Screenshot ${idx + 1}`, score: steamScore });
                });
              }
            }
          }
          images.push(...steamImages);
          console.log(`[FetchGameImages] Steam Store added assets`);

        } catch (err) {
          console.error('[FetchGameImages] Steam Store error:', err);
        }
      })());
    }

    // Execute all tasks in parallel
    await Promise.allSettled(tasks);

    // Sort all images by score descending
    images.sort((a, b) => (b.score || 0) - (a.score || 0));

    console.log(`[FetchGameImages] Completed in ${Date.now() - startTime}ms, ${images.length} total images`);

    return {
      success: true,
      images,
      errors: errors.length > 0 ? errors : undefined,
      stats: {
        total: images.length,
        boxart: images.filter(i => i.type === 'boxart').length,
        banner: images.filter(i => i.type === 'banner').length,
        logo: images.filter(i => i.type === 'logo').length,
        icon: images.filter(i => i.type === 'icon').length,
        screenshot: images.filter(i => i.type === 'screenshot').length,
      }
    };
  } catch (error) {
    console.error('Error in metadata:fetchGameImages handler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      images: []
    };
  }
});

// User preferences IPC handlers
ipcMain.handle('preferences:get', async () => {
  try {
    return await userPreferencesService.getPreferences();
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return {
      gridSize: 120,
      panelWidth: 800,
      fanartHeight: 320,
      descriptionHeight: 400,
      pinnedCategories: [],
    };
  }
});

ipcMain.handle('preferences:save', async (_event, preferences: { gridSize?: number; panelWidth?: number; fanartHeight?: number; descriptionHeight?: number; pinnedCategories?: string[]; minimizeToTray?: boolean; showSystemTrayIcon?: boolean; startWithComputer?: boolean; startClosedToTray?: boolean; updateLibrariesOnStartup?: boolean; activeGameId?: string | null; hideVRTitles?: boolean; hideGameTitles?: boolean; gameTilePadding?: number; ignoredGames?: string[]; windowState?: { x?: number; y?: number; width?: number; height?: number; isMaximized?: boolean } }) => {
  try {
    await userPreferencesService.savePreferences(preferences);
    return { success: true };
  } catch (error) {
    console.error('Error saving user preferences:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('customDefaults:getBaseline', async () => {
  try {
    const filesDir = path.join(process.cwd(), 'files');
    const baselineDefaults: any = {};

    const modes = ['grid', 'list', 'logo', 'carousel'];
    const resolutions = ['1080p', '1440p'];

    for (const resolution of resolutions) {
      baselineDefaults[resolution] = {};
      for (const mode of modes) {
        const fileName = `onyx-${mode}-defaults-${resolution}.json`;
        const filePath = path.join(filesDir, fileName);
        try {
          const content = await fsPromises.readFile(filePath, 'utf-8');
          const data = JSON.parse(content);
          // Merge into baseline
          baselineDefaults[resolution][mode] = data[mode] || {};
        } catch (fileError) {
          console.warn(`Could not load baseline default file: ${fileName}`, fileError);
        }
      }
    }

    return baselineDefaults;
  } catch (error) {
    console.error('Error fetching baseline defaults:', error);
    return {};
  }
});

// Custom defaults IPC handlers
ipcMain.handle('customDefaults:has', async () => {
  try {
    const StoreModule = await (eval('import("electron-store")') as Promise<any>);
    const Store = StoreModule.default;
    const customDefaultsStore: any = new Store({ name: 'custom-defaults' });
    const data = customDefaultsStore.get('customDefaults');
    return data !== undefined && data !== null;
  } catch (error) {
    console.error('Error checking custom defaults:', error);
    return false;
  }
});

ipcMain.handle('customDefaults:save', async (_event, settings: any) => {
  try {
    const StoreModule = await (eval('import("electron-store")') as Promise<any>);
    const Store = StoreModule.default;
    const customDefaultsStore: any = new Store({ name: 'custom-defaults' });

    // Get existing defaults and merge with new settings
    const existingDefaults = customDefaultsStore.get('customDefaults', {}) as any;
    const mergedDefaults = { ...existingDefaults, ...settings };

    customDefaultsStore.set('customDefaults', mergedDefaults);
    return { success: true };
  } catch (error) {
    console.error('Error saving custom defaults:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('customDefaults:restore', async (_event, options: { viewMode: string; scope: string }) => {
  try {
    const StoreModule = await (eval('import("electron-store")') as Promise<any>);
    const Store = StoreModule.default;
    const customDefaultsStore: any = new Store({ name: 'custom-defaults' });
    const allDefaults = customDefaultsStore.get('customDefaults') as any;

    if (!allDefaults) {
      return { success: false, error: 'No custom defaults found' };
    }

    // Return the appropriate defaults based on scope
    if (options.scope === 'current') {
      // Return only the settings for the current view mode
      const viewDefaults = allDefaults[options.viewMode];
      return { success: true, defaults: viewDefaults || {} };
    } else {
      // Return all view modes
      return { success: true, defaults: allDefaults };
    }
  } catch (error) {
    console.error('Error restoring custom defaults:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('customDefaults:export', async (_event, options: { viewMode: string; scope: string; resolution?: string; overrideSettings?: any }) => {
  try {
    const StoreModule = await (eval('import("electron-store")') as Promise<any>);
    const Store = StoreModule.default;
    const customDefaultsStore: any = new Store({ name: 'custom-defaults' });
    const allDefaults = customDefaultsStore.get('customDefaults') as any;

    if (!allDefaults) {
      return { success: false, error: 'No custom defaults found' };
    }

    let exportData: any;
    let defaultFileName: string;
    const resSuffix = options.resolution ? `-${options.resolution}` : '';

    if (options.scope === 'current') {
      const currentViewDefaults = allDefaults[options.viewMode] || {};
      // Merge override settings if provided (e.g. current game's logo size)
      const mergedViewDefaults = options.overrideSettings
        ? { ...currentViewDefaults, ...options.overrideSettings }
        : currentViewDefaults;

      exportData = { [options.viewMode]: mergedViewDefaults };
      defaultFileName = `onyx-${options.viewMode}-defaults${resSuffix}.json`;
    } else {
      // For scope 'all', merge overrides for each view mode if provided
      if (options.overrideSettings) {
        exportData = { ...allDefaults };
        for (const mode in options.overrideSettings) {
          exportData[mode] = { ...(allDefaults[mode] || {}), ...options.overrideSettings[mode] };
        }
      } else {
        exportData = allDefaults;
      }
      defaultFileName = `onyx-all-view-defaults${resSuffix}.json`;
    }

    // Show save dialog
    const { filePath } = await dialog.showSaveDialog({
      title: 'Export Custom Defaults',
      defaultPath: defaultFileName,
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    if (!filePath) {
      return { success: false, cancelled: true };
    }

    // Write to file
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8');

    return { success: true, filePath };
  } catch (error) {
    console.error('Error exporting custom defaults:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('customDefaults:import', async () => {
  try {
    // Show open dialog
    const { filePaths } = await dialog.showOpenDialog({
      title: 'Import Custom Defaults',
      filters: [
        { name: 'JSON Files', extensions: ['json'] },
        { name: 'All Files', extensions: ['*'] }
      ],
      properties: ['openFile']
    });

    if (!filePaths || filePaths.length === 0) {
      return { success: false, cancelled: true };
    }

    // Read and parse file
    const fs = await import('fs/promises');
    const fileContent = await fs.readFile(filePaths[0], 'utf-8');
    const importedData = JSON.parse(fileContent);

    // Validate the data structure
    if (typeof importedData !== 'object' || importedData === null) {
      return { success: false, error: 'Invalid settings file format' };
    }

    // Save to store
    const StoreModule = await (eval('import("electron-store")') as Promise<any>);
    const Store = StoreModule.default;
    const customDefaultsStore: any = new Store({ name: 'custom-defaults' });

    // Get existing defaults
    const existingDefaults = customDefaultsStore.get('customDefaults', {}) as any;

    // Merge imported data with existing (imported data takes precedence)
    const mergedDefaults = { ...existingDefaults, ...importedData };

    customDefaultsStore.set('customDefaults', mergedDefaults);

    return { success: true, data: mergedDefaults };
  } catch (error) {
    console.error('Error importing custom defaults:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// API credentials IPC handlers
ipcMain.handle('api:getCredentials', async () => {
  try {
    return await apiCredentialsService.getCredentials();
  } catch (error) {
    console.error('Error getting API credentials:', error);
    return {
      igdbClientId: undefined,
      igdbClientSecret: undefined,
    };
  }
});

ipcMain.handle('api:saveCredentials', async (_event, credentials: { igdbClientId?: string; igdbClientSecret?: string; steamGridDBApiKey?: string; rawgApiKey?: string }) => {
  try {
    await apiCredentialsService.saveCredentials(credentials);
    // Reinitialize IGDB service with new credentials
    await initializeIGDBService();
    // Reinitialize SteamGridDB service with new API key

    // Reinitialize RAWG service with new API key
    await initializeRAWGService();
    // Update metadata fetcher with new services
    updateMetadataFetcher();
    return { success: true };
  } catch (error) {
    console.error('Error saving API credentials:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Exit confirmation handler
ipcMain.handle('app:requestExit', async () => {
  try {
    const prefs = await userPreferencesService.getPreferences();
    return {
      shouldMinimizeToTray: prefs.minimizeToTray ?? false,
      canMinimizeToTray: prefs.showSystemTrayIcon ?? true
    };
  } catch (error) {
    console.error('Error checking exit preferences:', error);
    return { shouldMinimizeToTray: false, canMinimizeToTray: false };
  }
});

// Exit handler
ipcMain.handle('app:exit', async () => {
  app.quit();
});

// Get app version handler
ipcMain.handle('app:getVersion', async () => {
  try {
    // Read version from package.json
    const packageJsonPath = path.join(__dirname, '../package.json');
    if (existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      return packageJson.version || '0.0.0';
    }
    // Fallback to app.getVersion() if package.json not found
    return app.getVersion();
  } catch (error) {
    console.error('Error getting app version:', error);
    // Fallback to app.getVersion()
    return app.getVersion();
  }
});

// Get app name handler (for detecting Alpha builds)
ipcMain.handle('app:getName', async () => {
  return app.getName();
});

// Minimize to tray handler
ipcMain.handle('app:minimizeToTray', async () => {
  if (win) {
    win.hide();
  }
});

// Apply system tray settings
ipcMain.handle('app:applySystemTraySettings', async (_event, settings: { showSystemTrayIcon: boolean; minimizeToTray: boolean }) => {
  try {
    if (settings.showSystemTrayIcon) {
      if (!tray) {
        createTray();
      }
    } else {
      if (tray) {
        tray.destroy();
        tray = null;
      }
    }
    return { success: true };
  } catch (error) {
    console.error('Error applying system tray settings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Apply startup settings
ipcMain.handle('app:applyStartupSettings', async (_event, settings: { startWithComputer: boolean; startClosedToTray: boolean }) => {
  try {
    if (app.isPackaged) {
      const args = settings.startClosedToTray ? ['--hidden'] : [];
      app.setLoginItemSettings({
        openAtLogin: settings.startWithComputer,
        path: app.getPath('exe'),
        args: args
      });
      console.log(`[AutoStart] Updated login item settings: openAtLogin=${settings.startWithComputer}, hidden=${settings.startClosedToTray}`);
    } else {
      console.log('[AutoStart] Dev mode detected, skipping login item settings');
    }
    return { success: true };
  } catch (error) {
    console.error('Error applying startup settings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});



// Open folder/path handler
ipcMain.handle('app:openPath', async (_event, pathOrType: string) => {
  try {
    let pathToOpen: string;

    if (pathOrType === 'cache') {
      pathToOpen = imageCacheService.getCacheDir();
    } else if (pathOrType === 'appData') {
      pathToOpen = app.getPath('userData');
    } else {
      // Assume it's a direct path
      pathToOpen = pathOrType;
    }

    await shell.openPath(pathToOpen);
    return { success: true };
  } catch (error) {
    console.error('Error opening path:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Toggle DevTools handler (development only)
ipcMain.handle('app:toggleDevTools', async () => {
  try {
    if (win) {
      if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
      } else {
        win.webContents.openDevTools();
      }
      return { success: true };
    }
    return { success: false, error: 'Window not available' };
  } catch (error) {
    console.error('Error toggling DevTools:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Window control handlers
ipcMain.handle('app:minimizeWindow', async () => {
  try {
    if (win) {
      win.minimize();
      return { success: true };
    }
    return { success: false, error: 'Window not available' };
  } catch (error) {
    console.error('Error minimizing window:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('app:maximizeWindow', async () => {
  try {
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
      return { success: true };
    }
    return { success: false, error: 'Window not available' };
  } catch (error) {
    console.error('Error maximizing window:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('app:closeWindow', async () => {
  try {
    if (win) {
      win.close();
      return { success: true };
    }
    return { success: false, error: 'Window not available' };
  } catch (error) {
    console.error('Error closing window:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Image cache IPC handlers
ipcMain.handle('imageCache:deleteImage', async (_event, gameId: string, imageType: 'boxart' | 'banner' | 'logo' | 'hero') => {
  try {
    await imageCacheService.deleteCachedImage(gameId, imageType);
    return { success: true };
  } catch (error) {
    console.error('Error deleting cached image:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Bug report IPC handlers
ipcMain.handle('bugReport:generate', async (_event, userDescription: string) => {
  try {
    const result = await bugReportService.generateBugReport(userDescription);
    return result;
  } catch (error) {
    console.error('Error generating bug report:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('bugReport:getLogsDirectory', async () => {
  try {
    return { success: true, path: bugReportService.getLogsDirectory() };
  } catch (error) {
    console.error('Error getting logs directory:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

app.whenReady().then(async () => {
  // Clean up any broken onyx-local:// URLs from previous failed caching attempts
  // Only clear URLs if the files don't exist in the cache
  const cacheDir = imageCacheService.getCacheDir();
  const clearedCount = await gameStore.clearBrokenOnyxLocalUrls(cacheDir);
  if (clearedCount > 0) {
    console.log(`[App] Cleaned up ${clearedCount} broken image URLs on startup`);
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

  // IMPORTANT: Register protocol handler FIRST, before any windows are created
  // Track failed URLs to avoid spam logging
  const failedUrls = new Set<string>();
  const failedUrlCounts = new Map<string, number>();

  // Register a custom protocol to serve local files
  // Use the default session to ensure it intercepts all requests
  console.log('[onyx-local] Registering protocol handler...');

  // Also register on default session to ensure it works
  const defaultSession = require('electron').session.defaultSession;

  // Use the modern protocol.handle() API (Promise-based, works better with contextIsolation)
  // Note: protocol.handle() uses standard Fetch API Request/Response, not Electron's ProtocolRequest
  const protocolHandler = async (request: Request): Promise<Response> => {
    // Extract request URL early so it's available in catch block
    const requestUrl = request.url;

    // Track request count early
    const count = (failedUrlCounts.get(requestUrl) || 0) + 1;
    failedUrlCounts.set(requestUrl, count);

    // Log EVERY request to see if handler is being called
    if (count === 1) {
      console.log(`\n[onyx-local] ===== PROTOCOL HANDLER CALLED =====`);
      console.log(`[onyx-local] URL: ${requestUrl.substring(0, 150)}...`);
    }

    try {
      // NEW SIMPLE APPROACH: URL format is onyx-local://{gameId}-{imageType}
      // Extract gameId and imageType directly from URL
      // Handle both with and without trailing slash
      let urlPath = '';
      const match = requestUrl.match(/onyx-local:\/\/\/?([^?#]+)/);
      if (match) {
        urlPath = match[1].replace(/\/+$/, ''); // Remove trailing slashes
      }

      if (!urlPath) {
        if (count === 1) console.log(`[onyx-local] Empty URL path from: ${requestUrl}`);
        return new Response(null, { status: 404, headers: { 'Cache-Control': 'no-store' } });
      }

      if (count === 1) {
        console.log(`[onyx-local] Parsing URL: ${requestUrl} -> urlPath: "${urlPath}"`);
      }

      // URL-decode the path first (browser may URL-encode special characters)
      let decodedUrlPath: string;
      try {
        decodedUrlPath = decodeURIComponent(urlPath);
      } catch (e) {
        // If decoding fails, use original
        decodedUrlPath = urlPath;
      }

      if (count === 1 && decodedUrlPath !== urlPath) {
        console.log(`[onyx-local] Decoded urlPath: "${decodedUrlPath}"`);
      }

      // Parse: {gameId}-{imageType} or old format with encoded path
      let gameId: string | null = null;
      let imageType: string | null = null;

      // Check if it's the new simple format: {gameId}-{imageType}
      const simpleMatch = decodedUrlPath.match(/^([^-]+(?:-[^-]+)*?)-(boxart|banner|logo|hero)$/);
      if (simpleMatch) {
        gameId = simpleMatch[1];
        imageType = simpleMatch[2];
      } else {
        // Old format - try to decode and extract
        try {
          const filename = path.basename(decodedUrlPath);
          const parts = filename.split('-');
          if (parts.length >= 2) {
            if (parts[0] === 'steam' && parts.length > 1) {
              gameId = parts[0] + '-' + parts[1];
              imageType = parts[2] || 'boxart';
            } else if (parts[0] === 'custom' && parts.length > 2) {
              gameId = parts[0] + '-' + parts[1] + '-' + parts[2];
              imageType = parts[3] || 'boxart';
            } else {
              // Try to find image type in filename
              const typeMatch = filename.match(/-?(boxart|banner|logo|hero)-?/);
              if (typeMatch) {
                imageType = typeMatch[1];
                gameId = filename.substring(0, filename.indexOf('-' + imageType));
              }
            }
          }
        } catch (e) {
          // Can't decode, try base64
          try {
            let base64 = decodedUrlPath.replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            const decoded = Buffer.from(base64, 'base64').toString('utf-8');
            const filename = path.basename(decoded);
            const parts = filename.split('-');
            if (parts.length >= 2) {
              if (parts[0] === 'steam' && parts.length > 1) {
                gameId = parts[0] + '-' + parts[1];
                imageType = parts[2] || 'boxart';
              } else if (parts[0] === 'custom' && parts.length > 2) {
                gameId = parts[0] + '-' + parts[1] + '-' + parts[2];
                imageType = parts[3] || 'boxart';
              }
            }
          } catch (e2) {
            // Can't decode at all
          }
        }
      }

      // Get cache directory
      const { homedir } = require('node:os');
      let cacheDir: string;
      if (process.platform === 'win32') {
        const localAppData = process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local');
        cacheDir = path.join(localAppData, 'onyx-launcher', 'images');
      } else if (process.platform === 'darwin') {
        cacheDir = path.join(homedir(), 'Library', 'Caches', 'onyx-launcher', 'images');
      } else {
        cacheDir = path.join(homedir(), '.cache', 'onyx-launcher', 'images');
      }

      if (gameId && imageType && existsSync(cacheDir)) {
        // Try to find file: {gameId}-{imageType}.{ext}
        const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');
        const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm'];

        for (const ext of extensions) {
          const filename = `${safeGameId}-${imageType}${ext}`;
          const filePath = path.join(cacheDir, filename);
          if (existsSync(filePath)) {
            if (count === 1) console.log(`[onyx-local] ✓ Found: ${filename}`);

            // Clear from failed set if it was there (file now exists)
            if (failedUrls.has(requestUrl)) {
              failedUrls.delete(requestUrl);
              failedUrlCounts.delete(requestUrl);
            }

            try {
              const fileData = readFileSync(filePath);
              let mimeType = 'image/jpeg';
              if (ext === '.png') mimeType = 'image/png';
              else if (ext === '.gif') mimeType = 'image/gif';
              else if (ext === '.webp') mimeType = 'image/webp';
              else if (ext === '.webm') mimeType = 'video/webm';

              // Only log successful loads occasionally to avoid spam
              const successCount = failedUrlCounts.get(requestUrl + '_success') || 0;
              failedUrlCounts.set(requestUrl + '_success', successCount + 1);
              if (successCount === 0 || successCount % 50 === 0) {
                console.log(`[onyx-local] Successfully serving file: ${filename}`);
              }

              return new Response(fileData, { headers: { 'Content-Type': mimeType } });
            } catch (readError) {
              // If reading the file fails, log but don't block other requests
              if (count === 1) {
                console.error(`[onyx-local] Error reading file ${filename}:`, readError);
              }
              // Continue to return 404 below
              break;
            }
          }
        }

        // File not found - return 404 but don't mark as failed until we've tried a few times
        // This allows other images for the same game to still load
        if (count === 1) {
          console.log(`[onyx-local] File not found: ${safeGameId}-${imageType}.{jpg|png|gif|webp}`);
          console.log(`[onyx-local] Cache dir: ${cacheDir}`);
          // List available files for this game ID to help debug
          try {
            const { readdirSync } = require('node:fs');
            const files = readdirSync(cacheDir);
            const matchingFiles = files.filter((f: string) => f.startsWith(safeGameId + '-'));
            if (matchingFiles.length > 0) {
              console.log(`[onyx-local] Found ${matchingFiles.length} file(s) for game ID ${safeGameId}:`, matchingFiles.slice(0, 5));
            } else {
              // Try to find files with similar game IDs
              const similarFiles = files.filter((f: string) => f.includes('-boxart') || f.includes('-banner'));
              if (similarFiles.length > 0) {
                console.log(`[onyx-local] Sample files in cache:`, similarFiles.slice(0, 5));
              }
            }
          } catch (e) {
            // Ignore errors listing directory
          }
        }

        // Return 404 for this specific image - don't block other images
        // Only mark as failed after multiple attempts to prevent retry loops
        if (count > 2) {
          failedUrls.add(requestUrl);
        }
        return new Response(null, {
          status: 404,
          statusText: 'Not Found',
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Content-Type-Options': 'nosniff',
          }
        });
      } else {
        if (count === 1) {
          console.log(`[onyx-local] Could not parse URL: ${urlPath}`);
          console.log(`[onyx-local] Parsed: gameId="${gameId}", imageType="${imageType}"`);
        }
        // Return 404 for unparseable URLs
        return new Response(null, {
          status: 404,
          headers: { 'Cache-Control': 'no-store' }
        });
      }

      // Fallback: try old format decoding
      let encodedPath = urlPath;

      // Log first few requests with full details, then throttle
      if (count === 1) {
        console.log(`\n[onyx-local] ===== FIRST REQUEST =====`);
        console.log(`[onyx-local] Full URL: ${requestUrl}`);
        console.log(`[onyx-local] Extracted encoded path: ${encodedPath}`);
      } else if (count <= 3) {
        console.log(`[onyx-local] Request #${count} for same URL`);
      } else if (count === 10) {
        console.warn(`[onyx-local] WARNING: Request #${count} for same URL - possible infinite retry loop!`);
      } else if (count % 1000 === 0) {
        console.log(`[onyx-local] Request #${count} (throttled logging)`);
      }

      // Prevent infinite retry loops - if we've seen this URL fail 2+ times, stop processing immediately
      if (count > 2) {
        // Check if this URL has already failed
        if (failedUrls.has(requestUrl)) {
          // Return 410 Gone to tell browser to stop retrying
          return new Response(null, {
            status: 410,
            statusText: 'Gone - Stop Retrying',
            headers: {
              'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
              'X-Stop-Retry': 'true',
            }
          });
        }
      }

      // Validate we have an encoded path
      if (!encodedPath || encodedPath.trim() === '') {
        console.error(`[onyx-local] Could not extract path from URL: ${requestUrl}`);
        return new Response(null, {
          status: 404,
          headers: { 'Cache-Control': 'no-store' }
        });
      }

      // Remove ALL trailing slashes (Electron sometimes adds multiple)
      // This is critical - trailing slashes break base64 decoding
      while (encodedPath.endsWith('/')) {
        encodedPath = encodedPath.substring(0, encodedPath.length - 1);
      }

      // Remove any query parameters or fragments
      const queryIndex = encodedPath.indexOf('?');
      if (queryIndex !== -1) {
        encodedPath = encodedPath.substring(0, queryIndex);
      }
      const fragmentIndex = encodedPath.indexOf('#');
      if (fragmentIndex !== -1) {
        encodedPath = encodedPath.substring(0, fragmentIndex);
      }

      // Decode the path (it's URL-encoded)
      // URL encoding is case-insensitive, so Electron's URL lowercasing won't break it
      let decodedPath: string;
      try {
        decodedPath = decodeURIComponent(encodedPath);
      } catch (e) {
        // If URL decoding fails, try base64 decoding for backward compatibility with old URLs
        try {
          // Try base64 decoding (for old URLs that used base64)
          let base64 = encodedPath.replace(/-/g, '+').replace(/_/g, '/');
          while (base64.length % 4) {
            base64 += '=';
          }
          decodedPath = Buffer.from(base64, 'base64').toString('utf-8');
          if (!failedUrls.has(requestUrl + '_base64_decode')) {
            failedUrls.add(requestUrl + '_base64_decode');
            console.warn(`[onyx-local] Using base64 decoding for backward compatibility: ${encodedPath.substring(0, 50)}...`);
          }
        } catch (e2) {
          if (!failedUrls.has(requestUrl + '_decode_error')) {
            failedUrls.add(requestUrl + '_decode_error');
            console.error(`[onyx-local] Failed to decode path. Encoded: ${encodedPath.substring(0, 100)}...`, e);
          }
          return new Response(null, {
            status: 404,
            headers: { 'Cache-Control': 'no-store' }
          });
        }
      }

      // On Windows, handle path separators and drive letters properly
      let finalPath: string;
      if (process.platform === 'win32') {
        // Replace forward slashes with backslashes
        finalPath = decodedPath.replace(/\//g, '\\');

        // Handle Windows drive letter format
        // After decoding, we should have something like "C:\Users..." or "C:/Users..."
        // Ensure proper format: C:\Users...
        if (finalPath.match(/^[A-Za-z]:/)) {
          // Drive letter is present, ensure backslash after colon
          if (finalPath.charAt(2) !== '\\') {
            finalPath = finalPath.charAt(0) + ':' + '\\' + finalPath.substring(2);
          }
        }
      } else {
        // On Unix-like systems, just replace forward slashes
        finalPath = decodedPath.replace(/\//g, path.sep);
      }

      // Normalize the path to resolve any .. or . segments
      finalPath = path.normalize(finalPath);

      // Verify file exists
      if (!existsSync(finalPath)) {
        // Only log error once per unique URL to avoid spam
        if (!failedUrls.has(requestUrl)) {
          failedUrls.add(requestUrl);
          console.error(`\n[onyx-local] ===== IMAGE FILE NOT FOUND =====`);
          console.error(`[onyx-local] Final Path: ${finalPath}`);
          console.error(`[onyx-local] URL: ${requestUrl}`);
          console.error(`[onyx-local] Decoded Path: ${decodedPath}`);
          console.error(`[onyx-local] Encoded Path: ${encodedPath}`);

          // Check if parent directory exists
          const parentDir = path.dirname(finalPath);
          if (!existsSync(parentDir)) {
            console.error(`  ❌ Parent directory does not exist: ${parentDir}`);

            // Check if it's the image cache directory - check both old and new locations
            const oldCacheDir = path.join(app.getPath('userData'), 'cache', 'images');
            const { homedir } = require('node:os');
            let newCacheDir: string;
            if (process.platform === 'win32') {
              const localAppData = process.env.LOCALAPPDATA || path.join(homedir(), 'AppData', 'Local');
              newCacheDir = path.join(localAppData, 'onyx-launcher', 'images');
            } else if (process.platform === 'darwin') {
              newCacheDir = path.join(homedir(), 'Library', 'Caches', 'onyx-launcher', 'images');
            } else {
              newCacheDir = path.join(homedir(), '.cache', 'onyx-launcher', 'images');
            }

            // Check both cache locations for any matching files
            const cacheDirs = [newCacheDir, oldCacheDir];
            for (const imageCacheDir of cacheDirs) {
              if (existsSync(imageCacheDir)) {
                try {
                  const cacheFiles = readdirSync(imageCacheDir);
                  console.error(`  Checking cache directory: ${imageCacheDir} (${cacheFiles.length} files)`);

                  // Try multiple matching strategies:
                  // 1. Exact filename match
                  const filename = path.basename(finalPath);
                  let matching = cacheFiles.filter(f => f === filename);

                  // 2. If no exact match, try matching by game ID (first part before first dash)
                  if (matching.length === 0 && filename.includes('-')) {
                    const gameIdPart = filename.split('-')[0];
                    matching = cacheFiles.filter(f => f.startsWith(gameIdPart + '-'));
                    console.error(`  Trying to match by game ID "${gameIdPart}": found ${matching.length} files`);
                  }

                  // 3. If still no match, try matching by image type (boxart, banner, etc.)
                  if (matching.length === 0 && filename.includes('-')) {
                    const parts = filename.split('-');
                    if (parts.length >= 2) {
                      const imageType = parts[1]; // boxart, banner, logo, hero
                      const gameIdPart = parts[0];
                      matching = cacheFiles.filter(f =>
                        f.startsWith(gameIdPart + '-') && f.includes('-' + imageType + '-')
                      );
                      console.error(`  Trying to match by game ID + type "${gameIdPart}-${imageType}": found ${matching.length} files`);
                    }
                  }

                  if (matching.length > 0) {
                    // Use the first match (or prefer .png/.jpg if available)
                    let selectedFile: string = matching[0];
                    const pngMatch = matching.find(f => f.endsWith('.png'));
                    const jpgMatch = matching.find(f => f.endsWith('.jpg') || f.endsWith('.jpeg'));
                    // Prefer PNG, then JPG, otherwise use first match
                    if (pngMatch) {
                      selectedFile = pngMatch as string;
                    } else if (jpgMatch) {
                      selectedFile = jpgMatch as string;
                    }

                    const correctPath = path.join(imageCacheDir, selectedFile);
                    console.error(`  ✓ Found matching file: ${selectedFile}`);
                    console.error(`  Serving from: ${correctPath}`);

                    if (existsSync(correctPath)) {
                      const fileData = readFileSync(correctPath);
                      const ext = path.extname(correctPath).toLowerCase();
                      let mimeType = 'application/octet-stream';
                      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
                      else if (ext === '.png') mimeType = 'image/png';
                      else if (ext === '.gif') mimeType = 'image/gif';
                      else if (ext === '.webp') mimeType = 'image/webp';
                      else if (ext === '.webm') mimeType = 'video/webm';

                      // Clear from failed set since we found it
                      if (failedUrls.has(requestUrl)) {
                        failedUrls.delete(requestUrl);
                        failedUrlCounts.delete(requestUrl);
                      }

                      return new Response(fileData, {
                        headers: { 'Content-Type': mimeType },
                      });
                    }
                  } else {
                    console.error(`  No matching files found in ${imageCacheDir}`);
                  }
                } catch (e) {
                  console.error(`  Could not list cache directory ${imageCacheDir}: ${e}`);
                }
              } else {
                console.error(`  Cache directory does not exist: ${imageCacheDir}`);
              }
            }
          } else {
            console.error(`  ✓ Parent directory exists: ${parentDir}`);
            // List files in parent directory to help debug
            try {
              const files = readdirSync(parentDir);
              console.error(`  Files in directory (${files.length}): ${files.slice(0, 5).join(', ')}${files.length > 5 ? '...' : ''}`);

              // Try to find similar files
              const filename = path.basename(finalPath);
              const similar = files.filter(f => {
                const fLower = f.toLowerCase();
                const nameLower = filename.toLowerCase();
                return fLower.includes(nameLower.substring(0, 10)) || nameLower.includes(fLower.substring(0, 10));
              });
              if (similar.length > 0) {
                console.error(`  Similar files found: ${similar.join(', ')}`);
              }
            } catch (e) {
              console.error(`  Could not list directory: ${e}`);
            }
          }
        }
        // Return 404 with headers to prevent retries
        return new Response(null, {
          status: 404,
          statusText: 'Not Found',
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'X-Content-Type-Options': 'nosniff',
          }
        });
      }

      // Clear from failed set if it was there
      if (failedUrls.has(requestUrl)) {
        failedUrls.delete(requestUrl);
        failedUrlCounts.delete(requestUrl);
      }

      // Only log successful loads occasionally to avoid spam
      const successCount = failedUrlCounts.get(requestUrl + '_success') || 0;
      failedUrlCounts.set(requestUrl + '_success', successCount + 1);
      if (successCount === 0 || successCount % 50 === 0) {
        console.log(`[onyx-local] Successfully serving file: ${finalPath}`);
      }

      // Read file and return as Response
      const fileData = readFileSync(finalPath);
      const ext = path.extname(finalPath).toLowerCase();
      let mimeType = 'application/octet-stream';
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.webm') mimeType = 'video/webm';

      return new Response(fileData, {
        headers: { 'Content-Type': mimeType },
      });
    } catch (error) {
      // Only log errors once per unique URL to avoid spam
      // IMPORTANT: Errors for one image should NOT affect other images
      // Each request is independent, so we return 500 for this specific URL only
      if (!failedUrls.has(requestUrl + '_error')) {
        failedUrls.add(requestUrl + '_error');
        console.error('[onyx-local] Error in protocol handler for URL:', requestUrl.substring(0, 100));
        if (error instanceof Error) {
          console.error('[onyx-local] Error message:', error.message);
          console.error('[onyx-local] Error stack:', error.stack?.substring(0, 200));
        } else {
          console.error('[onyx-local] Error object:', error);
        }
      }
      // Return 500 for this specific request only - don't block other images
      return new Response(null, {
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Content-Type-Options': 'nosniff',
        }
      });
    }
  };

  // Register using modern protocol.handle() API
  try {
    protocol.handle('onyx-local', protocolHandler);
    console.log('[onyx-local] Protocol handler registered successfully (modern API)');
  } catch (e) {
    console.error('[onyx-local] Failed to register with modern API, trying legacy API:', e);
    // Fallback to legacy API - convert ProtocolRequest to Request-like object
    const protocolResult = protocol.registerFileProtocol('onyx-local', (electronRequest, callback) => {
      // Convert Electron ProtocolRequest to Fetch Request
      const fetchRequest = new Request(electronRequest.url, {
        method: electronRequest.method || 'GET',
        headers: electronRequest.headers as Record<string, string>,
      });

      protocolHandler(fetchRequest).then(response => {
        // For legacy API, we need to extract the file path from the URL
        // since Response doesn't have a path property
        const url = new URL(electronRequest.url);
        let encodedPath = url.pathname.substring(1); // Remove leading slash

        if (!encodedPath && electronRequest.url.includes('onyx-local://')) {
          const match = electronRequest.url.match(/onyx-local:\/\/\/?([^?#]+)/);
          if (match) encodedPath = match[1];
        }

        if (response.status === 200 && encodedPath) {
          try {
            // Decode the path
            let base64 = encodedPath.toUpperCase().replace(/-/g, '+').replace(/_/g, '/');
            while (base64.length % 4) base64 += '=';
            const decodedPath = Buffer.from(base64, 'base64').toString('utf-8');
            let finalPath = process.platform === 'win32'
              ? decodedPath.replace(/\//g, '\\')
              : decodedPath;
            finalPath = path.normalize(finalPath);

            if (existsSync(finalPath)) {
              callback({ path: finalPath });
            } else {
              callback({ error: -6 }); // FILE_NOT_FOUND
            }
          } catch {
            callback({ error: -2 }); // FAILED
          }
        } else {
          callback({ error: response.status === 404 ? -6 : -2 });
        }
      }).catch(() => callback({ error: -2 }));
    });
    if (!protocolResult) {
      console.error('[onyx-local] Failed to register protocol handler!');
    }
  }

  // Also register on default session using modern API
  try {
    session.defaultSession.protocol.handle('onyx-local', protocolHandler);
    console.log('[onyx-local] Also registered on default session (modern API)');
  } catch (e) {
    console.warn('[onyx-local] Could not register on default session:', e);
  }

  // Verify registration
  const isRegistered = protocol.isProtocolRegistered('onyx-local');
  console.log(`[onyx-local] Protocol registration verified: ${isRegistered}`);
  if (!isRegistered) {
    console.error('[onyx-local] WARNING: Protocol registration check failed!');
  }

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

  // DISABLED: Suspend feature (Future Feature)
  // Always register IPC handlers (they check if service is available)
  // registerSuspendIPCHandlers();

  // Initialize suspend service if enabled
  // await initializeSuspendService();

  // Register shortcut if service is enabled
  // if (processSuspendService) {
  //   await registerSuspendShortcut();
  // }

  createMenu();
  createWindow();

  // Perform startup scan if enabled in preferences
  (async () => {
    try {
      const prefs = await userPreferencesService.getPreferences();
      if (prefs.updateLibrariesOnStartup) {
        // Small delay to ensure window is ready to receive notifications
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('[StartupScan] Performing startup scan for new games...');
        await performBackgroundScan(true);
        console.log('[StartupScan] Startup scan completed');
      } else {
        console.log('[StartupScan] Startup scan disabled in preferences');
      }
    } catch (error) {
      console.error('[StartupScan] Error during startup scan:', error);
      // Don't block app startup if scan fails
    }
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
