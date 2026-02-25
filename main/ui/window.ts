import { BrowserWindow, app, nativeImage, shell, screen } from 'electron';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { UserPreferencesService, type UserPreferences } from '../UserPreferencesService.js';
import { TrayService } from './tray.js';

export async function createMainWindow(
  userPreferencesService: UserPreferencesService,
  trayService: TrayService | null
): Promise<BrowserWindow> {
  let win: BrowserWindow | null = null;
  const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
  // Preload is in dist-electron/preload.js, this file is dist-electron/ui/window.js
  const preload = path.join(__dirname, '../preload.js');

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
  let windowState: { x?: number; y?: number; width?: number; height?: number; isMaximized?: boolean; isFullscreen?: boolean } | undefined;
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

  // Restore maximized state if previously maximized (for non-first-launch)
  if (!isFirstLaunch && windowState?.isMaximized) {
    win.maximize();
  }

  // Restore fullscreen state if previously in fullscreen (for non-first-launch)
  if (!isFirstLaunch && windowState?.isFullscreen) {
    win.setFullScreen(true);
  }

  // Apply startInFullscreen preference if enabled
  try {
    const prefs = await userPreferencesService.getPreferences();
    if (prefs.startInFullscreen && !win.isFullScreen()) {
      win.setFullScreen(true);
    }
  } catch (error) {
    console.error('Error applying startInFullscreen preference:', error);
  }

  // Handle first launch: Maximize and set resolution-optimized defaults
  if (isFirstLaunch) {
    console.log('[First Launch] Detecting resolution and applying optimized defaults...');
    // screen is imported from electron
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
  }
  if (trayService) trayService.setWindow(win);

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
        const isFullscreen = win!.isFullScreen();

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
    }, 500); // Debounce for 500ms
  };

  win.on('move', saveWindowState);
  win.on('resize', saveWindowState);
  win.on('maximize', saveWindowState);
  win.on('unmaximize', saveWindowState);
  win.on('enter-full-screen', saveWindowState);
  win.on('leave-full-screen', saveWindowState);

  // Notify renderer of fullscreen state changes
  win.on('enter-full-screen', () => {
    win?.webContents.send('fullscreen-changed', true);
  });
  win.on('leave-full-screen', () => {
    win?.webContents.send('fullscreen-changed', false);
  });

  // Handle window close based on preferences
  win.on('close', async (event) => {
    try {
      // Save window state before closing
      if (win) {
        const bounds = win.getBounds();
        const isMaximized = win.isMaximized();
        const isFullscreen = win.isFullScreen();

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
      // Also respect a one-off --hidden CLI flag (used by Windows "start minimized"/login items)
      const hasHiddenFlag = process.argv.includes('--hidden');
      const shouldStartHidden = prefs.startClosedToTray || prefs.startMinimized || hasHiddenFlag;

      if (!shouldStartHidden) {
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
    // In packaged: __dirname = app.asar/dist-electron/ui/window.js, so ../../dist/index.html = app.asar/dist/index.html
    // In dev: __dirname = dist-electron/ui/window.js, so ../../dist/index.html = dist/index.html
    indexPath = path.join(__dirname, '../../dist/index.html');
    console.log('Loading index.html from:', indexPath);
    console.log('__dirname:', __dirname);
    console.log('app.isPackaged:', app.isPackaged);
    if (app.isPackaged) {
      console.log('app.getAppPath():', app.getAppPath());
    }

    // Try to load the file
    if (!win) {
      console.error('Window is null, cannot load file');
      return win!;
    }

    // Use loadFile which handles ASAR paths correctly
    try {
      console.log('Attempting to load with loadFile():', indexPath);
      win.loadFile(indexPath).catch((error) => {
        console.error('Error loading file with loadFile():', error);
        if (!win) return;

        // Try alternative paths
        const altPaths = app.isPackaged ? [
          path.join(__dirname, '../../dist/index.html'),
          path.join(app.getAppPath(), 'dist', 'index.html'),
          path.join(process.resourcesPath, 'app.asar', 'dist', 'index.html')
        ] : [
          path.join(__dirname, '../../dist/index.html'),
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
  }

  return win;
}
