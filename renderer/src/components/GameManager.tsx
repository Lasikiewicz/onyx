import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Game } from '../types/game';
import { MatchFixDialog } from './MatchFixDialog';
import { RefreshMetadataDialog } from './RefreshMetadataDialog';
import { BoxartFixDialog } from './BoxartFixDialog';
import { ImageContextMenu } from './ImageContextMenu';
import { LauncherIcon, getLauncherDisplayName, normalizeLauncherId } from '../utils/launcherIcons';
import type { OptimizationStatus } from '../types/optimization';
import {
  isWebmAssetUrl,
} from './gameManager/imageSearchUtils';
import { GameManagerImagesTab } from './gameManager/GameManagerImagesTab';
import { GameManagerMetadataTab } from './gameManager/GameManagerMetadataTab';
import { GameManagerLinksTab } from './gameManager/GameManagerLinksTab';
import { GameManagerModManagerTab } from './gameManager/GameManagerModManagerTab';
import { LinkIconPickerDialog } from './gameManager/LinkIconPickerDialog';
import { GameManagerRefreshConfirmDialog } from './gameManager/GameManagerRefreshConfirmDialog';
import { GameManagerRefreshProgressDialog } from './gameManager/GameManagerRefreshProgressDialog';
import { GameManagerMaintenanceDialogs } from './gameManager/GameManagerMaintenanceDialogs';
import { useGameManagerMaintenance } from './gameManager/useGameManagerMaintenance';
import { useGameManagerMetadata } from './gameManager/useGameManagerMetadata';
import { useGameManagerImageSearch } from './gameManager/useGameManagerImageSearch';
import { useGameManagerRefresh } from './gameManager/useGameManagerRefresh';

interface GameManagerProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  onSaveGame: (game: Game, oldGame?: Game) => Promise<void>;
  onDeleteGame?: (gameId: string) => Promise<void>;
  onReloadLibrary?: () => Promise<void>;
  initialGameId?: string | null;
  initialTab?: 'metadata' | 'images' | 'links' | 'modManager';
  /** Open the Game Importer to run metadata refresh (nuclear / images only / links only). Single source of truth. */
  onOpenImporterWithMode?: (mode: 'nuclear' | 'images' | 'links') => void;
  /** Open the optimizer queue modal (e.g. after starting "Optimize all"). */
  onRequestOptimizer?: () => void;
}

export const GameManager: React.FC<GameManagerProps> = ({
  isOpen,
  onClose,
  games,
  onSaveGame,
  onDeleteGame,
  onReloadLibrary,
  initialGameId = null,
  initialTab = 'metadata',
  onOpenImporterWithMode,
  onRequestOptimizer,
}) => {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [editedGame, setEditedGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'images' | 'metadata' | 'links' | 'modManager'>(initialTab);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon' } | null>(null);
  const [gameListView, setGameListView] = useState<'boxart' | 'icon' | 'text'>('boxart');
  const [isRefreshingLinks, setIsRefreshingLinks] = useState(false);
  const [foundLinks, setFoundLinks] = useState<Array<{ name: string; url: string }> | null>(null);
  const [linkIconPopupIndex, setLinkIconPopupIndex] = useState<number | null>(null);
  const [optimizationStatus, setOptimizationStatus] = useState<OptimizationStatus | null>(null);
  const [showUploadWebmTypePicker, setShowUploadWebmTypePicker] = useState(false);
  const [showUploadWebmInstructions, setShowUploadWebmInstructions] = useState(false);
  const [uploadWebmTargetType, setUploadWebmTargetType] = useState<'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon' | null>(null);
  const imageChangedGameIdsRef = useRef<Set<string>>(new Set());
  const hasOptimizationActivity = optimizationStatus?.hasActivity ?? false;
  const hasOptimizationReport = (optimizationStatus?.jobs?.length ?? 0) > 0;
  const showOptimizationIndicator = hasOptimizationActivity || hasOptimizationReport;

  // Refs to track current state for async IPC events
  const selectedGameIdRef = React.useRef(selectedGameId);
  const gameListPlaceholderUrl = useMemo(() => new URL('onyx-logo.svg', window.location.href).href, []);

  useEffect(() => {
    selectedGameIdRef.current = selectedGameId;
  }, [selectedGameId]);


  // Optimizer status for top-bar report shortcut inside Game Manager
  useEffect(() => {
    window.electronAPI.optimization?.getStatus?.()
      .then((status: unknown) => setOptimizationStatus(status as OptimizationStatus))
      .catch(() => { });

    const unsub = window.electronAPI.optimization?.onStatus?.((status: unknown) => {
      setOptimizationStatus(status as OptimizationStatus);
    });

    return () => {
      unsub?.();
    };
  }, []);

  // Load game list view from preferences
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await window.electronAPI.getPreferences();
        if (prefs.listViewOptions?.displayMode) {
          const displayMode = prefs.listViewOptions.displayMode;
          if (displayMode === 'boxart-title') setGameListView('boxart');
          else if (displayMode === 'logo-title') setGameListView('icon');
          else if (displayMode === 'title-only') setGameListView('text');
        }
      } catch (error) {
        console.error('Failed to load preferences:', error);
      }
    };
    loadPreferences();
  }, []);

  // Save game list view to preferences
  useEffect(() => {
    const savePreferences = async () => {
      try {
        const prefs = await window.electronAPI.getPreferences();
        const displayMode = gameListView === 'boxart' ? 'boxart-title' : gameListView === 'icon' ? 'logo-title' : 'title-only';
        await window.electronAPI.savePreferences({
          ...prefs,
          listViewOptions: {
            ...prefs.listViewOptions,
            displayMode,
            showDescription: prefs.listViewOptions?.showDescription ?? true,
            showCategories: prefs.listViewOptions?.showCategories ?? true,
            showPlaytime: prefs.listViewOptions?.showPlaytime ?? true,
            showReleaseDate: prefs.listViewOptions?.showReleaseDate ?? false,
            showGenres: prefs.listViewOptions?.showGenres ?? false,
            showPlatform: prefs.listViewOptions?.showPlatform ?? false,
          }
        });
      } catch (error) {
        console.error('Failed to save preferences:', error);
      }
    };
    savePreferences();
  }, [gameListView]);



  // Maintain local games state to prevent refresh issues
  const [localGames, setLocalGames] = useState<Game[]>(games);

  const selectedGame = useMemo(() => {
    return localGames.find(g => g.id === selectedGameId) || null;
  }, [localGames, selectedGameId]);

  const expandedGame = useMemo(() => {
    return localGames.find(g => g.id === expandedGameId) || null;
  }, [localGames, expandedGameId]);

  const {
    showImageSearch,
    imageSearchQuery,
    setImageSearchQuery,
    isSearchingImages,
    isFastSearching,
    fastSearchResults,
    selectedFastGame,
    activeImageSearchTab,
    providerProgress,
    providerFilter,
    setProviderFilter,
    orderedResultsByType,
    resetImageWorkflow,
    getRenderableImageUrl,
    handleImageResultLoadError,
    handleClearImageSearchState,
    handleOpenGoogleImageSearch,
    handleImageSearchTabChange,
    handleSearchImages,
    openImageSearchAndSearch,
    handleFastSearch,
    handleSelectFastGame,
    handleSelectImage,
    handleBrowseImage,
    hasRawImageResults,
    hasVisibleImageResults,
    getImageCountForProvider,
    getVisibleImageResultCountForTab,
    matchesActiveProviderFilter,
  } = useGameManagerImageSearch({
    selectedGameId,
    selectedGame,
    editedGame,
    onSaveGame,
    setEditedGame,
    setLocalGames,
    setActiveTab,
    setError,
    setSuccess,
    imageChangedGameIdsRef,
  });

  const {
    showRefreshDialog,
    setShowRefreshDialog,
    showRefreshConfirm,
    setShowRefreshConfirm,
    refreshMode,
    setRefreshMode,
    refreshProgress,
    setRefreshProgress,
    isCancellingRefresh,
    showMatchFix,
    unmatchedGames,
    showBoxartFix,
    missingBoxartGames,
    shouldSelectFirstGameAfterRefresh,
    setShouldSelectFirstGameAfterRefresh,
    handleConfirmRefreshAction,
    handleCancelMetadataRefresh,
    handleMatchFix,
    handleCancelMatchFix,
    handleBoxartFix,
    handleCancelBoxartFix,
  } = useGameManagerRefresh({
    games,
    localGames,
    onReloadLibrary,
    onSaveGame,
    onOpenImporterWithMode,
    onOptimizeAllImages: async () => {
      try {
        setError(null);
        setSuccess(null);
        const result = await window.electronAPI.optimizeGames?.({ allGames: true });
        if (!result?.success) {
          setError(result?.error || 'Failed to start image optimization');
          return;
        }
        setShowRefreshDialog(false);
        onRequestOptimizer?.();
        handleCloseManager();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start image optimization');
      }
    },
    setError,
    setSuccess,
  });

  const {
    isSaving,
    showFixMatch,
    metadataSearchQuery,
    metadataSearchResults,
    isSearchingMetadata,
    isApplyingMetadata,
    newCategoryInput,
    setMetadataSearchQuery,
    setNewCategoryInput,
    resetMetadataWorkflow,
    handleSave,
    handleFixMatchSearch,
    handleSelectMetadataMatch,
    handleToggleFixMatch,
    handleCancelEditing,
  } = useGameManagerMetadata({
    editedGame,
    selectedGame,
    expandedGame,
    onSaveGame,
    onReloadLibrary,
    setEditedGame,
    setExpandedGameId,
    setSelectedGameId,
    setError,
    setSuccess,
  });

  // ALWAYS keep the game list sorted alphabetically by title
  const sortedLocalGames = useMemo(() => {
    return [...localGames].sort((a, b) => a.title.localeCompare(b.title));
  }, [localGames]);

  // Update editedGame when selectedGame changes (e.g., after library reload)
  useEffect(() => {
    if (selectedGame && editedGame && selectedGame.id === editedGame.id) {
      const hasChanges =
        selectedGame.boxArtUrl !== editedGame.boxArtUrl ||
        selectedGame.bannerUrl !== editedGame.bannerUrl ||
        selectedGame.logoUrl !== editedGame.logoUrl;

      if (hasChanges) {
        setEditedGame({
          ...selectedGame,
          // Preserve *IsVideo from editedGame when selectedGame doesn't have them (e.g. library not yet refreshed after webm upload)
          boxArtIsVideo: selectedGame.boxArtIsVideo ?? editedGame.boxArtIsVideo,
          bannerIsVideo: selectedGame.bannerIsVideo ?? editedGame.bannerIsVideo,
          alternativeBannerIsVideo: selectedGame.alternativeBannerIsVideo ?? editedGame.alternativeBannerIsVideo,
          logoIsVideo: selectedGame.logoIsVideo ?? editedGame.logoIsVideo,
          heroIsVideo: selectedGame.heroIsVideo ?? editedGame.heroIsVideo,
          iconIsVideo: selectedGame.iconIsVideo ?? editedGame.iconIsVideo,
        });
      }
    }
  }, [selectedGame?.boxArtUrl, selectedGame?.bannerUrl, selectedGame?.logoUrl, selectedGame?.id]);

  // Sync local games with prop when modal opens or games change significantly
  useEffect(() => {
    if (isOpen) {
      // Sort games alphabetically by title
      const sortedGames = [...games].sort((a, b) => a.title.localeCompare(b.title));
      setLocalGames(sortedGames);
      // Set initial game and tab when modal first opens
      if (initialGameId && !selectedGameId) {
        setSelectedGameId(initialGameId);
        const game = games.find((g: Game) => g.id === initialGameId);
        if (game) {
          setEditedGame({ ...game });
          setExpandedGameId(initialGameId);
        }
      }
      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialGameId, initialTab, games]);

  // Reset search state when selected game changes (do not switch tab; respect initialTab / user choice)
  useEffect(() => {
    if (selectedGame) {
      resetImageWorkflow();
      resetMetadataWorkflow();
    }
  }, [resetImageWorkflow, resetMetadataWorkflow, selectedGame?.id]);

  // Update local games when prop changes, but preserve selected game and tab
  useEffect(() => {
    if (isOpen) {
      // Only update if the selected game's data has changed
      setLocalGames(prevLocalGames => {
        const currentSelectedGame = prevLocalGames.find(g => g.id === selectedGameId);
        const newSelectedGame = games.find((g: Game) => g.id === selectedGameId);

        if (currentSelectedGame && newSelectedGame) {
          // Check if the game data actually changed before updating
          const gameChanged = JSON.stringify(currentSelectedGame) !== JSON.stringify(newSelectedGame);

          if (gameChanged) {
            // Update the specific game in localGames without replacing the whole array
            const updatedGames = prevLocalGames.map(g => g.id === selectedGameId ? newSelectedGame : g);

            // Only update editedGame if it matches the selected game and hasn't been manually modified
            // Use functional update to access current editedGame state
            setEditedGame(prevEditedGame => {
              if (!prevEditedGame || prevEditedGame.id !== selectedGameId) {
                return prevEditedGame; // Don't update if not the selected game
              }

              // Check if key fields changed
              const keyFieldsChanged =
                currentSelectedGame.title !== newSelectedGame.title ||
                currentSelectedGame.description !== newSelectedGame.description ||
                currentSelectedGame.boxArtUrl !== newSelectedGame.boxArtUrl;

              if (keyFieldsChanged) {
                // Only update if the editedGame matches the old game state (not manually modified)
                if (prevEditedGame.title === currentSelectedGame.title &&
                  prevEditedGame.description === currentSelectedGame.description) {
                  return { ...newSelectedGame };
                }
              }

              return prevEditedGame; // Keep current editedGame if manually modified
            });

            return updatedGames;
          }

          return prevLocalGames; // No change, return previous state
        } else {
          // Full sync only if selected game is not found (game was deleted)
          return games;
        }
      });

      // If we should select first game after refresh, do it now that games are updated
      if (shouldSelectFirstGameAfterRefresh && games.length > 0) {
        const firstGame = games[0];
        setSelectedGameId(firstGame.id);
        setExpandedGameId(firstGame.id);
        setEditedGame({ ...firstGame });
        setActiveTab('metadata');
        setShouldSelectFirstGameAfterRefresh(false);
      }
    }
  }, [games, selectedGameId, isOpen, shouldSelectFirstGameAfterRefresh]);

  // Load games when modal opens - now handled by the localGames sync effect above

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedGameId(null);
      setExpandedGameId(null);
      resetImageWorkflow();
      setEditedGame(null);
      setError(null);
      setSuccess(null);
      resetMetadataWorkflow();
      setActiveTab(initialTab);
      setSelectedGameId(null);
      imageChangedGameIdsRef.current.clear();
    }
  }, [initialTab, isOpen, resetImageWorkflow, resetMetadataWorkflow]);

  const handleCloseManager = async () => {
    const changedGameIds = Array.from(imageChangedGameIdsRef.current);
    imageChangedGameIdsRef.current.clear();

    if (changedGameIds.length > 0 && window.electronAPI.optimizeGames) {
      try {
        await window.electronAPI.optimizeGames({ gameIds: changedGameIds });
      } catch (err) {
        console.warn('[GameManager] Failed to queue optimization for changed images on close:', err);
      }
    }

    onClose();
  };

  // Fetch launcher data for a game
  const handleFetchLauncherData = async (game?: Game) => {
    const targetGame = game || selectedGame;
    if (!targetGame || !targetGame.id.startsWith('steam-')) return;


    try {
      // Extract Steam App ID
      const appIdMatch = targetGame.id.match(/^steam-(.+)$/);
      if (!appIdMatch) return;

      // Sync playtime from Steam
      try {
        const result = await window.electronAPI.syncSteamPlaytime?.();
        if (result?.success) {
          // Don't show notification for playtime sync since it's not actively monitored
          // setSuccess(`Synced playtime for ${result.updatedCount || 0} game(s)`);
          // Reload the game to get updated playtime
          const library = await window.electronAPI.getLibrary();
          const updatedGame = library.find((g: Game) => g.id === targetGame.id);
          if (updatedGame) {
            setEditedGame({ ...updatedGame });
            // Also update the games list if we have it

            // Note: We can't directly update games prop, but editedGame will reflect the change
          }
        } else {
          // Don't show error either since playtime is not critical
          // setError(result?.error || 'Failed to sync playtime');
        }
      } catch (err) {
        console.error('Error syncing playtime:', err);
        setError(err instanceof Error ? err.message : 'Failed to sync playtime');
      } finally {
      }
    } catch (err) {
      console.error('Error fetching launcher data:', err);
    }
  };
  const handleOpenArtworkContextMenu = useCallback((event: { pageX: number; pageY: number }, type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => {
    setContextMenu({ x: event.pageX, y: event.pageY, type });
  }, []);

  // Resolve effective image type for Upload WEBM (current tab or user pick when "All").
  const getUploadWebmType = (): 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon' | null => {
    if (uploadWebmTargetType) return uploadWebmTargetType;
    const tab = activeImageSearchTab;
    if (tab === 'all') return null;
    return tab as 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon';
  };

  // SteamGridDB exact game page when we have Steam App ID; otherwise search URL.
  const getSteamGridDbGameUrl = (): { url: string; isExact: boolean } => {
    const title = editedGame?.title || selectedGame?.title || '';
    const steamAppId = selectedGame?.id?.startsWith('steam-')
      ? selectedGame.id.replace(/^steam-/, '')
      : null;
    if (steamAppId) {
      return { url: `https://www.steamgriddb.com/game/steam/${steamAppId}`, isExact: true };
    }
    return {
      url: `https://www.steamgriddb.com/search/grids?term=${encodeURIComponent(title)}`,
      isExact: false,
    };
  };

  const uploadWebmTypeLabel = (t: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') =>
    t === 'alternativeBanner' ? 'Alt Banner' : t.charAt(0).toUpperCase() + t.slice(1);

  // Open Upload WEBM flow: show type picker when on "All", else show instructions then file picker.
  const handleUploadWebmClick = () => {
    if (!showImageSearch || !selectedGame || !editedGame) return;
    if (activeImageSearchTab === 'all') {
      setUploadWebmTargetType(null);
      setShowUploadWebmTypePicker(true);
      return;
    }
    const type = activeImageSearchTab as 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon';
    setUploadWebmTargetType(type);
    setShowUploadWebmInstructions(true);
  };

  const handleUploadWebmTypePicked = (type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => {
    setShowUploadWebmTypePicker(false);
    setUploadWebmTargetType(type);
    setShowUploadWebmInstructions(true);
  };

  const handleUploadWebmChooseFile = async () => {
    const type = getUploadWebmType();
    setShowUploadWebmInstructions(false);
    setUploadWebmTargetType(null);
    if (!type) return;
    const gameId = selectedGameId ?? editedGame?.id;
    if (!gameId) {
      setError('No game selected');
      return;
    }
    try {
      const imagePath = await (window.electronAPI as any).showImageOrWebmDialog?.();
      if (!imagePath) return;
      if (/\.(webp)$/i.test(imagePath)) {
        setError('WebP files are not supported. Please choose a .webm video or another image format.');
        return;
      }
      // Cache the local file in main process and get an onyx-local URL. Never put file:// in game state
      // so the UI does not try to load it in <img> (blocked / breaks React DOM).
      const cacheLocalFile = (window.electronAPI as any).cacheLocalFile;
      const result = cacheLocalFile
        ? await cacheLocalFile(imagePath, gameId, type)
        : { url: null, isVideo: false, error: 'Local cache API is unavailable in this build.' };
      if (!result?.url) {
        setError(result?.error || 'Failed to add file to cache. Try again.');
        return;
      }
      await handleSelectImage(result.url, type, result.isVideo);
    } catch (err) {
      console.error('Error choosing WEBM file:', err);
      setError('Failed to select file');
    }
  };

  // Handle game selection
  const handleGameSelect = (gameId: string) => {
    setSelectedGameId(gameId);
    // Find game from both localGames and games prop to ensure we get the latest data
    const game = localGames.find(g => g.id === gameId) || games.find(g => g.id === gameId);
    if (game) {
      setEditedGame({ ...game });
      setExpandedGameId(gameId);

      // Reset search states and set default tab
      setActiveTab('metadata');
      resetImageWorkflow();
      setImageSearchQuery(game.title);
      resetMetadataWorkflow();
      setIsRefreshingLinks(false);
      setFoundLinks(null);
      // Update localGames if game was found in games prop but not localGames
      if (!localGames.find(g => g.id === gameId)) {
        setLocalGames(prevGames => [...prevGames, game]);
      }
      // Fetch launcher data if connected
      if (game.id.startsWith('steam-')) {
        handleFetchLauncherData(game);
      }
    }
  };

  const {
    showRemoveDeletedDialog,
    setShowRemoveDeletedDialog,
    missingGames,
    isScanningMissingGames,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isDeleting,
    handleOpenRemoveDialog,
    handleRemoveMissingGames,
    handleDelete,
  } = useGameManagerMaintenance({
    selectedGameId,
    onDeleteGame,
    onReloadLibrary,
    setError,
    setSuccess,
    onDeleted: () => {
      setSelectedGameId(null);
      setEditedGame(null);
      setExpandedGameId(null);
    },
  });

  const handleRefreshLinks = async () => {
    if (!editedGame) {
      return;
    }

    setIsRefreshingLinks(true);
    setFoundLinks(null);
    setError(null);

    try {
      const result = await window.electronAPI.findLinks(editedGame.id);
      if (result.success) {
        setFoundLinks(result.links);
      } else {
        setError(result.error || 'Failed to find links');
      }
    } catch (error) {
      console.error('Failed to refresh links:', error);
      setError('An unexpected error occurred while searching for links');
    } finally {
      setIsRefreshingLinks(false);
    }
  };

  const handleBrowseModManager = async () => {
    if (!editedGame) {
      return;
    }

    const path = await window.electronAPI.showOpenDialog();
    if (path) {
      setEditedGame({ ...editedGame, modManagerUrl: path });
    }
  };

  const handleLaunchModManager = async () => {
    if (!editedGame?.id) {
      return;
    }

    try {
      const result = await window.electronAPI.launchModManager(editedGame.id);
      if (!result.success && result.error) {
        console.error('Error launching mod manager:', result.error);
      }
    } catch (err) {
      console.error('Error opening mod manager:', err);
    }
  };

  const handleRemoveCustomLinkIcon = () => {
    if (linkIconPopupIndex === null || !editedGame?.links?.[linkIconPopupIndex]) {
      return;
    }

    const newLinks = [...editedGame.links];
    newLinks[linkIconPopupIndex] = { ...newLinks[linkIconPopupIndex], iconUrl: undefined };
    setEditedGame({ ...editedGame, links: newLinks });
    setLinkIconPopupIndex(null);
  };

  const handleUploadCustomLinkIcon = (dataUrl: string) => {
    if (linkIconPopupIndex === null || !editedGame?.links?.[linkIconPopupIndex]) {
      return;
    }

    const newLinks = [...editedGame.links];
    newLinks[linkIconPopupIndex] = { ...newLinks[linkIconPopupIndex], iconUrl: dataUrl };
    setEditedGame({ ...editedGame, links: newLinks });
    setLinkIconPopupIndex(null);
  };

  // Get launcher name
  const getLauncherName = (game: Game): string => {
    const fromSource = (game.source || '').trim();
    if (fromSource && normalizeLauncherId(fromSource) !== 'other') {
      return getLauncherDisplayName(fromSource);
    }

    const fromPlatform = (game.platform || '').trim();
    if (fromPlatform && normalizeLauncherId(fromPlatform) !== 'other') {
      return getLauncherDisplayName(fromPlatform);
    }

    if (game.id.startsWith('steam-')) return getLauncherDisplayName('steam');
    if (game.id.startsWith('epic-')) return getLauncherDisplayName('epic');
    if (game.id.startsWith('gog-')) return getLauncherDisplayName('gog');
    if (game.id.startsWith('xbox-')) return getLauncherDisplayName('xbox');
    if (game.id.startsWith('ubisoft-')) return getLauncherDisplayName('ubisoft');
    if (game.id.startsWith('rockstar-')) return getLauncherDisplayName('rockstar');
    if (game.id.startsWith('ea-') || game.id.startsWith('origin-')) return getLauncherDisplayName('ea');
    if (game.id.startsWith('battle-') || game.id.startsWith('battlenet-')) return getLauncherDisplayName('battle');
    return 'Other';
  };

  const getSourceDisplayName = (source: string): string => {
    const normalized = normalizeLauncherId(source);
    if (normalized !== 'other') {
      return getLauncherDisplayName(source);
    }
    return source;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-[5vh]">
      <div className="w-[90vw] h-[90vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="h-[60px] flex items-center justify-between px-6 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-xl font-semibold text-white">
            Game Manager{editedGame ? ` - ${editedGame.title}` : selectedGame ? ` - ${selectedGame.title}` : ''}
          </h2>
          <div className="flex items-center gap-2">
            {showOptimizationIndicator && (
              <button
                type="button"
                onClick={() => onRequestOptimizer?.()}
                className="group px-3 py-1.5 bg-slate-800/40 hover:bg-slate-700/60 border border-white/5 hover:border-blue-500/30 text-slate-300 hover:text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
                title="Open image optimizer report"
              >
                <svg className="w-4 h-4 text-blue-400 group-hover:animate-wobble transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span>
                  {hasOptimizationActivity ? 'Optimizing Images' : 'Image Optimizer Report'}
                  {hasOptimizationActivity && optimizationStatus && (() => {
                    const total = optimizationStatus.imagesDone + optimizationStatus.imagesQueued;
                    const pct = total > 0 ? Math.round((optimizationStatus.imagesDone / total) * 100) : 0;
                    return ` (${pct}%)`;
                  })()}
                </span>
              </button>
            )}
            <button
              onClick={() => setShowRefreshDialog(true)}
              className="group px-3 py-1.5 bg-slate-800/40 hover:bg-slate-700/60 border border-white/5 hover:border-blue-500/30 text-slate-300 hover:text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
              title="Manage metadata and images"
            >
              <svg className="w-4 h-4 text-blue-400 group-hover:animate-wobble transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Manage Metadata
            </button>
            <button
              onClick={handleOpenRemoveDialog}
              className="group px-3 py-1.5 bg-slate-800/40 hover:bg-slate-700/60 border border-white/5 hover:border-red-500/30 text-slate-300 hover:text-white rounded-lg transition-all flex items-center gap-2 text-sm font-medium"
              title="Remove games that are no longer installed"
            >
              <svg className="w-4 h-4 text-red-500 group-hover:animate-wobble transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Remove Games
            </button>
            <button
              onClick={handleCloseManager}
              className="group p-1.5 hover:bg-slate-700/60 border border-transparent hover:border-white/5 rounded-lg transition-all"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:animate-wobble transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Error/Success Messages */}
        {/* Notifications moved to bottom */}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Game List */}
          <div className="w-80 border-r border-gray-800 overflow-y-auto">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3 bg-gray-900 border-b border-gray-700 pb-2 top-0 sticky z-10">
                <h3 className="text-sm font-semibold text-gray-300">Imported Games ({localGames.length})</h3>
                <div className="flex bg-gray-800 rounded-lg p-1 gap-1" role="group" aria-label="Game list view">
                  <button
                    onClick={() => setGameListView('boxart')}
                    type="button"
                    className={`p-1.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${gameListView === 'boxart' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                    title="Boxart View"
                    aria-label="Boxart view"
                    aria-pressed={gameListView === 'boxart'}
                  >
                    <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  </button>
                  <button
                    onClick={() => setGameListView('icon')}
                    type="button"
                    className={`p-1.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${gameListView === 'icon' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                    title="Icon View"
                    aria-label="Icon view"
                    aria-pressed={gameListView === 'icon'}
                  >
                    <svg className="w-4 h-4 group- hover:animate-gear-spin group-hover:animate-gear-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </button>
                  <button
                    onClick={() => setGameListView('text')}
                    type="button"
                    className={`p-1.5 rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${gameListView === 'text' ? 'bg-gray-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-700'}`}
                    title="Text Only"
                    aria-label="Text-only view"
                    aria-pressed={gameListView === 'text'}
                  >
                    <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                {sortedLocalGames.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleGameSelect(game.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${selectedGameId === game.id
                      ? 'bg-blue-600/30 border border-blue-500/50'
                      : 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700'
                      }`}
                  >
                    {gameListView === 'boxart' && (
                      ((game.boxArtIsVideo || isWebmAssetUrl(game.boxArtUrl)) && game.boxArtUrl ? (
                        <video
                          src={game.boxArtUrl}
                          muted
                          loop
                          playsInline
                          autoPlay
                          className="w-16 h-20 object-cover rounded flex-shrink-0"
                        />
                      ) : (
                        <img
                          src={game.boxArtUrl || gameListPlaceholderUrl}
                          alt={game.title}
                          className="w-16 h-20 object-cover rounded flex-shrink-0"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            if (target.src !== gameListPlaceholderUrl) {
                              target.src = gameListPlaceholderUrl;
                              return;
                            }
                            // If placeholder also fails, hide it
                            target.onerror = () => { target.style.display = 'none'; };
                          }}
                        />
                      ))
                    )}
                    {gameListView === 'icon' && (
                      <div className="w-10 h-10 flex-shrink-0 rounded p-1 flex items-center justify-center border border-gray-700">
                        {game.iconUrl ? (
                          ((game.iconIsVideo || isWebmAssetUrl(game.iconUrl)) ? (
                            <video
                              src={game.iconUrl}
                              muted
                              loop
                              playsInline
                              autoPlay
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <img
                              src={game.iconUrl}
                              alt={game.title}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ))
                        ) : (
                          <span className="text-[8px] text-gray-500">No Icon</span>
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-white truncate">{game.title}</p>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                        <LauncherIcon launcher={getLauncherName(game)} className="w-3 h-3" />
                        <span>{getLauncherName(game)}</span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel - Tabbed Interface */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedGame && editedGame ? (
              <>
                {/* Tab Navigation */}
                <div className="flex border-b border-gray-800 flex-shrink-0">
                  <button
                    onClick={() => setActiveTab('metadata')}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'metadata'
                      ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                      }`}
                  >
                    Metadata
                  </button>
                  <button
                    onClick={() => setActiveTab('images')}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'images'
                      ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                      }`}
                  >
                    Images
                  </button>
                  <button
                    onClick={() => setActiveTab('links')}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'links'
                      ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                      }`}
                  >
                    Links
                  </button>
                  <button
                    onClick={() => setActiveTab('modManager')}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'modManager'
                      ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                      : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                      }`}
                  >
                    Mod Manager
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden flex flex-col relative">
                  {activeTab === 'images' && (
                    <GameManagerImagesTab
                      editedGame={editedGame}
                      selectedGame={selectedGame}
                      showImageSearch={showImageSearch}
                      imageSearchQuery={imageSearchQuery}
                      isSearchingImages={isSearchingImages}
                      isFastSearching={isFastSearching}
                      providerProgress={providerProgress}
                      providerFilter={providerFilter}
                      fastSearchResults={fastSearchResults}
                      selectedFastGameId={selectedFastGame?.id ?? null}
                      activeImageSearchTab={activeImageSearchTab}
                      orderedResultsByType={orderedResultsByType}
                      hasRawImageResults={hasRawImageResults}
                      hasVisibleImageResults={hasVisibleImageResults}
                      onOpenImageSearch={openImageSearchAndSearch}
                      onOpenArtworkContextMenu={handleOpenArtworkContextMenu}
                      onImageSearchQueryChange={setImageSearchQuery}
                      onSubmitImageSearch={handleSearchImages}
                      onFastSearch={handleFastSearch}
                      onBrowseImage={handleBrowseImage}
                      onClearResults={handleClearImageSearchState}
                      onProviderFilterChange={setProviderFilter}
                      getImageCountForProvider={getImageCountForProvider}
                      onSelectFastGame={handleSelectFastGame}
                      onImageLoadError={handleImageResultLoadError}
                      onImageSearchTabChange={handleImageSearchTabChange}
                      getImageResultCountForTab={getVisibleImageResultCountForTab}
                      getRenderableImageUrl={getRenderableImageUrl}
                      onSelectImage={handleSelectImage}
                      matchesProviderFilter={matchesActiveProviderFilter}
                      onUploadWebmClick={handleUploadWebmClick}
                      onOpenGoogleImageSearch={handleOpenGoogleImageSearch}
                    />
                  )}

                  {activeTab === 'metadata' && (
                    <GameManagerMetadataTab
                      editedGame={editedGame}
                      selectedGame={selectedGame}
                      showFixMatch={showFixMatch}
                      metadataSearchQuery={metadataSearchQuery}
                      metadataSearchResults={metadataSearchResults}
                      isSearchingMetadata={isSearchingMetadata}
                      isApplyingMetadata={isApplyingMetadata}
                      isSaving={isSaving}
                      isDeleting={isDeleting}
                      newCategoryInput={newCategoryInput}
                      canDelete={Boolean(onDeleteGame)}
                      onOpenImageSearch={(type) => {
                        setActiveTab('images');
                        openImageSearchAndSearch(type);
                      }}
                      onEditedGameChange={setEditedGame}
                      onMetadataSearchQueryChange={setMetadataSearchQuery}
                      onFixMatchSearch={handleFixMatchSearch}
                      onToggleFixMatch={handleToggleFixMatch}
                      onSelectMetadataMatch={handleSelectMetadataMatch}
                      onNewCategoryInputChange={setNewCategoryInput}
                      onSave={handleSave}
                      onCancel={handleCancelEditing}
                      onDelete={() => setShowDeleteConfirm(true)}
                      getSourceDisplayName={getSourceDisplayName}
                    />
                  )}

                  {activeTab === 'links' && editedGame && (
                    <GameManagerLinksTab
                      editedGame={editedGame}
                      isRefreshingLinks={isRefreshingLinks}
                      foundLinks={foundLinks}
                      isSaving={isSaving}
                      isDeleting={isDeleting}
                      canDelete={Boolean(onDeleteGame)}
                      onRefreshLinks={handleRefreshLinks}
                      onEditedGameChange={setEditedGame}
                      onSetFoundLinks={setFoundLinks}
                      onSetLinkIconPopupIndex={setLinkIconPopupIndex}
                      onSave={handleSave}
                      onCancel={handleCancelEditing}
                      onDelete={() => setShowDeleteConfirm(true)}
                    />
                  )}

                  {activeTab === 'modManager' && editedGame && (
                    <GameManagerModManagerTab
                      editedGame={editedGame}
                      isSaving={isSaving}
                      onEditedGameChange={setEditedGame}
                      onBrowse={handleBrowseModManager}
                      onLaunch={handleLaunchModManager}
                      onSave={handleSave}
                      onCancel={handleCancelEditing}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                Select a game from the list to view details
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Refresh Metadata Selection Dialog */}
      <RefreshMetadataDialog
        isOpen={showRefreshDialog}
        onSelectAll={() => {
          setShowRefreshDialog(false);
          setRefreshMode('nuclear');
          setShowRefreshConfirm(true);
        }}
        onSelectMissing={() => {
          setShowRefreshDialog(false);
          setRefreshMode('images');
          setShowRefreshConfirm(true);
        }}
        onSelectLinksOnly={() => {
          setShowRefreshDialog(false);
          setRefreshMode('links');
          setShowRefreshConfirm(true);
        }}
        onSelectOptimizeAllImages={() => {
          setShowRefreshDialog(false);
          setRefreshMode('optimizer');
          setShowRefreshConfirm(true);
        }}
        onCancel={() => {
          setShowRefreshDialog(false);
        }}
      />

      <GameManagerRefreshConfirmDialog
        isOpen={showRefreshConfirm}
        refreshMode={refreshMode}
        onConfirm={handleConfirmRefreshAction}
        onCancel={() => {
          setShowRefreshConfirm(false);
          setRefreshMode(null);
        }}
      />

      <GameManagerRefreshProgressDialog
        refreshProgress={refreshProgress}
        isCancellingRefresh={isCancellingRefresh}
        onCancelRefresh={handleCancelMetadataRefresh}
        onClose={() => setRefreshProgress(null)}
      />

      {/* Match Fix Dialog */}
      <MatchFixDialog
        isOpen={showMatchFix}
        unmatchedGames={unmatchedGames}
        onFix={handleMatchFix}
        onCancel={handleCancelMatchFix}
      />

      {/* Boxart Fix Dialog */}
      <BoxartFixDialog
        isOpen={showBoxartFix}
        missingBoxartGames={missingBoxartGames}
        onFix={handleBoxartFix}
        onCancel={handleCancelBoxartFix}
      />

      {/* Delete Confirmation Dialog */}
      {/* Notifications - Fixed Popup */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col gap-2 z-[60] pointer-events-none w-full max-w-md items-center">
        {error && !error.includes('Steam account not linked') && (
          <div className="pointer-events-auto flex items-center gap-3 bg-red-900/95 border border-red-500 text-red-100 px-4 py-3 rounded-lg shadow-xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4">
            <svg className="w-5 h-5 text-red-400 flex-shrink-0 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}
        {success && (
          <div className="pointer-events-auto flex items-center gap-3 bg-green-900/95 border border-green-500 text-green-100 px-4 py-3 rounded-lg shadow-xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4">
            <svg className="w-5 h-5 text-green-400 flex-shrink-0 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div className="text-sm font-medium">{success}</div>
          </div>
        )}
      </div>
      <GameManagerMaintenanceDialogs
        showDeleteConfirm={showDeleteConfirm}
        selectedGameTitle={selectedGame?.title}
        onConfirmDelete={handleDelete}
        onCancelDelete={() => setShowDeleteConfirm(false)}
        showRemoveDeletedDialog={showRemoveDeletedDialog}
        missingGames={missingGames}
        isScanningMissingGames={isScanningMissingGames}
        onRemoveMissingGames={handleRemoveMissingGames}
        onCancelRemoveDeleted={() => setShowRemoveDeletedDialog(false)}
      />

      {/* Upload WEBM: pick image type when current tab is "All" */}
      {showUploadWebmTypePicker && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm" onClick={() => setShowUploadWebmTypePicker(false)} />
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-sm" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b border-gray-700">
                <h2 className="text-lg font-semibold text-white">Upload WEBM</h2>
                <p className="text-sm text-gray-400 mt-1">Which image type is this for?</p>
              </div>
              <div className="px-6 py-4 flex flex-wrap gap-2">
                {(['boxart', 'logo', 'banner', 'alternativeBanner', 'icon'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => handleUploadWebmTypePicked(t)}
                    className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-gray-200 hover:text-white transition-colors"
                  >
                    {uploadWebmTypeLabel(t)}
                  </button>
                ))}
              </div>
              <div className="px-6 py-3 border-t border-gray-700 flex justify-end">
                <button onClick={() => setShowUploadWebmTypePicker(false)} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Upload WEBM: themed instructions with link to SteamGridDB game page */}
      {showUploadWebmInstructions && getUploadWebmType() && (() => {
        const type = getUploadWebmType()!;
        const { url: sgdbUrl, isExact } = getSteamGridDbGameUrl();
        const title = editedGame?.title || selectedGame?.title || 'this game';
        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm" onClick={() => { setShowUploadWebmInstructions(false); setUploadWebmTargetType(null); }} />
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 12l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-semibold text-white">Upload WEBM for {uploadWebmTypeLabel(type)}</h2>
                </div>
                <div className="px-6 py-4 space-y-3">
                  <p className="text-sm text-gray-300">
                    To use an animated WEBM for &quot;{title}&quot;:
                  </p>
                  <ol className="text-sm text-gray-300 list-decimal list-inside space-y-2">
                    <li>Open the link below to go to SteamGridDB.</li>
                    <li>Click the animated image you want (thumbnail on the grid) to open its detail page.</li>
                    <li>On the detail page, right-click the video and choose &quot;Save video as...&quot;. Save it as a .webm file.</li>
                    <li>Click &quot;Choose WEBM file&quot; below to select the .webm file and attach it here.</li>
                  </ol>
                  <div className="pt-2">
                    <p className="text-xs text-gray-500 mb-1">{isExact ? 'Game page on SteamGridDB:' : 'Search SteamGridDB for this game:'}</p>
                    <a
                      href={sgdbUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => { e.preventDefault(); window.electronAPI.openExternal?.(sgdbUrl); }}
                      className="text-sm text-emerald-400 hover:text-emerald-300 underline break-all"
                    >
                      {sgdbUrl}
                    </a>
                  </div>
                </div>
                <div className="px-6 py-3 border-t border-gray-700 flex justify-end gap-2">
                  <button onClick={() => { setShowUploadWebmInstructions(false); setUploadWebmTargetType(null); }} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
                    Cancel
                  </button>
                  <button onClick={handleUploadWebmChooseFile} className="px-4 py-2 text-sm bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors">
                    Choose WEBM file
                  </button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {contextMenu && (
        <ImageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          imageType={contextMenu.type}
          onClose={() => setContextMenu(null)}
          onSelectFromFile={() => handleBrowseImage(contextMenu.type as any)}
          onSearchImages={() => {
            openImageSearchAndSearch(contextMenu.type);
            setContextMenu(null);
          }}
        />
      )}

      {linkIconPopupIndex !== null && editedGame?.links?.[linkIconPopupIndex] && (
        <LinkIconPickerDialog
          linkName={editedGame.links[linkIconPopupIndex].name || 'Link'}
          hasCustomIcon={Boolean(editedGame.links[linkIconPopupIndex].iconUrl)}
          onUploadIcon={handleUploadCustomLinkIcon}
          onRemoveCustomIcon={handleRemoveCustomLinkIcon}
          onClose={() => setLinkIconPopupIndex(null)}
        />
      )}
    </div >
  );
};



