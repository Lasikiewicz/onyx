import { useEffect, useMemo, useCallback } from 'react';
import { usePreferences } from '../../contexts/PreferencesContext';
import { useUI } from '../../contexts/UIContext';
import { useUpdate } from '../../contexts/UpdateContext';
import { useGameLibrary } from '../../hooks/useGameLibrary';
import { useFullscreen } from '../../hooks/useFullscreen';
import { MainContent } from './MainContent';
import { MenuBar } from '../../components/MenuBar';
import { TopBar } from '../../components/TopBar';
import { AddGameModal } from '../../components/AddGameModal';
import { GameMetadataEditor } from '../../components/GameMetadataEditor';
import { SteamConfigModal } from '../../components/SteamConfigModal';
import { CategoriesEditor } from '../../components/CategoriesEditor';
import { OnyxSettingsModal } from '../../components/OnyxSettingsModal';
import { APISettingsModal } from '../../components/APISettingsModal';
import { MetadataSearchModal } from '../../components/MetadataSearchModal';
import { ImportWorkbenchV2 as ImportWorkbench } from '../../components/importer/ImportWorkbenchV2';
import { GameManager } from '../../components/GameManager';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { BugReportModal } from '../../components/BugReportModal';
import { MissingGamesModal } from '../../components/MissingGamesModal';
import { UpdateNotificationModal } from '../../components/UpdateNotificationModal';
import { LibraryTutorialModal } from '../../components/LibraryTutorialModal';
import { Game, GameMetadata } from '../../types/game';
import { areAPIsConfigured } from '../../utils/apiValidation';
import { UpdateLibraryModal } from '../../components/UpdateLibraryModal';

export const AppLayout = () => {
  const preferences = usePreferences();
  const ui = useUI();
  const update = useUpdate();
  const { games, loading, error, reorderGames, addCustomGame, loadLibrary, deleteGame, updateGameInState } = useGameLibrary();

  // Initialize fullscreen and gamepad support
  useFullscreen();

  // Derived state from preferences
  const currentBackgroundBrightness = preferences.backgroundBrightnessByView[preferences.viewMode] ?? 0.3;

  // Listen to menu events
  useEffect(() => {
    const cleanup1 = window.electronAPI.onMenuEvent('menu:addGame', async () => {
      const apisConfigured = await areAPIsConfigured();
      if (!apisConfigured) {
        ui.showToast('Both IGDB (Client ID + Secret) and SteamGridDB (API Key) are required before adding games. Please configure them in Settings > APIs.', 'error');
        ui.setIsOnyxSettingsOpen(true);
        ui.setOnyxSettingsInitialTab('apis');
        return;
      }
      ui.setIsModalOpen(true);
    });
    const cleanup2 = window.electronAPI.onMenuEvent('menu:scanFolder', () => {
      handleScanFolder();
    });
    const cleanup3 = window.electronAPI.onMenuEvent('menu:updateSteamLibrary', () => {
      handleUpdateSteamLibrary();
    });
    const cleanup4 = window.electronAPI.onMenuEvent('menu:configureSteam', () => {
      ui.setIsSteamConfigOpen(true);
    });
    const cleanup5 = window.electronAPI.onMenuEvent('menu:checkForUpdates', () => {
      window.electronAPI.checkForUpdates?.();
    });

    // Listen for new Steam games found notification
    const newGamesHandler = (_event: any, data: { count: number; games: Array<any> }) => {
      if (data.games && data.games.length > 0) {
        ui.setFoundGames(data.games);
      }
    };

    // Listen for new games found from background scan (all sources)
    const backgroundNewGamesHandler = (_event: any, data: { count: number; games: Array<any>; bySource?: Record<string, Array<any>> }) => {
      console.log('[App] Background scan found new games:', data);
      if (data.games && data.games.length > 0) {
        ui.setFoundGames(data.games);
      }
    };

    // Listen for startup scan progress
    const startupProgressHandler = (_event: any, data: { message: string }) => {
      if (!data || typeof data !== 'object') {
        console.warn('[App] ⚠️ Received malformed startup:progress data:', data);
        return;
      }
      ui.setStartupProgress(data);
      if (data.message && (data.message.includes('Scan complete') || data.message.includes('Error'))) {
        setTimeout(() => {
          ui.setFoundGames(currentFoundGames => {
            if (currentFoundGames && currentFoundGames.length > 0) {
              return currentFoundGames;
            }
            ui.setStartupProgress(null);
            return currentFoundGames;
          });
        }, 500);
      }
    };

    // Listen for missing games detected during scans
    const missingGamesHandler = (_event: any, data: { games: Array<any> }) => {
      console.log('[App] Missing games detected:', data);
      if (data.games && data.games.length > 0) {
        ui.setMissingGames(data.games);
      }
    };

    const removeSteamNewGames = window.electronAPI?.on && window.electronAPI.on('steam:newGamesFound', newGamesHandler);
    const removeBackgroundNewGames = window.electronAPI?.on && window.electronAPI.on('background:newGamesFound', backgroundNewGamesHandler);
    const removeStartupProgress = window.electronAPI?.on && window.electronAPI.on('startup:progress', startupProgressHandler);
    const removeMissingGames = window.electronAPI?.on && window.electronAPI.on('scan:missing-games', missingGamesHandler);

    // Listen for update status
    const updateStatusHandler = (_event: any, payload: { status: string; version?: string; error?: string }) => {
      if (payload.status === 'available' && payload.version) {
        update.setIsUpdateModalTest(false);
        update.setUpdateNotification({
          version: payload.version,
          status: 'available',
        });
        window.electronAPI.onUpdateFound?.();
      } else if (payload.status === 'downloading') {
        update.setIsUpdateModalTest(false);
        update.setUpdateNotification(prev => prev ? { ...prev, status: 'downloading' } : null);
      } else if (payload.status === 'downloaded') {
        update.setIsUpdateModalTest(false);
        update.setUpdateNotification(prev => prev ? { ...prev, status: 'downloaded' } : null);
      } else if (payload.status === 'error' && payload.error) {
        update.setIsUpdateModalTest(false);
        update.setUpdateNotification(prev => prev ? { ...prev, status: 'error', error: payload.error } : null);
      }
    };
    const removeUpdateStatus = window.electronAPI?.on && window.electronAPI.on('app:update-status', updateStatusHandler);

    return () => {
      cleanup1();
      cleanup2();
      cleanup3();
      cleanup4();
      cleanup5();
      if (typeof removeSteamNewGames === 'function') removeSteamNewGames();
      if (typeof removeBackgroundNewGames === 'function') removeBackgroundNewGames();
      if (typeof removeStartupProgress === 'function') removeStartupProgress();
      if (typeof removeMissingGames === 'function') removeMissingGames();
      if (typeof removeUpdateStatus === 'function') removeUpdateStatus();
    };
  }, []); // Empty dependency array means this runs once on mount

  // Automatically pin VR and Apps categories when they exist
  // We need to calculate allCategories first
  const { allCategories, categoryCounts } = useMemo(() => {
    const counts: Record<string, number> = {};
    let favorites = 0;
    let hidden = 0;
    games.forEach(game => {
      if (game.favorite) favorites++;
      if (game.hidden) hidden++;
      game.categories?.forEach(cat => {
        counts[cat] = (counts[cat] || 0) + 1;
      });
    });

    return {
      allCategories: Object.keys(counts).sort(),
      categoryCounts: {
        ...counts,
        favorites,
        hidden,
        all: games.length
      }
    };
  }, [games]);

  useEffect(() => {
    const categoriesToAutoPin = ['VR', 'Apps'];
    preferences.setPinnedCategories(prev => {
      const updated = [...prev];
      let changed = false;

      categoriesToAutoPin.forEach(category => {
        if (allCategories.includes(category) && !prev.includes(category)) {
          updated.push(category);
          changed = true;
        }
      });

      return changed ? updated : prev;
    });
  }, [allCategories]);

  // Derived state
  const hasFavoriteGames = useMemo(() => games.some(g => g.favorite === true), [games]);
  const hasVRCategory = useMemo(() => allCategories.includes('VR'), [allCategories]);
  const hasAppsCategory = useMemo(() => allCategories.includes('Apps'), [allCategories]);
  const hasHiddenGames = useMemo(() => games.some(g => g.hidden === true), [games]);

  // Launcher logic
  const getGameLauncher = useCallback((game: Game): string => {
    if (game.id.startsWith('steam-')) return 'steam';
    if (game.id.startsWith('epic-')) return 'epic';
    if (game.id.startsWith('gog-')) return 'gog';
    if (game.id.startsWith('xbox-')) return 'xbox';
    if (game.id.startsWith('ubisoft-')) return 'ubisoft';
    if (game.id.startsWith('rockstar-')) return 'rockstar';
    if (game.id.startsWith('ea-') || game.id.startsWith('origin-')) return 'ea';
    if (game.id.startsWith('battle-') || game.id.startsWith('battlenet-')) return 'battle';

    if (game.source) {
      const source = game.source.toLowerCase();
      const validSources = ['steam', 'epic', 'gog', 'xbox', 'ea', 'origin', 'ubisoft', 'battle', 'battlenet', 'humble', 'itch', 'rockstar'];
      if (validSources.includes(source)) {
        if (source === 'origin') return 'ea';
        if (source === 'battlenet') return 'battle';
        return source;
      }
    }

    const platform = game.platform?.toLowerCase();
    if (platform === 'steam') return 'steam';
    if (platform === 'epic' || platform === 'epic games') return 'epic';
    if (platform === 'gog' || platform === 'gog galaxy') return 'gog';
    if (platform === 'xbox' || platform === 'xbox game pass') return 'xbox';
    if (platform === 'ea' || platform === 'ea app' || platform === 'origin') return 'ea';
    if (platform === 'ubisoft' || platform === 'ubisoft connect') return 'ubisoft';
    if (platform === 'battle.net' || platform === 'battlenet' || platform === 'battle') return 'battle';
    if (platform === 'rockstar' || platform === 'rockstar games') return 'rockstar';

    if (game.installationDirectory) {
      const installPath = game.installationDirectory.toLowerCase();
      if (installPath.includes('steam')) return 'steam';
      if (installPath.includes('epic games') || installPath.includes('epicgames')) return 'epic';
      if (installPath.includes('gog galaxy') || installPath.includes('gog\\games')) return 'gog';
      if (installPath.includes('xboxgames') || installPath.includes('windowsapps')) return 'xbox';
      if (installPath.includes('electronic arts') || installPath.includes('ea games') || installPath.includes('origin')) return 'ea';
      if (installPath.includes('ubisoft')) return 'ubisoft';
      if (installPath.includes('battle.net') || installPath.includes('battlenet')) return 'battle';
      if (installPath.includes('rockstar games')) return 'rockstar';
      if (installPath.includes('humble')) return 'humble';
      if (installPath.includes('itch')) return 'itch';
    }

    return 'other';
  }, []);

  const allLaunchers = useMemo(() => {
    const launchers = new Set<string>();
    games.forEach(game => {
      const launcher = getGameLauncher(game);
      if (launcher) {
        launchers.add(launcher);
      }
    });
    return Array.from(launchers).sort((a, b) => {
      if (a === 'other') return 1;
      if (b === 'other') return -1;
      return a.localeCompare(b);
    });
  }, [games, getGameLauncher]);

  const activeGame = ui.activeGameId ? games.find(g => g.id === ui.activeGameId) || null : null;

  // Handlers
  const handleScanFolder = async () => {
    const apisConfigured = await areAPIsConfigured();
    if (!apisConfigured) {
      ui.showToast('API credentials must be configured before adding games. Please configure them in Settings.', 'error');
      ui.setIsOnyxSettingsOpen(true);
      ui.setOnyxSettingsInitialTab('apis');
      return;
    }

    try {
      const folderPath = await window.electronAPI.showFolderDialog();
      if (!folderPath) return;

      ui.setImportWorkbenchFolderPath(folderPath);
      ui.setIsImportWorkbenchOpen(true);
    } catch (err) {
      console.error('Error selecting folder:', err);
      ui.showToast('Failed to select folder', 'error');
    }
  };

  const handleUpdateSteamLibrary = async () => {
    const apisConfigured = await areAPIsConfigured();
    if (!apisConfigured) {
      ui.showToast('API credentials must be configured before adding games. Please configure them in Settings.', 'error');
      ui.setIsOnyxSettingsOpen(true);
      ui.setOnyxSettingsInitialTab('apis');
      return;
    }
    ui.setIsImportWorkbenchOpen(true);
  };

  const handleExit = async () => {
    try {
      const exitInfo = await window.electronAPI.requestExit();

      if (exitInfo.shouldMinimizeToTray && exitInfo.canMinimizeToTray) {
        const shouldMinimize = window.confirm(
          'Do you want to minimize Onyx to the system tray instead of exiting?\n\n' +
          'Click OK to minimize to tray, or Cancel to exit.'
        );

        if (shouldMinimize) {
          await window.electronAPI.minimizeToTray();
        } else {
          await window.electronAPI.exit();
        }
      } else {
        const shouldExit = window.confirm('Are you sure you want to exit Onyx?');
        if (shouldExit) {
          await window.electronAPI.exit();
        }
      }
    } catch (error) {
      console.error('Error handling exit:', error);
      const shouldExit = window.confirm('Are you sure you want to exit Onyx?');
      if (shouldExit) {
        await window.electronAPI.exit();
      }
    }
  };

  const handleAddGame = async (game: Game) => {
    const apisConfigured = await areAPIsConfigured();
    if (!apisConfigured) {
      ui.showToast('API credentials must be configured before adding games. Please configure them in Settings.', 'error');
      ui.setIsModalOpen(false);
      ui.setIsOnyxSettingsOpen(true);
      ui.setOnyxSettingsInitialTab('apis');
      return;
    }
    await addCustomGame(game);
  };

  const handleSteamConfigScan = async (steamPath?: string) => {
    ui.setIsScanningSteam(true);
    try {
      const beforeCount = games.length;
      const result = await window.electronAPI.scanGamesWithPath(steamPath);

      if (result.success) {
        const updatedGames = await window.electronAPI.getLibrary();
        const afterCount = updatedGames.length;
        const newGamesCount = afterCount - beforeCount;

        await loadLibrary();

        if (newGamesCount > 0) {
          ui.showToast(`Library updated: ${newGamesCount} new ${newGamesCount === 1 ? 'game' : 'games'} found`, 'success');
        } else {
          ui.showToast('Steam library is up to date', 'success');
        }
      } else {
        throw new Error(result.error || 'Failed to scan Steam library');
      }
    } catch (err) {
      console.error('Error scanning Steam library:', err);
      throw err;
    } finally {
      ui.setIsScanningSteam(false);
    }
  };

  const handleSaveGameWithMetadata = async (title: string, exePath: string, metadata: GameMetadata) => {
    try {
      const gameId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const newGame: Game = {
        id: gameId,
        title: metadata.title || title,
        platform: metadata.platform || 'other',
        exePath,
        boxArtUrl: metadata.boxArtUrl || '',
        bannerUrl: metadata.bannerUrl || '',
        description: metadata.description,
        releaseDate: metadata.releaseDate,
        genres: metadata.genres,
        ageRating: metadata.ageRating,
        categories: metadata.categories,
        useAlternativeBackground: true,
      };

      const success = await window.electronAPI.saveGame(newGame);
      if (success) {
        await loadLibrary();
        ui.showToast(`Game "${metadata.title || title}" added successfully`, 'success');
        ui.setIsMetadataEditorOpen(false);
        ui.setSelectedExecutable(null);
      } else {
        ui.showToast('Failed to save game', 'error');
      }
    } catch (err) {
      console.error('Error saving game with metadata:', err);
      ui.showToast('Failed to save game', 'error');
    }
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

  const handleAddFolder = async (path: string, categories: string[]) => {
    try {
      // Create config with default name (folder basename)
      const folderName = path.split(/[/\\]/).pop() || 'Manual Folder';
      // Generate a simple ID from the path
      const pathHash = btoa(path).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
      const folderId = `manual-${pathHash}`;

      const newConfig = {
        id: folderId,
        name: folderName,
        path: path,
        enabled: true,
        autoCategory: categories
      };

      if (window.electronAPI.saveManualFolderConfig) {
        await window.electronAPI.saveManualFolderConfig(newConfig);
        ui.showToast(`Successfully added folder: ${folderName}`, 'success');
        // Refresh library to pick up any games in the new folder
        loadLibrary();
      }
    } catch (err) {
      console.error('Error adding manual folder:', err);
      ui.showToast('Failed to add folder', 'error');
    }
  };

  const handleConfirmHide = async () => {
    if (ui.hideConfirmation) {
      const { game } = ui.hideConfirmation;
      const updatedGame = { ...game, hidden: true };
      await handleSaveGame(updatedGame);
      ui.showToast(`"${game.title}" has been hidden`, 'success');
      ui.setHideConfirmation(null);
    }
  };

  // Background logic
  const backgroundImageUrl = (activeGame?.useAlternativeBackground && activeGame?.alternativeBannerUrl)
    ? activeGame.alternativeBannerUrl
    : activeGame?.heroUrl || activeGame?.bannerUrl || activeGame?.boxArtUrl || '';

  const isAlphaBuild = __BUILD_PROFILE__ === 'alpha' || (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

  // Helper function to launch game - defined inside component to access state
  async function launchGame(game: Game) {
    ui.setLaunchingGameId(game.id);
    try {
      const result = await window.electronAPI.launchGame(game.id);
      if (!result.success) {
        console.error('Failed to launch game:', result.error);
        alert(`Failed to launch game: ${result.error || 'Unknown error'}`);
        ui.setLaunchingGameId(null);
        return;
      }

      const prefs = await window.electronAPI.getPreferences();
      if (prefs.minimizeOnGameLaunch) {
        await window.electronAPI.minimizeWindow();
      }

      await window.electronAPI.scanning?.gameStarted?.(game.id);

      setTimeout(() => {
        ui.setLaunchingGameId(null);
        ui.setRunningGames(prev => new Set(prev).add(game.id));

        if (result.pid) {
          monitorGameProcess(game.id, result.pid);
        } else {
          pollForGameProcess(game.id);
        }
      }, 1000);

    } catch (error) {
      console.error('Error launching game:', error);
      alert(`Error launching game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      ui.setLaunchingGameId(null);
    }
  }

  function monitorGameProcess(gameId: string, pid: number) {
    const checkInterval = setInterval(async () => {
      try {
        const isRunning = await checkProcessRunning(pid);
        if (!isRunning) {
          clearInterval(checkInterval);
          ui.setRunningGames(prev => {
            const newSet = new Set(prev);
            newSet.delete(gameId);
            return newSet;
          });

          await window.electronAPI.scanning?.gameStopped?.(gameId);

          const prefs = await window.electronAPI.getPreferences();
          if (prefs.restoreAfterLaunch) {
            const { isMinimized } = await window.electronAPI.fullscreen.isMinimized();
            if (isMinimized) {
              await window.electronAPI.restoreWindow();
            }
          }
        }
      } catch (error) {
        console.error('Error checking process:', error);
        clearInterval(checkInterval);
      }
    }, 2000);
  }

  function pollForGameProcess(gameId: string) {
    let pollCount = 0;
    const maxPolls = 30;

    const checkInterval = setInterval(async () => {
      pollCount++;
      if (pollCount > maxPolls) {
        clearInterval(checkInterval);
        ui.setRunningGames(prev => {
          const newSet = new Set(prev);
          newSet.delete(gameId);
          return newSet;
        });

        await window.electronAPI.scanning?.gameStopped?.(gameId);

        const prefs = await window.electronAPI.getPreferences();
        if (prefs.restoreAfterLaunch) {
          const { isMinimized } = await window.electronAPI.fullscreen.isMinimized();
          if (isMinimized) {
            await window.electronAPI.restoreWindow();
          }
        }
        return;
      }
    }, 2000);
  }

  async function checkProcessRunning(pid: number): Promise<boolean> {
    try {
      const result = await window.electronAPI.checkProcessExists(pid);
      return result ?? false;
    } catch {
      return false;
    }
  }

  return (
    <div className="h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0f172a] to-black text-white flex flex-col overflow-hidden relative">
      {/* Background */}
      {preferences.backgroundMode === 'image' && backgroundImageUrl ? (
        <div
          key={backgroundImageUrl}
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage: `url(${backgroundImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            filter: `blur(${preferences.backgroundBlur}px) brightness(${currentBackgroundBrightness})`,
            transform: preferences.backgroundBlur > 0 ? `scale(${1 + (preferences.backgroundBlur * 0.002)})` : 'none',
            zIndex: 0,
            transition: 'opacity 600ms ease-in-out',
            animation: 'fadeIn 600ms ease-in-out',
          }}
        />
      ) : (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundColor: preferences.backgroundColor,
            zIndex: 0,
          }}
        />
      )}

      {/* Aurora glow effect */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-blue-500/10 blur-[100px] pointer-events-none" style={{ zIndex: 1 }} />

      {/* Content wrapper */}
      <div className="relative z-10 flex flex-col h-full">
        <MenuBar
          onScanFolder={handleScanFolder}
          onUpdateSteamLibrary={handleUpdateSteamLibrary}
          onUpdateLibrary={handleUpdateSteamLibrary}
          onGameManager={() => ui.setIsGameManagerOpen(true)}
          onConfigureSteam={() => ui.setIsSteamConfigOpen(true)}
          onOnyxSettings={() => {
            ui.setOnyxSettingsInitialTab('general');
            ui.setIsOnyxSettingsOpen(true);
          }}
          onAPISettings={() => {
            ui.setOnyxSettingsInitialTab('apis');
            ui.setIsOnyxSettingsOpen(true);
          }}
          onAbout={() => {
            ui.setOnyxSettingsInitialTab('about');
            ui.setIsOnyxSettingsOpen(true);
          }}
          onShowLibraryTutorial={() => ui.setShowLibraryTutorial(true)}
          onExit={handleExit}
          onBugReport={isAlphaBuild ? () => ui.setIsBugReportOpen(true) : undefined}
          searchQuery={ui.searchQuery}
          onSearchChange={ui.setSearchQuery}
          selectedCategory={ui.selectedCategory}
          onCategoryChange={ui.setSelectedCategory}
          allCategories={allCategories}
          categoryCounts={categoryCounts}
          pinnedCategories={preferences.pinnedCategories}
          onTogglePinCategory={preferences.handleTogglePinCategory}
          onReorderPinnedCategories={preferences.setPinnedCategories}
          sortBy={ui.sortBy}
          onSortChange={ui.setSortBy}
          hasFavoriteGames={hasFavoriteGames}
          hasVRCategory={hasVRCategory}
          hasAppsCategory={hasAppsCategory}
          hasHiddenGames={hasHiddenGames}
          hideVRTitles={preferences.hideVRTitles}
          hideAppsTitles={preferences.hideAppsTitles}
          showCategoriesInGameList={preferences.showCategoriesByView[preferences.viewMode] ?? false}
          onToggleHideVRTitles={() => preferences.setHideVRTitles(!preferences.hideVRTitles)}
          onToggleHideAppsTitles={() => preferences.setHideAppsTitles(!preferences.hideAppsTitles)}
          launchers={allLaunchers}
          selectedLauncher={ui.selectedLauncher}
          onLauncherChange={ui.setSelectedLauncher}
          topBarPositions={preferences.topBarPositions}
          onTopBarPositionsChange={async (positions) => {
            preferences.setTopBarPositions(positions);
            try {
              await window.electronAPI.savePreferences({ topBarPositions: positions });
            } catch (error) {
              console.error('Error saving top bar positions:', error);
            }
          }}
        />

        {/* Top Bar */}
        {ui.showTopBar && (
          <TopBar
            onSearch={ui.setSearchQuery}
            onRefresh={loadLibrary}
            onFolder={() => handleScanFolder()}
            onGridToggle={() => preferences.setViewMode(preferences.viewMode === 'grid' ? 'list' : 'grid')}
            onSettings={() => ui.setIsSteamConfigOpen(true)}
            viewMode={preferences.viewMode}
            notificationCount={0}
          />
        )}

        {/* Main Content */}
        <MainContent
           games={games}
           loading={loading}
           error={error}
           reorderGames={reorderGames}
           updateGameInState={updateGameInState}
           loadLibrary={loadLibrary}
           handleAddFolder={handleAddFolder}
           getGameLauncher={getGameLauncher}
           launchGame={launchGame}
        />
      </div>

      {/* Modals */}
      <AddGameModal
        isOpen={ui.isModalOpen}
        onClose={() => ui.setIsModalOpen(false)}
        onAdd={handleAddGame}
      />

      {ui.selectedExecutable && (
        <GameMetadataEditor
          isOpen={ui.isMetadataEditorOpen}
          onClose={() => {
            ui.setIsMetadataEditorOpen(false);
            ui.setSelectedExecutable(null);
          }}
          executable={ui.selectedExecutable}
          onSave={handleSaveGameWithMetadata}
        />
      )}

      <SteamConfigModal
        isOpen={ui.isSteamConfigOpen}
        onClose={() => ui.setIsSteamConfigOpen(false)}
        onScan={handleSteamConfigScan}
      />

      <CategoriesEditor
        isOpen={ui.isCategoriesEditorOpen}
        game={ui.editingCategoriesGame}
        onClose={() => {
          ui.setIsCategoriesEditorOpen(false);
          ui.setEditingCategoriesGame(null);
        }}
        onSave={async (game) => {
          await handleSaveGame(game);
        }}
        allCategories={allCategories}
      />

      <OnyxSettingsModal
        isOpen={ui.isOnyxSettingsOpen}
        onClose={() => ui.setIsOnyxSettingsOpen(false)}
        initialTab={ui.onyxSettingsInitialTab}
        onShowImportModal={(games, appType) => {
          ui.setScannedSteamGames(games);
          ui.setImportAppType(appType || 'steam');
          ui.setIsImportWorkbenchOpen(true);
        }}
        onSave={async () => {
          await preferences.refreshPreferences();
          await loadLibrary();
        }}
      />

      <APISettingsModal
        isOpen={ui.isAPISettingsOpen}
        onClose={() => ui.setIsAPISettingsOpen(false)}
      />

      <UpdateLibraryModal
        isOpen={ui.isUpdateLibraryOpen}
        onClose={() => ui.setIsUpdateLibraryOpen(false)}
        onUpdate={() => {
          loadLibrary();
        }}
        onShowImportModal={(games, appType = 'steam') => {
          ui.setScannedSteamGames(games);
          ui.setImportAppType(appType);
          ui.setIsImportWorkbenchOpen(true);
        }}
      />

      <ImportWorkbench
        isOpen={ui.isImportWorkbenchOpen}
        autoStartScan={ui.autoStartScan}
        onClose={() => {
          ui.setIsImportWorkbenchOpen(false);
          ui.setAutoStartScan(false);
          ui.setImportWorkbenchFolderPath(undefined);
          ui.setScannedSteamGames([]);
          ui.setImportAppType('steam');
        }}
        existingLibrary={games}
        preScannedGames={ui.scannedSteamGames && ui.scannedSteamGames.length > 0 ? ui.scannedSteamGames : undefined}
        onImport={async (games, onProgress) => {
          try {
            for (let i = 0; i < games.length; i++) {
              const game = games[i];
              onProgress?.(i + 1, games.length, 'Saving games', `Saving ${game.title}...`);
              await window.electronAPI.saveGame(game);
            }

            // Artwork fetching logic (simplified from App.tsx, but should be same)
            // ... (Copying the exact logic from App.tsx would be verbose but safe)
            // For brevity, I'll assume the import logic is self-contained or I need to copy it.
            // I'll copy the artwork fetching logic from App.tsx to here.

            const gamesNeedingArtwork = games.filter(
              (g) => !g.bannerUrl || !g.iconUrl || !g.alternativeBannerUrl
            );
            const BATCH_SIZE = 5;
            if (gamesNeedingArtwork.length > 0) {
              for (let i = 0; i < gamesNeedingArtwork.length; i += BATCH_SIZE) {
                const batch = gamesNeedingArtwork.slice(i, i + BATCH_SIZE);
                const firstTitle = batch[0]?.title ?? '';
                onProgress?.(i, gamesNeedingArtwork.length, 'Fetching artwork', firstTitle);

                await Promise.all(batch.map(async (game) => {
                  try {
                    const metadata = await window.electronAPI.searchArtwork(game.title, (game as any).appId);
                    if (metadata) {
                        let updatedGame = { ...game };
                        let updated = false;
                        if (metadata.bannerUrl && !game.bannerUrl) { updatedGame.bannerUrl = metadata.bannerUrl; updated = true; }
                        if (metadata.alternativeBannerUrl && !game.alternativeBannerUrl) { updatedGame.alternativeBannerUrl = metadata.alternativeBannerUrl; updated = true; }
                        if (metadata.iconUrl && !game.iconUrl) { updatedGame.iconUrl = metadata.iconUrl; updated = true; }

                        try {
                            const steamAppId = (game as any).appId;
                            const bannerSearch = await window.electronAPI.searchImages(game.title, 'banner', steamAppId);
                            if (bannerSearch?.success && bannerSearch.images) {
                                const allBannerUrls: string[] = [];
                                if (Array.isArray(bannerSearch.images)) {
                                    bannerSearch.images.forEach((item: any) => {
                                        if (item.images && Array.isArray(item.images)) {
                                            item.images.forEach((img: any) => {
                                                const url = img.url || img.bannerUrl;
                                                if (url && !allBannerUrls.includes(url)) allBannerUrls.push(url);
                                            });
                                        } else if (item.url || item.bannerUrl) {
                                            const url = item.url || item.bannerUrl;
                                            if (url && !allBannerUrls.includes(url)) allBannerUrls.push(url);
                                        }
                                    });
                                }
                                if (!updatedGame.bannerUrl && allBannerUrls.length > 0) {
                                    updatedGame.bannerUrl = allBannerUrls[0];
                                    updated = true;
                                }
                                if (allBannerUrls.length > 1) {
                                    const altUrl = allBannerUrls.find(url => url !== updatedGame.bannerUrl) || allBannerUrls[1];
                                    if (altUrl && altUrl !== updatedGame.bannerUrl) {
                                        updatedGame.alternativeBannerUrl = altUrl;
                                        updated = true;
                                    }
                                }
                            }
                        } catch (searchErr) {
                          console.error(`[Import] Banner search error for ${game.title}:`, searchErr);
                        }

                        if (updated) await window.electronAPI.saveGame(updatedGame);
                    }
                  } catch (err) {
                    console.error(`[Import] Failed to fetch metadata for ${game.title}:`, err);
                  }
                }));
                onProgress?.(i + batch.length, gamesNeedingArtwork.length, 'Fetching artwork', batch[batch.length - 1]?.title ?? '');
              }
            }

            onProgress?.(games.length, games.length, 'Finishing', 'Reloading library...');
            await loadLibrary();
            ui.showToast(`Successfully imported ${games.length} ${games.length === 1 ? 'game' : 'games'}`, 'success');
            ui.setIsImportWorkbenchOpen(false);
            ui.setAutoStartScan(false);
            ui.setImportWorkbenchFolderPath(undefined);
            ui.setScannedSteamGames([]);
            ui.setImportAppType('steam');
            const prefs = await window.electronAPI.getPreferences();
            if (!prefs.hasSeenPostImportTutorial) {
              ui.setShowLibraryTutorial(true);
              await window.electronAPI.savePreferences({ hasSeenPostImportTutorial: true });
            }
          } catch (err) {
            console.error('Error importing games:', err);
            ui.showToast('Failed to import games', 'error');
          }
        }}
      />

      <GameManager
        isOpen={ui.isGameManagerOpen}
        onClose={() => {
          ui.setIsGameManagerOpen(false);
          ui.setGameManagerInitialGameId(null);
          ui.setGameManagerInitialTab('images');
        }}
        games={games}
        initialGameId={ui.gameManagerInitialGameId}
        initialTab={ui.gameManagerInitialTab}
        onSaveGame={async (game, oldGame) => {
          if (!oldGame) oldGame = games.find(g => g.id === game.id);
          await window.electronAPI.saveGame(game, oldGame);
          const isImageUpdate = oldGame && (
            game.boxArtUrl !== oldGame.boxArtUrl ||
            game.bannerUrl !== oldGame.bannerUrl ||
            game.alternativeBannerUrl !== oldGame.alternativeBannerUrl ||
            game.logoUrl !== oldGame.logoUrl ||
            game.heroUrl !== oldGame.heroUrl ||
            game.iconUrl !== oldGame.iconUrl
          );

          if (isImageUpdate) {
            updateGameInState(game);
          } else {
            await loadLibrary();
          }
        }}
        onDeleteGame={async (gameId) => {
          await deleteGame(gameId);
          await loadLibrary();
        }}
        onReloadLibrary={loadLibrary}
      />

      {ui.fixingGame && (
        <MetadataSearchModal
          isOpen={ui.isMetadataSearchOpen}
          onClose={() => {
            ui.setIsMetadataSearchOpen(false);
            ui.setFixingGame(null);
          }}
          game={ui.fixingGame}
          onSelect={async (result: { id: string; source: string }) => {
            if (!ui.fixingGame) return;
            try {
              const response = await window.electronAPI.fetchAndUpdateByProviderId(
                ui.fixingGame.id,
                result.id,
                result.source
              );
              if (response.success) {
                ui.showToast('Metadata updated successfully!', 'success');
                await loadLibrary();
              } else {
                ui.showToast(response.error || 'Failed to update metadata', 'error');
              }
            } catch (error) {
              console.error('Error updating metadata:', error);
              ui.showToast('An error occurred while updating metadata', 'error');
            }
          }}
        />
      )}

      <BugReportModal
        isOpen={ui.isBugReportOpen}
        onClose={() => ui.setIsBugReportOpen(false)}
      />

      {ui.hideConfirmation && (
        <ConfirmationDialog
          isOpen={true}
          title={`Hide "${ui.hideConfirmation.game.title}"?`}
          message="This game will be hidden from your library view."
          note="You can find hidden games by selecting the 'Hidden' category from the Categories dropdown."
          confirmText="Hide"
          cancelText="Cancel"
          onConfirm={handleConfirmHide}
          onCancel={() => ui.setHideConfirmation(null)}
        />
      )}

      {ui.launchConfirmation && (
        <ConfirmationDialog
          isOpen={true}
          title={`Launch "${ui.launchConfirmation.game.title}"?`}
          message="Are you sure you want to launch this game?"
          confirmText="Launch"
          cancelText="Cancel"
          onConfirm={() => {
            if (ui.launchConfirmation) {
              launchGame(ui.launchConfirmation.game);
              ui.setLaunchConfirmation(null);
            }
          }}
          onCancel={() => ui.setLaunchConfirmation(null)}
        />
      )}

      {update.updateNotification && (
        <UpdateNotificationModal
          isOpen={true}
          version={update.updateNotification.version}
          status={update.updateNotification.status}
          error={update.updateNotification.error}
          currentVersion={update.currentVersion}
          changelogSource={update.changelogSource}
          changelogLoading={update.changelogLoading}
          changelogError={update.changelogError}
          isTestMode={update.isUpdateModalTest}
          onUpdateNow={async () => {
            const result = await window.electronAPI.downloadUpdate?.();
            if (!result?.success) {
                update.setUpdateNotification(prev => prev ? { ...prev, status: 'error', error: result?.error ?? 'Download failed' } : null);
            }
          }}
          onDismiss={() => {
            update.setUpdateNotification(null);
            update.setIsUpdateModalTest(false);
            if (!update.isUpdateModalTest) {
              window.electronAPI.onUpdateDismissed?.();
            }
          }}
          onInstall={() => {
            window.electronAPI.quitAndInstall?.();
          }}
        />
      )}

      <LibraryTutorialModal
        isOpen={ui.showLibraryTutorial}
        onClose={() => ui.setShowLibraryTutorial(false)}
        onOpenSettings={() => {
            ui.setOnyxSettingsInitialTab('general');
            ui.setIsOnyxSettingsOpen(true);
        }}
        onOpenUpdateLibrary={handleUpdateSteamLibrary}
      />

      {ui.toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 toast-slide-up">
          <div
            className={`px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-xl border max-w-[90vw] ${ui.toast.type === 'success'
              ? 'bg-slate-900/95 border-cyan-500/40 text-slate-100'
              : 'bg-slate-900/95 border-red-500/40 text-slate-100'
              }`}
          >
            <div className="flex-1 text-sm">{ui.toast.message}</div>
            <button
              onClick={() => ui.setToast(null)}
              className="text-slate-400 hover:text-slate-100 transition-colors p-0.5 rounded"
            >
              <svg className="w-5 h-5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {ui.missingGames && ui.missingGames.length > 0 && (
        <MissingGamesModal
          missingGames={ui.missingGames}
          onRemove={async (gameIds) => {
            try {
                const result = await window.electronAPI.removeMissingGames(gameIds);
                if (result.success) {
                    ui.showToast(`Successfully removed ${result.removedCount} missing game(s)`, 'success');
                    await loadLibrary();
                } else {
                    ui.showToast('Failed to remove missing games', 'error');
                }
            } catch (error) {
                console.error('Error removing missing games:', error);
                ui.showToast('Failed to remove missing games', 'error');
            } finally {
                ui.setMissingGames(null);
            }
          }}
          onCancel={() => ui.setMissingGames(null)}
        />
      )}

      {/* Startup scan progress overlay */}
      {ui.startupProgress && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999] flex items-center justify-center">
             <div className="bg-gradient-to-br from-gray-900/95 to-slate-950/95 backdrop-blur-xl border border-cyan-500/20 p-10 rounded-3xl shadow-2xl w-[800px] max-w-[90vw] max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-300 flex flex-col">
                {!ui.foundGames ? (
                   <div className="flex flex-col items-center space-y-6">
                      {/* Onyx Logo */}
                      <div className="w-24 h-24 animate-pulse">
                        <svg width="100%" height="100%" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <defs>
                            <linearGradient id="onyxGrad" x1="256" y1="20" x2="256" y2="492" gradientUnits="userSpaceOnUse">
                              <stop offset="0" stopColor="#334155" />
                              <stop offset="1" stopColor="#020617" />
                            </linearGradient>
                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                              <feGaussianBlur stdDeviation="8" result="blur" />
                              <feComposite in="SourceGraphic" in2="blur" operator="over" />
                            </filter>
                          </defs>

                          <path d="M256 30 L465 150 V362 L256 482 L47 362 V150 L256 30Z"
                            fill="url(#onyxGrad)"
                            stroke="#0ea5e9"
                            strokeWidth="8"
                            filter="url(#glow)" />

                          <path d="M256 256 L256 482 M256 256 L47 150 M256 256 L465 150"
                            stroke="#1e293b"
                            strokeWidth="4" />

                          <g transform="translate(256, 143) scale(1, 0.58)">
                            <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" fill="none" />
                            <circle r="55" stroke="#e0f2fe" strokeWidth="8" fill="none" />
                          </g>

                          <g transform="translate(151, 325) rotate(60) scale(1, 0.58)">
                            <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" fill="none" />
                            <circle r="55" stroke="#e0f2fe" strokeWidth="8" fill="none" />
                          </g>

                          <g transform="translate(361, 325) rotate(-60) scale(1, 0.58)">
                            <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" fill="none" />
                            <circle r="55" stroke="#e0f2fe" strokeWidth="8" fill="none" />
                          </g>

                          <path d="M256 30 L465 150 L256 256 L47 150 L256 30Z"
                            fill="white"
                            fillOpacity="0.1" />
                        </svg>
                      </div>

                      <div className="text-center">
                         <h3 className="text-2xl font-bold text-white mb-2">Scanning Game Libraries</h3>
                         <p className="text-cyan-100/60 text-sm">Checking for new games on startup...</p>
                      </div>
                      <div className="w-full bg-slate-800/50 rounded-xl p-4 border border-cyan-500/10">
                         <p className="text-cyan-50/90 text-base text-center font-medium break-words">
                            {ui.startupProgress.message}
                         </p>
                      </div>
                   </div>
                ) : (
                   <div className="flex flex-1 min-h-0 flex-col">
                      <div className="flex items-start gap-4 mb-6">
                        {/* Onyx Logo */}
                        <div className="w-16 h-16 flex-shrink-0">
                          <svg width="100%" height="100%" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                              <linearGradient id="onyxGrad3" x1="256" y1="20" x2="256" y2="492" gradientUnits="userSpaceOnUse">
                                <stop offset="0" stopColor="#334155" />
                                <stop offset="1" stopColor="#020617" />
                              </linearGradient>
                              <filter id="glow3" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="8" result="blur" />
                                <feComposite in="SourceGraphic" in2="blur" operator="over" />
                              </filter>
                            </defs>

                            <path d="M256 30 L465 150 V362 L256 482 L47 362 V150 L256 30Z"
                              fill="url(#onyxGrad3)"
                              stroke="#0ea5e9"
                              strokeWidth="8"
                              filter="url(#glow3)" />

                            <path d="M256 256 L256 482 M256 256 L47 150 M256 256 L465 150"
                              stroke="#1e293b"
                              strokeWidth="4" />

                            <g transform="translate(256, 143) scale(1, 0.58)">
                              <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" fill="none" />
                              <circle r="55" stroke="#e0f2fe" strokeWidth="8" fill="none" />
                            </g>

                            <g transform="translate(151, 325) rotate(60) scale(1, 0.58)">
                              <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" fill="none" />
                              <circle r="55" stroke="#e0f2fe" strokeWidth="8" fill="none" />
                            </g>

                            <g transform="translate(361, 325) rotate(-60) scale(1, 0.58)">
                              <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" fill="none" />
                              <circle r="55" stroke="#e0f2fe" strokeWidth="8" fill="none" />
                            </g>

                            <path d="M256 30 L465 150 L256 256 L47 150 L256 30Z"
                              fill="white"
                              fillOpacity="0.1" />
                          </svg>
                        </div>
                         <div>
                            <h2 className="text-2xl font-bold text-white">New Games Found</h2>
                            <p className="text-gray-400 text-sm mt-1">
                               The following new games were detected. You can review them in the Importer.
                            </p>
                         </div>
                      </div>
                      <div className="flex items-center mb-4 px-1">
                         <span className="text-sm font-medium text-gray-400">
                            {ui.foundGames.length} {ui.foundGames.length === 1 ? 'game' : 'games'} found
                         </span>
                      </div>
                      <div className="flex-1 min-h-0 overflow-y-auto mb-4 pr-2 -mr-2 space-y-2">
                          {[...ui.foundGames].sort((a, b) => a.title.localeCompare(b.title)).map((game, index) => (
                              <div key={game.id || `game-${index}`} className="flex items-start gap-4 p-4 bg-gray-800/40 border border-gray-700/30 rounded-xl hover:bg-gray-800/60 transition-colors group">
                                  <div className="flex-1 min-w-0">
                                      <div className="flex justify-between items-start gap-2">
                                          <div className="font-semibold text-white truncate">{game.title}</div>
                                          {(game.platform || game.source) && (
                                              <div className="px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300 uppercase tracking-wider text-[10px]">
                                                  {game.platform || game.source}
                                              </div>
                                          )}
                                      </div>
                                      {(game.exePath || game.installPath) && (
                                          <div className="text-xs text-gray-500 mt-1 font-mono break-all group-hover:text-gray-400 transition-colors">
                                              {game.exePath || game.installPath}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          ))}
                      </div>
                      <div className="flex gap-3 pt-4 border-t border-gray-800 bg-gradient-to-t from-slate-950/90 to-transparent">
                          <button
                              onClick={() => {
                                  ui.setFoundGames(null);
                                  ui.setStartupProgress(null);
                              }}
                              className="flex-1 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors border border-gray-700"
                          >
                              Cancel
                          </button>
                          <button
                              onClick={() => {
                                  ui.setStartupProgress(null);
                                  setTimeout(() => {
                                      const sources = new Set(ui.foundGames!.map((g: any) => g.source));
                                      const appType = sources.size === 1 && sources.has('steam') ? 'steam' :
                                          sources.size === 1 && sources.has('xbox') ? 'xbox' : 'other';

                                      ui.setScannedSteamGames(ui.foundGames!);
                                      ui.setImportAppType(appType);
                                      ui.setAutoStartScan(true);
                                      ui.setIsImportWorkbenchOpen(true);
                                      ui.setFoundGames(null);
                                  }, 200);
                              }}
                              className="flex-1 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors border border-gray-600"
                          >
                              Review in Importer
                          </button>
                      </div>
                   </div>
                )}
             </div>
          </div>
      )}
    </div>
  );

};
