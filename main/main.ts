import { app, BrowserWindow, ipcMain, dialog, Menu, protocol, Tray, nativeImage, shell, session, net } from 'electron';
import path from 'node:path';
import { readdirSync, statSync, existsSync, readFileSync } from 'node:fs';
import { platform } from 'node:os';
import dotenv from 'dotenv';
import { SteamService } from './SteamService.js';
import { GameStore, type Game } from './GameStore.js';
import { MetadataFetcherService, IGDBConfig } from './MetadataFetcherService.js';
import { LauncherService } from './LauncherService.js';
import { IGDBService } from './IGDBService.js';
import { AppConfigService } from './AppConfigService.js';
import { XboxService } from './XboxService.js';
import { UserPreferencesService } from './UserPreferencesService.js';
import { APICredentialsService } from './APICredentialsService.js';
import { LauncherDetectionService } from './LauncherDetectionService.js';
import { ImportService } from './ImportService.js';
import { ImageCacheService } from './ImageCacheService.js';
import { SteamAuthService } from './SteamAuthService.js';

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
process.env.DIST = path.join(__dirname, '../dist');
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
        const icoPath = path.join(__dirname, '../../build/icon.ico');
        const pngPath = path.join(__dirname, '../../resources/icon.png');
        
        if (existsSync(icoPath)) {
          iconPath = icoPath;
        } else if (existsSync(pngPath)) {
          iconPath = pngPath;
        } else {
          throw new Error('No icon file found');
        }
      } else {
        const pngPath = path.join(__dirname, '../../resources/icon.png');
        const svgPath = path.join(__dirname, '../../resources/icon.svg');
        
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
    // On Windows, system tray icons are typically 16x16, but we can use a larger size for better quality
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
            ? (existsSync(path.join(__dirname, '../../build/icon.ico'))
                ? path.join(__dirname, '../../build/icon.ico')
                : path.join(__dirname, '../../resources/icon.png'))
            : path.join(__dirname, '../../resources/icon.png'));
      
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
  
  // Function to update the tray menu
  const updateTrayMenu = async () => {
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
  };
  
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
        const icoPath = path.join(__dirname, '../../build/icon.ico');
        const pngPath = path.join(__dirname, '../../resources/icon.png');
        
        if (existsSync(icoPath)) {
          appIcon = nativeImage.createFromPath(icoPath);
        } else if (existsSync(pngPath)) {
          appIcon = nativeImage.createFromPath(pngPath);
        }
      } else {
        const svgPath = path.join(__dirname, '../../resources/icon.svg');
        const pngPath = path.join(__dirname, '../../resources/icon.png');
        
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
  try {
    const prefs = await userPreferencesService.getPreferences();
    windowState = prefs.windowState;
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
    title: 'Onyx',
    icon: appIcon, // Set the app icon
    webPreferences: {
      preload,
      nodeIntegration: false,
      contextIsolation: true,
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
    show: false, // Don't show initially if startClosedToTray is enabled
  });

  // Restore maximized state if it was maximized
  if (windowState?.isMaximized) {
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
      if (prefs.minimizeToTray) {
        event.preventDefault();
        win?.hide();
        return;
      }
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

  // Debug: Check for preload errors
  win.webContents.on('preload-error', (event, preloadPath, error) => {
    console.error('Preload error:', preloadPath, error);
  });

  if (VITE_DEV_SERVER_URL) {
    // Load from Vite dev server
    win.loadURL(VITE_DEV_SERVER_URL);
    // Open DevTools automatically in development mode
    win.webContents.openDevTools();
  } else {
    // Load from built files
    win.loadFile(path.join(process.env.DIST || '', 'index.html'));
    // DevTools can be opened manually with Ctrl+Shift+I or F12
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

// Initialize IGDB service if credentials are available
let igdbService: IGDBService | null = null;
let steamGridDBService: import('./SteamGridDBService.js').SteamGridDBService | null = null;

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
const initializeIGDBService = async () => {
  try {
    // First check stored credentials, then fall back to environment variables
    const storedCreds = await apiCredentialsService.getCredentials();
    const igdbClientId = storedCreds.igdbClientId || process.env.IGDB_CLIENT_ID;
    const igdbClientSecret = storedCreds.igdbClientSecret || process.env.IGDB_CLIENT_SECRET;
    
    if (igdbClientId && igdbClientSecret) {
      try {
        // Create service instance
        const service = new IGDBService(igdbClientId, igdbClientSecret);
        
        // Validate credentials before using the service
        const isValid = await service.validateCredentials();
        if (isValid) {
          igdbService = service;
          console.log('IGDB service initialized with valid credentials');
          return true;
        } else {
          console.warn('IGDB credentials are invalid. IGDB features will be unavailable.');
          igdbService = null;
          return false;
        }
      } catch (error) {
        console.error('Failed to initialize IGDB service:', error);
        igdbService = null;
        return false;
      }
    } else {
      console.warn('IGDB credentials not found. IGDB features will be unavailable.');
      igdbService = null;
      return false;
    }
  } catch (error) {
    console.error('Error initializing IGDB service:', error);
    igdbService = null;
    return false;
  }
};

// Function to initialize SteamGridDB service with API key
const initializeSteamGridDBService = async () => {
  try {
    const storedCreds = await apiCredentialsService.getCredentials();
    const steamGridDBApiKey = storedCreds.steamGridDBApiKey || process.env.STEAMGRIDDB_API_KEY;
    
    if (steamGridDBApiKey) {
      const { SteamGridDBService } = await import('./SteamGridDBService.js');
      steamGridDBService = new SteamGridDBService(steamGridDBApiKey);
      console.log('SteamGridDB service initialized');
      return true;
    } else {
      console.warn('SteamGridDB API key not found. SteamGridDB features will be unavailable.');
      steamGridDBService = null;
      return false;
    }
  } catch (error) {
    console.error('Error initializing SteamGridDB service:', error);
    steamGridDBService = null;
    return false;
  }
};

// Initialize metadata fetcher with providers
const metadataFetcher = new MetadataFetcherService(
  null, // IGDB service (will be set after initialization)
  null, // SteamGridDB service (will be set after initialization)
  steamService // Steam service (always available)
);

// Function to update metadata fetcher with initialized services
const updateMetadataFetcher = () => {
  metadataFetcher.setIGDBService(igdbService);
  metadataFetcher.setSteamGridDBService(steamGridDBService);
  metadataFetcher.setSteamService(steamService);
};

const launcherService = new LauncherService(gameStore);
const importService = new ImportService(steamService, xboxService, appConfigService, metadataFetcher);
const imageCacheService = new ImageCacheService();

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

// Initialize on startup (wrapped in IIFE to handle async)
(async () => {
  await initializeIGDBService();
  await initializeSteamGridDBService();
  updateMetadataFetcher();
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
          validatedGame.logoUrl = fixed || validatedGame.logoUrl;
        } else if (!fixed || fixed === '') {
          validatedGame.logoUrl = undefined;
        }
      }
      
      if (validatedGame.heroUrl?.startsWith('onyx-local://')) {
        const fixed = await imageCacheService.cacheImage(validatedGame.heroUrl, game.id, 'hero');
        if (fixed && fixed !== validatedGame.heroUrl) {
          validatedGame.heroUrl = fixed || validatedGame.heroUrl;
        } else if (!fixed || fixed === '') {
          validatedGame.heroUrl = undefined;
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

ipcMain.handle('gameStore:saveGame', async (_event, game: Game) => {
  try {
    // Cache images before saving
    const cachedImages = await imageCacheService.cacheImages({
      boxArtUrl: game.boxArtUrl,
      bannerUrl: game.bannerUrl,
      logoUrl: game.logoUrl,
      heroUrl: game.heroUrl,
    }, game.id);

    // Update game with cached image URLs
    const gameWithCachedImages: Game = {
      ...game,
      boxArtUrl: cachedImages.boxArtUrl || game.boxArtUrl,
      bannerUrl: cachedImages.bannerUrl || game.bannerUrl,
      logoUrl: cachedImages.logoUrl || game.logoUrl,
      heroUrl: cachedImages.heroUrl || game.heroUrl,
    };

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

// Reset app handler - clears all data
ipcMain.handle('app:reset', async () => {
  try {
    // Clear all stores
    await gameStore.clearLibrary();
    await userPreferencesService.resetPreferences();
    await appConfigService.clearAppConfigs();
    await apiCredentialsService.clearCredentials();
    
    // Reinitialize services (will be null since credentials are cleared)
    await initializeIGDBService();
    await initializeSteamGridDBService();
    // Update metadata fetcher to remove providers that are no longer available
    updateMetadataFetcher();
    
    return { success: true };
  } catch (error) {
    console.error('Error in app:reset handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Metadata fetcher IPC handlers
ipcMain.handle('metadata:searchArtwork', async (_event, title: string, steamAppId?: string) => {
  try {
    const metadata = await withTimeout(
      metadataFetcher.searchArtwork(title, steamAppId),
      15000, // 15 seconds - artwork fetching should be faster
      `Artwork fetch timeout for "${title}"`
    );
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

ipcMain.handle('metadata:fetchAndUpdate', async (_event, gameId: string, title: string) => {
  try {
    // Extract Steam App ID if it's a Steam game
    const steamAppId = gameId.startsWith('steam-') ? gameId.replace('steam-', '') : undefined;
    const metadata = await withTimeout(
      metadataFetcher.searchArtwork(title, steamAppId),
      20000, // 20 seconds for full metadata fetch
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
          }, gameId),
          10000, // 10 seconds for image caching
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
    
    // Fetch logos from SteamGridDB for each result if available
    const sgdbService = steamGridDBService;
    if (sgdbService && results.length > 0) {
      console.log(`[Logo Search] Searching SteamGridDB for logos for ${results.length} games`);
      const resultsWithLogos = await Promise.all(
        results.map(async (result) => {
          try {
            // Try multiple search strategies to find matching game
            let sgdbGames: any[] = [];
            
            // Strategy 1: Search by exact IGDB game name
            try {
              sgdbGames = await withTimeout(
                sgdbService.searchGame(result.name),
                8000, // Shorter timeout for individual searches
                `SteamGridDB search timeout for "${result.name}"`
              );
            } catch (err) {
              console.debug(`[Logo Search] Strategy 1 failed for "${result.name}":`, err);
            }
            
            // Strategy 2: If no results, try the original search query
            if (sgdbGames.length === 0 && gameTitle !== result.name) {
              try {
                sgdbGames = await withTimeout(
                  sgdbService.searchGame(gameTitle),
                  8000,
                  `SteamGridDB search timeout for "${gameTitle}"`
                );
              } catch (err) {
                console.debug(`[Logo Search] Strategy 2 failed for "${gameTitle}":`, err);
              }
            }
            
            // Strategy 3: Try without special characters/common words
            if (sgdbGames.length === 0) {
              const simplifiedName = result.name
                .replace(/[™®©]/g, '')
                .replace(/\s*:\s*/g, ' ')
                .trim();
              if (simplifiedName !== result.name) {
                try {
                  sgdbGames = await withTimeout(
                    sgdbService.searchGame(simplifiedName),
                    8000,
                    `SteamGridDB search timeout for "${simplifiedName}"`
                  );
                } catch (err) {
                  console.debug(`[Logo Search] Strategy 3 failed for "${simplifiedName}":`, err);
                }
              }
            }
            
            if (sgdbGames.length > 0) {
              // Try to find the best matching game (prefer verified games)
              let selectedGame = sgdbGames.find(g => g.verified) || sgdbGames[0];
              const gameId = selectedGame.id;
              console.log(`[Logo Search] Found SteamGridDB game ${gameId} ("${selectedGame.name}") for "${result.name}", fetching logos...`);
              
              const logos = await withTimeout(
                sgdbService.getLogos(gameId),
                8000,
                `SteamGridDB logo fetch timeout for game ${gameId}`
              );
              
              if (logos.length > 0) {
                // Filter out NSFW/humor/epilepsy content and get highest scored logo
                const suitableLogos = logos.filter(img => !img.nsfw && !img.humor && !img.epilepsy);
                if (suitableLogos.length > 0) {
                  const bestLogo = suitableLogos.sort((a, b) => b.score - a.score)[0];
                  console.log(`[Logo Search] ✓ Found logo for "${result.name}": ${bestLogo.url} (score: ${bestLogo.score})`);
                  result.logoUrl = bestLogo.url;
                } else {
                  console.log(`[Logo Search] No suitable logo found for "${result.name}" (${logos.length} logos, all filtered out)`);
                }
              } else {
                console.log(`[Logo Search] No logos available for SteamGridDB game ${gameId} ("${selectedGame.name}")`);
              }
            } else {
              console.log(`[Logo Search] No SteamGridDB match found for "${result.name}" (tried: "${result.name}", "${gameTitle}")`);
            }
          } catch (err) {
            // Log errors more prominently for debugging
            console.error(`[Logo Search] Error fetching logo for "${result.name}":`, err);
          }
          return result;
        })
      );
      const logosFound = resultsWithLogos.filter(r => r.logoUrl).length;
      console.log(`[Logo Search] Completed: ${logosFound}/${results.length} games have logos`);
      return { success: true, results: resultsWithLogos };
    } else if (!sgdbService) {
      console.warn('[Logo Search] SteamGridDB service not available - skipping logo search. Please configure SteamGridDB API key in Settings > APIs.');
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
    const results = await metadataFetcher.searchGames(gameTitle);
    
    // Transform results to include additional info for display
    const transformedResults = await Promise.all(
      results.map(async (result) => {
        const transformed: any = { ...result };
        
        // Try to get more details if it's an IGDB result
        if (result.source === 'igdb' && result.externalId && igdbService) {
          try {
            // Search IGDB to get the full game details
            const igdbResults = await igdbService.searchGame(String(result.externalId));
            const igdbResult = igdbResults.find(r => r.id === result.externalId) || igdbResults[0];
            
            if (igdbResult) {
              // Extract year from release date
              if (igdbResult.releaseDate) {
                const date = new Date(igdbResult.releaseDate * 1000);
                transformed.year = date.getFullYear();
              }
              // Extract platform
              if (igdbResult.platform) {
                transformed.platform = igdbResult.platform;
              }
            }
          } catch (err) {
            console.warn('Error fetching additional details for IGDB result:', err);
          }
        }
        
        // For SteamGridDB, the search results don't include year/platform in the basic search
        // We could fetch game details, but that would be slow. For now, just return basic info.
        
        return transformed;
      })
    );
    
    return { success: true, results: transformedResults };
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
        if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
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
        const steamAppId = game.id.startsWith('steam-') ? game.id.replace('steam-', '') : undefined;
        
        // NEW APPROACH: Use the same direct search method as manual search
        // This finds boxart even when exact game match isn't found
        let metadata: { boxArtUrl?: string; bannerUrl?: string; logoUrl?: string; heroUrl?: string } = {};
        
        // First, try direct SteamGridDB search (same as manual search)
        if (steamGridDBService) {
          try {
            sendProgress({ 
              current, 
              total: totalGames, 
              message: `Searching SteamGridDB for ${game.title}...`,
              gameTitle: game.title
            });
            
            // For non-Steam games, use fuzzy search (try multiple variations)
            let sgdbGames = await steamGridDBService.searchGame(game.title);
            
            // If no results, try fuzzy search variations (for both Steam and non-Steam games)
            if (sgdbGames.length === 0) {
              console.log(`[RefreshAll] No exact match for "${game.title}", trying fuzzy search...`);
              
              // Try variations: remove special characters, try without common words, etc.
              const variations = [
                game.title.replace(/[^\w\s]/g, '').trim(), // Remove special chars
                game.title.replace(/\s*(?:edition|pack|dlc|remastered|remaster|definitive|ultimate|gold|platinum|deluxe|collector|special|limited|anniversary|game of the year|goty)\s*/gi, '').trim(), // Remove common edition words
                game.title.split(' - ')[0].trim(), // Remove subtitle
                game.title.split(':')[0].trim(), // Remove colon subtitle
              ].filter(v => v.length > 0 && v !== game.title);
              
              // Add Roman numeral conversion for titles like "Final Fantasy VI" -> "Final Fantasy 6"
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
                  variations.push(numericTitle);
                }
              }
              
              for (const variation of variations) {
                if (sgdbGames.length > 0) break; // Stop if we found results
                try {
                  sgdbGames = await steamGridDBService.searchGame(variation);
                  if (sgdbGames.length > 0) {
                    console.log(`[RefreshAll] Found match with variation "${variation}" for "${game.title}"`);
                    break;
                  }
                } catch (e) {
                  // Continue to next variation
                }
              }
            }
            
            if (sgdbGames.length > 0) {
              // Use the first/best match (usually sorted by relevance)
              const bestMatch = sgdbGames[0];
              console.log(`[RefreshAll] Found SteamGridDB game: ${bestMatch.name} (ID: ${bestMatch.id}) for "${game.title}"`);
              
              sendProgress({ 
                current, 
                total: totalGames, 
                message: `Fetching boxart for ${game.title}...`,
                gameTitle: game.title
              });
              
              // Get capsules (boxart), heroes (banners), and logos
              const capsules = await steamGridDBService.getCapsules(bestMatch.id, true);
              const heroes = await steamGridDBService.getHeroes(bestMatch.id);
              const logos = await steamGridDBService.getLogos(bestMatch.id);
              
              // Filter and get best images (same logic as SteamGridDBMetadataProvider)
              const filterImage = (img: any) => !img.nsfw && !img.humor && !img.epilepsy;
              
              const bestCapsule = capsules
                .filter(filterImage)
                .filter(img => {
                  // Verify it's actually a vertical grid (portrait orientation)
                  if (img.width && img.height) {
                    const aspectRatio = img.height / img.width;
                    return aspectRatio >= 0.9; // Same filter as manual search
                  }
                  return true; // Include if dimensions missing
                })
                .sort((a, b) => b.score - a.score)[0];
              
              const bestHero = heroes
                .filter(filterImage)
                .sort((a, b) => b.score - a.score)[0];
              
              const bestLogo = logos
                .filter(filterImage)
                .sort((a, b) => b.score - a.score)[0];
              
              if (bestCapsule) {
                metadata.boxArtUrl = bestCapsule.url;
                console.log(`[RefreshAll] Found boxart for ${game.title}: ${bestCapsule.url.substring(0, 80)}...`);
              }
              if (bestHero) {
                metadata.bannerUrl = bestHero.url;
              }
              if (bestLogo) {
                metadata.logoUrl = bestLogo.url;
              }
            }
          } catch (error) {
            console.warn(`[RefreshAll] SteamGridDB direct search failed for ${game.title}:`, error);
          }
        }
        
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
            // Search all sources for this query variation
            const allSourcesMetadata = await metadataFetcher.searchArtwork(searchQuery, steamAppId);
            
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
        
        // If we still don't have all three, try all sources for all game types
        if (!metadata.boxArtUrl || !metadata.bannerUrl || !metadata.logoUrl) {
          sendProgress({ 
            current, 
            total: totalGames, 
            message: `Checking Steam CDN for ${game.title}...`,
            gameTitle: game.title
          });
          
          try {
            const steamMetadata = await metadataFetcher.searchArtwork(game.title, steamAppId);
            if (steamMetadata.boxArtUrl && !metadata.boxArtUrl) {
              metadata.boxArtUrl = steamMetadata.boxArtUrl;
              console.log(`[RefreshAll] Found Steam CDN boxart for ${game.title}: ${steamMetadata.boxArtUrl.substring(0, 80)}...`);
            }
            if (steamMetadata.bannerUrl && !metadata.bannerUrl) {
              metadata.bannerUrl = steamMetadata.bannerUrl;
              console.log(`[RefreshAll] Found Steam CDN banner for ${game.title}: ${steamMetadata.bannerUrl.substring(0, 80)}...`);
            }
            if (steamMetadata.logoUrl && !metadata.logoUrl) {
              metadata.logoUrl = steamMetadata.logoUrl;
              console.log(`[RefreshAll] Found Steam CDN logo for ${game.title}: ${steamMetadata.logoUrl.substring(0, 80)}...`);
            }
          } catch (error) {
            console.warn(`[RefreshAll] Steam CDN search failed for ${game.title}:`, error instanceof Error ? error.message : error);
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
          
          // Use the same search method as manual search (searchImages)
          if (steamGridDBService) {
            try {
              // For non-Steam games, use fuzzy search (try multiple variations)
              let sgdbGames = await steamGridDBService.searchGame(game.title);
              
              // If no results, try fuzzy search variations (for both Steam and non-Steam games)
              if (sgdbGames.length === 0) {
                console.log(`[RefreshAll] No exact match for "${game.title}", trying fuzzy search...`);
                
                // Try variations: remove special characters, try without common words, etc.
                const variations = [
                  game.title.replace(/[^\w\s]/g, '').trim(), // Remove special chars
                  game.title.replace(/\s*(?:edition|pack|dlc|remastered|remaster|definitive|ultimate|gold|platinum|deluxe|collector|special|limited|anniversary|game of the year|goty)\s*/gi, '').trim(), // Remove common edition words
                  game.title.split(' - ')[0].trim(), // Remove subtitle
                  game.title.split(':')[0].trim(), // Remove colon subtitle
                ].filter(v => v.length > 0 && v !== game.title);
                
                // Add Roman numeral conversion for titles like "Final Fantasy VI" -> "Final Fantasy 6"
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
                    variations.push(numericTitle);
                  }
                }
                
                for (const variation of variations) {
                  if (sgdbGames.length > 0) break; // Stop if we found results
                  try {
                    sgdbGames = await steamGridDBService.searchGame(variation);
                    if (sgdbGames.length > 0) {
                      console.log(`[RefreshAll] Found match with variation "${variation}" for "${game.title}"`);
                      break;
                    }
                  } catch (e) {
                    // Continue to next variation
                  }
                }
              }
              
              if (sgdbGames.length > 0) {
                // Use the first game result
                const firstGame = sgdbGames[0];
                console.log(`[RefreshAll] Auto-selected game: ${firstGame.name} (ID: ${firstGame.id}) for "${game.title}"`);
                
                // Get capsules (boxart) from first result
                const capsules = await steamGridDBService.getCapsules(firstGame.id, true);
                
                // Filter and get best image (same logic as manual search)
                const filterImage = (img: any) => !img.nsfw && !img.humor && !img.epilepsy;
                
                const bestCapsule = capsules
                  .filter(filterImage)
                  .filter(img => {
                    // Verify it's actually a vertical grid (portrait orientation)
                    if (img.width && img.height) {
                      const aspectRatio = img.height / img.width;
                      return aspectRatio >= 0.9; // Same filter as manual search
                    }
                    return true; // Include if dimensions missing
                  })
                  .sort((a, b) => b.score - a.score)[0];
                
                if (bestCapsule) {
                  metadata.boxArtUrl = bestCapsule.url;
                  console.log(`[RefreshAll] Auto-selected boxart for ${game.title}: ${bestCapsule.url.substring(0, 80)}...`);
                }
              }
            } catch (error) {
              console.warn(`[RefreshAll] Auto-search failed for ${game.title}:`, error);
            }
          }
          
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
        
        await gameStore.updateGameMetadata(
          game.id,
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
    } else if (providerSource === 'steamgriddb') {
      // Extract SteamGridDB game ID from provider ID (format: "steamgriddb-123")
      const sgdbGameId = parseInt(providerId.replace('steamgriddb-', ''), 10);
      
      if (isNaN(sgdbGameId) || !steamGridDBService) {
        return { success: false, error: 'Invalid SteamGridDB ID or service not available' };
      }
      
      // Get metadata directly from SteamGridDB
      const sgdbMetadata = await steamGridDBService.getGameMetadata(sgdbGameId);
      
      // Also try to get IGDB description if available
      let igdbDescription = null;
      if (igdbService) {
        const igdbResults = await igdbService.searchGame(game.title);
        if (igdbResults.length > 0) {
          // Use the first result's name to get description
          const descriptionResult = await metadataFetcher.searchArtwork(igdbResults[0].name, steamAppId);
          igdbDescription = {
            description: descriptionResult.description,
            summary: descriptionResult.summary,
            releaseDate: descriptionResult.releaseDate,
            genres: descriptionResult.genres,
            developers: descriptionResult.developers,
            publishers: descriptionResult.publishers,
            ageRating: descriptionResult.ageRating,
            rating: descriptionResult.rating,
            platforms: descriptionResult.platforms,
            categories: descriptionResult.categories,
          };
        }
      }
      
      metadata = {
        boxArtUrl: sgdbMetadata.boxArtUrl,
        bannerUrl: sgdbMetadata.bannerUrl,
        logoUrl: sgdbMetadata.logoUrl,
        heroUrl: sgdbMetadata.heroUrl,
        description: igdbDescription?.description,
        summary: igdbDescription?.summary,
        releaseDate: igdbDescription?.releaseDate,
        genres: igdbDescription?.genres,
        developers: igdbDescription?.developers,
        publishers: igdbDescription?.publishers,
        ageRating: igdbDescription?.ageRating,
        rating: igdbDescription?.rating,
        platforms: igdbDescription?.platforms,
        categories: igdbDescription?.categories,
      };
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

// File dialog handler for selecting executable
ipcMain.handle('dialog:showOpenDialog', async () => {
  try {
    // Get the focused window or fall back to the main window
    const targetWindow = BrowserWindow.getFocusedWindow() || win;
    
    // dialog.showOpenDialog can work without a window, but TypeScript types are strict
    // @ts-expect-error - Electron dialog API accepts undefined, but types don't reflect this
    const result = await dialog.showOpenDialog(targetWindow || undefined, {
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
    
    // @ts-expect-error - Electron dialog API accepts undefined, but types don't reflect this
    const result = await dialog.showOpenDialog(targetWindow || undefined, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp'] },
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
        }
        
        // Refresh tray menu to show updated recent games
        if (tray) {
          const contextMenu = await buildTrayContextMenu();
          tray.setContextMenu(contextMenu);
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
    return { success: true };
  } catch (error) {
    console.error('Error setting background scan status:', error);
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

// Background scan function
const performBackgroundScan = async () => {
  try {
    const enabled = await appConfigService.getBackgroundScanEnabled();
    if (!enabled) {
      return;
    }

    console.log('Starting background scan...');
    const configs = await appConfigService.getAppConfigs();
    const enabledConfigs = Object.values(configs).filter((config: any) => config.enabled && config.path);

    for (const config of enabledConfigs) {
      try {
        if (config.id === 'steam') {
          // Check if user is authenticated and auto-add is enabled
          const authState = await steamAuthService.getAuthState();
          if (!authState.authenticated || !config.autoAdd) {
            continue; // Skip if not authenticated or auto-add disabled
          }

          await steamService.setSteamPath(config.path);
          const scannedGames = steamService.scanSteamGames();
          if (scannedGames.length > 0) {
            // Get existing library to find new games
            const existingLibrary = await gameStore.getLibrary();
            const existingSteamIds = new Set(
              existingLibrary
                .filter(g => g.id.startsWith('steam-'))
                .map(g => g.id.replace('steam-', ''))
            );
            
            // Find new games (not in existing library)
            const newGames = scannedGames.filter(g => !existingSteamIds.has(g.appId));
            
            if (newGames.length > 0) {
              // Send notification to renderer about new games
              if (win && !win.isDestroyed()) {
                win.webContents.send('steam:newGamesFound', {
                  count: newGames.length,
                  games: newGames,
                });
              }
              console.log(`Background scan found ${newGames.length} new Steam games, notification sent`);
            }
          }
        } else if (config.id === 'xbox') {
          const games = xboxService.scanGames(config.path);
          if (games.length > 0) {
            // If auto-add is enabled, automatically import new games
            if (config.autoAdd) {
              const xboxGames: Game[] = games.map(xboxGame => ({
                id: xboxGame.id,
                title: xboxGame.name,
                platform: 'xbox' as const,
                exePath: xboxGame.installPath,
                boxArtUrl: '',
                bannerUrl: '',
              }));
              
              for (const game of xboxGames) {
                await gameStore.saveGame(game);
              }
              console.log(`Background scan auto-added ${games.length} Xbox games`);
            } else {
              console.log(`Background scan found ${games.length} Xbox games (auto-add disabled)`);
            }
          }
        }
        // Add other launchers as needed
      } catch (err) {
        console.error(`Error scanning ${config.id} in background:`, err);
      }
    }

    await appConfigService.setLastBackgroundScan(Date.now());
    console.log('Background scan completed');
  } catch (error) {
    console.error('Error in background scan:', error);
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
        exePath: xboxGame.installPath,
        boxArtUrl: '',
        bannerUrl: '',
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
ipcMain.handle('metadata:searchImages', async (_event, query: string, imageType: 'boxart' | 'banner' | 'logo', steamAppId?: string) => {
  try {
    if (!steamGridDBService) {
      return { success: false, error: 'SteamGridDB service not available', images: [] };
    }

    // Search for games on SteamGridDB
    const games = await steamGridDBService.searchGame(query);
    
    if (games.length === 0) {
      return { success: true, images: [] };
    }

    // Fetch images for each game (limit to 10 games)
    const imageResults: Array<{ gameId: number; gameName: string; images: Array<{ url: string; score: number; width: number; height: number; mime?: string; isAnimated?: boolean }> }> = [];
    
    for (const game of games.slice(0, 10)) {
      try {
        let images: Array<{ url: string; score: number; width: number; height: number; mime?: string; isAnimated?: boolean }> = [];
        
        if (imageType === 'boxart') {
          // Get capsules (boxart includes both static and animated)
          const capsules = await steamGridDBService.getCapsules(game.id, true);
          images = capsules
            .filter(img => {
              // Filter out NSFW, humor, epilepsy
              if (img.nsfw || img.humor || img.epilepsy) {
                return false;
              }
              // Verify it's actually a vertical grid (portrait orientation - height > width)
              // Vertical grids should be taller than wide (typical aspect ratio ~2:3 or 3:4)
              // But be more lenient - allow aspect ratio >= 0.9 to catch edge cases
              if (img.width && img.height) {
                const aspectRatio = img.height / img.width;
                // Vertical grids should have aspect ratio > 0.9 (slightly taller than wide or more)
                // This allows for slight variations while still filtering out true landscape images
                if (aspectRatio < 0.9) {
                  return false;
                }
              }
              // If dimensions are missing, include it (better to show than hide)
              return true;
            })
            .map(img => ({
              url: img.url,
              score: img.score,
              width: img.width,
              height: img.height,
              mime: img.mime, // Include mime type to identify animated grids
              isAnimated: img.mime === 'image/webp' || img.mime === 'image/gif' || img.url.includes('.webp') || img.url.includes('.gif'),
            }));
        } else if (imageType === 'banner') {
          const heroes = await steamGridDBService.getHeroes(game.id);
          images = heroes
            .filter(img => !img.nsfw && !img.humor && !img.epilepsy)
            .map(img => ({
              url: img.url,
              score: img.score,
              width: img.width,
              height: img.height,
            }));
        } else if (imageType === 'logo') {
          const logos = await steamGridDBService.getLogos(game.id);
          images = logos
            .filter(img => !img.nsfw && !img.humor && !img.epilepsy)
            .map(img => ({
              url: img.url,
              score: img.score,
              width: img.width,
              height: img.height,
            }));
        }

        if (images.length > 0) {
          imageResults.push({
            gameId: game.id,
            gameName: game.name,
            images: images.sort((a, b) => b.score - a.score), // Sort by score descending
          });
        }
      } catch (err) {
        console.error(`Error fetching ${imageType} for game ${game.id}:`, err);
      }
    }

    return { success: true, images: imageResults };
  } catch (error) {
    console.error('Error in metadata:searchImages handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error', images: [] };
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

ipcMain.handle('api:saveCredentials', async (_event, credentials: { igdbClientId?: string; igdbClientSecret?: string; steamGridDBApiKey?: string }) => {
  try {
    await apiCredentialsService.saveCredentials(credentials);
    // Reinitialize IGDB service with new credentials
    await initializeIGDBService();
    // Reinitialize SteamGridDB service with new API key
    await initializeSteamGridDBService();
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
    // On Windows, we can use the registry or startup folder
    // For now, we'll just store the preference
    // Actual auto-start implementation would require additional setup
    if (process.platform === 'win32') {
      // TODO: Implement Windows registry-based auto-start
      // This would require additional packages or native modules
      console.log('Auto-start settings saved (implementation pending)');
    }
    return { success: true };
  } catch (error) {
    console.error('Error applying startup settings:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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
        const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        
        for (const ext of extensions) {
          const filename = `${safeGameId}-${imageType}${ext}`;
          const filePath = path.join(cacheDir, filename);
          if (existsSync(filePath)) {
            if (count === 1) console.log(`[onyx-local] ✓ Found: ${filename}`);
            const fileData = readFileSync(filePath);
            let mimeType = 'image/jpeg';
            if (ext === '.png') mimeType = 'image/png';
            else if (ext === '.gif') mimeType = 'image/gif';
            else if (ext === '.webp') mimeType = 'image/webp';
            return new Response(fileData, { headers: { 'Content-Type': mimeType } });
          }
        }
        
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
      } else {
        if (count === 1) {
          console.log(`[onyx-local] Could not parse URL: ${urlPath}`);
          console.log(`[onyx-local] Parsed: gameId="${gameId}", imageType="${imageType}"`);
        }
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
                    let selectedFile = matching[0];
                    const pngMatch = matching.find(f => f.endsWith('.png'));
                    const jpgMatch = matching.find(f => f.endsWith('.jpg') || f.endsWith('.jpeg'));
                    if (pngMatch) selectedFile = pngMatch;
                    else if (jpgMatch) selectedFile = jpgMatch;
                    
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
      
      return new Response(fileData, {
        headers: { 'Content-Type': mimeType },
      });
    } catch (error) {
      // Only log errors once per unique URL to avoid spam
      if (!failedUrls.has(requestUrl + '_error')) {
        failedUrls.add(requestUrl + '_error');
        console.error('[onyx-local] Error in protocol handler:', error);
        console.error('[onyx-local] Request URL:', requestUrl.substring(0, 100));
        if (error instanceof Error) {
          console.error('[onyx-local] Error message:', error.message);
        }
      }
      return new Response(null, { status: 500 });
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
    app.setAppUserModelId('com.onyx.launcher');
    
    // Try to set the app icon explicitly (though this is mainly for macOS/Linux)
    // On Windows, the taskbar icon comes from the executable's embedded icon resource
    try {
      let appIconPath: string;
      if (app.isPackaged) {
        const icoPath = path.join(process.resourcesPath, 'icon.ico');
        const pngPath = path.join(process.resourcesPath, 'icon.png');
        appIconPath = existsSync(icoPath) ? icoPath : pngPath;
      } else {
        const icoPath = path.join(__dirname, '../../build/icon.ico');
        const pngPath = path.join(__dirname, '../../resources/icon.png');
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

  createMenu();
  createWindow();
});
