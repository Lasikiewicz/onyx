import { useCallback, useEffect, useRef, useState } from 'react';
import type { TopBarPositions } from '../components/TopBarContextMenu';

type ViewMode = 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow';
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
  setRightPanelLogoSize: (value: number) => void;
  setRightPanelBoxartPosition: (value: 'left' | 'right' | 'none') => void;
  setRightPanelBoxartSize: (value: number) => void;
  setRightPanelTextSize: (value: number) => void;
  setRightPanelButtonSize: (value: number) => void;
  setRightPanelButtonLocation: (value: 'left' | 'middle' | 'right') => void;
  setDetailsPanelOpacity: (value: number) => void;
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
  setAutoSizeToFit: (value: boolean) => void;
  setActiveGameId: (value: string | null) => void;
  setConfirmGameLaunch: (value: boolean) => void;
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
  setRightPanelLogoSize,
  setRightPanelBoxartPosition,
  setRightPanelBoxartSize,
  setRightPanelTextSize,
  setRightPanelButtonSize,
  setRightPanelButtonLocation,
  setDetailsPanelOpacity,
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
  setAutoSizeToFit,
  setActiveGameId,
  setConfirmGameLaunch,
  setLinkDisplayOrder,
  setVisibleLinkTypes,
  setSelectedCategory,
  setSortBy,
}: UseAppPreferencesOptions) {
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const currentResolutionRef = useRef<string>(getResolutionKey());
  const baselineDefaultsRef = useRef<any>(null);

  const applyBaselineDefaults = useCallback((resKey: string) => {
    if (!baselineDefaultsRef.current || !baselineDefaultsRef.current[resKey]) return;
    const defaults = baselineDefaultsRef.current[resKey][viewMode];
    if (!defaults) return;

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
      if (defaults.gameTilePadding !== undefined) setGameTilePadding(defaults.gameTilePadding);
    }

    if (defaults.backgroundBlur !== undefined) setBackgroundBlur(defaults.backgroundBlur);
    if (defaults.panelWidth !== undefined) setPanelWidth(defaults.panelWidth);
    if (defaults.rightPanelBoxartPosition !== undefined) setRightPanelBoxartPosition(defaults.rightPanelBoxartPosition);
    if (defaults.rightPanelBoxartSize !== undefined) setRightPanelBoxartSize(defaults.rightPanelBoxartSize);
    if (defaults.rightPanelTextSize !== undefined) setRightPanelTextSize(defaults.rightPanelTextSize);
    if (defaults.rightPanelButtonSize !== undefined) setRightPanelButtonSize(defaults.rightPanelButtonSize);
    if (defaults.rightPanelButtonLocation !== undefined) setRightPanelButtonLocation(defaults.rightPanelButtonLocation);
    if (defaults.detailsPanelOpacity !== undefined) setDetailsPanelOpacity(defaults.detailsPanelOpacity);
  }, [
    setBackgroundBlur,
    setCarouselButtonSize,
    setCarouselDescriptionSize,
    setCarouselLogoSize,
    setDetailsBarSize,
    setDetailsPanelOpacity,
    setGameTilePadding,
    setGridSize,
    setListViewOptions,
    setLogoBackgroundOpacity,
    setLogoSize,
    setPanelWidth,
    setRightPanelBoxartPosition,
    setRightPanelBoxartSize,
    setRightPanelButtonLocation,
    setRightPanelButtonSize,
    setRightPanelLogoSize,
    setRightPanelTextSize,
    setSelectedBoxArtSize,
    setShowCarouselDetails,
    setShowCarouselLogos,
    setShowLogoOverBoxart,
    viewMode,
  ]);

  const applyPreferences = useCallback((prefs: any, options?: { markInitialLoad?: boolean }) => {
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
    if (prefs.disableAllAnimations !== undefined) setDisableAllAnimations(prefs.disableAllAnimations);
    if (prefs.disableAnimatedBanners !== undefined) setDisableAnimatedBanners(prefs.disableAnimatedBanners);
    if (prefs.disableAnimatedBoxarts !== undefined) setDisableAnimatedBoxarts(prefs.disableAnimatedBoxarts);
    if (prefs.disableAnimatedBackgrounds !== undefined) setDisableAnimatedBackgrounds(prefs.disableAnimatedBackgrounds);
    if (prefs.disableAnimatedIcons !== undefined) setDisableAnimatedIcons(prefs.disableAnimatedIcons);
    if (prefs.disableAnimatedLogos !== undefined) setDisableAnimatedLogos(prefs.disableAnimatedLogos);
    if (prefs.isViewFlippedByView !== undefined) {
      setIsViewFlippedByView({ grid: false, list: false, logo: false, carousel: false, coverflow: false, ...prefs.isViewFlippedByView });
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
    if (prefs.autoSizeToFit !== undefined) setAutoSizeToFit(prefs.autoSizeToFit);
    if (prefs.activeGameId) setActiveGameId(prefs.activeGameId);
    if (prefs.isFirstLaunch && baselineDefaultsRef.current) {
      console.log(`[App] First launch detected. Applying baseline defaults for ${currentResolutionRef.current}.`);
      applyBaselineDefaults(currentResolutionRef.current);
      window.electronAPI.savePreferences({ isFirstLaunch: false });
    }
    if (prefs.confirmGameLaunch !== undefined) setConfirmGameLaunch(prefs.confirmGameLaunch);
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
    setAutoSizeToFit,
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
    setDetailsPanelOpacity,
    setDisableAllAnimations,
    setDisableAnimatedBackgrounds,
    setDisableAnimatedBanners,
    setDisableAnimatedBoxarts,
    setDisableAnimatedIcons,
    setDisableAnimatedLogos,
    setFanartHeightByView,
    setGameTilePadding,
    setGridButtonColors,
    setGridSize,
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
    setRightPanelBoxartPosition,
    setRightPanelBoxartSize,
    setRightPanelButtonColors,
    setRightPanelButtonLocation,
    setRightPanelButtonSize,
    setRightPanelLogoSize,
    setRightPanelTextSize,
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
        applyPreferences(prefs, { markInitialLoad: true });
      } catch (error) {
        console.error('Error loading preferences:', error);
        setIsInitialLoad(false);
      }
    };

    initialize();
  }, [applyPreferences]);

  useEffect(() => {
    const handleResize = () => {
      const newResKey = getResolutionKey();
      if (newResKey !== currentResolutionRef.current) {
        console.log(`[App] Resolution change detected: ${currentResolutionRef.current} -> ${newResKey}. Auto-applying baseline defaults.`);
        currentResolutionRef.current = newResKey;
        applyBaselineDefaults(newResKey);
        window.electronAPI.savePreferences({ currentResolution: newResKey });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [applyBaselineDefaults]);

  return {
    isInitialLoad,
    refreshPreferences,
  };
}
