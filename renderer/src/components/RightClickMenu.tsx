import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { Game } from '../types/game';
import { InfoHintButton } from './MenuSliderRow';
import {
  DEFAULT_BUTTON_COLORS,
  RightClickMenuButtonColorsEditor,
} from './rightClickMenu/RightClickMenuButtonColorsEditor';
import { RightClickMenuButtonColorsPopup } from './rightClickMenu/RightClickMenuButtonColorsPopup';
import { RightClickMenuButtonColorsTrigger } from './rightClickMenu/RightClickMenuButtonColorsTrigger';
import { RightClickMenuCarouselSection } from './rightClickMenu/RightClickMenuCarouselSection';
import { RightClickMenuCoverFlowSection } from './rightClickMenu/RightClickMenuCoverFlowSection';
import { RightClickMenuDetailsSection } from './rightClickMenu/RightClickMenuDetailsSection';
import { RightClickMenuDividersSection } from './rightClickMenu/RightClickMenuDividersSection';
import { RightClickMenuGamesViewSection } from './rightClickMenu/RightClickMenuGamesViewSection';
import { RightClickMenuHeader, type RightClickMenuEditorSection } from './rightClickMenu/RightClickMenuHeader';
import { RightClickMenuModals } from './rightClickMenu/RightClickMenuModals';
import { RightClickMenuViewModeSwitch } from './rightClickMenu/RightClickMenuViewModeSwitch';

export interface RightClickMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  initialEditorSection?: RightClickMenuEditorSection | null;
  viewMode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card';
  onViewModeChange?: (mode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card') => void;
  activeGame?: Game;
  onActiveGameChange?: (game: Game) => void;
  gridSize?: number;
  onGridSizeChange?: (size: number) => void;
  cardColumns?: number;
  onCardColumnsChange?: (columns: number) => void;
  cardPostersOnly?: boolean;
  onCardPostersOnlyChange?: (enabled: boolean) => void;
  cardSmartFill?: boolean;
  onCardSmartFillChange?: (enabled: boolean) => void;
  logoSize?: number;
  onLogoSizeChange?: (size: number) => void;
  gridSmartFill?: boolean;
  onGridSmartFillChange?: (enabled: boolean) => void;
  gridMaximizeSpace?: boolean;
  onGridMaximizeSpaceChange?: (enabled: boolean) => void;
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
  initialEditorSection = null,
  viewMode,
  onViewModeChange,
  activeGame,
  onActiveGameChange,
  gridSize = 120,
  onGridSizeChange,
  cardColumns = 4,
  onCardColumnsChange,
  cardPostersOnly = false,
  onCardPostersOnlyChange,
  cardSmartFill = false,
  onCardSmartFillChange,
  logoSize = 100,
  onLogoSizeChange,
  gridSmartFill = false,
  onGridSmartFillChange,
  gridMaximizeSpace = false,
  onGridMaximizeSpaceChange,
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
  rightPanelLogoSize: _rightPanelLogoSize = 300,
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
  const buttonColorsPopupRef = useRef<HTMLDivElement>(null);
  const [activeEditorSection, setActiveEditorSection] = useState<RightClickMenuEditorSection | null>(initialEditorSection);
  const [menuTransparency, setMenuTransparency] = useState(12);
  const [buttonColorsPopup, setButtonColorsPopup] = React.useState<{
    editorKey: 'carousel' | 'details';
    title: string;
    colors?: { playColor?: string; editColor?: string; modManagerColor?: string };
    onChange?: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
    onReset?: () => void;
    anchorRect: DOMRect;
  } | null>(null);

  // State for Custom Defaults Modal
  const [showCustomDefaultsModal, setShowCustomDefaultsModal] = React.useState(false);
  const [screenResolution, setScreenResolution] = React.useState<'720p' | '1080p' | '1440p' | '4K'>('1080p');

  // Stable panel width state for dividers section to prevent moving/resizing on drag
  const [stablePanelWidth, setStablePanelWidth] = useState<number>(panelWidth);

  useEffect(() => {
    setStablePanelWidth(panelWidth);
  }, [activeEditorSection]);

  const effectivePanelWidth = activeEditorSection === 'dividers' ? stablePanelWidth : panelWidth;

  // State for Reset Confirmation Dialog
  const [showResetConfirmation, setShowResetConfirmation] = React.useState(false);
  const [resetResolution, setResetResolution] = React.useState('');
  const [baselineDefaults, setBaselineDefaults] = React.useState<any>(null);
  const isSectionedEditor = viewMode !== 'carousel' && viewMode !== 'coverflow';
  const isFocusedEditorSection = isSectionedEditor && activeEditorSection !== null;
  const menuOpacity = Math.max(0.18, 1 - (menuTransparency / 100));
  const menuBackground = `rgba(31, 41, 55, ${menuOpacity})`;
  const menuBackdropBlur = `${Math.max(8, Math.round((100 - menuTransparency) * 0.22))}px`;
  const menuTransparencyPercent = Math.max(0, Math.min(100, (menuTransparency / 75) * 100));
  const focusedAreaHorizontalPadding = 44;
  const focusedAreaVerticalPadding = 42;
  const focusedPanelTop = 56;
  const focusedPanelBottom = 18;
  const focusedSectionTarget = activeEditorSection === 'games-view' ? 'details-panel' : 'games-panel';
  const dividerGuardInset = activeEditorSection === 'dividers' ? 18 : 0;
  const defaultMenuWidth = viewMode === 'list' ? 1240 : 980;
  const focusedAreaWidth = focusedSectionTarget === 'details-panel'
      ? effectivePanelWidth
      : Math.max(320, window.innerWidth - effectivePanelWidth);
  const dividerIsOnStartEdge = activeEditorSection === 'dividers'
    ? true
    : focusedSectionTarget === 'details-panel'
      ? isViewFlipped
      : !isViewFlipped;
  const panelInsetStart = focusedAreaHorizontalPadding + (isFocusedEditorSection && dividerIsOnStartEdge ? dividerGuardInset : 0);
  const panelInsetEnd = focusedAreaHorizontalPadding + (isFocusedEditorSection && !dividerIsOnStartEdge ? dividerGuardInset : 0);
  const focusedAreaHeight = Math.max(420, window.innerHeight - focusedPanelTop - focusedPanelBottom);
  const focusedPanelWidth = Math.max(
    420,
    Math.min(
      activeEditorSection === 'dividers' ? 760 : 880,
      focusedAreaWidth - panelInsetStart - panelInsetEnd,
    ),
  );
  const focusedPanelHeightPx = Math.max(420, focusedAreaHeight - (focusedAreaVerticalPadding * 2));
  const focusedPanelHeight = `${focusedPanelHeightPx}px`;
  const menuMinWidth = !isSectionedEditor
    ? defaultMenuWidth
    : !isFocusedEditorSection
      ? defaultMenuWidth
      : focusedPanelWidth;
  const focusedGamesViewLayoutClass = viewMode === 'list'
    ? 'columns-2 gap-2 [&>*]:mb-2 [&>*]:break-inside-avoid [&>*]:w-full'
    : 'columns-2 gap-2 [&>*]:mb-2 [&>*]:break-inside-avoid [&>*]:w-full';
  const focusedSectionLayoutClass = 'columns-2 gap-2 [&>*]:mb-2 [&>*]:break-inside-avoid [&>*]:w-full';
  const settingDescriptionDisplay = isFocusedEditorSection ? 'inline' : 'icon';

  const renderSettingHintIcon = (description: string) => (
    <InfoHintButton description={description} />
  );

  const renderSettingDescription = (description: string) => (
    settingDescriptionDisplay === 'inline'
      ? <p className="mb-2 text-[11px] leading-4 text-gray-300/90">{description}</p>
      : null
  );

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
  const defaultLocalGridLogoSize = screenResolution === '1080p' ? 250 : 100;
  const [localLogoSizes, setLocalLogoSizes] = React.useState({
    grid: activeGame?.logoSizePerViewMode?.grid ?? defaultLocalGridLogoSize,
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
        grid: activeGame.logoSizePerViewMode?.grid ?? defaultLocalGridLogoSize,
        list: activeGame.logoSizePerViewMode?.list ?? 100,
        logo: activeGame.logoSizePerViewMode?.logo ?? 100,
        carousel: activeGame.logoSizePerViewMode?.carousel ?? 100,
      });
    }
    // Clear any pending saves when game changes
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  }, [activeGame, defaultLocalGridLogoSize]); // Keep local state aligned with the currently active game

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedInsideMenu = menuRef.current?.contains(target) ?? false;
      const clickedInsidePopup = buttonColorsPopupRef.current?.contains(target) ?? false;

      if (buttonColorsPopup && !clickedInsidePopup) {
        setButtonColorsPopup(null);
      }

      if (!clickedInsideMenu && !clickedInsidePopup) {
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
  }, [buttonColorsPopup, onClose]);

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const margin = 10;

      let left = x > viewportWidth / 2 ? x - rect.width : x;
      let top = y;

      if (isFocusedEditorSection) {
        const detailsPanelLeft = isViewFlipped ? 0 : viewportWidth - effectivePanelWidth;
        const gamesPanelLeft = isViewFlipped ? effectivePanelWidth : 0;
        const areaBaseLeft = focusedSectionTarget === 'details-panel' ? detailsPanelLeft : gamesPanelLeft;
        const availableAreaWidth = Math.max(0, focusedAreaWidth - panelInsetStart - panelInsetEnd);
        const centeredLeftOffset = panelInsetStart + Math.max(0, (availableAreaWidth - focusedPanelWidth) / 2);
        left = areaBaseLeft + centeredLeftOffset;
        top = focusedPanelTop + Math.max(0, (focusedAreaHeight - focusedPanelHeightPx) / 2);
      }

      // Clamp to viewport so the menu remains fully visible.
      left = Math.max(margin, Math.min(left, viewportWidth - rect.width - margin));
      top = Math.max(margin, Math.min(top, viewportHeight - rect.height - focusedPanelBottom));

      menuRef.current.style.left = `${left}px`;
      menuRef.current.style.top = `${top}px`;
    }
  }, [x, y, viewMode, isFocusedEditorSection, activeEditorSection, effectivePanelWidth, isViewFlipped, panelInsetStart, panelInsetEnd, focusedSectionTarget, focusedAreaWidth, focusedAreaHeight, focusedPanelWidth, focusedPanelHeightPx]);

  React.useEffect(() => {
    const handleViewportChange = () => {
      setButtonColorsPopup(null);
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, []);

  useEffect(() => {
    setActiveEditorSection(viewMode === 'carousel' || viewMode === 'coverflow' ? null : initialEditorSection);
  }, [initialEditorSection, viewMode, x, y]);

  const handleViewModeChange = (mode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
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

  const applyDefaultsForView = (mode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card', resKey: string) => {
    if (!baselineDefaults || !baselineDefaults[resKey]) return;

    const defaults = baselineDefaults[resKey][mode];
    if (!defaults) return;

    // Apply view-specific settings
    if (mode === 'grid') {
      if (defaults.gridSmartFill !== undefined) onGridSmartFillChange?.(defaults.gridSmartFill);
      if (defaults.gridMaximizeSpace !== undefined) onGridMaximizeSpaceChange?.(defaults.gridMaximizeSpace);
      if (defaults.gridSize !== undefined) onGridSizeChange?.(defaults.gridSize);
      if (defaults.gameTilePadding !== undefined) onGameTilePaddingChange?.(defaults.gameTilePadding);
      if (defaults.panelWidth !== undefined) onPanelWidthChange?.(defaults.panelWidth);
      if (defaults.fanartHeight !== undefined) onFanartHeightChange?.(defaults.fanartHeight);
      if (defaults.descriptionWidth !== undefined) onDescriptionWidthChange?.(defaults.descriptionWidth);
      if (defaults.detailsPanelBottomBarHeight !== undefined) onDetailsPanelBottomBarHeightChange?.(defaults.detailsPanelBottomBarHeight);
      if (defaults.backgroundBlur !== undefined) onBackgroundBlurChange?.(defaults.backgroundBlur);
      if (defaults.backgroundBrightness !== undefined) onBackgroundBrightnessChange?.(defaults.backgroundBrightness);
      if (defaults.showCategories !== undefined) onShowCategoriesInGameListChange?.(defaults.showCategories);
      if (defaults.showLogoOverBoxart !== undefined) onShowLogoOverBoxartChange?.(defaults.showLogoOverBoxart);
    } else if (mode === 'logo') {
      if (defaults.gridSmartFill !== undefined) onGridSmartFillChange?.(defaults.gridSmartFill);
      if (defaults.gridMaximizeSpace !== undefined) onGridMaximizeSpaceChange?.(defaults.gridMaximizeSpace);
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
    } else if (mode === 'card') {
      if (defaults.cardColumns !== undefined) onCardColumnsChange?.(defaults.cardColumns);
      if (defaults.cardPostersOnly !== undefined) onCardPostersOnlyChange?.(defaults.cardPostersOnly);
      if (defaults.cardSmartFill !== undefined) onCardSmartFillChange?.(defaults.cardSmartFill);
      if (defaults.gameTilePadding !== undefined) onGameTilePaddingChange?.(defaults.gameTilePadding);
      if (defaults.backgroundBlur !== undefined) onBackgroundBlurChange?.(defaults.backgroundBlur);
      if (defaults.backgroundBrightness !== undefined) onBackgroundBrightnessChange?.(defaults.backgroundBrightness);
    }

    // Apply right panel defaults (shared by all view modes in the JSON)
    if (defaults.rightPanelLogoSize !== undefined) onRightPanelLogoSizeChange?.(defaults.rightPanelLogoSize);
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
    const modes: ('grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card')[] = ['grid', 'list', 'logo', 'carousel', 'coverflow', 'card'];
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

    const { logoSizePerViewMode: _logoSizePerViewMode, ...restOfGame } = activeGame;
    const updatedGame = restOfGame as Game;
    setLocalLogoSizes({ grid: defaultLocalGridLogoSize, list: 100, logo: 100, carousel: 100 });
    onActiveGameChange(updatedGame);

    try {
      await window.electronAPI.saveGame(updatedGame);
      const prefs = await window.electronAPI.getPreferences();
      const currentMap = { ...(prefs.perGameViewSizeOverrides || {}) };
      delete currentMap[activeGame.id];
      const perViewCustom = { ...(prefs.perGameViewCustomByView || {}) } as any;
      ['grid', 'list', 'logo', 'carousel', 'coverflow', 'card'].forEach((mode) => {
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

  const use1080pGridDefaults = screenResolution === '1080p' && viewMode === 'grid';
  const useCardPosterDefaults = viewMode === 'card';
  const sliderDefaults = {
    gridSize: use1080pGridDefaults ? 145 : 120,
    cardColumns: 4,
    logoSize: 100,
    listSize: 128,
    detailsBarSize: 14,
    selectedBoxArtSize: 25,
    gameTilePadding: use1080pGridDefaults ? 10 : 3,
    backgroundBlur: use1080pGridDefaults || useCardPosterDefaults ? 0 : 40,
    backgroundBrightnessPercent: useCardPosterDefaults ? 100 : 30,
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
    panelWidth: use1080pGridDefaults ? 967 : 800,
    fanartHeight: 320,
    descriptionWidth: use1080pGridDefaults ? 74 : 50,
    detailsPanelBottomBarHeight: 72,
    perGameLogoSize: use1080pGridDefaults ? 250 : 300,
    rightPanelBoxartSize: 120,
    rightPanelTextSize: 14,
    rightPanelButtonSize: 14,
    detailsPanelOpacity: use1080pGridDefaults ? 15 : 80,
    coverFlowCoverSize: 300,
    coverFlowReflection: 60,
    coverFlowVerticalOffset: 0,
    coverFlowSideOpacity: 100,
  };
  const detailsPanelTransparency = Math.max(0, Math.min(100, 100 - detailsPanelOpacity));
  const defaultDetailsPanelTransparency = Math.max(0, Math.min(100, 100 - sliderDefaults.detailsPanelOpacity));
  const detailsLogoSliderMax = 600;
  const detailsLogoSliderDefault = sliderDefaults.perGameLogoSize;

  const defaultButtonColors = DEFAULT_BUTTON_COLORS;

  const handleButtonColorsPopupToggle = useCallback(
    (editorKey: 'carousel' | 'details', anchorRect: DOMRect, title: string, colors: { playColor?: string; editColor?: string; modManagerColor?: string } | undefined, onChange: ((colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void) | undefined, onReset: (() => void) | undefined) => {
      setButtonColorsPopup((current) =>
        current?.editorKey === editorKey
          ? null
          : { editorKey, title, colors, onChange, onReset, anchorRect },
      );
    },
    [],
  );

  const renderButtonColorsTrigger = useCallback(
    ({
      editorKey,
      title,
      description,
      colors,
      onChange,
      onReset,
    }: {
      editorKey: 'carousel' | 'details';
      title: string;
      description?: string;
      colors?: { playColor?: string; editColor?: string; modManagerColor?: string };
      onChange?: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
      onReset?: () => void;
    }) => (
      <RightClickMenuButtonColorsTrigger
        editorKey={editorKey}
        title={title}
        description={description}
        colors={colors}
        isOpen={buttonColorsPopup?.editorKey === editorKey}
        onClick={(anchorRect) => handleButtonColorsPopupToggle(editorKey, anchorRect, title, colors, onChange, onReset)}
        settingDescriptionDisplay={settingDescriptionDisplay}
        renderSettingHintIcon={renderSettingHintIcon}
        defaultColors={defaultButtonColors}
      />
    ),
    [buttonColorsPopup?.editorKey, handleButtonColorsPopupToggle, settingDescriptionDisplay],
  );

  const renderButtonColorsEditor = useCallback(
    ({
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
    }) => (
      <RightClickMenuButtonColorsEditor
        title={title}
        colors={colors}
        onChange={onChange}
        onReset={onReset}
        containerClassName={containerClassName}
        defaultColors={defaultButtonColors}
      />
    ),
    [],
  );

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
      className="fixed flex flex-col border border-gray-600/80 rounded-lg shadow-xl z-50 py-1"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${menuMinWidth}px`,
        minWidth: `${menuMinWidth}px`,
        maxWidth: `${menuMinWidth}px`,
        height: isFocusedEditorSection ? focusedPanelHeight : undefined,
        maxHeight: isFocusedEditorSection ? focusedPanelHeight : 'calc(100vh - 20px)',
        backgroundColor: menuBackground,
        backdropFilter: `blur(${menuBackdropBlur})`,
        WebkitBackdropFilter: `blur(${menuBackdropBlur})`,
        overflowX: 'hidden',
        overflowY: 'hidden',
      }}
    >
      <RightClickMenuHeader
        activeEditorSection={activeEditorSection}
        isFocusedEditorSection={isFocusedEditorSection}
        isSectionedEditor={isSectionedEditor}
        isViewFlipped={isViewFlipped}
        menuBackground={menuBackground}
        menuBackdropBlur={menuBackdropBlur}
        menuTransparency={menuTransparency}
        menuTransparencyPercent={menuTransparencyPercent}
        viewMode={viewMode}
        onClose={onClose}
        onOpenCustomDefaults={handleOpenCustomDefaultsModal}
        onResetToDefaults={handleResetToDefaults}
        onSetActiveEditorSection={setActiveEditorSection}
        onSetMenuTransparency={setMenuTransparency}
        onViewFlipChange={onViewFlipChange}
      />

      <RightClickMenuViewModeSwitch
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {viewMode === 'carousel' && (
        <RightClickMenuCarouselSection
          activeGame={activeGame}
          backgroundBlur={backgroundBlur}
          backgroundBrightness={backgroundBrightness}
          carouselButtonAlignment={carouselButtonAlignment}
          carouselButtonColors={carouselButtonColors}
          carouselButtonSize={carouselButtonSize}
          carouselDescriptionAlignment={carouselDescriptionAlignment}
          carouselDescriptionSize={carouselDescriptionSize}
          carouselLogoAlignment={carouselLogoAlignment}
          carouselLogoSize={carouselLogoSize}
          defaultButtonColors={defaultButtonColors}
          detailsBarSize={detailsBarSize}
          gameTilePadding={gameTilePadding}
          localCarouselLogoSize={localLogoSizes.carousel}
          selectedBoxArtSize={selectedBoxArtSize}
          showCarouselDetails={showCarouselDetails}
          showCarouselLogos={showCarouselLogos}
          sliderDefaults={sliderDefaults}
          onBackgroundBlurChange={onBackgroundBlurChange}
          onBackgroundBrightnessChange={onBackgroundBrightnessChange}
          onCarouselButtonAlignmentChange={onCarouselButtonAlignmentChange}
          onCarouselButtonColorsChange={onCarouselButtonColorsChange}
          onCarouselButtonSizeChange={onCarouselButtonSizeChange}
          onCarouselDescriptionAlignmentChange={onCarouselDescriptionAlignmentChange}
          onCarouselDescriptionSizeChange={onCarouselDescriptionSizeChange}
          onCarouselLogoAlignmentChange={onCarouselLogoAlignmentChange}
          onCarouselLogoSizeChange={onCarouselLogoSizeChange}
          onDetailsBarSizeChange={onDetailsBarSizeChange}
          onGameTilePaddingChange={onGameTilePaddingChange}
          onSelectedBoxArtSizeChange={onSelectedBoxArtSizeChange}
          handleAlternativeBackgroundToggle={handleAlternativeBackgroundToggle}
          handlePerGameLogoSizeChange={handlePerGameLogoSizeChange}
          handleShowCarouselDetailsToggle={handleShowCarouselDetailsToggle}
          handleShowCarouselLogosToggle={handleShowCarouselLogosToggle}
          renderButtonColorsTrigger={renderButtonColorsTrigger}
        />
      )}

      {viewMode === 'coverflow' && (
        <RightClickMenuCoverFlowSection
          activeGame={activeGame}
          backgroundBlur={backgroundBlur}
          backgroundBrightness={backgroundBrightness}
          coverFlowButtonColors={coverFlowButtonColors}
          coverFlowButtonPosition={coverFlowButtonPosition}
          coverFlowCoverSize={coverFlowCoverSize}
          coverFlowReflection={coverFlowReflection}
          coverFlowShowButtons={coverFlowShowButtons}
          coverFlowSideOpacity={coverFlowSideOpacity}
          coverFlowVerticalOffset={coverFlowVerticalOffset}
          defaultButtonColors={defaultButtonColors}
          sliderDefaults={sliderDefaults}
          onBackgroundBlurChange={onBackgroundBlurChange}
          onBackgroundBrightnessChange={onBackgroundBrightnessChange}
          onCoverFlowButtonColorsChange={onCoverFlowButtonColorsChange}
          onCoverFlowButtonPositionChange={onCoverFlowButtonPositionChange}
          onCoverFlowCoverSizeChange={onCoverFlowCoverSizeChange}
          onCoverFlowReflectionChange={onCoverFlowReflectionChange}
          onCoverFlowShowButtonsChange={onCoverFlowShowButtonsChange}
          onCoverFlowSideOpacityChange={onCoverFlowSideOpacityChange}
          onCoverFlowVerticalOffsetChange={onCoverFlowVerticalOffsetChange}
          handleAlternativeBackgroundToggle={handleAlternativeBackgroundToggle}
          renderButtonColorsEditor={renderButtonColorsEditor}
        />
      )}

      {/* Shared layout settings for Grid, List, and Logo views (exclude Cover Flow) */}
      {viewMode !== 'carousel' && viewMode !== 'coverflow' && (
        <>
          <div className={`px-2 py-2 ${isFocusedEditorSection ? 'flex-1 overflow-y-auto min-h-0' : ''}`}>
            <div className={`grid gap-3 ${!isFocusedEditorSection ? (viewMode === 'list' ? 'grid-cols-4' : 'grid-cols-3') : 'grid-cols-1'}`}>
              <RightClickMenuGamesViewSection
                activeEditorSection={activeEditorSection}
                activeGame={activeGame}
                backgroundBlur={backgroundBlur}
                backgroundBrightness={backgroundBrightness}
                gridSmartFill={gridSmartFill}
                gridMaximizeSpace={gridMaximizeSpace}
                cardColumns={cardColumns}
                cardPostersOnly={cardPostersOnly}
                cardSmartFill={cardSmartFill}
                categoriesPosition={categoriesPosition}
                categoriesTopAlignment={categoriesTopAlignment}
                categoriesTopSize={categoriesTopSize}
                focusedGamesViewLayoutClass={focusedGamesViewLayoutClass}
                gameTilePadding={gameTilePadding}
                gridSize={gridSize}
                isFocusedEditorSection={isFocusedEditorSection}
                listSize={listSize}
                listViewOptions={listViewOptions}
                logoBackgroundOpacity={logoBackgroundOpacity}
                logoPosition={logoPosition}
                logoSize={logoSize}
                settingDescriptionDisplay={settingDescriptionDisplay}
                showCategoriesInGameList={showCategoriesInGameList}
                showLogoOverBoxart={showLogoOverBoxart}
                sliderDefaults={sliderDefaults}
                viewMode={viewMode}
                onGridSmartFillChange={onGridSmartFillChange}
                onGridMaximizeSpaceChange={onGridMaximizeSpaceChange}
                onBackgroundBlurChange={onBackgroundBlurChange}
                onBackgroundBrightnessChange={onBackgroundBrightnessChange}
                onCategoriesPositionChange={onCategoriesPositionChange}
                onCategoriesTopAlignmentChange={onCategoriesTopAlignmentChange}
                onCategoriesTopSizeChange={onCategoriesTopSizeChange}
                onGameTilePaddingChange={onGameTilePaddingChange}
                onGridSizeChange={onGridSizeChange}
                onCardColumnsChange={onCardColumnsChange}
                onCardPostersOnlyChange={onCardPostersOnlyChange}
                onCardSmartFillChange={onCardSmartFillChange}
                onListViewOptionsChange={onListViewOptionsChange}
                onLogoBackgroundOpacityChange={onLogoBackgroundOpacityChange}
                onLogoPositionChange={onLogoPositionChange}
                onLogoSizeChange={onLogoSizeChange}
                onShowCategoriesInGameListChange={onShowCategoriesInGameListChange}
                onShowLogoOverBoxartChange={onShowLogoOverBoxartChange}
                renderSettingDescription={renderSettingDescription}
                renderSettingHintIcon={renderSettingHintIcon}
                handleAlternativeBackgroundToggle={handleAlternativeBackgroundToggle}
                handleSizeChange={handleSizeChange}
              />
              <RightClickMenuDividersSection
                activeEditorSection={activeEditorSection}
                detailsPanelBottomBarHeight={detailsPanelBottomBarHeight}
                descriptionWidth={descriptionWidth}
                fanartHeight={fanartHeight}
                focusedSectionLayoutClass={focusedSectionLayoutClass}
                isFocusedEditorSection={isFocusedEditorSection}
                panelWidth={panelWidth}
                settingDescriptionDisplay={settingDescriptionDisplay}
                sliderDefaults={sliderDefaults}
                onDetailsPanelBottomBarHeightChange={onDetailsPanelBottomBarHeightChange}
                onDescriptionWidthChange={onDescriptionWidthChange}
                onFanartHeightChange={onFanartHeightChange}
                onPanelWidthChange={onPanelWidthChange}
              />
              <RightClickMenuDetailsSection
                activeEditorSection={activeEditorSection}
                activeGame={activeGame}
                defaultButtonColors={defaultButtonColors}
                defaultDetailsPanelTransparency={defaultDetailsPanelTransparency}
                detailsLogoSliderDefault={detailsLogoSliderDefault}
                detailsLogoSliderMax={detailsLogoSliderMax}
                detailsPanelTransparency={detailsPanelTransparency}
                focusedSectionLayoutClass={focusedSectionLayoutClass}
                gridButtonColors={gridButtonColors}
                isFocusedEditorSection={isFocusedEditorSection}
                listButtonColors={listButtonColors}
                localLogoSizes={localLogoSizes}
                logoButtonColors={logoButtonColors}
                rightPanelBoxartPosition={rightPanelBoxartPosition}
                rightPanelBoxartSize={rightPanelBoxartSize}
                rightPanelButtonColors={rightPanelButtonColors}
                rightPanelButtonLocation={rightPanelButtonLocation}
                rightPanelButtonSize={rightPanelButtonSize}
                rightPanelTextSize={rightPanelTextSize}
                settingDescriptionDisplay={settingDescriptionDisplay}
                sliderDefaults={sliderDefaults}
                viewMode={viewMode}
                onDetailsPanelOpacityChange={onDetailsPanelOpacityChange}
                onGridButtonColorsChange={onGridButtonColorsChange}
                onListButtonColorsChange={onListButtonColorsChange}
                onLogoButtonColorsChange={onLogoButtonColorsChange}
                onRightPanelBoxartPositionChange={onRightPanelBoxartPositionChange}
                onRightPanelBoxartSizeChange={onRightPanelBoxartSizeChange}
                onRightPanelButtonColorsChange={onRightPanelButtonColorsChange}
                onRightPanelButtonLocationChange={onRightPanelButtonLocationChange}
                onRightPanelButtonSizeChange={onRightPanelButtonSizeChange}
                onRightPanelTextSizeChange={onRightPanelTextSizeChange}
                renderButtonColorsTrigger={renderButtonColorsTrigger}
                renderSettingDescription={renderSettingDescription}
                renderSettingHintIcon={renderSettingHintIcon}
                handlePerGameLogoSizeChange={handlePerGameLogoSizeChange}
              />
            </div>
          </div>
        </>
      )}

      <RightClickMenuModals
        viewMode={viewMode}
        screenResolution={screenResolution}
        activeGameId={activeGame?.id}
        activeGameTitle={activeGame?.title}
        showCustomDefaultsModal={showCustomDefaultsModal}
        showResetConfirmation={showResetConfirmation}
        showClearPerGameConfirm={showClearPerGameConfirm}
        resetResolution={resetResolution}
        onCloseCustomDefaults={() => setShowCustomDefaultsModal(false)}
        onCloseResetConfirmation={() => setShowResetConfirmation(false)}
        onResetCurrentView={handleResetCurrentView}
        onResetAllViews={handleResetAllViews}
        onClearPerGameOverrides={handleClearPerGameOverrides}
        onSkipClearPerGameOverrides={handleSkipClearPerGameOverrides}
        onSettingsImported={onSettingsImported}
      />

      <RightClickMenuButtonColorsPopup
        ref={buttonColorsPopupRef}
        popup={buttonColorsPopup}
        onResetWithClose={(editorKey) => () =>
          setButtonColorsPopup((current) => (current?.editorKey === editorKey ? null : current))
        }
        defaultButtonColors={defaultButtonColors}
      />

    </div>
  );
};
