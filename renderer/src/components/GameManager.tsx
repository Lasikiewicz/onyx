import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Game, MissingGame } from '../types/game';
import { MatchFixDialog } from './MatchFixDialog';
import { RefreshMetadataDialog } from './RefreshMetadataDialog';
import { BoxartFixDialog } from './BoxartFixDialog';
import { ImageContextMenu } from './ImageContextMenu';
import { LauncherIcon, getLauncherDisplayName, normalizeLauncherId } from '../utils/launcherIcons';
import type { OptimizationStatus } from '../types/optimization';
import {
  isWebmAssetUrl,
  matchesAnimationFilter,
  normalizeImageUrl,
  normalizeProviderName,
  type ProviderName,
} from './gameManager/imageSearchUtils';
import {
  buildOrderedResultsByType,
  getImageCountForProvider,
  getImageResultCountForTab,
  hasAnyRawImageResults,
  hasAnyVisibleImageResults,
  matchesProviderFilter,
} from './gameManager/imageResultUtils';
import {
  buildProviderProgress,
  markAllProvidersCompleted,
  markProviderCompleted,
  updateProviderProgressFromEvent,
  type ProviderProgressEntry,
} from './gameManager/providerProgressUtils';
import { GameManagerImagesTab } from './gameManager/GameManagerImagesTab';
import { GameManagerMetadataTab } from './gameManager/GameManagerMetadataTab';
import { GameManagerLinksTab } from './gameManager/GameManagerLinksTab';
import { GameManagerModManagerTab } from './gameManager/GameManagerModManagerTab';
import { LinkIconPickerDialog } from './gameManager/LinkIconPickerDialog';
import { GameManagerRefreshConfirmDialog } from './gameManager/GameManagerRefreshConfirmDialog';
import { GameManagerRefreshProgressDialog } from './gameManager/GameManagerRefreshProgressDialog';
import { GameManagerMaintenanceDialogs } from './gameManager/GameManagerMaintenanceDialogs';

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

interface IGDBGameResult {
  id: number;
  name: string;
  title?: string;
  coverUrl?: string;
  screenshotUrls?: string[];
  logoUrl?: string;
  bannerUrl?: string;
  summary?: string;
  releaseDate?: number;
  genres?: string[];
  rating?: number;
  platform?: string;
  ageRating?: string;
  categories?: string[];
}

interface FastSearchGame {
  id: number;
  name: string;
  coverUrl: string;
  bannerUrl: string;
  logoUrl: string;
  screenshotUrls: string[];
  steamAppId?: string;
  releaseDate?: number;
  source: string;
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
  const [showImageSearch, setShowImageSearch] = useState<{ type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon'; gameId: string } | null>(null);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [imageSearchResults, setImageSearchResults] = useState<any[]>([]);
  const [failedImageSearchUrls, setFailedImageSearchUrls] = useState<Set<string>>(new Set());
  const [steamGridDBResults, setSteamGridDBResults] = useState<{ boxart: any[]; banner: any[]; alternativeBanner: any[]; logo: any[]; icon: any[] }>({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [editedGame, setEditedGame] = useState<Game | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showFixMatch, setShowFixMatch] = useState(false);
  const [metadataSearchQuery, setMetadataSearchQuery] = useState('');
  const [metadataSearchResults, setMetadataSearchResults] = useState<any[]>([]);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const [isApplyingMetadata, setIsApplyingMetadata] = useState(false);
  const [activeTab, setActiveTab] = useState<'images' | 'metadata' | 'links' | 'modManager'>(initialTab);
  const [activeImageSearchTab, setActiveImageSearchTab] = useState<'all' | 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon'>('all');
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const [refreshMode, setRefreshMode] = useState<'nuclear' | 'images' | 'links' | 'optimizer' | null>(null);
  const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number; message: string; gameTitle?: string; links?: Array<{ name: string; url: string }>; images?: string[]; mode?: 'all' | 'missing' | 'links' } | null>(null);
  const [isCancellingRefresh, setIsCancellingRefresh] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon' } | null>(null);
  const [showMatchFix, setShowMatchFix] = useState(false);
  const [showRemoveDeletedDialog, setShowRemoveDeletedDialog] = useState(false);
  const [missingGames, setMissingGames] = useState<MissingGame[]>([]);
  const [isScanningMissingGames, setIsScanningMissingGames] = useState(false);

  const [unmatchedGames, setUnmatchedGames] = useState<Array<{ gameId: string; title: string; searchResults: any[] }>>([]);
  const [showBoxartFix, setShowBoxartFix] = useState(false);
  const [missingBoxartGames, setMissingBoxartGames] = useState<Array<{ gameId: string; title: string; steamAppId?: string }>>([]);
  const [refreshState, _setRefreshState] = useState<{ mode: 'all' | 'missing' | 'links' | null; continueFromIndex?: number } | null>(null);
  const [shouldSelectFirstGameAfterRefresh, setShouldSelectFirstGameAfterRefresh] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFastSearching, setIsFastSearching] = useState(false);
  const [fastSearchResults, setFastSearchResults] = useState<FastSearchGame[]>([]);
  const [selectedFastGame, setSelectedFastGame] = useState<FastSearchGame | null>(null);
  const [gameListView, setGameListView] = useState<'boxart' | 'icon' | 'text'>('boxart');
  const [newCategoryInput, setNewCategoryInput] = useState('');
  // Image animation filter controls are currently disabled while WebP-based
  // animated assets are being phased out. Keep the state for future use but
  // default to 'all' and ignore it in filtering logic.
  const [imageAnimationFilter] = useState<'all' | 'animatedOnly' | 'staticOnly'>('all');
  const [isRefreshingLinks, setIsRefreshingLinks] = useState(false);
  const [foundLinks, setFoundLinks] = useState<Array<{ name: string; url: string }> | null>(null);
  const [linkIconPopupIndex, setLinkIconPopupIndex] = useState<number | null>(null);
  const [, setImageSearchProviderStatus] = useState<{ currentProvider: string; remaining: string[] } | null>(null);
  const [providerProgress, setProviderProgress] = useState<ProviderProgressEntry[]>([]);
  const [optimizationStatus, setOptimizationStatus] = useState<OptimizationStatus | null>(null);
  const [showUploadWebmTypePicker, setShowUploadWebmTypePicker] = useState(false);
  const [showUploadWebmInstructions, setShowUploadWebmInstructions] = useState(false);
  const [uploadWebmTargetType, setUploadWebmTargetType] = useState<'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon' | null>(null);
  const imageChangedGameIdsRef = useRef<Set<string>>(new Set());
  const imageResultOrderRef = useRef(0);
  const nextImageResultOrder = () => {
    imageResultOrderRef.current += 1;
    return imageResultOrderRef.current;
  };
  const hasOptimizationActivity = optimizationStatus?.hasActivity ?? false;
  const hasOptimizationReport = (optimizationStatus?.jobs?.length ?? 0) > 0;
  const showOptimizationIndicator = hasOptimizationActivity || hasOptimizationReport;

  // Refs to track current state for async IPC events
  const selectedGameIdRef = React.useRef(selectedGameId);
  const currentSearchQueryRef = React.useRef(imageSearchQuery);
  const fastSearchRunIdRef = React.useRef(0);
  const imageSearchRunIdRef = React.useRef(0);
  const fastSearchActiveRunIdRef = React.useRef(0);
  // Do not request animated assets from providers; we are phasing out
  // animated WebP usage and rely on explicit WEBM uploads instead.
  const includeAnimatedInRequests = false;
  const gameListPlaceholderUrl = useMemo(() => new URL('onyx-logo.svg', window.location.href).href, []);

  const getRenderableImageUrl = useCallback((value?: string) => {
    const normalized = normalizeImageUrl(value);
    if (!normalized) return undefined;
    if (failedImageSearchUrls.has(normalized)) return undefined;
    return normalized;
  }, [failedImageSearchUrls]);

  const markImageResultUrlAsFailed = (value?: string) => {
    const normalized = normalizeImageUrl(value);
    if (!normalized) return;
    setFailedImageSearchUrls(prev => {
      if (prev.has(normalized)) return prev;
      const next = new Set(prev);
      next.add(normalized);
      return next;
    });
  };

  const handleImageResultLoadError = (url: string | undefined, event: React.SyntheticEvent<HTMLImageElement>) => {
    markImageResultUrlAsFailed(url);
    const target = event.target as HTMLImageElement;
    target.style.display = 'none';
    target.parentElement?.parentElement?.remove();
    target.parentElement?.remove();
  };

  const [providerAvailability, setProviderAvailability] = useState<Partial<Record<ProviderName, boolean>>>({});

  // Load provider availability (which APIs are configured) once for status row and filters
  useEffect(() => {
    let cancelled = false;

    const loadProviderAvailability = async () => {
      try {
        const statusResult = await window.electronAPI.getMetadataProviderStatus?.();
        if (!statusResult || !statusResult.success || cancelled) return;

        const availability: Partial<Record<ProviderName, boolean>> = {};
        for (const p of statusResult.providers) {
          const normalized = normalizeProviderName(p.name);
          if (normalized === 'SteamGridDB' || normalized === 'IGDB' || normalized === 'RAWG' || normalized === 'Giant Bomb') {
            availability[normalized] = p.available;
          }
        }

        // Steam Store API and Web Search don't require explicit API keys
        availability['Steam Store API'] = true;
        availability['Web Search'] = true;

        setProviderAvailability(availability);
      } catch (err) {
        console.warn('[GameManager] Failed to load metadata provider status', err);
      }
    };

    void loadProviderAvailability();

    return () => {
      cancelled = true;
    };
  }, [normalizeProviderName]);

  useEffect(() => {
    selectedGameIdRef.current = selectedGameId;
  }, [selectedGameId]);

  useEffect(() => {
    currentSearchQueryRef.current = imageSearchQuery;
  }, [imageSearchQuery]);

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



  // Helper function to handle refresh with continuation support
  const handleRefreshMetadata = async (mode: 'all' | 'missing' | 'links', continueFromIndex: number = 0) => {
    try {
      setIsCancellingRefresh(false);
      const result = await window.electronAPI.refreshAllMetadata({
        allGames: mode === 'all',
        linksOnly: mode === 'links',
        continueFromIndex: continueFromIndex
      });

      if (result.success) {
        if (result.canceled) {
          setSuccess('Metadata refresh cancelled.');
          setRefreshProgress(null);
          return;
        }

        // Check if there are unmatched games
        if (result.unmatchedGames && result.unmatchedGames.length > 0) {
          setUnmatchedGames(result.unmatchedGames);
          setShowMatchFix(true);
          setRefreshProgress(null);
          // Also check for missing boxart games (will show after match fix)
          if (result.missingBoxartGames && result.missingBoxartGames.length > 0) {
            setMissingBoxartGames(result.missingBoxartGames);
          }
        } else {
          // If boxart is missing, show the boxart fix dialog
          if (result.missingBoxartGames && result.missingBoxartGames.length > 0) {
            console.log(`[GameManager] ${result.missingBoxartGames.length} game(s) still missing boxart after auto-search`);
            setMissingBoxartGames(result.missingBoxartGames);
            setShowBoxartFix(true);
            setRefreshProgress(null);
            // Don't show success message if boxart is missing
            setError(`Refresh completed but ${result.missingBoxartGames.length} game(s) are missing boxart. Please select boxart for these games.`);
            return; // Stop here to show the boxart fix dialog
          }

          if (result.count === 0) {
            // Success message usage removed to reduce visual clutter
            setTimeout(() => {
              setRefreshProgress(null);
            }, 2000);
          } else {
            // Only show success if refresh was actually successful (all games have boxart)
            if (!result.success) {
              // Refresh completed but some games are missing boxart
              setError(`Refresh completed but ${result.missingBoxartGames?.length || 0} game(s) are missing boxart. Please select boxart for these games.`);
            }

            if (onReloadLibrary) {
              setRefreshProgress({
                current: result.count,
                total: result.count,
                message: 'Refresh completed! Reloading library...',
              });
              await new Promise(resolve => setTimeout(resolve, 800));
              try {
                await onReloadLibrary();
                setRefreshProgress(null);
                setShouldSelectFirstGameAfterRefresh(true);
              } catch (reloadError) {
                console.error('Error reloading library:', reloadError);
                setError('Failed to reload library after refresh');
                setRefreshProgress(null);
              }
            } else {
              setTimeout(() => {
                setRefreshProgress(null);
                setShouldSelectFirstGameAfterRefresh(true);
              }, 2000);
            }
          }
        }
      } else {
        setError(result.error || 'Failed to refresh metadata');
        setTimeout(() => {
          setRefreshProgress(null);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh metadata');
      setTimeout(() => {
        setRefreshProgress(null);
      }, 2000);
    } finally {
      setIsCancellingRefresh(false);
    }
  };

  const handleCancelMetadataRefresh = async () => {
    if (isCancellingRefresh) return;
    setIsCancellingRefresh(true);
    setRefreshProgress(prev => prev ? { ...prev, message: 'Cancelling refresh...' } : prev);
    try {
      await window.electronAPI.cancelMetadataRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel metadata refresh');
      setIsCancellingRefresh(false);
    }
  };

  const handleOpenRemoveDialog = async () => {
    setShowRemoveDeletedDialog(true);
    setIsScanningMissingGames(true);
    try {
      const result = await window.electronAPI.getMissingGames();
      if (result.success) {
        setMissingGames(result.games);
      } else {
        setError(result.error || 'Failed to scan for missing games');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan for missing games');
    } finally {
      setIsScanningMissingGames(false);
    }
  };

  const handleRemoveMissingGames = async (gameIds: string[]) => {
    try {
      const result = await window.electronAPI.removeMissingGames(gameIds);
      if (result.success) {
        setSuccess(`Successfully removed ${result.removedCount} game(s)`);
        setShowRemoveDeletedDialog(false);
        if (onReloadLibrary) {
          await onReloadLibrary();
        }
      } else {
        setError(result.error || 'Failed to remove missing games');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove missing games');
    }
  };



  // Maintain local games state to prevent refresh issues
  const [localGames, setLocalGames] = useState<Game[]>(games);

  const selectedGame = useMemo(() => {
    return localGames.find(g => g.id === selectedGameId) || null;
  }, [localGames, selectedGameId]);

  const expandedGame = useMemo(() => {
    return localGames.find(g => g.id === expandedGameId) || null;
  }, [localGames, expandedGameId]);

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



  // Listen for refresh progress updates
  useEffect(() => {
    const handleProgress = (_event: any, progress: { current: number; total: number; message: string; gameTitle?: string; links?: any[]; images?: string[] }) => {
      setRefreshProgress(prev => ({
        ...progress,
        mode: prev?.mode || (progress.message?.toLowerCase().includes('links') ? 'links' : 'all'),
        links: progress.links,
        images: progress.images
      }));
    };

    const removeMetadataProgress = window.electronAPI?.on && window.electronAPI.on('metadata:refreshProgress', handleProgress);

    return () => {
      if (typeof removeMetadataProgress === 'function') removeMetadataProgress();
    };
  }, []);

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
      setIsSearchingImages(false);
      setIsFastSearching(false);
      setIsSearchingMetadata(false);
      setIsApplyingMetadata(false);
      setShowImageSearch(null);
      setImageSearchResults([]);
      setFailedImageSearchUrls(new Set());
      setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
      setFastSearchResults([]);
      setActiveImageSearchTab('all');
      setImageSearchQuery('');
      setImageSearchProviderStatus(null);
      setProviderProgress([]);
      // Invalidate in-flight image search requests so backend aborts between providers
      fastSearchActiveRunIdRef.current = ++fastSearchRunIdRef.current;
      imageSearchRunIdRef.current++;
    }
  }, [selectedGame?.id]);

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
      setShowImageSearch(null);
      setImageSearchQuery('');
      setImageSearchResults([]);
      setFailedImageSearchUrls(new Set());
      setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
      setEditedGame(null);
      setError(null);
      setSuccess(null);
      setShowFixMatch(false);
      setMetadataSearchQuery('');
      setMetadataSearchResults([]);
      setActiveTab(initialTab);
      setSelectedGameId(null);
      setImageSearchProviderStatus(null);
      setProviderProgress([]);
      // Invalidate in-flight image search requests so backend aborts
      fastSearchActiveRunIdRef.current = ++fastSearchRunIdRef.current;
      imageSearchRunIdRef.current++;
      imageChangedGameIdsRef.current.clear();
    }
  }, [isOpen, initialTab]);

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

  const handleOptimizeAllImages = async () => {
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

  // Handle image search with progressive loading
  // Handle image search with progressive loading
  const handleSearchImages = async (
    imageType: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon',
    useWeb: boolean = false,
    prefetchRemainingTypes: boolean = true,
    explicitQuery?: string
  ) => {
    if (!selectedGame) return;

    const runId = ++imageSearchRunIdRef.current;

    const effectiveImageType: 'boxart' | 'banner' | 'logo' | 'icon' =
      imageType === 'alternativeBanner' ? 'banner' : imageType;

    // Get Steam App ID from edited game (which may have been manually set)
    const getSteamAppId = (): string | undefined => {
      if (editedGame) {
        const appIdMatch = editedGame.id.match(/^steam-(.+)$/);
        if (appIdMatch) return appIdMatch[1];
      }
      const appIdMatch = selectedGame.id.match(/^steam-(.+)$/);
      return appIdMatch ? appIdMatch[1] : undefined;
    };

    const steamAppId = getSteamAppId();
    const query = (explicitQuery?.trim() || imageSearchQuery.trim() || selectedGame.title.trim());

    const prefetchOtherImageTypes = async (
      baseImageType: 'boxart' | 'banner' | 'logo' | 'icon',
      searchQuery: string,
      appId?: string
    ) => {
      const allTypes: Array<'boxart' | 'banner' | 'logo' | 'icon'> = ['boxart', 'banner', 'logo', 'icon'];
      const remainingTypes = allTypes.filter((type) => type !== baseImageType);

      const prefetchPromises = remainingTypes.map(async (type) => {
        try {
          const sgdbResponse: any = await window.electronAPI.searchImages(searchQuery, type, appId, includeAnimatedInRequests);
          if (selectedGameIdRef.current !== selectedGame.id || currentSearchQueryRef.current !== searchQuery) return;
          if (!sgdbResponse?.success || !sgdbResponse.images) return;

          const flattenedResults: any[] = [];
          sgdbResponse.images.forEach((gameResult: any) => {
            gameResult.images.forEach((img: any) => {
              if (!matchesAnimationFilter(img.url, img)) return;
              const isOfficialSteam = img.score >= 1000 || gameResult.gameName?.includes('Official Steam');

              flattenedResults.push({
                id: gameResult.gameId,
                name: gameResult.gameName,
                title: gameResult.gameName,
                boxArtUrl: type === 'boxart' ? img.url : undefined,
                bannerUrl: type === 'banner' ? img.url : undefined,
                logoUrl: type === 'logo' ? img.url : undefined,
                iconUrl: type === 'icon' ? img.url : undefined,
                coverUrl: type === 'boxart' ? img.url : undefined,
                source: isOfficialSteam ? 'steam' : 'steamgriddb',
                score: img.score,
                width: img.width,
                height: img.height,
                mime: img.mime,
                isAnimated: img.isAnimated ?? img.animated ?? img.is_animated,
                notes: img.notes,
                foundOrder: nextImageResultOrder(),
              });
            });
          });

          if (flattenedResults.length > 0) {
            setSteamGridDBResults(prev => ({
              ...prev,
              [type]: [...prev[type], ...flattenedResults]
            }));
          }
        } catch (err) {
          console.warn('[ImageSearch] prefetch type failed', { type, searchQuery, err });
        }
      });

      await Promise.allSettled(prefetchPromises);
    };

    console.log('[ImageSearch] start', {
      runId,
      imageType,
      effectiveImageType,
      useWeb,
      query,
      steamAppId,
      selectedGameId: selectedGame.id,
      selectedGameTitle: selectedGame.title,
      currentSearchQuery: currentSearchQueryRef.current,
      imageAnimationFilter,
      timestamp: new Date().toISOString()
    });

    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setIsSearchingImages(true);
    setError(null);

    // Build provider list for status row (same order as searches below)
    const orderedProviders: ProviderName[] = ['Steam Store API', 'SteamGridDB', 'IGDB', 'RAWG', 'Giant Bomb', 'Web Search'];
    setProviderProgress(buildProviderProgress(orderedProviders, providerAvailability, {
      useWeb,
      steamAppId,
      effectiveImageType,
    }));

    const setProviderCompleted = (name: ProviderName) => {
      setProviderProgress((prev) => markProviderCompleted(prev, name));
    };

    // Initial clearing - simplified to avoid clearing if we are just switching tabs
    if (!steamAppId && !useWeb) {
      setImageSearchResults([]);
      setFailedImageSearchUrls(new Set());
      setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
    } else if (useWeb) {
      // Only clear if starting a fresh web search
      setImageSearchResults([]);
      setFailedImageSearchUrls(new Set());
    }

    // Tracker for active searches to know when to turn off loading indicator
    let activeSearches = 0;
    const checkFinished = () => {
      activeSearches--;
      if (activeSearches <= 0) {
        console.log('[ImageSearch] complete', {
          runId,
          query,
          selectedGameId: selectedGame.id,
          currentSearchQuery: currentSearchQueryRef.current,
          timestamp: new Date().toISOString()
        });
        setIsSearchingImages(false);
      }
    };

    // 1. Steam Official Metadata (if applicable)
    if (steamAppId && !useWeb) {
      activeSearches++;
      window.electronAPI.searchArtwork(selectedGame.title, steamAppId)
        .then((steamMetadata) => {
          if (selectedGameIdRef.current !== selectedGame.id || currentSearchQueryRef.current !== query) return;
          if (steamMetadata) {
            const steamResults: any[] = [];
            // Helper to add result
            const addResult = (url: string | undefined, type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => {
              const normalizedUrl = normalizeImageUrl(url);
              if (!normalizedUrl) return;
              steamResults.push({
                id: `steam-${steamAppId}`,
                name: selectedGame.title,
                title: selectedGame.title,
                [type === 'boxart' ? 'boxArtUrl' : type === 'logo' ? 'logoUrl' : type === 'icon' ? 'iconUrl' : type === 'alternativeBanner' ? 'alternativeBannerUrl' : 'bannerUrl']: normalizedUrl,
                source: 'steam',
                score: 10000,
                foundOrder: nextImageResultOrder(),
              });
            };

            if (effectiveImageType === 'boxart') addResult(steamMetadata.boxArtUrl, 'boxart');
            else if (effectiveImageType === 'banner') addResult(steamMetadata.bannerUrl, 'banner');
            else if (effectiveImageType === 'logo') addResult(steamMetadata.logoUrl, 'logo');
            else if (effectiveImageType === 'icon') addResult(steamMetadata.iconUrl, 'icon');

            if (steamResults.length > 0) {
              setSteamGridDBResults(prev => ({
                ...prev,
                [effectiveImageType]: [...prev[effectiveImageType], ...steamResults]
              }));
            }
          }
        })
        .catch(err => console.error('[ImageSearch] Steam artwork error', { runId, query, err }))
        .finally(() => { setProviderCompleted('Steam Store API'); checkFinished(); });
    }

    try {

      // Start both searches in parallel but update results as they come in
      const searchPromises: Promise<any>[] = [];

      if (useWeb) {
        // Web Search
        activeSearches++;
        searchPromises.push(
          window.electronAPI.searchWebImages(query, effectiveImageType as any).then((response: any) => {
            if (selectedGameIdRef.current !== selectedGame.id || currentSearchQueryRef.current !== query) return;
            if (response.success && response.images) {
              const flattenedResults: any[] = [];
              response.images.forEach((gameResult: any) => {
                gameResult.images.forEach((img: any) => {
                  const normalizedUrl = normalizeImageUrl(img.url);
                  if (!normalizedUrl || !matchesAnimationFilter(normalizedUrl, img)) return;
                  flattenedResults.push({
                    id: `${gameResult.gameId}-${normalizedUrl}`,
                    name: gameResult.gameName,
                    title: gameResult.gameName,
                    boxArtUrl: effectiveImageType === 'boxart' ? normalizedUrl : undefined,
                    bannerUrl: effectiveImageType === 'banner' ? normalizedUrl : undefined,
                    logoUrl: effectiveImageType === 'logo' ? normalizedUrl : undefined,
                    iconUrl: effectiveImageType === 'icon' ? normalizedUrl : undefined,
                    coverUrl: effectiveImageType === 'boxart' ? normalizedUrl : undefined,
                    source: img.source || 'web',
                    score: img.score,
                    width: img.width,
                    height: img.height,
                    mime: img.mime,
                    isAnimated: img.isAnimated ?? img.animated ?? img.is_animated,
                    notes: img.notes,
                    foundOrder: nextImageResultOrder(),
                  });
                });
              });

              // Update results immediately
              if (effectiveImageType === 'boxart') {
                setSteamGridDBResults(prev => ({ ...prev, boxart: [...prev.boxart, ...flattenedResults] }));
              } else if (effectiveImageType === 'banner') {
                setSteamGridDBResults(prev => ({ ...prev, banner: [...prev.banner, ...flattenedResults] }));
              } else if (effectiveImageType === 'logo') {
                setSteamGridDBResults(prev => ({ ...prev, logo: [...prev.logo, ...flattenedResults] }));
              } else if (effectiveImageType === 'icon') {
                setSteamGridDBResults(prev => ({ ...prev, icon: [...prev.icon, ...flattenedResults] }));
              }
            }
            return response;
          }).catch((err: any) => {
            console.error('[ImageSearch] Web search error', { runId, query, err });
            return null;
          }).finally(() => { setProviderCompleted('Web Search'); checkFinished(); })
        );
      } else {
        // Regular Search (IGDB, RAWG, SteamGridDB) - Split logic for better parallelism

        // Search IGDB for metadata (only if searching for boxart or banner)
        if (effectiveImageType === 'boxart' || effectiveImageType === 'banner') {
          activeSearches++;
          searchPromises.push(
            window.electronAPI.searchMetadata(query).then((igdbResponse: any) => {
              if (selectedGameIdRef.current !== selectedGame.id || currentSearchQueryRef.current !== query) return;
              if (igdbResponse && igdbResponse.success && igdbResponse.results && igdbResponse.results.length > 0) {
                const filteredIGDBResults: IGDBGameResult[] = igdbResponse.results.filter((result: any) => {
                  if (effectiveImageType === 'boxart') {
                    return result.coverUrl;
                  } else if (effectiveImageType === 'banner') {
                    return result.screenshotUrls && result.screenshotUrls.length > 0;
                  }
                  return false;
                });

                if (filteredIGDBResults.length > 0) {
                  // Update results immediately as they come in (tag source so provider count/filter work)
                  const withSource = filteredIGDBResults.map((r: any) => ({ ...r, source: r.source || 'IGDB', foundOrder: nextImageResultOrder() }));
                  setImageSearchResults(prev => [...prev, ...withSource]);
                }
              }
              return igdbResponse;
            }).catch((err: any) => {
              console.error('[ImageSearch] IGDB search error', { runId, query, err });
              return null;
            }).finally(() => { setProviderCompleted('IGDB'); checkFinished(); })
          );
        }
        // Search SteamGridDB for the specific image type
        activeSearches++;
        searchPromises.push(
          window.electronAPI.searchImages(query, effectiveImageType as any, steamAppId, includeAnimatedInRequests).then((sgdbResponse: any) => {
            if (selectedGameIdRef.current !== selectedGame.id || currentSearchQueryRef.current !== query) return;
            if (sgdbResponse.success && sgdbResponse.images) {
              const flattenedResults: any[] = [];
              sgdbResponse.images.forEach((gameResult: any) => {
                gameResult.images.forEach((img: any) => {
                  const normalizedUrl = normalizeImageUrl(img.url);
                  if (!normalizedUrl || !matchesAnimationFilter(normalizedUrl, img)) return;
                  // Check if this is an official Steam image (high score and specific naming)
                  const isOfficialSteam = img.score >= 1000 || gameResult.gameName?.includes('Official Steam');

                  flattenedResults.push({
                    id: `${gameResult.gameId}-${normalizedUrl}`,
                    name: gameResult.gameName,
                    title: gameResult.gameName,
                    boxArtUrl: effectiveImageType === 'boxart' ? normalizedUrl : undefined,
                    bannerUrl: effectiveImageType === 'banner' ? normalizedUrl : undefined,
                    logoUrl: effectiveImageType === 'logo' ? normalizedUrl : undefined,
                    coverUrl: effectiveImageType === 'boxart' ? normalizedUrl : undefined,
                    source: isOfficialSteam ? 'steam' : 'steamgriddb',
                    score: img.score,
                    width: img.width,
                    height: img.height,
                    mime: img.mime,
                    isAnimated: img.isAnimated ?? img.animated ?? img.is_animated,
                    notes: img.notes,
                    foundOrder: nextImageResultOrder(),
                  });
                });
              });

              if (flattenedResults.length > 0) {
                setSteamGridDBResults(prev => ({
                  ...prev,
                  [effectiveImageType]: [...prev[effectiveImageType], ...flattenedResults]
                }));
              }
            }
            return sgdbResponse;
          }).catch((err: any) => {
            console.error('[ImageSearch] SteamGridDB search error', { runId, query, err });
            return null;
          }).finally(() => { setProviderCompleted('SteamGridDB'); checkFinished(); })
        );
      }

      // We do NOT await Promise.allSettled here anymore, as we want async updates.
      // But we need to ensure at least one search started.
      if (activeSearches === 0) {
        setIsSearchingImages(false);
      }

      if (!useWeb && prefetchRemainingTypes) {
        void prefetchOtherImageTypes(effectiveImageType, query, steamAppId);
      }


    } catch (err) {
      setError(`Failed to search for ${imageType}`);
      console.error(`Error searching ${imageType}:`, err);
    }
  };

  const orderedResultsByType = useMemo(() => {
    return buildOrderedResultsByType(imageSearchResults, steamGridDBResults, getRenderableImageUrl);
  }, [getRenderableImageUrl, imageSearchResults, steamGridDBResults]);

  const [providerFilter, setProviderFilter] = useState<'all' | ProviderName>('all');

  const handleOpenArtworkContextMenu = useCallback((event: { pageX: number; pageY: number }, type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => {
    setContextMenu({ x: event.pageX, y: event.pageY, type });
  }, []);

  const getVisibleImageResultCountForTab = useCallback((tab: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => (
    getImageResultCountForTab(orderedResultsByType, providerFilter, tab)
  ), [orderedResultsByType, providerFilter]);

  const matchesActiveProviderFilter = useCallback((source?: string) => (
    matchesProviderFilter(source, providerFilter)
  ), [providerFilter]);

  const handleClearImageSearchState = useCallback(() => {
    setImageSearchResults([]);
    setFailedImageSearchUrls(new Set());
    setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
    setFastSearchResults([]);
    setSelectedFastGame(null);
  }, []);

  const handleOpenGoogleImageSearch = useCallback((query: string) => {
    window.electronAPI.openExternal(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`);
  }, []);

  const handleImageSearchTabChange = (tab: 'all' | 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => {
    setActiveImageSearchTab(tab);

    if (tab === 'all' || !selectedGame) return;

    setShowImageSearch({ type: tab, gameId: selectedGame.id });

    if (isSearchingImages) return;

    if (getImageResultCountForTab(orderedResultsByType, providerFilter, tab) === 0) {
      void handleSearchImages(tab);
    }
  };

  /** Open image search for a type and immediately run the full aggregator (Steam by name, SteamGridDB, IGDB, RAWG) so all providers contribute. */
  const openImageSearchAndSearch = (type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => {
    if (!selectedGame) return;
    setShowImageSearch({ type, gameId: selectedGame.id });
    setActiveImageSearchTab(type);
    if (hasAnyRawImageResults(imageSearchResults, steamGridDBResults)) {
      return;
    }

    setImageSearchQuery(selectedGame.title);
    currentSearchQueryRef.current = selectedGame.title;

    const runId = ++fastSearchRunIdRef.current;
    fastSearchActiveRunIdRef.current = runId;

    const steamAppId = (selectedGame.id.match(/^steam-(.+)$/) || [])[1] ?? (editedGame?.id.match(/^steam-(.+)$/) || [])[1];

    const orderedProviders: ProviderName[] = ['Steam Store API', 'SteamGridDB', 'IGDB', 'RAWG', 'Giant Bomb'];
    setProviderProgress(buildProviderProgress(orderedProviders, providerAvailability, {
      steamAppId,
      markAllSearchable: true,
    }));

    setImageSearchResults([]);
    setFailedImageSearchUrls(new Set());
    setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
    setError(null);
    setIsSearchingImages(true);

    (window.electronAPI as any)
      .fetchGameImages(
        selectedGame.title,
        steamAppId,
        undefined,
        includeAnimatedInRequests,
        runId,
        selectedGame.id
      )
      .then(() => {
        if (fastSearchActiveRunIdRef.current === runId) {
          setIsSearchingImages(false);
          // Mark all available providers as completed so the status row shows counts instead of \"Searching\".
          setProviderProgress((prev) => markAllProvidersCompleted(prev));
        }
      })
      .catch((err: unknown) => {
        console.warn('[ImageSearch] fetchGameImages error', err);
        if (fastSearchActiveRunIdRef.current === runId) {
          setIsSearchingImages(false);
          setError(err instanceof Error ? err.message : 'Image search failed');
        }
      });
  };

  // Aggregated fast search - fetches all images at once with no rate limiting
  const handleFastSearch = async () => {
    if (!selectedGame) return;

    const runId = ++fastSearchRunIdRef.current;
    fastSearchActiveRunIdRef.current = runId;

    const query = imageSearchQuery.trim() || selectedGame.title.trim();
    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setImageSearchQuery(query);
    currentSearchQueryRef.current = query;

    setIsFastSearching(true);
    setError(null);
    setFastSearchResults([]);
    setSelectedFastGame(null);

    console.log('[FastSearch] start', {
      runId,
      query,
      selectedGameId: selectedGame.id,
      selectedGameTitle: selectedGame.title,
      currentSearchQuery: currentSearchQueryRef.current,
      imageAnimationFilter,
      timestamp: new Date().toISOString()
    });

    // Listen for progressive search results
    const removeProgressListener = window.electronAPI?.on
      ? window.electronAPI.on('metadata:fastSearchProgress', (_event: any, data: any) => {
        // Handle both old and new data formats
        const results = Array.isArray(data) ? data : (data.results || []);
        const responseQuery = Array.isArray(data) ? null : data.query;
        const responseRequestId = Array.isArray(data) ? undefined : data.requestId;

        if (responseRequestId && responseRequestId !== fastSearchActiveRunIdRef.current) {
          console.log('[FastSearch] discard progress (requestId mismatch)', {
            runId,
            responseRequestId,
            expectedRequestId: fastSearchActiveRunIdRef.current,
            responseQuery,
            selectedGameId: selectedGameIdRef.current
          });
          return;
        }

        // Guard: DISCARD if this is an old query or we switched games
        if (responseQuery && responseQuery !== query) {
          console.log('[FastSearch] discard progress (query mismatch)', {
            runId,
            responseQuery,
            expectedQuery: query,
            selectedGameId: selectedGameIdRef.current
          });
          return;
        }
        if (selectedGameIdRef.current !== selectedGame.id) {
          console.log('[FastSearch] discard progress (game mismatch)', {
            runId,
            selectedGameId: selectedGameIdRef.current,
            expectedGameId: selectedGame.id
          });
          return;
        }

        setFastSearchResults(prev => {
          // Merge and deduplicate based on ID + Source
          const currentIds = new Set(prev.map(p => `${p.source}:${p.id}`));
          const newItems = results.filter((r: any) => !currentIds.has(`${r.source}:${r.id}`));
          return [...prev, ...newItems];
        });
      })
      : () => { };

    try {
      console.log(`[FastSearch] Searching for "${query}"...`);
      const startTime = Date.now();

      const response = await (window.electronAPI as any).fastImageSearch(query, runId);
      console.log('[FastSearch] Response:', response);
      console.log('[FastSearch] response meta', {
        runId,
        query,
        elapsedMs: Date.now() - startTime
      });

      console.log(`[FastSearch] Completed in ${Date.now() - startTime}ms`);

      // Check if response is a direct metadata object (has boxArtUrl/bannerUrl/logoUrl keys)
      // This happens when metadataFetcher.searchArtwork returns a single result (Best Match)
      if (response && (response.boxArtUrl || response.bannerUrl || response.logoUrl || response.heroUrl)) {
        // We might already have results in the list from progressive search.
        // We can either:
        // 1. Clear list and show just this best match (Original behavior)
        // 2. Select this result in the list if it exists?

        // If we want to "Simultaneously scan... and show results as they are found", we should KEEP the progressive results.
        // But maybe Auto-Select the best match if possible.

        // Construct the result from the response
        const syntheticResult: FastSearchGame = {
          id: Date.now(), // Fake ID since we don't have one in bare metadata
          name: query,
          coverUrl: response.boxArtUrl || '',
          bannerUrl: response.bannerUrl || response.heroUrl || '',
          logoUrl: response.logoUrl || '',
          screenshotUrls: response.screenshots || [],
          source: 'Best Match'
        };

        // If the list is empty (fallback was used), show this result
        setFastSearchResults(prev => {
          if (prev.length === 0) return [syntheticResult];
          return prev;
        });

        // Auto-select this result immediately to show images
        // Only if user hasn't selected another one?
        if (!selectedFastGame) {
          handleSelectFastGame(syntheticResult);
        }

        setSuccess(`Found metadata in ${Date.now() - startTime}ms`);
        setTimeout(() => setSuccess(null), 3000);
      }
      else if (response.success && response.games && response.games.length > 0) {
        // This likely won't happen with new handler structure but harmless
        setFastSearchResults(response.games);
        setSuccess(`Found ${response.games.length} game(s) in ${Date.now() - startTime}ms`);
        setTimeout(() => setSuccess(null), 3000);
      } else if (response.error) {
        // Only show error if we found NO results at all
        setFastSearchResults(prev => {
          if (prev.length === 0) setError(response.error);
          return prev;
        });
      } else {
        // If we got an empty object or undefined, try falling back to regular search logic or just show error
        setFastSearchResults(prev => {
          if (prev.length === 0) setError(`No results found for "${query}". Try a different search term or check the spelling.`);
          return prev;
        });
      }
    } catch (err) {
      setError('Failed to search. Check your internet connection and API credentials.');
      console.error('[FastSearch] Error:', { runId, query, err });
    } finally {
      if (typeof removeProgressListener === 'function') {
        removeProgressListener();
      }
      setIsFastSearching(false);
      console.log('[FastSearch] end', { runId, query, timestamp: new Date().toISOString() });
    }
  };

  // Listen for progressive image search results
  useEffect(() => {
    const handleImagesFound = (_event: any, data: any) => {
      if (!data || !data.images || data.images.length === 0) return;

      console.log('[FastSearch] images event', {
        eventQuery: data.query,
        eventGameId: data.gameId,
        eventRequestId: data.requestId,
        imagesCount: data.images.length,
        selectedGameId: selectedGameIdRef.current,
        currentSearchQuery: currentSearchQueryRef.current,
        timestamp: new Date().toISOString()
      });

      if (data.requestId && data.requestId !== fastSearchActiveRunIdRef.current) {
        console.log('[FastSearch] Discarding images event (requestId mismatch)', {
          eventRequestId: data.requestId,
          expectedRequestId: fastSearchActiveRunIdRef.current
        });
        return;
      }

      // Guard: Discard if this result is for a different query or game than what's currently active in the UI
      if (data.query && data.query !== currentSearchQueryRef.current) {
        console.log(`[GameManager] Discarding images for "${data.query}" (Current query: "${currentSearchQueryRef.current}")`);
        return;
      }
      if (data.gameId && data.gameId !== selectedGameIdRef.current) {
        console.log(`[GameManager] Discarding images because game changed (Event gameId: ${data.gameId}, Current: ${selectedGameIdRef.current})`);
        return;
      }

      const newImages: any[] = [];

      const seenUrls = new Set<string>();

      data.images.forEach((img: any) => {
        const normalizedUrl = normalizeImageUrl(img.url);
        if (!normalizedUrl || !matchesAnimationFilter(normalizedUrl, img)) return;
        const dedupeKey = `${normalizedUrl}|${img.source}|${img.type}`;
        if (seenUrls.has(dedupeKey)) return;
        seenUrls.add(dedupeKey);

        const imageObj: any = {
          id: `${img.source}-${img.type}-${Math.random().toString(36).substr(2, 9)}`,
          name: img.name || img.source,
          source: img.source,
          url: normalizedUrl,
          mime: img.mime,
          isAnimated: img.isAnimated ?? img.animated ?? img.is_animated,
          notes: img.notes,
          screenshotUrls: (img.type === 'banner' || img.type === 'screenshot') ? [normalizedUrl] : undefined,
          foundOrder: nextImageResultOrder(),
        };

        if (img.type === 'boxart') {
          imageObj.boxArtUrl = normalizedUrl;
          imageObj.coverUrl = normalizedUrl;
        } else if (img.type === 'logo') {
          imageObj.logoUrl = normalizedUrl;
        } else if (img.type === 'icon') {
          imageObj.iconUrl = normalizedUrl;
        } else {
          imageObj.bannerUrl = normalizedUrl;
          imageObj.type = 'banner'; // Force type for grouping logic
        }

        if (
          img.type === 'boxart' ||
          img.type === 'banner' ||
          img.type === 'screenshot' ||
          img.type === 'hero' ||
          img.type === 'logo' ||
          img.type === 'icon'
        ) {
          newImages.push(imageObj);
        }
      });

      // Merge in arrival order across all providers, deduping across prior chunks.
      setImageSearchResults(prev => {
        const seen = new Set(prev.map((i: any) => {
          const url = normalizeImageUrl(i.url || i.boxArtUrl || i.coverUrl || i.bannerUrl || i.screenshotUrls?.[0] || i.logoUrl || i.iconUrl);
          const type = i.type || (i.boxArtUrl || i.coverUrl ? 'boxart' : i.logoUrl ? 'logo' : i.iconUrl ? 'icon' : 'banner');
          return `${url || ''}|${i.source || ''}|${type}`;
        }));
        const additions = newImages.filter((i: any) => {
          const url = normalizeImageUrl(i.url || i.boxArtUrl || i.coverUrl || i.bannerUrl || i.screenshotUrls?.[0] || i.logoUrl || i.iconUrl);
          const type = i.type || (i.boxArtUrl || i.coverUrl ? 'boxart' : i.logoUrl ? 'logo' : i.iconUrl ? 'icon' : 'banner');
          const key = `${url || ''}|${i.source || ''}|${type}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return [...prev, ...additions];
      });

    };

    const removeListener = window.electronAPI?.on && window.electronAPI.on('metadata:gameImagesFound', handleImagesFound);
    return () => {
      if (typeof removeListener === 'function') removeListener();
    };
  }, [matchesAnimationFilter, normalizeProviderName]);

  // Listen for provider status updates during image search
  useEffect(() => {
    const handleProviderStatus = (_event: any, data: any) => {
      // Discard events from stale requests
      if (data.requestId !== undefined && data.requestId !== fastSearchActiveRunIdRef.current) {
        return;
      }
      if (data.currentProvider) {
        const currentProvider = normalizeProviderName(data.currentProvider);
        const remainingProviders = (data.remaining || []).map((provider: string) => normalizeProviderName(provider));
        setImageSearchProviderStatus({ currentProvider, remaining: remainingProviders });
        setProviderProgress((prev) => updateProviderProgressFromEvent(prev, data.currentProvider, data.remaining || []));
      } else {
        // Empty provider = search complete
        setImageSearchProviderStatus(null);
        setProviderProgress((prev) => markAllProvidersCompleted(prev));
      }
    };

    const removeProviderListener = window.electronAPI?.on && window.electronAPI.on('metadata:imageSearchProviderStatus', handleProviderStatus);
    return () => {
      if (typeof removeProviderListener === 'function') removeProviderListener();
    };
  }, []);

  // Show images from a fast search result (click to display, not auto-apply)
  const handleSelectFastGame = async (gameResult: FastSearchGame) => {
    console.log('[FastSearch] select result', {
      resultId: gameResult.id,
      resultName: gameResult.name,
      resultSource: gameResult.source,
      selectedGameId: selectedGame?.id,
      selectedGameTitle: selectedGame?.title,
      imageAnimationFilter,
      timestamp: new Date().toISOString()
    });
    setSelectedFastGame(gameResult);
    setFastSearchResults([]);
    setIsSearchingImages(true);
    setError(null);
    setImageSearchQuery(gameResult.name); // Ensure search box has the name if we need it

    // Clear previous results explicitly before starting new search
    setImageSearchResults([]);
    setFailedImageSearchUrls(new Set());
    setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });

    // Set the search type to boxart by default and show valid tab
    if (!showImageSearch) {
      setShowImageSearch({ type: 'boxart', gameId: selectedGame!.id });
    }

    if (showImageSearch?.type) {
      setActiveImageSearchTab(showImageSearch.type as any);
    } else {
      setActiveImageSearchTab('all');
    }

    try {
      console.log(`[FastSearch] Fetching images for ${gameResult.name}...`);

      // Call the multi-source fetcher - results will come via event listener above
      // But we ALSO assume the final response contains everything, so we merge it as a "final consistent state"
      const igdbIdParam = (() => {
        if (gameResult.source !== 'igdb') return undefined;
        if (typeof gameResult.id === 'number' && Number.isFinite(gameResult.id)) return gameResult.id;
        const rawId = String(gameResult.id || '');
        if (rawId.startsWith('igdb-')) {
          const parsed = Number(rawId.replace('igdb-', ''));
          return Number.isFinite(parsed) ? parsed : undefined;
        }
        return undefined;
      })();

      const response = await (window.electronAPI as any).fetchGameImages(
        gameResult.name,
        selectedGame?.id.startsWith('steam-') ? selectedGame.id.replace('steam-', '') : undefined,
        igdbIdParam,
        includeAnimatedInRequests,
        fastSearchActiveRunIdRef.current,
        selectedGame!.id
      );

      // Guard: Discard final response if we switched games
      if (selectedGameIdRef.current !== selectedGame!.id) {
        console.log('[FastSearch] Discarding final response because game changed');
        return;
      }

      console.log('[FastSearch] Final response:', response);
      console.log('[FastSearch] final response meta', {
        resultId: gameResult.id,
        resultName: gameResult.name,
        resultSource: gameResult.source,
        imagesCount: response?.images?.length || 0,
        selectedGameId: selectedGame?.id,
        currentSearchQuery: currentSearchQueryRef.current,
        timestamp: new Date().toISOString()
      });

      if (response.success && response.images && response.images.length > 0) {
        // Keep progressive event order intact; do not overwrite state at completion.
        setSuccess(`Found ${response.images.length} images for "${gameResult.name}"`);
      } else if (response.error) {
        // Only show error if we really have NOTHING (check state?)
        // State might be empty if events failed.
        setError(response.error);
      } else {
        // Empty results
        if (steamGridDBResults.boxart.length === 0 && imageSearchResults.length === 0) {
          setError('No images found');
        }
      }

    } catch (err) {
      setError('Failed to fetch images');
      console.error('[FastSearch] fetch images error', { err, resultId: gameResult.id, resultName: gameResult.name });
    } finally {
      setIsSearchingImages(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  // Handle image selection - update immediately and save. isVideo: true when the asset is .webm (render with <video>).
  const handleSelectImage = async (imageUrl: string, type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon', isVideo?: boolean) => {
    if (!selectedGame || !editedGame) return;

    setActiveTab('images');

    // Globally block WebP usage for game artwork (both HTTP(S) and local paths).
    // Users should instead download/upload WEBM variants for animated assets.
    const lowerUrl = imageUrl.toLowerCase();
    if (/\.(webp)(\?|$)/i.test(lowerUrl)) {
      setError('WebP artwork is not supported. Please download the WEBM version from SteamGridDB (right-click the video > "Save video as...") and use "Upload WEBM" for this image type.');
      return;
    }

    // Delete old cached image only when the new URL is not already from our cache.
    // When imageUrl is onyx-local we just cached it (e.g. Upload WEBM); deleting here would remove the file we just wrote.
    if (!imageUrl.startsWith('onyx-local://')) {
      try {
        await window.electronAPI.deleteCachedImage(selectedGame.id, type as any);
      } catch (err) {
        console.warn('Error deleting old image:', err);
      }
    }

    const isV = isVideo === true || isWebmAssetUrl(imageUrl);
    // Update immediately for instant visual feedback
    const updatedGame = { ...editedGame };
    if (type === 'boxart') {
      updatedGame.boxArtUrl = imageUrl;
      updatedGame.boxArtIsVideo = isV;
      // Preserve other image types
      updatedGame.bannerUrl = editedGame.bannerUrl || selectedGame.bannerUrl || updatedGame.bannerUrl;
      updatedGame.logoUrl = editedGame.logoUrl || selectedGame.logoUrl || updatedGame.logoUrl;
    } else if (type === 'banner') {
      updatedGame.bannerUrl = imageUrl;
      updatedGame.heroUrl = imageUrl;
      updatedGame.bannerIsVideo = isV;
      updatedGame.heroIsVideo = isV;
      // Preserve other image types
      updatedGame.boxArtUrl = editedGame.boxArtUrl || selectedGame.boxArtUrl || updatedGame.boxArtUrl;
      updatedGame.logoUrl = editedGame.logoUrl || selectedGame.logoUrl || updatedGame.logoUrl;
    } else if (type === 'alternativeBanner') {
      updatedGame.alternativeBannerUrl = imageUrl;
      updatedGame.useAlternativeBackground = true;
      updatedGame.alternativeBannerIsVideo = isV;
      // Preserve other image types
      updatedGame.boxArtUrl = editedGame.boxArtUrl || selectedGame.boxArtUrl || updatedGame.boxArtUrl;
      updatedGame.bannerUrl = editedGame.bannerUrl || selectedGame.bannerUrl || updatedGame.bannerUrl;
      updatedGame.logoUrl = editedGame.logoUrl || selectedGame.logoUrl || updatedGame.logoUrl;
    } else if (type === 'logo') {
      updatedGame.logoUrl = imageUrl;
      updatedGame.logoIsVideo = isV;
      // Preserve other image types
      updatedGame.boxArtUrl = editedGame.boxArtUrl || selectedGame.boxArtUrl || updatedGame.boxArtUrl;
      updatedGame.bannerUrl = editedGame.bannerUrl || selectedGame.bannerUrl || updatedGame.bannerUrl;
      updatedGame.iconUrl = editedGame.iconUrl || selectedGame.iconUrl || updatedGame.iconUrl;
    } else if (type === 'icon') {
      updatedGame.iconUrl = imageUrl;
      updatedGame.iconIsVideo = isV;
      // Preserve other image types
      updatedGame.boxArtUrl = editedGame.boxArtUrl || selectedGame.boxArtUrl || updatedGame.boxArtUrl;
      updatedGame.bannerUrl = editedGame.bannerUrl || selectedGame.bannerUrl || updatedGame.bannerUrl;
      updatedGame.logoUrl = editedGame.logoUrl || selectedGame.logoUrl || updatedGame.logoUrl;
    }

    // Update state immediately so user sees the change
    setEditedGame(updatedGame);

    // Update local games state immediately
    setLocalGames(prevGames =>
      prevGames.map(g => g.id === updatedGame.id ? updatedGame : g)
    );

    imageChangedGameIdsRef.current.add(updatedGame.id);

    // Save in background - pass old game to delete old images
    // Don't reload library - just update local state
    try {
      await onSaveGame(updatedGame, selectedGame);
      // setSuccess('Image updated successfully'); // Disabled as per user request
      // setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError('Failed to save image');
      console.error('Error saving image:', err);
      // Revert local state on error
      setLocalGames(prevGames =>
        prevGames.map(g => g.id === selectedGame.id ? selectedGame : g)
      );
      setEditedGame({ ...selectedGame });
    }

    // Keep search panel open so user can select more images if needed
    // setShowImageSearch(null);
  };

  // Handle browse for local image/WEBM file
  const handleBrowseImage = async (type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => {
    if (!selectedGame || !editedGame) return;

    try {
      const imagePath = await window.electronAPI.showImageDialog();
      if (imagePath) {
        // Block WebP files at selection time – require users to choose WEBM
        // (for animated assets) or a non-WebP image format.
        if (/\.(webp)$/i.test(imagePath)) {
          setError('WebP files are not supported. Please save a WEBM video from SteamGridDB ("Save video as...") and select the .webm file instead.');
          return;
        }
        const cacheLocalFile = (window.electronAPI as any).cacheLocalFile;
        const result = cacheLocalFile
          ? await cacheLocalFile(imagePath, selectedGame.id, type)
          : { url: null, isVideo: false, error: 'Local cache API is unavailable in this build.' };

        if (!result?.url) {
          setError(result?.error || 'Failed to add file to cache. Try another image.');
          return;
        }

        await handleSelectImage(result.url, type, result.isVideo);
      }
    } catch (err) {
      console.error('Error browsing for image:', err);
      setError('Failed to select image file');
    }
  };

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
      setIsSearchingImages(false);
      setIsFastSearching(false);
      setIsSearchingMetadata(false);
      setIsApplyingMetadata(false);
      setImageSearchQuery(game.title);
      setImageSearchResults([]);
      setFailedImageSearchUrls(new Set());
      setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
      setFastSearchResults([]);
      setSelectedFastGame(null);
      setShowImageSearch(null);

      // Reset Fix Match state
      setShowFixMatch(false);
      setMetadataSearchResults([]);
      setMetadataSearchQuery('');
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

  // Handle save edited game
  const handleSave = async () => {
    if (!editedGame || !editedGame.title.trim()) {
      setError('Game title is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSaveGame(editedGame);
      setSuccess('Game saved successfully');
      setTimeout(() => {
        setSuccess(null);
        setExpandedGameId(null);
        setEditedGame(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save game');
      console.error('Error saving game:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedGameId || !onDeleteGame) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onDeleteGame(selectedGameId);
      setSuccess('Game deleted successfully');
      setShowDeleteConfirm(false);
      setSelectedGameId(null);
      setEditedGame(null);
      setExpandedGameId(null);
      if (onReloadLibrary) {
        await onReloadLibrary();
      }
      setTimeout(() => {
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete game');
      console.error('Error deleting game:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle fix match search
  const handleFixMatchSearch = async () => {
    if (!expandedGame) return;

    // Get Steam App ID from game ID or edited game
    const getSteamAppId = (): string | undefined => {
      const appIdMatch = editedGame?.id.match(/^steam-(.+)$/);
      return appIdMatch ? appIdMatch[1] : undefined;
    };

    const steamAppId = getSteamAppId();
    const query = metadataSearchQuery.trim() || expandedGame.title.trim();

    // If we have a Steam App ID, use it directly to fetch metadata
    if (steamAppId) {
      setIsSearchingMetadata(true);
      setError(null);
      setMetadataSearchResults([]);

      try {
        // Fetch metadata directly using Steam App ID
        const metadata = await window.electronAPI.searchArtwork(expandedGame.title, steamAppId);
        if (metadata) {
          // Update the edited game with metadata from Steam
          setEditedGame({
            ...editedGame!,
            title: expandedGame.title, // Keep original title
            description: metadata.description || metadata.summary || editedGame?.description,
            genres: metadata.genres || editedGame?.genres,
            releaseDate: metadata.releaseDate || editedGame?.releaseDate,
            developers: metadata.developers || editedGame?.developers,
            publishers: metadata.publishers || editedGame?.publishers,
            ageRating: metadata.ageRating || editedGame?.ageRating,
            userScore: metadata.rating ? Math.round(metadata.rating) : editedGame?.userScore,
            platform: metadata.platforms?.join(', ') || metadata.platform || 'steam',
            boxArtUrl: metadata.boxArtUrl || editedGame?.boxArtUrl || '',
            bannerUrl: metadata.bannerUrl || editedGame?.bannerUrl || '',
            alternativeBannerUrl: metadata.alternativeBannerUrl || editedGame?.alternativeBannerUrl || '',
            useAlternativeBackground: true,
            logoUrl: metadata.logoUrl || editedGame?.logoUrl,
            heroUrl: metadata.heroUrl || editedGame?.heroUrl,
            iconUrl: metadata.iconUrl || editedGame?.iconUrl,
          });
          setSuccess('Metadata updated from Steam Store API');
          setShowFixMatch(false);
          setMetadataSearchResults([]);
          setMetadataSearchQuery('');
          return;
        }
      } catch (err) {
        console.error('Error fetching metadata with Steam App ID:', err);
        // Fall through to regular search
      }
    }

    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setIsSearchingMetadata(true);
    setError(null);
    setMetadataSearchResults([]);

    try {
      // Use Steam App ID in search if available
      // Note: searchGames returns an array directly, not a {success, results} wrapper
      const response = await window.electronAPI.searchGames(query);
      const results = Array.isArray(response) ? response : (response.results || []);

      if (results.length > 0) {
        // Get the current game's Steam App ID if available
        const currentSteamAppId = expandedGame?.id.startsWith('steam-') ? expandedGame.id.replace('steam-', '') : undefined;

        // Show all results from all sources - let user choose
        const steamResults = results.filter((result: any) => result.source === 'steam');
        const otherResults = results.filter((result: any) => result.source !== 'steam');

        // Normalize query for matching
        const normalizedQuery = query.toLowerCase().trim();

        // Fuzzy scoring function: returns 0-100
        const getFuzzyScore = (title: string): number => {
          const normalizedTitle = (title || '').toLowerCase().trim();
          if (normalizedTitle === normalizedQuery) return 100; // Exact match
          if (normalizedTitle.startsWith(normalizedQuery)) return 90; // Starts with
          if (normalizedQuery.startsWith(normalizedTitle)) return 85; // Query starts with title
          if (normalizedTitle.includes(normalizedQuery)) return 70; // Contains
          if (normalizedQuery.includes(normalizedTitle)) return 65; // Query contains title

          // Word overlap scoring
          const queryWords = normalizedQuery.split(/\s+/).filter(w => w.length > 2);
          const titleWords = normalizedTitle.split(/\s+/).filter(w => w.length > 2);
          const matchingWords = queryWords.filter(qw =>
            titleWords.some(tw => tw.includes(qw) || qw.includes(tw))
          );
          const overlapScore = (matchingWords.length / Math.max(queryWords.length, 1)) * 50;
          return Math.max(overlapScore, 10); // Minimum score if no match
        };

        // Sort Steam results: matching Steam App ID first, then by fuzzy score, then by release date
        const sortedSteamResults = steamResults.sort((a: any, b: any) => {
          // First priority: matching Steam App ID
          const aMatchesAppId = currentSteamAppId && a.steamAppId === currentSteamAppId;
          const bMatchesAppId = currentSteamAppId && b.steamAppId === currentSteamAppId;
          if (aMatchesAppId && !bMatchesAppId) return -1;
          if (!aMatchesAppId && bMatchesAppId) return 1;

          // Second priority: fuzzy match score (higher is better)
          const aScore = getFuzzyScore(a.title);
          const bScore = getFuzzyScore(b.title);
          if (aScore !== bScore) return bScore - aScore;

          // Third priority: release date (newest first)
          const getDate = (result: any): number => {
            if (result.releaseDate) {
              if (typeof result.releaseDate === 'number') {
                return result.releaseDate * 1000;
              }
              return new Date(result.releaseDate).getTime();
            }
            if (result.year) {
              return new Date(result.year, 0, 1).getTime();
            }
            return 0;
          };

          const aDate = getDate(a);
          const bDate = getDate(b);
          if (aDate !== bDate && aDate > 0 && bDate > 0) {
            return bDate - aDate;
          }

          return 0;
        });

        // Sort other results: by fuzzy score, then by source priority
        const sortedOtherResults = otherResults.sort((a: any, b: any) => {
          // First priority: fuzzy match score
          const aName = a.title || ((a as any).name || '');
          const bName = b.title || ((b as any).name || '');
          const aScore = getFuzzyScore(aName);
          const bScore = getFuzzyScore(bName);
          if (aScore !== bScore) return bScore - aScore;

          // Second priority: source priority (IGDB > RAWG > SteamGridDB)
          const sourcePriority: Record<string, number> = {
            'igdb': 3,
            'rawg': 2,
            'steamgriddb': 1,
          };
          const aPriority = sourcePriority[a.source] || 0;
          const bPriority = sourcePriority[b.source] || 0;
          if (aPriority !== bPriority) {
            return bPriority - aPriority;
          }

          return 0;
        });

        // Combine: Steam results first, then other results (show all options)
        const allResults = [...sortedSteamResults, ...sortedOtherResults];

        if (allResults.length === 0) {
          setError('No matching results found. Try a different search term or check if the game is available in the metadata databases.');
          setMetadataSearchResults([]);
          return;
        }

        console.log(`[GameManager] Found ${allResults.length} search result(s) for "${query}" (${steamResults.length} Steam, ${sortedOtherResults.length} other)`);

        setMetadataSearchResults(allResults);
      } else {
        setError('No results found. Try a different search term or configure metadata providers in Settings > APIs.');
      }
    } catch (err) {
      setError('Failed to search for games');
      console.error('Error searching games:', err);
    } finally {
      setIsSearchingMetadata(false);
    }
  };

  // Handle select metadata match
  // Uses the same robust metadata fetching as the importer: tries all sources, moves to next on rate limits
  const handleSelectMetadataMatch = async (result: { id: string; source: string; steamAppId?: string; title?: string }) => {
    if (!expandedGame) return;

    setIsApplyingMetadata(true);
    setError(null);

    try {
      const gameTitle = result.title || expandedGame.title;

      // Extract Steam App ID from result (from any source that might have it)
      const steamAppId = result.steamAppId || (result.id.startsWith('steam-') ? result.id.replace('steam-', '') : undefined);

      // Determine new game ID - use Steam App ID if available, otherwise use result ID
      let newGameId = expandedGame.id;
      if (steamAppId) {
        newGameId = `steam-${steamAppId}`;
      } else if (result.source === 'igdb' && result.id.startsWith('igdb-')) {
        newGameId = result.id;
      } else if (result.source === 'rawg' && result.id.startsWith('rawg-')) {
        newGameId = result.id;
      }

      // Fetch complete metadata using searchArtwork with timeout
      // searchArtwork will:
      // 1. Extract Steam App ID from search results if not provided
      // 2. Try Steam Store API first, then IGDB if not on Steam
      // 3. Move to next source on rate limits (no retries)
      console.log(`[GameManager] Fetching metadata for "${gameTitle}" with Steam App ID: ${steamAppId || 'none'}`);

      // Add timeout to prevent indefinite spinning (15 seconds)
      const timeoutPromise = new Promise<any>((_, reject) =>
        setTimeout(() => reject(new Error('Metadata fetch timeout')), 15000)
      );

      const metadata = await Promise.race([
        window.electronAPI.searchArtwork(gameTitle, steamAppId),
        timeoutPromise
      ]).catch(err => {
        console.warn('[GameManager] Metadata fetch failed or timed out:', err);
        setError('Failed to fetch metadata - request timed out. Please try again.');
        return null;
      });

      if (metadata && editedGame) {
        // If description is still empty, try fetching from alternative sources
        let finalDescription = (metadata.description || metadata.summary || '').trim();
        let finalReleaseDate = metadata.releaseDate || '';
        let finalGenres = metadata.genres || [];
        let finalDevelopers = metadata.developers || [];
        let finalPublishers = metadata.publishers || [];
        let finalAgeRating = metadata.ageRating || '';
        let finalRating = metadata.rating || 0;
        let finalPlatform = metadata.platforms?.join(', ') || metadata.platform || expandedGame.platform;

        // If description is still empty, try fetching description separately
        if (!finalDescription && steamAppId) {
          try {
            console.log(`[GameManager] Description empty, fetching from Steam Store API for App ID: ${steamAppId}`);
            const steamGameId = `steam-${steamAppId}`;
            const descriptionResult = await window.electronAPI.fetchGameDescription(steamGameId);
            if (descriptionResult && descriptionResult.success) {
              finalDescription = (descriptionResult.description || descriptionResult.summary || '').trim();
              finalReleaseDate = descriptionResult.releaseDate || finalReleaseDate;
              finalGenres = descriptionResult.genres || finalGenres;
              finalDevelopers = descriptionResult.developers || finalDevelopers;
              finalPublishers = descriptionResult.publishers || finalPublishers;
              finalAgeRating = descriptionResult.ageRating || finalAgeRating;
              finalRating = descriptionResult.rating || finalRating;
              finalPlatform = descriptionResult.platforms?.join(', ') || finalPlatform;
              console.log(`[GameManager] Successfully fetched description from Steam Store API, length: ${finalDescription.length}`);
            }
          } catch (descErr) {
            console.warn(`[GameManager] Error fetching description from Steam Store API:`, descErr);
          }
        }

        // Update the edited game with all metadata and images
        const updatedGame: Game = {
          ...editedGame!,
          id: newGameId,
          platform: finalPlatform,
          title: gameTitle,
          description: finalDescription || editedGame!.description,
          genres: finalGenres.length > 0 ? finalGenres : editedGame!.genres,
          releaseDate: finalReleaseDate || editedGame!.releaseDate,
          developers: finalDevelopers.length > 0 ? finalDevelopers : editedGame!.developers,
          publishers: finalPublishers.length > 0 ? finalPublishers : editedGame!.publishers,
          ageRating: finalAgeRating || editedGame!.ageRating,
          userScore: finalRating ? Math.round(finalRating) : editedGame!.userScore,
          boxArtUrl: metadata.boxArtUrl || editedGame!.boxArtUrl || '',
          bannerUrl: metadata.bannerUrl || editedGame!.bannerUrl || '',
          alternativeBannerUrl: metadata.alternativeBannerUrl || editedGame!.alternativeBannerUrl || '',
          useAlternativeBackground: true,
          logoUrl: metadata.logoUrl || editedGame!.logoUrl,
          heroUrl: metadata.heroUrl || editedGame!.heroUrl,
          iconUrl: metadata.iconUrl || editedGame!.iconUrl,
          screenshots: metadata.screenshots || editedGame!.screenshots || [],
          links: metadata.links || editedGame!.links || [],
        };

        setEditedGame(updatedGame);



        // Save the game immediately - pass old game to handle ID changes and prevent duplicates
        await onSaveGame(updatedGame, expandedGame);

        // const sourceName = steamAppId ? 'Steam Store API' : (result.source === 'igdb' ? 'IGDB' : result.source === 'rawg' ? 'RAWG' : result.source);
        // setSuccess(`Metadata and images updated from ${sourceName}`); // Removed to reduce noise
        setShowFixMatch(false);
        setMetadataSearchResults([]);
        setMetadataSearchQuery('');

        // Reload the game data
        if (onReloadLibrary) {
          await onReloadLibrary();
        }
      } else {
        setError('Failed to fetch metadata. Please try again.');
      }
    } catch (err) {
      setError('Failed to update metadata');
      console.error('Error updating metadata:', err);
    } finally {
      setIsApplyingMetadata(false);
    }
  };

  const handleToggleFixMatch = async () => {
    if (!editedGame || !selectedGame) {
      return;
    }

    const wasHidden = !showFixMatch;
    setShowFixMatch(!showFixMatch);

    if (wasHidden) {
      const query = editedGame.title || selectedGame.title;
      setMetadataSearchQuery(query);

      if (!query) {
        return;
      }

      setIsSearchingMetadata(true);
      setMetadataSearchResults([]);
      setError(null);

      try {
        const response = await window.electronAPI.searchGames(query);
        const results = Array.isArray(response) ? response : (response.results || []);

        if (results.length === 0) {
          setError('No matches found. Try a different search term.');
          setMetadataSearchResults([]);
          return;
        }

        const normalizedQuery = query.toLowerCase().trim();
        const sortedResults = results.sort((a: any, b: any) => {
          const scoreA = a.score || 0;
          const scoreB = b.score || 0;
          if (scoreA !== scoreB) return scoreB - scoreA;

          const getDate = (result: any) => {
            if (result.releaseDate) return typeof result.releaseDate === 'number' ? result.releaseDate * 1000 : new Date(result.releaseDate).getTime();
            if (result.year) return new Date(result.year, 0, 1).getTime();
            return 0;
          };

          const dateA = getDate(a);
          const dateB = getDate(b);
          if (dateA !== dateB && dateA > 0 && dateB > 0) return dateB - dateA;

          const nameA = (a.title || a.name || '').toLowerCase().trim();
          const nameB = (b.title || b.name || '').toLowerCase().trim();
          if (nameA === normalizedQuery && nameB !== normalizedQuery) return -1;
          if (nameA !== normalizedQuery && nameB === normalizedQuery) return 1;

          return 0;
        });

        setMetadataSearchResults(sortedResults);
      } catch (err) {
        console.error('Error searching metadata:', err);
        setError('Failed to search for games. Please try again.');
      } finally {
        setIsSearchingMetadata(false);
      }

      return;
    }

    setMetadataSearchResults([]);
    setMetadataSearchQuery('');
    setError(null);
  };

  const handleCancelEditing = () => {
    setExpandedGameId(null);
    setEditedGame(null);
    setShowFixMatch(false);
    setSelectedGameId(null);
    setMetadataSearchResults([]);
    setMetadataSearchQuery('');
    setIsSearchingMetadata(false);
  };

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

  const handleConfirmRefreshAction = async () => {
    setShowRefreshConfirm(false);
    const mode = refreshMode;
    setRefreshMode(null);
    if (!mode) return;

    try {
      setError(null);
      setSuccess(null);
      if (mode === 'optimizer') {
        await handleOptimizeAllImages();
      } else if (mode === 'images') {
        setRefreshProgress({ current: 0, total: localGames.length, message: 'Searching for missing images...', mode: 'missing' });
        await handleRefreshMetadata('missing');
      } else if (mode === 'links') {
        const credentials = await window.electronAPI.getAPICredentials?.();
        const hasIGDB = !!(credentials?.igdbClientId?.trim() && credentials?.igdbClientSecret?.trim());
        if (!hasIGDB) {
          setError('Links refresh requires IGDB credentials. Go to Settings -> APIs and add IGDB client ID + secret.');
          return;
        }
        setRefreshProgress({ current: 0, total: localGames.length, message: 'Refreshing links...', mode: 'links' });
        await handleRefreshMetadata('links');
      } else if (mode === 'nuclear') {
        onOpenImporterWithMode?.(mode);
      } else {
        onOpenImporterWithMode?.('nuclear');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
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
                      hasRawImageResults={hasAnyRawImageResults(imageSearchResults, steamGridDBResults)}
                      hasVisibleImageResults={hasAnyVisibleImageResults(orderedResultsByType, providerFilter)}
                      onOpenImageSearch={openImageSearchAndSearch}
                      onOpenArtworkContextMenu={handleOpenArtworkContextMenu}
                      onImageSearchQueryChange={setImageSearchQuery}
                      onSubmitImageSearch={handleSearchImages}
                      onFastSearch={handleFastSearch}
                      onBrowseImage={handleBrowseImage}
                      onClearResults={handleClearImageSearchState}
                      onProviderFilterChange={setProviderFilter}
                      getImageCountForProvider={(providerName) => getImageCountForProvider(orderedResultsByType, providerName)}
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
        onFix={async (fixes, ignoredGames) => {
          setShowMatchFix(false);
          setRefreshProgress({ current: 0, total: fixes.size, message: 'Applying fixes...' });

          try {
            // Apply fixes by fetching metadata for each game with the selected provider
            const gameIdsToRefresh = Array.from(fixes.keys());
            let fixedCount = 0;

            for (const [gameId, fix] of fixes.entries()) {
              const game = games.find(g => g.id === gameId);
              if (game) {
                setRefreshProgress({
                  current: fixedCount + 1,
                  total: gameIdsToRefresh.length,
                  message: `Fetching metadata for ${game.title}...`,
                  gameTitle: game.title
                });
                await window.electronAPI.fetchAndUpdateByProviderId(gameId, fix.providerId, fix.providerSource);
                fixedCount++;
              }
            }

            setSuccess(`Successfully fixed ${fixedCount} game${fixedCount !== 1 ? 's' : ''}${ignoredGames.size > 0 ? `, ${ignoredGames.size} ignored` : ''}`);
            if (onReloadLibrary) {
              await onReloadLibrary();
            }

            // Check if there are missing boxart games to show after fixing matches
            if (missingBoxartGames.length > 0) {
              setShowBoxartFix(true);
              setRefreshProgress(null);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to apply fixes');
            setTimeout(() => {
              setRefreshProgress(null);
            }, 2000);
          } finally {
            // Only clear progress if we're not showing boxart fix dialog
            if (missingBoxartGames.length === 0) {
              setTimeout(() => {
                setRefreshProgress(null);
              }, 2000);
            }
          }
        }}
        onCancel={async () => {
          setShowMatchFix(false);
          setUnmatchedGames([]);
          // Check if there are missing boxart games to show
          if (missingBoxartGames.length > 0) {
            setShowBoxartFix(true);
            setRefreshProgress(null);
          } else {
            setRefreshProgress(null);
          }
        }}
      />

      {/* Boxart Fix Dialog */}
      <BoxartFixDialog
        isOpen={showBoxartFix}
        missingBoxartGames={missingBoxartGames}
        onFix={async (fixes) => {
          setShowBoxartFix(false);
          setRefreshProgress({ current: 0, total: fixes.size, message: 'Applying boxart...' });

          try {
            let fixedCount = 0;

            for (const [gameId, boxartUrl] of fixes.entries()) {
              const game = localGames.find(g => g.id === gameId);
              if (game) {
                setRefreshProgress({
                  current: fixedCount + 1,
                  total: fixes.size,
                  message: `Caching and applying boxart for ${game.title}...`,
                  gameTitle: game.title
                });

                // Update the game with the selected boxart URL
                // The game store update handler will automatically cache HTTPS URLs
                const updatedGame = { ...game, boxArtUrl: boxartUrl };
                await onSaveGame(updatedGame);
                fixedCount++;
              }
            }

            setSuccess(`Successfully applied boxart for ${fixedCount} game${fixedCount !== 1 ? 's' : ''}`);

            // If we were in the middle of a refresh, continue from where we left off
            if (refreshState && refreshState.continueFromIndex !== undefined) {
              setRefreshProgress({
                current: refreshState.continueFromIndex,
                total: games.length,
                message: 'Continuing refresh...'
              });
              // Reload library first to get updated games
              if (onReloadLibrary) {
                await onReloadLibrary();
              }
              // Continue refresh from the next game
              await handleRefreshMetadata(refreshState.mode || 'all', refreshState.continueFromIndex + 1);
            } else {
              // Normal completion - reload library
              if (onReloadLibrary) {
                await onReloadLibrary();
              }
              setTimeout(() => {
                setRefreshProgress(null);
              }, 2000);
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to apply boxart');
            setTimeout(() => {
              setRefreshProgress(null);
            }, 2000);
          }
        }}
        onCancel={() => {
          setShowBoxartFix(false);
          setRefreshProgress(null);
        }}
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


