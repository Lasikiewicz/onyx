import React, { useState, useEffect, useMemo } from 'react';
import { Game } from '../types/game';
import { ConfirmationDialog } from './ConfirmationDialog';
import { MatchFixDialog } from './MatchFixDialog';
import { RefreshMetadataDialog } from './RefreshMetadataDialog';
import { BoxartFixDialog } from './BoxartFixDialog';

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
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const [refreshMode, setRefreshMode] = useState<'all' | 'missing' | null>(null);
  const [refreshProgress, setRefreshProgress] = useState<{ current: number; total: number; message: string; gameTitle?: string } | null>(null);
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
            setSuccess(mode === 'all' 
              ? 'No games were refreshed.' 
              : 'No games found with missing images. All games already have metadata.');
            setTimeout(() => {
              setRefreshProgress(null);
            }, 2000);
          } else {
            // Only show success if refresh was actually successful (all games have boxart)
            if (result.success) {
              setSuccess(`Successfully refreshed metadata for ${result.count} games`);
            } else {
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
                // Set flag to select first game after games update
                setShouldSelectFirstGameAfterRefresh(true);
              } catch (reloadError) {
                console.error('Error reloading library:', reloadError);
                setError('Failed to reload library after refresh');
                setRefreshProgress(null);
              }
            } else {
              setTimeout(() => {
                setRefreshProgress(null);
                // Set flag to select first game after games update
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
      setLocalGames(games);
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
  }, [isOpen, initialGameId, initialTab]);

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
  const handleSearchImages = async (imageType: 'boxart' | 'banner' | 'logo' | 'icon') => {
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
    
    // If we have a Steam App ID, fetch official Steam images first
    if (steamAppId) {
      setIsSearchingImages(true);
      setError(null);
      setImageSearchResults([]);
      setSteamGridDBResults({ boxart: [], banner: [], logo: [], icon: [] });

      try {
        // Fetch official Steam artwork first
        const steamMetadata = await window.electronAPI.searchArtwork(selectedGame.title, steamAppId);
        if (steamMetadata) {
          // Add official Steam images to results
          const steamResults: any[] = [];
          if (imageType === 'boxart' && steamMetadata.boxArtUrl) {
            steamResults.push({
              id: `steam-${steamAppId}`,
              name: selectedGame.title,
              title: selectedGame.title,
              boxArtUrl: steamMetadata.boxArtUrl,
              coverUrl: steamMetadata.boxArtUrl,
              source: 'steam',
              score: 10000, // Highest priority for official Steam images
            });
            setSteamGridDBResults(prev => ({ ...prev, boxart: [...steamResults, ...prev.boxart] }));
          } else if (imageType === 'banner' && steamMetadata.bannerUrl) {
            steamResults.push({
              id: `steam-${steamAppId}`,
              name: selectedGame.title,
              title: selectedGame.title,
              bannerUrl: steamMetadata.bannerUrl,
              source: 'steam',
              score: 10000,
            });
            setSteamGridDBResults(prev => ({ ...prev, banner: [...steamResults, ...prev.banner] }));
          } else if (imageType === 'logo' && steamMetadata.logoUrl) {
            steamResults.push({
              id: `steam-${steamAppId}`,
              name: selectedGame.title,
              title: selectedGame.title,
              logoUrl: steamMetadata.logoUrl,
              source: 'steam',
              score: 10000,
            });
            setSteamGridDBResults(prev => ({ ...prev, logo: [...steamResults, ...prev.logo] }));
          } else if (imageType === 'icon' && steamMetadata.iconUrl) {
            steamResults.push({
              id: `steam-${steamAppId}`,
              name: selectedGame.title,
              title: selectedGame.title,
              iconUrl: steamMetadata.iconUrl,
              source: 'steam',
              score: 10000,
            });
            setSteamGridDBResults(prev => ({ ...prev, icon: [...steamResults, ...prev.icon] }));
          }
        }
      } catch (err) {
        console.error('Error fetching Steam artwork:', err);
        // Continue with regular search
      }
    }

    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setIsSearchingImages(true);
    setError(null);
    if (!steamAppId) {
      // Only clear results if we didn't already fetch Steam images
      setImageSearchResults([]);
      setSteamGridDBResults({ boxart: [], banner: [], logo: [], icon: [] });
    }

    try {

      // Start both searches in parallel but update results as they come in
      const searchPromises: Promise<any>[] = [];

      // Search IGDB for metadata (only if searching for boxart or banner)
      if (imageType === 'boxart' || imageType === 'banner') {
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
                setImageSearchResults(filteredIGDBResults);
              }
            }
            return igdbResponse;
          }).catch((err: any) => {
            console.error('Error searching IGDB:', err);
            return null;
          })
        );
      }
      
      // Search SteamGridDB for the specific image type
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
              
              // If both or neither are exact, sort by release date (newest first) if available
              if (aExact === bExact) {
                const aDate = a.releaseDate ? new Date(a.releaseDate).getTime() : 0;
                const bDate = b.releaseDate ? new Date(b.releaseDate).getTime() : 0;
                if (aDate !== bDate && aDate > 0 && bDate > 0) {
                  return bDate - aDate; // Newest first
                }
                // If dates are equal or missing, sort by score
                return (b.score || 0) - (a.score || 0);
              }
              
              // If both or neither are exact, sort by score
              return (b.score || 0) - (a.score || 0);
            });
            
            // Update results immediately as they come in
            if (imageType === 'boxart') {
              setSteamGridDBResults(prev => ({ ...prev, boxart: flattenedResults }));
            } else if (imageType === 'banner') {
              setSteamGridDBResults(prev => ({ ...prev, banner: flattenedResults }));
            } else if (imageType === 'logo') {
              setSteamGridDBResults(prev => ({ ...prev, logo: flattenedResults }));
            }
          }
          return sgdbResponse;
        }).catch((err: any) => {
          console.error('Error searching SteamGridDB:', err);
          return null;
        })
      );

      // Wait for all searches to complete
      const searchResults = await Promise.all(searchPromises);
      
      // Check if we got any results
      // Note: State updates are async, so we check the actual results returned
      let hasResults = false;
      
      // Check IGDB results (only for boxart and banner)
      if (imageType === 'boxart' || imageType === 'banner') {
        const igdbResponse = searchResults[0];
        if (igdbResponse && igdbResponse.success && igdbResponse.results) {
          const hasIGDBResults = igdbResponse.results.some((result: any) => {
            if (imageType === 'boxart') return result.coverUrl;
            if (imageType === 'banner') return result.screenshotUrls && result.screenshotUrls.length > 0;
            return false;
          });
          if (hasIGDBResults) hasResults = true;
        }
        
        // Check SteamGridDB results (index 1 when IGDB is included)
        const sgdbResponse = searchResults[1];
        if (sgdbResponse && sgdbResponse.success && sgdbResponse.images && sgdbResponse.images.length > 0) {
          hasResults = true;
        }
      } else {
        // For logo, only SteamGridDB is searched (index 0)
        const sgdbResponse = searchResults[0];
        if (sgdbResponse && sgdbResponse.success && sgdbResponse.images && sgdbResponse.images.length > 0) {
          hasResults = true;
        }
      }

      if (!hasResults) {
        setError(`No ${imageType} results found`);
      }
    } catch (err) {
      setError(`Failed to search for ${imageType}`);
      console.error(`Error searching ${imageType}:`, err);
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
      setSuccess('Image updated successfully');
      setTimeout(() => setSuccess(null), 2000);
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
        // Convert file path to file:// URL
        const fileUrl = imagePath.startsWith('file://') ? imagePath : `file:///${imagePath.replace(/\\/g, '/')}`;
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
      
      // Fetch complete metadata using searchArtwork - this now tries ALL sources for descriptions
      // searchArtwork will:
      // 1. Extract Steam App ID from search results if not provided
      // 2. Try Steam Store API, RAWG, and IGDB for descriptions
      // 3. Move to next source on rate limits (no retries)
      console.log(`[GameManager] Fetching metadata for "${gameTitle}" with Steam App ID: ${steamAppId || 'none'}`);
      const metadata = await window.electronAPI.searchArtwork(gameTitle, steamAppId);
      
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
          // Note: iconUrl is not in Game interface yet, but we can store it if needed
        };
        
        setEditedGame(updatedGame);
        
        // Update the Steam App ID input to show the App ID if we have one
        if (steamAppId) {
          setSteamAppIdInput(steamAppId);
        }
        
        // Save the game immediately
        await onSaveGame(updatedGame);
        
        const sourceName = steamAppId ? 'Steam Store API' : (result.source === 'igdb' ? 'IGDB' : result.source === 'rawg' ? 'RAWG' : result.source);
        setSuccess(`Metadata and images updated from ${sourceName}`);
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
      <div className="w-[90vw] h-[90vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">
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
        {error && (
          <div className="mx-6 mt-4 bg-red-900/20 border border-red-500 rounded p-3 text-red-300 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-6 mt-4 bg-green-900/20 border border-green-500 rounded p-3 text-green-300 text-sm">
            {success}
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel - Game List */}
          <div className="w-80 border-r border-gray-800 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-300 mb-3">Imported Games ({localGames.length})</h3>
              <div className="space-y-2">
                {localGames.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleGameSelect(game.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      selectedGameId === game.id
                        ? 'bg-blue-600/30 border border-blue-500/50'
                        : 'bg-gray-800/50 hover:bg-gray-800 border border-gray-700'
                    }`}
                  >
                    <img
                      src={game.boxArtUrl || '/placeholder.png'}
                      alt={game.title}
                      className="w-16 h-20 object-cover rounded flex-shrink-0"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = '/placeholder.png';
                      }}
                    />
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
                <div className="flex border-b border-gray-800">
                  <button
                    onClick={() => setActiveTab('metadata')}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'metadata'
                        ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                    }`}
                  >
                    Metadata
                  </button>
                  <button
                    onClick={() => setActiveTab('images')}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'images'
                        ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                    }`}
                  >
                    Images
                  </button>
                  <button
                    onClick={() => setActiveTab('modManager')}
                    className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
                      activeTab === 'modManager'
                        ? 'bg-gray-800 text-white border-b-2 border-blue-500'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                    }`}
                  >
                    Mod Manager
                  </button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto">
                  {activeTab === 'images' && (
                    <div className="p-6 space-y-6">
                      {/* Images Row - Boxart, Banner, Logo, Icon */}
                      <div>
                        <div className="grid grid-cols-4 gap-4">
                          {/* Boxart */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Boxart</label>
                            <div
                              onClick={async () => {
                                setActiveTab('images'); // Ensure we're on images tab
                                setShowImageSearch({ type: 'boxart', gameId: selectedGame.id });
                                setImageSearchQuery(selectedGame.title);
                                // Auto-search
                                await handleSearchImages('boxart');
                              }}
                              className="w-full h-32 bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-gray-700 flex items-center justify-center"
                            >
                              {(editedGame.boxArtUrl || selectedGame.boxArtUrl) ? (
                                <img
                                  key={editedGame.boxArtUrl || selectedGame.boxArtUrl}
                                  src={editedGame.boxArtUrl || selectedGame.boxArtUrl}
                                  alt="Boxart"
                                  className="max-w-full max-h-full object-contain"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    // Prevent infinite error loop
                                    if (target.dataset.errorHandled === 'true') return;
                                    target.dataset.errorHandled = 'true';
                                    target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs text-center px-2">
                                  Click to search for boxart
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Banner */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Banner</label>
                            <div
                              onClick={async () => {
                                setActiveTab('images'); // Ensure we're on images tab
                                setShowImageSearch({ type: 'banner', gameId: selectedGame.id });
                                setImageSearchQuery(selectedGame.title);
                                // Auto-search
                                await handleSearchImages('banner');
                              }}
                              className="w-full h-32 bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-gray-700"
                            >
                              {(editedGame.bannerUrl || selectedGame.bannerUrl) ? (
                                <img
                                  key={editedGame.bannerUrl || selectedGame.bannerUrl}
                                  src={editedGame.bannerUrl || selectedGame.bannerUrl}
                                  alt="Banner"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    // Prevent infinite error loop
                                    if (target.dataset.errorHandled === 'true') return;
                                    target.dataset.errorHandled = 'true';
                                    target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500 text-xs text-center px-2">
                                  Click to search for banner
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Logo */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Logo</label>
                            <div
                              onClick={async () => {
                                setActiveTab('images'); // Ensure we're on images tab
                                setShowImageSearch({ type: 'logo', gameId: selectedGame.id });
                                setImageSearchQuery(selectedGame.title);
                                // Auto-search
                                await handleSearchImages('logo');
                              }}
                              className="w-full h-32 bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-gray-700 flex items-center justify-center"
                            >
                              {(editedGame.logoUrl || selectedGame.logoUrl) ? (
                                <img
                                  key={editedGame.logoUrl || selectedGame.logoUrl}
                                  src={editedGame.logoUrl || selectedGame.logoUrl}
                                  alt="Logo"
                                  className="max-w-full max-h-full object-contain"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    // Prevent infinite error loop
                                    if (target.dataset.errorHandled === 'true') return;
                                    target.dataset.errorHandled = 'true';
                                    target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="text-gray-500 text-xs text-center px-2">Click to search for logo</div>
                              )}
                            </div>
                          </div>

                          {/* Icon */}
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Icon</label>
                            <div
                              onClick={async () => {
                                setActiveTab('images'); // Ensure we're on images tab
                                setShowImageSearch({ type: 'icon', gameId: selectedGame.id });
                                setImageSearchQuery(selectedGame.title);
                                // Auto-search
                                await handleSearchImages('icon');
                              }}
                              className="w-full h-32 bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity border border-gray-700 flex items-center justify-center"
                            >
                              {(editedGame.iconUrl || selectedGame.iconUrl) ? (
                                <img
                                  key={editedGame.iconUrl || selectedGame.iconUrl}
                                  src={editedGame.iconUrl || selectedGame.iconUrl}
                                  alt="Icon"
                                  className="max-w-full max-h-full object-contain"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    // Prevent infinite error loop
                                    if (target.dataset.errorHandled === 'true') return;
                                    target.dataset.errorHandled = 'true';
                                    target.style.display = 'none';
                                  }}
                                />
                              ) : (
                                <div className="text-gray-500 text-xs text-center px-2">Click to search for icon</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Image Search Panel */}
                      {showImageSearch && showImageSearch.gameId === selectedGame.id && (
                        <div className="border-t border-gray-800 pt-6">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Search for {showImageSearch.type}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={imageSearchQuery}
                          onChange={(e) => setImageSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSearchImages(showImageSearch.type);
                            }
                          }}
                          placeholder="Enter game title..."
                          className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500"
                          disabled={isSearchingImages}
                        />
                        <button
                          onClick={() => handleSearchImages(showImageSearch.type)}
                          disabled={isSearchingImages}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {isSearchingImages ? (
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
                        <button
                          onClick={() => handleBrowseImage(showImageSearch.type)}
                          disabled={isSearchingImages}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
                          title="Browse for image file (supports animated images)"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          Browse
                        </button>
                        <button
                          onClick={() => {
                            setShowImageSearch(null);
                            setImageSearchResults([]);
                            setSteamGridDBResults({ boxart: [], banner: [], logo: [], icon: [] });
                          }}
                          className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                          disabled={isSearchingImages}
                        >
                          Close
                        </button>
                      </div>
                      {isSearchingImages && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Searching for {showImageSearch.type}...
                        </div>
                      )}
                    </div>

                          {/* Search Results */}
                          {(imageSearchResults.length > 0 || 
                            (showImageSearch.type === 'boxart' && steamGridDBResults.boxart.length > 0) ||
                            (showImageSearch.type === 'banner' && steamGridDBResults.banner.length > 0) ||
                            (showImageSearch.type === 'logo' && steamGridDBResults.logo.length > 0) ||
                            (showImageSearch.type === 'icon' && steamGridDBResults.icon.length > 0)) && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-300 mb-3">Results</h4>
                              <div className={`grid gap-3 ${showImageSearch.type === 'boxart' ? 'grid-cols-10' : 'grid-cols-4'}`}>
                                {/* IGDB Results - Only show for boxart and banner */}
                                {showImageSearch.type !== 'logo' && imageSearchResults.map((result, idx) => {
                                  let imageUrl = '';
                                  if (showImageSearch.type === 'boxart') {
                                    imageUrl = result.coverUrl || '';
                                  } else if (showImageSearch.type === 'banner') {
                                    imageUrl = result.screenshotUrls?.[0] || '';
                                  }

                                  if (!imageUrl) return null;

                                  return (
                                    <div
                                      key={`igdb-${result.id}-${idx}`}
                                      onClick={() => handleSelectImage(imageUrl, showImageSearch.type)}
                                      className="cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                      <img
                                        src={imageUrl}
                                        alt={result.name}
                                        className={`w-full ${showImageSearch.type === 'boxart' ? 'aspect-[2/3] object-cover' : 'h-20 object-cover'} rounded border border-gray-700`}
                                      />
                                      <p className="text-xs text-gray-400 mt-1 truncate">{result.name}</p>
                                    </div>
                                  );
                                })}

                                {/* SteamGridDB Results - Filtered by type */}
                                {showImageSearch.type === 'boxart' && steamGridDBResults.boxart.map((result: any, idx: number) => {
                                  const imageUrl = result.boxArtUrl || result.coverUrl;
                                  if (!imageUrl) return null;

                                  // Use imageUrl in key to ensure uniqueness since multiple images can have same gameId
                                  const uniqueKey = `sgdb-boxart-${imageUrl}-${idx}`;

                                  return (
                                    <div
                                      key={uniqueKey}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectImage(imageUrl, 'boxart');
                                      }}
                                      className="cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                      <img
                                        src={imageUrl}
                                        alt={result.name}
                                        className="w-full aspect-[2/3] object-cover rounded border border-gray-700 bg-gray-800"
                                      />
                                      <p className="text-xs text-gray-400 mt-1 truncate">{result.name}</p>
                                    </div>
                                  );
                                })}

                                {showImageSearch.type === 'banner' && steamGridDBResults.banner.map((result: any, idx: number) => {
                                  const imageUrl = result.bannerUrl;
                                  if (!imageUrl) return null;

                                  // Use imageUrl in key to ensure uniqueness since multiple images can have same gameId
                                  const uniqueKey = `sgdb-banner-${imageUrl}-${idx}`;

                                  return (
                                    <div
                                      key={uniqueKey}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectImage(imageUrl, 'banner');
                                      }}
                                      className="cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                      <img
                                        src={imageUrl}
                                        alt={result.name}
                                        className="w-full h-20 object-cover rounded border border-gray-700 bg-gray-800"
                                      />
                                      <p className="text-xs text-gray-400 mt-1 truncate">{result.name}</p>
                                    </div>
                                  );
                                })}

                                {showImageSearch.type === 'logo' && steamGridDBResults.logo.map((result: any, idx: number) => {
                                  const imageUrl = result.logoUrl;
                                  if (!imageUrl) return null;

                                  // Use imageUrl in key to ensure uniqueness since multiple logos can have same gameId
                                  const uniqueKey = `sgdb-logo-${imageUrl}-${idx}`;

                                  return (
                                    <div
                                      key={uniqueKey}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectImage(imageUrl, 'logo');
                                      }}
                                      className="cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                      <img
                                        src={imageUrl}
                                        alt={result.name}
                                        className="w-full h-16 object-contain rounded border border-gray-700 bg-gray-800"
                                      />
                                      <p className="text-xs text-gray-400 mt-1 truncate">{result.name}</p>
                                    </div>
                                  );
                                })}

                                {showImageSearch.type === 'icon' && steamGridDBResults.icon.map((result: any, idx: number) => {
                                  const imageUrl = result.iconUrl;
                                  if (!imageUrl) return null;

                                  // Use imageUrl in key to ensure uniqueness since multiple icons can have same gameId
                                  const uniqueKey = `sgdb-icon-${imageUrl}-${idx}`;

                                  return (
                                    <div
                                      key={uniqueKey}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectImage(imageUrl, 'icon');
                                      }}
                                      className="cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                      <img
                                        src={imageUrl}
                                        alt={result.name}
                                        className="w-full h-16 object-contain rounded border border-gray-700 bg-gray-800"
                                      />
                                      <p className="text-xs text-gray-400 mt-1 truncate">{result.name}</p>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {activeTab === 'metadata' && (
                    <div className="p-4">
                      <div className="space-y-4">
                        {/* Steam App ID */}
                        <div>
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
                              placeholder="Enter Steam App ID or search by game name"
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
                          <p className="mt-1 text-xs text-gray-500">
                            Steam App ID is used as the primary source for all images and text metadata. Use the "Fix Match" button below to search for games and automatically set the App ID.
                          </p>
                        </div>

                        {/* Title Row with Fix Match */}
                        <div>
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
                                        
                                        // Debug: Log first result to check for boxArtUrl
                                        if (steamResults.length > 0) {
                                          console.log('First Steam result (Fix Match button):', steamResults[0]);
                                          console.log('Has boxArtUrl:', !!(steamResults[0] as any).boxArtUrl);
                                        }
                                        
                                        // Sort results: newest release first, then exact matches
                                        const normalizedQuery = query.toLowerCase().trim();
                                        const sortedResults = steamResults.sort((a: any, b: any) => {
                                          // First, sort by release date (newest first)
                                          const getDate = (result: any): number => {
                                            if (result.releaseDate) {
                                              if (typeof result.releaseDate === 'number') {
                                                return result.releaseDate * 1000; // Convert Unix timestamp (seconds) to milliseconds
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
                                              <span className="text-xs text-gray-400">ÔÇó {displayDate}</span>
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

                        {/* Description - moved below Fix Match results */}
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                          <textarea
                            value={editedGame.description || ''}
                            onChange={(e) => setEditedGame({ ...editedGame, description: e.target.value })}
                            className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                            rows={3}
                          />
                        </div>

                        {/* Platform - only if filled */}
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

                        {/* Metadata Rows - only show if any field in row has value */}
                        {((editedGame.releaseDate) || (editedGame.ageRating) || (editedGame.series)) && (
                          <div className="grid grid-cols-3 gap-3">
                            {editedGame.releaseDate && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Release Date</label>
                                <input
                                  type="text"
                                  value={editedGame.releaseDate}
                                  onChange={(e) => setEditedGame({ ...editedGame, releaseDate: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                            {editedGame.ageRating && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Age Rating</label>
                                <input
                                  type="text"
                                  value={editedGame.ageRating}
                                  onChange={(e) => setEditedGame({ ...editedGame, ageRating: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                            {editedGame.series && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Series</label>
                                <input
                                  type="text"
                                  value={editedGame.series}
                                  onChange={(e) => setEditedGame({ ...editedGame, series: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Genres, Developers, Publishers - only if filled */}
                        {((editedGame.genres && editedGame.genres.length > 0) || (editedGame.developers && editedGame.developers.length > 0) || (editedGame.publishers && editedGame.publishers.length > 0)) && (
                          <div className="grid grid-cols-3 gap-3">
                            {editedGame.genres && editedGame.genres.length > 0 && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Genres</label>
                                <input
                                  type="text"
                                  value={editedGame.genres.join(', ')}
                                  onChange={(e) => setEditedGame({ ...editedGame, genres: e.target.value.split(',').map(g => g.trim()).filter(g => g) })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                            {editedGame.developers && editedGame.developers.length > 0 && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Developers</label>
                                <input
                                  type="text"
                                  value={editedGame.developers.join(', ')}
                                  onChange={(e) => setEditedGame({ ...editedGame, developers: e.target.value.split(',').map(d => d.trim()).filter(d => d) })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                            {editedGame.publishers && editedGame.publishers.length > 0 && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Publishers</label>
                                <input
                                  type="text"
                                  value={editedGame.publishers.join(', ')}
                                  onChange={(e) => setEditedGame({ ...editedGame, publishers: e.target.value.split(',').map(p => p.trim()).filter(p => p) })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Categories, Tags, Region - only if filled */}
                        {((editedGame.categories && editedGame.categories.length > 0) || (editedGame.tags && editedGame.tags.length > 0) || editedGame.region) && (
                          <div className="grid grid-cols-3 gap-3">
                            {editedGame.categories && editedGame.categories.length > 0 && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Categories</label>
                                <input
                                  type="text"
                                  value={editedGame.categories.join(', ')}
                                  onChange={(e) => setEditedGame({ ...editedGame, categories: e.target.value.split(',').map(c => c.trim()).filter(c => c) })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                            {editedGame.tags && editedGame.tags.length > 0 && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Tags</label>
                                <input
                                  type="text"
                                  value={editedGame.tags.join(', ')}
                                  onChange={(e) => setEditedGame({ ...editedGame, tags: e.target.value.split(',').map(t => t.trim()).filter(t => t) })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                            {editedGame.region && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Region</label>
                                <input
                                  type="text"
                                  value={editedGame.region}
                                  onChange={(e) => setEditedGame({ ...editedGame, region: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Scores - only if any score exists */}
                        {((editedGame.userScore !== undefined && editedGame.userScore !== null) || (editedGame.criticScore !== undefined && editedGame.criticScore !== null) || (editedGame.communityScore !== undefined && editedGame.communityScore !== null)) && (
                          <div className="grid grid-cols-3 gap-3">
                            {editedGame.userScore !== undefined && editedGame.userScore !== null && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">User Score</label>
                                <input
                                  type="number"
                                  value={editedGame.userScore}
                                  onChange={(e) => setEditedGame({ ...editedGame, userScore: e.target.value ? Number(e.target.value) : undefined })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                            {editedGame.criticScore !== undefined && editedGame.criticScore !== null && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Critic Score</label>
                                <input
                                  type="number"
                                  value={editedGame.criticScore}
                                  onChange={(e) => setEditedGame({ ...editedGame, criticScore: e.target.value ? Number(e.target.value) : undefined })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                            {editedGame.communityScore !== undefined && editedGame.communityScore !== null && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Community Score</label>
                                <input
                                  type="number"
                                  value={editedGame.communityScore}
                                  onChange={(e) => setEditedGame({ ...editedGame, communityScore: e.target.value ? Number(e.target.value) : undefined })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Game Info - only if filled */}
                        {(editedGame.installationDirectory || editedGame.exePath || editedGame.installSize) && (
                          <div className="grid grid-cols-3 gap-3">
                            {editedGame.installationDirectory && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Install Directory</label>
                                <input
                                  type="text"
                                  value={editedGame.installationDirectory}
                                  onChange={(e) => setEditedGame({ ...editedGame, installationDirectory: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                            {editedGame.exePath && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Executable Path</label>
                                <input
                                  type="text"
                                  value={editedGame.exePath}
                                  onChange={(e) => setEditedGame({ ...editedGame, exePath: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                            {editedGame.installSize && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Install Size</label>
                                <input
                                  type="text"
                                  value={`${Math.round(editedGame.installSize / 1024 / 1024 / 1024 * 100) / 100} GB`}
                                  readOnly
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800/50 border border-gray-600 rounded text-gray-400"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Last Played and Play Count - only if filled */}
                        {(editedGame.lastPlayed || (editedGame.playCount !== undefined && editedGame.playCount !== null)) && (
                          <div className="grid grid-cols-2 gap-3">
                            {editedGame.lastPlayed && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Last Played</label>
                                <input
                                  type="text"
                                  value={editedGame.lastPlayed}
                                  readOnly
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800/50 border border-gray-600 rounded text-gray-400"
                                />
                              </div>
                            )}
                            {editedGame.playCount !== undefined && editedGame.playCount !== null && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Play Count</label>
                                <input
                                  type="number"
                                  value={editedGame.playCount}
                                  onChange={(e) => setEditedGame({ ...editedGame, playCount: e.target.value ? Number(e.target.value) : undefined })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Additional Fields - only if filled */}
                        {(editedGame.completionStatus || editedGame.source) && (
                          <div className="grid grid-cols-2 gap-3">
                            {editedGame.completionStatus && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Completion Status</label>
                                <input
                                  type="text"
                                  value={editedGame.completionStatus}
                                  onChange={(e) => setEditedGame({ ...editedGame, completionStatus: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                            {editedGame.source && (
                              <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Source</label>
                                <input
                                  type="text"
                                  value={editedGame.source}
                                  onChange={(e) => setEditedGame({ ...editedGame, source: e.target.value })}
                                  className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Notes - only if filled */}
                        {editedGame.notes && (
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Notes</label>
                            <textarea
                              value={editedGame.notes}
                              onChange={(e) => setEditedGame({ ...editedGame, notes: e.target.value })}
                              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                              rows={2}
                            />
                          </div>
                        )}

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
      {refreshProgress && (
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
                  Ô£ô Refresh completed!
                </div>
              </div>
            )}
          </div>
        </div>
      )}

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
    </div>
  );
};


