import { app, Menu, Tray, BrowserWindow } from 'electron';
import { GameStore, Game } from '../GameStore.js';
import { LauncherService } from '../LauncherService.js';
import { UserPreferencesService } from '../UserPreferencesService.js';

export class TrayService {
    private tray: Tray | null = null;
    private win: BrowserWindow | null = null;
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
    }

    setWindow(win: BrowserWindow | null) {
        this.win = win;
    }

    setTray(tray: Tray | null) {
        this.tray = tray;
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
            if (this.tray) {
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
            this.tray?.setContextMenu(fallbackMenu);
        }
    }
}

