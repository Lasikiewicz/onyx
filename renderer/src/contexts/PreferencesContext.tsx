import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { LINK_DISPLAY_ORDER, DEFAULT_VISIBLE_LINK_TYPES } from '../components/GameLinks';
import { TopBarPositions } from '../components/TopBarContextMenu';

export interface PreferencesContextType {
  // General
  viewMode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow';
  setViewMode: (mode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow') => void;
  gridSize: number;
  setGridSize: (size: number) => void;
  logoSize: number;
  setLogoSize: (size: number) => void;
  pinnedCategories: string[];
  setPinnedCategories: (categories: string[] | ((prev: string[]) => string[])) => void;
  handleTogglePinCategory: (category: string) => void;

  // Visibility
  hideVRTitles: boolean;
  setHideVRTitles: (hide: boolean) => void;
  hideAppsTitles: boolean;
  setHideAppsTitles: (hide: boolean) => void;
  hideGameTitles: boolean;
  setHideGameTitles: (hide: boolean) => void;

  // Appearance
  gameTilePadding: number;
  setGameTilePadding: (padding: number) => void;
  selectedBoxArtSize: number;
  setSelectedBoxArtSize: (size: number) => void;
  showLogoOverBoxart: boolean;
  setShowLogoOverBoxart: (show: boolean) => void;
  logoPosition: 'top' | 'middle' | 'bottom' | 'underneath';
  setLogoPosition: (position: 'top' | 'middle' | 'bottom' | 'underneath') => void;
  logoBackgroundColor: string;
  setLogoBackgroundColor: (color: string) => void;
  logoBackgroundOpacity: number;
  setLogoBackgroundOpacity: (opacity: number) => void;
  backgroundBlur: number;
  setBackgroundBlur: (blur: number) => void;
  backgroundBrightnessByView: Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', number>;
  setBackgroundBrightnessByView: (brightness: Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', number>) => void;

  // Carousel specific
  showCarouselDetails: boolean;
  setShowCarouselDetails: (show: boolean) => void;
  showCarouselLogos: boolean;
  setShowCarouselLogos: (show: boolean) => void;
  detailsBarSize: number;
  setDetailsBarSize: (size: number) => void;
  carouselLogoSize: number;
  setCarouselLogoSize: (size: number) => void;
  carouselButtonSize: number;
  setCarouselButtonSize: (size: number) => void;
  carouselDescriptionSize: number;
  setCarouselDescriptionSize: (size: number) => void;

  // Grid/List specific
  gridDescriptionSize: number;
  listViewOptions: any;
  setListViewOptions: (options: any) => void;
  listViewSize: number;
  setListViewSize: (size: number) => void;

  // Right Panel
  rightPanelLogoSize: number;
  setRightPanelLogoSize: (size: number) => void;
  rightPanelBoxartPosition: 'left' | 'right' | 'none';
  setRightPanelBoxartPosition: (position: 'left' | 'right' | 'none') => void;
  rightPanelBoxartSize: number;
  setRightPanelBoxartSize: (size: number) => void;
  rightPanelTextSize: number;
  setRightPanelTextSize: (size: number) => void;
  rightPanelButtonSize: number;
  setRightPanelButtonSize: (size: number) => void;
  rightPanelButtonLocation: 'left' | 'middle' | 'right';
  setRightPanelButtonLocation: (location: 'left' | 'middle' | 'right') => void;
  detailsPanelOpacity: number;
  setDetailsPanelOpacity: (opacity: number) => void;

  // View Flipped
  isViewFlippedByView: Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', boolean>;
  setIsViewFlippedByView: (flipped: Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', boolean>) => void;

  // Colors
  rightPanelButtonColors: { playColor?: string; editColor?: string; modManagerColor?: string };
  setRightPanelButtonColors: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  carouselButtonColors: { playColor?: string; editColor?: string; modManagerColor?: string };
  setCarouselButtonColors: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  gridButtonColors: { playColor?: string; editColor?: string; modManagerColor?: string };
  setGridButtonColors: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  listButtonColors: { playColor?: string; editColor?: string; modManagerColor?: string };
  setListButtonColors: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  logoButtonColors: { playColor?: string; editColor?: string; modManagerColor?: string };
  setLogoButtonColors: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;

  // CoverFlow
  coverFlowCoverSize: number;
  setCoverFlowCoverSize: (size: number) => void;
  coverFlowReflection: number;
  setCoverFlowReflection: (reflection: number) => void;
  coverFlowVerticalOffset: number;
  setCoverFlowVerticalOffset: (offset: number) => void;
  coverFlowSideOpacity: number;
  setCoverFlowSideOpacity: (opacity: number) => void;
  coverFlowShowButtons: boolean;
  setCoverFlowShowButtons: (show: boolean) => void;
  coverFlowButtonPosition: 'left' | 'middle' | 'right';
  setCoverFlowButtonPosition: (position: 'left' | 'middle' | 'right') => void;
  coverFlowButtonColors: { playColor?: string; editColor?: string; modManagerColor?: string };
  setCoverFlowButtonColors: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;

  // Layout
  topBarPositions: TopBarPositions;
  setTopBarPositions: (positions: TopBarPositions) => void;
  fanartHeightByView: Record<'grid' | 'list' | 'logo', number>;
  setFanartHeightByView: (heights: Record<'grid' | 'list' | 'logo', number>) => void;
  descriptionWidthByView: Record<'grid' | 'list' | 'logo', number>;
  setDescriptionWidthByView: (widths: Record<'grid' | 'list' | 'logo', number>) => void;
  panelWidthByViewState: Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', number>;
  setPanelWidthByViewState: (widths: Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', number>) => void;
  panelWidth: number;
  setPanelWidth: (width: number) => void;

  // Categories display
  showCategoriesByView: Record<string, boolean>;
  setShowCategoriesByView: (show: Record<string, boolean>) => void;
  categoriesPositionByView: Record<string, 'top' | 'bottom'>;
  setCategoriesPositionByView: (positions: Record<string, 'top' | 'bottom'>) => void;
  categoriesAlignmentByView: Record<string, 'left' | 'center' | 'right'>;
  setCategoriesAlignmentByView: (alignments: Record<string, 'left' | 'center' | 'right'>) => void;
  categoriesSizeByView: Record<string, number>;
  setCategoriesSizeByView: (sizes: Record<string, number>) => void;

  // Links
  linkDisplayOrder: string[];
  setLinkDisplayOrder: (order: string[]) => void;
  visibleLinkTypes: Record<string, boolean>;
  setVisibleLinkTypes: (types: Record<string, boolean>) => void;

  // Other
  confirmGameLaunch: boolean;
  setConfirmGameLaunch: (confirm: boolean) => void;
  backgroundMode: 'image' | 'color';
  setBackgroundMode: (mode: 'image' | 'color') => void;
  backgroundColor: string;
  setBackgroundColor: (color: string) => void;
  autoSizeToFit: boolean;
  setAutoSizeToFit: (auto: boolean) => void;
  isInitialLoad: boolean;

  // Actions
  refreshPreferences: () => Promise<void>;
  applyPreferences: (prefs: any, options?: { markInitialLoad?: boolean }) => void;
  currentResolution: string;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow'>('grid');
  const [gridSize, setGridSize] = useState(120);
  const [logoSize, setLogoSize] = useState(100);
  const [pinnedCategories, setPinnedCategories] = useState<string[]>([]);
  const [hideVRTitles, setHideVRTitles] = useState(true);
  const [hideAppsTitles, setHideAppsTitles] = useState(true);
  const [hideGameTitles, setHideGameTitles] = useState(false);
  const [gameTilePadding, setGameTilePadding] = useState(3);
  const [selectedBoxArtSize, setSelectedBoxArtSize] = useState(25);
  const [showLogoOverBoxart, setShowLogoOverBoxart] = useState(true);
  const [logoPosition, setLogoPosition] = useState<'top' | 'middle' | 'bottom' | 'underneath'>('middle');
  const [logoBackgroundColor, setLogoBackgroundColor] = useState('#374151');
  const [logoBackgroundOpacity, setLogoBackgroundOpacity] = useState(100);
  const [backgroundBlur, setBackgroundBlur] = useState(40);
  const [backgroundBrightnessByView, setBackgroundBrightnessByView] = useState<Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', number>>({
    grid: 0.3,
    list: 0.3,
    logo: 0.3,
    carousel: 0.3,
    coverflow: 0.3,
  });
  const [showCarouselDetails, setShowCarouselDetails] = useState(true);
  const [showCarouselLogos, setShowCarouselLogos] = useState(true);
  const [detailsBarSize, setDetailsBarSize] = useState(14);
  const [carouselLogoSize, setCarouselLogoSize] = useState(100);
  const [carouselButtonSize, setCarouselButtonSize] = useState(14);
  const [carouselDescriptionSize, setCarouselDescriptionSize] = useState(18);
  const [gridDescriptionSize] = useState(14);
  const defaultListViewOptions = {
    showDescription: true,
    showCategories: false,
    showPlaytime: true,
    showReleaseDate: true,
    showGenres: true,
    showPlatform: false,
    showLauncher: true,
    showLogos: false,
    titleTextSize: 18,
  };
  const [listViewOptions, setListViewOptions] = useState(defaultListViewOptions);
  const [listViewSize, setListViewSize] = useState(128);

  // Right panel
  const [rightPanelLogoSize, setRightPanelLogoSize] = useState(100);
  const [rightPanelBoxartPosition, setRightPanelBoxartPosition] = useState<'left' | 'right' | 'none'>('right');
  const [rightPanelBoxartSize, setRightPanelBoxartSize] = useState(120);
  const [rightPanelTextSize, setRightPanelTextSize] = useState(14);
  const [rightPanelButtonSize, setRightPanelButtonSize] = useState(14);
  const [rightPanelButtonLocation, setRightPanelButtonLocation] = useState<'left' | 'middle' | 'right'>('right');
  const [detailsPanelOpacity, setDetailsPanelOpacity] = useState(80);
  const [isViewFlippedByView, setIsViewFlippedByView] = useState<Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', boolean>>({
    grid: false,
    list: false,
    logo: false,
    carousel: false,
    coverflow: false,
  });

  // Colors
  const [rightPanelButtonColors, setRightPanelButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  const [carouselButtonColors, setCarouselButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  const [gridButtonColors, setGridButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  const [listButtonColors, setListButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  const [logoButtonColors, setLogoButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });

  // Cover Flow
  const [coverFlowCoverSize, setCoverFlowCoverSize] = useState(300);
  const [coverFlowReflection, setCoverFlowReflection] = useState(60);
  const [coverFlowVerticalOffset, setCoverFlowVerticalOffset] = useState(0);
  const [coverFlowSideOpacity, setCoverFlowSideOpacity] = useState(100);
  const [coverFlowShowButtons, setCoverFlowShowButtons] = useState(true);
  const [coverFlowButtonPosition, setCoverFlowButtonPosition] = useState<'left' | 'middle' | 'right'>('middle');
  const [coverFlowButtonColors, setCoverFlowButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });

  // Layout
  const [topBarPositions, setTopBarPositions] = useState<TopBarPositions>({
    searchBar: 'left',
    sortBy: 'left',
    launcher: 'left',
    categories: 'left',
  });
  const [fanartHeightByView, setFanartHeightByView] = useState<Record<'grid' | 'list' | 'logo', number>>({
    grid: 320,
    list: 320,
    logo: 320,
  });
  const [descriptionWidthByView, setDescriptionWidthByView] = useState<Record<'grid' | 'list' | 'logo', number>>({
    grid: 50,
    list: 50,
    logo: 50,
  });
  const [panelWidthByViewState, setPanelWidthByViewState] = useState<Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', number>>({
    grid: 800,
    list: 800,
    logo: 800,
    carousel: 800,
    coverflow: 800,
  });
  const [panelWidth, setPanelWidth] = useState(800);

  // Categories
  const [showCategoriesByView, setShowCategoriesByView] = useState<Record<string, boolean>>({
    grid: false,
    list: false,
    logo: false,
  });
  const [categoriesPositionByView, setCategoriesPositionByView] = useState<Record<string, 'top' | 'bottom'>>({
    grid: 'top',
    list: 'top',
    logo: 'top'
  });
  const [categoriesAlignmentByView, setCategoriesAlignmentByView] = useState<Record<string, 'left' | 'center' | 'right'>>({
    grid: 'left',
    list: 'left',
    logo: 'left'
  });
  const [categoriesSizeByView, setCategoriesSizeByView] = useState<Record<string, number>>({
    grid: 12,
    list: 12,
    logo: 12
  });

  // Links
  const [linkDisplayOrder, setLinkDisplayOrder] = useState<string[]>(LINK_DISPLAY_ORDER);
  const [visibleLinkTypes, setVisibleLinkTypes] = useState<Record<string, boolean>>(DEFAULT_VISIBLE_LINK_TYPES);

  // Other
  const [confirmGameLaunch, setConfirmGameLaunch] = useState(false);
  const [backgroundMode, setBackgroundMode] = useState<'image' | 'color'>('image');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [autoSizeToFit, setAutoSizeToFit] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const currentResolutionRef = useRef<string>(window.screen.height >= 2160 ? '4K' : window.screen.height >= 1440 ? '1440p' : window.screen.height >= 1080 ? '1080p' : '720p');
  const baselineDefaultsRef = useRef<any>(null);

  // Apply baseline defaults
  const applyBaselineDefaults = (resKey: string) => {
    if (!baselineDefaultsRef.current || !baselineDefaultsRef.current[resKey]) return;
    const defaults = baselineDefaultsRef.current[resKey][viewMode];
    if (!defaults) return;

    // Apply view-specific settings from baseline
    if (viewMode === 'grid') {
      if (defaults.gridSize !== undefined) setGridSize(defaults.gridSize);
      if (defaults.showLogoOverBoxart !== undefined) setShowLogoOverBoxart(defaults.showLogoOverBoxart);
      if (defaults.gameTilePadding !== undefined) setGameTilePadding(defaults.gameTilePadding);
    } else if (viewMode === 'logo') {
      if (defaults.logoSize !== undefined) setLogoSize(defaults.logoSize);
      if (defaults.logoBackgroundOpacity !== undefined) setLogoBackgroundOpacity(defaults.logoBackgroundOpacity);
      if (defaults.gameTilePadding !== undefined) setGameTilePadding(defaults.gameTilePadding);
      if (defaults.rightPanelLogoSize !== undefined) setRightPanelLogoSize(defaults.rightPanelLogoSize);
    } else if (viewMode === 'list') {
      if (defaults.listViewOptions !== undefined) setListViewOptions(defaults.listViewOptions);
      if (defaults.rightPanelLogoSize !== undefined) setRightPanelLogoSize(defaults.rightPanelLogoSize);
    } else if (viewMode === 'carousel') {
      if (defaults.showCarouselDetails !== undefined) setShowCarouselDetails(defaults.showCarouselDetails);
      if (defaults.showCarouselLogos !== undefined) setShowCarouselLogos(defaults.showCarouselLogos);
      if (defaults.detailsBarSize !== undefined) setDetailsBarSize(defaults.detailsBarSize);
      if (defaults.selectedBoxArtSize !== undefined) setSelectedBoxArtSize(defaults.selectedBoxArtSize);
      if (defaults.gameTilePadding !== undefined) setGameTilePadding(defaults.gameTilePadding);
      if (defaults.carouselLogoSize !== undefined) setCarouselLogoSize(defaults.carouselLogoSize);
      if (defaults.carouselButtonSize !== undefined) setCarouselButtonSize(defaults.carouselButtonSize);
      if (defaults.carouselDescriptionSize !== undefined) setCarouselDescriptionSize(defaults.carouselDescriptionSize);
    } else if (viewMode === 'coverflow') {
      if (defaults && defaults.gameTilePadding !== undefined) setGameTilePadding(defaults.gameTilePadding);
    }

    // Common baseline settings
    if (defaults.backgroundBlur !== undefined) setBackgroundBlur(defaults.backgroundBlur);
    if (defaults.panelWidth !== undefined) setPanelWidth(defaults.panelWidth);
    if (defaults.rightPanelBoxartPosition !== undefined) setRightPanelBoxartPosition(defaults.rightPanelBoxartPosition);
    if (defaults.rightPanelBoxartSize !== undefined) setRightPanelBoxartSize(defaults.rightPanelBoxartSize);
    if (defaults.rightPanelTextSize !== undefined) setRightPanelTextSize(defaults.rightPanelTextSize);
    if (defaults.rightPanelButtonSize !== undefined) setRightPanelButtonSize(defaults.rightPanelButtonSize);
    if (defaults.rightPanelButtonLocation !== undefined) setRightPanelButtonLocation(defaults.rightPanelButtonLocation);
    if (defaults.detailsPanelOpacity !== undefined) setDetailsPanelOpacity(defaults.detailsPanelOpacity);
  };

  const applyPreferences = (prefs: any, options?: { markInitialLoad?: boolean }) => {
    if (prefs.gridSize) setGridSize(prefs.gridSize);
    if (prefs.logoSize) setLogoSize(prefs.logoSize);
    if (prefs.pinnedCategories) setPinnedCategories(prefs.pinnedCategories);
    if (prefs.hideVRTitles !== undefined) setHideVRTitles(prefs.hideVRTitles);
    if (prefs.hideAppsTitles !== undefined) setHideAppsTitles(prefs.hideAppsTitles);
    if (prefs.hideGameTitles !== undefined) setHideGameTitles(prefs.hideGameTitles);
    if (prefs.gameTilePadding !== undefined) setGameTilePadding(prefs.gameTilePadding);
    if (prefs.showCategoriesInGameListByView !== undefined) setShowCategoriesByView(prefs.showCategoriesInGameListByView);
    if (prefs.categoriesPositionByView !== undefined) setCategoriesPositionByView(prefs.categoriesPositionByView);
    if (prefs.categoriesAlignmentByView !== undefined) setCategoriesAlignmentByView(prefs.categoriesAlignmentByView);
    if (prefs.categoriesSizeByView !== undefined) setCategoriesSizeByView(prefs.categoriesSizeByView);
    if (prefs.showLogoOverBoxart !== undefined) setShowLogoOverBoxart(prefs.showLogoOverBoxart);
    if (prefs.logoPosition !== undefined) setLogoPosition(prefs.logoPosition);
    if (prefs.logoBackgroundColor !== undefined) setLogoBackgroundColor(prefs.logoBackgroundColor);
    if (prefs.logoBackgroundOpacity !== undefined) setLogoBackgroundOpacity(prefs.logoBackgroundOpacity);
    if (prefs.backgroundBlur !== undefined) setBackgroundBlur(prefs.backgroundBlur);
    if (prefs.backgroundBrightnessByView !== undefined) {
      setBackgroundBrightnessByView({
        grid: prefs.backgroundBrightnessByView.grid ?? 0.3,
        list: prefs.backgroundBrightnessByView.list ?? 0.3,
        logo: prefs.backgroundBrightnessByView.logo ?? 0.3,
        carousel: prefs.backgroundBrightnessByView.carousel ?? 0.3,
        coverflow: prefs.backgroundBrightnessByView.coverflow ?? 0.3,
      });
    }
    if (prefs.showCarouselDetails !== undefined) setShowCarouselDetails(prefs.showCarouselDetails);
    if (prefs.showCarouselLogos !== undefined) setShowCarouselLogos(prefs.showCarouselLogos);
    if (prefs.detailsBarSize !== undefined) setDetailsBarSize(prefs.detailsBarSize);
    if (prefs.carouselLogoSize !== undefined) setCarouselLogoSize(prefs.carouselLogoSize);
    if (prefs.carouselButtonSize !== undefined) setCarouselButtonSize(prefs.carouselButtonSize);
    if (prefs.carouselDescriptionSize !== undefined) setCarouselDescriptionSize(prefs.carouselDescriptionSize);
    // Right panel settings
    if (prefs.rightPanelLogoSize !== undefined) setRightPanelLogoSize(prefs.rightPanelLogoSize);
    if (prefs.rightPanelBoxartPosition !== undefined) setRightPanelBoxartPosition(prefs.rightPanelBoxartPosition);
    if (prefs.rightPanelBoxartSize !== undefined) setRightPanelBoxartSize(prefs.rightPanelBoxartSize);
    if (prefs.rightPanelTextSize !== undefined) setRightPanelTextSize(prefs.rightPanelTextSize);
    if (prefs.rightPanelButtonSize !== undefined) setRightPanelButtonSize(prefs.rightPanelButtonSize);
    if (prefs.rightPanelButtonLocation !== undefined) setRightPanelButtonLocation(prefs.rightPanelButtonLocation);
    if (prefs.detailsPanelOpacity !== undefined) setDetailsPanelOpacity(prefs.detailsPanelOpacity);
    if (prefs.rightPanelButtonColors !== undefined) setRightPanelButtonColors(prefs.rightPanelButtonColors);
    if (prefs.carouselButtonColors !== undefined) setCarouselButtonColors(prefs.carouselButtonColors);
    if (prefs.gridButtonColors !== undefined) setGridButtonColors(prefs.gridButtonColors);
    if (prefs.listButtonColors !== undefined) setListButtonColors(prefs.listButtonColors);
    if (prefs.logoButtonColors !== undefined) setLogoButtonColors(prefs.logoButtonColors);
    if (prefs.coverFlowCoverSize !== undefined) setCoverFlowCoverSize(prefs.coverFlowCoverSize);
    if (prefs.coverFlowReflection !== undefined) setCoverFlowReflection(prefs.coverFlowReflection);
    if (prefs.coverFlowVerticalOffset !== undefined) setCoverFlowVerticalOffset(prefs.coverFlowVerticalOffset);
    if (prefs.coverFlowSideOpacity !== undefined) setCoverFlowSideOpacity(prefs.coverFlowSideOpacity);
    if (prefs.coverFlowShowButtons !== undefined) setCoverFlowShowButtons(prefs.coverFlowShowButtons);
    if (prefs.coverFlowButtonPosition !== undefined) setCoverFlowButtonPosition(prefs.coverFlowButtonPosition);
    if (prefs.coverFlowButtonColors !== undefined) setCoverFlowButtonColors(prefs.coverFlowButtonColors);
    if (prefs.isViewFlippedByView !== undefined) {
      const defaultFlipped = { grid: false, list: false, logo: false, carousel: false, coverflow: false };
      setIsViewFlippedByView({ ...defaultFlipped, ...prefs.isViewFlippedByView });
    }
    // Top bar positions
    if (prefs.topBarPositions) setTopBarPositions({ ...topBarPositions, ...prefs.topBarPositions });
    if (prefs.viewMode) setViewMode(prefs.viewMode);
    if (prefs.backgroundMode) setBackgroundMode(prefs.backgroundMode as 'image' | 'color');
    if (prefs.backgroundColor) setBackgroundColor(prefs.backgroundColor);
    if (prefs.listViewOptions) {
      setListViewOptions({ ...defaultListViewOptions, ...prefs.listViewOptions });
    } else {
      setListViewOptions(defaultListViewOptions);
    }
    if (prefs.listViewSize) setListViewSize(prefs.listViewSize);
    // Load divider settings per view
    if (prefs.fanartHeightByView) {
      setFanartHeightByView({ ...fanartHeightByView, ...prefs.fanartHeightByView });
    }
    if (prefs.descriptionWidthByView) {
      setDescriptionWidthByView({ ...descriptionWidthByView, ...prefs.descriptionWidthByView });
    }
    if (prefs.panelWidthByView) {
      setPanelWidthByViewState({ ...panelWidthByViewState, ...prefs.panelWidthByView });
    }
    // Set initial panelWidth based on current view
    const savedPanelWidth = (prefs.panelWidthByView && prefs.viewMode ? prefs.panelWidthByView[prefs.viewMode as 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow'] : undefined) ?? prefs.panelWidth;
    if (savedPanelWidth) setPanelWidth(savedPanelWidth);
    if (prefs.autoSizeToFit !== undefined) setAutoSizeToFit(prefs.autoSizeToFit);

    // Note: activeGameId is handled in UIContext or similar

    if (prefs.isFirstLaunch && baselineDefaultsRef.current) {
      console.log(`[App] First launch detected. Applying baseline defaults for ${currentResolutionRef.current}.`);
      applyBaselineDefaults(currentResolutionRef.current);
      // Save preference change to set isFirstLaunch to false
      window.electronAPI.savePreferences({ isFirstLaunch: false });
    }

    if (prefs.confirmGameLaunch !== undefined) setConfirmGameLaunch(prefs.confirmGameLaunch);
    if (prefs.linkDisplayOrder && prefs.linkDisplayOrder.length > 0) setLinkDisplayOrder(prefs.linkDisplayOrder);
    if (prefs.visibleLinkTypes && Object.keys(prefs.visibleLinkTypes).length > 0) setVisibleLinkTypes(prefs.visibleLinkTypes);

    // Keep current resolution in sync with actual screen height
    const actualResKey = window.screen.height >= 2160 ? '4K' : window.screen.height >= 1440 ? '1440p' : window.screen.height >= 1080 ? '1080p' : '720p';
    currentResolutionRef.current = actualResKey;
    if (prefs.currentResolution !== actualResKey) {
      window.electronAPI.savePreferences({ currentResolution: actualResKey });
    }

    if (options?.markInitialLoad) {
      setIsInitialLoad(false);
    }
  };

  const refreshPreferences = async () => {
    const prefs = await window.electronAPI.getPreferences();
    applyPreferences(prefs);
  };

  // Load preferences and baseline defaults on mount
  useEffect(() => {
    const initialize = async () => {
      // Load baseline defaults first
      const baseline = await window.electronAPI.getBaselineDefaults?.();
      if (baseline) {
        baselineDefaultsRef.current = baseline;
      }

      const loadPreferences = async () => {
        try {
          const prefs = await window.electronAPI.getPreferences();
          applyPreferences(prefs, { markInitialLoad: true });
        } catch (error) {
          console.error('Error loading preferences:', error);
          setIsInitialLoad(false);
        }
      };
      await loadPreferences();
    };
    initialize();
  }, []);

  // Detect resolution changes and auto-apply defaults
  useEffect(() => {
    const handleResize = () => {
      const height = window.screen.height;
      const newResKey = height >= 2160 ? '4K' : height >= 1440 ? '1440p' : height >= 1080 ? '1080p' : '720p';

      if (newResKey !== currentResolutionRef.current) {
        console.log(`[App] Resolution change detected: ${currentResolutionRef.current} -> ${newResKey}. Auto-applying baseline defaults.`);
        currentResolutionRef.current = newResKey;
        applyBaselineDefaults(newResKey);
        window.electronAPI.savePreferences({ currentResolution: newResKey });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode]);

  // Set background blur to 0 when switching to carousel/coverflow mode and sync divider widths when view changes
  useEffect(() => {
    if ((viewMode === 'carousel' || viewMode === 'coverflow') && backgroundBlur !== 0) {
      setBackgroundBlur(0);
    }
    // Sync panelWidth to current view's setting
    if (viewMode !== 'carousel' && viewMode !== 'coverflow') {
      const viewSpecificWidth = panelWidthByViewState[viewMode];
      setPanelWidth(viewSpecificWidth);
    }
  }, [viewMode]);

  // Persistence Effects

  // Save grid size
  useEffect(() => {
    if (isInitialLoad) return;
    if (autoSizeToFit) return;
    const saveGridSize = async () => {
      try {
        await window.electronAPI.savePreferences({ gridSize });
      } catch (error) {
        console.error('Error saving grid size:', error);
      }
    };
    const timeoutId = setTimeout(saveGridSize, 500);
    return () => clearTimeout(timeoutId);
  }, [gridSize, autoSizeToFit, isInitialLoad]);

  // Save logo size
  useEffect(() => {
    if (isInitialLoad) return;
    const saveLogoSize = async () => {
      try {
        await window.electronAPI.savePreferences({ logoSize });
      } catch (error) {
        console.error('Error saving logo size:', error);
      }
    };
    const timeoutId = setTimeout(saveLogoSize, 500);
    return () => clearTimeout(timeoutId);
  }, [logoSize, isInitialLoad]);

  // Save pinned categories
  useEffect(() => {
    if (isInitialLoad) return;
    const savePinnedCategories = async () => {
      try {
        await window.electronAPI.savePreferences({ pinnedCategories });
      } catch (error) {
        console.error('Error saving pinned categories:', error);
      }
    };
    const timeoutId = setTimeout(savePinnedCategories, 300);
    return () => clearTimeout(timeoutId);
  }, [pinnedCategories, isInitialLoad]);

  // Save hideVRTitles
  useEffect(() => {
    if (isInitialLoad) return;
    const saveHideVRTitles = async () => {
      try {
        await window.electronAPI.savePreferences({ hideVRTitles });
      } catch (error) {
        console.error('Error saving hide VR titles preference:', error);
      }
    };
    const timeoutId = setTimeout(saveHideVRTitles, 300);
    return () => clearTimeout(timeoutId);
  }, [hideVRTitles, isInitialLoad]);

  // Save hideAppsTitles
  useEffect(() => {
    if (isInitialLoad) return;
    const saveHideAppsTitles = async () => {
      try {
        await window.electronAPI.savePreferences({ hideAppsTitles });
      } catch (error) {
        console.error('Error saving hide Apps titles preference:', error);
      }
    };
    const timeoutId = setTimeout(saveHideAppsTitles, 300);
    return () => clearTimeout(timeoutId);
  }, [hideAppsTitles, isInitialLoad]);

  // Save appearance preferences
  useEffect(() => {
    if (isInitialLoad) return;
    const saveAppearancePrefs = async () => {
      try {
        await window.electronAPI.savePreferences({
          hideGameTitles,
          gameTilePadding,
          backgroundBlur,
          backgroundBrightnessByView,
          viewMode,
          backgroundMode,
          backgroundColor,
          listViewOptions,
          listViewSize
        });
      } catch (error) {
        console.error('Error saving appearance preferences:', error);
      }
    };
    const timeoutId = setTimeout(saveAppearancePrefs, 500);
    return () => clearTimeout(timeoutId);
  }, [hideGameTitles, gameTilePadding, backgroundBlur, backgroundBrightnessByView, viewMode, backgroundMode, backgroundColor, listViewOptions, listViewSize, isInitialLoad]);

  const handleTogglePinCategory = (category: string) => {
    setPinnedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      } else {
        return [...prev, category];
      }
    });
  };

  const value = {
    viewMode,
    setViewMode,
    gridSize,
    setGridSize,
    logoSize,
    setLogoSize,
    pinnedCategories,
    setPinnedCategories,
    handleTogglePinCategory,
    hideVRTitles,
    setHideVRTitles,
    hideAppsTitles,
    setHideAppsTitles,
    hideGameTitles,
    setHideGameTitles,
    gameTilePadding,
    setGameTilePadding,
    selectedBoxArtSize,
    setSelectedBoxArtSize,
    showLogoOverBoxart,
    setShowLogoOverBoxart,
    logoPosition,
    setLogoPosition,
    logoBackgroundColor,
    setLogoBackgroundColor,
    logoBackgroundOpacity,
    setLogoBackgroundOpacity,
    backgroundBlur,
    setBackgroundBlur,
    backgroundBrightnessByView,
    setBackgroundBrightnessByView,
    showCarouselDetails,
    setShowCarouselDetails,
    showCarouselLogos,
    setShowCarouselLogos,
    detailsBarSize,
    setDetailsBarSize,
    carouselLogoSize,
    setCarouselLogoSize,
    carouselButtonSize,
    setCarouselButtonSize,
    carouselDescriptionSize,
    setCarouselDescriptionSize,
    gridDescriptionSize,
    listViewOptions,
    setListViewOptions,
    listViewSize,
    setListViewSize,
    rightPanelLogoSize,
    setRightPanelLogoSize,
    rightPanelBoxartPosition,
    setRightPanelBoxartPosition,
    rightPanelBoxartSize,
    setRightPanelBoxartSize,
    rightPanelTextSize,
    setRightPanelTextSize,
    rightPanelButtonSize,
    setRightPanelButtonSize,
    rightPanelButtonLocation,
    setRightPanelButtonLocation,
    detailsPanelOpacity,
    setDetailsPanelOpacity,
    isViewFlippedByView,
    setIsViewFlippedByView,
    rightPanelButtonColors,
    setRightPanelButtonColors,
    carouselButtonColors,
    setCarouselButtonColors,
    gridButtonColors,
    setGridButtonColors,
    listButtonColors,
    setListButtonColors,
    logoButtonColors,
    setLogoButtonColors,
    coverFlowCoverSize,
    setCoverFlowCoverSize,
    coverFlowReflection,
    setCoverFlowReflection,
    coverFlowVerticalOffset,
    setCoverFlowVerticalOffset,
    coverFlowSideOpacity,
    setCoverFlowSideOpacity,
    coverFlowShowButtons,
    setCoverFlowShowButtons,
    coverFlowButtonPosition,
    setCoverFlowButtonPosition,
    coverFlowButtonColors,
    setCoverFlowButtonColors,
    topBarPositions,
    setTopBarPositions,
    fanartHeightByView,
    setFanartHeightByView,
    descriptionWidthByView,
    setDescriptionWidthByView,
    panelWidthByViewState,
    setPanelWidthByViewState,
    panelWidth,
    setPanelWidth,
    showCategoriesByView,
    setShowCategoriesByView,
    categoriesPositionByView,
    setCategoriesPositionByView,
    categoriesAlignmentByView,
    setCategoriesAlignmentByView,
    categoriesSizeByView,
    setCategoriesSizeByView,
    linkDisplayOrder,
    setLinkDisplayOrder,
    visibleLinkTypes,
    setVisibleLinkTypes,
    confirmGameLaunch,
    setConfirmGameLaunch,
    backgroundMode,
    setBackgroundMode,
    backgroundColor,
    setBackgroundColor,
    autoSizeToFit,
    setAutoSizeToFit,
    isInitialLoad,
    refreshPreferences,
    applyPreferences,
    currentResolution: currentResolutionRef.current,
  };

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
