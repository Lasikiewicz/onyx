export interface UserPreferences {
  gridSize: number;
  panelWidth: number;
  fanartHeight: number;
  descriptionHeight: number;
  pinnedCategories: string[];
  minimizeToTray?: boolean;
  showSystemTrayIcon?: boolean;
  startWithComputer?: boolean;
  startClosedToTray?: boolean;
  updateLibrariesOnStartup?: boolean;
  activeGameId?: string | null;
  hideVRTitles?: boolean;
  hideGameTitles?: boolean;
  gameTilePadding?: number;
  ignoredGames?: string[]; // Array of game IDs to always ignore
  windowState?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    isMaximized?: boolean;
  };
}

interface UserPreferencesSchema {
  preferences: UserPreferences;
}

export class UserPreferencesService {
  private store: any = null;
  private storePromise: Promise<any>;

  constructor() {
    // Use dynamic import for ES module
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    this.storePromise = (new Function('return import("electron-store")')() as Promise<typeof import('electron-store')>).then((StoreModule) => {
      const Store = StoreModule.default;
      this.store = new Store<UserPreferencesSchema>({
        name: 'user-preferences',
        defaults: {
          preferences: {
            gridSize: 120,
            panelWidth: 800,
            fanartHeight: 320,
            descriptionHeight: 400,
            pinnedCategories: [],
            minimizeToTray: false,
            showSystemTrayIcon: true,
            startWithComputer: false,
            startClosedToTray: false,
            updateLibrariesOnStartup: false,
            activeGameId: null,
            hideVRTitles: true,
            hideGameTitles: false,
            gameTilePadding: 16,
            ignoredGames: [],
            windowState: undefined,
          },
        },
      });
      return this.store;
    });
  }

  private async ensureStore(): Promise<any> {
    if (this.store) {
      return this.store;
    }
    return this.storePromise;
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    const store = await this.ensureStore();
    return store.get('preferences', {
      gridSize: 120,
      panelWidth: 800,
      fanartHeight: 320,
      descriptionHeight: 400,
      pinnedCategories: [],
      minimizeToTray: false,
      showSystemTrayIcon: true,
      startWithComputer: false,
      startClosedToTray: false,
      updateLibrariesOnStartup: false,
      activeGameId: null,
      hideVRTitles: true,
      hideGameTitles: false,
      gameTilePadding: 16,
      ignoredGames: [],
      windowState: undefined,
    });
  }

  /**
   * Save user preferences
   */
  async savePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    const store = await this.ensureStore();
    const current = store.get('preferences', {
      gridSize: 120,
      panelWidth: 800,
      fanartHeight: 320,
      descriptionHeight: 400,
      pinnedCategories: [],
      minimizeToTray: false,
      showSystemTrayIcon: true,
      startWithComputer: false,
      startClosedToTray: false,
      updateLibrariesOnStartup: false,
      activeGameId: null,
      hideVRTitles: true,
      hideGameTitles: false,
      gameTilePadding: 16,
      ignoredGames: [],
      windowState: undefined,
    });
    store.set('preferences', { ...current, ...preferences });
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(): Promise<void> {
    const store = await this.ensureStore();
    store.set('preferences', {
      gridSize: 120,
      panelWidth: 800,
      fanartHeight: 320,
      descriptionHeight: 400,
      pinnedCategories: [],
      minimizeToTray: false,
      showSystemTrayIcon: true,
      startWithComputer: false,
      startClosedToTray: false,
      updateLibrariesOnStartup: false,
      activeGameId: null,
      hideVRTitles: true,
      hideGameTitles: false,
      gameTilePadding: 16,
      ignoredGames: [],
      windowState: undefined,
    });
  }
}
