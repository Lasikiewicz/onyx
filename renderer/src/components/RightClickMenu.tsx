import React, { useEffect, useRef } from 'react';
import type { Game } from '../types/game';
import { CustomDefaultsManager } from './CustomDefaultsManager';
import { ConfirmationDialog } from './ConfirmationDialog';
import { MenuSliderRow } from './MenuSliderRow';

interface RightClickMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  viewMode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow';
  onViewModeChange?: (mode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow') => void;
  activeGame?: Game;
  onActiveGameChange?: (game: Game) => void;
  gridSize?: number;
  onGridSizeChange?: (size: number) => void;
  logoSize?: number;
  onLogoSizeChange?: (size: number) => void;
  listSize?: number;
  onListSizeChange?: (size: number) => void;
  gameTilePadding?: number;
  onGameTilePaddingChange?: (padding: number) => void;
  backgroundBlur?: number;
  onBackgroundBlurChange?: (blur: number) => void;
  backgroundBrightness?: number;
  onBackgroundBrightnessChange?: (brightness: number) => void;
  selectedBoxArtSize?: number;
  onSelectedBoxArtSizeChange?: (size: number) => void;
  carouselLogoSize?: number;
  onCarouselLogoSizeChange?: (size: number) => void;
  detailsBarSize?: number;
  onDetailsBarSizeChange?: (size: number) => void;
  showCarouselDetails?: boolean;
  onShowCarouselDetailsChange?: (show: boolean) => void;
  showCarouselLogos?: boolean;
  onShowCarouselLogosChange?: (show: boolean) => void;
  carouselButtonSize?: number;
  onCarouselButtonSizeChange?: (size: number) => void;
  carouselDescriptionSize?: number;
  onCarouselDescriptionSizeChange?: (size: number) => void;
  carouselDescriptionAlignment?: 'left' | 'center' | 'right';
  onCarouselDescriptionAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  carouselButtonAlignment?: 'left' | 'center' | 'right';
  onCarouselButtonAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  carouselLogoAlignment?: 'left' | 'center' | 'right';
  onCarouselLogoAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
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
  onListViewOptionsChange?: (options: {
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
  }) => void;
  // Grid view specific props
  showLogoOverBoxart?: boolean;
  onShowLogoOverBoxartChange?: (show: boolean) => void;
  logoPosition?: 'top' | 'middle' | 'bottom' | 'underneath';
  onLogoPositionChange?: (position: 'top' | 'middle' | 'bottom' | 'underneath') => void;
  logoBackgroundColor?: string;
  onLogoBackgroundColorChange?: (color: string) => void;
  logoBackgroundOpacity?: number;
  onLogoBackgroundOpacityChange?: (opacity: number) => void;
  gridDescriptionSize?: number;
  onGridDescriptionSizeChange?: (size: number) => void;
  gridButtonSize?: number;
  onGridButtonSizeChange?: (size: number) => void;
  gridButtonLocation?: 'left' | 'middle' | 'right';
  onGridButtonLocationChange?: (location: 'left' | 'middle' | 'right') => void;
  // Right panel (GameDetailsPanel) specific props
  rightPanelLogoSize?: number;
  onRightPanelLogoSizeChange?: (size: number) => void;
  rightPanelBoxartPosition?: 'left' | 'right' | 'none';
  onRightPanelBoxartPositionChange?: (position: 'left' | 'right' | 'none') => void;
  rightPanelBoxartSize?: number;
  onRightPanelBoxartSizeChange?: (size: number) => void;
  rightPanelTextSize?: number;
  onRightPanelTextSizeChange?: (size: number) => void;
  rightPanelButtonSize?: number;
  onRightPanelButtonSizeChange?: (size: number) => void;
  rightPanelButtonLocation?: 'left' | 'middle' | 'right';
  onRightPanelButtonLocationChange?: (location: 'left' | 'middle' | 'right') => void;
  detailsPanelOpacity?: number;
  onDetailsPanelOpacityChange?: (opacity: number) => void;
  // Panel width for saving/restoring divider position
  panelWidth?: number;
  onPanelWidthChange?: (width: number) => void;
  // Game details panel divider height control
  fanartHeight?: number;
  onFanartHeightChange?: (height: number) => void;
  descriptionWidth?: number;
  onDescriptionWidthChange?: (width: number) => void;
  detailsPanelBottomBarHeight?: number;
  onDetailsPanelBottomBarHeightChange?: (height: number) => void;
  showCategoriesInGameList?: boolean;
  onShowCategoriesInGameListChange?: (show: boolean) => void;
  categoriesPosition?: 'top' | 'bottom';
  onCategoriesPositionChange?: (position: 'top' | 'bottom') => void;
  categoriesTopAlignment?: 'left' | 'center' | 'right';
  onCategoriesTopAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  categoriesTopSize?: number;
  onCategoriesTopSizeChange?: (size: number) => void;
  isViewFlipped?: boolean;
  onViewFlipChange?: (flipped: boolean) => void;
  // Button colors per view
  rightPanelButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  onRightPanelButtonColorsChange?: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  carouselButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  onCarouselButtonColorsChange?: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  gridButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  onGridButtonColorsChange?: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  listButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  onListButtonColorsChange?: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  logoButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  onLogoButtonColorsChange?: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  // Cover Flow only (simplified menu)
  coverFlowCoverSize?: number;
  onCoverFlowCoverSizeChange?: (size: number) => void;
  coverFlowReflection?: number;
  onCoverFlowReflectionChange?: (value: number) => void;
  coverFlowVerticalOffset?: number;
  onCoverFlowVerticalOffsetChange?: (value: number) => void;
  coverFlowSideOpacity?: number;
  onCoverFlowSideOpacityChange?: (value: number) => void;
  coverFlowShowButtons?: boolean;
  onCoverFlowShowButtonsChange?: (show: boolean) => void;
  coverFlowButtonPosition?: 'left' | 'middle' | 'right';
  onCoverFlowButtonPositionChange?: (pos: 'left' | 'middle' | 'right') => void;
  coverFlowButtonColors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  onCoverFlowButtonColorsChange?: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  onSettingsImported?: () => void;
}

export const RightClickMenu: React.FC<RightClickMenuProps> = ({
  x,
  y,
  onClose,
  viewMode,
  onViewModeChange,
  activeGame,
  onActiveGameChange,
  gridSize = 120,
  onGridSizeChange,
  logoSize = 100,
  onLogoSizeChange,
  listSize = 120,
  onListSizeChange,
  gameTilePadding = 3,
  onGameTilePaddingChange,
  backgroundBlur = 40,
  onBackgroundBlurChange,
  backgroundBrightness = 0.3,
  onBackgroundBrightnessChange,
  selectedBoxArtSize = 12.5,
  onSelectedBoxArtSizeChange,
  carouselLogoSize = 100,
  onCarouselLogoSizeChange,
  detailsBarSize = 14,
  onDetailsBarSizeChange,
  showCarouselDetails = true,
  onShowCarouselDetailsChange,
  showCarouselLogos = true,
  onShowCarouselLogosChange,
  carouselButtonSize = 14,
  onCarouselButtonSizeChange,
  carouselDescriptionSize = 18,
  onCarouselDescriptionSizeChange,
  carouselDescriptionAlignment = 'center',
  onCarouselDescriptionAlignmentChange,
  carouselButtonAlignment = 'center',
  onCarouselButtonAlignmentChange,
  carouselLogoAlignment = 'center',
  onCarouselLogoAlignmentChange,
  listViewOptions,
  onListViewOptionsChange,
  // Grid view specific props
  showLogoOverBoxart = true,
  onShowLogoOverBoxartChange,
  logoPosition = 'middle',
  onLogoPositionChange,
  logoBackgroundOpacity = 100,
  onLogoBackgroundOpacityChange,
  // Right panel (GameDetailsPanel) specific props
  rightPanelBoxartPosition = 'right',
  onRightPanelBoxartPositionChange,
  rightPanelLogoSize: _rightPanelLogoSize = 95,
  onRightPanelLogoSizeChange,
  rightPanelBoxartSize = 120,
  onRightPanelBoxartSizeChange,
  rightPanelTextSize = 14,
  onRightPanelTextSizeChange,
  rightPanelButtonSize = 14,
  onRightPanelButtonSizeChange,
  rightPanelButtonLocation = 'right',
  onRightPanelButtonLocationChange,
  detailsPanelOpacity = 80,
  onDetailsPanelOpacityChange,
  panelWidth = 800,
  onPanelWidthChange,
  fanartHeight = 320,
  onFanartHeightChange,
  descriptionWidth = 50,
  onDescriptionWidthChange,
  detailsPanelBottomBarHeight = 72,
  onDetailsPanelBottomBarHeightChange,
  showCategoriesInGameList = false,
  onShowCategoriesInGameListChange,
  categoriesPosition = 'top',
  onCategoriesPositionChange,
  categoriesTopAlignment = 'left',
  onCategoriesTopAlignmentChange,
  categoriesTopSize = 12,
  onCategoriesTopSizeChange,
  isViewFlipped = false,
  onViewFlipChange,
  rightPanelButtonColors,
  onRightPanelButtonColorsChange,
  carouselButtonColors,
  onCarouselButtonColorsChange,
  gridButtonColors,
  onGridButtonColorsChange,
  listButtonColors,
  onListButtonColorsChange,
  logoButtonColors,
  onLogoButtonColorsChange,
  coverFlowCoverSize = 300,
  onCoverFlowCoverSizeChange,
  coverFlowReflection = 60,
  onCoverFlowReflectionChange,
  coverFlowVerticalOffset = 0,
  onCoverFlowVerticalOffsetChange,
  coverFlowSideOpacity = 100,
  onCoverFlowSideOpacityChange,
  coverFlowShowButtons = true,
  onCoverFlowShowButtonsChange,
  coverFlowButtonPosition = 'middle',
  onCoverFlowButtonPositionChange,
  coverFlowButtonColors,
  onCoverFlowButtonColorsChange,
  onSettingsImported,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // State for Custom Defaults Modal
  const [showCustomDefaultsModal, setShowCustomDefaultsModal] = React.useState(false);
  const [screenResolution, setScreenResolution] = React.useState<'720p' | '1080p' | '1440p' | '4K'>('1080p');

  // State for Reset Confirmation Dialog
  const [showResetConfirmation, setShowResetConfirmation] = React.useState(false);
  const [resetResolution, setResetResolution] = React.useState('');
  const [baselineDefaults, setBaselineDefaults] = React.useState<any>(null);

  // State for Per-Game Override Clear Confirmation
  const [showClearPerGameConfirm, setShowClearPerGameConfirm] = React.useState(false);

  // Detect screen resolution
  React.useEffect(() => {
    const updateResolution = () => {
      const height = window.screen.height;
      if (height >= 2160) setScreenResolution('4K');
      else if (height >= 1440) setScreenResolution('1440p');
      else if (height >= 1080) setScreenResolution('1080p');
      else setScreenResolution('720p');
    };
    updateResolution();
    window.addEventListener('resize', updateResolution);
    return () => window.removeEventListener('resize', updateResolution);
  }, []);

  // Local state for per-game logo sizes - updates immediately for UI responsiveness
  const [localLogoSizes, setLocalLogoSizes] = React.useState({
    grid: activeGame?.logoSizePerViewMode?.grid ?? 100,
    list: activeGame?.logoSizePerViewMode?.list ?? 100,
    logo: activeGame?.logoSizePerViewMode?.logo ?? 100,
    carousel: activeGame?.logoSizePerViewMode?.carousel ?? 100,
  });

  // Ref for debouncing saves
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Sync local state when activeGame changes
  React.useEffect(() => {
    if (activeGame) {
      setLocalLogoSizes({
        grid: activeGame.logoSizePerViewMode?.grid ?? 100,
        list: activeGame.logoSizePerViewMode?.list ?? 100,
        logo: activeGame.logoSizePerViewMode?.logo ?? 100,
        carousel: activeGame.logoSizePerViewMode?.carousel ?? 100,
      });
    }
    // Clear any pending saves when game changes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, [activeGame?.id]); // Only change when game ID changes

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (x + rect.width > viewportWidth) {
        menuRef.current.style.left = `${viewportWidth - rect.width - 10}px`;
      }
      if (y + rect.height > viewportHeight) {
        menuRef.current.style.top = `${viewportHeight - rect.height - 10}px`;
      }
    }
  }, [x, y]);

  const handleViewModeChange = (mode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  const getSizeValue = () => {
    if (viewMode === 'grid') return gridSize;
    if (viewMode === 'logo') return logoSize;
    return listSize;
  };

  const handleSizeChange = (value: number) => {
    if (viewMode === 'grid' && onGridSizeChange) onGridSizeChange(value);
    if (viewMode === 'logo' && onLogoSizeChange) onLogoSizeChange(value);
    if (viewMode === 'list' && onListSizeChange) onListSizeChange(value);
  };

  const handleResetToDefaults = () => {
    // Get current screen resolution
    const screenHeight = window.screen.height;
    const resKey = screenHeight >= 2160 ? '4K' : screenHeight >= 1440 ? '1440p' : screenHeight >= 1080 ? '1080p' : '720p';

    // Store resolution and show confirmation dialog
    setResetResolution(resKey);
    setShowResetConfirmation(true);
  };

  const applyDefaultsForView = (mode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow', resKey: string) => {
    if (!baselineDefaults || !baselineDefaults[resKey]) return;

    const defaults = baselineDefaults[resKey][mode];
    if (!defaults) return;

    // Apply view-specific settings
    if (mode === 'grid') {
      if (defaults.gridSize !== undefined) onGridSizeChange?.(defaults.gridSize);
      if (defaults.gameTilePadding !== undefined) onGameTilePaddingChange?.(defaults.gameTilePadding);
      if (defaults.panelWidth !== undefined) onPanelWidthChange?.(defaults.panelWidth);
      if (defaults.fanartHeight !== undefined) onFanartHeightChange?.(defaults.fanartHeight);
      if (defaults.descriptionWidth !== undefined) onDescriptionWidthChange?.(defaults.descriptionWidth);
      if (defaults.detailsPanelBottomBarHeight !== undefined) onDetailsPanelBottomBarHeightChange?.(defaults.detailsPanelBottomBarHeight);
      if (defaults.backgroundBlur !== undefined) onBackgroundBlurChange?.(defaults.backgroundBlur);
      if (defaults.backgroundBrightness !== undefined) onBackgroundBrightnessChange?.(defaults.backgroundBrightness);
      if (defaults.showLogoOverBoxart !== undefined) onShowLogoOverBoxartChange?.(defaults.showLogoOverBoxart);
    } else if (mode === 'logo') {
      if (defaults.logoSize !== undefined) onLogoSizeChange?.(defaults.logoSize);
      if (defaults.gameTilePadding !== undefined) onGameTilePaddingChange?.(defaults.gameTilePadding);
      if (defaults.logoBackgroundOpacity !== undefined) onLogoBackgroundOpacityChange?.(defaults.logoBackgroundOpacity);
      if (defaults.backgroundBlur !== undefined) onBackgroundBlurChange?.(defaults.backgroundBlur);
      if (defaults.backgroundBrightness !== undefined) onBackgroundBrightnessChange?.(defaults.backgroundBrightness);
      if (defaults.panelWidth !== undefined) onPanelWidthChange?.(defaults.panelWidth);
      if (defaults.fanartHeight !== undefined) onFanartHeightChange?.(defaults.fanartHeight);
      if (defaults.descriptionWidth !== undefined) onDescriptionWidthChange?.(defaults.descriptionWidth);
      if (defaults.detailsPanelBottomBarHeight !== undefined) onDetailsPanelBottomBarHeightChange?.(defaults.detailsPanelBottomBarHeight);
      if (defaults.rightPanelLogoSize !== undefined) onRightPanelLogoSizeChange?.(defaults.rightPanelLogoSize);
    } else if (mode === 'list') {
      if (defaults.backgroundBlur !== undefined) onBackgroundBlurChange?.(defaults.backgroundBlur);
      if (defaults.backgroundBrightness !== undefined) onBackgroundBrightnessChange?.(defaults.backgroundBrightness);
      if (defaults.panelWidth !== undefined) onPanelWidthChange?.(defaults.panelWidth);
      if (defaults.fanartHeight !== undefined) onFanartHeightChange?.(defaults.fanartHeight);
      if (defaults.descriptionWidth !== undefined) onDescriptionWidthChange?.(defaults.descriptionWidth);
      if (defaults.detailsPanelBottomBarHeight !== undefined) onDetailsPanelBottomBarHeightChange?.(defaults.detailsPanelBottomBarHeight);
      if (defaults.listViewOptions !== undefined) onListViewOptionsChange?.(defaults.listViewOptions);
      if (defaults.rightPanelLogoSize !== undefined) onRightPanelLogoSizeChange?.(defaults.rightPanelLogoSize);
    } else if (mode === 'carousel') {
      if (defaults.showCarouselDetails !== undefined) onShowCarouselDetailsChange?.(defaults.showCarouselDetails);
      if (defaults.showCarouselLogos !== undefined) onShowCarouselLogosChange?.(defaults.showCarouselLogos);
      if (defaults.detailsBarSize !== undefined) onDetailsBarSizeChange?.(defaults.detailsBarSize);
      if (defaults.selectedBoxArtSize !== undefined) onSelectedBoxArtSizeChange?.(defaults.selectedBoxArtSize);
      if (defaults.gameTilePadding !== undefined) onGameTilePaddingChange?.(defaults.gameTilePadding);
      if (defaults.backgroundBlur !== undefined) onBackgroundBlurChange?.(defaults.backgroundBlur);
      if (defaults.backgroundBrightness !== undefined) onBackgroundBrightnessChange?.(defaults.backgroundBrightness);
      if (defaults.carouselLogoSize !== undefined) onCarouselLogoSizeChange?.(defaults.carouselLogoSize);
      if (defaults.carouselButtonSize !== undefined) onCarouselButtonSizeChange?.(defaults.carouselButtonSize);
      if (defaults.carouselDescriptionSize !== undefined) onCarouselDescriptionSizeChange?.(defaults.carouselDescriptionSize);
      if (defaults.carouselDescriptionAlignment !== undefined) onCarouselDescriptionAlignmentChange?.(defaults.carouselDescriptionAlignment);
      if (defaults.carouselButtonAlignment !== undefined) onCarouselButtonAlignmentChange?.(defaults.carouselButtonAlignment);
    } else if (mode === 'coverflow') {
      if (defaults.coverFlowCoverSize !== undefined) onCoverFlowCoverSizeChange?.(defaults.coverFlowCoverSize);
      if (defaults.coverFlowReflection !== undefined) onCoverFlowReflectionChange?.(defaults.coverFlowReflection);
      if (defaults.coverFlowVerticalOffset !== undefined) onCoverFlowVerticalOffsetChange?.(defaults.coverFlowVerticalOffset);
      if (defaults.coverFlowSideOpacity !== undefined) onCoverFlowSideOpacityChange?.(defaults.coverFlowSideOpacity);
      if (defaults.coverFlowShowButtons !== undefined) onCoverFlowShowButtonsChange?.(defaults.coverFlowShowButtons);
      if (defaults.backgroundBrightness !== undefined) onBackgroundBrightnessChange?.(defaults.backgroundBrightness);
    }

    // Apply right panel defaults (shared by all view modes in the JSON)
    if (defaults.rightPanelBoxartPosition !== undefined) onRightPanelBoxartPositionChange?.(defaults.rightPanelBoxartPosition);
    if (defaults.rightPanelBoxartSize !== undefined) onRightPanelBoxartSizeChange?.(defaults.rightPanelBoxartSize);
    if (defaults.rightPanelTextSize !== undefined) onRightPanelTextSizeChange?.(defaults.rightPanelTextSize);
    if (defaults.rightPanelButtonSize !== undefined) onRightPanelButtonSizeChange?.(defaults.rightPanelButtonSize);
    if (defaults.rightPanelButtonLocation !== undefined) onRightPanelButtonLocationChange?.(defaults.rightPanelButtonLocation);
    if (defaults.detailsPanelOpacity !== undefined) onDetailsPanelOpacityChange?.(defaults.detailsPanelOpacity);
  };

  const handleResetCurrentView = () => {
    applyDefaultsForView(viewMode, resetResolution);
    setShowResetConfirmation(false);
    onClose();
  };

  const handleResetAllViews = () => {
    // Apply defaults for all view modes
    const modes: ('grid' | 'list' | 'logo' | 'carousel' | 'coverflow')[] = ['grid', 'list', 'logo', 'carousel', 'coverflow'];
    modes.forEach(mode => applyDefaultsForView(mode, resetResolution));

    // If there's an active game, show dialog to ask about clearing per-game overrides
    if (activeGame && onActiveGameChange) {
      setShowClearPerGameConfirm(true);
      // Dialog will handle the rest via handleClearPerGameOverrides
    } else {
      setShowResetConfirmation(false);
      onClose();
    }
  };

  const handleClearPerGameOverrides = async () => {
    if (!activeGame || !onActiveGameChange) return;

    const { logoSizePerViewMode, ...restOfGame } = activeGame;
    const updatedGame = restOfGame as Game;
    setLocalLogoSizes({ grid: 100, list: 100, logo: 100, carousel: 100 });
    onActiveGameChange(updatedGame);

    try {
      await window.electronAPI.saveGame(updatedGame);
      const prefs = await window.electronAPI.getPreferences();
      const currentMap = { ...(prefs.perGameViewSizeOverrides || {}) };
      delete currentMap[activeGame.id];
      const perViewCustom = { ...(prefs.perGameViewCustomByView || {}) } as any;
      ['grid', 'list', 'logo', 'carousel', 'coverflow'].forEach((mode) => {
        if (perViewCustom[mode]) {
          const updated = { ...perViewCustom[mode] };
          delete updated[activeGame.id];
          perViewCustom[mode] = updated;
        }
      });
      await window.electronAPI.savePreferences({
        perGameViewSizeOverrides: currentMap,
        perGameViewCustomByView: perViewCustom,
      });
    } catch (error) {
      console.error('Failed to clear per-game logo size overrides:', error);
    }

    setShowClearPerGameConfirm(false);
    setShowResetConfirmation(false);
    onClose();
  };

  const handleSkipClearPerGameOverrides = () => {
    setShowClearPerGameConfirm(false);
    setShowResetConfirmation(false);
    onClose();
  };

  // Check for custom defaults and load baseline defaults when opening the menu
  React.useEffect(() => {
    const initialize = async () => {
      // Load baseline defaults
      const baseline = await window.electronAPI.getBaselineDefaults?.();
      if (baseline) {
        setBaselineDefaults(baseline);
      }
    };
    initialize();
  }, []);

  const handleOpenCustomDefaultsModal = () => {
    setShowCustomDefaultsModal(true);
  };

  // Handle Reset View (now integrated with CustomDefaultsManager)
  const getSizeLabel = () => {
    if (viewMode === 'grid') return 'Boxart Size';
    if (viewMode === 'logo') return 'Logo Size';
    return 'Game Tile Size';
  };

  const getSizeRange = () => {
    if (viewMode === 'list') return { min: 10, max: 300 };
    return { min: 50, max: 600 };
  };

  const getPaddingRange = () => {
    if (viewMode === 'logo') return { min: 0, max: 32 };
    return { min: 0, max: 10 };
  };

  const getPaddingLabel = () => {
    if (viewMode === 'grid') return 'Boxart Padding';
    if (viewMode === 'logo') return 'Logo Padding';
    return 'Game Tile Padding';
  };

  const paddingLabel = getPaddingLabel();
  const sizeValue = getSizeValue();
  const sizeRange = getSizeRange();
  const paddingRange = getPaddingRange();

  const sliderDefaults = {
    gridSize: 120,
    logoSize: 100,
    listSize: 128,
    detailsBarSize: 14,
    selectedBoxArtSize: 25,
    gameTilePadding: 3,
    backgroundBlur: 40,
    backgroundBrightnessPercent: 30,
    carouselLogoSize: 100,
    carouselDescriptionSize: 18,
    carouselButtonSize: 14,
    categoriesTopSize: 12,
    logoBackgroundOpacity: 100,
    listTileHeight: 128,
    listBoxartSize: 96,
    listLogoSize: 96,
    listTitleTextSize: 18,
    listSectionTextSize: 14,
    panelWidth: 800,
    fanartHeight: 320,
    descriptionWidth: 50,
    detailsPanelBottomBarHeight: 72,
    perGameLogoSize: 100,
    rightPanelBoxartSize: 120,
    rightPanelTextSize: 14,
    rightPanelButtonSize: 14,
    detailsPanelOpacity: 80,
    coverFlowCoverSize: 300,
    coverFlowReflection: 60,
    coverFlowVerticalOffset: 0,
    coverFlowSideOpacity: 100,
  };

  const defaultButtonColors = {
    playColor: '#0ea5e9',
    editColor: '#6b7280',
    modManagerColor: '#a855f7',
  };

  const resolveButtonColors = (colors?: { playColor?: string; editColor?: string; modManagerColor?: string }) => ({
    playColor: colors?.playColor || defaultButtonColors.playColor,
    editColor: colors?.editColor || defaultButtonColors.editColor,
    modManagerColor: colors?.modManagerColor || defaultButtonColors.modManagerColor,
  });

  const renderButtonColorsEditor = ({
    title,
    colors,
    onChange,
    onReset,
    containerClassName = 'px-3 py-2 bg-gray-700/30 rounded-md',
  }: {
    title: string;
    colors?: { playColor?: string; editColor?: string; modManagerColor?: string };
    onChange?: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
    onReset?: () => void;
    containerClassName?: string;
  }) => {
    const resolvedColors = resolveButtonColors(colors);
    const colorItems: Array<{
      key: 'playColor' | 'editColor' | 'modManagerColor';
      label: string;
      title: string;
    }> = [
        { key: 'playColor', label: 'Play', title: 'Play button color' },
        { key: 'editColor', label: 'Edit', title: 'Edit button color' },
        { key: 'modManagerColor', label: 'Mod Mgr', title: 'Mod Manager button color' },
      ];

    return (
      <div className={containerClassName}>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-xs text-gray-400 font-semibold">{title}</label>
          {onReset && (
            <button
              onClick={onReset}
              className="px-2 py-1 text-xs rounded bg-gray-600 hover:bg-gray-500 text-gray-300 border border-gray-500 transition-colors"
              title="Reset to defaults"
            >
              Reset
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {colorItems.map((item) => (
            <div key={item.key} className="flex-1 min-w-0 flex items-center justify-between gap-2">
              <div className="text-[11px] text-gray-300">{item.label}</div>
              <input
                type="color"
                value={resolvedColors[item.key]}
                onChange={(e) => onChange?.({
                  ...resolvedColors,
                  [item.key]: e.target.value,
                })}
                className="color-chip-input w-7 h-5 rounded cursor-pointer"
                title={item.title}
              />
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleShowCarouselDetailsToggle = () => {
    onShowCarouselDetailsChange?.(!showCarouselDetails);
  };

  const handleShowCarouselLogosToggle = () => {
    onShowCarouselLogosChange?.(!showCarouselLogos);
  };

  const handleAlternativeBackgroundToggle = () => {
    if (!activeGame || !onActiveGameChange) return;
    const updatedGame = {
      ...activeGame,
      useAlternativeBackground: activeGame.useAlternativeBackground !== true,
    };
    onActiveGameChange(updatedGame);
    window.electronAPI.saveGame(updatedGame).catch((error) => {
      console.error('Failed to save game:', error);
    });
  };

  const handlePerGameLogoSizeChange = (viewModeType: 'grid' | 'list' | 'logo' | 'carousel', size: number) => {
    if (!activeGame || !onActiveGameChange) return;

    // Skip if size hasn't actually changed
    if (activeGame.logoSizePerViewMode?.[viewModeType] === size) return;

    // Update local state immediately for instant UI feedback
    setLocalLogoSizes(prev => ({
      ...prev,
      [viewModeType]: size,
    }));

    const updatedGame = {
      ...activeGame,
      logoSizePerViewMode: {
        ...activeGame.logoSizePerViewMode,
        [viewModeType]: size,
      },
    };

    // Update parent state immediately for UI update
    onActiveGameChange(updatedGame);

    // Debounce the backend save - only save after user stops dragging
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await window.electronAPI.saveGame(updatedGame);
        const prefs = await window.electronAPI.getPreferences();
        const currentMap = prefs.perGameViewSizeOverrides || {};
        const gameMap = currentMap[activeGame.id] || {};
        const perViewCustom = prefs.perGameViewCustomByView || {};
        const currentViewCustom = (perViewCustom as any)[viewModeType] || {};
        await window.electronAPI.savePreferences({
          perGameViewSizeOverrides: {
            ...currentMap,
            [activeGame.id]: {
              ...gameMap,
              [viewModeType]: size,
            },
          },
          perGameViewCustomByView: {
            ...perViewCustom,
            [viewModeType]: {
              ...currentViewCustom,
              [activeGame.id]: {
                gameName: activeGame.title,
                size,
              },
            },
          },
        });
      } catch (error) {
        console.error('Failed to save per-game logo size override:', error);
      }
      saveTimeoutRef.current = null;
    }, 500); // Save 500ms after user stops moving slider
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        minWidth: viewMode === 'list' ? '900px' : '620px'
      }}
    >
      {/* Top Action Row */}
      <div className="px-3 pt-2 pb-1">
        <div className="flex items-center justify-between">
          <div>
            {viewMode !== 'coverflow' && (
              <button
                onClick={() => {
                  onViewFlipChange?.(!isViewFlipped);
                  onClose();
                }}
                className="px-2 py-1 text-[11px] rounded transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 font-medium flex items-center gap-1"
                title={viewMode === 'carousel' ? 'Flip the view - swap carousel and details sections' : 'Flip the view - swap left and right sections'}
              >
                <svg className="w-3 h-3 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                Flip View
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleResetToDefaults}
              className="px-2 py-1 text-[11px] rounded transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 font-medium"
              title="Reset view settings to defaults for your resolution"
            >
              Reset
            </button>
            <button
              onClick={handleOpenCustomDefaultsModal}
              className="px-2 py-1 text-[11px] rounded transition-colors bg-blue-700 text-gray-300 hover:bg-blue-600 border border-blue-600 font-medium"
              title="Save or restore your custom defaults"
            >
              Defaults
            </button>
          </div>
        </div>
      </div>

      {/* View Mode Toggle Buttons - Single Row */}
      <div className="px-3 py-1 grid grid-cols-5 gap-1.5">
        <button
          onClick={() => handleViewModeChange('grid')}
          className={`px-2 py-1.5 text-xs rounded transition-colors flex flex-col items-center gap-0.5 font-medium ${viewMode === 'grid'
            ? 'bg-blue-600/40 text-white border border-blue-500'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
            }`}
          title="Grid View"
        >
          <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Grid
        </button>
        <button
          onClick={() => handleViewModeChange('list')}
          className={`px-2 py-1.5 text-xs rounded transition-colors flex flex-col items-center gap-0.5 font-medium ${viewMode === 'list'
            ? 'bg-blue-600/40 text-white border border-blue-500'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
            }`}
          title="List View"
        >
          <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          List
        </button>
        <button
          onClick={() => handleViewModeChange('logo')}
          className={`px-2 py-1.5 text-xs rounded transition-colors flex flex-col items-center gap-0.5 font-medium ${viewMode === 'logo'
            ? 'bg-blue-600/40 text-white border border-blue-500'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
            }`}
          title="Logo View"
        >
          <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Logo
        </button>
        <button
          onClick={() => handleViewModeChange('carousel')}
          className={`px-2 py-1.5 text-xs rounded transition-colors flex flex-col items-center gap-0.5 font-medium ${viewMode === 'carousel'
            ? 'bg-blue-600/40 text-white border border-blue-500'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
            }`}
          title="Carousel View"
        >
          <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
          Carousel
        </button>
        <button
          onClick={() => handleViewModeChange('coverflow')}
          className={`px-2 py-1.5 text-xs rounded transition-colors flex flex-col items-center gap-0.5 font-medium ${viewMode === 'coverflow'
            ? 'bg-blue-600/40 text-white border border-blue-500'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
            }`}
          title="Cover Flow View"
        >
          <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h3v12H4V6zM10.5 4h3v16h-3V4zM17 6h3v12h-3V6z" />
          </svg>
          Cover Flow
        </button>
      </div>

      {/* Carousel Settings - in two columns */}
      {viewMode === 'carousel' && (
        <>
          <div className="grid grid-cols-2 text-xs text-gray-400 px-3 pb-1 font-semibold">
            <span>Games View</span>
            <span className="text-right">Game Details</span>
          </div>
          <div className="px-2 py-2">
            <div className="grid grid-cols-2 gap-3">
              {/* Left Column */}
              <div className="space-y-2">
                {/* Details Section */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  {/* Show Details Toggle */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-400 font-medium">Show Details Across Top</label>
                    <button
                      onClick={handleShowCarouselDetailsToggle}
                      className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${showCarouselDetails ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                    >
                      <span
                        className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${showCarouselDetails ? 'translate-x-3' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>

                  {/* Details Bar Size - only show when details are enabled */}
                  {showCarouselDetails && onDetailsBarSizeChange && (
                    <>
                      <MenuSliderRow
                        label="Details Bar Size"
                        min={10}
                        max={24}
                        step={1}
                        value={detailsBarSize}
                        defaultValue={sliderDefaults.detailsBarSize}
                        onChange={onDetailsBarSizeChange}
                        onReset={() => onDetailsBarSizeChange(sliderDefaults.detailsBarSize)}
                        formatValue={(value) => `${value}px`}
                        minLabel="10px"
                        maxLabel="24px"
                      />
                    </>
                  )}
                </div>

                {/* Selected Box Art Size */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Selected Box Art Size"
                    min={5}
                    max={30}
                    step={0.5}
                    value={selectedBoxArtSize}
                    defaultValue={sliderDefaults.selectedBoxArtSize}
                    onChange={(value) => onSelectedBoxArtSizeChange?.(value)}
                    onReset={() => onSelectedBoxArtSizeChange?.(sliderDefaults.selectedBoxArtSize)}
                    formatValue={(value) => `${value}vw`}
                    minLabel="5vw"
                    maxLabel="30vw"
                  />
                </div>

                {/* Game Tile Padding - for Carousel */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Game Tile Padding"
                    min={0}
                    max={3}
                    step={1}
                    value={gameTilePadding}
                    defaultValue={sliderDefaults.gameTilePadding}
                    onChange={(value) => onGameTilePaddingChange?.(value)}
                    onReset={() => onGameTilePaddingChange?.(sliderDefaults.gameTilePadding)}
                    formatValue={(value) => `${value}px`}
                    minLabel="0px"
                    maxLabel="3px"
                  />
                </div>

                {/* Background Blur Amount - for Carousel */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Background Blur Amount"
                    min={0}
                    max={100}
                    step={1}
                    value={backgroundBlur}
                    defaultValue={0}
                    onChange={(value) => onBackgroundBlurChange?.(value)}
                    onReset={() => onBackgroundBlurChange?.(0)}
                    formatValue={(value) => `${value}px`}
                    minLabel="0px"
                    maxLabel="100px"
                  />
                </div>

                {/* Background Brightness - for Carousel */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Background Brightness"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(backgroundBrightness * 100)}
                    defaultValue={sliderDefaults.backgroundBrightnessPercent}
                    onChange={(value) => onBackgroundBrightnessChange?.(value / 100)}
                    onReset={() => onBackgroundBrightnessChange?.(sliderDefaults.backgroundBrightnessPercent / 100)}
                    formatValue={(value) => `${value}%`}
                    minLabel="0%"
                    maxLabel="100%"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-2">
                {/* Per-Game Logo Size Control for Carousel */}
                {activeGame && (
                  <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-300 font-medium">Alternative Background</label>
                      <button
                        onClick={handleAlternativeBackgroundToggle}
                        className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-all ${activeGame?.useAlternativeBackground ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-600'}`}
                      >
                        <span
                          className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-all shadow-sm ${activeGame?.useAlternativeBackground ? 'translate-x-[14px]' : 'translate-x-0.5'}`}
                        />
                      </button>
                    </div>

                    <div className="pt-3 border-t border-white/5">
                      <MenuSliderRow
                        label="Game Logo Size"
                        min={50}
                        max={600}
                        step={5}
                        value={localLogoSizes.carousel}
                        defaultValue={sliderDefaults.perGameLogoSize}
                        onChange={(value) => handlePerGameLogoSizeChange('carousel', value)}
                        onReset={() => handlePerGameLogoSizeChange('carousel', sliderDefaults.perGameLogoSize)}
                        formatValue={(value) => `${value}px`}
                        minLabel="50px"
                        maxLabel="600px"
                        sliderClassName="h-2"
                      />
                    </div>
                  </div>
                )}

                {/* Game Logos Section */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  {/* Show Game Logos Toggle */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-400 font-medium">Show Game Logos</label>
                    <button
                      onClick={handleShowCarouselLogosToggle}
                      className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${showCarouselLogos ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                    >
                      <span
                        className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${showCarouselLogos ? 'translate-x-3' : 'translate-x-0.5'
                          }`}
                      />
                    </button>
                  </div>

                  {/* Logo Size - only show when logos are enabled AND no per-game override */}
                  {showCarouselLogos && !activeGame && onCarouselLogoSizeChange && (
                    <>
                      <MenuSliderRow
                        label="Logo Size"
                        min={50}
                        max={600}
                        step={5}
                        value={carouselLogoSize}
                        defaultValue={sliderDefaults.carouselLogoSize}
                        onChange={onCarouselLogoSizeChange}
                        onReset={() => onCarouselLogoSizeChange(sliderDefaults.carouselLogoSize)}
                        formatValue={(value) => `${value}px`}
                        minLabel="50px"
                        maxLabel="600px"
                      />
                    </>
                  )}

                  {/* Logo Alignment - only show when logos are enabled */}
                  {showCarouselLogos && onCarouselLogoAlignmentChange && (
                    <>
                      <label className="block text-xs text-gray-400 mb-2 font-semibold mt-3">Logo Alignment</label>
                      <div className="flex gap-1">
                        {(['left', 'center', 'right'] as const).map((alignment) => (
                          <button
                            key={alignment}
                            onClick={() => onCarouselLogoAlignmentChange(alignment)}
                            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${carouselLogoAlignment === alignment
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                              }`}
                          >
                            {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Description Text Size */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Description Text Size"
                    min={12}
                    max={28}
                    step={1}
                    value={carouselDescriptionSize}
                    defaultValue={sliderDefaults.carouselDescriptionSize}
                    onChange={(value) => onCarouselDescriptionSizeChange?.(value)}
                    onReset={() => onCarouselDescriptionSizeChange?.(sliderDefaults.carouselDescriptionSize)}
                    formatValue={(value) => `${value}px`}
                    minLabel="12px"
                    maxLabel="28px"
                  />
                </div>

                {/* Description Text Alignment */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-2 font-semibold">Description Text Alignment</label>
                  <div className="flex gap-1">
                    {(['left', 'center', 'right'] as const).map((alignment) => (
                      <button
                        key={alignment}
                        onClick={() => onCarouselDescriptionAlignmentChange?.(alignment)}
                        className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${carouselDescriptionAlignment === alignment
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                      >
                        {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Button Size */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Button Size"
                    min={10}
                    max={24}
                    step={1}
                    value={carouselButtonSize}
                    defaultValue={sliderDefaults.carouselButtonSize}
                    onChange={(value) => onCarouselButtonSizeChange?.(value)}
                    onReset={() => onCarouselButtonSizeChange?.(sliderDefaults.carouselButtonSize)}
                    formatValue={(value) => `${value}px`}
                    minLabel="10px"
                    maxLabel="24px"
                  />
                </div>

                {/* Button Colors */}
                {renderButtonColorsEditor({
                  title: 'Button Colors',
                  colors: carouselButtonColors,
                  onChange: onCarouselButtonColorsChange,
                  onReset: () => {
                    onCarouselButtonColorsChange?.(defaultButtonColors);
                    window.electronAPI.savePreferences({ carouselButtonColors: defaultButtonColors });
                  },
                })}

                {/* Button Alignment */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-2 font-semibold">Button Alignment</label>
                  <div className="flex gap-1">
                    {(['left', 'center', 'right'] as const).map((alignment) => (
                      <button
                        key={alignment}
                        onClick={() => onCarouselButtonAlignmentChange?.(alignment)}
                        className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${carouselButtonAlignment === alignment
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                          }`}
                      >
                        {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Cover Flow only – simplified menu */}
      {viewMode === 'coverflow' && (
        <div className="px-2 py-2 space-y-3">
          {onCoverFlowCoverSizeChange && (
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Boxart size"
                min={150}
                max={450}
                step={10}
                value={coverFlowCoverSize}
                defaultValue={sliderDefaults.coverFlowCoverSize}
                onChange={onCoverFlowCoverSizeChange}
                onReset={() => onCoverFlowCoverSizeChange(sliderDefaults.coverFlowCoverSize)}
                formatValue={(value) => `${value}px`}
                minLabel="150px"
                maxLabel="450px"
                sliderClassName="h-2"
              />
            </div>
          )}
          {onCoverFlowReflectionChange && (
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Reflection transparency"
                min={0}
                max={100}
                step={5}
                value={coverFlowReflection}
                defaultValue={sliderDefaults.coverFlowReflection}
                onChange={onCoverFlowReflectionChange}
                onReset={() => onCoverFlowReflectionChange(sliderDefaults.coverFlowReflection)}
                formatValue={(value) => `${value}%`}
                minLabel="0%"
                maxLabel="100%"
                sliderClassName="h-2"
              />
            </div>
          )}
          {onCoverFlowVerticalOffsetChange && (
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Boxart vertical position"
                min={-500}
                max={500}
                step={5}
                value={coverFlowVerticalOffset}
                defaultValue={sliderDefaults.coverFlowVerticalOffset}
                onChange={onCoverFlowVerticalOffsetChange}
                onReset={() => onCoverFlowVerticalOffsetChange(sliderDefaults.coverFlowVerticalOffset)}
                formatValue={(value) => value > 0 ? `+${value}px` : `${value}px`}
                minLabel="-500px"
                maxLabel="500px"
                sliderClassName="h-2"
              />
            </div>
          )}
          {onCoverFlowSideOpacityChange && (
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Side boxart opacity"
                min={0}
                max={100}
                step={5}
                value={coverFlowSideOpacity}
                defaultValue={sliderDefaults.coverFlowSideOpacity}
                onChange={onCoverFlowSideOpacityChange}
                onReset={() => onCoverFlowSideOpacityChange(sliderDefaults.coverFlowSideOpacity)}
                formatValue={(value) => `${value}%`}
                minLabel="0%"
                maxLabel="100%"
                sliderClassName="h-2"
              />
            </div>
          )}
          {onBackgroundBlurChange && (
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Background Blur Amount"
                min={0}
                max={100}
                step={1}
                value={backgroundBlur}
                defaultValue={sliderDefaults.backgroundBlur}
                onChange={onBackgroundBlurChange}
                onReset={() => onBackgroundBlurChange(sliderDefaults.backgroundBlur)}
                formatValue={(value) => `${value}px`}
                minLabel="0px"
                maxLabel="100px"
                sliderClassName="h-2"
              />
            </div>
          )}
          {onBackgroundBrightnessChange && (
            <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-3">
              <MenuSliderRow
                label="Background brightness"
                min={0}
                max={100}
                step={5}
                value={Math.round((backgroundBrightness ?? 0) * 100)}
                defaultValue={sliderDefaults.backgroundBrightnessPercent}
                onChange={(value) => onBackgroundBrightnessChange(value / 100)}
                onReset={() => onBackgroundBrightnessChange(sliderDefaults.backgroundBrightnessPercent / 100)}
                formatValue={(value) => `${value}%`}
                minLabel="0%"
                maxLabel="100%"
                sliderClassName="h-2"
              />

              {activeGame && (
                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                  <label className="text-xs text-gray-300 font-medium">Alternative Background</label>
                  <button
                    onClick={handleAlternativeBackgroundToggle}
                    className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-all ${activeGame?.useAlternativeBackground ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-600'}`}
                  >
                    <span
                      className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-all shadow-sm ${activeGame?.useAlternativeBackground ? 'translate-x-[14px]' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs text-gray-300 font-medium">Show Buttons</label>
              <button
                onClick={() => onCoverFlowShowButtonsChange?.(!coverFlowShowButtons)}
                className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-all ${coverFlowShowButtons ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-600'}`}
              >
                <span
                  className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-all shadow-sm ${coverFlowShowButtons ? 'translate-x-[14px]' : 'translate-x-0.5'}`}
                />
              </button>
            </div>
            {coverFlowShowButtons && (
              <>
                <div>
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Button position</label>
                  <div className="flex gap-1">
                    {(['left', 'middle', 'right'] as const).map((pos) => (
                      <button
                        key={pos}
                        onClick={() => onCoverFlowButtonPositionChange?.(pos)}
                        className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${coverFlowButtonPosition === pos ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
                      >
                        {pos === 'middle' ? 'Middle' : pos.charAt(0).toUpperCase() + pos.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {onCoverFlowButtonColorsChange && (
                  <>
                    {renderButtonColorsEditor({
                      title: 'Button Colours',
                      colors: coverFlowButtonColors,
                      onChange: onCoverFlowButtonColorsChange,
                      onReset: () => onCoverFlowButtonColorsChange(defaultButtonColors),
                      containerClassName: 'space-y-2 pt-2 border-t border-white/5',
                    })}
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Shared layout settings for Grid, List, and Logo views (exclude Cover Flow) */}
      {viewMode !== 'carousel' && viewMode !== 'coverflow' && (
        <>
          {/* 3-column layout for all views (4-column for list) */}
          <div className={`grid text-xs text-gray-400 px-3 pb-1 font-semibold ${viewMode === 'list' ? 'grid-cols-4' : 'grid-cols-3'}`}>
            <span className={viewMode === 'list' ? 'col-span-2' : ''}>Games View</span>
            <span className="text-center">Dividers</span>
            <span className="text-right">Game Details</span>
          </div>
          <div className="px-2 py-2">
            <div className={`grid gap-3 ${viewMode === 'list' ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {/* Left Column(s) - Split into 2 columns for list view */}
              <div className={viewMode === 'list' ? 'col-span-2 grid grid-cols-2 gap-2' : 'space-y-2'}>
                {/* Categories Section */}
                {(viewMode as string) !== 'carousel' && onShowCategoriesInGameListChange && (
                  <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-300 font-medium">Show Categories</label>
                      <button
                        onClick={() => onShowCategoriesInGameListChange(!showCategoriesInGameList)}
                        className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-all ${showCategoriesInGameList ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-600'
                          }`}
                      >
                        <span
                          className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-all shadow-sm ${showCategoriesInGameList ? 'translate-x-[14px]' : 'translate-x-0.5'
                            }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="text-xs text-gray-300 font-medium">Alternative Background</label>
                      <button
                        onClick={handleAlternativeBackgroundToggle}
                        disabled={!activeGame}
                        className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-all ${activeGame?.useAlternativeBackground ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-600'} ${!activeGame ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <span
                          className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-all shadow-sm ${activeGame?.useAlternativeBackground ? 'translate-x-[14px]' : 'translate-x-0.5'}`}
                        />
                      </button>
                    </div>

                    {showCategoriesInGameList && (
                      <div className="space-y-3 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                        {/* Position */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-2 font-semibold">Categories Position</label>
                          <div className="flex gap-1">
                            {(['top', 'bottom'] as const).map((pos) => (
                              <button
                                key={pos}
                                onClick={() => onCategoriesPositionChange?.(pos)}
                                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${categoriesPosition === pos
                                  ? 'bg-blue-600/40 text-white border border-blue-500'
                                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                                  }`}
                              >
                                {pos.charAt(0).toUpperCase() + pos.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Alignment */}
                        <div>
                          <label className="block text-xs text-gray-400 mb-2 font-semibold">Categories Alignment</label>
                          <div className="flex gap-1">
                            {(['left', 'center', 'right'] as const).map((alignment) => (
                              <button
                                key={alignment}
                                onClick={() => onCategoriesTopAlignmentChange?.(alignment)}
                                className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${categoriesTopAlignment === alignment
                                  ? 'bg-blue-600/40 text-white border border-blue-500'
                                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                                  }`}
                              >
                                {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Text Size */}
                        <div>
                          <MenuSliderRow
                            label="Categories Size"
                            min={10}
                            max={24}
                            step={1}
                            value={categoriesTopSize}
                            defaultValue={sliderDefaults.categoriesTopSize}
                            onChange={(value) => onCategoriesTopSizeChange?.(value)}
                            onReset={() => onCategoriesTopSizeChange?.(sliderDefaults.categoriesTopSize)}
                            formatValue={(value) => `${value}px`}
                            minLabel="10px"
                            maxLabel="24px"
                            sliderClassName="h-1.5"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Size control per view */}
                {((viewMode === 'grid' && onGridSizeChange) || (viewMode === 'logo' && onLogoSizeChange)) && (
                  <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                    <MenuSliderRow
                      label={getSizeLabel()}
                      min={sizeRange.min}
                      max={sizeRange.max}
                      step={1}
                      value={sizeValue}
                      defaultValue={viewMode === 'grid' ? sliderDefaults.gridSize : sliderDefaults.logoSize}
                      onChange={handleSizeChange}
                      onReset={() => handleSizeChange(viewMode === 'grid' ? sliderDefaults.gridSize : sliderDefaults.logoSize)}
                      formatValue={(value) => `${value}px`}
                      minLabel={`${sizeRange.min}px`}
                      maxLabel={`${sizeRange.max}px`}
                      sliderClassName="h-2"
                    />
                  </div>
                )}

                {/* Show Logo Over Boxart Toggle (Grid only) */}
                {viewMode === 'grid' && (
                  <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs text-gray-400 font-medium">Show Logo Over Boxart</label>
                      <button
                        onClick={() => onShowLogoOverBoxartChange?.(!showLogoOverBoxart)}
                        className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${showLogoOverBoxart ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                      >
                        <span
                          className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${showLogoOverBoxart ? 'translate-x-3' : 'translate-x-0.5'
                            }`}
                        />
                      </button>
                    </div>

                    {showLogoOverBoxart && (
                      <>
                        <label className="block text-xs text-gray-400 mb-2 font-semibold">Logo Position</label>
                        <div className="grid grid-cols-3 gap-1 mb-2">
                          <button
                            onClick={() => onLogoPositionChange?.('top')}
                            className={`px-2 py-1 text-xs rounded transition-colors ${logoPosition === 'top'
                              ? 'bg-blue-600/40 text-white border border-blue-500'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                              }`}
                          >
                            Top
                          </button>
                          <button
                            onClick={() => onLogoPositionChange?.('middle')}
                            className={`px-2 py-1 text-xs rounded transition-colors ${logoPosition === 'middle'
                              ? 'bg-blue-600/40 text-white border border-blue-500'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                              }`}
                          >
                            Middle
                          </button>
                          <button
                            onClick={() => onLogoPositionChange?.('bottom')}
                            className={`px-2 py-1 text-xs rounded transition-colors ${logoPosition === 'bottom'
                              ? 'bg-blue-600/40 text-white border border-blue-500'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                              }`}
                          >
                            Bottom
                          </button>
                        </div>
                        <button
                          onClick={() => onLogoPositionChange?.('underneath')}
                          className={`w-full px-2 py-1 text-xs rounded transition-colors ${logoPosition === 'underneath'
                            ? 'bg-blue-600/40 text-white border border-blue-500'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                            }`}
                        >
                          Below
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Game Tile Padding - only for grid and logo views */}
                {viewMode !== 'list' && (
                  <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                    <MenuSliderRow
                      label={paddingLabel}
                      min={paddingRange.min}
                      max={paddingRange.max}
                      step={1}
                      value={gameTilePadding}
                      defaultValue={sliderDefaults.gameTilePadding}
                      onChange={(value) => onGameTilePaddingChange?.(value)}
                      onReset={() => onGameTilePaddingChange?.(sliderDefaults.gameTilePadding)}
                      formatValue={(value) => `${value}px`}
                      minLabel={`${paddingRange.min}px`}
                      maxLabel={`${paddingRange.max}px`}
                    />
                  </div>
                )}

                {/* Logo tile background transparency (Logo view) */}
                {viewMode === 'logo' && (
                  <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                    <MenuSliderRow
                      label="Logo Tile Background Transparency"
                      min={0}
                      max={100}
                      step={1}
                      value={logoBackgroundOpacity}
                      defaultValue={sliderDefaults.logoBackgroundOpacity}
                      onChange={(value) => onLogoBackgroundOpacityChange?.(value)}
                      onReset={() => onLogoBackgroundOpacityChange?.(sliderDefaults.logoBackgroundOpacity)}
                      formatValue={(value) => `${value}%`}
                      minLabel="0%"
                      maxLabel="100%"
                    />
                  </div>
                )}

                {/* List view specific controls */}
                {viewMode === 'list' && listViewOptions && (
                  <>
                    {/* Tile Height control - always visible */}
                    <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                      <MenuSliderRow
                        label="Tile Height"
                        min={10}
                        max={300}
                        step={1}
                        value={listViewOptions.tileHeight ?? 128}
                        defaultValue={sliderDefaults.listTileHeight}
                        onChange={(value) => onListViewOptionsChange?.({
                          ...listViewOptions,
                          tileHeight: value,
                        })}
                        onReset={() => onListViewOptionsChange?.({
                          ...listViewOptions,
                          tileHeight: sliderDefaults.listTileHeight,
                        })}
                        formatValue={(value) => `${value}px`}
                        minLabel="10px"
                        maxLabel="300px"
                      />
                    </div>

                    {/* Display Mode controls */}
                    <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-2">
                      <label className="block text-xs text-gray-400 mb-2 font-semibold">Display</label>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => onListViewOptionsChange?.({
                            ...listViewOptions,
                            displayMode: 'boxart-title',
                          })}
                          className={`px-2 py-1 text-xs rounded transition-colors ${(listViewOptions.displayMode === 'boxart-title' || !listViewOptions.displayMode)
                            ? 'bg-blue-600/40 text-white border border-blue-500'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                            }`}
                        >
                          Boxart + Title
                        </button>
                        <button
                          onClick={() => onListViewOptionsChange?.({
                            ...listViewOptions,
                            displayMode: 'logo-title',
                          })}
                          className={`px-2 py-1 text-xs rounded transition-colors ${listViewOptions.displayMode === 'logo-title'
                            ? 'bg-blue-600/40 text-white border border-blue-500'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                            }`}
                        >
                          Logo + Title
                        </button>
                        <button
                          onClick={() => onListViewOptionsChange?.({
                            ...listViewOptions,
                            displayMode: 'logo-only',
                          })}
                          className={`px-2 py-1 text-xs rounded transition-colors ${listViewOptions.displayMode === 'logo-only'
                            ? 'bg-blue-600/40 text-white border border-blue-500'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                            }`}
                        >
                          Logo Only
                        </button>
                        <button
                          onClick={() => onListViewOptionsChange?.({
                            ...listViewOptions,
                            displayMode: 'title-only',
                          })}
                          className={`px-2 py-1 text-xs rounded transition-colors ${listViewOptions.displayMode === 'title-only'
                            ? 'bg-blue-600/40 text-white border border-blue-500'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                            }`}
                        >
                          Title Only
                        </button>
                        <button
                          onClick={() => onListViewOptionsChange?.({
                            ...listViewOptions,
                            displayMode: 'icon-title',
                          })}
                          className={`px-2 py-1 text-xs rounded transition-colors ${listViewOptions.displayMode === 'icon-title'
                            ? 'bg-blue-600/40 text-white border border-blue-500'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                            }`}
                        >
                          Icon + Title
                        </button>
                      </div>

                      {/* Boxart Size - only for Boxart + Title mode */}
                      {(listViewOptions.displayMode === 'boxart-title' || !listViewOptions.displayMode) && (
                        <div className="pt-2">
                          <MenuSliderRow
                            label="Boxart Size"
                            min={30}
                            max={200}
                            step={1}
                            value={listViewOptions.boxartSize ?? sliderDefaults.listBoxartSize}
                            defaultValue={sliderDefaults.listBoxartSize}
                            onChange={(value) => onListViewOptionsChange?.({
                              ...listViewOptions,
                              boxartSize: value,
                            })}
                            onReset={() => onListViewOptionsChange?.({
                              ...listViewOptions,
                              boxartSize: sliderDefaults.listBoxartSize,
                            })}
                            formatValue={(value) => `${value}px`}
                            minLabel="30px"
                            maxLabel="200px"
                          />
                        </div>
                      )}

                      {/* Logo Size - only for Logo + Title mode */}
                      {listViewOptions.displayMode === 'logo-title' && (
                        <div className="pt-2">
                          <MenuSliderRow
                            label="Logo Size"
                            min={30}
                            max={200}
                            step={1}
                            value={listViewOptions.logoSize ?? sliderDefaults.listLogoSize}
                            defaultValue={sliderDefaults.listLogoSize}
                            onChange={(value) => onListViewOptionsChange?.({
                              ...listViewOptions,
                              logoSize: value,
                            })}
                            onReset={() => onListViewOptionsChange?.({
                              ...listViewOptions,
                              logoSize: sliderDefaults.listLogoSize,
                            })}
                            formatValue={(value) => `${value}px`}
                            minLabel="30px"
                            maxLabel="200px"
                          />
                        </div>
                      )}

                      {/* Title Text Size - for all modes except Logo Only */}
                      {listViewOptions.displayMode !== 'logo-only' && (
                        <div>
                          <MenuSliderRow
                            label="Title Text Size"
                            min={12}
                            max={32}
                            step={1}
                            value={listViewOptions.titleTextSize ?? sliderDefaults.listTitleTextSize}
                            defaultValue={sliderDefaults.listTitleTextSize}
                            onChange={(value) => onListViewOptionsChange?.({
                              ...listViewOptions,
                              titleTextSize: value,
                            })}
                            onReset={() => onListViewOptionsChange?.({
                              ...listViewOptions,
                              titleTextSize: sliderDefaults.listTitleTextSize,
                            })}
                            formatValue={(value) => `${value}px`}
                            minLabel="12px"
                            maxLabel="32px"
                          />
                        </div>
                      )}
                    </div>

                    {/* Game Tile Sections */}
                    <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-2">
                      <label className="block text-xs text-gray-400 font-semibold">Game Tile Sections</label>
                      {(
                        [
                          { key: 'showDescription', label: 'Description' },
                          { key: 'showReleaseDate', label: 'Release Date' },
                          { key: 'showGenres', label: 'Genres' },
                          { key: 'showCategories', label: 'Categories' },
                          { key: 'showPlatform', label: 'Platform' },
                          { key: 'showLauncher', label: 'Launcher' },
                        ] as const
                      ).map(({ key, label }) => {
                        const currentValue = !!listViewOptions[key as keyof typeof listViewOptions];
                        return (
                          <div key={key} className="flex items-center justify-between text-xs">
                            <span className="text-gray-300">{label}</span>
                            <button
                              onClick={() => onListViewOptionsChange?.({
                                ...listViewOptions,
                                [key]: !currentValue,
                              })}
                              className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${currentValue ? 'bg-blue-600' : 'bg-gray-600'
                                }`}
                            >
                              <span
                                className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${currentValue ? 'translate-x-3' : 'translate-x-0.5'
                                  }`}
                              />
                            </button>
                          </div>
                        );
                      })}

                      <div className="pt-2">
                        <MenuSliderRow
                          label="Section Text Size"
                          min={10}
                          max={18}
                          step={1}
                          value={listViewOptions.sectionTextSize ?? sliderDefaults.listSectionTextSize}
                          defaultValue={sliderDefaults.listSectionTextSize}
                          onChange={(value) => onListViewOptionsChange?.({
                            ...listViewOptions,
                            sectionTextSize: value,
                          })}
                          onReset={() => onListViewOptionsChange?.({
                            ...listViewOptions,
                            sectionTextSize: sliderDefaults.listSectionTextSize,
                          })}
                          formatValue={(value) => `${value}px`}
                          minLabel="10px"
                          maxLabel="18px"
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Background Blur Amount */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Background Blur Amount"
                    min={0}
                    max={100}
                    step={1}
                    value={backgroundBlur}
                    defaultValue={sliderDefaults.backgroundBlur}
                    onChange={(value) => onBackgroundBlurChange?.(value)}
                    onReset={() => onBackgroundBlurChange?.(sliderDefaults.backgroundBlur)}
                    formatValue={(value) => `${value}px`}
                    minLabel="0px"
                    maxLabel="100px"
                  />
                </div>

                {/* Background Brightness */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Background Brightness"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round(backgroundBrightness * 100)}
                    defaultValue={sliderDefaults.backgroundBrightnessPercent}
                    onChange={(value) => onBackgroundBrightnessChange?.(value / 100)}
                    onReset={() => onBackgroundBrightnessChange?.(sliderDefaults.backgroundBrightnessPercent / 100)}
                    formatValue={(value) => `${value}%`}
                    minLabel="0%"
                    maxLabel="100%"
                  />
                </div>
              </div>

              {/* Middle Column - Dividers (All non-carousel views) */}
              <div className="space-y-2">
                {/* Right Panel Width Control */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Right Panel Width"
                    min={400}
                    max={Math.floor(window.innerWidth * 0.75)}
                    step={10}
                    value={panelWidth}
                    defaultValue={sliderDefaults.panelWidth}
                    onChange={(value) => onPanelWidthChange?.(value)}
                    onReset={() => onPanelWidthChange?.(sliderDefaults.panelWidth)}
                    formatValue={(value) => `${value}px`}
                    minLabel="400px"
                    maxLabel={`${Math.floor(window.innerWidth * 0.75)}px`}
                  />
                </div>

                {/* Banner Height Control */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Banner Height"
                    min={150}
                    max={500}
                    step={10}
                    value={fanartHeight}
                    defaultValue={sliderDefaults.fanartHeight}
                    onChange={(value) => onFanartHeightChange?.(value)}
                    onReset={() => onFanartHeightChange?.(sliderDefaults.fanartHeight)}
                    formatValue={(value) => `${value}px`}
                    minLabel="150px"
                    maxLabel="500px"
                  />
                </div>

                {/* Description Width Control */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Description Width"
                    min={20}
                    max={80}
                    step={1}
                    value={descriptionWidth}
                    defaultValue={sliderDefaults.descriptionWidth}
                    onChange={(value) => onDescriptionWidthChange?.(value)}
                    onReset={() => onDescriptionWidthChange?.(sliderDefaults.descriptionWidth)}
                    formatValue={(value) => `${value}%`}
                    minLabel="20%"
                    maxLabel="80%"
                  />
                </div>

                {/* Bottom Bar Height Control */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Bottom Bar Height"
                    min={48}
                    max={140}
                    step={2}
                    value={detailsPanelBottomBarHeight}
                    defaultValue={sliderDefaults.detailsPanelBottomBarHeight}
                    onChange={(value) => onDetailsPanelBottomBarHeightChange?.(value)}
                    onReset={() => onDetailsPanelBottomBarHeightChange?.(sliderDefaults.detailsPanelBottomBarHeight)}
                    formatValue={(value) => `${value}px`}
                    minLabel="48px"
                    maxLabel="140px"
                  />
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-2">
                {/* Per-Game Logo Size Control - Top of Game Details, only for current view */}
                {activeGame && (
                  <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                    {/* Grid View */}
                    {viewMode === 'grid' && (
                      <MenuSliderRow
                        label={activeGame.logoUrl ? 'Game Logo Size' : 'Title Size'}
                        min={50}
                        max={600}
                        step={5}
                        value={localLogoSizes.grid}
                        defaultValue={sliderDefaults.perGameLogoSize}
                        onChange={(value) => handlePerGameLogoSizeChange('grid', value)}
                        onReset={() => handlePerGameLogoSizeChange('grid', sliderDefaults.perGameLogoSize)}
                        formatValue={(value) => `${value}px`}
                        minLabel="50px"
                        maxLabel="600px"
                        sliderClassName="h-2"
                      />
                    )}

                    {/* List View */}
                    {viewMode === 'list' && (
                      <MenuSliderRow
                        label={activeGame.logoUrl ? 'Game Logo Size' : 'Title Size'}
                        min={50}
                        max={600}
                        step={5}
                        value={localLogoSizes.list}
                        defaultValue={sliderDefaults.perGameLogoSize}
                        onChange={(value) => handlePerGameLogoSizeChange('list', value)}
                        onReset={() => handlePerGameLogoSizeChange('list', sliderDefaults.perGameLogoSize)}
                        formatValue={(value) => `${value}px`}
                        minLabel="50px"
                        maxLabel="600px"
                        sliderClassName="h-2"
                      />
                    )}

                    {/* Logo View */}
                    {viewMode === 'logo' && (
                      <MenuSliderRow
                        label={activeGame.logoUrl ? 'Game Logo Size' : 'Title Size'}
                        min={50}
                        max={600}
                        step={5}
                        value={localLogoSizes.logo}
                        defaultValue={sliderDefaults.perGameLogoSize}
                        onChange={(value) => handlePerGameLogoSizeChange('logo', value)}
                        onReset={() => handlePerGameLogoSizeChange('logo', sliderDefaults.perGameLogoSize)}
                        formatValue={(value) => `${value}px`}
                        minLabel="50px"
                        maxLabel="600px"
                        sliderClassName="h-2"
                      />
                    )}
                  </div>
                )}

                {/* Boxart Position and Size - Grouped together */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-2 font-semibold">Boxart Position</label>
                  <div className="grid grid-cols-3 gap-1 mb-3">
                    <button
                      onClick={() => onRightPanelBoxartPositionChange?.('left')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${rightPanelBoxartPosition === 'left'
                        ? 'bg-blue-600/40 text-white border border-blue-500'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                        }`}
                    >
                      Left
                    </button>
                    <button
                      onClick={() => onRightPanelBoxartPositionChange?.('right')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${rightPanelBoxartPosition === 'right'
                        ? 'bg-blue-600/40 text-white border border-blue-500'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                        }`}
                    >
                      Right
                    </button>
                    <button
                      onClick={() => onRightPanelBoxartPositionChange?.('none')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${rightPanelBoxartPosition === 'none'
                        ? 'bg-blue-600/40 text-white border border-blue-500'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                        }`}
                    >
                      None
                    </button>
                  </div>

                  {(rightPanelBoxartPosition === 'left' || rightPanelBoxartPosition === 'right') && (
                    <>
                      <MenuSliderRow
                        label="Resize Boxart"
                        min={80}
                        max={200}
                        step={5}
                        value={rightPanelBoxartSize}
                        defaultValue={sliderDefaults.rightPanelBoxartSize}
                        onChange={(value) => onRightPanelBoxartSizeChange?.(value)}
                        onReset={() => onRightPanelBoxartSizeChange?.(sliderDefaults.rightPanelBoxartSize)}
                        formatValue={(value) => `${value}px`}
                        minLabel="80px"
                        maxLabel="200px"
                      />
                    </>
                  )}
                </div>

                {/* Text Size */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Text Size"
                    min={10}
                    max={24}
                    step={1}
                    value={rightPanelTextSize}
                    defaultValue={sliderDefaults.rightPanelTextSize}
                    onChange={(value) => onRightPanelTextSizeChange?.(value)}
                    onReset={() => onRightPanelTextSizeChange?.(sliderDefaults.rightPanelTextSize)}
                    formatValue={(value) => `${value}px`}
                    minLabel="10px"
                    maxLabel="24px"
                  />
                </div>

                {/* Button Size */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Button Size"
                    min={10}
                    max={24}
                    step={1}
                    value={rightPanelButtonSize}
                    defaultValue={sliderDefaults.rightPanelButtonSize}
                    onChange={(value) => onRightPanelButtonSizeChange?.(value)}
                    onReset={() => onRightPanelButtonSizeChange?.(sliderDefaults.rightPanelButtonSize)}
                    formatValue={(value) => `${value}px`}
                    minLabel="10px"
                    maxLabel="24px"
                  />
                </div>

                {/* Button Location */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-2 font-semibold">Button Location</label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => onRightPanelButtonLocationChange?.('left')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${rightPanelButtonLocation === 'left'
                        ? 'bg-blue-600/40 text-white border border-blue-500'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                        }`}
                    >
                      Left
                    </button>
                    <button
                      onClick={() => onRightPanelButtonLocationChange?.('middle')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${rightPanelButtonLocation === 'middle'
                        ? 'bg-blue-600/40 text-white border border-blue-500'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                        }`}
                    >
                      Middle
                    </button>
                    <button
                      onClick={() => onRightPanelButtonLocationChange?.('right')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${rightPanelButtonLocation === 'right'
                        ? 'bg-blue-600/40 text-white border border-blue-500'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                        }`}
                    >
                      Right
                    </button>
                  </div>
                </div>

                {/* Button Colors - View Specific */}
                {(() => {
                  const getColors = () => {
                    if (viewMode === 'grid') return { colors: gridButtonColors, handler: onGridButtonColorsChange, preferenceKey: 'gridButtonColors' };
                    if (viewMode === 'list') return { colors: listButtonColors, handler: onListButtonColorsChange, preferenceKey: 'listButtonColors' };
                    if (viewMode === 'logo') return { colors: logoButtonColors, handler: onLogoButtonColorsChange, preferenceKey: 'logoButtonColors' };
                    return { colors: rightPanelButtonColors, handler: onRightPanelButtonColorsChange, preferenceKey: 'rightPanelButtonColors' };
                  };
                  const { colors, handler, preferenceKey } = getColors();
                  return renderButtonColorsEditor({
                    title: 'Button Colors',
                    colors,
                    onChange: handler,
                    onReset: () => {
                      handler?.(defaultButtonColors);
                      window.electronAPI.savePreferences({ [preferenceKey]: defaultButtonColors });
                    },
                  });
                })()}

                {/* Details View Transparency */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Details View Transparency"
                    min={0}
                    max={100}
                    step={1}
                    value={detailsPanelOpacity}
                    defaultValue={sliderDefaults.detailsPanelOpacity}
                    onChange={(value) => onDetailsPanelOpacityChange?.(value)}
                    onReset={() => onDetailsPanelOpacityChange?.(sliderDefaults.detailsPanelOpacity)}
                    formatValue={(value) => `${value}%`}
                    minLabel="0%"
                    maxLabel="100%"
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Custom Defaults Manager */}
      <CustomDefaultsManager
        isOpen={showCustomDefaultsModal}
        onClose={() => setShowCustomDefaultsModal(false)}
        currentViewMode={viewMode}
        currentResolution={screenResolution}
        activeGameId={activeGame?.id}
        onSettingsChange={() => {
          // Callback for when settings are imported - refresh the view if needed
          // The manager doesn't pass settings back; import directly updates preferences
          onSettingsImported?.();
        }}
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showResetConfirmation}
        title="Reset to Defaults"
        message={`Reset view settings to defaults for ${resetResolution} resolution?`}
        note="This will reset all customization settings to their default values based on your screen resolution."
        primaryActionText={`Reset ${viewMode === 'grid' ? 'Grid' : viewMode === 'list' ? 'List' : viewMode === 'logo' ? 'Logo' : viewMode === 'coverflow' ? 'Cover Flow' : 'Carousel'} View`}
        secondaryActionText="Reset All Views"
        onPrimaryAction={handleResetCurrentView}
        onSecondaryAction={handleResetAllViews}
        onConfirm={handleResetCurrentView}
        onCancel={() => setShowResetConfirmation(false)}
        variant="default"
      />

      {/* Clear Per-Game Override Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showClearPerGameConfirm}
        title="Clear Per-Game Overrides"
        message={`Also clear per-game logo size overrides for ${activeGame?.title || 'this game'}?`}
        note="This will remove any custom logo sizes you've set specifically for this game across all views."
        confirmText="Clear Overrides"
        cancelText="Keep Overrides"
        onConfirm={handleClearPerGameOverrides}
        onCancel={handleSkipClearPerGameOverrides}
        variant="default"
      />

    </div>
  );
};
