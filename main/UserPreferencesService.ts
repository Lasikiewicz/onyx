export interface UserPreferences {
  gridSize: number;
  panelWidth: number;
  panelWidthByView?: { grid?: number; list?: number; logo?: number; carousel?: number; coverflow?: number };
  fanartHeight: number;
  descriptionHeight: number;
  descriptionWidthByView?: { grid?: number; list?: number; logo?: number };
  fanartHeightByView?: { grid?: number; list?: number; logo?: number };
  pinnedCategories: string[];
  minimizeToTray?: boolean;
  showSystemTrayIcon?: boolean;
  startWithComputer?: boolean;
  startMinimized?: boolean;
  startClosedToTray?: boolean;
  updateLibrariesOnStartup?: boolean;
  checkForUpdatesOnStartup?: boolean;
  minimizeOnGameLaunch?: boolean;
  activeGameId?: string | null;
  hideVRTitles?: boolean;
  hideAppsTitles?: boolean;
  hideGameTitles?: boolean;
  gameTilePadding?: number;
  rightPanelButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  carouselButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  gridButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  listButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  logoButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  showCategoriesInGameListByView?: { grid?: boolean; list?: boolean; logo?: boolean };
  categoriesPositionByView?: { grid?: 'top' | 'bottom'; list?: 'top' | 'bottom'; logo?: 'top' | 'bottom' };
  categoriesAlignmentByView?: { grid?: 'left' | 'center' | 'right'; list?: 'left' | 'center' | 'right'; logo?: 'left' | 'center' | 'right' };
  categoriesSizeByView?: { grid?: number; list?: number; logo?: number };
  showLogoOverBoxart?: boolean;
  logoPosition?: 'top' | 'middle' | 'bottom' | 'underneath';
  logoBackgroundColor?: string;
  logoBackgroundOpacity?: number;
  backgroundBlur?: number;
  backgroundBrightnessByView?: { grid?: number; list?: number; logo?: number; carousel?: number; coverflow?: number };
  backgroundMode?: 'image' | 'color';
  backgroundColor?: string;
  viewMode?: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow';
  listViewOptions?: {
    showDescription: boolean;
    showCategories: boolean;
    showPlaytime: boolean;
    showReleaseDate: boolean;
    showGenres: boolean;
    showPlatform: boolean;
    showLauncher?: boolean;
    showLogos?: boolean;
    titleTextSize?: number;
    displayMode?: 'boxart-title' | 'logo-title' | 'logo-only' | 'title-only' | 'icon-title';
    sectionTextSize?: number;
    tileHeight?: number;
    boxartSize?: number;
    logoSize?: number;
  };
  listViewSize?: number;
  logoSize?: number;
  logoViewSize?: number;
  logoHeight?: number;
  autoSizeToFit?: boolean;
  showCarouselDetails?: boolean;
  showCarouselLogos?: boolean;
  detailsBarSize?: number;
  carouselLogoSize?: number;
  carouselButtonSize?: number;
  carouselDescriptionSize?: number;
  carouselDescriptionAlignment?: 'left' | 'center' | 'right';
  carouselButtonAlignment?: 'left' | 'center' | 'right';
  carouselLogoAlignment?: 'left' | 'center' | 'right';
  gridDescriptionSize?: number;
  gridButtonSize?: number;
  gridButtonLocation?: 'left' | 'middle' | 'right';
  rightPanelLogoSize?: number;
  rightPanelBoxartPosition?: 'left' | 'right' | 'none';
  rightPanelBoxartSize?: number;
  rightPanelTextSize?: number;
  rightPanelButtonSize?: number;
  rightPanelButtonLocation?: 'left' | 'middle' | 'right';
  detailsPanelOpacity?: number;
  detailsPanelBottomBarHeight?: number;
  rightPanelLogoSizeByView?: { grid?: number; list?: number; logo?: number };
  rightPanelBoxartPositionByView?: { grid?: 'left' | 'right' | 'none'; list?: 'left' | 'right' | 'none'; logo?: 'left' | 'right' | 'none' };
  rightPanelBoxartSizeByView?: { grid?: number; list?: number; logo?: number };
  rightPanelTextSizeByView?: { grid?: number; list?: number; logo?: number };
  rightPanelButtonSizeByView?: { grid?: number; list?: number; logo?: number };
  rightPanelButtonLocationByView?: { grid?: 'left' | 'middle' | 'right'; list?: 'left' | 'middle' | 'right'; logo?: 'left' | 'middle' | 'right' };
  detailsPanelOpacityByView?: { grid?: number; list?: number; logo?: number };
  // View-specific settings
  gridView?: {
    gridSize?: number;
    gameTilePadding?: number;
    backgroundBlur?: number;
    logoSize?: number;
    rightPanelLogoSize?: number;
  };
  logoView?: {
    logoSize?: number;
    gameTilePadding?: number;
    backgroundBlur?: number;
    rightPanelLogoSize?: number;
  };
  listView?: {
    listSize?: number;
    backgroundBlur?: number;
    rightPanelLogoSize?: number;
  };
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
  linkDisplayMode?: 'icons' | 'dropdown';
  visibleLinkTypes?: Record<string, boolean>;
  linkDisplayOrder?: string[];
  ignoredGames?: string[]; // Array of game IDs to always ignore
  hasSeenPostImportTutorial?: boolean;
  windowState?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    isMaximized?: boolean;
    isFullscreen?: boolean;
  };
  storeMetadataLocally?: boolean; // Store metadata and images locally by default
  optimizeImagesInBackground?: boolean; // When true, cache/optimize images in background and show progress in navbar
  optimizationPerformance?: 'low' | 'balanced' | 'high'; // CPU usage profile for image optimization
  disableAllAnimations?: boolean; // Master switch to disable all UI and image animations
  // Legacy fields (kept for backward compatibility)
  disableAnimatedImages?: boolean; // Deprecated: use per-type flags instead
  disableAnimatedBoxart?: boolean; // Deprecated: use disableAnimatedBoxarts instead
  // New per-type animation controls
  disableAnimatedBanners?: boolean;
  disableAnimatedBoxarts?: boolean;
  disableAnimatedBackgrounds?: boolean;
  disableAnimatedIcons?: boolean;
  disableAnimatedLogos?: boolean;
  enableSuspendFeature?: boolean; // Enable suspend/resume functionality
  suspendShortcut?: string; // Keyboard shortcut for suspend/resume (e.g., "Ctrl+Shift+S")
  // Fullscreen settings
  startInFullscreen?: boolean; // Start app in fullscreen mode
  hideMouseCursorInFullscreen?: boolean; // Auto-hide cursor in fullscreen
  cursorHideTimeout?: number; // Timeout in ms before hiding cursor (default 3000)
  enableGamepadSupport?: boolean;
  gamepadNavigationSpeed?: number;
  gamepadButtonLayout?: 'xbox' | 'playstation';
  // Top bar element positions
  topBarPositions?: {
    searchBar?: 'left' | 'middle' | 'right';
    sortBy?: 'left' | 'middle' | 'right';
    launcher?: 'left' | 'middle' | 'right';
    categories?: 'left' | 'middle' | 'right';
  };
  isFirstLaunch?: boolean;
  isViewFlippedByView?: Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', boolean>;
  coverFlowCoverSize?: number;
  coverFlowReflection?: number;
  coverFlowVerticalOffset?: number;
  coverFlowSideOpacity?: number;
  coverFlowShowButtons?: boolean;
  coverFlowButtonPosition?: 'left' | 'middle' | 'right';
  coverFlowButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  enableHardwareAcceleration?: boolean;
  closeToTray?: boolean;
  confirmGameLaunch?: boolean;
  restoreAfterLaunch?: boolean;
  defaultStartupPage?: 'library' | 'favorites' | 'recent';
  perGameViewSizeOverrides?: Record<string, { grid?: number; list?: number; logo?: number; carousel?: number; coverflow?: number }>;
  perGameViewCustomByView?: {
    grid?: Record<string, { gameName?: string; size: number }>;
    list?: Record<string, { gameName?: string; size: number }>;
    logo?: Record<string, { gameName?: string; size: number }>;
    carousel?: Record<string, { gameName?: string; size: number }>;
    coverflow?: Record<string, { gameName?: string; size: number }>;
  };
  perGameViewSizeOverridesMigrated?: boolean;
  sections?: {
    '720p'?: {
      gridView?: Record<string, any>;
      listView?: Record<string, any>;
      logoView?: Record<string, any>;
      carouselView?: Record<string, any>;
      coverflowView?: Record<string, any>;
    };
    '1080p'?: {
      gridView?: Record<string, any>;
      listView?: Record<string, any>;
      logoView?: Record<string, any>;
      carouselView?: Record<string, any>;
      coverflowView?: Record<string, any>;
    };
    '1440p'?: {
      gridView?: Record<string, any>;
      listView?: Record<string, any>;
      logoView?: Record<string, any>;
      carouselView?: Record<string, any>;
      coverflowView?: Record<string, any>;
    };
    '4K'?: {
      gridView?: Record<string, any>;
      listView?: Record<string, any>;
      logoView?: Record<string, any>;
      carouselView?: Record<string, any>;
      coverflowView?: Record<string, any>;
    };
  };
  currentResolution?: ResolutionKey;
}

type ViewMode = 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow';
type ResolutionKey = '720p' | '1080p' | '1440p' | '4K';
type BaselineDefaults = Record<ResolutionKey, Record<ViewMode, Record<string, any>>>;
type CustomDefaultsByResolution = Partial<Record<ResolutionKey, Partial<Record<ViewMode, Record<string, any>>>>>;

interface UserPreferencesSchema {
  preferences: UserPreferences;
  customDefaults?: CustomDefaultsByResolution;
  schemaVersion?: number;
}

import Store from './electronStoreShim.js';

export class UserPreferencesService {
  private store: Store<UserPreferencesSchema>;
  private readonly schemaVersion = 1;
  private storeWriteQueue: Promise<void> = Promise.resolve();

  constructor() {
    this.store = new Store<UserPreferencesSchema>({
      name: 'user-preferences',
      defaults: {
        preferences: this.createDefaultPreferences(),
        customDefaults: {},
        schemaVersion: this.schemaVersion,
      },
    });
  }

  private async ensureStore(): Promise<Store<UserPreferencesSchema>> {
    return this.store;
  }

  private async withStoreWrite<T>(operation: () => Promise<T>): Promise<T> {
    const run = this.storeWriteQueue.then(operation, operation);
    this.storeWriteQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private createDefaultPreferences(): UserPreferences {
    const defaults: UserPreferences = {
      gridSize: 119,
      panelWidth: 800,
      panelWidthByView: { grid: 800, list: 800, logo: 800, carousel: 800, coverflow: 800 },
      fanartHeight: 320,
      fanartHeightByView: { grid: 320, list: 320, logo: 320 },
      descriptionHeight: 400,
      descriptionWidthByView: { grid: 50, list: 50, logo: 50 },
      pinnedCategories: [],
      minimizeToTray: false,
      showSystemTrayIcon: true,
      startWithComputer: false,
      startMinimized: false,
      startClosedToTray: false,
      updateLibrariesOnStartup: false,
      checkForUpdatesOnStartup: true,
      minimizeOnGameLaunch: false,
      activeGameId: null,
      hideVRTitles: true,
      hideAppsTitles: true,
      hideGameTitles: true,
      gameTilePadding: 10,
      showCategoriesInGameListByView: { grid: false, list: false, logo: false },
      categoriesPositionByView: { grid: 'top', list: 'top', logo: 'top' },
      categoriesAlignmentByView: { grid: 'left', list: 'left', logo: 'left' },
      categoriesSizeByView: { grid: 12, list: 12, logo: 12 },
      showLogoOverBoxart: false,
      logoPosition: 'middle',
      logoBackgroundColor: '#374151',
      logoBackgroundOpacity: 100,
      backgroundBlur: 0,
      backgroundBrightnessByView: {
        grid: 0.3,
        list: 0.3,
        logo: 0.3,
        carousel: 0.3,
        coverflow: 0.3,
      },
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
        showLauncher: true,
        showLogos: false,
        titleTextSize: 18,
      },
      listViewSize: 80,
      logoSize: 100,
      logoViewSize: 100,
      logoHeight: 100,
      autoSizeToFit: false,
      showCarouselDetails: true,
      showCarouselLogos: true,
      detailsBarSize: 14,
      carouselLogoSize: 100,
      carouselButtonSize: 14,
      carouselDescriptionSize: 18,
      gridDescriptionSize: 14,
      gridButtonSize: 13,
      gridButtonLocation: 'right',
      rightPanelLogoSize: 100,
      rightPanelBoxartPosition: 'right',
      rightPanelBoxartSize: 200,
      rightPanelTextSize: 13,
      rightPanelButtonSize: 13,
      rightPanelButtonLocation: 'right',
      detailsPanelBottomBarHeight: 72,
      rightPanelLogoSizeByView: { grid: 100, list: 100, logo: 100 },
      rightPanelBoxartPositionByView: { grid: 'right', list: 'right', logo: 'right' },
      rightPanelBoxartSizeByView: { grid: 200, list: 200, logo: 200 },
      rightPanelTextSizeByView: { grid: 13, list: 13, logo: 13 },
      rightPanelButtonSizeByView: { grid: 13, list: 13, logo: 13 },
      rightPanelButtonLocationByView: { grid: 'right', list: 'right', logo: 'right' },
      detailsPanelOpacityByView: { grid: 80, list: 80, logo: 80 },
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
      linkDisplayMode: 'icons',
      visibleLinkTypes: {},
      linkDisplayOrder: [],
      ignoredGames: [],
      windowState: undefined,
      storeMetadataLocally: true,
      optimizeImagesInBackground: true,
      disableAllAnimations: false,
      // Legacy fields default
      disableAnimatedImages: false,
      disableAnimatedBoxart: false,
      // New per-type animation defaults
      disableAnimatedBanners: false,
      disableAnimatedBoxarts: false,
      disableAnimatedBackgrounds: false,
      disableAnimatedIcons: false,
      disableAnimatedLogos: false,
      enableSuspendFeature: false,
      suspendShortcut: 'Ctrl+Shift+S',
      startInFullscreen: false,
      hideMouseCursorInFullscreen: true,
      cursorHideTimeout: 3000,
      enableGamepadSupport: true,
      gamepadNavigationSpeed: 180,
      gamepadButtonLayout: 'playstation',
      detailsPanelOpacity: 80,
      isFirstLaunch: true,
      enableHardwareAcceleration: true,
      closeToTray: true,
      confirmGameLaunch: false,
      restoreAfterLaunch: true,
      defaultStartupPage: 'library',
      perGameViewSizeOverrides: {},
      perGameViewCustomByView: {
        grid: {},
        list: {},
        logo: {},
        carousel: {},
        coverflow: {},
      },
      perGameViewSizeOverridesMigrated: false,
      rightPanelButtonColors: { playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' },
      carouselButtonColors: { playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' },
      gridButtonColors: { playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' },
      listButtonColors: { playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' },
      logoButtonColors: { playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' },
      coverFlowCoverSize: 300,
      coverFlowReflection: 60,
      coverFlowVerticalOffset: 0,
      coverFlowSideOpacity: 100,
      coverFlowShowButtons: true,
      coverFlowButtonPosition: 'middle',
      coverFlowButtonColors: { playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' },
    };

    defaults.sections = this.buildReadableSections(defaults);
    return defaults;
  }

  private mergeByViewMaps<T>(
    defaults: Partial<Record<'grid' | 'list' | 'logo', T>> | undefined,
    preferenceMap: Partial<Record<'grid' | 'list' | 'logo', T>> | undefined,
    extractedMap: Partial<Record<'grid' | 'list' | 'logo', T>> | undefined,
    fallbackValue: T | undefined,
  ): Record<'grid' | 'list' | 'logo', T> {
    const merged = { ...(defaults || {}) } as Record<'grid' | 'list' | 'logo', T>;
    const views: Array<'grid' | 'list' | 'logo'> = ['grid', 'list', 'logo'];

    for (const view of views) {
      if (preferenceMap?.[view] !== undefined) {
        merged[view] = preferenceMap[view] as T;
      }
    }

    for (const view of views) {
      if (extractedMap?.[view] !== undefined) {
        merged[view] = extractedMap[view] as T;
      }
    }

    if (fallbackValue !== undefined) {
      for (const view of views) {
        if (preferenceMap?.[view] === undefined && extractedMap?.[view] === undefined) {
          merged[view] = fallbackValue;
        }
      }
    }

    return merged;
  }

  private resolveByView<T>(
    byView: Partial<Record<'grid' | 'list' | 'logo', T>> | undefined,
    view: 'grid' | 'list' | 'logo',
    fallback: T,
  ): T {
    return byView?.[view] ?? fallback;
  }

  private buildReadableSections(preferences: UserPreferences): NonNullable<UserPreferences['sections']> {
    const byView = preferences.perGameViewCustomByView || {};
    const rightPanelLogoSizeByView = preferences.rightPanelLogoSizeByView || {};
    const rightPanelBoxartPositionByView = preferences.rightPanelBoxartPositionByView || {};
    const rightPanelBoxartSizeByView = preferences.rightPanelBoxartSizeByView || {};
    const rightPanelTextSizeByView = preferences.rightPanelTextSizeByView || {};
    const rightPanelButtonSizeByView = preferences.rightPanelButtonSizeByView || {};
    const rightPanelButtonLocationByView = preferences.rightPanelButtonLocationByView || {};
    const detailsPanelOpacityByView = preferences.detailsPanelOpacityByView || {};

    // Helper to create view section for a specific resolution
    const createGridViewSection = () => ({
      '// Grid View Settings': '═══════════════════════════════════════════════',
      '// Description': 'Grid View displays games in a grid of boxart tiles',
      settings: {
        '// Boxart Size': 'Size of game boxart tiles in the grid (50-200)',
        gridSize: preferences.gridSize,
        '// Tile Padding': 'Spacing between game tiles in pixels',
        gameTilePadding: preferences.gameTilePadding,
        '// Details Panel Width': 'Width of the right-side details panel',
        panelWidth: preferences.panelWidthByView?.grid,
        '// Fanart Height': 'Height of the background fanart area',
        fanartHeight: preferences.fanartHeightByView?.grid,
        '// Description Width': 'Percentage of panel width for description text (0-100)',
        descriptionWidth: preferences.descriptionWidthByView?.grid,
        '// Background Brightness': 'Brightness/darkness of background image (0.0-1.0)',
        backgroundBrightness: preferences.backgroundBrightnessByView?.grid,
        '// Show Logo Over Boxart': 'Display game logo on top of boxart tile',
        showLogoOverBoxart: preferences.showLogoOverBoxart,
        '// ── Grid-Specific Settings ──': '',
        '// Description Size': 'Font size for description text in grid tiles',
        gridDescriptionSize: preferences.gridDescriptionSize,
        '// Button Size': 'Size of action buttons on grid tiles',
        gridButtonSize: preferences.gridButtonSize,
        '// Button Location': 'Position of buttons on tiles (left/right)',
        gridButtonLocation: preferences.gridButtonLocation,
        '// Button Colors': 'Colors for play/edit/mod manager buttons',
        gridButtonColors: preferences.gridButtonColors,
        '// ── Categories Display ──': '',
        '// Show Categories': 'Display category badges on game tiles',
        showCategories: preferences.showCategoriesInGameListByView?.grid,
        '// Categories Position': 'Position of category badges (top/bottom)',
        categoriesPosition: preferences.categoriesPositionByView?.grid,
        '// Categories Alignment': 'Horizontal alignment of categories (left/center/right)',
        categoriesAlignment: preferences.categoriesAlignmentByView?.grid,
        '// Categories Size': 'Font size for category text',
        categoriesSize: preferences.categoriesSizeByView?.grid,
        '// ── Details Panel ──': '',
        '// Details Panel Logo Size': 'Size of logo in details panel (50-200)',
        rightPanelLogoSize: this.resolveByView(rightPanelLogoSizeByView, 'grid', preferences.rightPanelLogoSize),
        '// Details Panel Boxart Position': 'Position of boxart in panel (left/right)',
        rightPanelBoxartPosition: this.resolveByView(rightPanelBoxartPositionByView, 'grid', preferences.rightPanelBoxartPosition),
        '// Details Panel Boxart Size': 'Size of boxart in details panel',
        rightPanelBoxartSize: this.resolveByView(rightPanelBoxartSizeByView, 'grid', preferences.rightPanelBoxartSize),
        '// Details Panel Text Size': 'Font size for details panel text',
        rightPanelTextSize: this.resolveByView(rightPanelTextSizeByView, 'grid', preferences.rightPanelTextSize),
        '// Details Panel Button Size': 'Size of buttons in details panel',
        rightPanelButtonSize: this.resolveByView(rightPanelButtonSizeByView, 'grid', preferences.rightPanelButtonSize),
        '// Details Panel Button Location': 'Position of buttons (left/right)',
        rightPanelButtonLocation: this.resolveByView(rightPanelButtonLocationByView, 'grid', preferences.rightPanelButtonLocation),
        '// Details Panel Button Colors': 'Colors for details panel buttons',
        rightPanelButtonColors: preferences.rightPanelButtonColors,
        '// Details Panel Opacity': 'Transparency of details panel overlay (0-100)',
        detailsPanelOpacity: this.resolveByView(detailsPanelOpacityByView, 'grid', preferences.detailsPanelOpacity),
      },
      '// Per-Game Custom Settings': '═══════════════════════════════════════════',
      '// Per-Game Description': 'Custom Grid View settings for specific games (logo sizes, etc.)',
      gamesCustomSettings: byView.grid || {},
    });

    const createListViewSection = () => ({
      '// List View Settings': '════════════════════════════════════════════════',
      '// Description': 'List View displays games as rows with boxart/logo + info',
      settings: {
        '// List Row Size': 'Height of each game row in List View',
        listViewSize: preferences.listViewSize,
        '// Details Panel Width': 'Width of the right-side details panel',
        panelWidth: preferences.panelWidthByView?.list,
        '// Fanart Height': 'Height of the background fanart area',
        fanartHeight: preferences.fanartHeightByView?.list,
        '// Description Width': 'Percentage of panel width for description text (0-100)',
        descriptionWidth: preferences.descriptionWidthByView?.list,
        '// Background Brightness': 'Brightness/darkness of background image (0.0-1.0)',
        backgroundBrightness: preferences.backgroundBrightnessByView?.list,
        '// List Display Options': 'Control which info columns are shown in List View',
        listViewOptions: preferences.listViewOptions,
        '// ── List-Specific Settings ──': '',
        '// Button Colors': 'Colors for play/edit/mod manager buttons',
        listButtonColors: preferences.listButtonColors,
        '// ── Categories Display ──': '',
        '// Show Categories': 'Display category badges in list rows',
        showCategories: preferences.showCategoriesInGameListByView?.list,
        '// Categories Position': 'Position of category badges (top/bottom)',
        categoriesPosition: preferences.categoriesPositionByView?.list,
        '// Categories Alignment': 'Horizontal alignment of categories (left/center/right)',
        categoriesAlignment: preferences.categoriesAlignmentByView?.list,
        '// Categories Size': 'Font size for category text',
        categoriesSize: preferences.categoriesSizeByView?.list,
        '// ── Details Panel ──': '',
        '// Details Panel Logo Size': 'Size of logo in details panel (50-200)',
        rightPanelLogoSize: this.resolveByView(rightPanelLogoSizeByView, 'list', preferences.rightPanelLogoSize),
        '// Details Panel Boxart Position': 'Position of boxart in panel (left/right)',
        rightPanelBoxartPosition: this.resolveByView(rightPanelBoxartPositionByView, 'list', preferences.rightPanelBoxartPosition),
        '// Details Panel Boxart Size': 'Size of boxart in details panel',
        rightPanelBoxartSize: this.resolveByView(rightPanelBoxartSizeByView, 'list', preferences.rightPanelBoxartSize),
        '// Details Panel Text Size': 'Font size for details panel text',
        rightPanelTextSize: this.resolveByView(rightPanelTextSizeByView, 'list', preferences.rightPanelTextSize),
        '// Details Panel Button Size': 'Size of buttons in details panel',
        rightPanelButtonSize: this.resolveByView(rightPanelButtonSizeByView, 'list', preferences.rightPanelButtonSize),
        '// Details Panel Button Location': 'Position of buttons (left/right)',
        rightPanelButtonLocation: this.resolveByView(rightPanelButtonLocationByView, 'list', preferences.rightPanelButtonLocation),
        '// Details Panel Button Colors': 'Colors for details panel buttons',
        rightPanelButtonColors: preferences.rightPanelButtonColors,
        '// Details Panel Opacity': 'Transparency of details panel overlay (0-100)',
        detailsPanelOpacity: this.resolveByView(detailsPanelOpacityByView, 'list', preferences.detailsPanelOpacity),
      },
      '// Per-Game Custom Settings': '═══════════════════════════════════════════',
      '// Per-Game Description': 'Custom List View settings for specific games (logo sizes, etc.)',
      gamesCustomSettings: byView.list || {},
    });

    const createLogoViewSection = () => ({
      '// Logo View Settings': '════════════════════════════════════════════════',
      '// Description': 'Logo View displays games as large logos on backgrounds',
      settings: {
        '// Logo Size': 'Size of game logos in Logo View (50-200)',
        logoSize: preferences.logoSize,
        '// Logo Position': 'Vertical position of logo on background',
        logoPosition: preferences.logoPosition,
        '// Logo Background Opacity': 'Opacity of overlay behind logo (0.0-1.0)',
        logoBackgroundOpacity: preferences.logoBackgroundOpacity,
        '// Details Panel Width': 'Width of the right-side details panel',
        panelWidth: preferences.panelWidthByView?.logo,
        '// Fanart Height': 'Height of the background fanart area',
        fanartHeight: preferences.fanartHeightByView?.logo,
        '// Description Width': 'Percentage of panel width for description text (0-100)',
        descriptionWidth: preferences.descriptionWidthByView?.logo,
        '// Background Brightness': 'Brightness/darkness of background image (0.0-1.0)',
        backgroundBrightness: preferences.backgroundBrightnessByView?.logo,
        '// ── Logo-Specific Settings ──': '',
        '// Logo Height': 'Maximum height for logos',
        logoHeight: preferences.logoHeight,
        '// Auto Size To Fit': 'Automatically adjust logo size to fit screen',
        autoSizeToFit: preferences.autoSizeToFit,
        '// Button Colors': 'Colors for play/edit/mod manager buttons',
        logoButtonColors: preferences.logoButtonColors,
        '// ── Categories Display ──': '',
        '// Show Categories': 'Display category badges in logo view',
        showCategories: preferences.showCategoriesInGameListByView?.logo,
        '// Categories Position': 'Position of category badges (top/bottom)',
        categoriesPosition: preferences.categoriesPositionByView?.logo,
        '// Categories Alignment': 'Horizontal alignment of categories (left/center/right)',
        categoriesAlignment: preferences.categoriesAlignmentByView?.logo,
        '// Categories Size': 'Font size for category text',
        categoriesSize: preferences.categoriesSizeByView?.logo,
        '// ── Details Panel ──': '',
        '// Details Panel Logo Size': 'Size of logo in details panel (50-200)',
        rightPanelLogoSize: this.resolveByView(rightPanelLogoSizeByView, 'logo', preferences.rightPanelLogoSize),
        '// Details Panel Boxart Position': 'Position of boxart in panel (left/right)',
        rightPanelBoxartPosition: this.resolveByView(rightPanelBoxartPositionByView, 'logo', preferences.rightPanelBoxartPosition),
        '// Details Panel Boxart Size': 'Size of boxart in details panel',
        rightPanelBoxartSize: this.resolveByView(rightPanelBoxartSizeByView, 'logo', preferences.rightPanelBoxartSize),
        '// Details Panel Text Size': 'Font size for details panel text',
        rightPanelTextSize: this.resolveByView(rightPanelTextSizeByView, 'logo', preferences.rightPanelTextSize),
        '// Details Panel Button Size': 'Size of buttons in details panel',
        rightPanelButtonSize: this.resolveByView(rightPanelButtonSizeByView, 'logo', preferences.rightPanelButtonSize),
        '// Details Panel Button Location': 'Position of buttons (left/right)',
        rightPanelButtonLocation: this.resolveByView(rightPanelButtonLocationByView, 'logo', preferences.rightPanelButtonLocation),
        '// Details Panel Button Colors': 'Colors for details panel buttons',
        rightPanelButtonColors: preferences.rightPanelButtonColors,
        '// Details Panel Opacity': 'Transparency of details panel overlay (0-100)',
        detailsPanelOpacity: this.resolveByView(detailsPanelOpacityByView, 'logo', preferences.detailsPanelOpacity),
      },
      '// Per-Game Custom Settings': '═══════════════════════════════════════════',
      '// Per-Game Description': 'Custom Logo View settings for specific games (logo sizes, etc.)',
      gamesCustomSettings: byView.logo || {},
    });

    const createCarouselViewSection = () => ({
      '// Carousel View Settings': '══════════════════════════════════════════════',
      '// Description': 'Carousel View displays games in a horizontal scrolling carousel',
      settings: {
        '// Show Details Bar': 'Display game info/buttons below carousel',
        showCarouselDetails: preferences.showCarouselDetails,
        '// Show Logos': 'Display game logos on carousel tiles',
        showCarouselLogos: preferences.showCarouselLogos,
        '// Details Bar Size': 'Height of details bar when shown',
        detailsBarSize: preferences.detailsBarSize,
        '// Carousel Logo Size': 'Size of logos on carousel tiles (50-200)',
        carouselLogoSize: preferences.carouselLogoSize,
        '// Button Size': 'Size of action buttons',
        carouselButtonSize: preferences.carouselButtonSize,
        '// Description Text Size': 'Font size for game description text',
        carouselDescriptionSize: preferences.carouselDescriptionSize,
        '// Description Alignment': 'Text alignment for description (left/center/right)',
        carouselDescriptionAlignment: preferences.carouselDescriptionAlignment,
        '// Button Alignment': 'Alignment for action buttons (left/center/right)',
        carouselButtonAlignment: preferences.carouselButtonAlignment,
        '// Logo Alignment': 'Alignment for logos (left/center/right)',
        carouselLogoAlignment: preferences.carouselLogoAlignment,
        '// Background Brightness': 'Brightness/darkness of background image (0.0-1.0)',
        backgroundBrightness: preferences.backgroundBrightnessByView?.carousel,
        '// ── Carousel-Specific Settings ──': '',
        '// Button Colors': 'Colors for play/edit/mod manager buttons',
        carouselButtonColors: preferences.carouselButtonColors,
        '// ── Details Panel ──': '',
        '// Details Panel Logo Size': 'Size of logo in details panel (50-200)',
        rightPanelLogoSize: preferences.rightPanelLogoSize,
        '// Details Panel Boxart Position': 'Position of boxart in panel (left/right)',
        rightPanelBoxartPosition: preferences.rightPanelBoxartPosition,
        '// Details Panel Boxart Size': 'Size of boxart in details panel',
        rightPanelBoxartSize: preferences.rightPanelBoxartSize,
        '// Details Panel Text Size': 'Font size for details panel text',
        rightPanelTextSize: preferences.rightPanelTextSize,
        '// Details Panel Button Size': 'Size of buttons in details panel',
        rightPanelButtonSize: preferences.rightPanelButtonSize,
        '// Details Panel Button Location': 'Position of buttons (left/right)',
        rightPanelButtonLocation: preferences.rightPanelButtonLocation,
        '// Details Panel Button Colors': 'Colors for details panel buttons',
        rightPanelButtonColors: preferences.rightPanelButtonColors,
        '// Details Panel Opacity': 'Transparency of details panel overlay (0-100)',
        detailsPanelOpacity: preferences.detailsPanelOpacity,
      },
      '// Per-Game Custom Settings': '═══════════════════════════════════════════',
      '// Per-Game Description': 'Custom Carousel View settings for specific games (logo sizes, etc.)',
      gamesCustomSettings: byView.carousel || {},
    });

    const createCoverflowViewSection = () => ({
      '// Coverflow View Settings': '════════════════════════════════════════════',
      '// Description': 'Coverflow View displays games in a 3D flowing cover showcase',
      settings: {
        '// Cover Size': 'Size of cover images in coverflow (50-300)',
        coverFlowCoverSize: preferences.coverFlowCoverSize,
        '// Show Reflection': 'Display reflection effect below covers',
        coverFlowReflection: preferences.coverFlowReflection,
        '// Vertical Offset': 'Vertical position adjustment for covers',
        coverFlowVerticalOffset: preferences.coverFlowVerticalOffset,
        '// Side Cover Opacity': 'Opacity of non-selected side covers (0.0-1.0)',
        coverFlowSideOpacity: preferences.coverFlowSideOpacity,
        '// Show Buttons': 'Display action buttons with coverflow',
        coverFlowShowButtons: preferences.coverFlowShowButtons,
        '// Button Position': 'Position of action buttons (left/middle/right)',
        coverFlowButtonPosition: preferences.coverFlowButtonPosition,
        '// Background Brightness': 'Brightness/darkness of background image (0.0-1.0)',
        backgroundBrightness: preferences.backgroundBrightnessByView?.coverflow,
        '// ── Coverflow-Specific Settings ──': '',
        '// Button Colors': 'Colors for play/edit/mod manager buttons',
        coverFlowButtonColors: preferences.coverFlowButtonColors,
      },
      '// Per-Game Custom Settings': '═══════════════════════════════════════════',
      '// Per-Game Description': 'Custom Coverflow View settings for specific games',
      gamesCustomSettings: byView.coverflow || {},
    });

    // Create resolution-nested sections
    return {
      '720p': {
        gridView: createGridViewSection(),
        listView: createListViewSection(),
        logoView: createLogoViewSection(),
        carouselView: createCarouselViewSection(),
        coverflowView: createCoverflowViewSection(),
      },
      '1080p': {
        gridView: createGridViewSection(),
        listView: createListViewSection(),
        logoView: createLogoViewSection(),
        carouselView: createCarouselViewSection(),
        coverflowView: createCoverflowViewSection(),
      },
      '1440p': {
        gridView: createGridViewSection(),
        listView: createListViewSection(),
        logoView: createLogoViewSection(),
        carouselView: createCarouselViewSection(),
        coverflowView: createCoverflowViewSection(),
      },
      '4K': {
        gridView: createGridViewSection(),
        listView: createListViewSection(),
        logoView: createLogoViewSection(),
        carouselView: createCarouselViewSection(),
        coverflowView: createCoverflowViewSection(),
      },
    };
  }



  private createBaselineDefaults(): BaselineDefaults {
    const defaults = this.createDefaultPreferences();

    const resolutionPreset = (): Record<ViewMode, Record<string, any>> => ({
      grid: {
        gridSize: defaults.gridSize,
        gameTilePadding: defaults.gameTilePadding,
        panelWidth: defaults.panelWidthByView?.grid ?? defaults.panelWidth,
        fanartHeight: defaults.fanartHeightByView?.grid ?? defaults.fanartHeight,
        descriptionWidth: defaults.descriptionWidthByView?.grid ?? 50,
        backgroundBlur: defaults.backgroundBlur,
        backgroundBrightness: defaults.backgroundBrightnessByView?.grid ?? 0.3,
        showLogoOverBoxart: defaults.showLogoOverBoxart,
        rightPanelLogoSize: defaults.rightPanelLogoSize,
        rightPanelBoxartPosition: defaults.rightPanelBoxartPosition,
        rightPanelBoxartSize: defaults.rightPanelBoxartSize,
        rightPanelTextSize: defaults.rightPanelTextSize,
        rightPanelButtonSize: defaults.rightPanelButtonSize,
        rightPanelButtonLocation: defaults.rightPanelButtonLocation,
        detailsPanelOpacity: defaults.detailsPanelOpacity,
      },
      list: {
        panelWidth: defaults.panelWidthByView?.list ?? defaults.panelWidth,
        fanartHeight: defaults.fanartHeightByView?.list ?? defaults.fanartHeight,
        descriptionWidth: defaults.descriptionWidthByView?.list ?? 50,
        backgroundBlur: defaults.backgroundBlur,
        backgroundBrightness: defaults.backgroundBrightnessByView?.list ?? 0.3,
        listViewOptions: defaults.listViewOptions,
        rightPanelLogoSize: defaults.rightPanelLogoSize,
        rightPanelBoxartPosition: defaults.rightPanelBoxartPosition,
        rightPanelBoxartSize: defaults.rightPanelBoxartSize,
        rightPanelTextSize: defaults.rightPanelTextSize,
        rightPanelButtonSize: defaults.rightPanelButtonSize,
        rightPanelButtonLocation: defaults.rightPanelButtonLocation,
        detailsPanelOpacity: defaults.detailsPanelOpacity,
      },
      logo: {
        logoSize: defaults.logoSize ?? defaults.logoViewSize ?? 100,
        gameTilePadding: defaults.gameTilePadding,
        logoBackgroundOpacity: defaults.logoBackgroundOpacity,
        panelWidth: defaults.panelWidthByView?.logo ?? defaults.panelWidth,
        fanartHeight: defaults.fanartHeightByView?.logo ?? defaults.fanartHeight,
        descriptionWidth: defaults.descriptionWidthByView?.logo ?? 50,
        backgroundBlur: defaults.backgroundBlur,
        backgroundBrightness: defaults.backgroundBrightnessByView?.logo ?? 0.3,
        rightPanelLogoSize: defaults.rightPanelLogoSize,
        rightPanelBoxartPosition: defaults.rightPanelBoxartPosition,
        rightPanelBoxartSize: defaults.rightPanelBoxartSize,
        rightPanelTextSize: defaults.rightPanelTextSize,
        rightPanelButtonSize: defaults.rightPanelButtonSize,
        rightPanelButtonLocation: defaults.rightPanelButtonLocation,
        detailsPanelOpacity: defaults.detailsPanelOpacity,
      },
      carousel: {
        showCarouselDetails: defaults.showCarouselDetails,
        showCarouselLogos: defaults.showCarouselLogos,
        detailsBarSize: defaults.detailsBarSize,
        selectedBoxArtSize: 25,
        gameTilePadding: defaults.gameTilePadding,
        backgroundBlur: defaults.backgroundBlur,
        backgroundBrightness: defaults.backgroundBrightnessByView?.carousel ?? 0.3,
        carouselLogoSize: defaults.carouselLogoSize,
        carouselButtonSize: defaults.carouselButtonSize,
        carouselDescriptionSize: defaults.carouselDescriptionSize,
        carouselDescriptionAlignment: defaults.carouselDescriptionAlignment ?? 'center',
        carouselButtonAlignment: defaults.carouselButtonAlignment ?? 'center',
        carouselLogoAlignment: defaults.carouselLogoAlignment ?? 'center',
        rightPanelLogoSize: defaults.rightPanelLogoSize,
        rightPanelBoxartPosition: defaults.rightPanelBoxartPosition,
        rightPanelBoxartSize: defaults.rightPanelBoxartSize,
        rightPanelTextSize: defaults.rightPanelTextSize,
        rightPanelButtonSize: defaults.rightPanelButtonSize,
        rightPanelButtonLocation: defaults.rightPanelButtonLocation,
        detailsPanelOpacity: defaults.detailsPanelOpacity,
      },
      coverflow: {
        coverFlowCoverSize: defaults.coverFlowCoverSize,
        coverFlowReflection: defaults.coverFlowReflection,
        coverFlowVerticalOffset: defaults.coverFlowVerticalOffset,
        coverFlowSideOpacity: defaults.coverFlowSideOpacity,
        coverFlowShowButtons: defaults.coverFlowShowButtons,
        coverFlowButtonPosition: defaults.coverFlowButtonPosition,
        backgroundBrightness: defaults.backgroundBrightnessByView?.coverflow ?? 0.3,
      },
    });

    return {
      '720p': resolutionPreset(),
      '1080p': resolutionPreset(),
      '1440p': resolutionPreset(),
      '4K': resolutionPreset(),
    };
  }

  private normalizeResolutionKey(value?: string): ResolutionKey {
    const normalized = (value || '1080p').toLowerCase();
    if (normalized === '4k') return '4K';
    if (normalized === '1440p') return '1440p';
    if (normalized === '720p') return '720p';
    return '1080p';
  }

  /**
   * Detect the current screen resolution category based on the primary display
   */
  private async getCurrentResolution(): Promise<ResolutionKey> {
    try {
      const { screen } = await import('electron');
      const primaryDisplay = screen.getPrimaryDisplay();
      const { height } = primaryDisplay.bounds;

      if (height >= 2160) return '4K';
      if (height >= 1440) return '1440p';
      if (height >= 1080) return '1080p';
      return '720p';
    } catch (error) {
      console.warn('Failed to detect screen resolution, defaulting to 1080p:', error);
      return '1080p';
    }
  }

  private async extractFromSections(sections: NonNullable<UserPreferences['sections']>, currentResolution?: ResolutionKey): Promise<Partial<UserPreferences>> {
    const extracted: Partial<UserPreferences> = {};

    // Determine which resolution to extract from
    const resolution = currentResolution || await this.getCurrentResolution();
    const resolutionSections = sections[resolution];

    if (!resolutionSections) {
      // Fallback for backward compatibility - try 1080p
      console.warn(`No sections found for resolution ${resolution}, falling back to 1080p`);
      const fallbackSections = sections['1080p'];
      if (!fallbackSections) {
        return extracted;
      }
    }

    const viewSections = resolutionSections || sections['1080p'] || {};

    // Extract from gridView
    if (viewSections.gridView?.settings) {
      const gridSettings = viewSections.gridView.settings;
      if (gridSettings.gridSize !== undefined) extracted.gridSize = gridSettings.gridSize;
      if (gridSettings.gameTilePadding !== undefined) extracted.gameTilePadding = gridSettings.gameTilePadding;
      if (gridSettings.showLogoOverBoxart !== undefined) extracted.showLogoOverBoxart = gridSettings.showLogoOverBoxart;
      if (gridSettings.gridDescriptionSize !== undefined) extracted.gridDescriptionSize = gridSettings.gridDescriptionSize;
      if (gridSettings.gridButtonSize !== undefined) extracted.gridButtonSize = gridSettings.gridButtonSize;
      if (gridSettings.gridButtonLocation !== undefined) extracted.gridButtonLocation = gridSettings.gridButtonLocation;
      if (gridSettings.gridButtonColors !== undefined) extracted.gridButtonColors = gridSettings.gridButtonColors;
      if (gridSettings.showCategories !== undefined) {
        extracted.showCategoriesInGameListByView = { ...extracted.showCategoriesInGameListByView, grid: gridSettings.showCategories };
      }
      if (gridSettings.categoriesPosition !== undefined) {
        extracted.categoriesPositionByView = { ...extracted.categoriesPositionByView, grid: gridSettings.categoriesPosition };
      }
      if (gridSettings.categoriesAlignment !== undefined) {
        extracted.categoriesAlignmentByView = { ...extracted.categoriesAlignmentByView, grid: gridSettings.categoriesAlignment };
      }
      if (gridSettings.categoriesSize !== undefined) {
        extracted.categoriesSizeByView = { ...extracted.categoriesSizeByView, grid: gridSettings.categoriesSize };
      }
      if (gridSettings.rightPanelLogoSize !== undefined) {
        extracted.rightPanelLogoSize = gridSettings.rightPanelLogoSize;
        extracted.rightPanelLogoSizeByView = { ...extracted.rightPanelLogoSizeByView, grid: gridSettings.rightPanelLogoSize };
      }
      if (gridSettings.rightPanelBoxartPosition !== undefined) {
        extracted.rightPanelBoxartPosition = gridSettings.rightPanelBoxartPosition;
        extracted.rightPanelBoxartPositionByView = { ...extracted.rightPanelBoxartPositionByView, grid: gridSettings.rightPanelBoxartPosition };
      }
      if (gridSettings.rightPanelBoxartSize !== undefined) {
        extracted.rightPanelBoxartSize = gridSettings.rightPanelBoxartSize;
        extracted.rightPanelBoxartSizeByView = { ...extracted.rightPanelBoxartSizeByView, grid: gridSettings.rightPanelBoxartSize };
      }
      if (gridSettings.rightPanelTextSize !== undefined) {
        extracted.rightPanelTextSize = gridSettings.rightPanelTextSize;
        extracted.rightPanelTextSizeByView = { ...extracted.rightPanelTextSizeByView, grid: gridSettings.rightPanelTextSize };
      }
      if (gridSettings.rightPanelButtonSize !== undefined) {
        extracted.rightPanelButtonSize = gridSettings.rightPanelButtonSize;
        extracted.rightPanelButtonSizeByView = { ...extracted.rightPanelButtonSizeByView, grid: gridSettings.rightPanelButtonSize };
      }
      if (gridSettings.rightPanelButtonLocation !== undefined) {
        extracted.rightPanelButtonLocation = gridSettings.rightPanelButtonLocation;
        extracted.rightPanelButtonLocationByView = { ...extracted.rightPanelButtonLocationByView, grid: gridSettings.rightPanelButtonLocation };
      }
      if (gridSettings.rightPanelButtonColors !== undefined) extracted.rightPanelButtonColors = gridSettings.rightPanelButtonColors;
      if (gridSettings.detailsPanelOpacity !== undefined) {
        extracted.detailsPanelOpacity = gridSettings.detailsPanelOpacity;
        extracted.detailsPanelOpacityByView = { ...extracted.detailsPanelOpacityByView, grid: gridSettings.detailsPanelOpacity };
      }
      if (gridSettings.panelWidth !== undefined) {
        extracted.panelWidthByView = { ...extracted.panelWidthByView, grid: gridSettings.panelWidth };
      }
      if (gridSettings.fanartHeight !== undefined) {
        extracted.fanartHeightByView = { ...extracted.fanartHeightByView, grid: gridSettings.fanartHeight };
      }
      if (gridSettings.descriptionWidth !== undefined) {
        extracted.descriptionWidthByView = { ...extracted.descriptionWidthByView, grid: gridSettings.descriptionWidth };
      }
      if (gridSettings.backgroundBrightness !== undefined) {
        extracted.backgroundBrightnessByView = { ...extracted.backgroundBrightnessByView, grid: gridSettings.backgroundBrightness };
      }
    }

    // Extract from listView
    if (viewSections.listView?.settings) {
      const listSettings = viewSections.listView.settings;
      if (listSettings.listViewSize !== undefined) extracted.listViewSize = listSettings.listViewSize;
      if (listSettings.listViewOptions !== undefined) extracted.listViewOptions = listSettings.listViewOptions;
      if (listSettings.listButtonColors !== undefined) extracted.listButtonColors = listSettings.listButtonColors;
      if (listSettings.showCategories !== undefined) {
        extracted.showCategoriesInGameListByView = { ...extracted.showCategoriesInGameListByView, list: listSettings.showCategories };
      }
      if (listSettings.categoriesPosition !== undefined) {
        extracted.categoriesPositionByView = { ...extracted.categoriesPositionByView, list: listSettings.categoriesPosition };
      }
      if (listSettings.categoriesAlignment !== undefined) {
        extracted.categoriesAlignmentByView = { ...extracted.categoriesAlignmentByView, list: listSettings.categoriesAlignment };
      }
      if (listSettings.categoriesSize !== undefined) {
        extracted.categoriesSizeByView = { ...extracted.categoriesSizeByView, list: listSettings.categoriesSize };
      }
      if (listSettings.panelWidth !== undefined) {
        extracted.panelWidthByView = { ...extracted.panelWidthByView, list: listSettings.panelWidth };
      }
      if (listSettings.fanartHeight !== undefined) {
        extracted.fanartHeightByView = { ...extracted.fanartHeightByView, list: listSettings.fanartHeight };
      }
      if (listSettings.descriptionWidth !== undefined) {
        extracted.descriptionWidthByView = { ...extracted.descriptionWidthByView, list: listSettings.descriptionWidth };
      }
      if (listSettings.backgroundBrightness !== undefined) {
        extracted.backgroundBrightnessByView = { ...extracted.backgroundBrightnessByView, list: listSettings.backgroundBrightness };
      }
      if (listSettings.rightPanelLogoSize !== undefined) {
        extracted.rightPanelLogoSize = listSettings.rightPanelLogoSize;
        extracted.rightPanelLogoSizeByView = { ...extracted.rightPanelLogoSizeByView, list: listSettings.rightPanelLogoSize };
      }
      if (listSettings.rightPanelBoxartPosition !== undefined) {
        extracted.rightPanelBoxartPosition = listSettings.rightPanelBoxartPosition;
        extracted.rightPanelBoxartPositionByView = { ...extracted.rightPanelBoxartPositionByView, list: listSettings.rightPanelBoxartPosition };
      }
      if (listSettings.rightPanelBoxartSize !== undefined) {
        extracted.rightPanelBoxartSize = listSettings.rightPanelBoxartSize;
        extracted.rightPanelBoxartSizeByView = { ...extracted.rightPanelBoxartSizeByView, list: listSettings.rightPanelBoxartSize };
      }
      if (listSettings.rightPanelTextSize !== undefined) {
        extracted.rightPanelTextSize = listSettings.rightPanelTextSize;
        extracted.rightPanelTextSizeByView = { ...extracted.rightPanelTextSizeByView, list: listSettings.rightPanelTextSize };
      }
      if (listSettings.rightPanelButtonSize !== undefined) {
        extracted.rightPanelButtonSize = listSettings.rightPanelButtonSize;
        extracted.rightPanelButtonSizeByView = { ...extracted.rightPanelButtonSizeByView, list: listSettings.rightPanelButtonSize };
      }
      if (listSettings.rightPanelButtonLocation !== undefined) {
        extracted.rightPanelButtonLocation = listSettings.rightPanelButtonLocation;
        extracted.rightPanelButtonLocationByView = { ...extracted.rightPanelButtonLocationByView, list: listSettings.rightPanelButtonLocation };
      }
      if (listSettings.detailsPanelOpacity !== undefined) {
        extracted.detailsPanelOpacity = listSettings.detailsPanelOpacity;
        extracted.detailsPanelOpacityByView = { ...extracted.detailsPanelOpacityByView, list: listSettings.detailsPanelOpacity };
      }
    }

    // Extract from logoView
    if (viewSections.logoView?.settings) {
      const logoSettings = viewSections.logoView.settings;
      if (logoSettings.logoSize !== undefined) extracted.logoSize = logoSettings.logoSize;
      if (logoSettings.logoPosition !== undefined) extracted.logoPosition = logoSettings.logoPosition;
      if (logoSettings.logoBackgroundOpacity !== undefined) extracted.logoBackgroundOpacity = logoSettings.logoBackgroundOpacity;
      if (logoSettings.logoHeight !== undefined) extracted.logoHeight = logoSettings.logoHeight;
      if (logoSettings.autoSizeToFit !== undefined) extracted.autoSizeToFit = logoSettings.autoSizeToFit;
      if (logoSettings.logoButtonColors !== undefined) extracted.logoButtonColors = logoSettings.logoButtonColors;
      if (logoSettings.showCategories !== undefined) {
        extracted.showCategoriesInGameListByView = { ...extracted.showCategoriesInGameListByView, logo: logoSettings.showCategories };
      }
      if (logoSettings.categoriesPosition !== undefined) {
        extracted.categoriesPositionByView = { ...extracted.categoriesPositionByView, logo: logoSettings.categoriesPosition };
      }
      if (logoSettings.categoriesAlignment !== undefined) {
        extracted.categoriesAlignmentByView = { ...extracted.categoriesAlignmentByView, logo: logoSettings.categoriesAlignment };
      }
      if (logoSettings.categoriesSize !== undefined) {
        extracted.categoriesSizeByView = { ...extracted.categoriesSizeByView, logo: logoSettings.categoriesSize };
      }
      if (logoSettings.panelWidth !== undefined) {
        extracted.panelWidthByView = { ...extracted.panelWidthByView, logo: logoSettings.panelWidth };
      }
      if (logoSettings.fanartHeight !== undefined) {
        extracted.fanartHeightByView = { ...extracted.fanartHeightByView, logo: logoSettings.fanartHeight };
      }
      if (logoSettings.descriptionWidth !== undefined) {
        extracted.descriptionWidthByView = { ...extracted.descriptionWidthByView, logo: logoSettings.descriptionWidth };
      }
      if (logoSettings.backgroundBrightness !== undefined) {
        extracted.backgroundBrightnessByView = { ...extracted.backgroundBrightnessByView, logo: logoSettings.backgroundBrightness };
      }
      if (logoSettings.rightPanelLogoSize !== undefined) {
        extracted.rightPanelLogoSize = logoSettings.rightPanelLogoSize;
        extracted.rightPanelLogoSizeByView = { ...extracted.rightPanelLogoSizeByView, logo: logoSettings.rightPanelLogoSize };
      }
      if (logoSettings.rightPanelBoxartPosition !== undefined) {
        extracted.rightPanelBoxartPosition = logoSettings.rightPanelBoxartPosition;
        extracted.rightPanelBoxartPositionByView = { ...extracted.rightPanelBoxartPositionByView, logo: logoSettings.rightPanelBoxartPosition };
      }
      if (logoSettings.rightPanelBoxartSize !== undefined) {
        extracted.rightPanelBoxartSize = logoSettings.rightPanelBoxartSize;
        extracted.rightPanelBoxartSizeByView = { ...extracted.rightPanelBoxartSizeByView, logo: logoSettings.rightPanelBoxartSize };
      }
      if (logoSettings.rightPanelTextSize !== undefined) {
        extracted.rightPanelTextSize = logoSettings.rightPanelTextSize;
        extracted.rightPanelTextSizeByView = { ...extracted.rightPanelTextSizeByView, logo: logoSettings.rightPanelTextSize };
      }
      if (logoSettings.rightPanelButtonSize !== undefined) {
        extracted.rightPanelButtonSize = logoSettings.rightPanelButtonSize;
        extracted.rightPanelButtonSizeByView = { ...extracted.rightPanelButtonSizeByView, logo: logoSettings.rightPanelButtonSize };
      }
      if (logoSettings.rightPanelButtonLocation !== undefined) {
        extracted.rightPanelButtonLocation = logoSettings.rightPanelButtonLocation;
        extracted.rightPanelButtonLocationByView = { ...extracted.rightPanelButtonLocationByView, logo: logoSettings.rightPanelButtonLocation };
      }
      if (logoSettings.detailsPanelOpacity !== undefined) {
        extracted.detailsPanelOpacity = logoSettings.detailsPanelOpacity;
        extracted.detailsPanelOpacityByView = { ...extracted.detailsPanelOpacityByView, logo: logoSettings.detailsPanelOpacity };
      }
    }

    // Extract from carouselView
    if (viewSections.carouselView?.settings) {
      const carouselSettings = viewSections.carouselView.settings;
      if (carouselSettings.showCarouselDetails !== undefined) extracted.showCarouselDetails = carouselSettings.showCarouselDetails;
      if (carouselSettings.showCarouselLogos !== undefined) extracted.showCarouselLogos = carouselSettings.showCarouselLogos;
      if (carouselSettings.detailsBarSize !== undefined) extracted.detailsBarSize = carouselSettings.detailsBarSize;
      if (carouselSettings.carouselLogoSize !== undefined) extracted.carouselLogoSize = carouselSettings.carouselLogoSize;
      if (carouselSettings.carouselButtonSize !== undefined) extracted.carouselButtonSize = carouselSettings.carouselButtonSize;
      if (carouselSettings.carouselDescriptionSize !== undefined) extracted.carouselDescriptionSize = carouselSettings.carouselDescriptionSize;
      if (carouselSettings.carouselDescriptionAlignment !== undefined) extracted.carouselDescriptionAlignment = carouselSettings.carouselDescriptionAlignment;
      if (carouselSettings.carouselButtonAlignment !== undefined) extracted.carouselButtonAlignment = carouselSettings.carouselButtonAlignment;
      if (carouselSettings.carouselLogoAlignment !== undefined) extracted.carouselLogoAlignment = carouselSettings.carouselLogoAlignment;
      if (carouselSettings.carouselButtonColors !== undefined) extracted.carouselButtonColors = carouselSettings.carouselButtonColors;
      if (carouselSettings.backgroundBrightness !== undefined) {
        extracted.backgroundBrightnessByView = { ...extracted.backgroundBrightnessByView, carousel: carouselSettings.backgroundBrightness };
      }
    }

    // Extract from coverflowView
    if (viewSections.coverflowView?.settings) {
      const coverflowSettings = viewSections.coverflowView.settings;
      if (coverflowSettings.coverFlowCoverSize !== undefined) extracted.coverFlowCoverSize = coverflowSettings.coverFlowCoverSize;
      if (coverflowSettings.coverFlowReflection !== undefined) extracted.coverFlowReflection = coverflowSettings.coverFlowReflection;
      if (coverflowSettings.coverFlowVerticalOffset !== undefined) extracted.coverFlowVerticalOffset = coverflowSettings.coverFlowVerticalOffset;
      if (coverflowSettings.coverFlowSideOpacity !== undefined) extracted.coverFlowSideOpacity = coverflowSettings.coverFlowSideOpacity;
      if (coverflowSettings.coverFlowShowButtons !== undefined) extracted.coverFlowShowButtons = coverflowSettings.coverFlowShowButtons;
      if (coverflowSettings.coverFlowButtonPosition !== undefined) extracted.coverFlowButtonPosition = coverflowSettings.coverFlowButtonPosition;
      if (coverflowSettings.coverFlowButtonColors !== undefined) extracted.coverFlowButtonColors = coverflowSettings.coverFlowButtonColors;
      if (coverflowSettings.backgroundBrightness !== undefined) {
        extracted.backgroundBrightnessByView = { ...extracted.backgroundBrightnessByView, coverflow: coverflowSettings.backgroundBrightness };
      }
    }

    // Extract per-game custom settings
    const perGameCustom: NonNullable<UserPreferences['perGameViewCustomByView']> = {
      grid: viewSections.gridView?.gamesCustomSettings || {},
      list: viewSections.listView?.gamesCustomSettings || {},
      logo: viewSections.logoView?.gamesCustomSettings || {},
      carousel: viewSections.carouselView?.gamesCustomSettings || {},
      coverflow: viewSections.coverflowView?.gamesCustomSettings || {},
    };

    extracted.perGameViewCustomByView = perGameCustom;
    extracted.currentResolution = resolution;

    return extracted;
  }

  private stripDuplicateFieldsForStorage(preferences: UserPreferences): UserPreferences {
    // Create a copy without the fields that are duplicated in sections
    const {
      // Grid view duplicates
      gridSize,
      gameTilePadding,
      showLogoOverBoxart,
      gridDescriptionSize,
      gridButtonSize,
      gridButtonLocation,
      gridButtonColors,

      // Per-view duplicates (stored individually in each view's settings)
      panelWidth,
      panelWidthByView,
      fanartHeight,
      fanartHeightByView,
      descriptionHeight,
      descriptionWidthByView,
      backgroundBrightnessByView,

      // List view duplicates
      listViewSize,
      listViewOptions,
      listButtonColors,

      // Logo view duplicates
      logoSize,
      logoPosition,
      logoBackgroundOpacity,
      logoViewSize,
      logoHeight,
      autoSizeToFit,
      logoButtonColors,

      // Carousel view duplicates
      showCarouselDetails,
      showCarouselLogos,
      detailsBarSize,
      carouselLogoSize,
      carouselButtonSize,
      carouselDescriptionSize,
      carouselDescriptionAlignment,
      carouselButtonAlignment,
      carouselLogoAlignment,
      carouselButtonColors,

      // Coverflow view duplicates
      coverFlowCoverSize,
      coverFlowReflection,
      coverFlowVerticalOffset,
      coverFlowSideOpacity,
      coverFlowShowButtons,
      coverFlowButtonPosition,
      coverFlowButtonColors,

      // Per-game custom settings (now in sections)
      perGameViewCustomByView,

      // Per-view category settings (now in each view's section)
      showCategoriesInGameListByView,
      categoriesPositionByView,
      categoriesAlignmentByView,
      categoriesSizeByView,

      // Right panel/details panel settings (now in each view's section)
      rightPanelLogoSize,
      rightPanelBoxartPosition,
      rightPanelBoxartSize,
      rightPanelTextSize,
      rightPanelButtonSize,
      rightPanelButtonLocation,
      rightPanelButtonColors,
      detailsPanelOpacity,

      ...rest
    } = preferences;

    // Keep only non-duplicated fields and sections
    return rest as UserPreferences;
  }

  private async normalizePreferences(preferences?: Partial<UserPreferences>): Promise<UserPreferences> {
    const defaults = this.createDefaultPreferences();

    // If sections exist, extract values from them first (sections are canonical)
    let fromSections: Partial<UserPreferences> = {};
    if (preferences?.sections) {
      fromSections = await this.extractFromSections(preferences.sections, preferences.currentResolution);
    }

    const merged: UserPreferences = {
      ...defaults,
      ...(preferences || {}),
      ...fromSections, // Override with values from sections if they exist
      rightPanelLogoSizeByView: this.mergeByViewMaps(
        defaults.rightPanelLogoSizeByView,
        preferences?.rightPanelLogoSizeByView,
        fromSections.rightPanelLogoSizeByView,
        preferences?.rightPanelLogoSize,
      ),
      rightPanelBoxartPositionByView: this.mergeByViewMaps(
        defaults.rightPanelBoxartPositionByView,
        preferences?.rightPanelBoxartPositionByView,
        fromSections.rightPanelBoxartPositionByView,
        preferences?.rightPanelBoxartPosition,
      ),
      rightPanelBoxartSizeByView: this.mergeByViewMaps(
        defaults.rightPanelBoxartSizeByView,
        preferences?.rightPanelBoxartSizeByView,
        fromSections.rightPanelBoxartSizeByView,
        preferences?.rightPanelBoxartSize,
      ),
      rightPanelTextSizeByView: this.mergeByViewMaps(
        defaults.rightPanelTextSizeByView,
        preferences?.rightPanelTextSizeByView,
        fromSections.rightPanelTextSizeByView,
        preferences?.rightPanelTextSize,
      ),
      rightPanelButtonSizeByView: this.mergeByViewMaps(
        defaults.rightPanelButtonSizeByView,
        preferences?.rightPanelButtonSizeByView,
        fromSections.rightPanelButtonSizeByView,
        preferences?.rightPanelButtonSize,
      ),
      rightPanelButtonLocationByView: this.mergeByViewMaps(
        defaults.rightPanelButtonLocationByView,
        preferences?.rightPanelButtonLocationByView,
        fromSections.rightPanelButtonLocationByView,
        preferences?.rightPanelButtonLocation,
      ),
      detailsPanelOpacityByView: this.mergeByViewMaps(
        defaults.detailsPanelOpacityByView,
        preferences?.detailsPanelOpacityByView,
        fromSections.detailsPanelOpacityByView,
        preferences?.detailsPanelOpacity,
      ),
      panelWidthByView: { ...defaults.panelWidthByView, ...(preferences?.panelWidthByView || {}), ...(fromSections.panelWidthByView || {}) },
      fanartHeightByView: { ...defaults.fanartHeightByView, ...(preferences?.fanartHeightByView || {}), ...(fromSections.fanartHeightByView || {}) },
      descriptionWidthByView: { ...defaults.descriptionWidthByView, ...(preferences?.descriptionWidthByView || {}), ...(fromSections.descriptionWidthByView || {}) },
      showCategoriesInGameListByView: { ...defaults.showCategoriesInGameListByView, ...(preferences?.showCategoriesInGameListByView || {}) },
      categoriesPositionByView: { ...defaults.categoriesPositionByView, ...(preferences?.categoriesPositionByView || {}) },
      categoriesAlignmentByView: { ...defaults.categoriesAlignmentByView, ...(preferences?.categoriesAlignmentByView || {}) },
      categoriesSizeByView: { ...defaults.categoriesSizeByView, ...(preferences?.categoriesSizeByView || {}) },
      backgroundBrightnessByView: { ...defaults.backgroundBrightnessByView, ...(preferences?.backgroundBrightnessByView || {}), ...(fromSections.backgroundBrightnessByView || {}) },
      listViewOptions: { ...defaults.listViewOptions, ...(preferences?.listViewOptions || {}), ...(fromSections.listViewOptions || {}) } as NonNullable<UserPreferences['listViewOptions']>,
      visibleDetails: { ...defaults.visibleDetails, ...(preferences?.visibleDetails || {}) } as NonNullable<UserPreferences['visibleDetails']>,
      topBarPositions: { ...defaults.topBarPositions, ...(preferences?.topBarPositions || {}) },
      rightPanelButtonColors: { ...defaults.rightPanelButtonColors, ...(preferences?.rightPanelButtonColors || {}) },
      carouselButtonColors: { ...defaults.carouselButtonColors, ...(preferences?.carouselButtonColors || {}) },
      gridButtonColors: { ...defaults.gridButtonColors, ...(preferences?.gridButtonColors || {}) },
      listButtonColors: { ...defaults.listButtonColors, ...(preferences?.listButtonColors || {}) },
      logoButtonColors: { ...defaults.logoButtonColors, ...(preferences?.logoButtonColors || {}) },
      coverFlowButtonColors: { ...defaults.coverFlowButtonColors, ...(preferences?.coverFlowButtonColors || {}) },
      perGameViewSizeOverrides: { ...defaults.perGameViewSizeOverrides, ...(preferences?.perGameViewSizeOverrides || {}) },
      perGameViewCustomByView: {
        grid: { ...(defaults.perGameViewCustomByView?.grid || {}), ...(preferences?.perGameViewCustomByView?.grid || {}), ...(fromSections.perGameViewCustomByView?.grid || {}) },
        list: { ...(defaults.perGameViewCustomByView?.list || {}), ...(preferences?.perGameViewCustomByView?.list || {}), ...(fromSections.perGameViewCustomByView?.list || {}) },
        logo: { ...(defaults.perGameViewCustomByView?.logo || {}), ...(preferences?.perGameViewCustomByView?.logo || {}), ...(fromSections.perGameViewCustomByView?.logo || {}) },
        carousel: { ...(defaults.perGameViewCustomByView?.carousel || {}), ...(preferences?.perGameViewCustomByView?.carousel || {}), ...(fromSections.perGameViewCustomByView?.carousel || {}) },
        coverflow: { ...(defaults.perGameViewCustomByView?.coverflow || {}), ...(preferences?.perGameViewCustomByView?.coverflow || {}), ...(fromSections.perGameViewCustomByView?.coverflow || {}) },
      },
      perGameViewSizeOverridesMigrated: preferences?.perGameViewSizeOverridesMigrated ?? defaults.perGameViewSizeOverridesMigrated,
      isViewFlippedByView: {
        grid: false,
        list: false,
        logo: false,
        carousel: false,
        coverflow: false,
        ...(preferences?.isViewFlippedByView || {}),
      },
    };

    if (preferences?.sections && Object.keys(preferences.sections).length > 0) {
      merged.sections = preferences.sections;
    } else {
      merged.sections = this.buildReadableSections(merged);
    }
    merged.currentResolution = preferences?.currentResolution || fromSections.currentResolution || await this.getCurrentResolution();

    return merged;
  }

  private normalizeCustomDefaults(customDefaults: any): CustomDefaultsByResolution {
    const safe: CustomDefaultsByResolution = {};
    if (!customDefaults || typeof customDefaults !== 'object') {
      return safe;
    }

    const resolutions: ResolutionKey[] = ['720p', '1080p', '1440p', '4K'];
    const viewModes: ViewMode[] = ['grid', 'list', 'logo', 'carousel', 'coverflow'];

    for (const resolution of resolutions) {
      const byView = customDefaults[resolution];
      if (!byView || typeof byView !== 'object') {
        continue;
      }

      const normalizedByView: Partial<Record<ViewMode, Record<string, any>>> = {};
      for (const mode of viewModes) {
        const settings = byView[mode];
        if (settings && typeof settings === 'object') {
          normalizedByView[mode] = settings;
        }
      }

      if (Object.keys(normalizedByView).length > 0) {
        safe[resolution] = normalizedByView;
      }
    }

    return safe;
  }

  /**
   * Get user preferences
   */
  async getPreferences(): Promise<UserPreferences> {
    return this.withStoreWrite(async () => {
      const store = await this.ensureStore();
      const current = store.get('preferences', this.createDefaultPreferences()) as Partial<UserPreferences>;
      const normalized = await this.normalizePreferences(current);
      const currentSchemaVersion = store.get('schemaVersion', 0) as number;

      if (currentSchemaVersion !== this.schemaVersion) {
        store.set('schemaVersion', this.schemaVersion);
      }

      // Only save the cleaned version without duplicates
      const forStorage = this.stripDuplicateFieldsForStorage(normalized);
      store.set('preferences', forStorage);

      // But return the full normalized version for app use
      return normalized;
    });
  }

  /**
   * Save user preferences
   */
  async savePreferences(preferences: Partial<UserPreferences>): Promise<void> {
    await this.withStoreWrite(async () => {
      const store = await this.ensureStore();
      const current = await this.normalizePreferences(store.get('preferences', this.createDefaultPreferences()));
      const baseSections = preferences.sections ?? current.sections;
      const mergedInput: Partial<UserPreferences> = {
        ...current,
        ...preferences,
        // Only normalize from sections when explicitly provided to avoid overwriting fresh updates.
        sections: preferences.sections ? preferences.sections : undefined,
        currentResolution: preferences.currentResolution ?? current.currentResolution,
      };
      const merged = await this.normalizePreferences(mergedInput);

      // Update current resolution sections from merged values so UI changes persist
      const resolutionKey = merged.currentResolution || await this.getCurrentResolution();
      const rebuiltSections = this.buildReadableSections(merged);
      merged.sections = {
        ...(baseSections || {}),
        [resolutionKey]: rebuiltSections[resolutionKey],
      };

      // Strip duplicate fields before saving to disk (sections are the source of truth)
      const forStorage = this.stripDuplicateFieldsForStorage(merged);
      store.set('preferences', forStorage);
      store.set('schemaVersion', this.schemaVersion);
    });
  }

  /**
   * Reset preferences to defaults
   */
  async resetPreferences(): Promise<void> {
    await this.withStoreWrite(async () => {
      const store = await this.ensureStore();
      const defaults = this.createDefaultPreferences();
      const forStorage = this.stripDuplicateFieldsForStorage(defaults);
      store.set('preferences', forStorage);
      store.set('customDefaults', {});
      store.set('schemaVersion', this.schemaVersion);
    });
  }

  async getBaselineDefaults(): Promise<BaselineDefaults> {
    return this.createBaselineDefaults();
  }

  async hasCustomDefaults(): Promise<boolean> {
    const store = await this.ensureStore();
    const customDefaults = this.normalizeCustomDefaults(store.get('customDefaults', {}));
    return Object.values(customDefaults).some((value) => value && Object.keys(value).length > 0);
  }

  async getCustomDefaults(): Promise<CustomDefaultsByResolution> {
    const store = await this.ensureStore();
    return this.normalizeCustomDefaults(store.get('customDefaults', {}));
  }

  async saveCustomDefaults(settings: Record<string, any>, resolution?: string): Promise<void> {
    if (!settings || typeof settings !== 'object') {
      return;
    }

    const store = await this.ensureStore();
    const current = this.normalizeCustomDefaults(store.get('customDefaults', {}));
    const resolutionKey = this.normalizeResolutionKey(resolution);
    const viewModes: ViewMode[] = ['grid', 'list', 'logo', 'carousel', 'coverflow'];

    const nextForResolution: Partial<Record<ViewMode, Record<string, any>>> = {
      ...(current[resolutionKey] || {}),
    };

    for (const mode of viewModes) {
      const modeSettings = settings[mode];
      if (modeSettings && typeof modeSettings === 'object') {
        nextForResolution[mode] = modeSettings;
      }
    }

    current[resolutionKey] = nextForResolution;
    store.set('customDefaults', current);
  }

  async setCustomDefaults(customDefaults: CustomDefaultsByResolution): Promise<void> {
    const store = await this.ensureStore();
    store.set('customDefaults', this.normalizeCustomDefaults(customDefaults));
  }

  async restoreCustomDefaults(options: { viewMode: ViewMode; scope: 'current' | 'all'; resolution?: string }): Promise<any> {
    const customDefaults = await this.getCustomDefaults();
    const resolutionKey = this.normalizeResolutionKey(options.resolution);
    const byResolution = customDefaults[resolutionKey] || {};

    if (options.scope === 'all') {
      return byResolution;
    }

    return byResolution[options.viewMode] || null;
  }

  /**
   * Get count of per-game settings across all view modes
   */
  async getPerGameSettingsCount(): Promise<number> {
    const preferences = await this.getPreferences();
    const perGameByView = preferences.perGameViewCustomByView || {};

    let count = 0;
    for (const viewMode of ['grid', 'list', 'logo', 'carousel', 'coverflow']) {
      const gameSettings = perGameByView[viewMode as ViewMode] || {};
      count += Object.keys(gameSettings).length;
    }

    return count;
  }

  /**
   * Get list of all saved defaults with metadata
   */
  async getSavedDefaultsList(): Promise<Array<{
    resolution: ResolutionKey;
    viewMode: ViewMode;
    lastModified?: string;
    hasPerGameSettings: boolean;
  }>> {
    const preferences = await this.getPreferences();
    const customDefaults = await this.getCustomDefaults();
    const perGameByView = preferences.perGameViewCustomByView || {};
    const list: Array<{
      resolution: ResolutionKey;
      viewMode: ViewMode;
      lastModified?: string;
      hasPerGameSettings: boolean;
    }> = [];

    const resolutions: ResolutionKey[] = ['720p', '1080p', '1440p', '4K'];
    const viewModes: ViewMode[] = ['grid', 'list', 'logo', 'carousel', 'coverflow'];

    for (const resolution of resolutions) {
      const byResolution = customDefaults[resolution] || {};
      for (const viewMode of viewModes) {
        if (byResolution[viewMode]) {
          const gameSettings = perGameByView[viewMode as ViewMode] || {};
          list.push({
            resolution,
            viewMode,
            hasPerGameSettings: Object.keys(gameSettings).length > 0,
          });
        }
      }
    }

    return list;
  }

  /**
   * Delete a specific custom default
   */
  async deleteCustomDefault(options: { resolution: ResolutionKey; viewMode: ViewMode }): Promise<void> {
    const store = await this.ensureStore();
    const current = this.normalizeCustomDefaults(store.get('customDefaults', {}));

    const resolutionDefaults = current[options.resolution];
    if (resolutionDefaults && resolutionDefaults[options.viewMode]) {
      delete resolutionDefaults[options.viewMode];

      // Clean up empty resolution objects
      if (Object.keys(resolutionDefaults).length === 0) {
        delete current[options.resolution];
      }

      store.set('customDefaults', current);
    }
  }

  /**
   * Validate an import file and return metadata about its contents
   */
  async validateImportFile(data: any): Promise<{
    valid: boolean;
    resolutions?: ResolutionKey[];
    viewModes?: ViewMode[];
    perGameSettingsCount?: number;
    hasConflicts?: boolean;
    conflictDetails?: Array<{ resolution: ResolutionKey; viewMode: ViewMode }>;
    error?: string;
  }> {
    try {
      // Check if data has the expected structure
      const importedCustomDefaults = data?.customDefaults || data;

      if (!importedCustomDefaults || typeof importedCustomDefaults !== 'object') {
        return { valid: false, error: 'Invalid file format: missing customDefaults' };
      }

      const resolutions: ResolutionKey[] = [];
      const viewModes = new Set<ViewMode>();
      let perGameSettingsCount = 0;
      const conflictDetails: Array<{ resolution: ResolutionKey; viewMode: ViewMode }> = [];

      // Parse resolutions and view modes
      const validResolutions: ResolutionKey[] = ['720p', '1080p', '1440p', '4K'];
      const validViewModes: ViewMode[] = ['grid', 'list', 'logo', 'carousel', 'coverflow'];

      for (const resolution of validResolutions) {
        const byResolution = importedCustomDefaults[resolution];
        if (byResolution && typeof byResolution === 'object') {
          resolutions.push(resolution);

          for (const viewMode of validViewModes) {
            if (byResolution[viewMode]) {
              viewModes.add(viewMode);
            }
          }
        }
      }

      // Count per-game settings if present
      if (data?.perGameViewCustomByView) {
        for (const viewMode of validViewModes) {
          const gameSettings = data.perGameViewCustomByView[viewMode] || {};
          perGameSettingsCount += Object.keys(gameSettings).length;
        }
      }

      // Check for conflicts with existing saved defaults
      const existingDefaults = await this.getCustomDefaults();
      for (const resolution of resolutions) {
        const byResolution = importedCustomDefaults[resolution];
        if (byResolution && existingDefaults[resolution]) {
          for (const viewMode of validViewModes) {
            if (byResolution[viewMode] && existingDefaults[resolution][viewMode]) {
              conflictDetails.push({ resolution, viewMode: viewMode as ViewMode });
            }
          }
        }
      }

      return {
        valid: true,
        resolutions,
        viewModes: Array.from(viewModes),
        perGameSettingsCount,
        hasConflicts: conflictDetails.length > 0,
        conflictDetails,
      };
    } catch (error) {
      return { valid: false, error: String(error) };
    }
  }

  /**
   * Export custom defaults selectively
   */
  async exportCustomDefaultsSelective(options: {
    resolutions: ResolutionKey[];
    viewModes: ViewMode[];
    includePerGameSettings: boolean;
    currentResolution: ResolutionKey;
  }): Promise<{
    customDefaults: Partial<CustomDefaultsByResolution>;
    perGameViewCustomByView?: any;
  }> {
    const preferences = await this.getPreferences();
    const allCustomDefaults = await this.getCustomDefaults();
    const exportData: Partial<CustomDefaultsByResolution> = {};

    const viewSectionKey: Record<ViewMode, 'gridView' | 'listView' | 'logoView' | 'carouselView' | 'coverflowView'> = {
      grid: 'gridView',
      list: 'listView',
      logo: 'logoView',
      carousel: 'carouselView',
      coverflow: 'coverflowView',
    };

    // Export selected resolutions and view modes
    for (const resolution of options.resolutions) {
      const filteredByView: Partial<Record<ViewMode, Record<string, any>>> = {};
      const sectionByResolution = preferences.sections?.[resolution];
      const defaultsByResolution = allCustomDefaults[resolution] || {};

      for (const viewMode of options.viewModes) {
        const sectionKey = viewSectionKey[viewMode];
        const section = sectionByResolution?.[sectionKey] as { settings?: Record<string, any> } | undefined;
        const sectionSettings = section?.settings;

        if (sectionSettings && typeof sectionSettings === 'object') {
          filteredByView[viewMode] = sectionSettings;
        } else if (defaultsByResolution[viewMode]) {
          filteredByView[viewMode] = defaultsByResolution[viewMode] as Record<string, any>;
        }
      }

      if (Object.keys(filteredByView).length > 0) {
        exportData[resolution] = filteredByView;
      }
    }

    // Include per-game settings if requested
    let perGameSettings: any = undefined;
    if (options.includePerGameSettings) {
      perGameSettings = preferences.perGameViewCustomByView || {};
    }

    return {
      customDefaults: exportData,
      ...(perGameSettings && { perGameViewCustomByView: perGameSettings }),
    };
  }

  /**
   * Import custom defaults selectively
   */
  async importCustomDefaultsSelective(options: {
    data: any;
    includePerGameSettings: boolean;
    mergeStrategy: 'overwrite' | 'keep';
  }): Promise<void> {
    const store = await this.ensureStore();
    const importedCustomDefaults = options.data?.customDefaults || options.data;

    if (!importedCustomDefaults || typeof importedCustomDefaults !== 'object') {
      throw new Error('Invalid import data format');
    }

    const current = this.normalizeCustomDefaults(store.get('customDefaults', {}));
    const merged = { ...current };
    const currentPreferences = await this.getPreferences();

    const viewSectionKey: Record<ViewMode, 'gridView' | 'listView' | 'logoView' | 'carouselView' | 'coverflowView'> = {
      grid: 'gridView',
      list: 'listView',
      logo: 'logoView',
      carousel: 'carouselView',
      coverflow: 'coverflowView',
    };

    // Merge custom defaults based on strategy
    const validResolutions: ResolutionKey[] = ['720p', '1080p', '1440p', '4K'];
    const validViewModes: ViewMode[] = ['grid', 'list', 'logo', 'carousel', 'coverflow'];

    const mergedSections: NonNullable<UserPreferences['sections']> = {
      ...(currentPreferences.sections || {}),
    } as NonNullable<UserPreferences['sections']>;

    for (const resolution of validResolutions) {
      const importedByResolution = importedCustomDefaults[resolution];
      if (importedByResolution && typeof importedByResolution === 'object') {
        if (!merged[resolution]) {
          merged[resolution] = {};
        }

        const existingResolutionSections = (mergedSections[resolution] || {}) as NonNullable<UserPreferences['sections']>[ResolutionKey];

        for (const viewMode of validViewModes) {
          const importedViewSettings = importedByResolution[viewMode];
          if (importedViewSettings) {
            if (options.mergeStrategy === 'overwrite' || !merged[resolution][viewMode]) {
              merged[resolution][viewMode] = importedViewSettings;
            }

            const sectionKey = viewSectionKey[viewMode];
            const existingSection = (existingResolutionSections as any)[sectionKey] || {};
            const existingSettings = existingSection.settings;

            if (options.mergeStrategy === 'overwrite' || !existingSettings) {
              (existingResolutionSections as any)[sectionKey] = {
                ...existingSection,
                settings: importedViewSettings,
              };
            }
          }
        }

        mergedSections[resolution] = existingResolutionSections as NonNullable<UserPreferences['sections']>[ResolutionKey];
      }
    }

    store.set('customDefaults', merged);

    // Import per-game settings if requested
    if (options.includePerGameSettings && options.data?.perGameViewCustomByView) {
      const importedPerGame = options.data.perGameViewCustomByView;

      const mergedPerGame = {
        ...currentPreferences.perGameViewCustomByView,
      };

      for (const viewMode of validViewModes) {
        if (importedPerGame[viewMode]) {
          if (options.mergeStrategy === 'overwrite') {
            mergedPerGame[viewMode] = {
              ...mergedPerGame[viewMode],
              ...importedPerGame[viewMode],
            };
          } else {
            // Keep existing, only add new games
            mergedPerGame[viewMode] = {
              ...importedPerGame[viewMode],
              ...mergedPerGame[viewMode],
            };
          }
        }
      }

      await this.savePreferences({
        sections: mergedSections,
        perGameViewCustomByView: mergedPerGame,
      });
    } else {
      await this.savePreferences({ sections: mergedSections });
    }
  }
}
