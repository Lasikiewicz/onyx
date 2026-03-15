export interface Game {
  id: string;
  title: string;
  sortingName?: string;
  platform: 'steam' | 'other' | string;
  exePath: string;
  launchArgs?: string;
  boxArtUrl: string;
  bannerUrl: string;
  alternativeBannerUrl?: string;
  useAlternativeBackground?: boolean;
  /** When true, boxArtUrl is a .webm video; render with <video> instead of <img>. */
  boxArtIsVideo?: boolean;
  /** When true, bannerUrl is a .webm video. */
  bannerIsVideo?: boolean;
  /** When true, alternativeBannerUrl is a .webm video. */
  alternativeBannerIsVideo?: boolean;
  /** When true, logoUrl is a .webm video. */
  logoIsVideo?: boolean;
  /** When true, heroUrl is a .webm video. */
  heroIsVideo?: boolean;
  /** When true, iconUrl is a .webm video. */
  iconIsVideo?: boolean;
  logoUrl?: string;
  logoSize?: number;
  logoSizePerViewMode?: {
    carousel?: number;
    coverflow?: number;
    grid?: number;
    logo?: number;
    list?: number;
  };
  heroUrl?: string;
  iconUrl?: string; // Game icon (typically 32x32 or 64x64)
  description?: string; // Can contain HTML markup for rich formatting
  genres?: string[];
  developers?: string[];
  publishers?: string[];
  categories?: string[];
  features?: string[];
  tags?: string[];
  releaseDate?: string;
  series?: string;
  ageRating?: string;
  region?: string;
  source?: string;
  completionStatus?: string;
  userScore?: number;
  criticScore?: number;
  communityScore?: number;
  installationDirectory?: string;
  installSize?: number;
  playtime?: number;
  lastPlayed?: string;
  playCount?: number;
  dateAdded?: string;
  favorite?: boolean;
  pinned?: boolean;
  hidden?: boolean;
  broken?: boolean;
  notes?: string;
  modManagerUrl?: string;
  removeLogoTransparency?: boolean;
  links?: Array<{ name: string; url: string; hidden?: boolean; iconUrl?: string }>;
  actions?: Array<{ name: string; path: string; arguments?: string; workingDir?: string }>;
  scripts?: Array<{ name: string; script: string }>;
  xboxKind?: 'uwp' | 'pc';
  packageFamilyName?: string;
  appUserModelId?: string;
  launchUri?: string;
  screenshots?: string[];
  lockedFields?: {
    title?: boolean;
    boxArtUrl?: boolean;
    bannerUrl?: boolean;
    alternativeBannerUrl?: boolean;
    exePath?: boolean;
    [key: string]: boolean | undefined;
  };
}

export interface GameMetadata {
  boxArtUrl: string;
  bannerUrl: string;
  alternativeBannerUrl?: string;
  logoUrl?: string;
  heroUrl?: string;
  iconUrl?: string; // Game icon (typically 32x32 or 64x64)
  screenshots?: string[];
  // Text metadata
  title?: string;
  description?: string;
  summary?: string;
  releaseDate?: string;
  genres?: string[];
  developers?: string[];
  publishers?: string[];
  ageRating?: string;
  rating?: number;
  platforms?: string[];
  platform?: string;
  categories?: string[];
  // Install info
  installPath?: string;
  installSize?: number;
  executablePath?: string;
}

export interface ExecutableFile {
  fileName: string;
  fullPath: string;
}

export interface MissingGame {
  id: string;
  title: string;
  exePath?: string;
  platform?: string;
  source?: string;
}

export interface UserPreferences {
  gridSize?: number;
  logoSize?: number;
  panelWidth?: number;
  panelWidthByView?: { grid?: number; list?: number; logo?: number; carousel?: number; coverflow?: number };
  fanartHeight?: number;
  fanartHeightByView?: { grid?: number; list?: number; logo?: number; };
  descriptionHeight?: number;
  boxartWidth?: number;
  descriptionWidth?: number;
  descriptionWidthByView?: { grid?: number; list?: number; logo?: number; };
  pinnedCategories?: string[];
  disableAllAnimations?: boolean;
  // New per-type animation controls
  disableAnimatedBanners?: boolean;
  disableAnimatedBoxarts?: boolean;
  disableAnimatedBackgrounds?: boolean;
  disableAnimatedIcons?: boolean;
  disableAnimatedLogos?: boolean;
  minimizeToTray?: boolean;
  showSystemTrayIcon?: boolean;
  startWithComputer?: boolean;
  startMinimized?: boolean;
  startClosedToTray?: boolean;
  updateLibrariesOnStartup?: boolean;
  checkForUpdatesOnStartup?: boolean;
  minimizeOnGameLaunch?: boolean;
  enableSuspendFeature?: boolean;
  suspendShortcut?: string;
  enableHardwareAcceleration?: boolean;
  closeToTray?: boolean;
  confirmGameLaunch?: boolean;
  restoreAfterLaunch?: boolean;
  defaultStartupPage?: 'library' | 'recent' | 'favorites';
  perGameViewSizeOverrides?: Record<string, { grid?: number; list?: number; logo?: number; carousel?: number; coverflow?: number }>;
  perGameViewCustomByView?: {
    grid?: Record<string, { gameName?: string; size: number }>;
    list?: Record<string, { gameName?: string; size: number }>;
    logo?: Record<string, { gameName?: string; size: number }>;
    carousel?: Record<string, { gameName?: string; size: number }>;
    coverflow?: Record<string, { gameName?: string; size: number }>;
  };
  perGameViewSizeOverridesMigrated?: boolean;
  sections?: Record<string, any>;
  hideVRTitles?: boolean;
  hideAppsTitles?: boolean;
  hideGameTitles?: boolean;
  gameTilePadding?: number;
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
  autoSizeToFit?: boolean;
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
  activeGameId?: string | null;
  linkDisplayMode?: 'icons' | 'dropdown';
  visibleLinkTypes?: Record<string, boolean>;
  linkDisplayOrder?: string[];
  ignoredGames?: string[];
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
  topBarPositions?: {
    searchBar?: 'left' | 'middle' | 'right';
    sortBy?: 'left' | 'middle' | 'right';
    launcher?: 'left' | 'middle' | 'right';
    categories?: 'left' | 'middle' | 'right';
  };
  isFirstLaunch?: boolean;
  hasSeenPostImportTutorial?: boolean;
  isViewFlippedByView?: Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', boolean>;
  // Fullscreen settings
  startInFullscreen?: boolean;
  hideMouseCursorInFullscreen?: boolean;
  cursorHideTimeout?: number;
  // Gamepad settings
  enableGamepadSupport?: boolean;
  gamepadNavigationSpeed?: number;
  gamepadButtonLayout?: 'xbox' | 'playstation';
  // Button colors per view
  rightPanelButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  carouselButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  gridButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  listButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  logoButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  coverFlowCoverSize?: number;
  coverFlowReflection?: number;
  coverFlowVerticalOffset?: number;
  coverFlowSideOpacity?: number;
  coverFlowShowButtons?: boolean;
  coverFlowButtonPosition?: 'left' | 'middle' | 'right';
  coverFlowButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  currentResolution?: '720p' | '1080p' | '1440p' | '4K';
  storeMetadataLocally?: boolean;
  optimizeImagesInBackground?: boolean;
  optimizationPerformance?: 'low' | 'balanced' | 'high';
}

export type UpdateStatus = 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';

export interface UpdateStatusPayload {
  status: UpdateStatus;
  version?: string;
  error?: string;
}

declare global {
  interface Window {
    // Note: Raw `ipcRenderer` is intentionally NOT exposed; use `electronAPI.on()` and `electronAPI.off()` for event subscriptions.
    electronAPI: {
      on?: (channel: string, callback: (...args: any[]) => void) => (() => void) | undefined;
      off?: (channel: string, callback: (...args: any[]) => void) => void;
      showWindow: () => void;
      ready: () => void;
      scanSteamGames: () => Promise<import('./steam').SteamGame[]>;
      getSteamPath: () => Promise<string | null>;
      setSteamPath: (path: string) => Promise<{ success: boolean; error?: string }>;
      scanGamesWithPath: (path?: string, autoMerge?: boolean) => Promise<{ success: boolean; error?: string; games: import('./steam').SteamGame[] }>;
      getLibrary: () => Promise<Game[]>;
      clearLibrary: () => Promise<{ success: boolean; error?: string }>;
      clearAllImages: () => Promise<{ success: boolean; error?: string }>;
      clearAllLinks: () => Promise<{ success: boolean; error?: string }>;
      migratePerGameViewSizeOverrides: () => Promise<{ success: boolean; overrides: Record<string, { grid?: number; list?: number; logo?: number; carousel?: number; coverflow?: number }>; error?: string }>;
      saveGame: (game: Game, oldGame?: Game) => Promise<boolean>;
      deleteCachedImage: (gameId: string, imageType: 'boxart' | 'banner' | 'logo' | 'hero' | 'icon') => Promise<{ success: boolean; error?: string }>;
      optimizeImageCache: (options?: { webpOnly?: boolean; forceProcessOverBytes?: number; forceAnimatedWebp?: boolean }) => Promise<{ success: boolean; error?: string; optimized?: number; skipped?: number; failed?: number }>;
      onOptimizeProgress: (callback: (data: { phase: string; current: number; total: number; fileName: string; status?: string; originalBytes?: number; optimizedBytes?: number }) => void) => () => void;
      getFfmpegStatus: () => Promise<{ available: boolean; source: 'bundled' | 'system' | null }>;
      getImageQueueStatus: () => Promise<{ queued: number; completed: number; imagesQueued?: number; imagesCompleted?: number; currentGameTitle?: string; imageIndex?: number; imageTotal?: number; imageType?: string; phase?: string; currentFileName?: string; originalBytes?: number; optimizedBytes?: number; imageJobs?: { gameId: string; gameTitle: string; imageType: string; phase: 'queued' | 'downloading' | 'optimizing' | 'done' | 'failed' | 'skipped'; fileName?: string; originalBytes?: number; optimizedBytes?: number }[] }>;
       onImageQueueStatus: (callback: (status: { queued: number; completed: number; imagesQueued?: number; imagesCompleted?: number; currentGameTitle?: string; imageIndex?: number; imageTotal?: number; imageType?: string; phase?: string; currentFileName?: string; originalBytes?: number; optimizedBytes?: number; imageJobs?: { gameId: string; gameTitle: string; imageType: string; phase: 'queued' | 'downloading' | 'optimizing' | 'done' | 'failed' | 'skipped'; fileName?: string; originalBytes?: number; optimizedBytes?: number }[] }) => void) => () => void;
      optimization?: {
        getStatus: () => Promise<import('./optimization').OptimizationStatus>;
        clearStatus: () => Promise<{ success: boolean; error?: string }>;
        getDiagnostics?: () => Promise<{
          ffmpeg: { path: string; available: boolean; source: 'bundled' | 'system' | null };
          workerAvailable: boolean;
          worker?: {
            workerPath: string;
            workerPathExists: boolean;
            workerFailed: boolean;
            consecutiveWorkerExits: number;
            hasLiveWorker: boolean;
            isPackaged: boolean;
          };
          sharp?: {
            appPath: string;
            unpackedAppPath: string;
            unpackedNodeModulesPath: string;
            sharpResolvedPath: string | null;
            sharpLoadable: boolean;
            sharpLoadError: string | null;
            dependencyChecks: Array<{ moduleId: string; resolvedPath: string | null; loadable: boolean; error: string | null }>;
            unpackedPresence: {
              sharp: boolean;
              semver: boolean;
              detectLibc: boolean;
              img: boolean;
            };
          };
          startupDiagnostics?: {
            collectedAt: string;
            ffmpeg: { path: string; available: boolean; source: 'bundled' | 'system' | null };
            worker: {
              workerPath: string;
              workerPathExists: boolean;
              workerFailed: boolean;
              consecutiveWorkerExits: number;
              hasLiveWorker: boolean;
              isPackaged: boolean;
            };
            sharp: {
              appPath: string;
              unpackedAppPath: string;
              unpackedNodeModulesPath: string;
              sharpResolvedPath: string | null;
              sharpLoadable: boolean;
              sharpLoadError: string | null;
              dependencyChecks: Array<{ moduleId: string; resolvedPath: string | null; loadable: boolean; error: string | null }>;
              unpackedPresence: {
                sharp: boolean;
                semver: boolean;
                detectLibc: boolean;
                img: boolean;
              };
            };
          };
          appPath: string;
          isPackaged: boolean;
          execPath: string;
          platform: string;
          arch: string;
          nodeVersion: string;
          versions: NodeJS.ProcessVersions;
          cacheDir: string;
          isAlpha?: boolean;
        }>;
        onStatus: (callback: (status: import('./optimization').OptimizationStatus) => void) => () => void;
      };
      optimizeGames: (options?: { gameIds?: string[]; allGames?: boolean }) => Promise<{ success: boolean; queuedGames: number; queuedImages: number; error?: string }>;
      reorderGames: (games: Game[]) => Promise<boolean>;
      addCustomGame: (gameData: { title: string; exePath: string }) => Promise<Game | null>;
      deleteGame: (gameId: string) => Promise<boolean>;
      showOpenDialog: () => Promise<string | null>;
      showFolderDialog: () => Promise<string | null>;
      showImageDialog: () => Promise<string | null>;
      showImageOrWebmDialog: () => Promise<string | null>;
      cacheLocalFile: (filePath: string, gameId: string, imageType: string) => Promise<{ url: string | null; isVideo: boolean; error?: string }>;
      scanFolderForExecutables: (folderPath: string) => Promise<ExecutableFile[]>;
      searchArtwork: (title: string, steamAppId?: string, bypassCache?: boolean) => Promise<GameMetadata | null>;
      fetchGameDescription: (steamGameId: string) => Promise<{ success: boolean; description?: string; summary?: string; releaseDate?: string; genres?: string[]; developers?: string[]; publishers?: string[]; ageRating?: string; rating?: number; platforms?: string[]; categories?: string[]; error?: string }>;
      validateMetadataProviders: () => Promise<Record<string, boolean>>;
      fetchAndUpdateMetadata: (gameId: string, title: string) => Promise<{ success: boolean; metadata: GameMetadata | null }>;
      setIGDBConfig: (config: { clientId: string; accessToken: string }) => Promise<boolean>;
      setMockMode: (enabled: boolean) => Promise<boolean>;
      searchMetadata: (gameTitle: string) => Promise<{ success: boolean; error?: string; results: Array<{ id: number; name: string; summary?: string; coverUrl?: string; screenshotUrls?: string[]; logoUrl?: string; rating?: number; releaseDate?: number; genres?: string[]; platform?: string; ageRating?: string; categories?: string[] }> }>;
      searchGames: (gameTitle: string) => Promise<{ success: boolean; error?: string; results: Array<{ id: string; title: string; source: string; externalId?: string | number; steamAppId?: string; year?: number; platform?: string }> }>;
      searchAndMatch: (scannedGame: any, searchQuery?: string) => Promise<{ success: boolean; error?: string; match?: any; results?: any[] }>;
      fixMatch: (query: string, scannedGame?: any) => Promise<{ success: boolean; error?: string; matchedGame?: any; metadata?: any }>;
      fetchAndUpdateByProviderId: (gameId: string, providerId: string, providerSource: string) => Promise<{ success: boolean; error?: string; metadata: GameMetadata | null }>;
      fetchMetadataOnlyByProviderId: (gameId: string, providerId: string, providerSource: string) => Promise<{ success: boolean; error?: string; metadata: Partial<GameMetadata> | null }>;
      launchGame: (gameId: string) => Promise<{ success: boolean; error?: string; pid?: number }>;
      launchModManager: (gameId: string) => Promise<{ success: boolean; error?: string }>;
      openGameUninstaller: (gameId: string) => Promise<{ success: boolean; error?: string; openedUninstaller?: boolean }>;
      getAppConfigs: () => Promise<Record<string, { id: string; name: string; enabled: boolean; path: string; autoAdd?: boolean; syncPlaytime?: boolean }>>;
      getAppConfig: (appId: string) => Promise<{ id: string; name: string; enabled: boolean; path: string; autoAdd?: boolean; syncPlaytime?: boolean } | null>;
      saveAppConfig: (config: { id: string; name: string; enabled: boolean; path: string; autoAdd?: boolean }) => Promise<{ success: boolean; error?: string }>;
      saveAppConfigs: (configs: Array<{ id: string; name: string; enabled: boolean; path: string; autoAdd?: boolean }>) => Promise<{ success: boolean; error?: string }>;
      getManualFolders: () => Promise<string[]>;
      saveManualFolders: (folders: string[]) => Promise<{ success: boolean; error?: string }>;
      getManualFolderConfigs: () => Promise<Record<string, { id: string; name: string; path: string; enabled: boolean; autoCategory?: string[]; icon?: string }>>;
      saveManualFolderConfig: (config: { id: string; name: string; path: string; enabled: boolean; autoCategory?: string[]; icon?: string }) => Promise<{ success: boolean; error?: string }>;
      deleteManualFolderConfig: (folderId: string) => Promise<{ success: boolean; error?: string }>;
      getSteamAuthState?: () => Promise<{ authenticated: boolean; steamId?: string; username?: string }>;
      authenticateSteam?: () => Promise<{ success: boolean; steamId?: string; username?: string; error?: string }>;
      importAllSteamGames?: (path: string) => Promise<{ success: boolean; importedCount?: number; error?: string }>;
      clearSteamAuth?: () => Promise<{ success: boolean; error?: string }>;
      syncSteamPlaytime?: () => Promise<{ success: boolean; updatedCount?: number; totalGames?: number; error?: string }>;
      scanXboxGames: (path: string, autoMerge?: boolean) => Promise<{ success: boolean; error?: string; games: Array<{ id: string; name: string; installPath: string; type: string; packageFamilyName?: string; appId?: string; appUserModelId?: string; launchUri?: string }> }>;
      onMenuEvent: (channel: string, callback: () => void) => () => void;
      getPreferences: () => Promise<UserPreferences>;
      savePreferences: (preferences: UserPreferences) => Promise<{ success: boolean; error?: string }>;
      requestExit: () => Promise<{ shouldMinimizeToTray: boolean; canMinimizeToTray: boolean }>;

      exit: () => Promise<void>;
      minimizeToTray: () => Promise<void>;
      applySystemTraySettings: (settings: { showSystemTrayIcon: boolean; minimizeToTray: boolean }) => Promise<{ success: boolean; error?: string }>;
      applyStartupSettings: (settings: { startWithComputer: boolean; startMinimized: boolean; startClosedToTray: boolean }) => Promise<{ success: boolean; error?: string }>;
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      getAppProfile?: () => Promise<'alpha' | 'production'>;
      getAPICredentials: () => Promise<{ igdbClientId?: string; igdbClientSecret?: string; steamGridDBApiKey?: string; rawgApiKey?: string; giantBombApiKey?: string }>;
      saveAPICredentials: (credentials: { igdbClientId?: string; igdbClientSecret?: string; steamGridDBApiKey?: string; rawgApiKey?: string; giantBombApiKey?: string }) => Promise<{ success: boolean; error?: string }>;
      detectLaunchers: () => Promise<Array<{ id: string; name: string; path: string; detected: boolean; detectionMethod: 'registry' | 'path' | 'none' }>>;
      detectLauncher: (launcherId: string) => Promise<{ id: string; name: string; path: string; detected: boolean; detectionMethod: 'registry' | 'path' | 'none' } | null>;
      getBackgroundScanEnabled: () => Promise<boolean>;
      setBackgroundScanEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      getBackgroundScanIntervalMinutes: () => Promise<number>;
      setBackgroundScanIntervalMinutes: (minutes: number) => Promise<{ success: boolean; error?: string }>;
      pauseBackgroundScan: () => Promise<{ success: boolean; error?: string }>;
      resumeBackgroundScan: () => Promise<{ success: boolean; error?: string }>;
      getLastBackgroundScan: () => Promise<number | undefined>;
      toggleDevTools: () => Promise<{ success: boolean; error?: string }>;
      minimizeWindow: () => Promise<{ success: boolean; error?: string }>;
      restoreWindow: () => Promise<{ success: boolean; error?: string }>;
      maximizeWindow: () => Promise<{ success: boolean; error?: string }>;
      closeWindow: () => Promise<{ success: boolean; error?: string }>;
      resetApp: () => Promise<{ success: boolean; error?: string }>;
      clearGameLibrary: () => Promise<{ success: boolean; error?: string }>;
      cancelScanAllSources: () => Promise<{ success: boolean; error?: string }>;
      cancelStartupScan: () => Promise<{ success: boolean; error?: string }>;
      scanAllSources: () => Promise<{ success: boolean; error?: string; games: Array<{ uuid: string; source: string; originalName: string; installPath: string; exePath?: string; appId?: string; packageFamilyName?: string; appUserModelId?: string; launchUri?: string; xboxKind?: 'uwp' | 'pc'; title: string; status: 'pending' | 'scanning' | 'matched' | 'ambiguous' | 'ready' | 'error'; error?: string }> }>;
      saveCrashDumps: () => Promise<{ saved?: boolean; canceled?: boolean; destDir?: string; error?: string }>;
      openCrashDumpFolder: () => Promise<{ opened?: boolean }>;
      dismissCrashDumps: () => Promise<{ dismissed?: boolean }>;
      scanFolder: (folderPath: string) => Promise<{ success: boolean; error?: string; games: Array<{ uuid: string; source: string; originalName: string; installPath: string; exePath?: string; appId?: string; packageFamilyName?: string; appUserModelId?: string; launchUri?: string; xboxKind?: 'uwp' | 'pc'; title: string; status: 'pending' | 'scanning' | 'matched' | 'ambiguous' | 'ready' | 'error'; error?: string }> }>;
      searchImages: (query: string, imageType: 'boxart' | 'banner' | 'logo' | 'icon' | 'alternativeBanner', steamAppId?: string, includeAnimated?: boolean) => Promise<{ success: boolean; error?: string; images: Array<{ gameId: number; gameName: string; images: Array<{ url: string; score: number; width: number; height: number; mime?: string; isAnimated?: boolean }> }> }>;
      searchWebImages: (query: string, imageType: 'boxart' | 'banner' | 'logo' | 'icon') => Promise<{ success: boolean; error?: string; images: Array<{ gameId: number; gameName: string; images: Array<{ url: string; score: number; width: number; height: number; mime?: string; isAnimated?: boolean; source: string }> }> }>;
      fastImageSearch?: (query: string, requestId?: number) => Promise<any[]>;
      getMetadataProviderStatus?: () => Promise<{ success: boolean; providers: Array<{ name: string; available: boolean }>; error?: string }>;
      refreshAllMetadata: (options?: { allGames?: boolean; gameIds?: string[]; continueFromIndex?: number; linksOnly?: boolean }) => Promise<{ success: boolean; canceled?: boolean; error?: string; count: number; errors: number; unmatchedGames: Array<{ gameId: string; title: string; searchResults: any[] }>; missingBoxartGames: Array<{ gameId: string; title: string; steamAppId?: string }>; requiresBoxart?: boolean; currentGameIndex?: number; remainingGames?: number }>;
      cancelMetadataRefresh: () => Promise<{ success: boolean; error?: string }>;
      findLinks: (gameId: string) => Promise<{ success: boolean; error?: string; links: Array<{ name: string; url: string }>; title: string }>;
      fetchAndUpdate: (gameId: string, boxartUrl: string) => Promise<{ success: boolean; error?: string }>;
      getVersion: () => Promise<string>;
      getChangelog: (version?: string) => Promise<{ success: boolean; content?: string; error?: string }>;
      getName: () => Promise<string>;
      isPackaged?: () => Promise<boolean>;
      checkForUpdates?: () => Promise<void>;
      downloadUpdate?: () => Promise<{ success: boolean; error?: string }>;
      quitAndInstall?: () => Promise<void>;
      onUpdateStatus?: (callback: (payload: UpdateStatusPayload) => void) => () => void;
      notifyAppReady?: () => void;
      onUpdateFound?: () => void;
      onUpdateDismissed?: () => void;
      removeWinGDKGames: () => Promise<{ success: boolean; removedCount?: number; removedGames?: Array<{ id: string; title: string; exePath?: string }>; error?: string }>;
      removeMissingGames: (gameIds: string[]) => Promise<{ success: boolean; removedCount: number; error?: string }>;
      getMissingGames: () => Promise<{ success: boolean; games: MissingGame[]; error?: string }>;
      openPath: (pathOrType: string) => Promise<{ success: boolean; error?: string }>;
      getFolderPaths?: () => Promise<{ cacheDir: string; appDataPath: string }>;
      restartAsAdmin?: () => Promise<{ success: boolean; error?: string }>;
      checkProcessExists: (pid: number) => Promise<boolean>;
      suspend: {
        getRunningGames: () => Promise<Array<{ gameId: string; title: string; pid: number; status: 'running' | 'suspended'; exePath?: string }>>;
        suspendGame: (gameId: string) => Promise<{ success: boolean; error?: string }>;
        resumeGame: (gameId: string) => Promise<{ success: boolean; error?: string }>;
        getFeatureEnabled: () => Promise<boolean>;
        setFeatureEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
        getShortcut: () => Promise<string>;
        setShortcut: (shortcut: string) => Promise<{ success: boolean; error?: string }>;
      };
      scanning: {
        gameStarted: (gameId: string) => Promise<void>;
        gameStopped: (gameId: string) => Promise<void>;
      };
      fullscreen: {
        toggle: () => Promise<{ success: boolean }>;
        enter: () => Promise<{ success: boolean }>;
        exit: () => Promise<{ success: boolean }>;
        getState: () => Promise<{ isFullscreen: boolean }>;
        isMinimized: () => Promise<{ isMinimized: boolean }>;
        onChanged: (callback: (isFullscreen: boolean) => void) => () => void;
      };
      gamepad: {
        getPreferences: () => Promise<{ enabled: boolean; navigationSpeed: number; buttonLayout: 'xbox' | 'playstation' }>;
        setEnabled: (enabled: boolean) => Promise<{ success: boolean }>;
        setNavigationSpeed: (speed: number) => Promise<{ success: boolean }>;
        setButtonLayout: (layout: 'xbox' | 'playstation') => Promise<{ success: boolean }>;
      };
      generateBugReport: (userDescription: string) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      getBugReportLogsDirectory: () => Promise<{ success: boolean; path?: string; error?: string }>;
      hasCustomDefaults?: () => Promise<boolean>;
      saveCustomDefaults?: (settings: any, resolution?: string) => Promise<{ success: boolean; error?: string }>;
      restoreCustomDefaults?: (options: { viewMode: string; scope: string; resolution?: string }) => Promise<any>;
      exportCustomDefaults?: (options: { viewMode: string; scope: string; resolution?: string; overrideSettings?: any }) => Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }>;
      importCustomDefaults?: () => Promise<{ success: boolean; data?: any; cancelled?: boolean; error?: string }>;
      getBaselineDefaults?: () => Promise<any>;
      // New Custom Defaults Manager methods
      getPerGameSettingsCount?: () => Promise<number>;
      getSavedDefaultsList?: () => Promise<Array<{ resolution: string; viewMode: string; lastModified: string; hasPerGameSettings: boolean }>>;
      deleteCustomDefault?: (options: { resolution: string; viewMode: string }) => Promise<{ success: boolean; error?: string }>;
      validateImportFile?: (data: any) => Promise<{ valid: boolean; resolutions: string[]; viewModes: string[]; perGameSettingsCount: number; hasConflicts: boolean; conflictDetails: Array<{ resolution: string; viewMode: string }>; error?: string }>;
      exportCustomDefaultsSelective?: (options: { resolutions: string[]; viewModes: string[]; includePerGameSettings: boolean; currentResolution: string }) => Promise<{ success: boolean; filePath?: string; cancelled?: boolean; error?: string }>;
      importCustomDefaultsSelective?: (options: { data?: any; includePerGameSettings: boolean; mergeStrategy: 'overwrite' | 'keep' }) => Promise<{ success: boolean; cancelled?: boolean; error?: string }>;
    };
  }
}

export { };
