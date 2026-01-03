import { app, BrowserWindow, ipcMain, dialog, Menu, protocol, Tray, nativeImage, shell } from 'electron';
import path from 'node:path';
import { readdirSync, statSync, existsSync } from 'node:fs';
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
    
    // Load the icon
    icon = nativeImage.createFromPath(iconPath);
    
    // Check if icon is empty (common issue with SVG on Windows)
    if (icon.isEmpty()) {
      console.error('Icon loaded but is empty, trying fallback...');
      throw new Error('Icon loaded but is empty');
    }
    
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

  const contextMenu = Menu.buildFromTemplate([
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

  tray.setToolTip('Onyx');
  tray.setContextMenu(contextMenu);
  
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
    // DevTools can be opened manually with Ctrl+Shift+I or F12
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
const metadataFetcher = new MetadataFetcherService(true); // Start with mock mode enabled
const launcherService = new LauncherService(gameStore);

// Initialize IGDB service if credentials are available
let igdbService: IGDBService | null = null;

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

// Initialize on startup (wrapped in IIFE to handle async)
(async () => {
  await initializeIGDBService();
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
    const success = await gameStore.updateGameMetadata(gameId, metadata.boxArtUrl, metadata.bannerUrl);
    return { success, metadata };
  } catch (error) {
    console.error('Error in metadata:fetchAndUpdate handler:', error);
    return { success: false, metadata: null };
  }
});

ipcMain.handle('metadata:setIGDBConfig', async (_event, config: IGDBConfig) => {
  try {
    metadataFetcher.setIGDBConfig(config);
    return true;
  } catch (error) {
    console.error('Error in metadata:setIGDBConfig handler:', error);
    return false;
  }
});

ipcMain.handle('metadata:setMockMode', async (_event, enabled: boolean) => {
  try {
    metadataFetcher.setMockMode(enabled);
    return true;
  } catch (error) {
    console.error('Error in metadata:setMockMode handler:', error);
    return false;
  }
});

// IGDB search metadata handler
ipcMain.handle('metadata:searchMetadata', async (_event, gameTitle: string) => {
  try {
    if (!igdbService) {
      return { success: false, error: 'IGDB service not configured. Please configure your API credentials in Settings > APIs.', results: [] };
    }
    
    const results = await igdbService.searchGame(gameTitle);
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
    ];
    
    const shouldExclude = (fileName: string): boolean => {
      const lowerName = fileName.toLowerCase();
      return excludePatterns.some(pattern => pattern.test(lowerName));
    };
    
    const scanDirectory = (dirPath: string, depth: number, maxDepth: number = 3): void => {
      if (depth > maxDepth) return;
      
      try {
        const entries = readdirSync(dirPath);
        
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry);
          
          try {
            const stats = statSync(fullPath);
            
            if (stats.isFile() && entry.toLowerCase().endsWith('.exe')) {
              // Exclude common non-game executables
              if (!shouldExclude(entry)) {
                executables.push({
                  fileName: entry,
                  fullPath: fullPath,
                });
              }
            } else if (stats.isDirectory() && depth < maxDepth) {
              // Recursively scan subdirectories
              scanDirectory(fullPath, depth + 1, maxDepth);
            }
          } catch (err) {
            // Skip files/directories we can't access
            continue;
          }
        }
      } catch (err) {
        console.error(`Error scanning directory ${dirPath}:`, err);
      }
    };
    
    scanDirectory(folderPath, 0);
    
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
      await gameStore.mergeSteamGames(steamGames);
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

ipcMain.handle('preferences:save', async (_event, preferences: { gridSize?: number; panelWidth?: number; fanartHeight?: number; descriptionHeight?: number; pinnedCategories?: string[]; minimizeToTray?: boolean; showSystemTrayIcon?: boolean; startWithComputer?: boolean; startClosedToTray?: boolean; updateLibrariesOnStartup?: boolean; activeGameId?: string | null; hideVRTitles?: boolean; hideGameTitles?: boolean; gameTilePadding?: number; windowState?: { x?: number; y?: number; width?: number; height?: number; isMaximized?: boolean } }) => {
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

ipcMain.handle('api:saveCredentials', async (_event, credentials: { igdbClientId?: string; igdbClientSecret?: string }) => {
  try {
    await apiCredentialsService.saveCredentials(credentials);
    // Reinitialize IGDB service with new credentials
    await initializeIGDBService();
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

app.whenReady().then(async () => {
  // Note: On Windows, the taskbar icon comes from the executable's icon resource (set via electron-builder)
  // The window icon is set in createWindow() via BrowserWindow's icon property
  // app.setIcon() is only available on macOS/Linux, so we don't use it here

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
