import { useCallback, useMemo } from 'react';
import type { Game } from '../types/game';
import type { RightClickMenuProps } from '../components/RightClickMenu';
import { usePreferenceWriter } from './usePreferenceWriter';

type ViewMode = RightClickMenuProps['viewMode'];
type DetailsViewMode = 'grid' | 'list' | 'logo';
type ButtonColors = NonNullable<RightClickMenuProps['rightPanelButtonColors']>;
type ListViewOptions = NonNullable<RightClickMenuProps['listViewOptions']>;
type ResolvedListViewOptions = ListViewOptions & {
  showLauncher: boolean;
  showLogos: boolean;
  titleTextSize: number;
};

interface UseRightClickMenuControlsOptions {
  activeGame: Game | null;
  backgroundBlur: number;
  backgroundBrightnessByView: Record<ViewMode, number>;
  carouselButtonColors: ButtonColors;
  carouselButtonSize: number;
  carouselDescriptionSize: number;
  carouselLogoSize: number;
  categoriesAlignmentByView: Record<ViewMode, 'left' | 'center' | 'right'>;
  categoriesPositionByView: Record<ViewMode, 'top' | 'bottom'>;
  categoriesSizeByView: Record<ViewMode, number>;
  cardColumns: number;
  cardPostersOnly: boolean;
  cardSmartFill: boolean;
  coverFlowButtonColors: ButtonColors;
  coverFlowButtonPosition: 'left' | 'middle' | 'right';
  coverFlowCoverSize: number;
  coverFlowReflection: number;
  coverFlowShowButtons: boolean;
  coverFlowSideOpacity: number;
  coverFlowVerticalOffset: number;
  currentBackgroundBrightness: number;
  currentDescriptionWidth: number;
  currentFanartHeight: number;
  currentPanelWidth: number;
  defaultListViewOptions: ResolvedListViewOptions;
  descriptionWidthByView: Record<DetailsViewMode, number>;
  detailsBarSize: number;
  detailsPanelBottomBarHeight: number;
  detailsPanelOpacity: number;
  detailsPanelOpacityByView: Record<DetailsViewMode, number>;
  fanartHeightByView: Record<DetailsViewMode, number>;
  gameTilePadding: number;
  gridButtonColors: ButtonColors;
  gridSize: number;
  gridSmartFill: boolean;
  gridMaximizeSpace: boolean;
  detailsPanelMinWidthPercent: number;
  isViewFlippedByView: Record<ViewMode, boolean>;
  listButtonColors: ButtonColors;
  listViewOptions: ResolvedListViewOptions;
  listViewSize: number;
  logoBackgroundColor: string;
  logoBackgroundOpacity: number;
  logoButtonColors: ButtonColors;
  logoPosition: 'top' | 'middle' | 'bottom' | 'underneath';
  logoSize: number;
  panelWidthByViewState: Record<ViewMode, number>;
  refreshPreferences: () => void;
  rightPanelBoxartPosition: 'left' | 'right' | 'none';
  rightPanelBoxartPositionByView: Record<DetailsViewMode, 'left' | 'right' | 'none'>;
  rightPanelBoxartSize: number;
  rightPanelBoxartSizeByView: Record<DetailsViewMode, number>;
  rightPanelButtonColors: ButtonColors;
  rightPanelButtonLocation: 'left' | 'middle' | 'right';
  rightPanelButtonLocationByView: Record<DetailsViewMode, 'left' | 'middle' | 'right'>;
  rightPanelButtonSize: number;
  rightPanelButtonSizeByView: Record<DetailsViewMode, number>;
  rightPanelLogoSize: number;
  rightPanelLogoSizeByView: Record<DetailsViewMode, number>;
  rightPanelTextSize: number;
  rightPanelTextSizeByView: Record<DetailsViewMode, number>;
  selectedBoxArtSize: number;
  setActiveGameId: (id: string | null) => void;
  setBackgroundBlur: (value: number) => void;
  setBackgroundBrightnessByView: (value: Record<ViewMode, number>) => void;
  setCarouselButtonColors: (value: ButtonColors) => void;
  setCarouselButtonSize: (value: number) => void;
  setCarouselDescriptionSize: (value: number) => void;
  setCarouselLogoSize: (value: number) => void;
  setCategoriesAlignmentByView: (value: Record<ViewMode, 'left' | 'center' | 'right'>) => void;
  setCategoriesPositionByView: (value: Record<ViewMode, 'top' | 'bottom'>) => void;
  setCategoriesSizeByView: (value: Record<ViewMode, number>) => void;
  setCardColumns: (value: number) => void;
  setCardPostersOnly: (value: boolean) => void;
  setCardSmartFill: (value: boolean) => void;
  setCoverFlowButtonColors: (value: ButtonColors) => void;
  setCoverFlowButtonPosition: (value: 'left' | 'middle' | 'right') => void;
  setCoverFlowCoverSize: (value: number) => void;
  setCoverFlowReflection: (value: number) => void;
  setCoverFlowShowButtons: (value: boolean) => void;
  setCoverFlowSideOpacity: (value: number) => void;
  setCoverFlowVerticalOffset: (value: number) => void;
  setDescriptionWidthByView: (value: Record<DetailsViewMode, number>) => void;
  setDetailsBarSize: (value: number) => void;
  setDetailsPanelBottomBarHeight: (value: number) => void;
  setDetailsPanelOpacityByView: (value: Record<DetailsViewMode, number>) => void;
  setFanartHeightByView: (value: Record<DetailsViewMode, number>) => void;
  setGameTilePadding: (value: number) => void;
  setGridButtonColors: (value: ButtonColors) => void;
  setGridSize: (value: number) => void;
  setGridSmartFill: (value: boolean) => void;
  setGridMaximizeSpace: (value: boolean) => void;
  setDetailsPanelMinWidthPercent: (value: number) => void;
  setIsViewFlippedByView: (value: Record<ViewMode, boolean>) => void;
  setListButtonColors: (value: ButtonColors) => void;
  setListViewOptions: (value: ResolvedListViewOptions) => void;
  setListViewSize: (value: number) => void;
  setLogoBackgroundColor: (value: string) => void;
  setLogoBackgroundOpacity: (value: number) => void;
  setLogoButtonColors: (value: ButtonColors) => void;
  setLogoPosition: (value: 'top' | 'middle' | 'bottom' | 'underneath') => void;
  setLogoSize: (value: number) => void;
  setPanelWidth: (value: number) => void;
  setPanelWidthByViewState: (value: Record<ViewMode, number>) => void;
  setRightPanelBoxartPositionByView: (value: Record<DetailsViewMode, 'left' | 'right' | 'none'>) => void;
  setRightPanelBoxartSizeByView: (value: Record<DetailsViewMode, number>) => void;
  setRightPanelButtonColors: (value: ButtonColors) => void;
  setRightPanelButtonLocationByView: (value: Record<DetailsViewMode, 'left' | 'middle' | 'right'>) => void;
  setRightPanelButtonSizeByView: (value: Record<DetailsViewMode, number>) => void;
  setRightPanelLogoSizeByView: (value: Record<DetailsViewMode, number>) => void;
  setRightPanelTextSizeByView: (value: Record<DetailsViewMode, number>) => void;
  setSelectedBoxArtSize: (value: number) => void;
  setShowCarouselDetails: (value: boolean) => void;
  setShowCarouselLogos: (value: boolean) => void;
  setShowCategoriesByView: (value: Record<ViewMode, boolean>) => void;
  setShowLogoOverBoxart: (value: boolean) => void;
  setViewMode: (value: ViewMode) => void;
  showCarouselDetails: boolean;
  showCarouselLogos: boolean;
  showCategoriesByView: Record<ViewMode, boolean>;
  showLogoOverBoxart: boolean;
  updateGameInState: (game: Game) => void;
  viewMode: ViewMode;
}

export function useRightClickMenuControls({
  activeGame,
  backgroundBlur,
  backgroundBrightnessByView,
  carouselButtonColors,
  carouselButtonSize,
  carouselDescriptionSize,
  carouselLogoSize,
  categoriesAlignmentByView,
  categoriesPositionByView,
  categoriesSizeByView,
  cardColumns,
  cardPostersOnly,
  cardSmartFill,
  coverFlowButtonColors,
  coverFlowButtonPosition,
  coverFlowCoverSize,
  coverFlowReflection,
  coverFlowShowButtons,
  coverFlowSideOpacity,
  coverFlowVerticalOffset,
  currentBackgroundBrightness,
  currentDescriptionWidth,
  currentFanartHeight,
  currentPanelWidth,
  defaultListViewOptions,
  descriptionWidthByView,
  detailsBarSize,
  detailsPanelBottomBarHeight,
  detailsPanelOpacity,
  detailsPanelOpacityByView,
  fanartHeightByView,
  gameTilePadding,
  gridButtonColors,
  gridSize,
  gridSmartFill,
  gridMaximizeSpace,
  detailsPanelMinWidthPercent,
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
  refreshPreferences,
  rightPanelBoxartPosition,
  rightPanelBoxartPositionByView,
  rightPanelBoxartSize,
  rightPanelBoxartSizeByView,
  rightPanelButtonColors,
  rightPanelButtonLocation,
  rightPanelButtonLocationByView,
  rightPanelButtonSize,
  rightPanelButtonSizeByView,
  rightPanelLogoSize,
  rightPanelLogoSizeByView,
  rightPanelTextSize,
  rightPanelTextSizeByView,
  selectedBoxArtSize,
  setActiveGameId,
  setBackgroundBlur,
  setBackgroundBrightnessByView,
  setCarouselButtonColors,
  setCarouselButtonSize,
  setCarouselDescriptionSize,
  setCarouselLogoSize,
  setCategoriesAlignmentByView,
  setCategoriesPositionByView,
  setCategoriesSizeByView,
  setCardColumns,
  setCardPostersOnly,
  setCardSmartFill,
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
  setFanartHeightByView,
  setGameTilePadding,
  setGridButtonColors,
  setGridSize,
  setGridSmartFill,
  setGridMaximizeSpace,
  setDetailsPanelMinWidthPercent,
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
  setRightPanelBoxartPositionByView,
  setRightPanelBoxartSizeByView,
  setRightPanelButtonColors,
  setRightPanelButtonLocationByView,
  setRightPanelButtonSizeByView,
  setRightPanelLogoSizeByView,
  setRightPanelTextSizeByView,
  setSelectedBoxArtSize,
  setShowCarouselDetails,
  setShowCarouselLogos,
  setShowCategoriesByView,
  setShowLogoOverBoxart,
  setViewMode,
  showCarouselDetails,
  showCarouselLogos,
  showCategoriesByView,
  showLogoOverBoxart,
  updateGameInState,
  viewMode,
}: UseRightClickMenuControlsOptions): Omit<RightClickMenuProps, 'x' | 'y' | 'onClose'> {
  const { saveByViewValue, savePreferences, saveValue } = usePreferenceWriter();

  const handleActiveGameChange = useCallback((game: Game) => {
    setActiveGameId(game.id);
    updateGameInState(game);
  }, [setActiveGameId, updateGameInState]);

  const handleListViewOptionsChange = useCallback((options: ListViewOptions) => {
    setListViewOptions({
      ...defaultListViewOptions,
      ...options,
      showLauncher: options.showLauncher ?? defaultListViewOptions.showLauncher,
      showLogos: options.showLogos ?? defaultListViewOptions.showLogos,
    });
    savePreferences({ listViewOptions: options });
  }, [defaultListViewOptions, savePreferences, setListViewOptions]);

  const detailViewMode = viewMode as DetailsViewMode;

  // One memo for the whole prop bag. Every setter below is a stable identity (raw useState
  // setters or useCallback), so this only re-evaluates when a display setting actually
  // changes — not on every App render, which is what made the inline arrows costly.
  return useMemo(() => ({
    activeGame: activeGame ?? undefined,
    backgroundBlur,
    backgroundBrightness: currentBackgroundBrightness,
    carouselButtonColors,
    carouselButtonSize,
    carouselDescriptionSize,
    carouselLogoSize,
    categoriesPosition: categoriesPositionByView[viewMode] ?? 'top',
    categoriesTopAlignment: categoriesAlignmentByView[viewMode] ?? 'left',
    categoriesTopSize: categoriesSizeByView[viewMode] ?? 12,
    cardColumns,
    cardPostersOnly,
    cardSmartFill,
    coverFlowButtonColors,
    coverFlowButtonPosition,
    coverFlowCoverSize,
    coverFlowReflection,
    coverFlowShowButtons,
    coverFlowSideOpacity,
    coverFlowVerticalOffset,
    descriptionWidth: currentDescriptionWidth,
    detailsBarSize,
    detailsPanelBottomBarHeight,
    detailsPanelOpacity,
    fanartHeight: currentFanartHeight,
    gameTilePadding,
    gridButtonColors,
    gridSize,
    gridSmartFill,
    gridMaximizeSpace,
    detailsPanelMinWidthPercent,
    isViewFlipped: isViewFlippedByView[viewMode],
    listSize: listViewSize,
    listButtonColors,
    listViewOptions,
    logoBackgroundColor,
    logoBackgroundOpacity,
    logoButtonColors,
    logoPosition,
    logoSize,
    onActiveGameChange: handleActiveGameChange,
    onBackgroundBlurChange: setBackgroundBlur,
    onGridSmartFillChange: (enabled: boolean) => {
      saveValue(setGridSmartFill, 'gridSmartFill', enabled);
    },
    onGridMaximizeSpaceChange: (enabled: boolean) => {
      saveValue(setGridMaximizeSpace, 'gridMaximizeSpace', enabled);
    },
    onDetailsPanelMinWidthPercentChange: (value: number) => {
      saveValue(setDetailsPanelMinWidthPercent, 'detailsPanelMinWidthPercent', value);
    },
    onBackgroundBrightnessChange: (brightness: number) => {
      saveByViewValue(backgroundBrightnessByView, setBackgroundBrightnessByView, 'backgroundBrightnessByView', viewMode, brightness);
    },
    onCarouselButtonColorsChange: (colors) => {
      saveValue(setCarouselButtonColors, 'carouselButtonColors', colors);
    },
    onCarouselButtonSizeChange: (size) => {
      saveValue(setCarouselButtonSize, 'carouselButtonSize', size);
    },
    onCarouselDescriptionSizeChange: (size) => {
      saveValue(setCarouselDescriptionSize, 'carouselDescriptionSize', size);
    },
    onCarouselLogoSizeChange: (size) => {
      saveValue(setCarouselLogoSize, 'carouselLogoSize', size);
    },
    onCategoriesPositionChange: (position: 'top' | 'bottom') => {
      saveByViewValue(categoriesPositionByView, setCategoriesPositionByView, 'categoriesPositionByView', viewMode, position);
    },
    onCategoriesTopAlignmentChange: (alignment: 'left' | 'center' | 'right') => {
      saveByViewValue(categoriesAlignmentByView, setCategoriesAlignmentByView, 'categoriesAlignmentByView', viewMode, alignment);
    },
    onCategoriesTopSizeChange: (size: number) => {
      saveByViewValue(categoriesSizeByView, setCategoriesSizeByView, 'categoriesSizeByView', viewMode, size);
    },
    onCoverFlowButtonColorsChange: (colors) => {
      saveValue(setCoverFlowButtonColors, 'coverFlowButtonColors', colors);
    },
    onCoverFlowButtonPositionChange: (position) => {
      saveValue(setCoverFlowButtonPosition, 'coverFlowButtonPosition', position);
    },
    onCoverFlowCoverSizeChange: (size) => {
      saveValue(setCoverFlowCoverSize, 'coverFlowCoverSize', size);
    },
    onCoverFlowReflectionChange: (value) => {
      saveValue(setCoverFlowReflection, 'coverFlowReflection', value);
    },
    onCoverFlowShowButtonsChange: (show) => {
      saveValue(setCoverFlowShowButtons, 'coverFlowShowButtons', show);
    },
    onCoverFlowSideOpacityChange: (value: number) => {
      saveValue(setCoverFlowSideOpacity, 'coverFlowSideOpacity', value);
    },
    onCoverFlowVerticalOffsetChange: (value: number) => {
      saveValue(setCoverFlowVerticalOffset, 'coverFlowVerticalOffset', value);
    },
    onDescriptionWidthChange: (width) => {
      saveByViewValue(descriptionWidthByView, setDescriptionWidthByView, 'descriptionWidthByView', detailViewMode, width);
    },
    onDetailsBarSizeChange: (size) => {
      saveValue(setDetailsBarSize, 'detailsBarSize', size);
    },
    onDetailsPanelBottomBarHeightChange: (height: number) => {
      saveValue(setDetailsPanelBottomBarHeight, 'detailsPanelBottomBarHeight', height);
    },
    onDetailsPanelOpacityChange: (opacity) => {
      saveByViewValue(detailsPanelOpacityByView, setDetailsPanelOpacityByView, 'detailsPanelOpacityByView', detailViewMode, opacity);
    },
    onFanartHeightChange: (height) => {
      saveByViewValue(fanartHeightByView, setFanartHeightByView, 'fanartHeightByView', detailViewMode, height);
    },
    onGameTilePaddingChange: setGameTilePadding,
    onCardColumnsChange: (value: number) => {
      saveValue(setCardColumns, 'cardColumns', value);
    },
    onCardPostersOnlyChange: (value: boolean) => {
      saveValue(setCardPostersOnly, 'cardPostersOnly', value);
    },
    onCardSmartFillChange: (value: boolean) => {
      saveValue(setCardSmartFill, 'cardSmartFill', value);
    },
    onGridButtonColorsChange: (colors) => {
      saveValue(setGridButtonColors, 'gridButtonColors', colors);
    },
    onGridSizeChange: setGridSize,
    onListButtonColorsChange: (colors) => {
      saveValue(setListButtonColors, 'listButtonColors', colors);
    },
    onListSizeChange: setListViewSize,
    onListViewOptionsChange: handleListViewOptionsChange,
    onLogoBackgroundColorChange: (color: string) => {
      saveValue(setLogoBackgroundColor, 'logoBackgroundColor', color);
    },
    onLogoBackgroundOpacityChange: (opacity: number) => {
      saveValue(setLogoBackgroundOpacity, 'logoBackgroundOpacity', opacity);
    },
    onLogoButtonColorsChange: (colors) => {
      saveValue(setLogoButtonColors, 'logoButtonColors', colors);
    },
    onLogoPositionChange: (position) => {
      saveValue(setLogoPosition, 'logoPosition', position);
    },
    onLogoSizeChange: setLogoSize,
    onPanelWidthChange: (width) => {
      setPanelWidth(width);
      saveByViewValue(panelWidthByViewState, setPanelWidthByViewState, 'panelWidthByView', viewMode, width);
    },
    onRightPanelBoxartPositionChange: (position) => {
      saveByViewValue(rightPanelBoxartPositionByView, setRightPanelBoxartPositionByView, 'rightPanelBoxartPositionByView', detailViewMode, position);
    },
    onRightPanelBoxartSizeChange: (size) => {
      saveByViewValue(rightPanelBoxartSizeByView, setRightPanelBoxartSizeByView, 'rightPanelBoxartSizeByView', detailViewMode, size);
    },
    onRightPanelButtonColorsChange: (colors) => {
      saveValue(setRightPanelButtonColors, 'rightPanelButtonColors', colors);
    },
    onRightPanelButtonLocationChange: (location) => {
      saveByViewValue(rightPanelButtonLocationByView, setRightPanelButtonLocationByView, 'rightPanelButtonLocationByView', detailViewMode, location);
    },
    onRightPanelButtonSizeChange: (size) => {
      saveByViewValue(rightPanelButtonSizeByView, setRightPanelButtonSizeByView, 'rightPanelButtonSizeByView', detailViewMode, size);
    },
    onRightPanelLogoSizeChange: (size) => {
      saveByViewValue(rightPanelLogoSizeByView, setRightPanelLogoSizeByView, 'rightPanelLogoSizeByView', detailViewMode, size);
    },
    onRightPanelTextSizeChange: (size) => {
      saveByViewValue(rightPanelTextSizeByView, setRightPanelTextSizeByView, 'rightPanelTextSizeByView', detailViewMode, size);
    },
    onSelectedBoxArtSizeChange: setSelectedBoxArtSize,
    onSettingsImported: refreshPreferences,
    onShowCarouselDetailsChange: (show) => {
      saveValue(setShowCarouselDetails, 'showCarouselDetails', show);
    },
    onShowCarouselLogosChange: (show) => {
      saveValue(setShowCarouselLogos, 'showCarouselLogos', show);
    },
    onShowCategoriesInGameListChange: (show) => {
      saveByViewValue(showCategoriesByView, setShowCategoriesByView, 'showCategoriesInGameListByView', viewMode, show);
    },
    onShowLogoOverBoxartChange: (show) => {
      saveValue(setShowLogoOverBoxart, 'showLogoOverBoxart', show);
    },
    onViewFlipChange: (flipped) => {
      saveByViewValue(isViewFlippedByView, setIsViewFlippedByView, 'isViewFlippedByView', viewMode, flipped);
    },
    onViewModeChange: setViewMode,
    panelWidth: currentPanelWidth,
    rightPanelBoxartPosition,
    rightPanelBoxartSize,
    rightPanelButtonColors,
    rightPanelButtonLocation,
    rightPanelButtonSize,
    rightPanelLogoSize,
    rightPanelTextSize,
    selectedBoxArtSize,
    showCarouselDetails,
    showCarouselLogos,
    showCategoriesInGameList: showCategoriesByView[viewMode] ?? false,
    showLogoOverBoxart,
    viewMode,
  }), [
    activeGame,
    backgroundBlur,
    backgroundBrightnessByView,
    cardColumns,
    cardPostersOnly,
    cardSmartFill,
    carouselButtonColors,
    carouselButtonSize,
    carouselDescriptionSize,
    carouselLogoSize,
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
    currentFanartHeight,
    currentPanelWidth,
    descriptionWidthByView,
    detailsBarSize,
    detailsPanelBottomBarHeight,
    detailsPanelOpacity,
    detailsPanelOpacityByView,
    detailViewMode,
    fanartHeightByView,
    gameTilePadding,
    gridButtonColors,
    gridMaximizeSpace,
    detailsPanelMinWidthPercent,
    gridSize,
    gridSmartFill,
    handleActiveGameChange,
    handleListViewOptionsChange,
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
    refreshPreferences,
    rightPanelBoxartPosition,
    rightPanelBoxartPositionByView,
    rightPanelBoxartSize,
    rightPanelBoxartSizeByView,
    rightPanelButtonColors,
    rightPanelButtonLocation,
    rightPanelButtonLocationByView,
    rightPanelButtonSize,
    rightPanelButtonSizeByView,
    rightPanelLogoSize,
    rightPanelLogoSizeByView,
    rightPanelTextSize,
    rightPanelTextSizeByView,
    saveByViewValue,
    saveValue,
    selectedBoxArtSize,
    setBackgroundBlur,
    setBackgroundBrightnessByView,
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
    setFanartHeightByView,
    setGameTilePadding,
    setGridButtonColors,
    setGridMaximizeSpace,
    setDetailsPanelMinWidthPercent,
    setGridSize,
    setGridSmartFill,
    setIsViewFlippedByView,
    setListButtonColors,
    setListViewSize,
    setLogoBackgroundColor,
    setLogoBackgroundOpacity,
    setLogoButtonColors,
    setLogoPosition,
    setLogoSize,
    setPanelWidth,
    setPanelWidthByViewState,
    setRightPanelBoxartPositionByView,
    setRightPanelBoxartSizeByView,
    setRightPanelButtonColors,
    setRightPanelButtonLocationByView,
    setRightPanelButtonSizeByView,
    setRightPanelLogoSizeByView,
    setRightPanelTextSizeByView,
    setSelectedBoxArtSize,
    setShowCarouselDetails,
    setShowCarouselLogos,
    setShowCategoriesByView,
    setShowLogoOverBoxart,
    setViewMode,
    showCarouselDetails,
    showCarouselLogos,
    showCategoriesByView,
    showLogoOverBoxart,
    viewMode,
  ]);
}
