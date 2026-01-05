import { app, BrowserWindow, ipcMain, dialog, Menu, protocol, Tray, nativeImage, shell } from 'electron';
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

// Load environment variables
dotenv.config();

// In CommonJS, __filename and __dirname are available as globals
declare const __filename: string;
declare const __dirname: string;

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
  
  // Also update on context-menu event (alternative for some platforms)
  tray.on('context-menu', () => {
    console.log('[Tray Menu] Context-menu event detected, refreshing menu...');
    updateTrayMenu();
  });
  
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

// Initialize IGDB service if credentials are available
let igdbService: IGDBService | null = null;
let steamGridDBService: import('./SteamGridDBService.js').SteamGridDBService | null = null;

// Function to initialize IGDB service with credentials
const initializeIGDBService = async () => {
  try {
    // First check stored credentials, then fall back to environment variables
    const storedCreds = await apiCredentialsService.getCredentials();
    const igdbClientId = storedCreds.igdbClientId || process.env.IGDB_CLIENT_ID;
    const igdbClientSecret = storedCreds.igdbClientSecret || process.env.IGDB_CLIENT_SECRET;
    
    if (igdbClientId && igdbClientSecret) {
      try {
        igdbService = new IGDBService(igdbClientId, igdbClientSecret);
        console.log('IGDB service initialized');
        return true;
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
    return await gameStore.getLibrary();
  } catch (error) {
    console.error('Error in gameStore:getLibrary handler:', error);
    return [];
  }
});

ipcMain.handle('gameStore:saveGame', async (_event, game: Game) => {
  try {
    await gameStore.saveGame(game);
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

// Reset app handler - clears all data
ipcMain.handle('app:reset', async () => {
  try {
    // Clear all stores
    await gameStore.clearLibrary();
    await userPreferencesService.resetPreferences();
    await appConfigService.clearAppConfigs();
    await apiCredentialsService.clearCredentials();
    
    // Reinitialize IGDB service (will be null since credentials are cleared)
    await initializeIGDBService();
    
    return { success: true };
  } catch (error) {
    console.error('Error in app:reset handler:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

// Metadata fetcher IPC handlers
ipcMain.handle('metadata:searchArtwork', async (_event, title: string, steamAppId?: string) => {
  try {
    const metadata = await metadataFetcher.searchArtwork(title, steamAppId);
    return metadata;
  } catch (error) {
    console.error('Error in metadata:searchArtwork handler:', error);
    return null;
  }
});

ipcMain.handle('metadata:fetchAndUpdate', async (_event, gameId: string, title: string) => {
  try {
    // Extract Steam App ID if it's a Steam game
    const steamAppId = gameId.startsWith('steam-') ? gameId.replace('steam-', '') : undefined;
    const metadata = await metadataFetcher.searchArtwork(title, steamAppId);
    
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
    // Create IGDB service with new config
    igdbService = new IGDBService(config.clientId, config.accessToken);
    updateMetadataFetcher();
    return true;
  } catch (error) {
    console.error('Error in metadata:setIGDBConfig handler:', error);
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
    
    const results = await igdbService.searchGame(gameTitle);
    
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
              sgdbGames = await sgdbService.searchGame(result.name);
            } catch (err) {
              console.debug(`[Logo Search] Strategy 1 failed for "${result.name}":`, err);
            }
            
            // Strategy 2: If no results, try the original search query
            if (sgdbGames.length === 0 && gameTitle !== result.name) {
              try {
                sgdbGames = await sgdbService.searchGame(gameTitle);
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
                  sgdbGames = await sgdbService.searchGame(simplifiedName);
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
              
              const logos = await sgdbService.getLogos(gameId);
              
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
          lowerName === 'gamelaunchhelper' ||
          lowerName === 'bootstrapper') {
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
              // Skip common system directories that are unlikely to contain games
              const dirName = entry.name.toLowerCase();
              if (dirName !== 'node_modules' && 
                  dirName !== '.git' && 
                  !dirName.startsWith('$') &&
                  dirName !== 'system volume information' &&
                  dirName !== 'recycle.bin') {
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

ipcMain.handle('appConfig:save', async (_event, config: { id: string; name: string; enabled: boolean; path: string }) => {
  try {
    await appConfigService.saveAppConfig(config);
    return { success: true };
  } catch (error) {
    console.error('Error saving app config:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
});

ipcMain.handle('appConfig:saveAll', async (_event, configs: Array<{ id: string; name: string; enabled: boolean; path: string }>) => {
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
          await steamService.setSteamPath(config.path);
          const games = steamService.scanSteamGames();
          if (games.length > 0) {
            // Check for new games and notify user (could send IPC message to renderer)
            console.log(`Background scan found ${games.length} Steam games`);
          }
        } else if (config.id === 'xbox') {
          const games = xboxService.scanGames(config.path);
          if (games.length > 0) {
            console.log(`Background scan found ${games.length} Xbox games`);
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
    const imageResults: Array<{ gameId: number; gameName: string; images: Array<{ url: string; score: number; width: number; height: number }> }> = [];
    
    for (const game of games.slice(0, 10)) {
      try {
        let images: Array<{ url: string; score: number; width: number; height: number }> = [];
        
        if (imageType === 'boxart') {
          const verticalGrids = await steamGridDBService.getVerticalGrids(game.id);
          images = verticalGrids
            .filter(img => !img.nsfw && !img.humor && !img.epilepsy)
            .map(img => ({
              url: img.url,
              score: img.score,
              width: img.width,
              height: img.height,
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

  // Register a custom protocol to serve local files
  protocol.registerFileProtocol('onyx-local', (request, callback) => {
    const filePath = request.url.replace('onyx-local://', '');
    // Decode the path (it's URL encoded)
    const decodedPath = decodeURIComponent(filePath);
    // Remove leading slash if present
    const cleanPath = decodedPath.startsWith('/') ? decodedPath.slice(1) : decodedPath;
    // On Windows, ensure drive letter is preserved
    const finalPath = cleanPath.replace(/\//g, path.sep);
    callback({ path: finalPath });
  });

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
