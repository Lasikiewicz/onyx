import React, { useState, useEffect, useMemo } from 'react';
import { Game, MissingGame, FastSearchGame, IGDBGameResult } from '../types/game';
import { ConfirmationDialog } from './ConfirmationDialog';
import { MatchFixDialog } from './MatchFixDialog';
import { RefreshMetadataDialog } from './RefreshMetadataDialog';
import { BoxartFixDialog } from './BoxartFixDialog';
import { RemoveDeletedGamesDialog } from './RemoveDeletedGamesDialog';
import { ImageContextMenu } from './ImageContextMenu';
import { GameList } from './game-manager/GameList';
import { MetadataTab } from './game-manager/MetadataTab';
import { ImagesTab } from './game-manager/ImagesTab';
import { LinksTab } from './game-manager/LinksTab';
import { ModManagerTab } from './game-manager/ModManagerTab';

interface GameManagerProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  onSaveGame: (game: Game, oldGame?: Game) => Promise<void>;
  onDeleteGame?: (gameId: string) => Promise<void>;
  onReloadLibrary?: () => Promise<void>;
  initialGameId?: string | null;
  initialTab?: 'metadata' | 'images' | 'links' | 'modManager';
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
}) => {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [showImageSearch, setShowImageSearch] = useState<{ type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon'; gameId: string } | null>(null);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [imageSearchResults, setImageSearchResults] = useState<any[]>([]);
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
  const [refreshMode, setRefreshMode] = useState<'all' | 'missing' | 'links' | null>(null);
  const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number; message: string; gameTitle?: string; links?: Array<{ name: string; url: string }>; images?: string[]; mode?: 'all' | 'missing' | 'links' } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon' } | null>(null);
  const [showMatchFix, setShowMatchFix] = useState(false);
  const [showRemoveDeletedDialog, setShowRemoveDeletedDialog] = useState(false);
  const [missingGames, setMissingGames] = useState<MissingGame[]>([]);
  const [isScanningMissingGames, setIsScanningMissingGames] = useState(false);

  const [unmatchedGames, setUnmatchedGames] = useState<Array<{ gameId: string; title: string; searchResults: any[] }>>([]);
  const [showBoxartFix, setShowBoxartFix] = useState(false);
  const [missingBoxartGames, setMissingBoxartGames] = useState<Array<{ gameId: string; title: string; steamAppId?: string }>>([]);
  const [refreshState, setRefreshState] = useState<{ mode: 'all' | 'missing' | 'links' | null; continueFromIndex?: number } | null>(null);
  const [shouldSelectFirstGameAfterRefresh, setShouldSelectFirstGameAfterRefresh] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFastSearching, setIsFastSearching] = useState(false);
  const [fastSearchResults, setFastSearchResults] = useState<FastSearchGame[]>([]);
  const [selectedFastGame, setSelectedFastGame] = useState<FastSearchGame | null>(null);
  const [gameListView, setGameListView] = useState<'boxart' | 'icon' | 'text'>('boxart');
  const [showAnimatedImages, setShowAnimatedImages] = useState(false);
  const [imageSearchProviderStatus, setImageSearchProviderStatus] = useState<{ currentProvider: string; remaining: string[] } | null>(null);

  // Refs to track current state for async IPC events
  const selectedGameIdRef = React.useRef(selectedGameId);
  const currentSearchQueryRef = React.useRef(imageSearchQuery);
  const fastSearchRunIdRef = React.useRef(0);
  const imageSearchRunIdRef = React.useRef(0);
  const fastSearchActiveRunIdRef = React.useRef(0);

  useEffect(() => {
    selectedGameIdRef.current = selectedGameId;
  }, [selectedGameId]);

  useEffect(() => {
    currentSearchQueryRef.current = imageSearchQuery;
  }, [imageSearchQuery]);

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
      const result = await window.electronAPI.refreshAllMetadata({
        allGames: mode === 'all',
        linksOnly: mode === 'links',
        continueFromIndex: continueFromIndex
      });

      if (result.success) {
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
      // Only update if the image URLs have actually changed
      const hasChanges =
        selectedGame.boxArtUrl !== editedGame.boxArtUrl ||
        selectedGame.bannerUrl !== editedGame.bannerUrl ||
        selectedGame.logoUrl !== editedGame.logoUrl;

      if (hasChanges) {
        setEditedGame({ ...selectedGame });
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
        const game = games.find(g => g.id === initialGameId);
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

  // Reset search state when selected game changes
  useEffect(() => {
    if (selectedGame) {
      setActiveTab('metadata');
      setIsSearchingImages(false);
      setIsFastSearching(false);
      setIsSearchingMetadata(false);
      setIsApplyingMetadata(false);
      setShowImageSearch(null);
      setImageSearchResults([]);
      setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
      setFastSearchResults([]);
      setActiveImageSearchTab('all');
      setImageSearchQuery('');
      setImageSearchProviderStatus(null);
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
        const newSelectedGame = games.find(g => g.id === selectedGameId);

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
      // Invalidate in-flight image search requests so backend aborts
      fastSearchActiveRunIdRef.current = ++fastSearchRunIdRef.current;
      imageSearchRunIdRef.current++;
    }
  }, [isOpen, initialTab]);

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
          const updatedGame = library.find(g => g.id === targetGame.id);
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
  const handleSearchImages = async (imageType: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon', useWeb: boolean = false) => {
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
    const query = imageSearchQuery.trim() || selectedGame.title.trim();

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
      showAnimatedImages,
      timestamp: new Date().toISOString()
    });

    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setIsSearchingImages(true);
    setError(null);

    // Initial clearing - simplified to avoid clearing if we are just switching tabs
    if (!steamAppId && !useWeb) {
      setImageSearchResults([]);
      setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
    } else if (useWeb) {
      // Only clear if starting a fresh web search
      setImageSearchResults([]);
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
              if (!url) return;
              steamResults.push({
                id: `steam-${steamAppId}`,
                name: selectedGame.title,
                title: selectedGame.title,
                [type === 'boxart' ? 'boxArtUrl' : type === 'logo' ? 'logoUrl' : type === 'icon' ? 'iconUrl' : type === 'alternativeBanner' ? 'alternativeBannerUrl' : 'bannerUrl']: url,
                source: 'steam',
                score: 10000
              });
            };

            if (effectiveImageType === 'boxart') addResult(steamMetadata.boxArtUrl, 'boxart');
            else if (effectiveImageType === 'banner') addResult(steamMetadata.bannerUrl, 'banner');
            else if (effectiveImageType === 'logo') addResult(steamMetadata.logoUrl, 'logo');
            else if (effectiveImageType === 'icon') addResult(steamMetadata.iconUrl, 'icon');

            if (steamResults.length > 0) {
              setSteamGridDBResults(prev => ({
                ...prev,
                [effectiveImageType]: [...steamResults, ...prev[effectiveImageType]]
              }));
            }
          }
        })
        .catch(err => console.error('[ImageSearch] Steam artwork error', { runId, query, err }))
        .finally(checkFinished);
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
                  flattenedResults.push({
                    id: `${gameResult.gameId}-${img.url}`,
                    name: gameResult.gameName,
                    title: gameResult.gameName,
                    boxArtUrl: effectiveImageType === 'boxart' ? img.url : undefined,
                    bannerUrl: effectiveImageType === 'banner' ? img.url : undefined,
                    logoUrl: effectiveImageType === 'logo' ? img.url : undefined,
                    iconUrl: effectiveImageType === 'icon' ? img.url : undefined,
                    coverUrl: effectiveImageType === 'boxart' ? img.url : undefined,
                    source: img.source || 'web',
                    score: img.score,
                    width: img.width,
                    height: img.height,
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
          }).finally(checkFinished)
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

                // Sort IGDB results: exact matches first, then by release date (newest first)
                if (filteredIGDBResults.length > 0) {
                  const normalizedQuery = query.toLowerCase().trim();
                  filteredIGDBResults.sort((a, b) => {
                    const aName = (a.name || '').toLowerCase().trim();
                    const bName = (b.name || '').toLowerCase().trim();

                    const aExact = aName === normalizedQuery;
                    const bExact = bName === normalizedQuery;

                    if (aExact && !bExact) return -1;
                    if (!aExact && bExact) return 1;

                    // If both or neither are exact, sort by release date (newest first)
                    if (aExact === bExact) {
                      const aDate = a.releaseDate ? (typeof a.releaseDate === 'number' ? a.releaseDate : new Date(a.releaseDate).getTime()) : 0;
                      const bDate = b.releaseDate ? (typeof b.releaseDate === 'number' ? b.releaseDate : new Date(b.releaseDate).getTime()) : 0;
                      if (aDate !== bDate && aDate > 0 && bDate > 0) {
                        return bDate - aDate; // Newest first
                      }
                    }

                    return 0; // Keep original order for non-exact matches
                  });
                  // Update results immediately as they come in
                  setImageSearchResults(prev => [...prev, ...filteredIGDBResults]);
                }
              }
              return igdbResponse;
            }).catch((err: any) => {
              console.error('[ImageSearch] IGDB search error', { runId, query, err });
              return null;
            }).finally(checkFinished)
          );
        }
        // Search SteamGridDB for the specific image type
        activeSearches++;
        searchPromises.push(
          window.electronAPI.searchImages(query, effectiveImageType as any, steamAppId, showAnimatedImages).then((sgdbResponse: any) => {
            if (selectedGameIdRef.current !== selectedGame.id || currentSearchQueryRef.current !== query) return;
            if (sgdbResponse.success && sgdbResponse.images) {
              const flattenedResults: any[] = [];
              sgdbResponse.images.forEach((gameResult: any) => {
                gameResult.images.forEach((img: any) => {
                  // Check if this is an official Steam image (high score and specific naming)
                  const isOfficialSteam = img.score >= 1000 || gameResult.gameName?.includes('Official Steam');

                  flattenedResults.push({
                    id: gameResult.gameId,
                    name: gameResult.gameName,
                    title: gameResult.gameName,
                    boxArtUrl: effectiveImageType === 'boxart' ? img.url : undefined,
                    bannerUrl: effectiveImageType === 'banner' ? img.url : undefined,
                    logoUrl: effectiveImageType === 'logo' ? img.url : undefined,
                    coverUrl: effectiveImageType === 'boxart' ? img.url : undefined,
                    source: isOfficialSteam ? 'steam' : 'steamgriddb',
                    score: img.score,
                    width: img.width,
                    height: img.height,
                  });
                });
              });

              // Sort results: official Steam images first, then exact matches, then by score
              const normalizedQuery = query.toLowerCase().trim();
              flattenedResults.sort((a, b) => {
                // Prioritize official Steam images (source === 'steam')
                const aIsSteam = a.source === 'steam';
                const bIsSteam = b.source === 'steam';
                if (aIsSteam && !bIsSteam) return -1;
                if (!aIsSteam && bIsSteam) return 1;

                // Then check for exact match
                const aName = a.name?.toLowerCase().trim() || '';
                const bName = b.name?.toLowerCase().trim() || '';
                const aExact = aName === normalizedQuery;
                const bExact = bName === normalizedQuery;

                if (aExact && !bExact) return -1;
                if (!aExact && bExact) return 1;

                // Finally sort by score
                return (b.score || 0) - (a.score || 0);
              });

              if (flattenedResults.length > 0) {
                setSteamGridDBResults(prev => ({
                  ...prev,
                  [effectiveImageType]: [...flattenedResults, ...prev[effectiveImageType]]
                }));
              }
            }
            return sgdbResponse;
          }).catch((err: any) => {
            console.error('[ImageSearch] SteamGridDB search error', { runId, query, err });
            return null;
          }).finally(checkFinished)
        );
      }

      // We do NOT await Promise.allSettled here anymore, as we want async updates.
      // But we need to ensure at least one search started.
      if (activeSearches === 0) {
        setIsSearchingImages(false);
      }


    } catch (err) {
      setError(`Failed to search for ${imageType}`);
      console.error(`Error searching ${imageType}:`, err);
    } finally {
      setIsSearchingImages(false);
    }
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
      showAnimatedImages,
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
      const sgdbResults = {
        boxart: [] as any[],
        banner: [] as any[],
        alternativeBanner: [] as any[],
        logo: [] as any[],
        icon: [] as any[],
      };

      const seenUrls = new Set<string>();

      data.images.forEach((img: any) => {
        const dedupeKey = `${img.url}|${img.source}|${img.type}`;
        if (!img.url || seenUrls.has(dedupeKey)) return;
        seenUrls.add(dedupeKey);

        const imageObj: any = {
          id: `${img.source}-${img.type}-${Math.random().toString(36).substr(2, 9)}`,
          name: img.name || img.source,
          source: img.source,
          url: img.url,
          screenshotUrls: (img.type === 'banner' || img.type === 'screenshot') ? [img.url] : undefined
        };

        if (img.type === 'boxart') {
          imageObj.boxArtUrl = img.url;
          imageObj.coverUrl = img.url;
        } else if (img.type === 'logo') {
          imageObj.logoUrl = img.url;
        } else if (img.type === 'icon') {
          imageObj.iconUrl = img.url;
        } else {
          imageObj.bannerUrl = img.url;
          imageObj.type = 'banner'; // Force type for grouping logic
        }

        if (img.source === 'SteamGridDB') {
          if (img.type === 'boxart') sgdbResults.boxart.push(imageObj);
          else if (img.type === 'banner' || img.type === 'hero') sgdbResults.banner.push(imageObj);
          else if (img.type === 'logo') sgdbResults.logo.push(imageObj);
          else if (img.type === 'icon') sgdbResults.icon.push(imageObj);
        } else if (
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

      // Merge with existing results to avoid overwriting previous chunks
      setSteamGridDBResults(prev => ({
        boxart: [...prev.boxart, ...sgdbResults.boxart],
        banner: [...prev.banner, ...sgdbResults.banner],
        alternativeBanner: [...prev.alternativeBanner, ...sgdbResults.alternativeBanner],
        logo: [...prev.logo, ...sgdbResults.logo],
        icon: [...prev.icon, ...sgdbResults.icon]
      }));
      setImageSearchResults(prev => [...prev, ...newImages]);

    };

    const removeListener = window.electronAPI?.on && window.electronAPI.on('metadata:gameImagesFound', handleImagesFound);
    return () => {
      if (typeof removeListener === 'function') removeListener();
    };
  }, []);

  // Listen for provider status updates during image search
  useEffect(() => {
    const handleProviderStatus = (_event: any, data: any) => {
      // Discard events from stale requests
      if (data.requestId !== undefined && data.requestId !== fastSearchActiveRunIdRef.current) {
        return;
      }
      if (data.currentProvider) {
        setImageSearchProviderStatus({ currentProvider: data.currentProvider, remaining: data.remaining || [] });
      } else {
        // Empty provider = search complete
        setImageSearchProviderStatus(null);
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
      showAnimatedImages,
      timestamp: new Date().toISOString()
    });
    setSelectedFastGame(gameResult);
    setFastSearchResults([]);
    setIsSearchingImages(true);
    setError(null);
    setImageSearchQuery(gameResult.name); // Ensure search box has the name if we need it

    // Clear previous results explicitly before starting new search
    setImageSearchResults([]);
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
        showAnimatedImages,
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
        // Process final results to ensure we didn't miss anything (and handle completion)
        // We must dedupe against what's already in state from the events

        const newImages: any[] = [];
        const sgdbResults = {
          boxart: [] as any[],
          banner: [] as any[],
          alternativeBanner: [] as any[],
          logo: [] as any[],
          icon: [] as any[],
        };

        // Get current state to dedupe
        // Note: using functional state updates inside strict mode might be tricky for "reading" current state synchronously
        // But since we are at the end of the async call, we can assume previous events fired.
        // To be safe, we just process all and React diffing might save us, or we assume the response is the "Truth".
        // Actually, replacing everything with the final response is safer for consistency than merging if the final response is complete.
        // Since fetchGameImages returns ALL results found, we can just set the state to this final source of truth.

        const seenUrls = new Set<string>();

        response.images.forEach((img: any) => {
          const dedupeKey = `${img.url}|${img.source}|${img.type}`;
          if (!img.url || seenUrls.has(dedupeKey)) return;
          seenUrls.add(dedupeKey);

          const imageObj: any = {
            id: `${img.source}-${img.type}-${Math.random().toString(36).substr(2, 9)}`,
            name: img.name || img.source,
            source: img.source,
            url: img.url,
            screenshotUrls: (img.type === 'banner' || img.type === 'screenshot') ? [img.url] : undefined
          };

          if (img.type === 'boxart') {
            imageObj.boxArtUrl = img.url;
            imageObj.coverUrl = img.url;
          } else if (img.type === 'logo') {
            imageObj.logoUrl = img.url;
          } else if (img.type === 'icon') {
            imageObj.iconUrl = img.url;
          } else {
            imageObj.bannerUrl = img.url;
            imageObj.type = 'banner';
          }

          if (img.source === 'SteamGridDB') {
            if (img.type === 'boxart') sgdbResults.boxart.push(imageObj);
            else if (img.type === 'banner' || img.type === 'hero') sgdbResults.banner.push(imageObj);
            else if (img.type === 'logo') sgdbResults.logo.push(imageObj);
            else if (img.type === 'icon') sgdbResults.icon.push(imageObj);
          } else if (
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

        // Set final state (overwriting progressive chunks to ensure consistency and order)
        // This also fixes issues where events might have been missed
        setImageSearchResults(newImages);
        setSteamGridDBResults(sgdbResults);

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

  // Handle image selection - update immediately and save
  const handleSelectImage = async (imageUrl: string, type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => {
    if (!selectedGame || !editedGame) return;

    // Always try to delete old cached image from disk
    // The image might be cached even if the URL format is different
    // This ensures we don't leave orphaned files
    try {
      await window.electronAPI.deleteCachedImage(selectedGame.id, type as any);
    } catch (err) {
      console.warn('Error deleting old image:', err);
      // Continue even if deletion fails - the cacheImage method will also try to clean up
    }

    // Update immediately for instant visual feedback
    const updatedGame = { ...editedGame };
    if (type === 'boxart') {
      updatedGame.boxArtUrl = imageUrl;
      // Preserve other image types
      updatedGame.bannerUrl = editedGame.bannerUrl || selectedGame.bannerUrl || updatedGame.bannerUrl;
      updatedGame.logoUrl = editedGame.logoUrl || selectedGame.logoUrl || updatedGame.logoUrl;
    } else if (type === 'banner') {
      updatedGame.bannerUrl = imageUrl;
      updatedGame.heroUrl = imageUrl;
      // Preserve other image types
      updatedGame.boxArtUrl = editedGame.boxArtUrl || selectedGame.boxArtUrl || updatedGame.boxArtUrl;
      updatedGame.logoUrl = editedGame.logoUrl || selectedGame.logoUrl || updatedGame.logoUrl;
    } else if (type === 'alternativeBanner') {
      updatedGame.alternativeBannerUrl = imageUrl;
      updatedGame.useAlternativeBackground = true;
      // Preserve other image types
      updatedGame.boxArtUrl = editedGame.boxArtUrl || selectedGame.boxArtUrl || updatedGame.boxArtUrl;
      updatedGame.bannerUrl = editedGame.bannerUrl || selectedGame.bannerUrl || updatedGame.bannerUrl;
      updatedGame.logoUrl = editedGame.logoUrl || selectedGame.logoUrl || updatedGame.logoUrl;
    } else if (type === 'logo') {
      updatedGame.logoUrl = imageUrl;
      // Preserve other image types
      updatedGame.boxArtUrl = editedGame.boxArtUrl || selectedGame.boxArtUrl || updatedGame.boxArtUrl;
      updatedGame.bannerUrl = editedGame.bannerUrl || selectedGame.bannerUrl || updatedGame.bannerUrl;
      updatedGame.iconUrl = editedGame.iconUrl || selectedGame.iconUrl || updatedGame.iconUrl;
      // Ensure we stay on images tab when selecting logo
      setActiveTab('images');
    } else if (type === 'icon') {
      updatedGame.iconUrl = imageUrl;
      // Preserve other image types
      updatedGame.boxArtUrl = editedGame.boxArtUrl || selectedGame.boxArtUrl || updatedGame.boxArtUrl;
      updatedGame.bannerUrl = editedGame.bannerUrl || selectedGame.bannerUrl || updatedGame.bannerUrl;
      updatedGame.logoUrl = editedGame.logoUrl || selectedGame.logoUrl || updatedGame.logoUrl;
      // Ensure we stay on images tab when selecting icon
      setActiveTab('images');
    }

    // Update state immediately so user sees the change
    setEditedGame(updatedGame);

    // Update local games state immediately
    setLocalGames(prevGames =>
      prevGames.map(g => g.id === updatedGame.id ? updatedGame : g)
    );

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

  // Handle browse for local image file
  const handleBrowseImage = async (type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => {
    if (!selectedGame || !editedGame) return;

    try {
      const imagePath = await window.electronAPI.showImageDialog();
      if (imagePath) {
        // Convert file path to file:// URL with proper encoding for special chars
        // Do NOT encode the drive letter colon (e.g. C:) as it breaks expected file URL format on Windows
        let fileUrl = imagePath;
        if (!imagePath.startsWith('file://')) {
          const normalizedPath = imagePath.replace(/\\/g, '/');
          const parts = normalizedPath.split('/');
          const encodedParts = parts.map((part, index) => {
            // Don't encode the colon in the drive letter (e.g. "C:") if it's the first segment
            if (index === 0 && part.includes(':') && part.length === 2) return part;
            return encodeURIComponent(part);
          });
          fileUrl = `file:///${encodedParts.join('/')}`;
        }
        await handleSelectImage(fileUrl, type);
      }
    } catch (err) {
      console.error('Error browsing for image:', err);
      setError('Failed to select image file');
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
      setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
      setFastSearchResults([]);
      setSelectedFastGame(null);
      setShowImageSearch(null);

      // Reset Fix Match state
      setShowFixMatch(false);
      setMetadataSearchResults([]);
      setMetadataSearchQuery('');
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

  // Get launcher name
  const getLauncherName = (game: Game): string => {
    if (game.id.startsWith('steam-')) return 'Steam';
    if (game.id.startsWith('epic-')) return 'Epic Games';
    if (game.id.startsWith('gog-')) return 'GOG Galaxy';
    if (game.id.startsWith('xbox-')) return 'Xbox Game Pass';
    if (game.id.startsWith('ubisoft-')) return 'Ubisoft Connect';
    if (game.id.startsWith('rockstar-')) return 'Rockstar Games';
    if (game.id.startsWith('ea-') || game.id.startsWith('origin-')) return 'EA App';
    if (game.id.startsWith('battle-') || game.id.startsWith('battlenet-')) return 'Battle.net';
    return 'Other';
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
              Remove Deleted
            </button>
            <button
              onClick={onClose}
              className="group p-1.5 hover:bg-slate-700/60 border border-transparent hover:border-white/5 rounded-lg transition-all"
            >
              <svg className="w-5 h-5 text-gray-400 group-hover:text-white group-hover:animate-wobble transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Game List */}
          <GameList
            games={sortedLocalGames}
            selectedGameId={selectedGameId}
            onSelectGame={handleGameSelect}
            viewMode={gameListView}
            onViewModeChange={setGameListView}
            getLauncherName={getLauncherName}
          />

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
                    <ImagesTab
                      editedGame={editedGame}
                      selectedGame={selectedGame}
                      showImageSearch={showImageSearch}
                      setShowImageSearch={setShowImageSearch}
                      activeImageSearchTab={activeImageSearchTab}
                      setActiveImageSearchTab={setActiveImageSearchTab}
                      imageSearchQuery={imageSearchQuery}
                      setImageSearchQuery={setImageSearchQuery}
                      handleSearchImages={handleSearchImages}
                      isSearchingImages={isSearchingImages}
                      handleFastSearch={handleFastSearch}
                      isFastSearching={isFastSearching}
                      fastSearchResults={fastSearchResults}
                      setFastSearchResults={setFastSearchResults}
                      selectedFastGame={selectedFastGame}
                      handleSelectFastGame={handleSelectFastGame}
                      setSelectedFastGame={setSelectedFastGame}
                      imageSearchResults={imageSearchResults}
                      setImageSearchResults={setImageSearchResults}
                      steamGridDBResults={steamGridDBResults}
                      setSteamGridDBResults={setSteamGridDBResults}
                      handleSelectImage={handleSelectImage}
                      handleBrowseImage={handleBrowseImage}
                      showAnimatedImages={showAnimatedImages}
                      setShowAnimatedImages={setShowAnimatedImages}
                      imageSearchProviderStatus={imageSearchProviderStatus}
                      setContextMenu={setContextMenu}
                    />
                  )}

                  {activeTab === 'metadata' && (
                    <MetadataTab
                      editedGame={editedGame}
                      setEditedGame={setEditedGame}
                      selectedGame={selectedGame}
                      showFixMatch={showFixMatch}
                      setShowFixMatch={setShowFixMatch}
                      metadataSearchQuery={metadataSearchQuery}
                      setMetadataSearchQuery={setMetadataSearchQuery}
                      metadataSearchResults={metadataSearchResults}
                      setMetadataSearchResults={setMetadataSearchResults}
                      isSearchingMetadata={isSearchingMetadata}
                      setIsSearchingMetadata={setIsSearchingMetadata}
                      handleFixMatchSearch={handleFixMatchSearch}
                      handleSelectMetadataMatch={handleSelectMetadataMatch}
                      isApplyingMetadata={isApplyingMetadata}
                      onSave={handleSave}
                      isSaving={isSaving}
                      onCancel={() => {
                        setExpandedGameId(null);
                        setEditedGame(null);
                        setShowFixMatch(false);
                        setSelectedGameId(null);
                        setMetadataSearchResults([]);
                        setMetadataSearchQuery('');
                        setIsSearchingMetadata(false);
                      }}
                      onDeleteGame={onDeleteGame}
                      setShowDeleteConfirm={setShowDeleteConfirm}
                      isDeleting={isDeleting}
                      setError={setError}
                      setActiveTab={setActiveTab}
                      setShowImageSearch={setShowImageSearch}
                      setActiveImageSearchTab={setActiveImageSearchTab}
                      setImageSearchQuery={setImageSearchQuery}
                      handleSearchImages={handleSearchImages}
                    />
                  )}

                  {activeTab === 'links' && (
                    <LinksTab
                      editedGame={editedGame}
                      setEditedGame={setEditedGame}
                      onSave={handleSave}
                      onCancel={() => {
                        setExpandedGameId(null);
                        setEditedGame(null);
                        setShowFixMatch(false);
                        setSelectedGameId(null);
                        setMetadataSearchResults([]);
                        setMetadataSearchQuery('');
                        setIsSearchingMetadata(false);
                      }}
                      isSaving={isSaving}
                      onDeleteGame={onDeleteGame}
                      setShowDeleteConfirm={setShowDeleteConfirm}
                      isDeleting={isDeleting}
                      setError={setError}
                    />
                  )}

                  {activeTab === 'modManager' && (
                    <ModManagerTab
                      editedGame={editedGame}
                      setEditedGame={setEditedGame}
                      onSave={handleSave}
                      onCancel={() => {
                        setExpandedGameId(null);
                        setEditedGame(null);
                        setShowFixMatch(false);
                        setSelectedGameId(null);
                      }}
                      isSaving={isSaving}
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
          setRefreshMode('all');
          setShowRefreshConfirm(true);
        }}
        onSelectMissing={() => {
          setShowRefreshDialog(false);
          setRefreshMode('missing');
          setShowRefreshConfirm(true);
        }}
        onSelectLinksOnly={() => {
          setShowRefreshDialog(false);
          setRefreshMode('links');
          setShowRefreshConfirm(true);
        }}
        onCancel={() => {
          setShowRefreshDialog(false);
        }}
      />

      {/* Refresh Metadata Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showRefreshConfirm}
        title={refreshMode === 'all' ? 'Refresh all metadata for all games' : refreshMode === 'links' ? 'Refresh all Links' : 'Search for missing images only'}
        message={refreshMode === 'all'
          ? 'This is the nuclear option. It will remove all stored metadata and pull everything fresh: metadata, images, icons, link icons.'
          : refreshMode === 'links'
            ? 'This will nuke all links from all games and add them fresh from IGDB.'
            : 'This will only search for missing images (all image types). No existing metadata or images will be changed.'}
        note={refreshMode === 'all'
          ? "This action is intensive. All cached images will be replaced and metadata re-fetched from scratch."
          : "This action is safe and only updates the specific fields selected."}
        confirmText="Continue"
        cancelText="Cancel"
        variant="danger"
        onConfirm={async () => {
          setShowRefreshConfirm(false);
          setRefreshProgress({ current: 0, total: 0, message: 'Starting...', mode: refreshMode || 'all' });
          setRefreshState({ mode: refreshMode || 'all' });
          try {
            setError(null);
            setSuccess(null);
            await handleRefreshMetadata(refreshMode || 'all', 0);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to refresh metadata');
            setTimeout(() => {
              setRefreshProgress(null);
            }, 2000);
          } finally {
            setRefreshMode(null);
          }
        }}
        onCancel={() => {
          setShowRefreshConfirm(false);
          setRefreshMode(null);
        }}
      />

      {/* Refresh Progress Dialog */}
      {
        refreshProgress && (
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center"
            style={{
              pointerEvents: refreshProgress.message?.includes('Reloading') ? 'none' : 'auto',
              transition: 'opacity 0.3s ease-out'
            }}
          >
            <div className={`bg-gray-800 rounded-lg shadow-xl border ${refreshProgress.mode === 'links' ? 'border-purple-500/50' : 'border-gray-700'} w-full max-w-md p-6 overflow-hidden`}>
              <div className="flex items-center gap-3 mb-4">
                {refreshProgress.mode === 'links' ? (
                  <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                )}
                <h3 className="text-xl font-semibold text-white">
                  {refreshProgress.mode === 'links' ? 'Refreshing Links' : 'Refreshing Metadata'}
                </h3>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-3 mb-4 overflow-hidden">
                <div
                  className={`${refreshProgress.mode === 'links' ? 'bg-purple-600' : 'bg-blue-600'} h-full transition-all duration-300 ease-out rounded-full`}
                  style={{
                    width: refreshProgress.total > 0
                      ? `${(refreshProgress.current / refreshProgress.total) * 100}%`
                      : '0%'
                  }}
                />
              </div>

              {/* Progress Text */}
              <div className="flex justify-between items-center mb-1">
                <div className="text-sm text-gray-300">
                  {refreshProgress.total > 0 ? (
                    <span>
                      {refreshProgress.current} of {refreshProgress.total} games
                    </span>
                  ) : (
                    <span>Preparing...</span>
                  )}
                </div>
                <div className="text-[10px] text-gray-500 font-mono">
                  {refreshProgress.total > 0 ? `${Math.round((refreshProgress.current / refreshProgress.total) * 100)}%` : '0%'}
                </div>
              </div>

              {/* Current Status Message */}
              <div className="text-sm text-gray-400 min-h-[20px] mb-2">
                {refreshProgress.message}
              </div>

              {/* Current Game Details */}
              <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
                {refreshProgress.gameTitle ? (
                  <div className="text-sm text-white font-medium mb-1 truncate">
                    {refreshProgress.gameTitle}
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 italic">Waiting for discovery...</div>
                )}

                {refreshProgress.mode === 'links' && refreshProgress.links && refreshProgress.links.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {refreshProgress.links.map((link, idx) => (
                      <span key={idx} className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded">
                        {link.name}
                      </span>
                    ))}
                  </div>
                ) : refreshProgress.mode !== 'links' && refreshProgress.images && refreshProgress.images.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {refreshProgress.images.map((asset, idx) => (
                      <span key={idx} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                        {asset}
                      </span>
                    ))}
                  </div>
                ) : refreshProgress.gameTitle && !refreshProgress.message.includes('Searching') && !refreshProgress.message.includes('Fetching') ? (
                  <div className="text-[10px] text-gray-500 italic mt-1">No new {refreshProgress.mode === 'links' ? 'links' : 'assets'} found for this game.</div>
                ) : null}
              </div>

              {/* Show completion message if done */}
              {refreshProgress.total > 0 && refreshProgress.current >= refreshProgress.total && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="text-sm text-green-400 font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    Refresh completed!
                  </div>
                  {refreshProgress.mode === 'links' && (
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => setRefreshProgress(null)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                      >
                        Finish
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      }

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
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Game"
        message={`Are you sure you want to delete "${selectedGame?.title || 'this game'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        variant="danger"
      />
      {contextMenu && (
        <ImageContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          imageType={contextMenu.type}
          onClose={() => setContextMenu(null)}
          onSelectFromFile={() => handleBrowseImage(contextMenu.type as any)}
          onSearchImages={() => {
            setShowImageSearch({ type: contextMenu.type, gameId: selectedGame!.id });
            setActiveImageSearchTab(contextMenu.type === 'banner' ? 'banner' : contextMenu.type);
            setImageSearchQuery(selectedGame!.title);
            setContextMenu(null);
          }}
        />
      )}

      <RemoveDeletedGamesDialog
        isOpen={showRemoveDeletedDialog}
        missingGames={missingGames}
        isScanning={isScanningMissingGames}
        onRemove={handleRemoveMissingGames}
        onCancel={() => setShowRemoveDeletedDialog(false)}
      />
    </div >
  );
};
