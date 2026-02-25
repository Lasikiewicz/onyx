import { app, Menu, Tray, BrowserWindow, ipcMain, screen, nativeImage } from 'electron';
import path from 'node:path';
import { existsSync, statSync } from 'node:fs';
import { GameStore, Game } from '../GameStore.js';
import { LauncherService } from '../LauncherService.js';
import { UserPreferencesService } from '../UserPreferencesService.js';

export class TrayService {
    private tray: Tray | null = null;
    private win: BrowserWindow | null = null;
    private trayMenuWindow: BrowserWindow | null = null;
    private trayMenuActions = new Map<string, () => void | Promise<void>>();
    private gameStore: GameStore;
    private launcherService: LauncherService;
    private userPreferencesService: UserPreferencesService;
    private createWindow: () => Promise<void>;

    constructor(
        gameStore: GameStore,
        launcherService: LauncherService,
        userPreferencesService: UserPreferencesService,
        createWindow: () => Promise<void>
    ) {
        this.gameStore = gameStore;
        this.launcherService = launcherService;
        this.userPreferencesService = userPreferencesService;
        this.createWindow = createWindow;
        this.registerTrayMenuIpc();
    }

    setWindow(win: BrowserWindow | null) {
        this.win = win;
    }

    setTray(tray: Tray | null) {
        this.tray = tray;
    }

    public hasTray(): boolean {
        return this.tray !== null;
    }

    public init(): void {
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
            // Note: On Windows, ICO files contain multiple sizes, so we might not need to resize
            if (process.platform === 'win32' && iconPath.endsWith('.ico')) {
                // For ICO files on Windows, use directly without resize (ICO contains multiple sizes)
                this.tray = new Tray(icon);
            } else {
                const size = process.platform === 'darwin' ? 22 : (process.platform === 'win32' ? 32 : 16);
                const resizedIcon = icon.resize({ width: size, height: size, quality: 'best' });

                // Verify resized icon is not empty
                if (resizedIcon.isEmpty()) {
                    console.error('Resized icon is empty, trying without resize...');
                    // Try using the original icon without resize
                    if (!icon.isEmpty()) {
                        this.tray = new Tray(icon);
                    } else {
                        throw new Error('Resized icon is empty');
                    }
                } else {
                    this.tray = new Tray(resizedIcon);
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
                            this.tray = new Tray(smallIcon);
                            console.log('Fallback tray icon created successfully');
                        } else {
                            this.tray = new Tray(icon);
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
                this.tray = new Tray(icon);
                console.error('WARNING: Tray icon is empty. Please ensure icon.png exists in resources/');
            }
        }

        if (this.tray) {
            this.tray.setToolTip('Onyx');
            this.updateTrayMenu();

            // Update context menu on right-click to refresh recent games
            this.tray.on('right-click', () => {
                console.log('[Tray Menu] Right-click detected, refreshing menu...');
                if (process.platform === 'win32') {
                    this.showCustomTrayMenu().catch((err) => {
                        console.error('[Tray Menu] Failed to show custom tray menu:', err);
                        this.updateTrayMenu();
                    });
                    return;
                }
                this.updateTrayMenu();
            });

            this.tray.on('click', () => {
                if (this.win) {
                    if (this.win.isVisible()) {
                        this.win.hide();
                    } else {
                        this.win.show();
                        this.win.focus();
                    }
                } else {
                    this.createWindow();
                }
            });
        }
    }

    public destroy(): void {
        if (this.tray) {
            this.tray.destroy();
            this.tray = null;
        }
    }

    private registerTrayMenuIpc() {
        ipcMain.on('tray-menu:action', async (_event, actionId: string) => {
            const action = this.trayMenuActions.get(actionId);
            if (!action) return;
            try {
                await action();
            } catch (error) {
                console.error('[Tray Menu] Error running custom tray action:', error);
            } finally {
                this.closeCustomTrayMenu();
            }
        });

        ipcMain.on('tray-menu:close', () => {
            this.closeCustomTrayMenu();
        });
    }

    private closeCustomTrayMenu() {
        if (this.trayMenuWindow && !this.trayMenuWindow.isDestroyed()) {
            this.trayMenuWindow.close();
        }
        this.trayMenuWindow = null;
    }

    private createActionId(prefix: string): string {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    private getTrayGameIcon(game: Game): string | undefined {
        const candidateUrl = game.iconUrl?.trim() || game.logoUrl?.trim();
        if (candidateUrl) {
            return candidateUrl;
        }

        const exePath = game.exePath?.trim();
        if (!exePath) return undefined;

        try {
            const icon = nativeImage.createFromPath(exePath);
            if (!icon.isEmpty()) {
                return icon.resize({ width: 22, height: 22, quality: 'best' }).toDataURL();
            }
        } catch (error) {
            console.debug('[Tray Menu] Could not resolve executable icon:', error);
        }

        return undefined;
    }

    private async buildTrayMenuData() {
        const menuItems: Array<{
            type: 'header' | 'item' | 'separator';
            label?: string;
            actionId?: string;
            iconUrl?: string;
            isGame?: boolean;
        }> = [];
        this.trayMenuActions.clear();

        try {
            const games = await this.gameStore.getLibrary();
            const visibleGames = games.filter(game => !game.hidden);

            const launchGameFromTray = async (game: Game) => {
                try {
                    await this.launcherService.launchGame(game.id);
                    const prefs = await this.userPreferencesService.getPreferences();
                    if (prefs.minimizeOnGameLaunch && this.win) {
                        this.win.minimize();
                    }
                } catch (error) {
                    console.error('Error launching game from tray:', error);
                }
            };

            const addGameSection = (title: string, source: Game[]) => {
                if (source.length === 0) return;

                menuItems.push({ type: 'header', label: title });
                source.forEach((game) => {
                    const label = game.title.length > 50 ? `${game.title.substring(0, 47)}...` : game.title;
                    const actionId = this.createActionId('launch');
                    this.trayMenuActions.set(actionId, async () => {
                        await launchGameFromTray(game);
                    });
                    menuItems.push({
                        type: 'item',
                        label,
                        actionId,
                        iconUrl: this.getTrayGameIcon(game),
                        isGame: true,
                    });
                });
                menuItems.push({ type: 'separator' });
            };

            const lastPlayedGames = visibleGames
                .filter(game => game.lastPlayed)
                .sort((a, b) => new Date(b.lastPlayed || 0).getTime() - new Date(a.lastPlayed || 0).getTime())
                .slice(0, 5);

            const lastInstalledGames = visibleGames
                .filter(game => game.dateAdded)
                .sort((a, b) => new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime())
                .slice(0, 5);

            addGameSection('Recently Played', lastPlayedGames);
            addGameSection('Recently Installed', lastInstalledGames);
        } catch (error) {
            console.error('[Tray Menu] Error building tray menu with recent games:', error);
        }

        const showOnyxActionId = this.createActionId('show');
        this.trayMenuActions.set(showOnyxActionId, () => {
            if (this.win) {
                this.win.show();
                this.win.focus();
            } else {
                this.createWindow();
            }
        });

        const exitActionId = this.createActionId('exit');
        this.trayMenuActions.set(exitActionId, () => {
            app.quit();
        });

        menuItems.push(
            { type: 'item', label: 'Show Onyx', actionId: showOnyxActionId },
            { type: 'item', label: 'Exit', actionId: exitActionId }
        );

        // Remove trailing separator if present
        while (menuItems.length > 0 && menuItems[menuItems.length - 1].type === 'separator') {
            menuItems.pop();
        }

        return menuItems;
    }

    async showCustomTrayMenu() {
        if (!this.tray) return;

        const menuItems = await this.buildTrayMenuData();
        this.closeCustomTrayMenu();

        const trayBounds = this.tray.getBounds();
        const display = screen.getDisplayNearestPoint({
            x: Math.max(0, trayBounds.x),
            y: Math.max(0, trayBounds.y),
        });

        const estimatedHeight = Math.min(
            620,
            Math.max(
                240,
                16 + menuItems.reduce((total, item) => {
                    if (item.type === 'item') return total + 46;
                    if (item.type === 'header') return total + 30;
                    return total + 12;
                }, 0)
            )
        );
        const width = 364;
        const x = Math.min(
            display.workArea.x + display.workArea.width - width - 8,
            Math.max(display.workArea.x + 8, trayBounds.x - width + trayBounds.width)
        );
        const y = Math.min(
            display.workArea.y + display.workArea.height - estimatedHeight - 8,
            Math.max(display.workArea.y + 8, trayBounds.y - estimatedHeight - 4)
        );

        this.trayMenuWindow = new BrowserWindow({
            width,
            height: estimatedHeight,
            x,
            y,
            frame: false,
            resizable: false,
            movable: false,
            minimizable: false,
            maximizable: false,
            fullscreenable: false,
            skipTaskbar: true,
            alwaysOnTop: true,
            show: false,
            hasShadow: false,
            transparent: true,
            backgroundColor: '#00000000',
            roundedCorners: true,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                devTools: false,
            },
        });

        this.trayMenuWindow.on('blur', () => this.closeCustomTrayMenu());
        this.trayMenuWindow.on('closed', () => {
            this.trayMenuWindow = null;
        });

        const itemsJson = JSON.stringify(menuItems).replace(/</g, '\\u003c');
        const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      :root { color-scheme: dark; }
      html, body {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 0;
        background: transparent;
        font-family: "Segoe UI", Inter, system-ui, sans-serif;
      }
      .menu {
        height: 100%;
        background: #0f172a;
        border: 1px solid rgba(71, 85, 105, 0.7);
        border-radius: 10px;
        box-shadow: 0 8px 18px rgba(2, 6, 23, 0.4);
        overflow: hidden;
      }
      .scroll {
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 6px 0;
      }
      .header {
        color: #94a3b8;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.25px;
        text-transform: uppercase;
        padding: 8px 14px 6px;
      }
      .item {
        width: 100%;
        border: none;
        background: transparent;
        color: #e2e8f0;
        text-align: left;
        font-size: 15px;
        line-height: 1.35;
        font-weight: 600;
        padding: 10px 14px;
        cursor: pointer;
      }
      .item-content {
        display: flex;
        align-items: center;
        gap: 11px;
        min-width: 0;
      }
      .item-label {
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .item-icon,
      .item-fallback {
        width: 22px;
        height: 22px;
        border-radius: 4px;
        flex: 0 0 22px;
      }
      .item-icon {
        object-fit: cover;
        background: rgba(15, 23, 42, 0.5);
      }
      .item-fallback {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: 700;
        color: #cbd5e1;
        background: rgba(51, 65, 85, 0.9);
      }
      .item:hover {
        background: rgba(51, 65, 85, 0.6);
      }
      .item:focus {
        outline: none;
        background: rgba(51, 65, 85, 0.75);
      }
      .separator {
        height: 1px;
        margin: 7px 10px;
        background: rgba(71, 85, 105, 0.6);
      }
      .scroll::-webkit-scrollbar { width: 8px; }
      .scroll::-webkit-scrollbar-track { background: transparent; }
      .scroll::-webkit-scrollbar-thumb { background: rgba(100, 116, 139, 0.7); border-radius: 8px; }
      .scroll::-webkit-scrollbar-thumb:hover { background: rgba(148, 163, 184, 0.85); }
    </style>
  </head>
  <body>
    <div class="menu">
      <div class="scroll" id="menu"></div>
    </div>
    <script>
      const { ipcRenderer } = require('electron');
      const menuItems = ${itemsJson};
      const menu = document.getElementById('menu');

      for (const item of menuItems) {
        if (item.type === 'separator') {
          const sep = document.createElement('div');
          sep.className = 'separator';
          menu.appendChild(sep);
          continue;
        }

        if (item.type === 'header') {
          const h = document.createElement('div');
          h.className = 'header';
          h.textContent = item.label || '';
          menu.appendChild(h);
          continue;
        }

        const btn = document.createElement('button');
        btn.className = 'item';
        btn.onclick = () => ipcRenderer.send('tray-menu:action', item.actionId);

        const content = document.createElement('span');
        content.className = 'item-content';

        if (item.isGame) {
          if (item.iconUrl) {
            const icon = document.createElement('img');
            icon.className = 'item-icon';
            icon.src = item.iconUrl;
            icon.alt = '';
            icon.onerror = () => {
              icon.style.display = 'none';
            };
            content.appendChild(icon);
          } else {
            const fallback = document.createElement('span');
            fallback.className = 'item-fallback';
            fallback.textContent = (item.label || '?').trim().charAt(0).toUpperCase() || '?';
            content.appendChild(fallback);
          }
        }

        const label = document.createElement('span');
        label.className = 'item-label';
        label.textContent = item.label || '';
        content.appendChild(label);

        btn.appendChild(content);
        menu.appendChild(btn);
      }

      window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') ipcRenderer.send('tray-menu:close');
      });
    </script>
  </body>
</html>`;

        await this.trayMenuWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
        this.trayMenuWindow.showInactive();
        this.trayMenuWindow.focus();
    }

    async buildTrayContextMenu(): Promise<Menu> {
        const menuItems: Electron.MenuItemConstructorOptions[] = [];

        try {
            const games = await this.gameStore.getLibrary();
            const visibleGames = games.filter(game => !game.hidden);

            // Get last 5 played games
            const lastPlayedGames = visibleGames
                .filter(game => game.lastPlayed)
                .sort((a, b) => {
                    const dateA = new Date(a.lastPlayed || 0).getTime();
                    const dateB = new Date(b.lastPlayed || 0).getTime();
                    return dateB - dateA;
                })
                .slice(0, 5);

            // Get last 5 installed games (by dateAdded)
            const lastInstalledGames = visibleGames
                .filter(game => game.dateAdded)
                .sort((a, b) => {
                    const dateA = new Date(a.dateAdded || 0).getTime();
                    const dateB = new Date(b.dateAdded || 0).getTime();
                    return dateB - dateA;
                })
                .slice(0, 5);

            // Add "Recently Played" section
            if (lastPlayedGames.length > 0) {
                menuItems.push({
                    label: 'Recently Played',
                    enabled: false
                });

                lastPlayedGames.forEach((game) => {
                    const label = game.title.length > 50 ? game.title.substring(0, 47) + '...' : game.title;
                    menuItems.push({
                        label: '  ' + label, // Indent with spaces
                        click: async () => {
                            try {
                                await this.launcherService.launchGame(game.id);
                                const prefs = await this.userPreferencesService.getPreferences();
                                if (prefs.minimizeOnGameLaunch && this.win) {
                                    this.win.minimize();
                                }
                            } catch (error) {
                                console.error('Error launching game from tray:', error);
                            }
                        },
                    });
                });
                menuItems.push({ type: 'separator' });
            }

            // Add "Recently Installed" section
            if (lastInstalledGames.length > 0) {
                menuItems.push({
                    label: 'Recently Installed',
                    enabled: false
                });

                lastInstalledGames.forEach((game) => {
                    const label = game.title.length > 50 ? game.title.substring(0, 47) + '...' : game.title;
                    menuItems.push({
                        label: '  ' + label, // Indent with spaces
                        click: async () => {
                            try {
                                await this.launcherService.launchGame(game.id);
                                const prefs = await this.userPreferencesService.getPreferences();
                                if (prefs.minimizeOnGameLaunch && this.win) {
                                    this.win.minimize();
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

        menuItems.push(
            {
                label: 'Show Onyx',
                click: () => {
                    if (this.win) {
                        this.win.show();
                        this.win.focus();
                    } else {
                        this.createWindow();
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

    async updateJumpList() {
        // Only update jump list on Windows
        if (process.platform !== 'win32') {
            return;
        }

        try {
            const games = await this.gameStore.getLibrary();
            const visibleGames = games.filter(game => !game.hidden);

            // Get last 5 played games
            const lastPlayedGames = visibleGames
                .filter(game => game.lastPlayed)
                .sort((a, b) => {
                    const dateA = new Date(a.lastPlayed || 0).getTime();
                    const dateB = new Date(b.lastPlayed || 0).getTime();
                    return dateB - dateA;
                })
                .slice(0, 5);

            // Get last 5 installed games (by dateAdded)
            const lastInstalledGames = visibleGames
                .filter(game => game.dateAdded)
                .sort((a, b) => {
                    const dateA = new Date(a.dateAdded || 0).getTime();
                    const dateB = new Date(b.dateAdded || 0).getTime();
                    return dateB - dateA;
                })
                .slice(0, 5);

            const categories: Electron.JumpListCategory[] = [];

            // Add "Recently Played" category
            if (lastPlayedGames.length > 0) {
                categories.push({
                    type: 'custom',
                    name: 'Recently Played',
                    items: lastPlayedGames.map(game => {
                        // Use game's exe icon if available, otherwise use Electron icon
                        const iconPath = game.exePath && game.exePath.trim() !== ''
                            ? game.exePath
                            : process.execPath;

                        return {
                            type: 'task',
                            title: game.title.length > 50 ? game.title.substring(0, 47) + '...' : game.title,
                            description: `Launch ${game.title}`,
                            program: process.execPath,
                            args: `--launch-game="${game.id}"`,
                            iconPath: iconPath,
                            iconIndex: 0
                        };
                    })
                });
            }

            // Add "Recently Installed" category
            if (lastInstalledGames.length > 0) {
                categories.push({
                    type: 'custom',
                    name: 'Recently Installed',
                    items: lastInstalledGames.map(game => {
                        // Use game's exe icon if available, otherwise use Electron icon
                        const iconPath = game.exePath && game.exePath.trim() !== ''
                            ? game.exePath
                            : process.execPath;

                        return {
                            type: 'task',
                            title: game.title.length > 50 ? game.title.substring(0, 47) + '...' : game.title,
                            description: `Launch ${game.title}`,
                            program: process.execPath,
                            args: `--launch-game="${game.id}"`,
                            iconPath: iconPath,
                            iconIndex: 0
                        };
                    })
                });
            }

            // Set the jump list
            const result = app.setJumpList(categories);
            if (result !== null) {
                console.error('[Jump List] Error setting jump list:', result);
            } else {
                console.log(`[Jump List] Updated with ${lastPlayedGames.length} recently played and ${lastInstalledGames.length} recently installed games`);
            }
        } catch (error) {
            console.error('[Jump List] Error updating jump list:', error);
        }
    }

    async updateTrayMenu() {
        try {
            const contextMenu = await this.buildTrayContextMenu();
            if (this.tray && process.platform !== 'win32') {
                this.tray.setContextMenu(contextMenu);
            }

            // Also update jump list on Windows
            await this.updateJumpList();
        } catch (error) {
            console.error('[Tray Menu] Error updating context menu:', error);
            const fallbackMenu = Menu.buildFromTemplate([
                {
                    label: 'Show Onyx',
                    click: () => {
                        if (this.win) {
                            this.win.show();
                            this.win.focus();
                        } else {
                            this.createWindow();
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
            if (process.platform !== 'win32') {
                this.tray?.setContextMenu(fallbackMenu);
            }
        }
    }
}
