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
  showLogoOverBoxart?: boolean;
  logoPosition?: 'top' | 'middle' | 'bottom' | 'underneath';
  backgroundBlur?: number;
  backgroundMode?: 'image' | 'color';
  backgroundColor?: string;
  viewMode?: 'grid' | 'list';
  listViewOptions?: {
    showDescription: boolean;
    showCategories: boolean;
    showPlaytime: boolean;
    showReleaseDate: boolean;
    showGenres: boolean;
    showPlatform: boolean;
  };
  listViewSize?: number;
  titleFontSize?: number;
  titleFontFamily?: string;
  descriptionFontSize?: number;
  descriptionFontFamily?: string;
  detailsFontSize?: number;
  detailsFontFamily?: string;
  visibleDetails?: {
    releaseDate: boolean;
    platform: boolean;
    ageRating: boolean;
    genres: boolean;
    developers: boolean;
    publishers: boolean;
    communityScore: boolean;
    userScore: boolean;
    criticScore: boolean;
    installationDirectory: boolean;
  };
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
            showLogoOverBoxart: true,
            logoPosition: 'middle',
            backgroundBlur: 40,
            backgroundMode: 'image',
            backgroundColor: '#000000',
            viewMode: 'grid',
            listViewOptions: {
              showDescription: true,
              showCategories: false,
              showPlaytime: true,
              showReleaseDate: true,
              showGenres: true,
              showPlatform: false,
            },
            listViewSize: 128,
            titleFontSize: 24,
            titleFontFamily: 'system-ui',
            descriptionFontSize: 14,
            descriptionFontFamily: 'system-ui',
            detailsFontSize: 14,
            detailsFontFamily: 'system-ui',
            visibleDetails: {
              releaseDate: true,
              platform: true,
              ageRating: true,
              genres: true,
              developers: true,
              publishers: true,
              communityScore: true,
              userScore: true,
              criticScore: true,
              installationDirectory: true,
            },
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
            showLogoOverBoxart: true,
            logoPosition: 'middle',
            backgroundBlur: 40,
            backgroundMode: 'image',
      backgroundColor: '#000000',
      viewMode: 'grid',
      listViewOptions: {
        showDescription: true,
        showCategories: false,
        showPlaytime: true,
        showReleaseDate: true,
        showGenres: true,
        showPlatform: false,
      },
      listViewSize: 128,
      titleFontSize: 24,
      titleFontFamily: 'system-ui',
      descriptionFontSize: 14,
      descriptionFontFamily: 'system-ui',
      detailsFontSize: 14,
      detailsFontFamily: 'system-ui',
      visibleDetails: {
        releaseDate: true,
        platform: true,
        ageRating: true,
        genres: true,
        developers: true,
        publishers: true,
        communityScore: true,
        userScore: true,
        criticScore: true,
        installationDirectory: true,
      },
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
            showLogoOverBoxart: true,
            logoPosition: 'middle',
            backgroundBlur: 40,
            backgroundMode: 'image',
      backgroundColor: '#000000',
      viewMode: 'grid',
      listViewOptions: {
        showDescription: true,
        showCategories: false,
        showPlaytime: true,
        showReleaseDate: true,
        showGenres: true,
        showPlatform: false,
      },
      listViewSize: 128,
      titleFontSize: 24,
      titleFontFamily: 'system-ui',
      descriptionFontSize: 14,
      descriptionFontFamily: 'system-ui',
      detailsFontSize: 14,
      detailsFontFamily: 'system-ui',
      visibleDetails: {
        releaseDate: true,
        platform: true,
        ageRating: true,
        genres: true,
        developers: true,
        publishers: true,
        communityScore: true,
        userScore: true,
        criticScore: true,
        installationDirectory: true,
      },
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
            showLogoOverBoxart: true,
            logoPosition: 'middle',
            backgroundBlur: 40,
            backgroundMode: 'image',
      backgroundColor: '#000000',
      viewMode: 'grid',
      listViewOptions: {
        showDescription: true,
        showCategories: false,
        showPlaytime: true,
        showReleaseDate: true,
        showGenres: true,
        showPlatform: false,
      },
      listViewSize: 128,
      titleFontSize: 24,
      titleFontFamily: 'system-ui',
      descriptionFontSize: 14,
      descriptionFontFamily: 'system-ui',
      detailsFontSize: 14,
      detailsFontFamily: 'system-ui',
      visibleDetails: {
        releaseDate: true,
        platform: true,
        ageRating: true,
        genres: true,
        developers: true,
        publishers: true,
        communityScore: true,
        userScore: true,
        criticScore: true,
        installationDirectory: true,
      },
      ignoredGames: [],
      windowState: undefined,
    });
  }
}
