import React, { useEffect, useRef } from 'react';
import type { Game } from '../../types/game';
import { CustomDefaultsManager } from '../CustomDefaultsManager';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { RightClickMenuProps } from './types';
import { TopActionRow } from './TopActionRow';
import { ViewModeSelector } from './ViewModeSelector';
import { CarouselSettings } from './CarouselSettings';
import { CoverFlowSettings } from './CoverFlowSettings';
import { StandardSettings } from './StandardSettings';

export const RightClickMenu: React.FC<RightClickMenuProps> = (props) => {
  const {
    x,
    y,
    onClose,
    viewMode,
    onViewModeChange,
    activeGame,
    onActiveGameChange,
    isViewFlipped = false,
    onViewFlipChange,
    onSettingsImported,
  } = props;

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
      if (defaults.gridSize !== undefined) props.onGridSizeChange?.(defaults.gridSize);
      if (defaults.gameTilePadding !== undefined) props.onGameTilePaddingChange?.(defaults.gameTilePadding);
      if (defaults.panelWidth !== undefined) props.onPanelWidthChange?.(defaults.panelWidth);
      if (defaults.fanartHeight !== undefined) props.onFanartHeightChange?.(defaults.fanartHeight);
      if (defaults.descriptionWidth !== undefined) props.onDescriptionWidthChange?.(defaults.descriptionWidth);
      if (defaults.backgroundBlur !== undefined) props.onBackgroundBlurChange?.(defaults.backgroundBlur);
      if (defaults.backgroundBrightness !== undefined) props.onBackgroundBrightnessChange?.(defaults.backgroundBrightness);
      if (defaults.showLogoOverBoxart !== undefined) props.onShowLogoOverBoxartChange?.(defaults.showLogoOverBoxart);
    } else if (mode === 'logo') {
      if (defaults.logoSize !== undefined) props.onLogoSizeChange?.(defaults.logoSize);
      if (defaults.gameTilePadding !== undefined) props.onGameTilePaddingChange?.(defaults.gameTilePadding);
      if (defaults.logoBackgroundOpacity !== undefined) props.onLogoBackgroundOpacityChange?.(defaults.logoBackgroundOpacity);
      if (defaults.backgroundBlur !== undefined) props.onBackgroundBlurChange?.(defaults.backgroundBlur);
      if (defaults.backgroundBrightness !== undefined) props.onBackgroundBrightnessChange?.(defaults.backgroundBrightness);
      if (defaults.panelWidth !== undefined) props.onPanelWidthChange?.(defaults.panelWidth);
      if (defaults.fanartHeight !== undefined) props.onFanartHeightChange?.(defaults.fanartHeight);
      if (defaults.descriptionWidth !== undefined) props.onDescriptionWidthChange?.(defaults.descriptionWidth);
      if (defaults.rightPanelLogoSize !== undefined) props.onRightPanelLogoSizeChange?.(defaults.rightPanelLogoSize);
    } else if (mode === 'list') {
      if (defaults.backgroundBlur !== undefined) props.onBackgroundBlurChange?.(defaults.backgroundBlur);
      if (defaults.backgroundBrightness !== undefined) props.onBackgroundBrightnessChange?.(defaults.backgroundBrightness);
      if (defaults.panelWidth !== undefined) props.onPanelWidthChange?.(defaults.panelWidth);
      if (defaults.fanartHeight !== undefined) props.onFanartHeightChange?.(defaults.fanartHeight);
      if (defaults.descriptionWidth !== undefined) props.onDescriptionWidthChange?.(defaults.descriptionWidth);
      if (defaults.listViewOptions !== undefined) props.onListViewOptionsChange?.(defaults.listViewOptions);
      if (defaults.rightPanelLogoSize !== undefined) props.onRightPanelLogoSizeChange?.(defaults.rightPanelLogoSize);
    } else if (mode === 'carousel') {
      if (defaults.showCarouselDetails !== undefined) props.onShowCarouselDetailsChange?.(defaults.showCarouselDetails);
      if (defaults.showCarouselLogos !== undefined) props.onShowCarouselLogosChange?.(defaults.showCarouselLogos);
      if (defaults.detailsBarSize !== undefined) props.onDetailsBarSizeChange?.(defaults.detailsBarSize);
      if (defaults.selectedBoxArtSize !== undefined) props.onSelectedBoxArtSizeChange?.(defaults.selectedBoxArtSize);
      if (defaults.gameTilePadding !== undefined) props.onGameTilePaddingChange?.(defaults.gameTilePadding);
      if (defaults.backgroundBlur !== undefined) props.onBackgroundBlurChange?.(defaults.backgroundBlur);
      if (defaults.backgroundBrightness !== undefined) props.onBackgroundBrightnessChange?.(defaults.backgroundBrightness);
      if (defaults.carouselLogoSize !== undefined) props.onCarouselLogoSizeChange?.(defaults.carouselLogoSize);
      if (defaults.carouselButtonSize !== undefined) props.onCarouselButtonSizeChange?.(defaults.carouselButtonSize);
      if (defaults.carouselDescriptionSize !== undefined) props.onCarouselDescriptionSizeChange?.(defaults.carouselDescriptionSize);
      if (defaults.carouselDescriptionAlignment !== undefined) props.onCarouselDescriptionAlignmentChange?.(defaults.carouselDescriptionAlignment);
      if (defaults.carouselButtonAlignment !== undefined) props.onCarouselButtonAlignmentChange?.(defaults.carouselButtonAlignment);
    } else if (mode === 'coverflow') {
      if (defaults.coverFlowCoverSize !== undefined) props.onCoverFlowCoverSizeChange?.(defaults.coverFlowCoverSize);
      if (defaults.coverFlowReflection !== undefined) props.onCoverFlowReflectionChange?.(defaults.coverFlowReflection);
      if (defaults.coverFlowVerticalOffset !== undefined) props.onCoverFlowVerticalOffsetChange?.(defaults.coverFlowVerticalOffset);
      if (defaults.coverFlowSideOpacity !== undefined) props.onCoverFlowSideOpacityChange?.(defaults.coverFlowSideOpacity);
      if (defaults.coverFlowShowButtons !== undefined) props.onCoverFlowShowButtonsChange?.(defaults.coverFlowShowButtons);
      if (defaults.backgroundBrightness !== undefined) props.onBackgroundBrightnessChange?.(defaults.backgroundBrightness);
    }

    // Apply right panel defaults (shared by all view modes in the JSON)
    if (defaults.rightPanelBoxartPosition !== undefined) props.onRightPanelBoxartPositionChange?.(defaults.rightPanelBoxartPosition);
    if (defaults.rightPanelBoxartSize !== undefined) props.onRightPanelBoxartSizeChange?.(defaults.rightPanelBoxartSize);
    if (defaults.rightPanelTextSize !== undefined) props.onRightPanelTextSizeChange?.(defaults.rightPanelTextSize);
    if (defaults.rightPanelButtonSize !== undefined) props.onRightPanelButtonSizeChange?.(defaults.rightPanelButtonSize);
    if (defaults.rightPanelButtonLocation !== undefined) props.onRightPanelButtonLocationChange?.(defaults.rightPanelButtonLocation);
    if (defaults.detailsPanelOpacity !== undefined) props.onDetailsPanelOpacityChange?.(defaults.detailsPanelOpacity);
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
      <TopActionRow
        viewMode={viewMode}
        isViewFlipped={isViewFlipped}
        onViewFlipChange={onViewFlipChange}
        onClose={onClose}
        onReset={handleResetToDefaults}
        onDefaults={handleOpenCustomDefaultsModal}
      />

      <ViewModeSelector
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {viewMode === 'carousel' && (
        <CarouselSettings
          {...props}
          localLogoSize={localLogoSizes.carousel}
          onPerGameLogoSizeChange={(size) => handlePerGameLogoSizeChange('carousel', size)}
          onAlternativeBackgroundToggle={handleAlternativeBackgroundToggle}
        />
      )}

      {viewMode === 'coverflow' && (
        <CoverFlowSettings
          {...props}
          onAlternativeBackgroundToggle={handleAlternativeBackgroundToggle}
        />
      )}

      {viewMode !== 'carousel' && viewMode !== 'coverflow' && (
        <StandardSettings
          {...props}
          localLogoSizes={localLogoSizes}
          onPerGameLogoSizeChange={handlePerGameLogoSizeChange}
          onAlternativeBackgroundToggle={handleAlternativeBackgroundToggle}
        />
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
