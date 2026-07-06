import { app, Menu, Tray, BrowserWindow, ipcMain, screen, nativeImage } from 'electron';
import path from 'node:path';
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

    private async showOnyxWindow() {
        if (!this.win) {
            await this.createWindow();
            if (!this.win) return;
        }

        if (this.win.isMinimized()) {
            this.win.restore();
        }

        this.win.show();
        this.win.focus();

        this.userPreferencesService.getPreferences()
            .then((prefs) => {
                if (!this.win || this.win.isDestroyed()) return;

                if (prefs.windowState?.isMaximized && !this.win.isMaximized()) {
                    this.win.maximize();
                }

                if (prefs.windowState?.isFullscreen && !this.win.isFullScreen()) {
                    this.win.setFullScreen(true);
                }
            })
            .catch((error) => {
                console.error('[Tray Menu] Failed to apply saved window state after restore:', error);
            });
    }

    private isTrayMenuSender(event: Electron.IpcMainEvent): boolean {
        return !!this.trayMenuWindow
            && !this.trayMenuWindow.isDestroyed()
            && event.sender === this.trayMenuWindow.webContents;
    }

    private registerTrayMenuIpc() {
        ipcMain.on('tray-menu:action', async (event, actionId: string) => {
            if (!this.isTrayMenuSender(event)) return;
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

        ipcMain.on('tray-menu:close', (event) => {
            if (!this.isTrayMenuSender(event)) return;
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
                    const label = game.title.length > 42 ? `${game.title.substring(0, 39)}...` : game.title;
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
                .slice(0, 3);

            const lastInstalledGames = visibleGames
                .filter(game => game.dateAdded)
                .sort((a, b) => new Date(b.dateAdded || 0).getTime() - new Date(a.dateAdded || 0).getTime())
                .slice(0, 3);

            addGameSection('Recently Played', lastPlayedGames);
            addGameSection('Recently Installed', lastInstalledGames);
        } catch (error) {
            console.error('[Tray Menu] Error building tray menu with recent games:', error);
        }

        const showOnyxActionId = this.createActionId('show');
        this.trayMenuActions.set(showOnyxActionId, async () => {
            await this.showOnyxWindow();
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
            440,
            Math.max(
                104,
                8 + menuItems.reduce((total, item) => {
                    if (item.type === 'item') return total + 31;
                    if (item.type === 'header') return total + 20;
                    return total + 6;
                }, 0)
            )
        );
        const width = 328;
        let x = Math.min(
            display.workArea.x + display.workArea.width - width - 8,
            Math.max(display.workArea.x + 8, trayBounds.x - width + trayBounds.width)
        );
        let y = Math.min(
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
                preload: path.join(__dirname, 'trayMenuPreload.js'),
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
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
        border-radius: 8px;
        box-shadow: 0 6px 14px rgba(2, 6, 23, 0.36);
        overflow: hidden;
      }
      .scroll {
        height: 100%;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 3px 0;
      }
      .header {
        color: #94a3b8;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.25px;
        text-transform: uppercase;
        padding: 5px 10px 3px;
      }
      .item {
        width: 100%;
        border: none;
        background: transparent;
        color: #e2e8f0;
        text-align: left;
        font-size: 13px;
        line-height: 1.2;
        font-weight: 600;
        padding: 6px 10px;
        cursor: pointer;
      }
      .item-content {
        display: flex;
        align-items: center;
        gap: 7px;
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
        width: 18px;
        height: 18px;
        border-radius: 4px;
        flex: 0 0 18px;
      }
      .item-icon {
        object-fit: cover;
        background: rgba(15, 23, 42, 0.5);
      }
      .item-fallback {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 9px;
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
        margin: 3px 8px;
        background: rgba(71, 85, 105, 0.6);
      }
      .scroll::-webkit-scrollbar { width: 6px; }
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
        btn.onclick = () => window.trayMenu.sendAction(item.actionId);

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
        if (event.key === 'Escape') window.trayMenu.close();
      });
    </script>
  </body>
</html>`;

        await this.trayMenuWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

        const measuredContentHeight = await this.trayMenuWindow.webContents.executeJavaScript(`(() => {
            const menu = document.querySelector('.menu');
            const scroll = document.getElementById('menu');
            if (!menu || !scroll) return 0;

            const menuStyles = getComputedStyle(menu);
            const scrollStyles = getComputedStyle(scroll);

            const borderTop = parseFloat(menuStyles.borderTopWidth || '0') || 0;
            const borderBottom = parseFloat(menuStyles.borderBottomWidth || '0') || 0;
            const paddingTop = parseFloat(scrollStyles.paddingTop || '0') || 0;
            const paddingBottom = parseFloat(scrollStyles.paddingBottom || '0') || 0;

            let itemsHeight = 0;
            for (const child of Array.from(scroll.children)) {
                const el = child;
                const rect = el.getBoundingClientRect();
                const styles = getComputedStyle(el);
                const marginTop = parseFloat(styles.marginTop || '0') || 0;
                const marginBottom = parseFloat(styles.marginBottom || '0') || 0;
                itemsHeight += rect.height + marginTop + marginBottom;
            }

            return Math.ceil(itemsHeight + paddingTop + paddingBottom + borderTop + borderBottom);
        })();`, true).catch(() => 0);

        if (typeof measuredContentHeight === 'number' && measuredContentHeight > 0) {
            const fittedHeight = Math.min(440, Math.max(104, measuredContentHeight));
            if (fittedHeight !== estimatedHeight) {
                y = Math.min(
                    display.workArea.y + display.workArea.height - fittedHeight - 8,
                    Math.max(display.workArea.y + 8, trayBounds.y - fittedHeight - 4)
                );
                x = Math.min(
                    display.workArea.x + display.workArea.width - width - 8,
                    Math.max(display.workArea.x + 8, trayBounds.x - width + trayBounds.width)
                );

                this.trayMenuWindow.setBounds({ x, y, width, height: fittedHeight });
            }
        }

        this.trayMenuWindow.showInactive();
        this.trayMenuWindow.focus();
    }

    async buildTrayContextMenu(): Promise<Menu> {
        const menuItems: Electron.MenuItemConstructorOptions[] = [];

        try {
            const games = await this.gameStore.getLibrary();
            const visibleGames = games.filter(game => !game.hidden);

            // Get last 3 played games
            const lastPlayedGames = visibleGames
                .filter(game => game.lastPlayed)
                .sort((a, b) => {
                    const dateA = new Date(a.lastPlayed || 0).getTime();
                    const dateB = new Date(b.lastPlayed || 0).getTime();
                    return dateB - dateA;
                })
                .slice(0, 3);

            // Get last 3 installed games (by dateAdded)
            const lastInstalledGames = visibleGames
                .filter(game => game.dateAdded)
                .sort((a, b) => {
                    const dateA = new Date(a.dateAdded || 0).getTime();
                    const dateB = new Date(b.dateAdded || 0).getTime();
                    return dateB - dateA;
                })
                .slice(0, 3);

            // Add "Recently Played" section
            if (lastPlayedGames.length > 0) {
                menuItems.push({
                    label: 'Recently Played',
                    enabled: false
                });

                lastPlayedGames.forEach((game) => {
                    const label = game.title.length > 42 ? game.title.substring(0, 39) + '...' : game.title;
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
                    const label = game.title.length > 42 ? game.title.substring(0, 39) + '...' : game.title;
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
                click: async () => {
                    await this.showOnyxWindow();
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
            if (result === 'ok') {
                console.log(`[Jump List] Updated with ${lastPlayedGames.length} recently played and ${lastInstalledGames.length} recently installed games`);
            } else {
                console.error('[Jump List] Error setting jump list:', result);
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
                    click: async () => {
                        await this.showOnyxWindow();
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

