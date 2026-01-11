export interface Game {
  id: string;
  title: string;
  sortingName?: string;
  platform: 'steam' | 'other' | string;
  exePath: string;
  boxArtUrl: string;
  bannerUrl: string;
  logoUrl?: string;
  logoSize?: number;
  heroUrl?: string;
  description?: string;
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
  favorite?: boolean;
  pinned?: boolean;
  hidden?: boolean;
  broken?: boolean;
  notes?: string;
  modManagerUrl?: string;
  removeLogoTransparency?: boolean;
  links?: Array<{ name: string; url: string }>;
  actions?: Array<{ name: string; path: string; arguments?: string; workingDir?: string }>;
  scripts?: Array<{ name: string; script: string }>;
  lockedFields?: {
    title?: boolean;
    boxArtUrl?: boolean;
    bannerUrl?: boolean;
    exePath?: boolean;
    [key: string]: boolean | undefined;
  };
}

export interface GameMetadata {
  boxArtUrl: string;
  bannerUrl: string;
  logoUrl?: string;
  heroUrl?: string;
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

declare global {
  interface Window {
    ipcRenderer?: {
      on: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
      off: (channel: string, callback: (event: any, ...args: any[]) => void) => void;
    };
    electronAPI: {
      scanSteamGames: () => Promise<import('./steam').SteamGame[]>;
      getSteamPath: () => Promise<string | null>;
      setSteamPath: (path: string) => Promise<{ success: boolean; error?: string }>;
      scanGamesWithPath: (path?: string, autoMerge?: boolean) => Promise<{ success: boolean; error?: string; games: import('./steam').SteamGame[] }>;
      getLibrary: () => Promise<Game[]>;
      saveGame: (game: Game, oldGame?: Game) => Promise<boolean>;
      deleteCachedImage: (gameId: string, imageType: 'boxart' | 'banner' | 'logo' | 'hero') => Promise<{ success: boolean; error?: string }>;
      reorderGames: (games: Game[]) => Promise<boolean>;
      addCustomGame: (gameData: { title: string; exePath: string }) => Promise<Game | null>;
      deleteGame: (gameId: string) => Promise<boolean>;
      showOpenDialog: () => Promise<string | null>;
      showFolderDialog: () => Promise<string | null>;
      showImageDialog: () => Promise<string | null>;
      scanFolderForExecutables: (folderPath: string) => Promise<ExecutableFile[]>;
      searchArtwork: (title: string, steamAppId?: string) => Promise<GameMetadata | null>;
      fetchGameDescription: (steamGameId: string) => Promise<{ success: boolean; description?: string; summary?: string; releaseDate?: string; genres?: string[]; developers?: string[]; publishers?: string[]; ageRating?: string; rating?: number; platforms?: string[]; categories?: string[]; error?: string }>;
      fetchAndUpdateMetadata: (gameId: string, title: string) => Promise<{ success: boolean; metadata: GameMetadata | null }>;
      setIGDBConfig: (config: { clientId: string; accessToken: string }) => Promise<boolean>;
      setMockMode: (enabled: boolean) => Promise<boolean>;
      searchMetadata: (gameTitle: string) => Promise<{ success: boolean; error?: string; results: Array<{ id: number; name: string; summary?: string; coverUrl?: string; screenshotUrls?: string[]; logoUrl?: string; rating?: number; releaseDate?: number; genres?: string[]; platform?: string; ageRating?: string; categories?: string[] }> }>;
      searchGames: (gameTitle: string) => Promise<{ success: boolean; error?: string; results: Array<{ id: string; title: string; source: string; externalId?: string | number; steamAppId?: string; year?: number; platform?: string }> }>;
      fetchAndUpdateByProviderId: (gameId: string, providerId: string, providerSource: string) => Promise<{ success: boolean; error?: string; metadata: GameMetadata | null }>;
      fetchMetadataOnlyByProviderId: (gameId: string, providerId: string, providerSource: string) => Promise<{ success: boolean; error?: string; metadata: Partial<GameMetadata> | null }>;
      launchGame: (gameId: string) => Promise<{ success: boolean; error?: string }>;
      getAppConfigs: () => Promise<Record<string, { id: string; name: string; enabled: boolean; path: string; autoAdd?: boolean }>>;
      getAppConfig: (appId: string) => Promise<{ id: string; name: string; enabled: boolean; path: string; autoAdd?: boolean } | null>;
      saveAppConfig: (config: { id: string; name: string; enabled: boolean; path: string; autoAdd?: boolean }) => Promise<{ success: boolean; error?: string }>;
      saveAppConfigs: (configs: Array<{ id: string; name: string; enabled: boolean; path: string; autoAdd?: boolean }>) => Promise<{ success: boolean; error?: string }>;
      getManualFolders: () => Promise<string[]>;
      saveManualFolders: (folders: string[]) => Promise<{ success: boolean; error?: string }>;
      getManualFolderConfigs: () => Promise<Record<string, { id: string; name: string; path: string; enabled: boolean }>>;
      saveManualFolderConfig: (config: { id: string; name: string; path: string; enabled: boolean }) => Promise<{ success: boolean; error?: string }>;
      deleteManualFolderConfig: (folderId: string) => Promise<{ success: boolean; error?: string }>;
      getSteamAuthState?: () => Promise<{ authenticated: boolean; steamId?: string; username?: string }>;
      authenticateSteam?: () => Promise<{ success: boolean; steamId?: string; username?: string; error?: string }>;
      importAllSteamGames?: (path: string) => Promise<{ success: boolean; importedCount?: number; error?: string }>;
      clearSteamAuth?: () => Promise<{ success: boolean; error?: string }>;
      scanXboxGames: (path: string, autoMerge?: boolean) => Promise<{ success: boolean; error?: string; games: Array<{ id: string; name: string; installPath: string; type: string }> }>;
      onMenuEvent: (channel: string, callback: () => void) => () => void;
      getPreferences: () => Promise<{ gridSize?: number; panelWidth?: number; fanartHeight?: number; descriptionHeight?: number; boxartWidth?: number; descriptionWidth?: number; pinnedCategories?: string[]; minimizeToTray?: boolean; showSystemTrayIcon?: boolean; startWithComputer?: boolean; startClosedToTray?: boolean; updateLibrariesOnStartup?: boolean; minimizeOnGameLaunch?: boolean; hideVRTitles?: boolean; hideAppsTitles?: boolean; hideGameTitles?: boolean; gameTilePadding?: number; showLogoOverBoxart?: boolean; logoPosition?: 'top' | 'middle' | 'bottom' | 'underneath'; backgroundBlur?: number; backgroundMode?: 'image' | 'color'; backgroundColor?: string; viewMode?: 'grid' | 'list' | 'logo'; listViewOptions?: { showDescription: boolean; showCategories: boolean; showPlaytime: boolean; showReleaseDate: boolean; showGenres: boolean; showPlatform: boolean; }; listViewSize?: number; autoSizeToFit?: boolean; titleFontSize?: number; titleFontFamily?: string; descriptionFontSize?: number; descriptionFontFamily?: string; detailsFontSize?: number; detailsFontFamily?: string; visibleDetails?: { releaseDate: boolean; platform: boolean; ageRating: boolean; genres: boolean; developers: boolean; publishers: boolean; communityScore: boolean; userScore: boolean; criticScore: boolean; installationDirectory: boolean; }; activeGameId?: string | null; ignoredGames?: string[] }>;
      savePreferences: (preferences: { gridSize?: number; panelWidth?: number; fanartHeight?: number; descriptionHeight?: number; boxartWidth?: number; descriptionWidth?: number; pinnedCategories?: string[]; minimizeToTray?: boolean; showSystemTrayIcon?: boolean; startWithComputer?: boolean; startClosedToTray?: boolean; updateLibrariesOnStartup?: boolean; minimizeOnGameLaunch?: boolean; hideVRTitles?: boolean; hideAppsTitles?: boolean; hideGameTitles?: boolean; gameTilePadding?: number; showLogoOverBoxart?: boolean; logoPosition?: 'top' | 'middle' | 'bottom' | 'underneath'; backgroundBlur?: number; backgroundMode?: 'image' | 'color'; backgroundColor?: string; viewMode?: 'grid' | 'list' | 'logo'; listViewOptions?: { showDescription: boolean; showCategories: boolean; showPlaytime: boolean; showReleaseDate: boolean; showGenres: boolean; showPlatform: boolean; }; listViewSize?: number; autoSizeToFit?: boolean; titleFontSize?: number; titleFontFamily?: string; descriptionFontSize?: number; descriptionFontFamily?: string; detailsFontSize?: number; detailsFontFamily?: string; visibleDetails?: { releaseDate: boolean; platform: boolean; ageRating: boolean; genres: boolean; developers: boolean; publishers: boolean; communityScore: boolean; userScore: boolean; criticScore: boolean; installationDirectory: boolean; }; activeGameId?: string | null; ignoredGames?: string[] }) => Promise<{ success: boolean; error?: string }>;
      requestExit: () => Promise<{ shouldMinimizeToTray: boolean; canMinimizeToTray: boolean }>;
      exit: () => Promise<void>;
      minimizeToTray: () => Promise<void>;
      applySystemTraySettings: (settings: { showSystemTrayIcon: boolean; minimizeToTray: boolean }) => Promise<{ success: boolean; error?: string }>;
      applyStartupSettings: (settings: { startWithComputer: boolean; startClosedToTray: boolean }) => Promise<{ success: boolean; error?: string }>;
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      getAPICredentials: () => Promise<{ igdbClientId?: string; igdbClientSecret?: string; steamGridDBApiKey?: string }>;
      saveAPICredentials: (credentials: { igdbClientId?: string; igdbClientSecret?: string; steamGridDBApiKey?: string }) => Promise<{ success: boolean; error?: string }>;
      detectLaunchers: () => Promise<Array<{ id: string; name: string; path: string; detected: boolean; detectionMethod: 'registry' | 'path' | 'none' }>>;
      detectLauncher: (launcherId: string) => Promise<{ id: string; name: string; path: string; detected: boolean; detectionMethod: 'registry' | 'path' | 'none' } | null>;
      getBackgroundScanEnabled: () => Promise<boolean>;
      setBackgroundScanEnabled: (enabled: boolean) => Promise<{ success: boolean; error?: string }>;
      getLastBackgroundScan: () => Promise<number | undefined>;
      toggleDevTools: () => Promise<{ success: boolean; error?: string }>;
      minimizeWindow: () => Promise<{ success: boolean; error?: string }>;
      maximizeWindow: () => Promise<{ success: boolean; error?: string }>;
      closeWindow: () => Promise<{ success: boolean; error?: string }>;
      resetApp: () => Promise<{ success: boolean; error?: string }>;
      scanAllSources: () => Promise<{ success: boolean; error?: string; games: Array<{ uuid: string; source: 'steam' | 'epic' | 'gog' | 'xbox' | 'manual_file' | 'manual_folder'; originalName: string; installPath: string; exePath?: string; appId?: string; title: string; status: 'pending' | 'scanning' | 'matched' | 'ambiguous' | 'ready' | 'error'; error?: string }> }>;
      scanFolder: (folderPath: string) => Promise<{ success: boolean; error?: string; games: Array<{ uuid: string; source: 'steam' | 'epic' | 'gog' | 'xbox' | 'ubisoft' | 'rockstar' | 'manual_file' | 'manual_folder'; originalName: string; installPath: string; exePath?: string; appId?: string; title: string; status: 'pending' | 'scanning' | 'matched' | 'ambiguous' | 'ready' | 'error'; error?: string }> }>;
      searchImages: (query: string, imageType: 'boxart' | 'banner' | 'logo', steamAppId?: string) => Promise<{ success: boolean; error?: string; images: Array<{ gameId: number; gameName: string; images: Array<{ url: string; score: number; width: number; height: number; mime?: string; isAnimated?: boolean }> }> }>;
      refreshAllMetadata: (options?: { allGames?: boolean; gameIds?: string[]; continueFromIndex?: number }) => Promise<{ success: boolean; error?: string; count: number; errors: number; unmatchedGames: Array<{ gameId: string; title: string; searchResults: any[] }>; missingBoxartGames: Array<{ gameId: string; title: string; steamAppId?: string }>; requiresBoxart?: boolean; currentGameIndex?: number; remainingGames?: number }>;
      fetchAndUpdate: (gameId: string, boxartUrl: string) => Promise<{ success: boolean; error?: string }>;
      getVersion: () => Promise<string>;
      removeWinGDKGames: () => Promise<{ success: boolean; removedCount?: number; removedGames?: Array<{ id: string; title: string; exePath?: string }>; error?: string }>;
      openPath: (pathOrType: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

export {};
