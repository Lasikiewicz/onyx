export interface Game {
  id: string;
  title: string;
  sortingName?: string;
  platform: 'steam' | 'other' | string;
  exePath: string;
  boxArtUrl: string;
  bannerUrl: string;
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
  hidden?: boolean;
  broken?: boolean;
  notes?: string;
  modManagerUrl?: string;
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
  screenshots?: string[];
}

export interface ExecutableFile {
  fileName: string;
  fullPath: string;
}

declare global {
  interface Window {
    electronAPI: {
      scanSteamGames: () => Promise<import('./steam').SteamGame[]>;
      getSteamPath: () => Promise<string | null>;
      setSteamPath: (path: string) => Promise<{ success: boolean; error?: string }>;
      scanGamesWithPath: (path?: string, autoMerge?: boolean) => Promise<{ success: boolean; error?: string; games: import('./steam').SteamGame[] }>;
      getLibrary: () => Promise<Game[]>;
      saveGame: (game: Game) => Promise<boolean>;
      reorderGames: (games: Game[]) => Promise<boolean>;
      addCustomGame: (gameData: { title: string; exePath: string }) => Promise<Game | null>;
      deleteGame: (gameId: string) => Promise<boolean>;
      showOpenDialog: () => Promise<string | null>;
      showFolderDialog: () => Promise<string | null>;
      showImageDialog: () => Promise<string | null>;
      scanFolderForExecutables: (folderPath: string) => Promise<ExecutableFile[]>;
      searchArtwork: (title: string, steamAppId?: string) => Promise<GameMetadata | null>;
      fetchAndUpdateMetadata: (gameId: string, title: string) => Promise<{ success: boolean; metadata: GameMetadata | null }>;
      setIGDBConfig: (config: { clientId: string; accessToken: string }) => Promise<boolean>;
      setMockMode: (enabled: boolean) => Promise<boolean>;
      searchMetadata: (gameTitle: string) => Promise<{ success: boolean; error?: string; results: Array<{ id: number; name: string; summary?: string; coverUrl?: string; screenshotUrls?: string[]; rating?: number; releaseDate?: number; genres?: string[]; platform?: string; ageRating?: string; categories?: string[] }> }>;
      launchGame: (gameId: string) => Promise<{ success: boolean; error?: string }>;
      getAppConfigs: () => Promise<Record<string, { id: string; name: string; enabled: boolean; path: string }>>;
      getAppConfig: (appId: string) => Promise<{ id: string; name: string; enabled: boolean; path: string } | null>;
      saveAppConfig: (config: { id: string; name: string; enabled: boolean; path: string }) => Promise<{ success: boolean; error?: string }>;
      saveAppConfigs: (configs: Array<{ id: string; name: string; enabled: boolean; path: string }>) => Promise<{ success: boolean; error?: string }>;
      scanXboxGames: (path: string, autoMerge?: boolean) => Promise<{ success: boolean; error?: string; games: Array<{ id: string; name: string; installPath: string; type: string }> }>;
      onMenuEvent: (channel: string, callback: () => void) => () => void;
      getPreferences: () => Promise<{ gridSize?: number; panelWidth?: number; fanartHeight?: number; descriptionHeight?: number; pinnedCategories?: string[]; minimizeToTray?: boolean; showSystemTrayIcon?: boolean; startWithComputer?: boolean; startClosedToTray?: boolean; updateLibrariesOnStartup?: boolean; hideVRTitles?: boolean; hideGameTitles?: boolean; gameTilePadding?: number; activeGameId?: string | null }>;
      savePreferences: (preferences: { gridSize?: number; panelWidth?: number; fanartHeight?: number; descriptionHeight?: number; pinnedCategories?: string[]; minimizeToTray?: boolean; showSystemTrayIcon?: boolean; startWithComputer?: boolean; startClosedToTray?: boolean; updateLibrariesOnStartup?: boolean; hideVRTitles?: boolean; hideGameTitles?: boolean; gameTilePadding?: number; activeGameId?: string | null }) => Promise<{ success: boolean; error?: string }>;
      requestExit: () => Promise<{ shouldMinimizeToTray: boolean; canMinimizeToTray: boolean }>;
      exit: () => Promise<void>;
      minimizeToTray: () => Promise<void>;
      applySystemTraySettings: (settings: { showSystemTrayIcon: boolean; minimizeToTray: boolean }) => Promise<{ success: boolean; error?: string }>;
      applyStartupSettings: (settings: { startWithComputer: boolean; startClosedToTray: boolean }) => Promise<{ success: boolean; error?: string }>;
      openExternal: (url: string) => Promise<{ success: boolean; error?: string }>;
      getAPICredentials: () => Promise<{ igdbClientId?: string; igdbClientSecret?: string }>;
      saveAPICredentials: (credentials: { igdbClientId?: string; igdbClientSecret?: string }) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

export {};
