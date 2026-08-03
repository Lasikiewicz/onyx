import { useCallback, useEffect, useRef, useState } from 'react';
import type { TopBarPositions } from '../components/TopBarContextMenu';

type ViewMode = 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card';
interface UseAppPreferencesOptions {
  viewMode: ViewMode;
  defaultListViewOptions: {
    showDescription: boolean;
    showCategories: boolean;
    showPlaytime: boolean;
    showReleaseDate: boolean;
    showGenres: boolean;
    showPlatform: boolean;
    showLauncher: boolean;
    showLogos: boolean;
    titleTextSize: number;
  };
  defaultTopBarPositions: TopBarPositions;
  defaultFanartHeightByView: Record<'grid' | 'list' | 'logo', number>;
  defaultDescriptionWidthByView: Record<'grid' | 'list' | 'logo', number>;
  defaultPanelWidthByView: Record<ViewMode, number>;
  setGridSize: (value: number) => void;
  setCardColumns: (value: number) => void;
  setCardPostersOnly: (value: boolean) => void;
  setCardSmartFill: (value: boolean) => void;
  setLogoSize: (value: number) => void;
  setPinnedCategories: (value: string[]) => void;
  setHideVRTitles: (value: boolean) => void;
  setHideAppsTitles: (value: boolean) => void;
  setHideGameTitles: (value: boolean) => void;
  setGameTilePadding: (value: number) => void;
  setShowCategoriesByView: (value: Record<string, boolean>) => void;
  setCategoriesPositionByView: (value: Record<string, 'top' | 'bottom'>) => void;
  setCategoriesAlignmentByView: (value: Record<string, 'left' | 'center' | 'right'>) => void;
  setCategoriesSizeByView: (value: Record<string, number>) => void;
  setShowLogoOverBoxart: (value: boolean) => void;
  setLogoPosition: (value: 'top' | 'middle' | 'bottom' | 'underneath') => void;
  setLogoBackgroundColor: (value: string) => void;
  setLogoBackgroundOpacity: (value: number) => void;
  setBackgroundBlur: (value: number) => void;
  setBackgroundBrightnessByView: (value: Record<ViewMode, number>) => void;
  setShowCarouselDetails: (value: boolean) => void;
  setShowCarouselLogos: (value: boolean) => void;
  setSelectedBoxArtSize: (value: number) => void;
  setDetailsBarSize: (value: number) => void;
  setCarouselLogoSize: (value: number) => void;
  setCarouselButtonSize: (value: number) => void;
  setCarouselDescriptionSize: (value: number) => void;
  setRightPanelLogoSizeByView: (value: Record<'grid' | 'list' | 'logo', number>) => void;
  setRightPanelBoxartPositionByView: (value: Record<'grid' | 'list' | 'logo', 'left' | 'right' | 'none'>) => void;
  setRightPanelBoxartSizeByView: (value: Record<'grid' | 'list' | 'logo', number>) => void;
  setRightPanelTextSizeByView: (value: Record<'grid' | 'list' | 'logo', number>) => void;
  setRightPanelButtonSizeByView: (value: Record<'grid' | 'list' | 'logo', number>) => void;
  setRightPanelButtonLocationByView: (value: Record<'grid' | 'list' | 'logo', 'left' | 'middle' | 'right'>) => void;
  setDetailsPanelOpacityByView: (value: Record<'grid' | 'list' | 'logo', number>) => void;
  setRightPanelButtonColors: (value: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  setCarouselButtonColors: (value: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  setGridButtonColors: (value: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  setListButtonColors: (value: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  setLogoButtonColors: (value: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  setCoverFlowCoverSize: (value: number) => void;
  setCoverFlowReflection: (value: number) => void;
  setCoverFlowVerticalOffset: (value: number) => void;
  setCoverFlowSideOpacity: (value: number) => void;
  setCoverFlowShowButtons: (value: boolean) => void;
  setCoverFlowButtonPosition: (value: 'left' | 'middle' | 'right') => void;
  setCoverFlowButtonColors: (value: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  setDisableAllAnimations: (value: boolean) => void;
  setDisableAnimatedBanners: (value: boolean) => void;
  setDisableAnimatedBoxarts: (value: boolean) => void;
  setDisableAnimatedBackgrounds: (value: boolean) => void;
  setDisableAnimatedIcons: (value: boolean) => void;
  setDisableAnimatedLogos: (value: boolean) => void;
  setIsViewFlippedByView: (value: Record<ViewMode, boolean>) => void;
  setTopBarPositions: (value: TopBarPositions) => void;
  setViewMode: (value: ViewMode) => void;
  setBackgroundMode: (value: 'image' | 'color') => void;
  setBackgroundColor: (value: string) => void;
  setListViewOptions: (value: UseAppPreferencesOptions['defaultListViewOptions']) => void;
  setListViewSize: (value: number) => void;
  setFanartHeightByView: (value: Record<'grid' | 'list' | 'logo', number>) => void;
  setDescriptionWidthByView: (value: Record<'grid' | 'list' | 'logo', number>) => void;
  setDetailsPanelBottomBarHeight: (value: number) => void;
  setPanelWidthByViewState: (value: Record<ViewMode, number>) => void;
  setPanelWidth: (value: number) => void;
  setGridSmartFill: (value: boolean) => void;
  setActiveGameId: (value: string | null) => void;
  setConfirmGameLaunch: (value: boolean) => void;
  setEnableGamepadSupport: (value: boolean) => void;
  setGamepadButtonLayout: (value: 'xbox' | 'playstation') => void;
  setGamepadNavigationSpeed: (value: number) => void;
  setLinkDisplayOrder: (value: string[]) => void;
  setVisibleLinkTypes: (value: Record<string, boolean>) => void;
  setSelectedCategory: (value: string | null) => void;
  setSortBy: (value: 'title' | 'releaseDate' | 'playtime' | 'lastPlayed') => void;
}

function getResolutionKey() {
  return window.screen.height >= 2160 ? '4K' : window.screen.height >= 1440 ? '1440p' : window.screen.height >= 1080 ? '1080p' : '720p';
}

export function useAppPreferences({
  viewMode,
  defaultListViewOptions,
  defaultTopBarPositions,
  defaultFanartHeightByView,
  defaultDescriptionWidthByView,
  defaultPanelWidthByView,
  setGridSize,
  setCardColumns,
  setCardPostersOnly,
  setCardSmartFill,
  setLogoSize,
  setPinnedCategories,
  setHideVRTitles,
  setHideAppsTitles,
  setHideGameTitles,
  setGameTilePadding,
  setShowCategoriesByView,
  setCategoriesPositionByView,
  setCategoriesAlignmentByView,
  setCategoriesSizeByView,
  setShowLogoOverBoxart,
  setLogoPosition,
  setLogoBackgroundColor,
  setLogoBackgroundOpacity,
  setBackgroundBlur,
  setBackgroundBrightnessByView,
  setShowCarouselDetails,
  setShowCarouselLogos,
  setSelectedBoxArtSize,
  setDetailsBarSize,
  setCarouselLogoSize,
  setCarouselButtonSize,
  setCarouselDescriptionSize,
  setRightPanelLogoSizeByView,
  setRightPanelBoxartPositionByView,
  setRightPanelBoxartSizeByView,
  setRightPanelTextSizeByView,
  setRightPanelButtonSizeByView,
  setRightPanelButtonLocationByView,
  setDetailsPanelOpacityByView,
  setRightPanelButtonColors,
  setCarouselButtonColors,
  setGridButtonColors,
  setListButtonColors,
  setLogoButtonColors,
  setCoverFlowCoverSize,
  setCoverFlowReflection,
  setCoverFlowVerticalOffset,
  setCoverFlowSideOpacity,
  setCoverFlowShowButtons,
  setCoverFlowButtonPosition,
  setCoverFlowButtonColors,
  setDisableAllAnimations,
  setDisableAnimatedBanners,
  setDisableAnimatedBoxarts,
  setDisableAnimatedBackgrounds,
  setDisableAnimatedIcons,
  setDisableAnimatedLogos,
  setIsViewFlippedByView,
  setTopBarPositions,
  setViewMode,
  setBackgroundMode,
  setBackgroundColor,
  setListViewOptions,
  setListViewSize,
  setFanartHeightByView,
  setDescriptionWidthByView,
  setDetailsPanelBottomBarHeight,
  setPanelWidthByViewState,
  setPanelWidth,
  setGridSmartFill,
  setActiveGameId,
  setConfirmGameLaunch,
  setEnableGamepadSupport,
  setGamepadButtonLayout,
  setGamepadNavigationSpeed,
  setLinkDisplayOrder,
  setVisibleLinkTypes,
  setSelectedCategory,
  setSortBy,
}: UseAppPreferencesOptions) {
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const currentResolutionRef = useRef<string>(getResolutionKey());
  const baselineDefaultsRef = useRef<any>(null);
  const applyPreferencesRef = useRef<(prefs: any, options?: { markInitialLoad?: boolean }) => void>(() => {});

  const applyBaselineDefaults = useCallback((resKey: string) => {
    if (!baselineDefaultsRef.current || !baselineDefaultsRef.current[resKey]) return;
    const defaults = baselineDefaultsRef.current[resKey][viewMode];
    if (!defaults) return;

    if (viewMode === 'grid') {
      if (defaults.gridSize !== undefined) setGridSize(defaults.gridSize);
      if (defaults.gridSmartFill !== undefined) setGridSmartFill(defaults.gridSmartFill);
      if (defaults.showLogoOverBoxart !== undefined) setShowLogoOverBoxart(defaults.showLogoOverBoxart);
      if (defaults.gameTilePadding !== undefined) setGameTilePadding(defaults.gameTilePadding);
    } else if (viewMode === 'logo') {
      if (defaults.logoSize !== undefined) setLogoSize(defaults.logoSize);
      if (defaults.gridSmartFill !== undefined) setGridSmartFill(defaults.gridSmartFill);
      if (defaults.logoBackgroundOpacity !== undefined) setLogoBackgroundOpacity(defaults.logoBackgroundOpacity);
      if (defaults.gameTilePadding !== undefined) setGameTilePadding(defaults.gameTilePadding);
    } else if (viewMode === 'list') {
      if (defaults.listViewOptions !== undefined) setListViewOptions(defaults.listViewOptions);
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
      if (defaults.gameTilePadding !== undefined) setGameTilePadding(defaults.gameTilePadding);
    } else if (viewMode === 'card') {
      if (defaults.cardColumns !== undefined) setCardColumns(defaults.cardColumns);
      if (defaults.cardPostersOnly !== undefined) setCardPostersOnly(defaults.cardPostersOnly);
      if (defaults.cardSmartFill !== undefined) setCardSmartFill(defaults.cardSmartFill);
      if (defaults.gameTilePadding !== undefined) setGameTilePadding(defaults.gameTilePadding);
    }

    if (defaults.backgroundBlur !== undefined) setBackgroundBlur(defaults.backgroundBlur);
    if (defaults.panelWidth !== undefined) setPanelWidth(defaults.panelWidth);
  }, [
    setBackgroundBlur,
    setCardColumns,
    setCardPostersOnly,
    setCardSmartFill,
    setCarouselButtonSize,
    setCarouselDescriptionSize,
    setCarouselLogoSize,
    setDetailsBarSize,
    setGameTilePadding,
    setGridSize,
    setGridSmartFill,
    setListViewOptions,
    setLogoBackgroundOpacity,
    setLogoSize,
    setPanelWidth,
    setSelectedBoxArtSize,
    setShowCarouselDetails,
    setShowCarouselLogos,
    setShowLogoOverBoxart,
    viewMode,
  ]);

  const applyPreferences = useCallback((prefs: any, options?: { markInitialLoad?: boolean }) => {
    if (prefs.gridSize) setGridSize(prefs.gridSize);
    if (prefs.cardColumns) setCardColumns(prefs.cardColumns);
    if (prefs.cardPostersOnly !== undefined) setCardPostersOnly(prefs.cardPostersOnly);
    if (prefs.cardSmartFill !== undefined) setCardSmartFill(prefs.cardSmartFill);
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
        card: prefs.backgroundBrightnessByView.card ?? 1,
      });
    }
    if (prefs.showCarouselDetails !== undefined) setShowCarouselDetails(prefs.showCarouselDetails);
    if (prefs.showCarouselLogos !== undefined) setShowCarouselLogos(prefs.showCarouselLogos);
    if (prefs.detailsBarSize !== undefined) setDetailsBarSize(prefs.detailsBarSize);
    if (prefs.carouselLogoSize !== undefined) setCarouselLogoSize(prefs.carouselLogoSize);
    if (prefs.carouselButtonSize !== undefined) setCarouselButtonSize(prefs.carouselButtonSize);
    if (prefs.carouselDescriptionSize !== undefined) setCarouselDescriptionSize(prefs.carouselDescriptionSize);
    setRightPanelLogoSizeByView({
      grid: prefs.rightPanelLogoSizeByView?.grid ?? prefs.rightPanelLogoSize ?? 100,
      list: prefs.rightPanelLogoSizeByView?.list ?? prefs.rightPanelLogoSize ?? 100,
      logo: prefs.rightPanelLogoSizeByView?.logo ?? prefs.rightPanelLogoSize ?? 100,
    });
    setRightPanelBoxartPositionByView({
      grid: prefs.rightPanelBoxartPositionByView?.grid ?? prefs.rightPanelBoxartPosition ?? 'right',
      list: prefs.rightPanelBoxartPositionByView?.list ?? prefs.rightPanelBoxartPosition ?? 'right',
      logo: prefs.rightPanelBoxartPositionByView?.logo ?? prefs.rightPanelBoxartPosition ?? 'right',
    });
    setRightPanelBoxartSizeByView({
      grid: prefs.rightPanelBoxartSizeByView?.grid ?? prefs.rightPanelBoxartSize ?? 120,
      list: prefs.rightPanelBoxartSizeByView?.list ?? prefs.rightPanelBoxartSize ?? 120,
      logo: prefs.rightPanelBoxartSizeByView?.logo ?? prefs.rightPanelBoxartSize ?? 120,
    });
    setRightPanelTextSizeByView({
      grid: prefs.rightPanelTextSizeByView?.grid ?? prefs.rightPanelTextSize ?? 14,
      list: prefs.rightPanelTextSizeByView?.list ?? prefs.rightPanelTextSize ?? 14,
      logo: prefs.rightPanelTextSizeByView?.logo ?? prefs.rightPanelTextSize ?? 14,
    });
    setRightPanelButtonSizeByView({
      grid: prefs.rightPanelButtonSizeByView?.grid ?? prefs.rightPanelButtonSize ?? 14,
      list: prefs.rightPanelButtonSizeByView?.list ?? prefs.rightPanelButtonSize ?? 14,
      logo: prefs.rightPanelButtonSizeByView?.logo ?? prefs.rightPanelButtonSize ?? 14,
    });
    setRightPanelButtonLocationByView({
      grid: prefs.rightPanelButtonLocationByView?.grid ?? prefs.rightPanelButtonLocation ?? 'right',
      list: prefs.rightPanelButtonLocationByView?.list ?? prefs.rightPanelButtonLocation ?? 'right',
      logo: prefs.rightPanelButtonLocationByView?.logo ?? prefs.rightPanelButtonLocation ?? 'right',
    });
    setDetailsPanelOpacityByView({
      grid: prefs.detailsPanelOpacityByView?.grid ?? prefs.detailsPanelOpacity ?? 80,
      list: prefs.detailsPanelOpacityByView?.list ?? prefs.detailsPanelOpacity ?? 80,
      logo: prefs.detailsPanelOpacityByView?.logo ?? prefs.detailsPanelOpacity ?? 80,
    });
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
    if (prefs.disableAllAnimations !== undefined) setDisableAllAnimations(prefs.disableAllAnimations);
    if (prefs.disableAnimatedBanners !== undefined) setDisableAnimatedBanners(prefs.disableAnimatedBanners);
    if (prefs.disableAnimatedBoxarts !== undefined) setDisableAnimatedBoxarts(prefs.disableAnimatedBoxarts);
    if (prefs.disableAnimatedBackgrounds !== undefined) setDisableAnimatedBackgrounds(prefs.disableAnimatedBackgrounds);
    if (prefs.disableAnimatedIcons !== undefined) setDisableAnimatedIcons(prefs.disableAnimatedIcons);
    if (prefs.disableAnimatedLogos !== undefined) setDisableAnimatedLogos(prefs.disableAnimatedLogos);
    if (prefs.isViewFlippedByView !== undefined) {
      setIsViewFlippedByView({ grid: false, list: false, logo: false, carousel: false, coverflow: false, card: false, ...prefs.isViewFlippedByView });
    }
    if (prefs.topBarPositions) setTopBarPositions({ ...defaultTopBarPositions, ...prefs.topBarPositions });
    if (prefs.viewMode) setViewMode(prefs.viewMode);
    if (prefs.backgroundMode) setBackgroundMode(prefs.backgroundMode as 'image' | 'color');
    if (prefs.backgroundColor) setBackgroundColor(prefs.backgroundColor);
    if (prefs.listViewOptions) {
      setListViewOptions({ ...defaultListViewOptions, ...prefs.listViewOptions });
    } else {
      setListViewOptions(defaultListViewOptions);
    }
    if (prefs.listViewSize) setListViewSize(prefs.listViewSize);
    if (prefs.fanartHeightByView) {
      setFanartHeightByView({ ...defaultFanartHeightByView, ...prefs.fanartHeightByView });
    }
    if (prefs.descriptionWidthByView) {
      setDescriptionWidthByView({ ...defaultDescriptionWidthByView, ...prefs.descriptionWidthByView });
    }
    if (prefs.detailsPanelBottomBarHeight !== undefined) setDetailsPanelBottomBarHeight(prefs.detailsPanelBottomBarHeight);
    if (prefs.panelWidthByView) {
      setPanelWidthByViewState({ ...defaultPanelWidthByView, ...prefs.panelWidthByView });
    }
    const savedPanelWidth = (prefs.panelWidthByView && prefs.viewMode ? prefs.panelWidthByView[prefs.viewMode as ViewMode] : undefined) ?? prefs.panelWidth;
    if (savedPanelWidth) setPanelWidth(savedPanelWidth);
    if (prefs.gridSmartFill !== undefined) setGridSmartFill(prefs.gridSmartFill);
    if (prefs.activeGameId) setActiveGameId(prefs.activeGameId);
    if (prefs.isFirstLaunch && baselineDefaultsRef.current) {
      console.log(`[App] First launch detected. Applying baseline defaults for ${currentResolutionRef.current}.`);
      applyBaselineDefaults(currentResolutionRef.current);
      window.electronAPI.savePreferences({ isFirstLaunch: false });
    }
    if (prefs.confirmGameLaunch !== undefined) setConfirmGameLaunch(prefs.confirmGameLaunch);
    if (prefs.enableGamepadSupport !== undefined) setEnableGamepadSupport(prefs.enableGamepadSupport);
    if (prefs.gamepadButtonLayout !== undefined) setGamepadButtonLayout(prefs.gamepadButtonLayout);
    if (prefs.gamepadNavigationSpeed !== undefined) setGamepadNavigationSpeed(prefs.gamepadNavigationSpeed);
    if (prefs.linkDisplayOrder && prefs.linkDisplayOrder.length > 0) setLinkDisplayOrder(prefs.linkDisplayOrder);
    if (prefs.visibleLinkTypes && Object.keys(prefs.visibleLinkTypes).length > 0) setVisibleLinkTypes(prefs.visibleLinkTypes);

    if (prefs.defaultStartupPage) {
      if (prefs.defaultStartupPage === 'favorites') {
        setSelectedCategory('favorites');
      } else if (prefs.defaultStartupPage === 'recent') {
        setSortBy('lastPlayed');
      } else {
        setSelectedCategory(null);
      }
    }

    const actualResKey = getResolutionKey();
    currentResolutionRef.current = actualResKey;
    if (prefs.currentResolution !== actualResKey) {
      window.electronAPI.savePreferences({ currentResolution: actualResKey });
    }

    if (options?.markInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [
    applyBaselineDefaults,
    defaultDescriptionWidthByView,
    defaultFanartHeightByView,
    defaultListViewOptions,
    defaultPanelWidthByView,
    defaultTopBarPositions,
    setActiveGameId,
    setBackgroundBlur,
    setBackgroundBrightnessByView,
    setBackgroundColor,
    setBackgroundMode,
    setCarouselButtonColors,
    setCarouselButtonSize,
    setCarouselDescriptionSize,
    setCarouselLogoSize,
    setCategoriesAlignmentByView,
    setCategoriesPositionByView,
    setCategoriesSizeByView,
    setConfirmGameLaunch,
    setEnableGamepadSupport,
    setGamepadButtonLayout,
    setGamepadNavigationSpeed,
    setCoverFlowButtonColors,
    setCoverFlowButtonPosition,
    setCoverFlowCoverSize,
    setCoverFlowReflection,
    setCoverFlowShowButtons,
    setCoverFlowSideOpacity,
    setCoverFlowVerticalOffset,
    setDescriptionWidthByView,
    setDetailsBarSize,
    setDetailsPanelBottomBarHeight,
    setDetailsPanelOpacityByView,
    setDisableAllAnimations,
    setDisableAnimatedBackgrounds,
    setDisableAnimatedBanners,
    setDisableAnimatedBoxarts,
    setDisableAnimatedIcons,
    setDisableAnimatedLogos,
    setCardColumns,
    setCardPostersOnly,
    setCardSmartFill,
    setFanartHeightByView,
    setGameTilePadding,
    setGridButtonColors,
    setGridSize,
    setGridSmartFill,
    setHideAppsTitles,
    setHideGameTitles,
    setHideVRTitles,
    setIsViewFlippedByView,
    setLinkDisplayOrder,
    setListButtonColors,
    setListViewOptions,
    setListViewSize,
    setLogoBackgroundColor,
    setLogoBackgroundOpacity,
    setLogoButtonColors,
    setLogoPosition,
    setLogoSize,
    setPanelWidth,
    setPanelWidthByViewState,
    setPinnedCategories,
    setRightPanelButtonColors,
    setRightPanelBoxartPositionByView,
    setRightPanelBoxartSizeByView,
    setRightPanelButtonLocationByView,
    setRightPanelButtonSizeByView,
    setRightPanelLogoSizeByView,
    setRightPanelTextSizeByView,
    setSelectedCategory,
    setShowCarouselDetails,
    setShowCarouselLogos,
    setShowCategoriesByView,
    setShowLogoOverBoxart,
    setSortBy,
    setTopBarPositions,
    setViewMode,
    setVisibleLinkTypes,
  ]);

  useEffect(() => {
    applyPreferencesRef.current = applyPreferences;
  }, [applyPreferences]);

  const refreshPreferences = useCallback(async () => {
    const prefs = await window.electronAPI.getPreferences();
    applyPreferences(prefs);
  }, [applyPreferences]);

  useEffect(() => {
    const initialize = async () => {
      const baseline = await window.electronAPI.getBaselineDefaults?.();
      if (baseline) {
        baselineDefaultsRef.current = baseline;
      }

      try {
        const prefs = await window.electronAPI.getPreferences();
        applyPreferencesRef.current(prefs, { markInitialLoad: true });
      } catch (error) {
        console.error('Error loading preferences:', error);
        setIsInitialLoad(false);
      }
    };

    initialize();
  }, []);

  return {
    isInitialLoad,
    refreshPreferences,
  };
}
