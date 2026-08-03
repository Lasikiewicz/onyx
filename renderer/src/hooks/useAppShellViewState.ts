import { useEffect, useState } from 'react';
import type { TopBarPositions } from '../components/TopBarContextMenu';

export function useAppShellViewState() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card'>('grid');
  const [activeSection] = useState('library');
  const [showTopBar] = useState(false);
  const [gridSize, setGridSize] = useState(145);
  const [cardColumns, setCardColumns] = useState(4);
  const [cardSmartFill, setCardSmartFill] = useState(false);
  const [cardPostersOnly, setCardPostersOnly] = useState(false);
  const [logoSize, setLogoSize] = useState(100);
  const [pinnedCategories, setPinnedCategories] = useState<string[]>([]);
  const [hideVRTitles, setHideVRTitles] = useState(true);
  const [hideAppsTitles, setHideAppsTitles] = useState(true);
  const [hideGameTitles, setHideGameTitles] = useState(false);
  const [gameTilePadding, setGameTilePadding] = useState(10);
  const [selectedBoxArtSize, setSelectedBoxArtSize] = useState(25);
  const [showLogoOverBoxart, setShowLogoOverBoxart] = useState(false);
  const [logoPosition, setLogoPosition] = useState<'top' | 'middle' | 'bottom' | 'underneath'>('middle');
  const [logoBackgroundColor, setLogoBackgroundColor] = useState('#374151');
  const [logoBackgroundOpacity, setLogoBackgroundOpacity] = useState(100);
  const [backgroundBlur, setBackgroundBlur] = useState(40);
  const [backgroundBrightnessByView, setBackgroundBrightnessByView] = useState<Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card', number>>({
    grid: 0.3,
    list: 0.3,
    logo: 0.3,
    carousel: 0.3,
    coverflow: 0.3,
    card: 1,
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
  const [rightPanelLogoSizeByView, setRightPanelLogoSizeByView] = useState<Record<'grid' | 'list' | 'logo', number>>({
    grid: 250,
    list: 100,
    logo: 100,
  });
  const [rightPanelBoxartPositionByView, setRightPanelBoxartPositionByView] = useState<Record<'grid' | 'list' | 'logo', 'left' | 'right' | 'none'>>({
    grid: 'right',
    list: 'right',
    logo: 'right',
  });
  const [rightPanelBoxartSizeByView, setRightPanelBoxartSizeByView] = useState<Record<'grid' | 'list' | 'logo', number>>({
    grid: 120,
    list: 120,
    logo: 120,
  });
  const [rightPanelTextSizeByView, setRightPanelTextSizeByView] = useState<Record<'grid' | 'list' | 'logo', number>>({
    grid: 14,
    list: 14,
    logo: 14,
  });
  const [rightPanelButtonSizeByView, setRightPanelButtonSizeByView] = useState<Record<'grid' | 'list' | 'logo', number>>({
    grid: 14,
    list: 14,
    logo: 14,
  });
  const [rightPanelButtonLocationByView, setRightPanelButtonLocationByView] = useState<Record<'grid' | 'list' | 'logo', 'left' | 'middle' | 'right'>>({
    grid: 'right',
    list: 'right',
    logo: 'right',
  });
  const [detailsPanelOpacityByView, setDetailsPanelOpacityByView] = useState<Record<'grid' | 'list' | 'logo', number>>({
    grid: 15,
    list: 80,
    logo: 80,
  });
  const [isViewFlippedByView, setIsViewFlippedByView] = useState<Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card', boolean>>({
    grid: false,
    list: false,
    logo: false,
    carousel: false,
    coverflow: false,
    card: false,
  });
  const [rightPanelButtonColors, setRightPanelButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  const [carouselButtonColors, setCarouselButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  const [gridButtonColors, setGridButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  const [listButtonColors, setListButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  const [logoButtonColors, setLogoButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  const [coverFlowCoverSize, setCoverFlowCoverSize] = useState(300);
  const [coverFlowReflection, setCoverFlowReflection] = useState(60);
  const [coverFlowVerticalOffset, setCoverFlowVerticalOffset] = useState(0);
  const [coverFlowSideOpacity, setCoverFlowSideOpacity] = useState(100);
  const [coverFlowShowButtons, setCoverFlowShowButtons] = useState(true);
  const [coverFlowButtonPosition, setCoverFlowButtonPosition] = useState<'left' | 'middle' | 'right'>('middle');
  const [coverFlowButtonColors, setCoverFlowButtonColors] = useState<{ playColor?: string; editColor?: string; modManagerColor?: string }>({ playColor: '#0ea5e9', editColor: '#6b7280', modManagerColor: '#a855f7' });
  const [topBarPositions, setTopBarPositions] = useState<TopBarPositions>({
    searchBar: 'left',
    sortBy: 'left',
    launcher: 'left',
    categories: 'left',
    pinnedCategories: 'left',
    removeButtonBackgrounds: true,
  });
  const [fanartHeightByView, setFanartHeightByView] = useState<Record<'grid' | 'list' | 'logo', number>>({
    grid: 320,
    list: 320,
    logo: 320,
  });
  const [detailsPanelBottomBarHeight, setDetailsPanelBottomBarHeight] = useState(72);
  const [descriptionWidthByView, setDescriptionWidthByView] = useState<Record<'grid' | 'list' | 'logo', number>>({
    grid: 74,
    list: 50,
    logo: 50,
  });
  const [disableAllAnimations, setDisableAllAnimations] = useState(false);
  const [disableAnimatedBanners, setDisableAnimatedBanners] = useState(false);
  const [disableAnimatedBoxarts, setDisableAnimatedBoxarts] = useState(false);
  const [disableAnimatedBackgrounds, setDisableAnimatedBackgrounds] = useState(false);
  const [disableAnimatedIcons, setDisableAnimatedIcons] = useState(false);
  const [disableAnimatedLogos, setDisableAnimatedLogos] = useState(false);
  const [panelWidthByViewState, setPanelWidthByViewState] = useState<Record<'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card', number>>({
    grid: 967,
    list: 800,
    logo: 800,
    carousel: 800,
    coverflow: 800,
    card: 800,
  });
  const [showCategoriesByView, setShowCategoriesByView] = useState<Record<string, boolean>>({
    grid: false,
    list: false,
    logo: false,
  });
  const [categoriesPositionByView, setCategoriesPositionByView] = useState<Record<string, 'top' | 'bottom'>>({
    grid: 'top',
    list: 'top',
    logo: 'top',
  });
  const [categoriesAlignmentByView, setCategoriesAlignmentByView] = useState<Record<string, 'left' | 'center' | 'right'>>({
    grid: 'left',
    list: 'left',
    logo: 'left',
  });
  const [categoriesSizeByView, setCategoriesSizeByView] = useState<Record<string, number>>({
    grid: 12,
    list: 12,
    logo: 12,
  });
  const [backgroundMode, setBackgroundMode] = useState<'image' | 'color'>('image');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [listViewOptions, setListViewOptions] = useState(defaultListViewOptions);
  const [listViewSize, setListViewSize] = useState(128);
  const [_panelWidth, setPanelWidth] = useState(800);
  const [gridSmartFill, setGridSmartFill] = useState(true);
  const [gridMaximizeSpace, setGridMaximizeSpace] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedLauncher, setSelectedLauncher] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'title' | 'releaseDate' | 'playtime' | 'lastPlayed'>('title');

  const currentFanartHeight = (viewMode === 'grid' || viewMode === 'list' || viewMode === 'logo') ? fanartHeightByView[viewMode] : 320;
  const currentDescriptionWidth = (viewMode === 'grid' || viewMode === 'list' || viewMode === 'logo') ? descriptionWidthByView[viewMode] : 50;
  const currentPanelWidth = (viewMode === 'grid' || viewMode === 'list' || viewMode === 'logo') ? panelWidthByViewState[viewMode] : 800;
  const detailViewMode = viewMode === 'list' ? 'list' : viewMode === 'logo' ? 'logo' : 'grid';
  const currentRightPanelLogoSize = rightPanelLogoSizeByView[detailViewMode];
  const currentRightPanelBoxartPosition = rightPanelBoxartPositionByView[detailViewMode];
  const currentRightPanelBoxartSize = rightPanelBoxartSizeByView[detailViewMode];
  const currentRightPanelTextSize = rightPanelTextSizeByView[detailViewMode];
  const currentRightPanelButtonSize = rightPanelButtonSizeByView[detailViewMode];
  const currentRightPanelButtonLocation = rightPanelButtonLocationByView[detailViewMode];
  const currentDetailsPanelOpacity = detailsPanelOpacityByView[detailViewMode];
  const rightPanelNeedsTopPadding = viewMode === 'grid' || viewMode === 'list' || viewMode === 'logo';
  const currentBackgroundBrightness = backgroundBrightnessByView[viewMode] ?? 0.3;
  const carouselGameTilePadding = (viewMode === 'carousel' || viewMode === 'coverflow') && gameTilePadding > 3 ? 1 : gameTilePadding;

  useEffect(() => {
    if ((viewMode === 'carousel' || viewMode === 'coverflow') && backgroundBlur !== 0) {
      setBackgroundBlur(0);
    }

    if (viewMode !== 'carousel' && viewMode !== 'coverflow') {
      setPanelWidth(panelWidthByViewState[viewMode]);
    }
  }, [backgroundBlur, panelWidthByViewState, viewMode]);

  return {
    activeSection,
    backgroundBlur,
    backgroundBrightnessByView,
    backgroundColor,
    backgroundMode,
    carouselButtonColors,
    carouselButtonSize,
    carouselDescriptionSize,
    carouselGameTilePadding,
    carouselLogoSize,
    cardColumns,
    cardPostersOnly,
    cardSmartFill,
    categoriesAlignmentByView,
    categoriesPositionByView,
    categoriesSizeByView,
    coverFlowButtonColors,
    coverFlowButtonPosition,
    coverFlowCoverSize,
    coverFlowReflection,
    coverFlowShowButtons,
    coverFlowSideOpacity,
    coverFlowVerticalOffset,
    currentBackgroundBrightness,
    currentDescriptionWidth,
    currentDetailsPanelOpacity,
    currentFanartHeight,
    currentPanelWidth,
    currentRightPanelBoxartPosition,
    currentRightPanelBoxartSize,
    currentRightPanelButtonLocation,
    currentRightPanelButtonSize,
    currentRightPanelLogoSize,
    currentRightPanelTextSize,
    defaultListViewOptions,
    descriptionWidthByView,
    detailViewMode,
    detailsBarSize,
    detailsPanelBottomBarHeight,
    detailsPanelOpacityByView,
    disableAllAnimations,
    disableAnimatedBackgrounds,
    disableAnimatedBanners,
    disableAnimatedBoxarts,
    disableAnimatedIcons,
    disableAnimatedLogos,
    fanartHeightByView,
    gameTilePadding,
    gridButtonColors,
    gridDescriptionSize,
    gridSize,
    gridSmartFill,
    gridMaximizeSpace,
    hideAppsTitles,
    hideGameTitles,
    hideVRTitles,
    isViewFlippedByView,
    listButtonColors,
    listViewOptions,
    listViewSize,
    logoBackgroundColor,
    logoBackgroundOpacity,
    logoButtonColors,
    logoPosition,
    logoSize,
    panelWidthByViewState,
    pinnedCategories,
    rightPanelBoxartPositionByView,
    rightPanelBoxartSizeByView,
    rightPanelButtonColors,
    rightPanelButtonLocationByView,
    rightPanelButtonSizeByView,
    rightPanelLogoSizeByView,
    rightPanelNeedsTopPadding,
    rightPanelTextSizeByView,
    searchQuery,
    selectedBoxArtSize,
    selectedCategory,
    selectedLauncher,
    setBackgroundBlur,
    setBackgroundBrightnessByView,
    setBackgroundColor,
    setBackgroundMode,
    setCardColumns,
    setCardPostersOnly,
    setCardSmartFill,
    setCarouselButtonColors,
    setCarouselButtonSize,
    setCarouselDescriptionSize,
    setCarouselLogoSize,
    setCategoriesAlignmentByView,
    setCategoriesPositionByView,
    setCategoriesSizeByView,
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
    setFanartHeightByView,
    setGameTilePadding,
    setGridButtonColors,
    setGridSize,
    setGridSmartFill,
    setGridMaximizeSpace,
    setHideAppsTitles,
    setHideGameTitles,
    setHideVRTitles,
    setIsViewFlippedByView,
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
    setRightPanelBoxartPositionByView,
    setRightPanelBoxartSizeByView,
    setRightPanelButtonColors,
    setRightPanelButtonLocationByView,
    setRightPanelButtonSizeByView,
    setRightPanelLogoSizeByView,
    setRightPanelTextSizeByView,
    setSearchQuery,
    setSelectedBoxArtSize,
    setSelectedCategory,
    setSelectedLauncher,
    setShowCarouselDetails,
    setShowCarouselLogos,
    setShowCategoriesByView,
    setShowLogoOverBoxart,
    setSortBy,
    setTopBarPositions,
    setViewMode,
    showCarouselDetails,
    showCarouselLogos,
    showCategoriesByView,
    showLogoOverBoxart,
    showTopBar,
    sortBy,
    topBarPositions,
    viewMode,
  };
}
