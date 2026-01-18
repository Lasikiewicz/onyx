import React, { useState, useEffect, useMemo } from 'react';
import { Game } from '../types/game';
import { ConfirmationDialog } from './ConfirmationDialog';
import { MatchFixDialog } from './MatchFixDialog';
import { RefreshMetadataDialog } from './RefreshMetadataDialog';
import { BoxartFixDialog } from './BoxartFixDialog';
import { ImageContextMenu } from './ImageContextMenu';

interface GameManagerProps {
  isOpen: boolean;
  onClose: () => void;
  games: Game[];
  onSaveGame: (game: Game, oldGame?: Game) => Promise<void>;
  onDeleteGame?: (gameId: string) => Promise<void>;
  onReloadLibrary?: () => Promise<void>;
  initialGameId?: string | null;
  initialTab?: 'metadata' | 'images' | 'modManager';
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
}) => {
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);
  const [showImageSearch, setShowImageSearch] = useState<{ type: 'boxart' | 'banner' | 'logo' | 'icon'; gameId: string } | null>(null);
  const [imageSearchQuery, setImageSearchQuery] = useState('');
  const [imageSearchResults, setImageSearchResults] = useState<any[]>([]);
  const [steamGridDBResults, setSteamGridDBResults] = useState<{ boxart: any[]; banner: any[]; logo: any[]; icon: any[] }>({ boxart: [], banner: [], logo: [], icon: [] });
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
  const [activeTab, setActiveTab] = useState<'images' | 'metadata' | 'modManager'>(initialTab);
  const [activeImageSearchTab, setActiveImageSearchTab] = useState<'all' | 'boxart' | 'banner' | 'logo' | 'icon'>('all');
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const [refreshMode, setRefreshMode] = useState<'all' | 'missing' | null>(null);
  const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number; message: string; gameTitle?: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; type: 'boxart' | 'banner' | 'logo' | 'icon' } | null>(null);
  const [showMatchFix, setShowMatchFix] = useState(false);
  const [steamAppIdInput, setSteamAppIdInput] = useState('');
  const [isSteamAppIdInputFocused, setIsSteamAppIdInputFocused] = useState(false);
  const [unmatchedGames, setUnmatchedGames] = useState<Array<{ gameId: string; title: string; searchResults: any[] }>>([]);
  const [showBoxartFix, setShowBoxartFix] = useState(false);
  const [missingBoxartGames, setMissingBoxartGames] = useState<Array<{ gameId: string; title: string; steamAppId?: string }>>([]);
  const [refreshState, setRefreshState] = useState<{ mode: 'all' | 'missing' | null; continueFromIndex?: number } | null>(null);
  const [shouldSelectFirstGameAfterRefresh, setShouldSelectFirstGameAfterRefresh] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFastSearching, setIsFastSearching] = useState(false);
  const [fastSearchResults, setFastSearchResults] = useState<FastSearchGame[]>([]);
  const [selectedFastGame, setSelectedFastGame] = useState<FastSearchGame | null>(null);
  const [showGameListThumbnails, setShowGameListThumbnails] = useState(true);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Get all unique categories from all games for suggestions
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    games.forEach(game => {
      game.categories?.forEach(cat => categories.add(cat));
    });
    return Array.from(categories).sort();
  }, [games]);

  // Helper function to handle refresh with continuation support
  const handleRefreshMetadata = async (mode: 'all' | 'missing', continueFromIndex: number = 0) => {
    try {
      const result = await window.electronAPI.refreshAllMetadata({
        allGames: mode === 'all',
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

  // Maintain local games state to prevent refresh issues
  const [localGames, setLocalGames] = useState<Game[]>(games);

  const selectedGame = useMemo(() => {
    return localGames.find(g => g.id === selectedGameId) || null;
  }, [localGames, selectedGameId]);

  const expandedGame = useMemo(() => {
    return localGames.find(g => g.id === expandedGameId) || null;
  }, [localGames, expandedGameId]);

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

  // Update steamAppIdInput when editedGame changes (but not while user is typing)
  useEffect(() => {
    if (editedGame && !isSteamAppIdInputFocused) {
      const appIdMatch = editedGame.id.match(/^steam-(.+)$/);
      setSteamAppIdInput(appIdMatch ? appIdMatch[1] : '');
    }
  }, [editedGame?.id, isSteamAppIdInputFocused]);

  // Listen for refresh progress updates
  useEffect(() => {
    const handleProgress = (_event: any, progress: { current: number; total: number; message: string; gameTitle?: string }) => {
      setRefreshProgress(progress);
    };

    if (window.ipcRenderer) {
      window.ipcRenderer.on('metadata:refreshProgress', handleProgress);

      return () => {
        window.ipcRenderer?.off('metadata:refreshProgress', handleProgress);
      };
    }
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
      setShowImageSearch(null);
      setImageSearchResults([]);
      setSteamGridDBResults({ boxart: [], banner: [], logo: [], icon: [] });
      setFastSearchResults([]);
      setActiveImageSearchTab('all');
      setImageSearchQuery('');
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
      setSteamGridDBResults({ boxart: [], banner: [], logo: [], icon: [] });
      setEditedGame(null);
      setError(null);
      setSuccess(null);
      setShowFixMatch(false);
      setMetadataSearchQuery('');
      setMetadataSearchResults([]);
      setActiveTab(initialTab);
      setSelectedGameId(null);
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
          setSuccess(`Synced playtime for ${result.updatedCount || 0} game(s)`);
          // Reload the game to get updated playtime
          const library = await window.electronAPI.getLibrary();
          const updatedGame = library.find(g => g.id === targetGame.id);
          if (updatedGame) {
            setEditedGame({ ...updatedGame });
            // Also update the games list if we have it

            // Note: We can't directly update games prop, but editedGame will reflect the change
          }
        } else {
          setError(result?.error || 'Failed to sync playtime');
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
  const handleSearchImages = async (imageType: 'boxart' | 'banner' | 'logo' | 'icon', useWeb: boolean = false) => {
    if (!selectedGame) return;

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

    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setIsSearchingImages(true);
    setError(null);

    // Initial clearing - simplified to avoid clearing if we are just switching tabs
    if (!steamAppId && !useWeb) {
      setImageSearchResults([]);
      setSteamGridDBResults({ boxart: [], banner: [], logo: [], icon: [] });
    } else if (useWeb) {
      // Only clear if starting a fresh web search
      setImageSearchResults([]);
    }

    // Tracker for active searches to know when to turn off loading indicator
    let activeSearches = 0;
    const checkFinished = () => {
      activeSearches--;
      if (activeSearches <= 0) {
        setIsSearchingImages(false);
      }
    };

    // 1. Steam Official Metadata (if applicable)
    if (steamAppId && !useWeb) {
      activeSearches++;
      window.electronAPI.searchArtwork(selectedGame.title, steamAppId)
        .then((steamMetadata) => {
          if (steamMetadata) {
            const steamResults: any[] = [];
            // Helper to add result
            const addResult = (url: string | undefined, type: 'boxart' | 'banner' | 'logo' | 'icon') => {
              if (!url) return;
              steamResults.push({
                id: `steam-${steamAppId}`,
                name: selectedGame.title,
                title: selectedGame.title,
                [type === 'boxart' ? 'boxArtUrl' : type === 'logo' ? 'logoUrl' : type === 'icon' ? 'iconUrl' : 'bannerUrl']: url,
                source: 'steam',
                score: 10000
              });
            };

            if (imageType === 'boxart') addResult(steamMetadata.boxArtUrl, 'boxart');
            else if (imageType === 'banner') addResult(steamMetadata.bannerUrl, 'banner');
            else if (imageType === 'logo') addResult(steamMetadata.logoUrl, 'logo');
            else if (imageType === 'icon') addResult(steamMetadata.iconUrl, 'icon');

            if (steamResults.length > 0) {
              setSteamGridDBResults(prev => ({
                ...prev,
                [imageType]: [...steamResults, ...prev[imageType]]
              }));
            }
          }
        })
        .catch(err => console.error('Error fetching Steam artwork:', err))
        .finally(checkFinished);
    }

    try {

      // Start both searches in parallel but update results as they come in
      const searchPromises: Promise<any>[] = [];

      if (useWeb) {
        // Web Search
        activeSearches++;
        searchPromises.push(
          window.electronAPI.searchWebImages(query, imageType).then((response: any) => {
            if (response.success && response.images) {
              const flattenedResults: any[] = [];
              response.images.forEach((gameResult: any) => {
                gameResult.images.forEach((img: any) => {
                  flattenedResults.push({
                    id: `${gameResult.gameId}-${img.url}`,
                    name: gameResult.gameName,
                    title: gameResult.gameName,
                    boxArtUrl: imageType === 'boxart' ? img.url : undefined,
                    bannerUrl: imageType === 'banner' ? img.url : undefined,
                    logoUrl: imageType === 'logo' ? img.url : undefined,
                    iconUrl: imageType === 'icon' ? img.url : undefined,
                    coverUrl: imageType === 'boxart' ? img.url : undefined,
                    source: img.source || 'web',
                    score: img.score,
                    width: img.width,
                    height: img.height,
                  });
                });
              });

              // Update results immediately
              if (imageType === 'boxart') {
                setSteamGridDBResults(prev => ({ ...prev, boxart: [...prev.boxart, ...flattenedResults] }));
              } else if (imageType === 'banner') {
                setSteamGridDBResults(prev => ({ ...prev, banner: [...prev.banner, ...flattenedResults] }));
              } else if (imageType === 'logo') {
                setSteamGridDBResults(prev => ({ ...prev, logo: [...prev.logo, ...flattenedResults] }));
              } else if (imageType === 'icon') {
                setSteamGridDBResults(prev => ({ ...prev, icon: [...prev.icon, ...flattenedResults] }));
              }
            }
            return response;
          }).catch((err: any) => {
            console.error('Error searching Web:', err);
            return null;
          }).finally(checkFinished)
        );
      } else {
        // Regular Search (IGDB, RAWG, SteamGridDB) - Split logic for better parallelism

        // Search IGDB for metadata (only if searching for boxart or banner)
        if (imageType === 'boxart' || imageType === 'banner') {
          activeSearches++;
          searchPromises.push(
            window.electronAPI.searchMetadata(query).then((igdbResponse: any) => {
              if (igdbResponse && igdbResponse.success && igdbResponse.results && igdbResponse.results.length > 0) {
                const filteredIGDBResults: IGDBGameResult[] = igdbResponse.results.filter((result: any) => {
                  if (imageType === 'boxart') {
                    return result.coverUrl;
                  } else if (imageType === 'banner') {
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
              console.error('Error searching IGDB:', err);
              return null;
            }).finally(checkFinished)
          );
        }

        // Search SteamGridDB for the specific image type
        activeSearches++;
        searchPromises.push(
          window.electronAPI.searchImages(query, imageType, steamAppId).then((sgdbResponse: any) => {
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
                    boxArtUrl: imageType === 'boxart' ? img.url : undefined,
                    bannerUrl: imageType === 'banner' ? img.url : undefined,
                    logoUrl: imageType === 'logo' ? img.url : undefined,
                    coverUrl: imageType === 'boxart' ? img.url : undefined,
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
                  [imageType]: [...flattenedResults, ...prev[imageType]]
                }));
              }
            }
            return sgdbResponse;
          }).catch((err: any) => {
            console.error('Error searching SteamGridDB:', err);
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

  // Playnite-style fast search - fetches all images at once with no rate limiting
  const handleFastSearch = async () => {
    if (!selectedGame) return;

    const query = imageSearchQuery.trim() || selectedGame.title.trim();
    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setIsFastSearching(true);
    setError(null);
    setFastSearchResults([]);
    setSelectedFastGame(null);

    try {
      console.log(`[FastSearch] Searching for "${query}"...`);
      const startTime = Date.now();

      const response = await (window.electronAPI as any).fastImageSearch(query);

      console.log(`[FastSearch] Completed in ${Date.now() - startTime}ms`);

      if (response.success && response.games && response.games.length > 0) {
        setFastSearchResults(response.games);
        setSuccess(`Found ${response.games.length} game(s) in ${Date.now() - startTime}ms`);
        setTimeout(() => setSuccess(null), 3000);
      } else if (response.error) {
        setError(response.error);
      } else {
        setError(`No results found for "${query}". Try a different search term or check the spelling.`);
      }
    } catch (err) {
      setError('Failed to search. Check your internet connection and API credentials.');
      console.error('[FastSearch] Error:', err);
    } finally {
      setIsFastSearching(false);
    }
  };

  // Show images from a fast search result (click to display, not auto-apply)
  const handleSelectFastGame = async (gameResult: FastSearchGame) => {
    setSelectedFastGame(gameResult);
    setFastSearchResults([]);
    setIsSearchingImages(true);
    setError(null);
    setImageSearchQuery(gameResult.name); // Ensure search box has the name if we need it
    // setSuccess(`Fetching images for "${gameResult.name}" from all sources...`); // Removed as per user request

    try {
      // Call the multi-source fetcher
      const response = await (window.electronAPI as any).fetchGameImages(
        gameResult.name,
        selectedGame?.id.startsWith('steam-') ? selectedGame.id.replace('steam-', '') : undefined,
        Number(gameResult.id)
      );

      if (response.success && response.images) {
        // Categorize images by type
        const newImages: any[] = [];
        const sgdbResults = {
          boxart: [] as any[],
          banner: [] as any[],
          logo: [] as any[],
          icon: [] as any[],
        };

        const seenUrls = new Set<string>();

        response.images.forEach((img: any) => {
          if (!img.url || seenUrls.has(img.url)) return;
          seenUrls.add(img.url);

          const imageObj = {
            id: `${img.source}-${img.type}-${Math.random().toString(36).substr(2, 9)}`,
            name: img.name || img.source,
            source: img.source,
            url: img.url, // Explicitly keep raw URL for generic renderers
            [img.type === 'boxart' ? 'boxArtUrl' : img.type === 'logo' ? 'logoUrl' : img.type === 'icon' ? 'iconUrl' : 'bannerUrl']: img.url,
            // For screenshots/banners, we might need screenshotUrls array for some UI logic
            screenshotUrls: img.type === 'banner' || img.type === 'screenshot' ? [img.url] : undefined
          };

          if (img.source === 'SteamGridDB') {
            // Add to steamGridDBResults
            if (img.type === 'boxart') sgdbResults.boxart.push(imageObj);
            else if (img.type === 'banner') sgdbResults.banner.push(imageObj);
            else if (img.type === 'logo') sgdbResults.logo.push(imageObj);
            else if (img.type === 'icon') sgdbResults.icon.push(imageObj);
          } else {
            // Add to main imageSearchResults (IGDB, RAWG, Steam)
            // Map types to what the UI expects
            if (img.type === 'boxart' || img.type === 'banner' || img.type === 'screenshot') {
              newImages.push(imageObj);
            } else if (img.type === 'logo') {
              // Add logos to SGDB results even if from other sources, as that's where logos are displayed
              sgdbResults.logo.push(imageObj);
            }
          }
        });

        setImageSearchResults(newImages);
        setSteamGridDBResults(sgdbResults);

        setSuccess(`Found ${response.images.length} images from ${[...new Set(response.images.map((i: any) => i.source))].join(', ')}`);
        setTimeout(() => setSuccess(null), 3000);

        // Set the search type to boxart by default if not set, but show 'all' tab
        if (!showImageSearch) {
          setShowImageSearch({ type: 'boxart', gameId: selectedGame!.id });
        }
        setActiveImageSearchTab('all');

        setSuccess(`Showing images for "${gameResult.name}"`);
      } else {
        setError(response.error || 'Failed to fetch images');
      }
    } catch (err) {
      console.error('Error fetching game images:', err);
      setError('Failed to fetch images from sources');
    } finally {
      setIsSearchingImages(false);
    }
  };

  // Handle image selection - update immediately and save
  const handleSelectImage = async (imageUrl: string, type: 'boxart' | 'banner' | 'logo' | 'icon') => {
    if (!selectedGame || !editedGame) return;

    // Always try to delete old cached image from disk
    // The image might be cached even if the URL format is different
    // This ensures we don't leave orphaned files
    try {
      await window.electronAPI.deleteCachedImage(selectedGame.id, type);
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
      // Preserve other image types
      updatedGame.boxArtUrl = editedGame.boxArtUrl || selectedGame.boxArtUrl || updatedGame.boxArtUrl;
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
  const handleBrowseImage = async (type: 'boxart' | 'banner' | 'logo' | 'icon') => {
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

      // Update search query to new game's title and clear previous results
      setImageSearchQuery(game.title);
      setImageSearchResults([]);
      setSteamGridDBResults({ boxart: [], banner: [], logo: [], icon: [] });
      setFastSearchResults([]);
      setSelectedFastGame(null);
      setShowImageSearch(null);

      // Reset Fix Match state
      setShowFixMatch(false);
      setMetadataSearchResults([]);
      setMetadataSearchQuery('');
      setIsSearchingMetadata(false);
      setSteamAppIdInput((game.id.startsWith('steam-') ? game.id.replace('steam-', '') : ''));

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
            logoUrl: metadata.logoUrl || editedGame?.logoUrl,
            heroUrl: metadata.heroUrl || editedGame?.heroUrl,
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
      const response = await window.electronAPI.searchGames(query);
      if (response.success && response.results) {
        // Get the current game's Steam App ID if available
        const currentSteamAppId = steamAppIdInput || (expandedGame?.id.startsWith('steam-') ? expandedGame.id.replace('steam-', '') : undefined);

        // Show all results from all sources - let user choose
        // Prioritize Steam results, but show all available options
        const steamResults = response.results.filter((result: any) => result.source === 'steam');
        const otherResults = response.results.filter((result: any) => result.source !== 'steam');

        // Normalize query for matching
        const normalizedQuery = query.toLowerCase().trim();

        // Sort Steam results: matching Steam App ID first, then exact name matches, then by release date
        const sortedSteamResults = steamResults.sort((a, b) => {
          // First priority: matching Steam App ID
          const aMatchesAppId = currentSteamAppId && a.steamAppId === currentSteamAppId;
          const bMatchesAppId = currentSteamAppId && b.steamAppId === currentSteamAppId;
          if (aMatchesAppId && !bMatchesAppId) return -1;
          if (!aMatchesAppId && bMatchesAppId) return 1;

          // Second priority: exact name matches
          const aName = (a.title || '').toLowerCase().trim();
          const bName = (b.title || '').toLowerCase().trim();
          const aExact = aName === normalizedQuery;
          const bExact = bName === normalizedQuery;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;

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

        // Sort other results: exact name matches first, then by source priority (IGDB > RAWG > SteamGridDB)
        const sortedOtherResults = otherResults.sort((a, b) => {
          // First priority: exact name matches
          const aName = (a.title || (("name" in a ? (a as any).name : "") as string)).toLowerCase().trim();
          const bName = (b.title || (("name" in b ? (b as any).name : "") as string)).toLowerCase().trim();
          const aExact = aName === normalizedQuery;
          const bExact = bName === normalizedQuery;
          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;

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
        setError(response.error || 'No results found');
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
          ...editedGame,
          id: newGameId,
          platform: finalPlatform,
          title: gameTitle,
          description: finalDescription || editedGame.description,
          genres: finalGenres.length > 0 ? finalGenres : editedGame.genres,
          releaseDate: finalReleaseDate || editedGame.releaseDate,
          developers: finalDevelopers.length > 0 ? finalDevelopers : editedGame.developers,
          publishers: finalPublishers.length > 0 ? finalPublishers : editedGame.publishers,
          ageRating: finalAgeRating || editedGame.ageRating,
          userScore: finalRating ? Math.round(finalRating) : editedGame.userScore,
          boxArtUrl: metadata.boxArtUrl || editedGame.boxArtUrl || '',
          bannerUrl: metadata.bannerUrl || editedGame.bannerUrl || '',
          logoUrl: metadata.logoUrl || editedGame.logoUrl,
          heroUrl: metadata.heroUrl || editedGame.heroUrl,
          screenshots: metadata.screenshots || editedGame.screenshots || [],
          // Note: iconUrl is not in Game interface yet, but we can store it if needed
        };

        setEditedGame(updatedGame);

        // Update the Steam App ID input to show the App ID if we have one
        if (steamAppId) {
          setSteamAppIdInput(steamAppId);
        }

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
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors flex items-center gap-2"
              title="Refresh all metadata and images"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Metadata
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded transition-colors"
            >
              <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <button
                  onClick={() => setShowGameListThumbnails(!showGameListThumbnails)}
                  className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                  title={showGameListThumbnails ? "Hide Thumbnails" : "Show Thumbnails"}
                >
                  {showGameListThumbnails ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                  )}
                </button>
              </div>
              <div className="space-y-2">
                {localGames.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleGameSelect(game.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${selectedGameId === game.id
                      ? 'bg-blue-600/30 border border-blue-500/50'
                      : 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700'
                      }`}
                  >
                    {showGameListThumbnails && (
                      <img
                        src={game.boxArtUrl || '/placeholder.png'}
                        alt={game.title}
                        className="w-16 h-20 object-cover rounded flex-shrink-0"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = '/placeholder.png';
                          // If placeholder also fails, hide it
                          target.onerror = () => { target.style.display = 'none'; };
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium text-white truncate">{game.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{getLauncherName(game)}</p>
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
                    <>
                      <div className="p-2 space-y-2 flex-shrink-0 bg-gray-900/95 z-10 border-b border-gray-800">
                        {/* Top Images Section - Compact Flex Layout */}
                        <div className="flex gap-2 mb-1 items-start">
                          {/* Boxart */}
                          <div
                            onClick={() => {
                              setShowImageSearch({ type: 'boxart', gameId: selectedGame.id });
                              setActiveImageSearchTab('boxart');
                              setImageSearchQuery(selectedGame.title);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.pageX, y: e.pageY, type: 'boxart' });
                            }}
                            className="h-36 w-auto aspect-[2/3] relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
                          >
                            {(editedGame.boxArtUrl || selectedGame.boxArtUrl) ? (
                              <img
                                key={editedGame.boxArtUrl || selectedGame.boxArtUrl}
                                src={editedGame.boxArtUrl || selectedGame.boxArtUrl}
                                alt="Boxart"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                  target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                                  target.parentElement!.innerHTML = '<span class="text-[8px] text-gray-500 text-center p-1">No Image</span>';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-[8px] text-gray-600 text-center p-1">Boxart</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] text-white font-medium">Edit</span>
                            </div>
                          </div>

                          {/* Logo - Moved to 2nd position */}
                          <div
                            onClick={() => {
                              setShowImageSearch({ type: 'logo', gameId: selectedGame.id });
                              setActiveImageSearchTab('logo');
                              setImageSearchQuery(selectedGame.title);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.pageX, y: e.pageY, type: 'logo' });
                            }}
                            className="h-36 w-56 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
                          >
                            {(editedGame.logoUrl || selectedGame.logoUrl) ? (
                              <div className="w-full h-full p-2 flex items-center justify-center">
                                <img
                                  key={editedGame.logoUrl || selectedGame.logoUrl}
                                  src={editedGame.logoUrl || selectedGame.logoUrl}
                                  alt="Logo"
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center p-2">
                                <span className="text-xs text-gray-600">Click to search for logo</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-xs text-white font-medium">Edit Logo</span>
                            </div>
                          </div>

                          {/* Banner - Moved to 3rd position and set to flex-1 (fill remaining width) */}
                          <div
                            onClick={() => {
                              setShowImageSearch({ type: 'banner', gameId: selectedGame.id });
                              setActiveImageSearchTab('banner');
                              setImageSearchQuery(selectedGame.title);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.pageX, y: e.pageY, type: 'banner' });
                            }}
                            className="h-36 flex-1 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors"
                          >
                            {(editedGame.bannerUrl || selectedGame.bannerUrl) ? (
                              <img
                                key={editedGame.bannerUrl || selectedGame.bannerUrl}
                                src={editedGame.bannerUrl || selectedGame.bannerUrl}
                                alt="Banner"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <span className="text-xs text-gray-600">Click to search for banner</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-xs text-white font-medium">Edit Banner</span>
                            </div>
                          </div>

                          {/* Icon - Moved to 4th position */}
                          <div
                            onClick={() => {
                              setShowImageSearch({ type: 'icon', gameId: selectedGame.id });
                              setActiveImageSearchTab('icon');
                              setImageSearchQuery(selectedGame.title);
                            }}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              setContextMenu({ x: e.pageX, y: e.pageY, type: 'icon' });
                            }}
                            className="h-36 w-36 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
                          >
                            {(editedGame.iconUrl || selectedGame.iconUrl) ? (
                              <div className="w-full h-full p-2 flex items-center justify-center">
                                <img
                                  key={editedGame.iconUrl || selectedGame.iconUrl}
                                  src={editedGame.iconUrl || selectedGame.iconUrl}
                                  alt="Icon"
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-center p-1">
                                <span className="text-[10px] text-gray-600">Click to search for icon</span>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-[10px] text-white font-medium">Edit Icon</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Image Search Input - Hidden when results found */}
                      {(!imageSearchResults.length &&
                        !steamGridDBResults.boxart.length &&
                        !steamGridDBResults.banner.length &&
                        !steamGridDBResults.logo.length &&
                        !steamGridDBResults.icon.length) && (
                          <div className="border-t border-gray-800 pt-4 px-4">
                            <div className="mb-4">
                              <label className="block text-sm font-medium text-gray-300 mb-2">
                                {showImageSearch ? `Search for ${showImageSearch.type}` : 'Search Images'}
                                {showImageSearch && <span className="text-gray-500 ml-2">(click an image above to change type)</span>}
                              </label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={imageSearchQuery}
                                  onChange={(e) => setImageSearchQuery(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSearchImages(showImageSearch?.type || 'boxart');
                                    }
                                  }}
                                  placeholder="Enter game title..."
                                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500"
                                  disabled={isSearchingImages}
                                />
                                {/* Quick Search All - Playnite-style instant search */}
                                <button
                                  onClick={handleFastSearch}
                                  disabled={isFastSearching || isSearchingImages}
                                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                  title="Quick search all image types at once"
                                >
                                  {isFastSearching ? (
                                    <>
                                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                      <span>Fast...</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                      </svg>
                                      <span>Quick All</span>
                                    </>
                                  )}
                                </button>
                                <button
                                  onClick={() => handleBrowseImage(showImageSearch?.type || 'boxart')}
                                  disabled={isSearchingImages}
                                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
                                  title="Browse for local image file"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                  </svg>
                                  Browse
                                </button>
                                <button
                                  onClick={() => {
                                    setImageSearchResults([]);
                                    setSteamGridDBResults({ boxart: [], banner: [], logo: [], icon: [] });
                                    setFastSearchResults([]);
                                    setSelectedFastGame(null);
                                  }}
                                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                                  disabled={isSearchingImages}
                                >
                                  Clear
                                </button>
                              </div>

                              {/* Fast Search Results - Game Selection (inline, no border) */}
                              {fastSearchResults.length > 0 && (
                                <div className="mt-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium text-gray-300">
                                      <span className="text-green-400">⚡</span> Quick Results - Click to see images:
                                    </h4>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setFastSearchResults([]);
                                        setSelectedFastGame(null);
                                      }}
                                      className="text-xs text-gray-400 hover:text-white"
                                    >
                                      Clear
                                    </button>
                                  </div>
                                  <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
                                    {fastSearchResults.map((game) => (
                                      <button
                                        key={game.id}
                                        type="button"
                                        onClick={() => handleSelectFastGame(game)}
                                        className={`flex items-center gap-3 p-2 rounded-lg border transition-all hover:bg-gray-800 text-left ${selectedFastGame?.id === game.id
                                          ? 'border-green-500 bg-green-900/10'
                                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                                          }`}
                                      >
                                        <div className="w-10 h-14 bg-gray-800 flex-shrink-0 rounded overflow-hidden">
                                          {game.coverUrl ? (
                                            <img
                                              src={game.coverUrl}
                                              alt={game.name}
                                              className="w-full h-full object-cover"
                                              onError={(e) => {
                                                (e.target as HTMLImageElement).style.display = 'none';
                                              }}
                                            />
                                          ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                              </svg>
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-white truncate">{game.name}</div>
                                          <div className="text-xs text-gray-400">
                                            {game.releaseDate ? new Date(game.releaseDate * 1000).getFullYear() : 'Unknown Year'} • IGDB
                                          </div>
                                        </div>
                                        <div className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300 group-hover:bg-green-600 group-hover:text-white transition-colors">
                                          Select
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {isSearchingImages && (
                                <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Searching for {showImageSearch?.type || 'images'}...
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                      {/* Sticky Tabs Header - Outside Scrollable Container */}
                      {(imageSearchResults.length > 0 ||
                        steamGridDBResults.boxart.length > 0 ||
                        steamGridDBResults.banner.length > 0 ||
                        steamGridDBResults.logo.length > 0 ||
                        steamGridDBResults.icon.length > 0) && (
                          <div className="border-t border-gray-800 bg-gray-900 px-4 pt-4 pb-2">
                            {/* Tabs Header with New Search Button */}
                            <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
                              <div className="flex items-center gap-1">
                                {['all', 'boxart', 'banner', 'logo', 'icon'].map((tab) => {
                                  const label = tab.charAt(0).toUpperCase() + tab.slice(1);
                                  const isActive = activeImageSearchTab === tab;

                                  // Calculate counts
                                  let count = 0;
                                  if (tab === 'all') {
                                    count = imageSearchResults.length +
                                      steamGridDBResults.boxart.length +
                                      steamGridDBResults.banner.length +
                                      steamGridDBResults.logo.length +
                                      steamGridDBResults.icon.length;
                                  } else {
                                    if (tab === 'boxart') count = imageSearchResults.filter(i => i.boxArtUrl || i.coverUrl).length + steamGridDBResults.boxart.length;
                                    else if (tab === 'banner') count = imageSearchResults.filter(i => i.bannerUrl || i.screenshotUrls).length + steamGridDBResults.banner.length;
                                    else if (tab === 'logo') count = steamGridDBResults.logo.length + imageSearchResults.filter(i => i.logoUrl).length; // Add logos from main results if any
                                    else if (tab === 'icon') count = steamGridDBResults.icon.length;
                                  }

                                  return (
                                    <button
                                      key={tab}
                                      onClick={() => setActiveImageSearchTab(tab as any)}
                                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${isActive
                                        ? 'border-green-500 text-green-400'
                                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                                        }`}
                                    >
                                      {label}
                                      {count > 0 && <span className="ml-2 text-xs opacity-60 bg-gray-800 px-1.5 py-0.5 rounded-full">{count}</span>}
                                    </button>
                                  );
                                })}
                              </div>
                              <button
                                onClick={() => {
                                  setImageSearchResults([]);
                                  setSteamGridDBResults({ boxart: [], banner: [], logo: [], icon: [] });
                                  setFastSearchResults([]);
                                  setSelectedFastGame(null);
                                }}
                                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 px-3 py-1 bg-gray-800 rounded border border-gray-700 hover:border-gray-500"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                New Search
                              </button>
                            </div>
                          </div>
                        )}

                      {/* Result Tabs Content - Scrollable Container */}
                      <div className="flex-1 overflow-y-auto px-4 py-1 custom-scrollbar relative">
                        {(imageSearchResults.length > 0 ||
                          steamGridDBResults.boxart.length > 0 ||
                          steamGridDBResults.banner.length > 0 ||
                          steamGridDBResults.logo.length > 0 ||
                          steamGridDBResults.icon.length > 0) && (
                            <div>
                              {/* Content */}
                              <div className="space-y-8">
                                {/* Boxart Section */}
                                {(activeImageSearchTab === 'all' || activeImageSearchTab === 'boxart') &&
                                  (imageSearchResults.some(i => i.boxArtUrl || i.coverUrl) || steamGridDBResults.boxart.length > 0) && (
                                    <div>
                                      {activeImageSearchTab === 'all' && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Box Art & Covers</h4>}
                                      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
                                        {/* IGDB Covers */}
                                        {imageSearchResults.filter(i => i.boxArtUrl || i.coverUrl).map((result, idx) => (
                                          <div
                                            key={`igdb-boxart-${result.id}-${idx}`}
                                            onClick={() => handleSelectImage(result.boxArtUrl || result.coverUrl, 'boxart')}
                                            className="group cursor-pointer"
                                          >
                                            <div className="aspect-[2/3] rounded overflow-hidden border border-gray-700 bg-gray-800 group-hover:border-green-500 transition-all relative">
                                              <img
                                                src={result.boxArtUrl || result.coverUrl}
                                                alt={result.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                  (e.target as HTMLImageElement).style.display = 'none';
                                                  (e.target as HTMLImageElement).parentElement?.parentElement?.remove(); // Remove the entire card container
                                                }}
                                              />
                                              <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                                                <p className="text-[10px] text-white truncate text-center">{result.source || 'IGDB'}</p>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                        {/* SGDB Boxarts */}
                                        {steamGridDBResults.boxart.map((result: any, idx: number) => (
                                          <div
                                            key={`sgdb-boxart-${idx}`}
                                            onClick={() => handleSelectImage(result.url || result.boxArtUrl || result.coverUrl, 'boxart')}
                                            className="group cursor-pointer"
                                          >
                                            <div className="aspect-[2/3] rounded overflow-hidden border border-gray-700 bg-gray-800 group-hover:border-green-500 transition-all relative">
                                              <img
                                                src={result.url || result.boxArtUrl || result.coverUrl}
                                                alt={result.name}
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                  (e.target as HTMLImageElement).style.display = 'none';
                                                  (e.target as HTMLImageElement).parentElement?.parentElement?.remove();
                                                }}
                                              />
                                              <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                                                <p className="text-[10px] text-white truncate text-center">SteamGridDB</p>
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                {/* Banner Section */}
                                {(activeImageSearchTab === 'all' || activeImageSearchTab === 'banner') &&
                                  (imageSearchResults.some(i => i.bannerUrl || i.screenshotUrls) || steamGridDBResults.banner.length > 0) && (
                                    <div>
                                      {activeImageSearchTab === 'all' && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Banners & Screenshots</h4>}
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                        {/* IGDB Screenshots/Banners */}
                                        {imageSearchResults.filter(i => i.bannerUrl || i.screenshotUrls).map((result, idx) => {
                                          const url = result.bannerUrl || result.screenshotUrls?.[0];
                                          if (!url) return null;
                                          return (
                                            <div
                                              key={`igdb-banner-${result.id}-${idx}`}
                                              onClick={() => handleSelectImage(url, 'banner')}
                                              className="group cursor-pointer"
                                            >
                                              <div className="aspect-video rounded overflow-hidden border border-gray-700 bg-gray-800 group-hover:border-green-500 transition-all relative">
                                                <img
                                                  src={url}
                                                  alt={result.name}
                                                  className="w-full h-full object-cover"
                                                  onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).parentElement?.parentElement?.remove();
                                                  }}
                                                />
                                                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                                                  <p className="text-[10px] text-white truncate text-center">{result.name}</p>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                        {/* SGDB Heroes/Banners */}
                                        {steamGridDBResults.banner.map((result: any, idx: number) => {
                                          const url = result.url || result.bannerUrl;
                                          if (!url) return null;
                                          return (
                                            <div
                                              key={`sgdb-banner-${idx}`}
                                              onClick={() => handleSelectImage(url, 'banner')}
                                              className="group cursor-pointer"
                                            >
                                              <div className="aspect-video rounded overflow-hidden border border-gray-700 bg-gray-800 group-hover:border-green-500 transition-all relative">
                                                <img
                                                  src={url}
                                                  alt={result.name}
                                                  className="w-full h-full object-cover"
                                                  onError={(e) => {
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    (e.target as HTMLImageElement).parentElement?.parentElement?.remove();
                                                  }}
                                                />
                                                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                                                  <p className="text-[10px] text-white truncate text-center">SteamGridDB</p>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}

                                {/* Logo Section */}
                                {(activeImageSearchTab === 'all' || activeImageSearchTab === 'logo') &&
                                  (steamGridDBResults.logo.length > 0 || imageSearchResults.some(i => i.logoUrl)) && (
                                    <div>
                                      {activeImageSearchTab === 'all' && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Logos</h4>}
                                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                                        {steamGridDBResults.logo.map((result: any, idx: number) => {
                                          const url = result.url || result.logoUrl;
                                          if (!url) return null;
                                          return (
                                            <div
                                              key={`sgdb-logo-${idx}`}
                                              onClick={() => handleSelectImage(url, 'logo')}
                                              className="group cursor-pointer flex items-center justify-center p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all h-24"
                                            >
                                              <img src={url} alt="Logo" className="max-w-full max-h-full object-contain" />
                                            </div>
                                          );
                                        })}
                                        {imageSearchResults.filter(i => i.logoUrl).map((result, idx) => (
                                          <div
                                            key={`igdb-logo-${idx}`}
                                            onClick={() => handleSelectImage(result.logoUrl, 'logo')}
                                            className="group cursor-pointer flex items-center justify-center p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all h-24"
                                          >
                                            <img src={result.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                {/* Icon Section */}
                                {(activeImageSearchTab === 'all' || activeImageSearchTab === 'icon') &&
                                  (steamGridDBResults.icon.length > 0) && (
                                    <div>
                                      {activeImageSearchTab === 'all' && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Icons</h4>}
                                      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                                        {steamGridDBResults.icon.map((result: any, idx: number) => {
                                          const url = result.url || result.iconUrl;
                                          if (!url) return null;
                                          return (
                                            <div
                                              key={`sgdb-icon-${idx}`}
                                              onClick={() => handleSelectImage(url, 'icon')}
                                              className="group cursor-pointer flex items-center justify-center p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all aspect-square"
                                            >
                                              <img src={url} alt="Icon" className="w-full h-full object-contain" />
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  )}
                              </div>
                            </div>
                          )}

                        {/* Manual Search / Help Footer */}
                        <div className="mt-8 mx-4 pt-6 border-t border-gray-800 pb-8 text-center opacity-80 hover:opacity-100 transition-opacity">
                          <h4 className="text-sm font-medium text-gray-300 mb-2">Can't find what you're looking for?</h4>
                          <p className="text-xs text-gray-500 mb-4 max-w-md mx-auto">
                            You can search Google Images for the exact asset you need, save it, and use the "Browse" button or <strong>Right-Click</strong> on the image slots above to upload it.
                          </p>
                          <div className="flex flex-wrap justify-center gap-3">
                            <button
                              onClick={() => {
                                const query = `${editedGame?.title || selectedGame?.title} box art`;
                                window.electronAPI.openExternal(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`);
                              }}
                              className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-gray-300 rounded transition-all flex items-center gap-2"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                              Search Box Art
                            </button>
                            <button
                              onClick={() => {
                                const query = `${editedGame?.title || selectedGame?.title} game logo transparent`;
                                window.electronAPI.openExternal(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`);
                              }}
                              className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-gray-300 rounded transition-all flex items-center gap-2"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                              Search Logo
                            </button>
                            <button
                              onClick={() => {
                                const query = `${editedGame?.title || selectedGame?.title} game banner wallpaper`;
                                window.electronAPI.openExternal(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`);
                              }}
                              className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-gray-300 rounded transition-all flex items-center gap-2"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                              Search Banner
                            </button>
                            <button
                              onClick={() => {
                                const query = `${editedGame?.title || selectedGame?.title} game icon`;
                                window.electronAPI.openExternal(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`);
                              }}
                              className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-gray-300 rounded transition-all flex items-center gap-2"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                              Search Icon
                            </button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === 'metadata' && (
                    <div className="p-4 h-full overflow-y-auto">
                      {/* Image Preview Strip - Copied from Images Tab */}
                      <div className="flex gap-2 mb-6 items-start p-3 bg-gray-900/50 rounded-lg border border-gray-800">
                        {/* Boxart */}
                        <div
                          onClick={() => {
                            setActiveTab('images');
                            setShowImageSearch({ type: 'boxart', gameId: selectedGame.id });
                            setActiveImageSearchTab('boxart');
                            setImageSearchQuery(selectedGame.title);
                          }}
                          className="h-24 w-auto aspect-[2/3] relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
                        >
                          {(editedGame.boxArtUrl || selectedGame.boxArtUrl) ? (
                            <img
                              src={editedGame.boxArtUrl || selectedGame.boxArtUrl}
                              alt="Boxart"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[8px] text-gray-600 text-center p-1">Boxart</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] text-white font-medium">Edit</span>
                          </div>
                        </div>

                        {/* Logo */}
                        <div
                          onClick={() => {
                            setActiveTab('images');
                            setShowImageSearch({ type: 'logo', gameId: selectedGame.id });
                            setActiveImageSearchTab('logo');
                            setImageSearchQuery(selectedGame.title);
                          }}
                          className="h-24 w-36 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
                        >
                          {(editedGame.logoUrl || selectedGame.logoUrl) ? (
                            <div className="w-full h-full p-2 flex items-center justify-center">
                              <img
                                src={editedGame.logoUrl || selectedGame.logoUrl}
                                alt="Logo"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center p-2">
                              <span className="text-[8px] text-gray-600">Logo</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] text-white font-medium">Edit</span>
                          </div>
                        </div>

                        {/* Banner */}
                        <div
                          onClick={() => {
                            setActiveTab('images');
                            setShowImageSearch({ type: 'banner', gameId: selectedGame.id });
                            setActiveImageSearchTab('banner');
                            setImageSearchQuery(selectedGame.title);
                          }}
                          className="h-24 flex-1 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors"
                        >
                          {(editedGame.bannerUrl || selectedGame.bannerUrl) ? (
                            <img
                              src={editedGame.bannerUrl || selectedGame.bannerUrl}
                              alt="Banner"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="text-[8px] text-gray-600">Banner</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] text-white font-medium">Edit</span>
                          </div>
                        </div>

                        {/* Icon */}
                        <div
                          onClick={() => {
                            setActiveTab('images');
                            setShowImageSearch({ type: 'icon', gameId: selectedGame.id });
                            setActiveImageSearchTab('icon');
                            setImageSearchQuery(selectedGame.title);
                          }}
                          className="h-24 w-24 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
                        >
                          {(editedGame.iconUrl || selectedGame.iconUrl) ? (
                            <div className="w-full h-full p-2 flex items-center justify-center">
                              <img
                                src={editedGame.iconUrl || selectedGame.iconUrl}
                                alt="Icon"
                                className="max-w-full max-h-full object-contain"
                              />
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-center p-1">
                              <span className="text-[8px] text-gray-600">Icon</span>
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] text-white font-medium">Edit</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col lg:flex-row gap-4">
                          {/* Title Row with Fix Match */}
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={showFixMatch ? metadataSearchQuery : editedGame.title}
                                onChange={(e) => {
                                  if (showFixMatch) {
                                    setMetadataSearchQuery(e.target.value);
                                  } else {
                                    setEditedGame({ ...editedGame, title: e.target.value });
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (showFixMatch && e.key === 'Enter') {
                                    handleFixMatchSearch();
                                  }
                                }}
                                placeholder={showFixMatch ? "Enter game title to search..." : ""}
                                className="flex-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                disabled={showFixMatch && isSearchingMetadata}
                              />
                              {showFixMatch && (
                                <button
                                  onClick={handleFixMatchSearch}
                                  disabled={isSearchingMetadata}
                                  className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                  {isSearchingMetadata ? (
                                    <>
                                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                      </svg>
                                      Searching...
                                    </>
                                  ) : (
                                    'Search'
                                  )}
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  const wasHidden = !showFixMatch;
                                  setShowFixMatch(!showFixMatch);
                                  if (wasHidden) {
                                    // When opening, set search query to current title and auto-search
                                    setMetadataSearchQuery(editedGame.title || selectedGame.title);
                                    const query = editedGame.title || selectedGame.title;
                                    if (query) {
                                      setIsSearchingMetadata(true);
                                      setMetadataSearchResults([]);
                                      try {
                                        const response = await window.electronAPI.searchGames(query);
                                        if (response.success && response.results) {
                                          // Filter to show only Steam Store API results
                                          const steamResults = response.results.filter((result: any) => result.source === 'steam');

                                          if (steamResults.length === 0) {
                                            setError('No Steam Store API results found. Make sure the game is available on Steam.');
                                            setMetadataSearchResults([]);
                                            setIsSearchingMetadata(false);
                                            return;
                                          }

                                          // Sort results: newest release first, then exact matches
                                          const normalizedQuery = query.toLowerCase().trim();
                                          const sortedResults = steamResults.sort((a: any, b: any) => {
                                            // First, sort by release date (newest first)
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
                                              return bDate - aDate; // Newest first
                                            }

                                            // Then prioritize exact matches
                                            const aName = (a.title || (("name" in a ? (a as any).name : "") as string)).toLowerCase().trim();
                                            const bName = (b.title || (("name" in b ? (b as any).name : "") as string)).toLowerCase().trim();
                                            const aExact = aName === normalizedQuery;
                                            const bExact = bName === normalizedQuery;
                                            if (aExact && !bExact) return -1;
                                            if (!aExact && bExact) return 1;

                                            return 0;
                                          });
                                          setMetadataSearchResults(sortedResults);
                                        }
                                      } catch (err) {
                                        console.error('Error searching metadata:', err);
                                      } finally {
                                        setIsSearchingMetadata(false);
                                      }
                                    }
                                  } else {
                                    // When hiding, clear search results
                                    setMetadataSearchResults([]);
                                    setMetadataSearchQuery('');
                                  }
                                }}
                                className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center gap-1.5"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                                {showFixMatch ? 'Hide' : 'Fix Match'}
                              </button>
                            </div>
                          </div>

                          {/* Steam App ID */}
                          <div className="w-full lg:w-1/3">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Steam App ID</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={steamAppIdInput}
                                onChange={(e) => {
                                  // Only update the input value - don't update game ID yet
                                  setSteamAppIdInput(e.target.value);
                                }}
                                onBlur={(e) => {
                                  setIsSteamAppIdInputFocused(false);
                                  // Update game ID when user finishes typing
                                  const value = e.target.value.trim();
                                  if (value && /^\d+$/.test(value)) {
                                    const newGameId = `steam-${value}`;
                                    setEditedGame({
                                      ...editedGame,
                                      id: newGameId,
                                      platform: 'steam'
                                    });
                                  } else if (value === '') {
                                    // If cleared, convert to custom game ID
                                    const newGameId = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                                    setEditedGame({
                                      ...editedGame,
                                      id: newGameId,
                                      platform: editedGame.platform === 'steam' ? 'other' : editedGame.platform
                                    });
                                  }
                                }}
                                onFocus={() => {
                                  setIsSteamAppIdInputFocused(true);
                                }}
                                onKeyDown={(e) => {
                                  // Update game ID when user presses Enter
                                  if (e.key === 'Enter') {
                                    e.currentTarget.blur(); // This will trigger onBlur
                                  }
                                }}
                                placeholder="Steam App ID"
                                className="flex-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <button
                                onClick={() => {
                                  window.electronAPI.openExternal(`https://steamdb.info/search/?q=${encodeURIComponent(editedGame.title)}`);
                                }}
                                className="px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center gap-2"
                                title="Search on steamdb.info"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                SteamDB
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Fix Match Results */}
                        {showFixMatch && (
                          <div className="space-y-2">
                            {isSearchingMetadata && (
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Searching for metadata matches...
                              </div>
                            )}

                            {metadataSearchResults.length > 0 && (
                              <div className="max-h-96 overflow-y-auto">
                                <div className="space-y-2">
                                  {metadataSearchResults.map((result) => {
                                    // Extract release date properly - show full date, not just year
                                    let displayDate: string | undefined;
                                    if (result.releaseDate) {
                                      // Handle both Unix timestamp (seconds) and Date objects
                                      if (typeof result.releaseDate === 'number') {
                                        const date = new Date(result.releaseDate * 1000);
                                        displayDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                      } else if (typeof result.releaseDate === 'string') {
                                        const date = new Date(result.releaseDate);
                                        if (!isNaN(date.getTime())) {
                                          displayDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                                        } else {
                                          // Try parsing as ISO date string
                                          displayDate = result.releaseDate;
                                        }
                                      }
                                    } else if (result.year) {
                                      // Fallback to year only if no full date available
                                      displayDate = result.year.toString();
                                    }

                                    return (
                                      <button
                                        key={result.id}
                                        onClick={() => handleSelectMetadataMatch({ id: result.id, source: result.source, steamAppId: result.steamAppId, title: result.title || result.name })}
                                        disabled={isApplyingMetadata}
                                        className="relative w-full text-left p-3 text-sm bg-gray-800 hover:bg-gray-700 rounded border border-gray-600 disabled:opacity-50 transition-colors flex items-center gap-3"
                                      >
                                        <div className="flex-1 min-w-0">
                                          <p className="text-white font-medium text-sm truncate" title={result.title || result.name}>
                                            {result.title || result.name}
                                          </p>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className={`text-xs ${result.source === 'steam' ? 'text-blue-400' : 'text-gray-400'}`}>
                                              {result.source === 'steam' ? 'Steam' : result.source === 'igdb' ? 'IGDB' : result.source === 'steamgriddb' ? 'SGDB' : result.source}
                                            </span>
                                            {result.steamAppId && (
                                              <span className="text-xs text-gray-500">App ID: {result.steamAppId}</span>
                                            )}
                                            {displayDate && (
                                              <span className="text-xs text-gray-400">��� {displayDate}</span>
                                            )}
                                          </div>
                                        </div>
                                        {isApplyingMetadata && (
                                          <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                                            <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                          </div>
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Categories - refined single line layout */}
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Categories</label>
                          <div className="flex items-center gap-2">
                            {/* Input Area (Tags + Input) */}
                            <div className="flex-1 flex items-center gap-2 p-1.5 bg-gray-800/50 rounded border border-gray-700 overflow-x-auto whitespace-nowrap min-h-[38px] scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                              {/* Existing Tags */}
                              {editedGame.categories?.map((category, index) => (
                                <span key={index} className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-blue-900/30 text-blue-200 border border-blue-700/30 rounded-full group hover:border-blue-500/50 transition-colors">
                                  {category}
                                  <button
                                    onClick={() => {
                                      const newCategories = [...(editedGame.categories || [])];
                                      newCategories.splice(index, 1);
                                      setEditedGame({ ...editedGame, categories: newCategories });
                                    }}
                                    className="ml-0.5 text-blue-400 hover:text-white focus:outline-none rounded-full p-0.5 hover:bg-blue-800/50 transition-colors"
                                    title="Remove category"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </span>
                              ))}

                              {/* Input Field */}
                              <input
                                type="text"
                                value={newCategoryInput}
                                onChange={(e) => setNewCategoryInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    if (newCategoryInput.trim()) {
                                      const currentCategories = editedGame.categories || [];
                                      const newCat = newCategoryInput.trim();
                                      if (!currentCategories.includes(newCat)) {
                                        setEditedGame({
                                          ...editedGame,
                                          categories: [...currentCategories, newCat]
                                        });
                                        setNewCategoryInput('');
                                      }
                                    }
                                  }
                                }}
                                placeholder={(!editedGame.categories || editedGame.categories.length === 0) ? "Add category..." : ""}
                                className="min-w-[100px] flex-1 bg-transparent border-none text-sm text-white focus:outline-none placeholder-gray-500 py-0.5"
                              />
                            </div>

                            {/* Suggestions - Right Side */}
                            <div className="flex items-center gap-2 max-w-[30%] overflow-x-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent py-1">
                              {allCategories
                                .filter(cat => !editedGame.categories?.includes(cat))
                                .slice(0, 5) // Show top 5 unused categories
                                .map((cat, idx) => (
                                  <button
                                    key={idx}
                                    onClick={() => {
                                      const currentCategories = editedGame.categories || [];
                                      setEditedGame({
                                        ...editedGame,
                                        categories: [...currentCategories, cat]
                                      });
                                    }}
                                    className="flex-shrink-0 px-2.5 py-1 text-xs font-medium bg-gray-700/50 hover:bg-gray-600 text-gray-300 border border-gray-600 rounded-full transition-colors whitespace-nowrap"
                                  >
                                    + {cat}
                                  </button>
                                ))}
                            </div>
                          </div>
                        </div>

                        {/* Description */}
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                          <textarea
                            value={editedGame.description || ''}
                            onChange={(e) => setEditedGame({ ...editedGame, description: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            rows={3}
                          />
                        </div>

                        {/* Metadata Grid - 4 Columns */}
                        <div className="grid grid-cols-4 gap-3">
                          {/* Platform */}
                          {editedGame.platform && editedGame.platform !== 'other' && (
                            <div>
                              <label className="block text-xs font-medium text-gray-400 mb-1">Platform</label>
                              <input
                                type="text"
                                value={editedGame.platform}
                                onChange={(e) => setEditedGame({ ...editedGame, platform: e.target.value })}
                                className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                          )}

                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Release Date</label>
                            <input
                              type="text"
                              value={editedGame.releaseDate || ''}
                              onChange={(e) => setEditedGame({ ...editedGame, releaseDate: e.target.value })}
                              placeholder="YYYY-MM-DD"
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Age Rating</label>
                            <input
                              type="text"
                              value={editedGame.ageRating || ''}
                              onChange={(e) => setEditedGame({ ...editedGame, ageRating: e.target.value })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Series</label>
                            <input
                              type="text"
                              value={editedGame.series || ''}
                              onChange={(e) => setEditedGame({ ...editedGame, series: e.target.value })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Genres</label>
                            <input
                              type="text"
                              value={editedGame.genres?.join(', ') || ''}
                              onChange={(e) => setEditedGame({ ...editedGame, genres: e.target.value.split(',').map(g => g.trim()).filter(g => g) })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Developers</label>
                            <input
                              type="text"
                              value={editedGame.developers?.join(', ') || ''}
                              onChange={(e) => setEditedGame({ ...editedGame, developers: e.target.value.split(',').map(d => d.trim()).filter(d => d) })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Publishers</label>
                            <input
                              type="text"
                              value={editedGame.publishers?.join(', ') || ''}
                              onChange={(e) => setEditedGame({ ...editedGame, publishers: e.target.value.split(',').map(p => p.trim()).filter(p => p) })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Tags</label>
                            <input
                              type="text"
                              value={editedGame.tags?.join(', ') || ''}
                              onChange={(e) => setEditedGame({ ...editedGame, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Region</label>
                            <input
                              type="text"
                              value={editedGame.region || ''}
                              onChange={(e) => setEditedGame({ ...editedGame, region: e.target.value })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">User Score</label>
                            <input
                              type="number"
                              value={editedGame.userScore ?? ''}
                              onChange={(e) => setEditedGame({ ...editedGame, userScore: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Critic Score</label>
                            <input
                              type="number"
                              value={editedGame.criticScore ?? ''}
                              onChange={(e) => setEditedGame({ ...editedGame, criticScore: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Community Score</label>
                            <input
                              type="number"
                              value={editedGame.communityScore ?? ''}
                              onChange={(e) => setEditedGame({ ...editedGame, communityScore: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Install Directory</label>
                            <input
                              type="text"
                              value={editedGame.installationDirectory || ''}
                              onChange={(e) => setEditedGame({ ...editedGame, installationDirectory: e.target.value })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Executable Path</label>
                            <input
                              type="text"
                              value={editedGame.exePath || ''}
                              onChange={(e) => setEditedGame({ ...editedGame, exePath: e.target.value })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Install Size</label>
                            <input
                              type="text"
                              value={editedGame.installSize ? `${Math.round(editedGame.installSize / 1024 / 1024 / 1024 * 100) / 100} GB` : ''}
                              readOnly
                              className="w-full px-3 py-1.5 text-sm bg-gray-800/50 border border-gray-600 rounded text-gray-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Last Played</label>
                            <input
                              type="text"
                              value={editedGame.lastPlayed || ''}
                              readOnly
                              className="w-full px-3 py-1.5 text-sm bg-gray-800/50 border border-gray-600 rounded text-gray-400"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Play Count</label>
                            <input
                              type="number"
                              value={editedGame.playCount ?? ''}
                              onChange={(e) => setEditedGame({ ...editedGame, playCount: e.target.value ? Number(e.target.value) : undefined })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Completion Status</label>
                            <input
                              type="text"
                              value={editedGame.completionStatus || ''}
                              onChange={(e) => setEditedGame({ ...editedGame, completionStatus: e.target.value })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Source</label>
                            <input
                              type="text"
                              value={editedGame.source || ''}
                              onChange={(e) => setEditedGame({ ...editedGame, source: e.target.value })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                          </div>
                          {/* Notes - Span 4 columns */}
                          <div className="col-span-4">
                            <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
                            <textarea
                              value={editedGame.notes || ''}
                              onChange={(e) => setEditedGame({ ...editedGame, notes: e.target.value })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              rows={2}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setExpandedGameId(null);
                              setEditedGame(null);
                              setShowFixMatch(false);
                              setSelectedGameId(null);
                              // Reset Fix Match state when cancelling edit
                              setMetadataSearchResults([]);
                              setMetadataSearchQuery('');
                              setIsSearchingMetadata(false);
                            }}
                            className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                          >
                            Cancel
                          </button>
                          {onDeleteGame && (
                            <button
                              onClick={() => setShowDeleteConfirm(true)}
                              disabled={isDeleting}
                              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'modManager' && editedGame && (
                    <div className="p-4">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">
                            Mod Manager Link
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={editedGame.modManagerUrl || ''}
                              onChange={(e) => setEditedGame({ ...editedGame, modManagerUrl: e.target.value })}
                              className="flex-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              placeholder="Enter mod manager URL or path (e.g., https://example.com/mod-manager)"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const path = await window.electronAPI.showOpenDialog();
                                if (path) {
                                  setEditedGame({ ...editedGame, modManagerUrl: path });
                                }
                              }}
                              className="px-4 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                              title="Browse for mod manager executable"
                            >
                              Browse
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-2">
                            Enter the URL or path to your mod manager. This will appear in the game's context menu and bottom bar.
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2 pt-2">
                          <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                          >
                            {isSaving ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            onClick={() => {
                              setExpandedGameId(null);
                              setEditedGame(null);
                              setShowFixMatch(false);
                              setSelectedGameId(null);
                            }}
                            className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
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
        onCancel={() => {
          setShowRefreshDialog(false);
        }}
      />

      {/* Refresh Metadata Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showRefreshConfirm}
        title={refreshMode === 'all' ? 'Refresh All Games' : 'Refresh Missing Images Only'}
        message={refreshMode === 'all'
          ? 'This will remove all existing metadata and images for every game in your library and fetch fresh data from online sources.'
          : 'This will refresh metadata and images only for games that are missing box art or banner images. Games with existing images will be left unchanged.'}
        note="This action cannot be undone. All cached images for selected games will be deleted and metadata will be re-fetched from online sources."
        confirmText="Continue"
        cancelText="Cancel"
        variant="danger"
        onConfirm={async () => {
          setShowRefreshConfirm(false);
          setRefreshProgress({ current: 0, total: 0, message: 'Starting...' });
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
            <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-md p-6">
              <h3 className="text-xl font-semibold text-white mb-4">Refreshing Metadata</h3>

              {/* Progress Bar */}
              <div className="w-full bg-gray-700 rounded-full h-3 mb-4 overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 ease-out rounded-full"
                  style={{
                    width: refreshProgress.total > 0
                      ? `${(refreshProgress.current / refreshProgress.total) * 100}%`
                      : '0%'
                  }}
                />
              </div>

              {/* Progress Text */}
              <div className="text-sm text-gray-300 mb-2">
                {refreshProgress.total > 0 ? (
                  <span>
                    {refreshProgress.current} of {refreshProgress.total} games
                  </span>
                ) : (
                  <span>Preparing...</span>
                )}
              </div>

              {/* Current Status Message */}
              <div className="text-sm text-gray-400 min-h-[40px]">
                {refreshProgress.message}
              </div>

              {/* Current Game Title */}
              {refreshProgress.gameTitle && (
                <div className="text-xs text-gray-500 mt-2 italic">
                  {refreshProgress.gameTitle}
                </div>
              )}

              {/* Show completion message if done */}
              {refreshProgress.total > 0 && refreshProgress.current >= refreshProgress.total && (
                <div className="mt-4 pt-4 border-t border-gray-700">
                  <div className="text-sm text-green-400 font-medium">
                    ԣ� Refresh completed!
                  </div>
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
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <div className="text-sm font-medium">{error}</div>
          </div>
        )}
        {success && (
          <div className="pointer-events-auto flex items-center gap-3 bg-green-900/95 border border-green-500 text-green-100 px-4 py-3 rounded-lg shadow-xl backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4">
            <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
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
          onSelectFromFile={() => handleBrowseImage(contextMenu.type)}
          onSearchImages={() => {
            setShowImageSearch({ type: contextMenu.type, gameId: selectedGame!.id });
            setActiveImageSearchTab(contextMenu.type === 'banner' ? 'banner' : contextMenu.type);
            setImageSearchQuery(selectedGame!.title);
            setContextMenu(null);
          }}
        />
      )}
    </div >
  );
};


