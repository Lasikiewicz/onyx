import { useCallback, useMemo } from 'react';
import type { Game } from '../types/game';
import type { GameDetailsPanelProps } from '../components/GameDetailsPanel';
import type { RightClickMenuEditorSection } from '../components/rightClickMenu/RightClickMenuHeader';
import { usePreferenceWriter } from './usePreferenceWriter';

type ViewMode = GameDetailsPanelProps['viewMode'];
type DetailsViewMode = 'grid' | 'list' | 'logo';
type ButtonColors = NonNullable<GameDetailsPanelProps['rightPanelButtonColors']>;

interface UseGameDetailsPanelControlsOptions {
  activeGame: Game | null;
  currentDescriptionWidth: number;
  currentFanartHeight: number;
  currentPanelWidth: number;
  gridMaximizeSpace: boolean;
  descriptionWidthByView: Record<DetailsViewMode, number>;
  detailsPanelBottomBarHeight: number;
  detailsPanelOpacity: number;
  disableAllAnimations: boolean;
  disableAnimatedBackgrounds: boolean;
  disableAnimatedBanners: boolean;
  disableAnimatedBoxarts: boolean;
  disableAnimatedIcons: boolean;
  disableAnimatedLogos: boolean;
  fanartHeightByView: Record<DetailsViewMode, number>;
  gridButtonColors: ButtonColors;
  handleEditCategories: (game: Game) => void;
  handleEditGame: (game: Game) => void;
  handleEditImages: (game: Game) => void;
  handleFixMatch: (game: Game) => void;
  handleHideGame: (game: Game) => void;
  handlePlay: (game: Game) => Promise<void>;
  handleSaveGame: (game: Game, oldGame?: Game) => Promise<void>;
  handleToggleFavorite: (game: Game) => Promise<void>;
  handleTogglePin: (game: Game) => Promise<void>;
  handleUnhideGame: (game: Game) => Promise<void>;
  handleUninstallGame: (game: Game) => Promise<void>;
  isViewFlippedByView: Record<ViewMode, boolean>;
  launchingGameId: string | null;
  linkDisplayOrder: string[] | null;
  listButtonColors: ButtonColors;
  logoButtonColors: ButtonColors;
  openGameManager: (options?: { gameId?: string; tab?: 'images' | 'metadata' }) => void;
  overlaysOpen: boolean;
  panelWidthByViewState: Record<ViewMode, number>;
  rightPanelBoxartPosition: 'left' | 'right' | 'none';
  rightPanelBoxartSize: number;
  rightPanelButtonColors: ButtonColors;
  rightPanelButtonLocation: 'left' | 'middle' | 'right';
  rightPanelButtonSize: number;
  rightPanelLogoSize: number;
  rightPanelTextSize: number;
  runningGames: Set<string>;
  selectedCategory: string | null;
  setDescriptionWidthByView: (value: Record<DetailsViewMode, number>) => void;
  setDetailsPanelBottomBarHeight: (value: number) => void;
  setFanartHeightByView: (value: Record<DetailsViewMode, number>) => void;
  setGameContextMenu: (menu: { game: Game; x: number; y: number } | null) => void;
  setPanelWidth: (value: number) => void;
  setPanelWidthByViewState: (value: Record<ViewMode, number>) => void;
  setRightClickMenu: (menu: { x: number; y: number; initialEditorSection?: RightClickMenuEditorSection | null } | null) => void;
  updateGameInState: (game: Game) => void;
  viewMode: ViewMode;
  visibleLinkTypes: Record<string, boolean>;
}

export function useGameDetailsPanelControls({
  activeGame,
  currentDescriptionWidth,
  currentFanartHeight,
  currentPanelWidth,
  gridMaximizeSpace,
  descriptionWidthByView,
  detailsPanelBottomBarHeight,
  detailsPanelOpacity,
  disableAllAnimations,
  disableAnimatedBackgrounds,
  disableAnimatedBanners,
  disableAnimatedBoxarts,
  disableAnimatedIcons,
  disableAnimatedLogos,
  fanartHeightByView,
  gridButtonColors,
  handleEditCategories,
  handleEditGame,
  handleEditImages,
  handleFixMatch,
  handleHideGame,
  handlePlay,
  handleSaveGame,
  handleToggleFavorite,
  handleTogglePin,
  handleUnhideGame,
  handleUninstallGame,
  isViewFlippedByView,
  launchingGameId,
  linkDisplayOrder,
  listButtonColors,
  logoButtonColors,
  openGameManager,
  overlaysOpen,
  panelWidthByViewState,
  rightPanelBoxartPosition,
  rightPanelBoxartSize,
  rightPanelButtonColors,
  rightPanelButtonLocation,
  rightPanelButtonSize,
  rightPanelLogoSize,
  rightPanelTextSize,
  runningGames,
  selectedCategory,
  setDescriptionWidthByView,
  setDetailsPanelBottomBarHeight,
  setFanartHeightByView,
  setGameContextMenu,
  setPanelWidth,
  setPanelWidthByViewState,
  setRightClickMenu,
  updateGameInState,
  viewMode,
  visibleLinkTypes,
}: UseGameDetailsPanelControlsOptions): GameDetailsPanelProps {
  const { saveByViewValue, saveValue } = usePreferenceWriter();
  const detailViewMode = viewMode as DetailsViewMode;

  const handleOpenInGameManager = useCallback((game: Game, tab: 'images' | 'metadata') => {
    openGameManager({ gameId: game.id, tab });
  }, [openGameManager]);

  const handleRightClick = useCallback((x: number, y: number) => {
    setGameContextMenu(null);
    setRightClickMenu({ x, y, initialEditorSection: 'details-view' });
  }, [setGameContextMenu, setRightClickMenu]);

  const handleDescriptionWidthChange = useCallback((width: number) => {
    saveByViewValue(descriptionWidthByView, setDescriptionWidthByView, 'descriptionWidthByView', detailViewMode, width);
  }, [descriptionWidthByView, detailViewMode, saveByViewValue, setDescriptionWidthByView]);

  // Deliberately stable: GameDetailsPanel debounces its bottom-bar save on this identity, so a
  // per-render function starves the timer and the write never lands until renders stop.
  const handleBottomBarHeightChange = useCallback((height: number) => {
    saveValue(setDetailsPanelBottomBarHeight, 'detailsPanelBottomBarHeight', height);
  }, [saveValue, setDetailsPanelBottomBarHeight]);

  const handleFanartHeightChange = useCallback((height: number) => {
    saveByViewValue(fanartHeightByView, setFanartHeightByView, 'fanartHeightByView', detailViewMode, height);
  }, [detailViewMode, fanartHeightByView, saveByViewValue, setFanartHeightByView]);

  const handlePanelWidthChange = useCallback((width: number) => {
    setPanelWidth(width);
    saveByViewValue(panelWidthByViewState, setPanelWidthByViewState, 'panelWidthByView', viewMode, width);
  }, [panelWidthByViewState, saveByViewValue, setPanelWidth, setPanelWidthByViewState, viewMode]);

  const resolvedButtonColors = viewMode === 'grid'
    ? gridButtonColors
    : viewMode === 'list'
      ? listButtonColors
      : viewMode === 'logo'
        ? logoButtonColors
        : rightPanelButtonColors;

  return useMemo(() => ({
    descriptionWidth: currentDescriptionWidth,
    detailsPanelBottomBarHeight,
    detailsPanelOpacity,
    disableAnimatedBackgrounds: disableAllAnimations || disableAnimatedBackgrounds || overlaysOpen,
    disableAnimatedBanners: disableAllAnimations || disableAnimatedBanners || overlaysOpen,
    disableAnimatedBoxarts: disableAllAnimations || disableAnimatedBoxarts || overlaysOpen,
    disableAnimatedIcons: disableAllAnimations || disableAnimatedIcons || overlaysOpen,
    disableAnimatedLogos: disableAllAnimations || disableAnimatedLogos || overlaysOpen,
    fanartHeight: currentFanartHeight,
    game: activeGame,
    isHiddenView: selectedCategory === 'hidden',
    isLaunching: launchingGameId === activeGame?.id,
    isRunning: activeGame ? runningGames.has(activeGame.id) : false,
    isViewFlipped: isViewFlippedByView[viewMode],
    linkDisplayOrder,
    onDescriptionWidthChange: handleDescriptionWidthChange,
    onDetailsPanelBottomBarHeightChange: handleBottomBarHeightChange,
    onEdit: handleEditGame,
    onEditCategories: handleEditCategories,
    onEditImages: handleEditImages,
    onFanartHeightChange: handleFanartHeightChange,
    onFavorite: handleToggleFavorite,
    onFixMatch: handleFixMatch,
    onHide: handleHideGame,
    onOpenInGameManager: handleOpenInGameManager,
    onPanelWidthChange: handlePanelWidthChange,
    onPin: handleTogglePin,
    onPlay: handlePlay,
    onRightClick: handleRightClick,
    onSaveGame: handleSaveGame,
    onUnhide: handleUnhideGame,
    onUninstall: handleUninstallGame,
    onUpdateGameInState: updateGameInState,
    overlaysOpen,
    panelWidth: currentPanelWidth,
    disablePanelResize: (viewMode === 'grid' || viewMode === 'logo') && gridMaximizeSpace,
    rightPanelBoxartPosition,
    rightPanelBoxartSize,
    rightPanelButtonColors: resolvedButtonColors,
    rightPanelButtonLocation,
    rightPanelButtonSize,
    rightPanelLogoSize,
    rightPanelTextSize,
    viewMode,
    visibleLinkTypes,
  }), [
    activeGame,
    currentDescriptionWidth,
    currentFanartHeight,
    currentPanelWidth,
    detailsPanelBottomBarHeight,
    detailsPanelOpacity,
    disableAllAnimations,
    disableAnimatedBackgrounds,
    disableAnimatedBanners,
    disableAnimatedBoxarts,
    disableAnimatedIcons,
    disableAnimatedLogos,
    gridMaximizeSpace,
    handleBottomBarHeightChange,
    handleDescriptionWidthChange,
    handleEditCategories,
    handleEditGame,
    handleEditImages,
    handleFanartHeightChange,
    handleFixMatch,
    handleHideGame,
    handleOpenInGameManager,
    handlePanelWidthChange,
    handlePlay,
    handleRightClick,
    handleSaveGame,
    handleToggleFavorite,
    handleTogglePin,
    handleUnhideGame,
    handleUninstallGame,
    isViewFlippedByView,
    launchingGameId,
    linkDisplayOrder,
    overlaysOpen,
    resolvedButtonColors,
    rightPanelBoxartPosition,
    rightPanelBoxartSize,
    rightPanelButtonLocation,
    rightPanelButtonSize,
    rightPanelLogoSize,
    rightPanelTextSize,
    runningGames,
    selectedCategory,
    updateGameInState,
    viewMode,
    visibleLinkTypes,
  ]);
}
