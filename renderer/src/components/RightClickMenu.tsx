import React, { useEffect, useRef } from 'react';
import type { Game } from '../types/game';
import { CustomDefaultsModal } from './CustomDefaultsModal';
import { ConfirmationDialog } from './ConfirmationDialog';

interface RightClickMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  viewMode: 'grid' | 'list' | 'logo' | 'carousel';
  onViewModeChange?: (mode: 'grid' | 'list' | 'logo' | 'carousel') => void;
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
  showCategoriesInGameList?: boolean;
  onShowCategoriesInGameListChange?: (show: boolean) => void;
  categoriesPosition?: 'top' | 'bottom';
  onCategoriesPositionChange?: (position: 'top' | 'bottom') => void;
  categoriesTopAlignment?: 'left' | 'center' | 'right';
  onCategoriesTopAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  categoriesTopSize?: number;
  onCategoriesTopSizeChange?: (size: number) => void;
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
  logoSize = 120,
  onLogoSizeChange,
  listSize = 128,
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
  rightPanelLogoSize = 95,
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
  showCategoriesInGameList = false,
  onShowCategoriesInGameListChange,
  categoriesPosition = 'top',
  onCategoriesPositionChange,
  categoriesTopAlignment = 'left',
  onCategoriesTopAlignmentChange,
  categoriesTopSize = 12,
  onCategoriesTopSizeChange,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // State for Custom Defaults Modal
  const [showCustomDefaultsModal, setShowCustomDefaultsModal] = React.useState(false);
  const [hasCustomDefaults, setHasCustomDefaults] = React.useState(false);
  const [screenResolution, setScreenResolution] = React.useState('1080p');
  const [saveFeedback, setSaveFeedback] = React.useState<{ type: 'current' | 'all'; show: boolean }>({ type: 'current', show: false });
  const [restoreFeedback, setRestoreFeedback] = React.useState<{ type: 'current' | 'all'; show: boolean }>({ type: 'current', show: false });
  const feedbackTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // State for Reset Confirmation Dialog
  const [showResetConfirmation, setShowResetConfirmation] = React.useState(false);
  const [resetResolution, setResetResolution] = React.useState('');
  const [baselineDefaults, setBaselineDefaults] = React.useState<any>(null);

  const showFeedback = (setState: (s: any) => void, type: 'current' | 'all') => {
    setState({ type, show: true });
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    feedbackTimeoutRef.current = setTimeout(() => {
      setState({ type, show: false });
    }, 2000);
  };

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

  const handleViewModeChange = (mode: 'grid' | 'list' | 'logo' | 'carousel') => {
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
    const resKey = screenHeight >= 1440 ? '1440p' : '1080p';

    // Store resolution and show confirmation dialog
    setResetResolution(resKey);
    setShowResetConfirmation(true);
  };

  const applyDefaultsForView = (mode: 'grid' | 'list' | 'logo' | 'carousel', resKey: string) => {
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
      if (defaults.rightPanelLogoSize !== undefined) onRightPanelLogoSizeChange?.(defaults.rightPanelLogoSize);
    } else if (mode === 'list') {
      if (defaults.backgroundBlur !== undefined) onBackgroundBlurChange?.(defaults.backgroundBlur);
      if (defaults.backgroundBrightness !== undefined) onBackgroundBrightnessChange?.(defaults.backgroundBrightness);
      if (defaults.panelWidth !== undefined) onPanelWidthChange?.(defaults.panelWidth);
      if (defaults.fanartHeight !== undefined) onFanartHeightChange?.(defaults.fanartHeight);
      if (defaults.descriptionWidth !== undefined) onDescriptionWidthChange?.(defaults.descriptionWidth);
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
    const modes: ('grid' | 'list' | 'logo' | 'carousel')[] = ['grid', 'list', 'logo', 'carousel'];
    modes.forEach(mode => applyDefaultsForView(mode, resetResolution));

    setShowResetConfirmation(false);
    onClose();
  };

  // Check for custom defaults and load baseline defaults when opening the menu
  React.useEffect(() => {
    const initialize = async () => {
      // Check for custom defaults
      const exists = await window.electronAPI.hasCustomDefaults?.();
      setHasCustomDefaults(exists || false);

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

  const gatherSettingsForViewMode = (mode: string) => {
    // Gather common right panel settings
    const rightPanelSettings = {
      rightPanelBoxartPosition,
      rightPanelBoxartSize,
      rightPanelTextSize,
      rightPanelButtonSize,
      rightPanelButtonLocation,
      detailsPanelOpacity,
    };

    const getRightPanelLogoSize = (m: string) => {
      if (activeGame) {
        if (m === 'grid') return localLogoSizes.grid;
        if (m === 'list') return localLogoSizes.list;
        if (m === 'logo') return localLogoSizes.logo;
        if (m === 'carousel') return localLogoSizes.carousel;
      }
      return rightPanelLogoSize;
    };

    // Return view-specific settings
    if (mode === 'grid') {
      return {
        gridSize,
        showLogoOverBoxart,
        gameTilePadding,
        panelWidth,
        fanartHeight,
        descriptionWidth,
        backgroundBlur,
        backgroundBrightness,
        logoSize: activeGame ? localLogoSizes.grid : logoSize,
        rightPanelLogoSize: activeGame ? localLogoSizes.grid : rightPanelLogoSize,
        ...rightPanelSettings,
      };
    } else if (mode === 'list') {
      return {
        panelWidth,
        backgroundBlur,
        backgroundBrightness,
        fanartHeight,
        descriptionWidth,
        listViewOptions,
        rightPanelLogoSize: activeGame ? localLogoSizes.list : rightPanelLogoSize,
        ...rightPanelSettings,
      };
    } else if (mode === 'logo') {
      return {
        logoSize: activeGame ? localLogoSizes.logo : logoSize,
        gameTilePadding,
        logoBackgroundOpacity,
        backgroundBlur,
        backgroundBrightness,
        panelWidth,
        fanartHeight,
        descriptionWidth,
        rightPanelLogoSize: activeGame ? localLogoSizes.logo : rightPanelLogoSize,
        ...rightPanelSettings,
      };
    } else if (mode === 'carousel') {
      return {
        showCarouselDetails,
        detailsBarSize,
        selectedBoxArtSize,
        gameTilePadding,
        backgroundBlur,
        backgroundBrightness,
        carouselLogoSize: activeGame ? localLogoSizes.carousel : carouselLogoSize,
        rightPanelLogoSize: activeGame ? localLogoSizes.carousel : rightPanelLogoSize,
        showCarouselLogos,
        carouselDescriptionSize,
        carouselDescriptionAlignment,
        carouselButtonSize,
        carouselButtonAlignment,
      };
    }

    // Fallback: return all settings if view mode is unknown
    return {
      panelWidth,
      gridSize,
      logoSize,
      listSize,
      gameTilePadding,
      backgroundBlur,
      backgroundBrightness,
      selectedBoxArtSize,
      showLogoOverBoxart,
      logoBackgroundOpacity,
      showCarouselDetails,
      showCarouselLogos,
      detailsBarSize,
      carouselLogoSize,
      carouselButtonSize,
      carouselDescriptionSize,
      carouselDescriptionAlignment,
      carouselButtonAlignment,
      listViewOptions,
      rightPanelLogoSize: getRightPanelLogoSize(viewMode),
      ...rightPanelSettings,
    };
  };

  const gatherCurrentSettings = () => gatherSettingsForViewMode(viewMode);

  const applySettings = (settings: any) => {
    if (settings.panelWidth !== undefined) {
      // This would need to be passed through as a prop callback if we want to support it
      // For now, panelWidth is only saved/restored in the modal state
    }
    if (settings.gridSize !== undefined && onGridSizeChange) onGridSizeChange(settings.gridSize);
    if (settings.logoSize !== undefined && onLogoSizeChange) onLogoSizeChange(settings.logoSize);
    if (settings.listSize !== undefined && onListSizeChange) onListSizeChange(settings.listSize);
    if (settings.gameTilePadding !== undefined && onGameTilePaddingChange) onGameTilePaddingChange(settings.gameTilePadding);
    if (settings.backgroundBlur !== undefined && onBackgroundBlurChange) onBackgroundBlurChange(settings.backgroundBlur);
    if (settings.backgroundBrightness !== undefined && onBackgroundBrightnessChange) onBackgroundBrightnessChange(settings.backgroundBrightness);
    if (settings.selectedBoxArtSize !== undefined && onSelectedBoxArtSizeChange) onSelectedBoxArtSizeChange(settings.selectedBoxArtSize);
    if (settings.showLogoOverBoxart !== undefined && onShowLogoOverBoxartChange) onShowLogoOverBoxartChange(settings.showLogoOverBoxart);
    if (settings.logoPosition !== undefined && onLogoPositionChange) onLogoPositionChange(settings.logoPosition);
    if (settings.logoBackgroundOpacity !== undefined && onLogoBackgroundOpacityChange) onLogoBackgroundOpacityChange(settings.logoBackgroundOpacity);
    if (settings.showCarouselDetails !== undefined && onShowCarouselDetailsChange) onShowCarouselDetailsChange(settings.showCarouselDetails);
    if (settings.showCarouselLogos !== undefined && onShowCarouselLogosChange) onShowCarouselLogosChange(settings.showCarouselLogos);
    if (settings.detailsBarSize !== undefined && onDetailsBarSizeChange) onDetailsBarSizeChange(settings.detailsBarSize);
    if (settings.carouselLogoSize !== undefined && onCarouselLogoSizeChange) onCarouselLogoSizeChange(settings.carouselLogoSize);
    if (settings.carouselButtonSize !== undefined && onCarouselButtonSizeChange) onCarouselButtonSizeChange(settings.carouselButtonSize);
    if (settings.carouselDescriptionSize !== undefined && onCarouselDescriptionSizeChange) onCarouselDescriptionSizeChange(settings.carouselDescriptionSize);
    if (settings.carouselDescriptionAlignment !== undefined && onCarouselDescriptionAlignmentChange) onCarouselDescriptionAlignmentChange(settings.carouselDescriptionAlignment);
    if (settings.carouselButtonAlignment !== undefined && onCarouselButtonAlignmentChange) onCarouselButtonAlignmentChange(settings.carouselButtonAlignment);
    if (settings.carouselLogoAlignment !== undefined && onCarouselLogoAlignmentChange) onCarouselLogoAlignmentChange(settings.carouselLogoAlignment);
    if (settings.listViewOptions !== undefined && onListViewOptionsChange) onListViewOptionsChange(settings.listViewOptions);
    if (settings.rightPanelBoxartPosition !== undefined && onRightPanelBoxartPositionChange) onRightPanelBoxartPositionChange(settings.rightPanelBoxartPosition);
    if (settings.rightPanelBoxartSize !== undefined && onRightPanelBoxartSizeChange) onRightPanelBoxartSizeChange(settings.rightPanelBoxartSize);
    if (settings.rightPanelTextSize !== undefined && onRightPanelTextSizeChange) onRightPanelTextSizeChange(settings.rightPanelTextSize);
    if (settings.rightPanelButtonSize !== undefined && onRightPanelButtonSizeChange) onRightPanelButtonSizeChange(settings.rightPanelButtonSize);
    if (settings.rightPanelButtonLocation !== undefined && onRightPanelButtonLocationChange) onRightPanelButtonLocationChange(settings.rightPanelButtonLocation);
    if (settings.detailsPanelOpacity !== undefined && onDetailsPanelOpacityChange) onDetailsPanelOpacityChange(settings.detailsPanelOpacity);
    if (settings.rightPanelLogoSize !== undefined && onRightPanelLogoSizeChange) onRightPanelLogoSizeChange(settings.rightPanelLogoSize);
  };

  const handleSaveCurrentView = async () => {
    const currentSettings = { [viewMode]: gatherCurrentSettings() };
    const result = await window.electronAPI.saveCustomDefaults?.(currentSettings);
    if (result?.success) {
      setHasCustomDefaults(true);
      showFeedback(setSaveFeedback, 'current');
    }
  };

  const handleSaveAllViews = async () => {
    // Don't re-gather from UI - just confirm all views have been saved individually
    // The export will use what's already been saved in the store
    const result = await window.electronAPI.saveCustomDefaults?.({});
    if (result?.success) {
      setHasCustomDefaults(true);
      showFeedback(setSaveFeedback, 'all');
    }
  };

  const handleRestoreCurrentView = async () => {
    const result = await window.electronAPI.restoreCustomDefaults?.({ viewMode, scope: 'current' });
    if (result?.success && result.defaults) {
      applySettings(result.defaults);
      showFeedback(setRestoreFeedback, 'current');
    }
  };

  const handleRestoreAllViews = async () => {
    const result = await window.electronAPI.restoreCustomDefaults?.({ viewMode, scope: 'all' });
    if (result?.success && result.defaults) {
      // Even though we loaded all views, only apply the current view's settings
      // This restores all to memory but only applies what's relevant now
      const currentViewSettings = result.defaults[viewMode];
      if (currentViewSettings) {
        applySettings(currentViewSettings);
      }
      showFeedback(setRestoreFeedback, 'all');
    }
  };

  const handleExportCurrentView = async () => {
    const overrideSettings = gatherCurrentSettings();

    await window.electronAPI.exportCustomDefaults?.({
      viewMode,
      scope: 'current',
      resolution: screenResolution,
      overrideSettings
    });
    // Successfully exported or cancelled - keep modal open
  };

  const handleExportAllViews = async () => {
    // Gather overrides for all views if an active game is selected
    const allOverrides: any = {};
    if (activeGame) {
      const modes: ('grid' | 'list' | 'logo' | 'carousel')[] = ['grid', 'list', 'logo', 'carousel'];
      modes.forEach(mode => {
        allOverrides[mode] = gatherSettingsForViewMode(mode);
      });
    }

    await window.electronAPI.exportCustomDefaults?.({
      viewMode,
      scope: 'all',
      resolution: screenResolution,
      overrideSettings: activeGame ? allOverrides : undefined
    });
    // Successfully exported or cancelled - keep modal open
  };

  const handleImportSettings = async () => {
    const result = await window.electronAPI.importCustomDefaults?.();
    if (result?.success && result.data) {
      setHasCustomDefaults(true);
      // Optionally apply the imported settings immediately
      if (result.data[viewMode]) {
        applySettings(result.data[viewMode]);
      }
    }
  };

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

  const handleShowCarouselDetailsToggle = () => {
    onShowCarouselDetailsChange?.(!showCarouselDetails);
  };

  const handleShowCarouselLogosToggle = () => {
    onShowCarouselLogosChange?.(!showCarouselLogos);
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

    saveTimeoutRef.current = setTimeout(() => {
      window.electronAPI.saveGame(updatedGame).catch((error) => {
        console.error('Failed to save game:', error);
      });
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
        minWidth: '620px'
      }}
    >
      {/* View Mode Toggle Buttons - Single Row */}
      <div className="px-3 py-3 grid grid-cols-4 gap-2">
        <button
          onClick={() => handleViewModeChange('grid')}
          className={`px-3 py-2 text-sm rounded transition-colors flex flex-col items-center gap-1 font-medium ${viewMode === 'grid'
            ? 'bg-blue-600/40 text-white border border-blue-500'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
            }`}
          title="Grid View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Grid
        </button>
        <button
          onClick={() => handleViewModeChange('list')}
          className={`px-3 py-2 text-sm rounded transition-colors flex flex-col items-center gap-1 font-medium ${viewMode === 'list'
            ? 'bg-blue-600/40 text-white border border-blue-500'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
            }`}
          title="List View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          List
        </button>
        <button
          onClick={() => handleViewModeChange('logo')}
          className={`px-3 py-2 text-sm rounded transition-colors flex flex-col items-center gap-1 font-medium ${viewMode === 'logo'
            ? 'bg-blue-600/40 text-white border border-blue-500'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
            }`}
          title="Logo View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Logo
        </button>
        <button
          onClick={() => handleViewModeChange('carousel')}
          className={`px-3 py-2 text-sm rounded transition-colors flex flex-col items-center gap-1 font-medium ${viewMode === 'carousel'
            ? 'bg-blue-600/40 text-white border border-blue-500'
            : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
            }`}
          title="Carousel View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
          Carousel
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
                      <label className="block text-xs text-gray-400 mb-1 font-semibold">Details Bar Size</label>
                      <input
                        type="range"
                        min="10"
                        max="24"
                        step="1"
                        value={detailsBarSize}
                        onChange={(e) => onDetailsBarSizeChange(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>10px</span>
                        <span className="font-medium text-gray-300">{detailsBarSize}px</span>
                        <span>24px</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Selected Box Art Size */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Selected Box Art Size</label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="0.5"
                    value={selectedBoxArtSize}
                    onChange={(e) => onSelectedBoxArtSizeChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>5vw</span>
                    <span className="font-medium text-gray-300">{selectedBoxArtSize}vw</span>
                    <span>30vw</span>
                  </div>
                </div>

                {/* Game Tile Padding - for Carousel */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Game Tile Padding</label>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    value={gameTilePadding}
                    onChange={(e) => onGameTilePaddingChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0px</span>
                    <span className="font-medium text-gray-300">{gameTilePadding}px</span>
                    <span>3px</span>
                  </div>
                </div>

                {/* Background Blur Amount - for Carousel */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Background Blur Amount</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={backgroundBlur}
                    onChange={(e) => onBackgroundBlurChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0px</span>
                    <span className="font-medium text-gray-300">{backgroundBlur}px</span>
                    <span>100px</span>
                  </div>
                </div>

                {/* Background Brightness - for Carousel */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Background Brightness</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(backgroundBrightness * 100)}
                    onChange={(e) => onBackgroundBrightnessChange?.(Number(e.target.value) / 100)}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span className="font-medium text-gray-300">{Math.round(backgroundBrightness * 100)}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-2">
                {/* Per-Game Logo Size Control for Carousel */}
                {activeGame && (
                  <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                    <label className="block text-xs text-gray-400 mb-2 font-semibold">Game Logo Size</label>
                    <input
                      type="range"
                      min="50"
                      max="600"
                      step="5"
                      value={localLogoSizes.carousel}
                      onChange={(e) => handlePerGameLogoSizeChange('carousel', Number(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>50px</span>
                      <span className="font-medium text-gray-300">{localLogoSizes.carousel}px</span>
                      <span>600px</span>
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
                      <label className="block text-xs text-gray-400 mb-1 font-semibold">Logo Size</label>
                      <input
                        type="range"
                        min="50"
                        max="600"
                        step="5"
                        value={carouselLogoSize}
                        onChange={(e) => onCarouselLogoSizeChange(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>50px</span>
                        <span className="font-medium text-gray-300">{carouselLogoSize}px</span>
                        <span>600px</span>
                      </div>
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
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Description Text Size</label>
                  <input
                    type="range"
                    min="12"
                    max="28"
                    step="1"
                    value={carouselDescriptionSize}
                    onChange={(e) => onCarouselDescriptionSizeChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>12px</span>
                    <span className="font-medium text-gray-300">{carouselDescriptionSize}px</span>
                    <span>28px</span>
                  </div>
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
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Button Size</label>
                  <input
                    type="range"
                    min="10"
                    max="24"
                    step="1"
                    value={carouselButtonSize}
                    onChange={(e) => onCarouselButtonSizeChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10px</span>
                    <span className="font-medium text-gray-300">{carouselButtonSize}px</span>
                    <span>24px</span>
                  </div>
                </div>

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

      {/* Shared layout settings for Grid, List, and Logo views */}
      {viewMode !== 'carousel' && (
        <>
          {/* 3-column layout for all views */}
          <div className="grid grid-cols-3 text-xs text-gray-400 px-3 pb-1 font-semibold">
            <span>Games View</span>
            <span className="text-center">Dividers</span>
            <span className="text-right">Game Details</span>
          </div>
          <div className="px-2 py-2">
            <div className="grid grid-cols-3 gap-3">
              {/* Left Column */}
              <div className="space-y-2">
                {/* Size control per view */}
                {((viewMode === 'grid' && onGridSizeChange) || (viewMode === 'logo' && onLogoSizeChange)) && (
                  <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                    <label className="block text-xs text-gray-400 mb-1 font-semibold">{getSizeLabel()}</label>
                    <input
                      type="range"
                      min={sizeRange.min}
                      max={sizeRange.max}
                      step="1"
                      value={sizeValue}
                      onChange={(e) => handleSizeChange(Number(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{sizeRange.min}px</span>
                      <span className="font-medium text-gray-300">{sizeValue}px</span>
                      <span>{sizeRange.max}px</span>
                    </div>
                  </div>
                )}

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
                          <label className="block text-xs text-gray-400 mb-1 font-semibold">Categories Size</label>
                          <input
                            type="range"
                            min="10"
                            max="24"
                            step="1"
                            value={categoriesTopSize}
                            onChange={(e) => onCategoriesTopSizeChange?.(Number(e.target.value))}
                            className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>10px</span>
                            <span className="font-medium text-gray-300">{categoriesTopSize}px</span>
                            <span>24px</span>
                          </div>
                        </div>
                      </div>
                    )}
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
                    <label className="block text-xs text-gray-400 mb-1 font-semibold">{paddingLabel}</label>
                    <input
                      type="range"
                      min={paddingRange.min}
                      max={paddingRange.max}
                      step="1"
                      value={gameTilePadding}
                      onChange={(e) => onGameTilePaddingChange?.(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>{paddingRange.min}px</span>
                      <span className="font-medium text-gray-300">{gameTilePadding}px</span>
                      <span>{paddingRange.max}px</span>
                    </div>
                  </div>
                )}

                {/* Logo tile background transparency (Logo view) */}
                {viewMode === 'logo' && (
                  <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                    <label className="block text-xs text-gray-400 mb-1 font-semibold">Logo Tile Background Transparency</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      step="1"
                      value={logoBackgroundOpacity}
                      onChange={(e) => onLogoBackgroundOpacityChange?.(Number(e.target.value))}
                      className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>0%</span>
                      <span className="font-medium text-gray-300">{logoBackgroundOpacity}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                )}

                {/* List view specific controls */}
                {viewMode === 'list' && listViewOptions && (
                  <div className="space-y-2">
                    {/* Tile Height control - always visible */}
                    <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                      <label className="block text-xs text-gray-400 mb-1 font-semibold">Tile Height</label>
                      <input
                        type="range"
                        min={10}
                        max={300}
                        step="1"
                        value={listViewOptions.tileHeight ?? 128}
                        onChange={(e) => onListViewOptionsChange?.({
                          ...listViewOptions,
                          tileHeight: Number(e.target.value),
                        })}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>10px</span>
                        <span className="font-medium text-gray-300">{listViewOptions.tileHeight ?? 128}px</span>
                        <span>300px</span>
                      </div>
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
                          <label className="block text-xs text-gray-400 mb-1 font-semibold">Boxart Size</label>
                          <input
                            type="range"
                            min={30}
                            max={200}
                            step="1"
                            value={listViewOptions.boxartSize ?? 96}
                            onChange={(e) => onListViewOptionsChange?.({
                              ...listViewOptions,
                              boxartSize: Number(e.target.value),
                            })}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>30px</span>
                            <span className="font-medium text-gray-300">{listViewOptions.boxartSize ?? 96}px</span>
                            <span>200px</span>
                          </div>
                        </div>
                      )}

                      {/* Logo Size - only for Logo + Title mode */}
                      {listViewOptions.displayMode === 'logo-title' && (
                        <div className="pt-2">
                          <label className="block text-xs text-gray-400 mb-1 font-semibold">Logo Size</label>
                          <input
                            type="range"
                            min={30}
                            max={200}
                            step="1"
                            value={listViewOptions.logoSize ?? 96}
                            onChange={(e) => onListViewOptionsChange?.({
                              ...listViewOptions,
                              logoSize: Number(e.target.value),
                            })}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>30px</span>
                            <span className="font-medium text-gray-300">{listViewOptions.logoSize ?? 96}px</span>
                            <span>200px</span>
                          </div>
                        </div>
                      )}

                      {/* Title Text Size - for all modes except Logo Only */}
                      {listViewOptions.displayMode !== 'logo-only' && (
                        <div>
                          <label className="block text-xs text-gray-400 mb-1 font-semibold">Title Text Size</label>
                          <input
                            type="range"
                            min={12}
                            max={32}
                            step="1"
                            value={listViewOptions.titleTextSize ?? 18}
                            onChange={(e) => onListViewOptionsChange?.({
                              ...listViewOptions,
                              titleTextSize: Number(e.target.value),
                            })}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                          />
                          <div className="flex justify-between text-xs text-gray-500 mt-1">
                            <span>12px</span>
                            <span className="font-medium text-gray-300">{listViewOptions.titleTextSize ?? 18}px</span>
                            <span>32px</span>
                          </div>
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
                        <label className="block text-xs text-gray-400 mb-1 font-semibold">Section Text Size</label>
                        <input
                          type="range"
                          min={10}
                          max={18}
                          step="1"
                          value={listViewOptions.sectionTextSize ?? 14}
                          onChange={(e) => onListViewOptionsChange?.({
                            ...listViewOptions,
                            sectionTextSize: Number(e.target.value),
                          })}
                          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>10px</span>
                          <span className="font-medium text-gray-300">{listViewOptions.sectionTextSize ?? 14}px</span>
                          <span>18px</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Background Blur Amount */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Background Blur Amount</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={backgroundBlur}
                    onChange={(e) => onBackgroundBlurChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0px</span>
                    <span className="font-medium text-gray-300">{backgroundBlur}px</span>
                    <span>100px</span>
                  </div>
                </div>

                {/* Background Brightness */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Background Brightness</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={Math.round(backgroundBrightness * 100)}
                    onChange={(e) => onBackgroundBrightnessChange?.(Number(e.target.value) / 100)}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span className="font-medium text-gray-300">{Math.round(backgroundBrightness * 100)}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Middle Column - Dividers (All non-carousel views) */}
              <div className="space-y-2">
                {/* Right Panel Width Control */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 font-semibold mb-2">Right Panel Width</label>
                  <input
                    type="range"
                    min="400"
                    max={Math.floor(window.innerWidth * 0.75)}
                    step="10"
                    value={panelWidth}
                    onChange={(e) => onPanelWidthChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>400px</span>
                    <span className="font-medium text-gray-300">{panelWidth}px</span>
                    <span>{Math.floor(window.innerWidth * 0.75)}px</span>
                  </div>
                </div>

                {/* Banner Height Control */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 font-semibold mb-2">Banner Height</label>
                  <input
                    type="range"
                    min="150"
                    max="500"
                    step="10"
                    value={fanartHeight}
                    onChange={(e) => onFanartHeightChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>150px</span>
                    <span className="font-medium text-gray-300">{fanartHeight}px</span>
                    <span>500px</span>
                  </div>
                </div>

                {/* Description Width Control */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 font-semibold mb-2">Description Width</label>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    step="1"
                    value={descriptionWidth}
                    onChange={(e) => onDescriptionWidthChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>20%</span>
                    <span className="font-medium text-gray-300">{descriptionWidth}%</span>
                    <span>80%</span>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-2">
                {/* Per-Game Logo Size Control - Top of Game Details, only for current view */}
                {activeGame && (
                  <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                    <label className="block text-xs text-gray-400 mb-2 font-semibold">Game Logo Size</label>

                    {/* Grid View */}
                    {viewMode === 'grid' && (
                      <div>
                        <input
                          type="range"
                          min="50"
                          max="600"
                          step="5"
                          value={localLogoSizes.grid}
                          onChange={(e) => handlePerGameLogoSizeChange('grid', Number(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>50px</span>
                          <span className="font-medium text-gray-300">{localLogoSizes.grid}px</span>
                          <span>600px</span>
                        </div>
                      </div>
                    )}

                    {/* List View */}
                    {viewMode === 'list' && (
                      <div>
                        <input
                          type="range"
                          min="50"
                          max="600"
                          step="5"
                          value={localLogoSizes.list}
                          onChange={(e) => handlePerGameLogoSizeChange('list', Number(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>50px</span>
                          <span className="font-medium text-gray-300">{localLogoSizes.list}px</span>
                          <span>600px</span>
                        </div>
                      </div>
                    )}

                    {/* Logo View */}
                    {viewMode === 'logo' && (
                      <div>
                        <input
                          type="range"
                          min="50"
                          max="600"
                          step="5"
                          value={localLogoSizes.logo}
                          onChange={(e) => handlePerGameLogoSizeChange('logo', Number(e.target.value))}
                          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>50px</span>
                          <span className="font-medium text-gray-300">{localLogoSizes.logo}px</span>
                          <span>600px</span>
                        </div>
                      </div>
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
                      <label className="block text-xs text-gray-400 mb-1 font-semibold">Resize Boxart</label>
                      <input
                        type="range"
                        min="80"
                        max="200"
                        step="5"
                        value={rightPanelBoxartSize}
                        onChange={(e) => onRightPanelBoxartSizeChange?.(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>80px</span>
                        <span className="font-medium text-gray-300">{rightPanelBoxartSize}px</span>
                        <span>200px</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Text Size */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Text Size</label>
                  <input
                    type="range"
                    min="10"
                    max="24"
                    step="1"
                    value={rightPanelTextSize}
                    onChange={(e) => onRightPanelTextSizeChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10px</span>
                    <span className="font-medium text-gray-300">{rightPanelTextSize}px</span>
                    <span>24px</span>
                  </div>
                </div>

                {/* Button Size */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Button Size</label>
                  <input
                    type="range"
                    min="10"
                    max="24"
                    step="1"
                    value={rightPanelButtonSize}
                    onChange={(e) => onRightPanelButtonSizeChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10px</span>
                    <span className="font-medium text-gray-300">{rightPanelButtonSize}px</span>
                    <span>24px</span>
                  </div>
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

                {/* Details View Transparency */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Details View Transparency</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={detailsPanelOpacity}
                    onChange={(e) => onDetailsPanelOpacityChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span className="font-medium text-gray-300">{detailsPanelOpacity}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Defaults Buttons - Bottom */}
      <div className="px-3 py-2 border-t border-gray-700 mt-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleResetToDefaults}
            className="px-4 py-2 text-sm rounded transition-colors bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600 font-medium"
            title="Reset view settings to defaults for your resolution"
          >
            <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset to Defaults
          </button>
          <button
            onClick={handleOpenCustomDefaultsModal}
            className="px-4 py-2 text-sm rounded transition-colors bg-blue-700 text-gray-300 hover:bg-blue-600 border border-blue-600 font-medium"
            title="Save or restore your custom defaults"
          >
            <svg className="w-4 h-4 inline-block mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Custom Defaults
          </button>
        </div>
      </div>

      {/* Custom Defaults Modal */}
      <CustomDefaultsModal
        isOpen={showCustomDefaultsModal}
        onClose={() => setShowCustomDefaultsModal(false)}
        viewMode={viewMode}
        resolution={screenResolution}
        hasCustomDefaults={hasCustomDefaults}
        onSaveCurrentView={handleSaveCurrentView}
        onSaveAllViews={handleSaveAllViews}
        onRestoreCurrentView={handleRestoreCurrentView}
        onRestoreAllViews={handleRestoreAllViews}
        onExportCurrentView={handleExportCurrentView}
        onExportAllViews={handleExportAllViews}
        onImportSettings={handleImportSettings}
        saveFeedback={saveFeedback}
        restoreFeedback={restoreFeedback}
      />

      {/* Reset Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showResetConfirmation}
        title="Reset to Defaults"
        message={`Reset view settings to defaults for ${resetResolution} resolution?`}
        note="This will reset all customization settings to their default values based on your screen resolution."
        primaryActionText={`Reset ${viewMode === 'grid' ? 'Grid' : viewMode === 'list' ? 'List' : viewMode === 'logo' ? 'Logo' : 'Carousel'} View`}
        secondaryActionText="Reset All Views"
        onPrimaryAction={handleResetCurrentView}
        onSecondaryAction={handleResetAllViews}
        onConfirm={handleResetCurrentView}
        onCancel={() => setShowResetConfirmation(false)}
        variant="default"
      />

    </div>
  );
};
