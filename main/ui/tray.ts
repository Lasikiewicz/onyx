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
            const gamesWithLastPlayed = visibleGames.filter(game => game.lastPlayed);

            let gamesToShow: Game[] = [];

            if (gamesWithLastPlayed.length > 0) {
                gamesToShow = gamesWithLastPlayed
                    .sort((a, b) => {
                        const dateA = new Date(a.lastPlayed || 0).getTime();
                        const dateB = new Date(b.lastPlayed || 0).getTime();
                        return dateB - dateA;
                    })
                    .slice(0, 5);
            } else if (visibleGames.length > 0) {
                gamesToShow = visibleGames.slice(0, 5);
            }

            if (gamesToShow.length > 0) {
                gamesToShow.forEach((game) => {
                    const label = game.title.length > 50 ? game.title.substring(0, 47) + '...' : game.title;
                    menuItems.push({
                        label: label,
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

    async updateTrayMenu() {
        try {
            const contextMenu = await this.buildTrayContextMenu();
            if (this.tray) {
                this.tray.setContextMenu(contextMenu);
            }
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
