import type { ElectronAPI } from '../../../main/preload';

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
  viewMode?: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card';
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
    searchBar?: 'left' | 'middle' | 'right' | 'hidden';
    sortBy?: 'left' | 'middle' | 'right' | 'hidden';
    launcher?: 'left' | 'middle' | 'right' | 'hidden';
    categories?: 'left' | 'middle' | 'right' | 'hidden';
    pinnedCategories?: 'left' | 'middle' | 'right' | 'hidden';
  };
  isFirstLaunch?: boolean;
  hasSeenPostImportTutorial?: boolean;
  isViewFlippedByView?: Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card', boolean>;
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
  progressPercent?: number;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export { };
