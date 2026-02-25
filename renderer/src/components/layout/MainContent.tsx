import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useUI } from '../../contexts/UIContext';
import { Game } from '../../types/game';
import { LibraryGrid } from '../../components/LibraryGrid';
import { LibraryListView } from '../../components/LibraryListView';
import { LibraryCarousel } from '../../components/LibraryCarousel';
import { LibraryCoverFlow } from '../../components/LibraryCoverFlow';
import { WelcomeScreen } from '../../components/WelcomeScreen';
import { GameDetailsPanel } from '../../components/GameDetailsPanel';
import { RightClickMenu } from '../../components/RightClickMenu';
import { GameContextMenu } from '../../components/GameContextMenu';

interface MainContentProps {
  games: Game[];
  loading: boolean;
  error: string | null;
  reorderGames: (games: Game[]) => Promise<boolean>;
  updateGameInState: (game: Game) => void;
  loadLibrary: () => Promise<void>;
  handleAddFolder: (path: string, categories: string[]) => Promise<void>;
  getGameLauncher: (game: Game) => string;
  launchGame: (game: Game) => Promise<void>;
}

export const MainContent: React.FC<MainContentProps> = ({
  games,
  loading,
  error,
  reorderGames,
  updateGameInState,
  loadLibrary,
  handleAddFolder,
  getGameLauncher,
  launchGame,
}) => {
  const preferences = usePreferences();
  const ui = useUI();
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const currentBackgroundBrightness = preferences.backgroundBrightnessByView[preferences.viewMode] ?? 0.3;

  // Filter and sort state
  const filteredGames = useMemo(() => {
    let filtered = games;

    // Filter by section
    if (ui.activeSection === 'favorites') {
      filtered = filtered.filter(g => g.favorite);
    } else if (ui.activeSection === 'recent') {
      filtered = filtered.filter(g => g.lastPlayed);
    }

    // Filter by category or favorites
    if (ui.selectedCategory === 'favorites') {
      filtered = filtered.filter(g => g.favorite === true);
    } else if (ui.selectedCategory === 'hidden') {
      // Show only hidden games when "Hidden" category is selected
      filtered = filtered.filter(g => g.hidden === true);
    } else if (ui.selectedCategory) {
      filtered = filtered.filter(g =>
        g.categories?.includes(ui.selectedCategory!)
      );
    }

    // Filter out hidden games by default (unless "Hidden" category is selected)
    if (ui.selectedCategory !== 'hidden') {
      filtered = filtered.filter(g => g.hidden !== true);
    }

    // Filter by launcher
    if (ui.selectedLauncher) {
      filtered = filtered.filter(g => {
        const gameLauncher = getGameLauncher(g);
        return gameLauncher === ui.selectedLauncher;
      });
    }

    // Filter out VR titles if hideVRTitles is enabled, but not if VR category is selected
    if (preferences.hideVRTitles && ui.selectedCategory !== 'VR' && ui.selectedCategory !== 'Apps') {
      filtered = filtered.filter(g =>
        !g.categories?.includes('VR')
      );
    }

    // Filter out Apps titles if hideAppsTitles is enabled, but not if Apps category is selected
    if (preferences.hideAppsTitles && ui.selectedCategory !== 'Apps' && ui.selectedCategory !== 'VR') {
      filtered = filtered.filter(g =>
        !g.categories?.includes('Apps')
      );
    }

    // Filter by search query
    if (ui.searchQuery.trim()) {
      const query = ui.searchQuery.toLowerCase();
      filtered = filtered.filter(g =>
        g.title.toLowerCase().includes(query) ||
        g.genres?.some(genre => genre.toLowerCase().includes(query)) ||
        g.developers?.some(dev => dev.toLowerCase().includes(query))
      );
    }

    // Sort games - pinned games always appear first
    filtered = [...filtered].sort((a, b) => {
      // First, sort by pinned status (pinned games first)
      const aPinned = a.pinned === true ? 1 : 0;
      const bPinned = b.pinned === true ? 1 : 0;
      if (aPinned !== bPinned) {
        return bPinned - aPinned; // Pinned games first
      }

      // Then sort by the selected criteria
      switch (ui.sortBy) {
        case 'title':
          return (a.sortingName || a.title).localeCompare(b.sortingName || b.title);
        case 'releaseDate':
          const dateA = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
          const dateB = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
          return dateB - dateA; // Newest first
        case 'playtime':
          const playtimeA = a.playtime || 0;
          const playtimeB = b.playtime || 0;
          return playtimeB - playtimeA; // Most played first
        case 'lastPlayed':
          const lastA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0;
          const lastB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0;
          return lastB - lastA; // Most recent first
        default:
          return 0;
      }
    });

    return filtered;
  }, [games, ui.searchQuery, ui.activeSection, ui.selectedCategory, ui.selectedLauncher, ui.sortBy, preferences.hideVRTitles, preferences.hideAppsTitles, getGameLauncher]);

  const activeGame = ui.activeGameId ? games.find(g => g.id === ui.activeGameId) || null : null;

  // When no game is selected, select the first (top-left) game in the current view
  useEffect(() => {
    if (!loading && filteredGames.length > 0 && !ui.activeGameId) {
      ui.setActiveGameId(filteredGames[0].id);
    }
  }, [loading, filteredGames, ui.activeGameId]);

  // Handlers
  const handlePlay = async (game: Game) => {
    if (preferences.confirmGameLaunch) {
      ui.setLaunchConfirmation({ game });
      return;
    }
    await launchGame(game);
  };

  const handleGameClick = (game: Game) => {
    ui.setActiveGameId(game.id);
  };

  const handleEditGame = (game: Game) => {
    ui.setGameManagerInitialGameId(game.id);
    ui.setGameManagerInitialTab('metadata');
    ui.setIsGameManagerOpen(true);
  };

  const handleEditCategories = (game: Game) => {
    ui.setEditingCategoriesGame(game);
    ui.setIsCategoriesEditorOpen(true);
  };

  const handleEditImages = (game: Game) => {
    ui.setGameManagerInitialGameId(game.id);
    ui.setGameManagerInitialTab('images');
    ui.setIsGameManagerOpen(true);
  };

  const handleFixMatch = (game: Game) => {
    ui.setFixingGame(game);
    ui.setIsMetadataSearchOpen(true);
  };

  const handleToggleFavorite = async (game: Game) => {
    const newFavoriteValue = game.favorite !== true;
    const updatedGame = { ...game, favorite: newFavoriteValue };
    console.log('Toggling favorite for game:', game.title, 'Current favorite:', game.favorite, 'New favorite value:', newFavoriteValue);
    // We need to save the game. We can define handleSaveGame here or pass it.
    // Let's define it here reusing props.
    await handleSaveGame(updatedGame);
  };

  const handleTogglePin = async (game: Game) => {
    const newPinnedValue = game.pinned !== true;
    const updatedGame = { ...game, pinned: newPinnedValue };
    await handleSaveGame(updatedGame);
  };

  const handleHideGame = (game: Game) => {
    ui.setHideConfirmation({ game });
  };

  const handleUnhideGame = async (game: Game) => {
    const updatedGame = { ...game, hidden: false };
    await handleSaveGame(updatedGame);
    ui.showToast(`"${game.title}" has been unhidden`, 'success');
  };

  const handleSaveGame = async (game: Game, oldGame?: Game) => {
    try {
      if (!oldGame) {
        oldGame = games.find(g => g.id === game.id);
      }
      const success = await window.electronAPI.saveGame(game, oldGame);
      if (success) {
        await loadLibrary();
        ui.showToast(`Game "${game.title}" updated successfully`, 'success');
      } else {
        ui.showToast('Failed to save game', 'error');
      }
    } catch (err) {
      console.error('Error in handleSaveGame:', err);
      ui.showToast('Failed to save game', 'error');
    }
  };

  const handleReorder = async (reorderedGames: Game[]) => {
    await reorderGames(reorderedGames);
  };

  const calculateAutoSize = useCallback(() => {
    if (!gridContainerRef.current || preferences.viewMode !== 'grid' || filteredGames.length === 0) {
      return;
    }

    const container = gridContainerRef.current;
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    const horizontalPadding = 32;
    const verticalPadding = 32;
    const availableWidth = containerWidth - horizontalPadding;
    const availableHeight = containerHeight - verticalPadding;

    if (availableWidth <= 0 || availableHeight <= 0) {
      return;
    }

    const totalGames = filteredGames.length;
    const gap = preferences.gameTilePadding;

    let bestSize = 0;
    let bestRemainingWidth = Infinity;

    for (let columns = 1; columns <= 20; columns++) {
      const totalGapWidth = gap * (columns - 1);
      const tileWidth = (availableWidth - totalGapWidth) / columns;

      if (tileWidth < 50) continue;

      const tileHeight = tileWidth * 1.5;
      const rowsNeeded = Math.ceil(totalGames / columns);
      const totalHeightNeeded = (tileHeight * rowsNeeded) + (gap * (rowsNeeded - 1));

      if (totalHeightNeeded <= availableHeight) {
        const usedWidth = (tileWidth * columns) + (gap * (columns - 1));
        const remainingWidth = availableWidth - usedWidth;

        if (bestSize === 0 ||
          remainingWidth < bestRemainingWidth ||
          (Math.abs(remainingWidth - bestRemainingWidth) < 5 && tileWidth > bestSize)) {
          bestSize = tileWidth;
          bestRemainingWidth = remainingWidth;
        }
      }
    }

    if (bestSize > 0) {
      preferences.setGridSize(Math.round(bestSize));
    } else {
      for (let testSize = 200; testSize >= 50; testSize -= 10) {
        const tileHeight = testSize * 1.5;

        for (let columns = 1; columns <= 20; columns++) {
          const totalGapWidth = gap * (columns - 1);
          const tileWidth = (availableWidth - totalGapWidth) / columns;

          if (Math.abs(tileWidth - testSize) < 10) {
            const rowsNeeded = Math.ceil(totalGames / columns);
            const totalHeightNeeded = (tileHeight * rowsNeeded) + (gap * (rowsNeeded - 1));

            if (totalHeightNeeded <= availableHeight) {
              preferences.setGridSize(Math.round(tileWidth));
              return;
            }
          }
        }
      }

      const minColumns = Math.ceil(Math.sqrt(totalGames));
      const totalGapWidth = gap * (minColumns - 1);
      const fallbackSize = Math.round((availableWidth - totalGapWidth) / minColumns);
      preferences.setGridSize(Math.max(50, Math.min(500, fallbackSize)));
    }
  }, [preferences.viewMode, filteredGames.length, preferences.gameTilePadding, preferences.hideGameTitles, preferences.panelWidth]);

  // Auto-recalculate when auto-size is enabled and dependencies change
  useEffect(() => {
    if (!preferences.autoSizeToFit || preferences.viewMode !== 'grid' || filteredGames.length === 0) {
      return;
    }
    const timeoutId = setTimeout(() => {
      calculateAutoSize();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [preferences.autoSizeToFit, filteredGames.length, preferences.gameTilePadding, preferences.hideGameTitles, preferences.viewMode, calculateAutoSize, preferences.panelWidth]);

  // Watch for container size changes
  useEffect(() => {
    if (!preferences.autoSizeToFit || preferences.viewMode !== 'grid' || !gridContainerRef.current) {
      return;
    }

    const container = gridContainerRef.current;
    let resizeTimeout: NodeJS.Timeout;

    const resizeObserver = new ResizeObserver(() => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (filteredGames.length > 0) {
          calculateAutoSize();
        }
      }, 150);
    });

    resizeObserver.observe(container);

    const handleWindowResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (filteredGames.length > 0) {
          calculateAutoSize();
        }
      }, 150);
    };

    window.addEventListener('resize', handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
      clearTimeout(resizeTimeout);
    };
  }, [preferences.autoSizeToFit, preferences.viewMode, filteredGames.length, calculateAutoSize]);

  const carouselGameTilePadding = (preferences.viewMode === 'carousel' || preferences.viewMode === 'coverflow') && preferences.gameTilePadding > 3 ? 1 : preferences.gameTilePadding;

  // Right Panel Props (simplified)
  const currentFanartHeight = (preferences.viewMode === 'grid' || preferences.viewMode === 'list' || preferences.viewMode === 'logo') ? preferences.fanartHeightByView[preferences.viewMode] : 320;
  const currentDescriptionWidth = (preferences.viewMode === 'grid' || preferences.viewMode === 'list' || preferences.viewMode === 'logo') ? preferences.descriptionWidthByView[preferences.viewMode] : 50;
  const currentPanelWidth = (preferences.viewMode === 'grid' || preferences.viewMode === 'list' || preferences.viewMode === 'logo') ? preferences.panelWidthByViewState[preferences.viewMode] : 800;

  return (
    <div className={`flex-1 flex overflow-hidden relative pt-10 ${preferences.isViewFlippedByView[preferences.viewMode] ? 'flex-row-reverse' : ''}`}>
      {/* Left Panel */}
      <div className={`flex flex-col overflow-hidden ${preferences.viewMode === 'carousel' || preferences.viewMode === 'coverflow' ? 'w-full' : 'flex-1'}`}>
        <div
          ref={gridContainerRef}
          className={`flex-1 overflow-y-auto relative z-10 ${preferences.viewMode === 'carousel' || preferences.viewMode === 'coverflow' ? '' : (preferences.showCategoriesByView[preferences.viewMode] && (preferences.viewMode === 'grid' || preferences.viewMode === 'list' || preferences.viewMode === 'logo') ? 'p-0' : 'p-4')}`}
          onContextMenuCapture={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-game-card]')) {
              e.preventDefault();
              e.stopPropagation();
              ui.setGameContextMenu(null);
              ui.setRightClickMenu({ x: e.clientX, y: e.clientY });
            }
          }}
          onContextMenu={(e) => {
            const target = e.target as HTMLElement;
            if (!target.closest('[data-game-card]')) {
              e.preventDefault();
              e.stopPropagation();
              ui.setGameContextMenu(null);
              ui.setRightClickMenu({ x: e.clientX, y: e.clientY });
            }
          }}
        >
          {loading && (
            <div className="text-center py-8">
              <p className="text-gray-100">Loading game library...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-900/20 border border-red-500 rounded p-4 mb-4">
              <p className="text-red-300">Error: {error}</p>
            </div>
          )}

          {!loading && !error && (
            <div className="h-full flex flex-col">
              {/* Top Categories Bar */}
              {preferences.showCategoriesByView[preferences.viewMode] && preferences.viewMode !== 'carousel' && preferences.viewMode !== 'coverflow' && preferences.pinnedCategories.length > 0 && (preferences.categoriesPositionByView[preferences.viewMode] ?? 'top') === 'top' && (
                <div
                  className={`flex items-center gap-2 px-6 py-4 overflow-x-auto no-scrollbar ${(preferences.categoriesAlignmentByView[preferences.viewMode] ?? 'left') === 'center' ? 'justify-center' : (preferences.categoriesAlignmentByView[preferences.viewMode] ?? 'left') === 'right' ? 'justify-end' : 'justify-start'}`}
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  <button
                    onClick={() => ui.setSelectedCategory(null)}
                    style={{ fontSize: `${preferences.categoriesSizeByView[preferences.viewMode] ?? 12}px` }}
                    className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${ui.selectedCategory === null
                      ? 'bg-blue-600/40 text-blue-100 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                      : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 border border-gray-700/20'
                      }`}
                  >
                    All Games
                  </button>
                  {games.some(g => g.favorite === true) && (
                    <button
                      onClick={() => ui.setSelectedCategory(ui.selectedCategory === 'favorites' ? null : 'favorites')}
                      style={{ fontSize: `${preferences.categoriesSizeByView[preferences.viewMode] ?? 12}px` }}
                      className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${ui.selectedCategory === 'favorites'
                        ? 'bg-blue-600/40 text-blue-100 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                        : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 border border-gray-700/20'
                        }`}
                    >
                      Favorites
                    </button>
                  )}
                  {preferences.pinnedCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => ui.setSelectedCategory(ui.selectedCategory === cat ? null : cat)}
                      style={{ fontSize: `${preferences.categoriesSizeByView[preferences.viewMode] ?? 12}px` }}
                      className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${ui.selectedCategory === cat
                        ? 'bg-blue-600/40 text-blue-100 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                        : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 border border-gray-700/20'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {filteredGames.length > 0 ? (
                <div className={`flex-1 overflow-y-auto animate-onyx-grid-fade ${preferences.showCategoriesByView[preferences.viewMode] && preferences.viewMode !== 'carousel' && preferences.viewMode !== 'coverflow' ? ((preferences.categoriesPositionByView[preferences.viewMode] ?? 'top') === 'top' ? 'px-4 pb-4 pt-0' : 'px-4 pt-4 pb-0') : ''}`}>
                  {preferences.viewMode === 'grid' || preferences.viewMode === 'logo' ? (
                    <LibraryGrid
                      games={filteredGames}
                      onReorder={handleReorder}
                      onPlay={handlePlay}
                      onGameClick={handleGameClick}
                      onEdit={handleEditGame}
                      onEditImages={handleEditImages}
                      onEditCategories={handleEditCategories}
                      onFavorite={handleToggleFavorite}
                      onPin={handleTogglePin}
                      onFixMatch={handleFixMatch}
                      onHide={handleHideGame}
                      onUnhide={handleUnhideGame}
                      isHiddenView={ui.selectedCategory === 'hidden'}
                      gridSize={preferences.gridSize}
                      logoSize={preferences.logoSize}
                      onGridSizeChange={preferences.setGridSize}
                      gameTilePadding={preferences.gameTilePadding}
                      hideGameTitles={preferences.hideGameTitles}
                      showLogoOverBoxart={preferences.showLogoOverBoxart}
                      logoPosition={preferences.logoPosition}
                      useLogosInsteadOfBoxart={preferences.viewMode === 'logo'}
                      autoSizeToFit={preferences.autoSizeToFit}
                      logoBackgroundColor={preferences.logoBackgroundColor}
                      logoBackgroundOpacity={preferences.logoBackgroundOpacity}
                      descriptionSize={preferences.gridDescriptionSize}
                      onGameContextMenu={(game: Game, x: number, y: number) => {
                        ui.setRightClickMenu(null);
                        ui.setGameContextMenu({ game, x, y });
                      }}
                      onEmptySpaceClick={(x: number, y: number) => {
                        ui.setGameContextMenu(null);
                        ui.setRightClickMenu({ x, y });
                      }}
                      viewMode={preferences.viewMode as 'grid' | 'logo'}
                    />
                  ) : preferences.viewMode === 'coverflow' ? (
                    <LibraryCoverFlow
                      games={filteredGames}
                      onPlay={handlePlay}
                      onGameClick={handleGameClick}
                      onEdit={handleEditGame}
                      onEditImages={handleEditImages}
                      onEditCategories={handleEditCategories}
                      onFavorite={handleToggleFavorite}
                      onPin={handleTogglePin}
                      onFixMatch={handleFixMatch}
                      onHide={handleHideGame}
                      onUnhide={handleUnhideGame}
                      isHiddenView={ui.selectedCategory === 'hidden'}
                      activeGameId={ui.activeGameId}
                      coverSize={preferences.coverFlowCoverSize}
                      reflectionStrength={preferences.coverFlowReflection / 100}
                      verticalOffset={preferences.coverFlowVerticalOffset}
                      sideOpacity={preferences.coverFlowSideOpacity}
                      showButtons={preferences.coverFlowShowButtons}
                      buttonPosition={preferences.coverFlowButtonPosition}
                      buttonColors={preferences.coverFlowButtonColors}
                      onEmptySpaceRightClick={(x, y) => {
                        ui.setGameContextMenu(null);
                        ui.setRightClickMenu({ x, y });
                      }}
                    />
                  ) : preferences.viewMode === 'carousel' ? (
                    <LibraryCarousel
                      games={filteredGames}
                      onPlay={handlePlay}
                      onGameClick={handleGameClick}
                      onEdit={handleEditGame}
                      onEditImages={handleEditImages}
                      onEditCategories={handleEditCategories}
                      onFavorite={handleToggleFavorite}
                      onPin={handleTogglePin}
                      onFixMatch={handleFixMatch}
                      onHide={handleHideGame}
                      onUnhide={handleUnhideGame}
                      isHiddenView={ui.selectedCategory === 'hidden'}
                      activeGameId={ui.activeGameId}
                      selectedBoxArtSize={preferences.selectedBoxArtSize}
                      gameTilePadding={carouselGameTilePadding}
                      showCarouselDetails={preferences.showCarouselDetails}
                      showCarouselLogos={preferences.showCarouselLogos}
                      detailsBarSize={preferences.detailsBarSize}
                      onDetailsBarSizeChange={(size) => {
                        preferences.setDetailsBarSize(size);
                        window.electronAPI.savePreferences({ detailsBarSize: size });
                      }}
                      carouselLogoSize={preferences.carouselLogoSize}
                      onCarouselLogoSizeChange={(size) => {
                        preferences.setCarouselLogoSize(size);
                        window.electronAPI.savePreferences({ carouselLogoSize: size });
                      }}
                      carouselButtonSize={preferences.carouselButtonSize}
                      onCarouselButtonSizeChange={(size) => {
                        preferences.setCarouselButtonSize(size);
                        window.electronAPI.savePreferences({ carouselButtonSize: size });
                      }}
                      carouselDescriptionSize={preferences.carouselDescriptionSize}
                      onCarouselDescriptionSizeChange={(size) => {
                        preferences.setCarouselDescriptionSize(size);
                        window.electronAPI.savePreferences({ carouselDescriptionSize: size });
                      }}
                      onEmptySpaceRightClick={(x, y) => {
                        ui.setGameContextMenu(null);
                        ui.setRightClickMenu({ x, y });
                      }}
                      isViewFlipped={preferences.isViewFlippedByView[preferences.viewMode]}
                      carouselButtonColors={preferences.carouselButtonColors}
                    />
                  ) : (
                    <LibraryListView
                      games={filteredGames}
                      onPlay={handlePlay}
                      onGameClick={handleGameClick}
                      onEdit={handleEditGame}
                      onEditImages={handleEditImages}
                      onEditCategories={handleEditCategories}
                      onFavorite={handleToggleFavorite}
                      onPin={handleTogglePin}
                      onFixMatch={handleFixMatch}
                      onHide={handleHideGame}
                      onUnhide={handleUnhideGame}
                      isHiddenView={ui.selectedCategory === 'hidden'}
                      hideGameTitles={preferences.hideGameTitles}
                      listViewOptions={preferences.listViewOptions}
                      listViewSize={preferences.listViewSize}
                      onEmptySpaceClick={(x, y) => {
                        ui.setGameContextMenu(null);
                        ui.setRightClickMenu({ x, y });
                      }}
                    />
                  )}
                </div>
              ) : (
                <WelcomeScreen
                  onScanGames={() => {
                    ui.setAutoStartScan(true);
                    ui.setIsImportWorkbenchOpen(true);
                  }}
                  onAddFolder={handleAddFolder}
                  onOpenSettings={() => ui.setIsAPISettingsOpen(true)}
                />
              )}

              {/* Bottom Categories Bar */}
              {preferences.showCategoriesByView[preferences.viewMode] && preferences.viewMode !== 'carousel' && preferences.viewMode !== 'coverflow' && preferences.pinnedCategories.length > 0 && (preferences.categoriesPositionByView[preferences.viewMode] ?? 'top') === 'bottom' && (
                <div
                  className={`flex items-center gap-2 px-6 py-4 overflow-x-auto no-scrollbar ${(preferences.categoriesAlignmentByView[preferences.viewMode] ?? 'left') === 'center' ? 'justify-center' : (preferences.categoriesAlignmentByView[preferences.viewMode] ?? 'left') === 'right' ? 'justify-end' : 'justify-start'}`}
                  style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                  <button
                    onClick={() => ui.setSelectedCategory(null)}
                    style={{ fontSize: `${preferences.categoriesSizeByView[preferences.viewMode] ?? 12}px` }}
                    className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${ui.selectedCategory === null
                      ? 'bg-blue-600/40 text-blue-100 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                      : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 border border-gray-700/20'
                      }`}
                  >
                    All Games
                  </button>
                  {games.some(g => g.favorite === true) && (
                    <button
                      onClick={() => ui.setSelectedCategory(ui.selectedCategory === 'favorites' ? null : 'favorites')}
                      style={{ fontSize: `${preferences.categoriesSizeByView[preferences.viewMode] ?? 12}px` }}
                      className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${ui.selectedCategory === 'favorites'
                        ? 'bg-blue-600/40 text-blue-100 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                        : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 border border-gray-700/20'
                        }`}
                    >
                      Favorites
                    </button>
                  )}
                  {preferences.pinnedCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => ui.setSelectedCategory(ui.selectedCategory === cat ? null : cat)}
                      style={{ fontSize: `${preferences.categoriesSizeByView[preferences.viewMode] ?? 12}px` }}
                      className={`px-3 py-1.5 rounded-full font-medium transition-all whitespace-nowrap ${ui.selectedCategory === cat
                        ? 'bg-blue-600/40 text-blue-100 border border-blue-500/40 shadow-sm shadow-blue-500/20'
                        : 'bg-gray-800/40 text-gray-400 hover:bg-gray-700/60 hover:text-gray-200 border border-gray-700/20'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      {preferences.viewMode !== 'carousel' && preferences.viewMode !== 'coverflow' && filteredGames.length > 0 && (
        <GameDetailsPanel
          game={activeGame}
          isLaunching={ui.launchingGameId === activeGame?.id}
          isRunning={activeGame ? ui.runningGames.has(activeGame.id) : false}
          onPlay={handlePlay}
          onSaveGame={handleSaveGame}
          onUpdateGameInState={updateGameInState}
          viewMode={preferences.viewMode}
          onOpenInGameManager={(game, tab) => {
            ui.setGameManagerInitialGameId(game.id);
            ui.setGameManagerInitialTab(tab);
            ui.setIsGameManagerOpen(true);
          }}
          onFavorite={handleToggleFavorite}
          onEdit={handleEditGame}
          onEditImages={handleEditImages}
          onEditCategories={handleEditCategories}
          onPin={handleTogglePin}
          onFixMatch={handleFixMatch}
          onHide={handleHideGame}
          onUnhide={handleUnhideGame}
          isHiddenView={ui.selectedCategory === 'hidden'}
          onRightClick={(x, y) => {
            ui.setGameContextMenu(null);
            ui.setRightClickMenu({ x, y });
          }}
          panelWidth={currentPanelWidth}
          onPanelWidthChange={(width) => {
            preferences.setPanelWidth(width);
            const newByView = { ...preferences.panelWidthByViewState, [preferences.viewMode]: width };
            preferences.setPanelWidthByViewState(newByView);
            window.electronAPI.savePreferences({ panelWidthByView: newByView });
          }}
          rightPanelLogoSize={preferences.rightPanelLogoSize}
          rightPanelBoxartPosition={preferences.rightPanelBoxartPosition}
          rightPanelBoxartSize={preferences.rightPanelBoxartSize}
          rightPanelTextSize={preferences.rightPanelTextSize}
          rightPanelButtonSize={preferences.rightPanelButtonSize}
          rightPanelButtonLocation={preferences.rightPanelButtonLocation}
          detailsPanelOpacity={preferences.detailsPanelOpacity}
          fanartHeight={currentFanartHeight}
          onFanartHeightChange={(height) => {
            const newByView = { ...preferences.fanartHeightByView, [preferences.viewMode]: height };
            preferences.setFanartHeightByView(newByView);
            window.electronAPI.savePreferences({ fanartHeightByView: newByView });
          }}
          descriptionWidth={currentDescriptionWidth}
          onDescriptionWidthChange={(width) => {
            const newByView = { ...preferences.descriptionWidthByView, [preferences.viewMode]: width };
            preferences.setDescriptionWidthByView(newByView);
            window.electronAPI.savePreferences({ descriptionWidthByView: newByView });
          }}
          isViewFlipped={preferences.isViewFlippedByView[preferences.viewMode]}
          rightPanelButtonColors={
            preferences.viewMode === 'grid' ? preferences.gridButtonColors :
              preferences.viewMode === 'list' ? preferences.listButtonColors :
                preferences.viewMode === 'logo' ? preferences.logoButtonColors :
                  preferences.rightPanelButtonColors
          }
          linkDisplayOrder={preferences.linkDisplayOrder}
          visibleLinkTypes={preferences.visibleLinkTypes}
        />
      )}

      {/* Right Click Menu */}
      {ui.rightClickMenu && (
        <RightClickMenu
          x={ui.rightClickMenu.x}
          y={ui.rightClickMenu.y}
          onClose={() => ui.setRightClickMenu(null)}
          viewMode={preferences.viewMode}
          onViewModeChange={preferences.setViewMode}
          activeGame={activeGame || undefined}
          onActiveGameChange={(game) => {
            ui.setActiveGameId(game.id);
            updateGameInState(game);
          }}
          gridSize={preferences.gridSize}
          onGridSizeChange={preferences.setGridSize}
          logoSize={preferences.logoSize}
          onLogoSizeChange={preferences.setLogoSize}
          listSize={preferences.listViewSize}
          onListSizeChange={preferences.setListViewSize}
          listViewOptions={preferences.listViewOptions}
          onListViewOptionsChange={(options) => {
            preferences.setListViewOptions({
              ...preferences.listViewOptions,
              ...options,
              showLauncher: options.showLauncher ?? true,
              showLogos: options.showLogos ?? false,
            });
            window.electronAPI.savePreferences({ listViewOptions: options });
          }}
          gameTilePadding={preferences.gameTilePadding}
          onGameTilePaddingChange={preferences.setGameTilePadding}
          backgroundBlur={preferences.backgroundBlur}
          onBackgroundBlurChange={preferences.setBackgroundBlur}
          backgroundBrightness={currentBackgroundBrightness}
          onBackgroundBrightnessChange={(brightness: number) => {
            const newByView = { ...preferences.backgroundBrightnessByView, [preferences.viewMode]: brightness };
            preferences.setBackgroundBrightnessByView(newByView);
            window.electronAPI.savePreferences({ backgroundBrightnessByView: newByView });
          }}
          selectedBoxArtSize={preferences.selectedBoxArtSize}
          onSelectedBoxArtSizeChange={preferences.setSelectedBoxArtSize}
          panelWidth={currentPanelWidth}
          onPanelWidthChange={(width) => {
            preferences.setPanelWidth(width);
            const newByView = { ...preferences.panelWidthByViewState, [preferences.viewMode]: width };
            preferences.setPanelWidthByViewState(newByView);
            window.electronAPI.savePreferences({ panelWidthByView: newByView });
          }}
          carouselLogoSize={preferences.carouselLogoSize}
          onCarouselLogoSizeChange={(size) => {
            preferences.setCarouselLogoSize(size);
            window.electronAPI.savePreferences({ carouselLogoSize: size });
          }}
          detailsBarSize={preferences.detailsBarSize}
          onDetailsBarSizeChange={(size) => {
            preferences.setDetailsBarSize(size);
            window.electronAPI.savePreferences({ detailsBarSize: size });
          }}
          showCarouselDetails={preferences.showCarouselDetails}
          onShowCarouselDetailsChange={(show) => {
            preferences.setShowCarouselDetails(show);
            window.electronAPI.savePreferences({ showCarouselDetails: show });
          }}
          showCarouselLogos={preferences.showCarouselLogos}
          onShowCarouselLogosChange={(show) => {
            preferences.setShowCarouselLogos(show);
            window.electronAPI.savePreferences({ showCarouselLogos: show });
          }}
          carouselButtonSize={preferences.carouselButtonSize}
          onCarouselButtonSizeChange={(size) => {
            preferences.setCarouselButtonSize(size);
            window.electronAPI.savePreferences({ carouselButtonSize: size });
          }}
          carouselDescriptionSize={preferences.carouselDescriptionSize}
          onCarouselDescriptionSizeChange={(size) => {
            preferences.setCarouselDescriptionSize(size);
            window.electronAPI.savePreferences({ carouselDescriptionSize: size });
          }}
          showCategoriesInGameList={preferences.showCategoriesByView[preferences.viewMode] ?? false}
          onShowCategoriesInGameListChange={(show) => {
            const newByView = { ...preferences.showCategoriesByView, [preferences.viewMode]: show };
            preferences.setShowCategoriesByView(newByView);
            window.electronAPI.savePreferences({ showCategoriesInGameListByView: newByView });
          }}
          categoriesPosition={preferences.categoriesPositionByView[preferences.viewMode] ?? 'top'}
          onCategoriesPositionChange={(position: 'top' | 'bottom') => {
            const newByView = { ...preferences.categoriesPositionByView, [preferences.viewMode]: position };
            preferences.setCategoriesPositionByView(newByView);
            window.electronAPI.savePreferences({ categoriesPositionByView: newByView });
          }}
          categoriesTopAlignment={preferences.categoriesAlignmentByView[preferences.viewMode] ?? 'left'}
          onCategoriesTopAlignmentChange={(alignment: 'left' | 'center' | 'right') => {
            const newByView = { ...preferences.categoriesAlignmentByView, [preferences.viewMode]: alignment };
            preferences.setCategoriesAlignmentByView(newByView);
            window.electronAPI.savePreferences({ categoriesAlignmentByView: newByView });
          }}
          categoriesTopSize={preferences.categoriesSizeByView[preferences.viewMode] ?? 12}
          onCategoriesTopSizeChange={(size: number) => {
            const newByView = { ...preferences.categoriesSizeByView, [preferences.viewMode]: size };
            preferences.setCategoriesSizeByView(newByView);
            window.electronAPI.savePreferences({ categoriesSizeByView: newByView });
          }}
          showLogoOverBoxart={preferences.showLogoOverBoxart}
          onShowLogoOverBoxartChange={(show) => {
            preferences.setShowLogoOverBoxart(show);
            window.electronAPI.savePreferences({ showLogoOverBoxart: show });
          }}
          logoPosition={preferences.logoPosition}
          onLogoPositionChange={(position) => {
            preferences.setLogoPosition(position);
            window.electronAPI.savePreferences({ logoPosition: position });
          }}
          logoBackgroundColor={preferences.logoBackgroundColor}
          onLogoBackgroundColorChange={(color: string) => {
            preferences.setLogoBackgroundColor(color);
            window.electronAPI.savePreferences({ logoBackgroundColor: color });
          }}
          logoBackgroundOpacity={preferences.logoBackgroundOpacity}
          onLogoBackgroundOpacityChange={(opacity: number) => {
            preferences.setLogoBackgroundOpacity(opacity);
            window.electronAPI.savePreferences({ logoBackgroundOpacity: opacity });
          }}
          rightPanelLogoSize={preferences.rightPanelLogoSize}
          onRightPanelLogoSizeChange={(size) => {
            preferences.setRightPanelLogoSize(size);
            window.electronAPI.savePreferences({ rightPanelLogoSize: size });
          }}
          rightPanelBoxartPosition={preferences.rightPanelBoxartPosition}
          onRightPanelBoxartPositionChange={(position) => {
            preferences.setRightPanelBoxartPosition(position);
            window.electronAPI.savePreferences({ rightPanelBoxartPosition: position });
          }}
          rightPanelBoxartSize={preferences.rightPanelBoxartSize}
          onRightPanelBoxartSizeChange={(size) => {
            preferences.setRightPanelBoxartSize(size);
            window.electronAPI.savePreferences({ rightPanelBoxartSize: size });
          }}
          rightPanelTextSize={preferences.rightPanelTextSize}
          onRightPanelTextSizeChange={(size) => {
            preferences.setRightPanelTextSize(size);
            window.electronAPI.savePreferences({ rightPanelTextSize: size });
          }}
          rightPanelButtonSize={preferences.rightPanelButtonSize}
          onRightPanelButtonSizeChange={(size) => {
            preferences.setRightPanelButtonSize(size);
            window.electronAPI.savePreferences({ rightPanelButtonSize: size });
          }}
          rightPanelButtonLocation={preferences.rightPanelButtonLocation}
          onRightPanelButtonLocationChange={(location) => {
            preferences.setRightPanelButtonLocation(location);
            window.electronAPI.savePreferences({ rightPanelButtonLocation: location });
          }}
          isViewFlipped={preferences.isViewFlippedByView[preferences.viewMode]}
          onViewFlipChange={(flipped) => {
            const newByView = { ...preferences.isViewFlippedByView, [preferences.viewMode]: flipped };
            preferences.setIsViewFlippedByView(newByView);
            window.electronAPI.savePreferences({ isViewFlippedByView: newByView });
          }}
          detailsPanelOpacity={preferences.detailsPanelOpacity}
          onDetailsPanelOpacityChange={(opacity) => {
            preferences.setDetailsPanelOpacity(opacity);
            window.electronAPI.savePreferences({ detailsPanelOpacity: opacity });
          }}
          fanartHeight={currentFanartHeight}
          onFanartHeightChange={(height) => {
            const newByView = { ...preferences.fanartHeightByView, [preferences.viewMode]: height };
            preferences.setFanartHeightByView(newByView);
            window.electronAPI.savePreferences({ fanartHeightByView: newByView });
          }}
          descriptionWidth={currentDescriptionWidth}
          onDescriptionWidthChange={(width) => {
            const newByView = { ...preferences.descriptionWidthByView, [preferences.viewMode]: width };
            preferences.setDescriptionWidthByView(newByView);
            window.electronAPI.savePreferences({ descriptionWidthByView: newByView });
          }}
          rightPanelButtonColors={preferences.rightPanelButtonColors}
          onRightPanelButtonColorsChange={(colors) => {
            preferences.setRightPanelButtonColors(colors);
            window.electronAPI.savePreferences({ rightPanelButtonColors: colors });
          }}
          carouselButtonColors={preferences.carouselButtonColors}
          onCarouselButtonColorsChange={(colors) => {
            preferences.setCarouselButtonColors(colors);
            window.electronAPI.savePreferences({ carouselButtonColors: colors });
          }}
          gridButtonColors={preferences.gridButtonColors}
          onGridButtonColorsChange={(colors) => {
            preferences.setGridButtonColors(colors);
            window.electronAPI.savePreferences({ gridButtonColors: colors });
          }}
          listButtonColors={preferences.listButtonColors}
          onListButtonColorsChange={(colors) => {
            preferences.setListButtonColors(colors);
            window.electronAPI.savePreferences({ listButtonColors: colors });
          }}
          logoButtonColors={preferences.logoButtonColors}
          onLogoButtonColorsChange={(colors) => {
            preferences.setLogoButtonColors(colors);
            window.electronAPI.savePreferences({ logoButtonColors: colors });
          }}
          coverFlowCoverSize={preferences.coverFlowCoverSize}
          onCoverFlowCoverSizeChange={(size) => {
            preferences.setCoverFlowCoverSize(size);
            window.electronAPI.savePreferences({ coverFlowCoverSize: size });
          }}
          coverFlowReflection={preferences.coverFlowReflection}
          onCoverFlowReflectionChange={(value) => {
            preferences.setCoverFlowReflection(value);
            window.electronAPI.savePreferences({ coverFlowReflection: value });
          }}
          coverFlowVerticalOffset={preferences.coverFlowVerticalOffset}
          onCoverFlowVerticalOffsetChange={(value: number) => {
            preferences.setCoverFlowVerticalOffset(value);
            window.electronAPI.savePreferences({ coverFlowVerticalOffset: value } as any);
          }}
          coverFlowSideOpacity={preferences.coverFlowSideOpacity}
          onCoverFlowSideOpacityChange={(value: number) => {
            preferences.setCoverFlowSideOpacity(value);
            window.electronAPI.savePreferences({ coverFlowSideOpacity: value } as any);
          }}
          coverFlowShowButtons={preferences.coverFlowShowButtons}
          onCoverFlowShowButtonsChange={(show) => {
            preferences.setCoverFlowShowButtons(show);
            window.electronAPI.savePreferences({ coverFlowShowButtons: show });
          }}
          coverFlowButtonPosition={preferences.coverFlowButtonPosition}
          onCoverFlowButtonPositionChange={(pos) => {
            preferences.setCoverFlowButtonPosition(pos);
            window.electronAPI.savePreferences({ coverFlowButtonPosition: pos });
          }}
          coverFlowButtonColors={preferences.coverFlowButtonColors}
          onCoverFlowButtonColorsChange={(colors) => {
            preferences.setCoverFlowButtonColors(colors);
            window.electronAPI.savePreferences({ coverFlowButtonColors: colors });
          }}
          onSettingsImported={preferences.refreshPreferences}
        />
      )}

      {/* Game Context Menu */}
      {ui.gameContextMenu && (
        <GameContextMenu
          game={ui.gameContextMenu.game}
          x={ui.gameContextMenu.x}
          y={ui.gameContextMenu.y}
          onClose={() => ui.setGameContextMenu(null)}
          onPlay={handlePlay}
          onEdit={handleEditGame}
          onEditImages={handleEditImages}
          onEditCategories={handleEditCategories}
          onFavorite={handleToggleFavorite}
          onPin={handleTogglePin}
          onFixMatch={handleFixMatch}
          onHide={handleHideGame}
          onUnhide={handleUnhideGame}
          isHiddenView={ui.selectedCategory === 'hidden'}
        />
      )}
    </div>
  );
};
