import React, { useState, useEffect, useRef } from 'react';
import { Game } from '../types/game';
import { GameMetadata } from '../types/game';
import { SteamGameMetadataEditor } from './SteamGameMetadataEditor';

interface SteamGame {
  appId: string;
  name: string;
  installDir: string;
  libraryPath: string;
}

interface XboxGame {
  id: string;
  name: string;
  installPath: string;
  type: 'uwp' | 'pc';
}

interface OtherGame {
  id: string;
  name: string;
  installPath?: string;
  exePath?: string;
  type?: string;
}

type ScannedGame = SteamGame | XboxGame | OtherGame;

interface SteamImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (games: Game[], scannedGames: ScannedGame[], selectedGameIds: Set<string>) => Promise<void>;
  preScannedGames?: ScannedGame[]; // Optional: games already scanned
  appType?: 'steam' | 'xbox' | 'other'; // Type of app being imported
  existingLibrary?: Game[]; // Optional: existing library games to preserve metadata
}

// Helper to check if a game is a Steam game
const isSteamGame = (game: ScannedGame): game is SteamGame => {
  return 'appId' in game;
};

// Helper to get game ID (works for Steam, Xbox, and Other)
const getGameId = (game: ScannedGame): string => {
  if (isSteamGame(game)) {
    return game.appId;
  } else if ('installPath' in game && 'type' in game && (game.type === 'uwp' || game.type === 'pc')) {
    // Xbox game
    return game.id;
  } else {
    // Other game
    return game.id;
  }
};

// Helper to get game name
const getGameName = (game: ScannedGame): string => {
  return game.name;
};

// Helper to get a better search name for "other" games by extracting from path
const getSearchNameForOtherGame = (game: OtherGame): string => {
  // Try to extract a better name from the path
  const path = game.exePath || game.installPath || '';
  if (path) {
    // Extract parent directory name (often the game name)
    const pathParts = path.split(/[/\\]/);
    // Look for common game directory patterns, starting from the executable's parent
    // Skip the executable itself and look at parent directories
    for (let i = pathParts.length - 2; i >= 0; i--) {
      const part = pathParts[i];
      // Skip common non-game directories and installer/utility folders
      if (part && 
          !part.match(/^(Program Files|Program Files \(x86\)|Games|Steam|Epic|EA|GOG|Ubisoft|Battle\.net|__Installer|_Installer|Installer|SP|MP|Bin|Binaries|Win64|Win32|Common|Redist|Redistributables)$/i) &&
          !part.match(/^(setup|install|uninstall|cleanup|touchup|repair|config|launcher|updater)$/i) &&
          part.length > 2) {
        // Clean up the name - remove common suffixes
        const cleaned = part.replace(/[_\s]*(trial|demo|beta|alpha|test)[_\s]*$/i, '').trim();
        return cleaned || part;
      }
    }
  }
  // Fallback to the executable name without extension, but clean it up
  const name = game.name.replace(/[_\s]*(trial|demo|beta|alpha|test|\.exe)[_\s]*$/i, '').trim();
  return name || game.name;
};

export const SteamImportModal: React.FC<SteamImportModalProps> = ({ isOpen, onClose, onImport, preScannedGames, appType = 'steam', existingLibrary }) => {
  const [scannedGames, setScannedGames] = useState<ScannedGame[]>([]);
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());
  const [gameMetadata, setGameMetadata] = useState<Map<string, GameMetadata>>(new Map());
  const [isScanning, setIsScanning] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [editingGame, setEditingGame] = useState<ScannedGame | null>(null);
  // Persist selection state across modal opens
  const [persistedSelections, setPersistedSelections] = useState<Set<string>>(new Set());
  // Track all previously seen games (to distinguish new vs existing, even if unchecked)
  const [previouslySeenGames, setPreviouslySeenGames] = useState<Set<string>>(new Set());
  // Track if we've already initialized selections for the current games to prevent resetting on re-renders
  const initializedGamesRef = useRef<string>('');

  useEffect(() => {
    if (isOpen) {
      try {
        if (preScannedGames && preScannedGames.length > 0) {
          // Create a unique key for the current set of games
          const gamesKey = preScannedGames.map(g => getGameId(g)).sort().join(',');
          
          // Only initialize if this is a new set of games
          const needsInitialization = initializedGamesRef.current !== gamesKey;
          
          // Use pre-scanned games
          setScannedGames(preScannedGames);
        
        // Determine which games are new vs existing
        const allGameIds = new Set(preScannedGames.map(g => getGameId(g)));
        const existingGameIds = new Set<string>();
        if (existingLibrary) {
          preScannedGames.forEach(scannedGame => {
            const gameId = getGameId(scannedGame);
            let libraryId: string;
            if (isSteamGame(scannedGame)) {
              libraryId = `steam-${scannedGame.appId}`;
            } else {
              libraryId = scannedGame.id;
            }
            
            const existingGame = existingLibrary.find(g => g.id === libraryId);
            if (existingGame) {
              existingGameIds.add(gameId);
            }
          });
        }
        
        // A game is "newly found" if:
        // 1. It's not in the existing library AND
        // 2. It wasn't seen in a previous scan (not in previouslySeenGames)
        // A game is "existing" if:
        // 1. It's in the existing library OR
        // 2. It was seen in a previous scan (even if unchecked)
        const newGameIds = new Set(
          Array.from(allGameIds).filter(id => 
            !existingGameIds.has(id) && !previouslySeenGames.has(id)
          )
        );
        
        // Update previously seen games to include all current games
        setPreviouslySeenGames(prev => {
          const updated = new Set(prev);
          allGameIds.forEach(id => updated.add(id));
          return updated;
        });
        
        // Restore selections: only select games that were previously selected OR are newly found
        // Don't auto-select games that were previously unchecked
        const restoredSelections = new Set<string>();
        
        if (persistedSelections.size > 0) {
          // Restore previous selections for games that still exist
          // Only restore games that were previously selected (preserve unchecked state)
          Array.from(persistedSelections).forEach(id => {
            if (allGameIds.has(id)) {
              restoredSelections.add(id);
            }
          });
        }
        
        // Add new games (they should be selected by default)
        newGameIds.forEach(id => restoredSelections.add(id));
        
        // For existing games in library that weren't in persistedSelections, don't select them
        // (they were previously unchecked)
        // Only update selections if we're initializing for the first time
        if (needsInitialization) {
          setSelectedGames(restoredSelections);
          initializedGamesRef.current = gamesKey;
        }
        
        // Load existing metadata from library if available
        // Only update metadata if we're initializing, to avoid overwriting user changes
        const metadataMap = new Map<string, GameMetadata>();
        if (needsInitialization) {
          if (existingLibrary) {
            preScannedGames.forEach(scannedGame => {
              const gameId = getGameId(scannedGame);
              let libraryId: string;
              if (isSteamGame(scannedGame)) {
                libraryId = `steam-${scannedGame.appId}`;
              } else {
                libraryId = scannedGame.id;
              }
              
              const existingGame = existingLibrary.find(g => g.id === libraryId);
              if (existingGame && (existingGame.boxArtUrl || existingGame.bannerUrl)) {
                metadataMap.set(gameId, {
                  boxArtUrl: existingGame.boxArtUrl || '',
                  bannerUrl: existingGame.bannerUrl || '',
                });
              }
            });
          }
          setGameMetadata(metadataMap);
        } else {
          // If not initializing, merge with existing metadata to preserve user changes
          setGameMetadata(prev => {
            const newMap = new Map(prev);
            if (existingLibrary) {
              preScannedGames.forEach(scannedGame => {
                const gameId = getGameId(scannedGame);
                let libraryId: string;
                if (isSteamGame(scannedGame)) {
                  libraryId = `steam-${scannedGame.appId}`;
                } else {
                  libraryId = scannedGame.id;
                }
                
                const existingGame = existingLibrary.find(g => g.id === libraryId);
                // Only add if we don't already have metadata for this game
                if (existingGame && (existingGame.boxArtUrl || existingGame.bannerUrl) && !newMap.has(gameId)) {
                  newMap.set(gameId, {
                    boxArtUrl: existingGame.boxArtUrl || '',
                    bannerUrl: existingGame.bannerUrl || '',
                  });
                }
              });
            }
            return newMap;
          });
        }
        
        // Fetch metadata for games that don't have images (Steam and Xbox)
        // Use current metadata state for checking what exists
        const currentMetadata = needsInitialization ? metadataMap : gameMetadata;
        if (appType === 'steam') {
          const steamGames = preScannedGames.filter(isSteamGame);
          fetchMetadataForAll(steamGames, currentMetadata);
        } else if (appType === 'xbox') {
          // Fetch metadata for Xbox games that don't have images
          const xboxGames = preScannedGames.filter((g): g is XboxGame => !isSteamGame(g) && 'installPath' in g && 'type' in g && (g.type === 'uwp' || g.type === 'pc'));
          fetchMetadataForXboxGames(xboxGames, currentMetadata);
        } else if (appType === 'other') {
          // Fetch metadata for other launcher games
          const otherGames = preScannedGames.filter((g): g is OtherGame => !isSteamGame(g) && !('installPath' in g && 'type' in g && (g.type === 'uwp' || g.type === 'pc')));
          // Fetch metadata for all other games in parallel
          Promise.all(otherGames.map(game => fetchMetadataForXboxGame(game as any, currentMetadata))).catch(err => {
            console.error('Error fetching metadata for other games:', err);
          });
        }
        } else {
          // Scan now
          handleScan();
        }
      } catch (err) {
        console.error('Error in SteamImportModal useEffect:', err);
        setError(err instanceof Error ? err.message : 'An error occurred while loading games');
      }
    } else {
      // Save current selections when modal closes (including unchecked state)
      // Save all games that were selected, so unchecked games remain unchecked
      setPersistedSelections(new Set(selectedGames));
      // Reset initialization tracking when modal closes
      initializedGamesRef.current = '';
      // Don't reset games/metadata when closing, just clear error
      setError(null);
      setEditingGame(null);
    }
    // Note: We intentionally don't include persistedSelections and previouslySeenGames in deps
    // to avoid resetting selections when they update. They're only used for initial restoration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, preScannedGames, appType, existingLibrary]);

  const handleScan = async () => {
    setIsScanning(true);
    setError(null);
    setScannedGames([]);
    setSelectedGames(new Set());
    
    // Load existing metadata from library if available
    const metadataMap = new Map<string, GameMetadata>();
    setGameMetadata(metadataMap);

    try {
      if (appType === 'steam') {
        const games = await window.electronAPI.scanSteamGames();
        setScannedGames(games);
        
        // Load existing metadata for scanned games
        if (existingLibrary) {
          games.forEach(game => {
            const gameId = getGameId(game);
            const libraryId = `steam-${game.appId}`;
            const existingGame = existingLibrary.find(g => g.id === libraryId);
            if (existingGame && (existingGame.boxArtUrl || existingGame.bannerUrl)) {
              metadataMap.set(gameId, {
                boxArtUrl: existingGame.boxArtUrl || '',
                bannerUrl: existingGame.bannerUrl || '',
              });
            }
          });
          setGameMetadata(new Map(metadataMap));
        }
        
        // Auto-select all games
        const allGameIds = new Set(games.map(g => getGameId(g)));
        setSelectedGames(allGameIds);
        
        // Auto-fetch metadata for all games (will skip if already exists)
        await fetchMetadataForAll(games, metadataMap);
      } else if (appType === 'xbox') {
        // For Xbox, games should be provided via preScannedGames
        setError('No games provided. Please scan first.');
      } else {
        // For other app types, scanning should be done before opening modal
        setError('No games provided. Please scan first.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan games');
      console.error('Error scanning games:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const fetchMetadataForAll = async (games: SteamGame[], existingMetadata?: Map<string, GameMetadata>) => {
    for (const game of games) {
      await fetchMetadataForGame(game, existingMetadata);
    }
  };

  const fetchMetadataForGame = async (game: SteamGame, existingMetadata?: Map<string, GameMetadata>) => {
    const gameId = getGameId(game);
    
    // Skip if we already have metadata from the library
    if (existingMetadata && existingMetadata.has(gameId)) {
      const existing = existingMetadata.get(gameId)!;
      // Only auto-fetch if there's no image and it hasn't been selected before
      if (existing.boxArtUrl || existing.bannerUrl) {
        return; // Already has artwork, don't overwrite
      }
    }
    
    // Also check current metadata state to avoid duplicate fetches
    const currentMetadataCheck = gameMetadata.get(gameId);
    if (currentMetadataCheck && (currentMetadataCheck.boxArtUrl || currentMetadataCheck.bannerUrl)) {
      return; // Already has metadata, don't fetch again
    }
    
    setIsFetchingMetadata(prev => new Set(prev).add(gameId));
    
    try {
      const metadata = await window.electronAPI.searchArtwork(game.name, game.appId);
      if (metadata) {
        // Check if we should auto-apply the top result
        const currentMetadata = existingMetadata?.get(gameId) || gameMetadata.get(gameId);
        const hasNoImage = !currentMetadata?.boxArtUrl && !currentMetadata?.bannerUrl;
        
        if (hasNoImage && metadata.boxArtUrl) {
          // Auto-apply the top result if no image exists
          setGameMetadata(prev => {
            const newMap = new Map(prev);
            newMap.set(gameId, metadata);
            return newMap;
          });
        } else if (!existingMetadata?.has(gameId)) {
          // Store metadata but don't auto-apply if user previously selected something
          setGameMetadata(prev => {
            const newMap = new Map(prev);
            // Only update if we don't already have metadata
            if (!newMap.has(gameId)) {
              newMap.set(gameId, metadata);
            }
            return newMap;
          });
        }
      }
    } catch (err) {
      console.error(`Error fetching metadata for ${game.name}:`, err);
    } finally {
      setIsFetchingMetadata(prev => {
        const newSet = new Set(prev);
        newSet.delete(gameId);
        return newSet;
      });
    }
  };

  const fetchMetadataForXboxGames = async (games: XboxGame[], existingMetadata?: Map<string, GameMetadata>) => {
    for (const game of games) {
      await fetchMetadataForXboxGame(game, existingMetadata);
    }
  };

  const fetchMetadataForXboxGame = async (game: XboxGame | OtherGame, existingMetadata?: Map<string, GameMetadata>) => {
    const gameId = getGameId(game);
    
    // Skip if we already have metadata from the library
    if (existingMetadata && existingMetadata.has(gameId)) {
      const existing = existingMetadata.get(gameId)!;
      // Only auto-fetch if there's no image and it hasn't been selected before
      if (existing.boxArtUrl || existing.bannerUrl) {
        return; // Already has artwork, don't overwrite
      }
    }
    
    // Also check current metadata state to avoid duplicate fetches
    const currentMetadata = gameMetadata.get(gameId);
    if (currentMetadata && (currentMetadata.boxArtUrl || currentMetadata.bannerUrl)) {
      return; // Already has metadata, don't fetch again
    }
    
    setIsFetchingMetadata(prev => new Set(prev).add(gameId));
    
    try {
      // For "other" games, use a better search name extracted from path
      const searchName = ('type' in game && (game.type === 'uwp' || game.type === 'pc')) 
        ? game.name 
        : getSearchNameForOtherGame(game as OtherGame);
      
      const gamePath = (game as OtherGame).exePath || (game as OtherGame).installPath || 'N/A';
      console.log(`[Metadata] Fetching for gameId: ${gameId}, searchName: "${searchName}", gameName: "${game.name}", path: ${gamePath}`);
      
      // Search for metadata using game name
      const response = await window.electronAPI.searchMetadata(searchName);
      if (response.success && response.results && response.results.length > 0) {
        const topResult = response.results[0];
        const metadata: GameMetadata = {
          boxArtUrl: topResult.coverUrl || '',
          bannerUrl: topResult.screenshotUrls && topResult.screenshotUrls.length > 0 
            ? topResult.screenshotUrls[0] 
            : topResult.coverUrl || '',
        };
        
        // Check if we should auto-apply the top result
        const currentMetadata = existingMetadata?.get(gameId) || gameMetadata.get(gameId);
        const hasNoImage = !currentMetadata?.boxArtUrl && !currentMetadata?.bannerUrl;
        
        if (hasNoImage && metadata.boxArtUrl) {
          // Auto-apply the top result if no image exists
          console.log(`[Metadata] Setting metadata for gameId: ${gameId}, found game: "${topResult.name || searchName}"`);
          setGameMetadata(prev => {
            const newMap = new Map(prev);
            // Ensure we're setting it with the correct gameId - this is critical!
            newMap.set(gameId, metadata);
            console.log(`[Metadata] Updated map. gameId: ${gameId}, has metadata: ${newMap.has(gameId)}`);
            return newMap;
          });
        } else if (!existingMetadata?.has(gameId)) {
          // Store metadata but don't auto-apply if user previously selected something
          console.log(`[Metadata] Storing (not auto-applying) metadata for gameId: ${gameId}`);
          setGameMetadata(prev => {
            const newMap = new Map(prev);
            // Only update if we don't already have metadata for THIS specific gameId
            if (!newMap.has(gameId)) {
              newMap.set(gameId, metadata);
              console.log(`[Metadata] Stored metadata for gameId: ${gameId}`);
            } else {
              console.log(`[Metadata] Skipped storing - already exists for gameId: ${gameId}`);
            }
            return newMap;
          });
        }
      } else {
        console.log(`[Metadata] No results found for gameId: ${gameId}, searchName: "${searchName}"`);
      }
    } catch (err) {
      console.error(`Error fetching metadata for ${game.name} (gameId: ${gameId}):`, err);
    } finally {
      setIsFetchingMetadata(prev => {
        const newSet = new Set(prev);
        newSet.delete(gameId);
        return newSet;
      });
    }
  };

  const toggleGameSelection = (gameId: string) => {
    console.log(`[Selection] Toggling gameId: ${gameId}`);
    setSelectedGames(prev => {
      const newSet = new Set(prev);
      const wasSelected = newSet.has(gameId);
      if (wasSelected) {
        newSet.delete(gameId);
        console.log(`[Selection] Deselected gameId: ${gameId}. New selection count: ${newSet.size}`);
      } else {
        newSet.add(gameId);
        console.log(`[Selection] Selected gameId: ${gameId}. New selection count: ${newSet.size}`);
      }
      // Update persisted selections
      setPersistedSelections(new Set(newSet));
      console.log(`[Selection] Current selected games:`, Array.from(newSet));
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedGames.size === scannedGames.length) {
      const newSet = new Set<string>();
      setSelectedGames(newSet);
      setPersistedSelections(newSet);
    } else {
      const allGameIds = new Set(scannedGames.map(g => getGameId(g)));
      setSelectedGames(allGameIds);
      setPersistedSelections(allGameIds);
    }
  };

  const handleImport = async () => {
    if (selectedGames.size === 0) {
      setError('Please select at least one game to import');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const gamesToImport: Game[] = await Promise.all(
        scannedGames
          .filter(game => selectedGames.has(getGameId(game)))
          .map(async (game) => {
            const gameId = getGameId(game);
            let libraryId: string;
            if (isSteamGame(game)) {
              libraryId = `steam-${game.appId}`;
            } else if ('installPath' in game && 'type' in game && (game.type === 'uwp' || game.type === 'pc')) {
              // Xbox game
              libraryId = game.id;
            } else {
              // Other game
              libraryId = game.id;
            }
            
            // Check if game exists in library to preserve existing metadata
            const existingGame = existingLibrary?.find(g => g.id === libraryId);
            const metadata = gameMetadata.get(gameId);
            
            // Preserve existing metadata if available, otherwise use new metadata or defaults
            let boxArtUrl = existingGame?.boxArtUrl || metadata?.boxArtUrl || '';
            let bannerUrl = existingGame?.bannerUrl || metadata?.bannerUrl || '';
            
            // Check if any metadata is missing (not just images)
            // Fetch from IGDB if game doesn't exist OR if any metadata fields are missing
            const hasMissingMetadata = !existingGame || 
                                      !existingGame.description ||
                                      !existingGame.releaseDate ||
                                      !existingGame.genres?.length ||
                                      !existingGame.ageRating ||
                                      !existingGame.categories?.length ||
                                      !boxArtUrl || 
                                      !bannerUrl;
            
            // If metadata is missing, try to fetch from IGDB
            let igdbMetadata: { summary?: string; coverUrl?: string; screenshotUrls?: string[]; releaseDate?: number; genres?: string[]; ageRating?: string; categories?: string[] } | null = null;
            
            if (hasMissingMetadata && !isFetchingMetadata.has(gameId)) {
              try {
                setIsFetchingMetadata(prev => new Set(prev).add(gameId));
                const response = await window.electronAPI.searchMetadata(game.name);
                if (response.success && response.results && response.results.length > 0) {
                  const result = response.results[0];
                  igdbMetadata = {
                    summary: result.summary,
                    coverUrl: result.coverUrl,
                    screenshotUrls: result.screenshotUrls,
                    releaseDate: result.releaseDate,
                    genres: result.genres,
                    ageRating: result.ageRating,
                    categories: result.categories,
                  };
                  
                  // Update images if missing
                  if (!boxArtUrl && result.coverUrl) {
                    boxArtUrl = result.coverUrl;
                  }
                  if (!bannerUrl && result.screenshotUrls && result.screenshotUrls.length > 0) {
                    bannerUrl = result.screenshotUrls[0];
                  } else if (!bannerUrl && result.coverUrl) {
                    bannerUrl = result.coverUrl;
                  }
                }
              } catch (err) {
                console.error(`Error fetching IGDB metadata for ${game.name}:`, err);
              } finally {
                setIsFetchingMetadata(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(gameId);
                  return newSet;
                });
              }
            }
            
            // Format release date from timestamp if available
            const formatReleaseDate = (timestamp?: number): string | undefined => {
              if (!timestamp) return undefined;
              const date = new Date(timestamp * 1000);
              return date.toISOString().split('T')[0];
            };
            
            // Build the game object, preserving existing fields and filling in missing metadata from IGDB
            const baseGame: Game | undefined = existingGame;
            const gameData: Game = {
              ...(baseGame || {}),
              id: libraryId,
              title: game.name,
              platform: isSteamGame(game) ? 'steam' as const : ('installPath' in game && 'type' in game && (game.type === 'uwp' || game.type === 'pc')) ? 'xbox' as const : (game as OtherGame).type || 'other',
              exePath: baseGame?.exePath || (isSteamGame(game) ? '' : ('installPath' in game && game.installPath ? game.installPath : ((game as OtherGame).exePath || ''))),
              // Images: use existing if available, otherwise use IGDB or defaults
              boxArtUrl: baseGame?.boxArtUrl || boxArtUrl || (isSteamGame(game) ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg` : ''),
              bannerUrl: baseGame?.bannerUrl || bannerUrl || (isSteamGame(game) ? `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/library_600x900.jpg` : ''),
              // Description: use existing if available, otherwise use IGDB
              description: baseGame?.description || igdbMetadata?.summary || undefined,
              // Release date: use existing if available, otherwise use IGDB
              releaseDate: baseGame?.releaseDate || formatReleaseDate(igdbMetadata?.releaseDate) || undefined,
              // Genres: use existing if available, otherwise use IGDB
              genres: baseGame?.genres && baseGame.genres.length > 0 ? baseGame.genres : (igdbMetadata?.genres || undefined),
              // Age rating: use existing if available, otherwise use IGDB
              ageRating: baseGame?.ageRating || igdbMetadata?.ageRating || undefined,
              // Categories: use existing if available, otherwise use IGDB
              categories: baseGame?.categories && baseGame.categories.length > 0 ? baseGame.categories : (igdbMetadata?.categories || undefined),
            };
            
            return gameData;
          })
      );

      await onImport(gamesToImport, scannedGames, selectedGames);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import games');
      console.error('Error importing games:', err);
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-[90vw] mx-4 my-8 border border-gray-700 max-h-[85vh] flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">
                Import {appType === 'steam' ? 'Steam' : appType === 'xbox' ? 'Xbox Game Pass' : ''} Games
              </h2>
              <p className="text-gray-400 mt-1">
                {scannedGames.length > 0 
                  ? `Found ${scannedGames.length} games • ${selectedGames.size} selected`
                  : `Scanning for ${appType === 'steam' ? 'Steam' : appType === 'xbox' ? 'Xbox Game Pass' : ''} games...`}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isScanning ? 'Scanning...' : 'Rescan'}
              </button>
              <button
                onClick={onClose}
                disabled={isImporting}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isScanning ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <svg className="animate-spin h-12 w-12 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-gray-300">Scanning for Steam games...</p>
              </div>
            </div>
          ) : scannedGames.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-300">No games found.</p>
              <p className="text-gray-400 text-sm mt-2">
                {appType === 'steam' 
                  ? 'Make sure Steam is installed and you have games installed.'
                  : appType === 'xbox'
                  ? 'Make sure Xbox Game Pass is installed and you have games installed.'
                  : 'No games found.'}
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={toggleSelectAll}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {selectedGames.size === scannedGames.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Separate new games from existing games */}
              {(() => {
                // Determine which games are new vs existing
                // A game is "existing" if it's in the library OR was previously seen
                const existingGameIds = new Set<string>();
                if (existingLibrary) {
                  scannedGames.forEach(scannedGame => {
                    const gameId = getGameId(scannedGame);
                    let libraryId: string;
                    if (isSteamGame(scannedGame)) {
                      libraryId = `steam-${scannedGame.appId}`;
                    } else {
                      libraryId = scannedGame.id;
                    }
                    
                    const existingGame = existingLibrary.find(g => g.id === libraryId);
                    if (existingGame) {
                      existingGameIds.add(gameId);
                    }
                  });
                }
                
                // Also include games that were previously seen (even if unchecked)
                previouslySeenGames.forEach(gameId => {
                  if (scannedGames.some(g => getGameId(g) === gameId)) {
                    existingGameIds.add(gameId);
                  }
                });
                
                const newGames = scannedGames.filter(game => !existingGameIds.has(getGameId(game)));
                const existingGames = scannedGames.filter(game => existingGameIds.has(getGameId(game)));
                
                return (
                  <>
                    {/* New Games Section */}
                    {newGames.length > 0 && (
                      <div className="mb-6">
                        <h3 className="text-lg font-semibold text-white mb-3">
                          Newly Found Games ({newGames.length})
                        </h3>
                        <div className="space-y-3">
                          {newGames.map((game) => {
                            const gameId = getGameId(game);
                            const gameName = getGameName(game);
                            console.log(`[Render] Rendering game - gameId: ${gameId}, name: "${gameName}", fullId: ${(game as OtherGame).id || 'N/A'}`);
                            let libraryId: string;
                            if (isSteamGame(game)) {
                              libraryId = `steam-${game.appId}`;
                            } else {
                              libraryId = game.id;
                            }
                            const existingGame = existingLibrary?.find(g => g.id === libraryId);
                            const metadata = gameMetadata.get(gameId);
                            const isSelected = selectedGames.has(gameId);
                            const isFetching = isFetchingMetadata.has(gameId);
                            
                            // Determine if this is an Xbox game or other game
                            const isXboxGame = 'installPath' in game && 'type' in game && (game.type === 'uwp' || game.type === 'pc');
                            
                            // Get boxart URL based on game type
                            let boxArtUrl = '';
                            let bannerUrl = '';
                            if (isSteamGame(game)) {
                              boxArtUrl = existingGame?.boxArtUrl || metadata?.boxArtUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`;
                              bannerUrl = existingGame?.bannerUrl || metadata?.bannerUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/library_600x900.jpg`;
                            } else {
                              boxArtUrl = existingGame?.boxArtUrl || metadata?.boxArtUrl || '';
                              bannerUrl = existingGame?.bannerUrl || metadata?.bannerUrl || '';
                            }

                            // Format release date
                            const formatDate = (dateStr?: string) => {
                              if (!dateStr) return null;
                              try {
                                const date = new Date(dateStr);
                                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                              } catch {
                                return dateStr;
                              }
                            };

                            return (
                              <div
                                key={gameId}
                                className={`relative rounded-lg border-2 transition-all flex gap-4 p-4 ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                                }`}
                              >
                                {/* Selection Checkbox */}
                                <div 
                                  className="cursor-pointer flex-shrink-0 self-start pt-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGameSelection(gameId);
                                  }}
                                >
                                  <div
                                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                      isSelected
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'bg-gray-800/80 border-gray-400'
                                    }`}
                                  >
                                    {isSelected && (
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>

                                {/* Box Art - Correct Aspect Ratio (2:3) */}
                                <div className="relative overflow-hidden rounded flex-shrink-0" style={{ width: '120px', height: '180px' }}>
                                  {boxArtUrl ? (
                                    <img
                                      src={boxArtUrl}
                                      alt={gameName}
                                      className="w-full h-full object-cover cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingGame(game);
                                      }}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (bannerUrl) {
                                          target.src = bannerUrl;
                                        } else {
                                          target.style.display = 'none';
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div 
                                      className="w-full h-full bg-gray-700 flex items-center justify-center cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingGame(game);
                                      }}
                                    >
                                      {isFetching ? (
                                        <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                      ) : (
                                        <span className="text-gray-400 text-xs">No Image</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Game Info and Metadata */}
                                <div className="flex-1 min-w-0 flex gap-4">
                                  <div className="flex-1 min-w-0">
                                    <h3 
                                      className="text-white font-semibold text-base cursor-pointer hover:text-blue-400 transition-colors mb-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingGame(game);
                                      }}
                                      title={gameName}
                                    >
                                      {gameName}
                                    </h3>
                                    
                                    {/* Metadata Details */}
                                    <div className="space-y-2 text-sm">
                                      <div className="flex items-center gap-4 flex-wrap">
                                        {existingGame?.releaseDate && (
                                          <div className="flex items-center gap-1 text-gray-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>{formatDate(existingGame.releaseDate)}</span>
                                          </div>
                                        )}
                                        {existingGame?.ageRating && (
                                          <div className="text-gray-400">
                                            <span className="px-2 py-1 bg-gray-600/50 rounded text-xs">{existingGame.ageRating}</span>
                                          </div>
                                        )}
                                        {existingGame?.genres && existingGame.genres.length > 0 && (
                                          <div className="flex items-center gap-1 flex-wrap">
                                            {existingGame.genres.slice(0, 3).map((genre, idx) => (
                                              <span key={idx} className="px-2 py-1 bg-blue-600/20 border border-blue-500/50 rounded text-blue-300 text-xs">
                                                {genre}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Description */}
                                      {existingGame?.description && (
                                        <p className="text-gray-300 text-xs line-clamp-3 leading-relaxed">
                                          {existingGame.description}
                                        </p>
                                      )}
                                      
                                      {/* App ID */}
                                      <p className="text-gray-500 text-xs">
                                        {isSteamGame(game) ? `Steam App ID: ${game.appId}` : isXboxGame ? `ID: ${game.id}` : `Path: ${(game as OtherGame).exePath || (game as OtherGame).installPath || game.id}`}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Banner Preview */}
                                  {bannerUrl && (
                                    <div className="flex-shrink-0 w-48 h-28 rounded overflow-hidden">
                                      <img
                                        src={bannerUrl}
                                        alt={`${gameName} banner`}
                                        className="w-full h-full object-cover cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingGame(game);
                                        }}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    {/* Existing Games Section */}
                    {existingGames.length > 0 && (
                      <div>
                        {newGames.length > 0 && (
                          <h3 className="text-lg font-semibold text-white mb-3">
                            Existing Games ({existingGames.length})
                          </h3>
                        )}
                        <div className="space-y-3">
                          {existingGames.map((game) => {
                            const gameId = getGameId(game);
                            const gameName = getGameName(game);
                            let libraryId: string;
                            if (isSteamGame(game)) {
                              libraryId = `steam-${game.appId}`;
                            } else {
                              libraryId = game.id;
                            }
                            const existingGame = existingLibrary?.find(g => g.id === libraryId);
                            const metadata = gameMetadata.get(gameId);
                            const isSelected = selectedGames.has(gameId);
                            const isFetching = isFetchingMetadata.has(gameId);
                            
                            // Determine if this is an Xbox game or other game
                            const isXboxGame = 'installPath' in game && 'type' in game && (game.type === 'uwp' || game.type === 'pc');
                            
                            // Get boxart URL based on game type
                            let boxArtUrl = '';
                            let bannerUrl = '';
                            if (isSteamGame(game)) {
                              boxArtUrl = existingGame?.boxArtUrl || metadata?.boxArtUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`;
                              bannerUrl = existingGame?.bannerUrl || metadata?.bannerUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/library_600x900.jpg`;
                            } else {
                              boxArtUrl = existingGame?.boxArtUrl || metadata?.boxArtUrl || '';
                              bannerUrl = existingGame?.bannerUrl || metadata?.bannerUrl || '';
                            }

                            // Format release date
                            const formatDate = (dateStr?: string) => {
                              if (!dateStr) return null;
                              try {
                                const date = new Date(dateStr);
                                return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                              } catch {
                                return dateStr;
                              }
                            };

                            return (
                              <div
                                key={gameId}
                                className={`relative rounded-lg border-2 transition-all flex gap-4 p-4 ${
                                  isSelected
                                    ? 'border-blue-500 bg-blue-500/10'
                                    : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                                }`}
                              >
                                {/* Selection Checkbox */}
                                <div 
                                  className="cursor-pointer flex-shrink-0 self-start pt-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGameSelection(gameId);
                                  }}
                                >
                                  <div
                                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${
                                      isSelected
                                        ? 'bg-blue-500 border-blue-500'
                                        : 'bg-gray-800/80 border-gray-400'
                                    }`}
                                  >
                                    {isSelected && (
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>

                                {/* Box Art - Correct Aspect Ratio (2:3) */}
                                <div className="relative overflow-hidden rounded flex-shrink-0" style={{ width: '120px', height: '180px' }}>
                                  {boxArtUrl ? (
                                    <img
                                      src={boxArtUrl}
                                      alt={gameName}
                                      className="w-full h-full object-cover cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingGame(game);
                                      }}
                                      onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (bannerUrl) {
                                          target.src = bannerUrl;
                                        } else {
                                          target.style.display = 'none';
                                        }
                                      }}
                                    />
                                  ) : (
                                    <div 
                                      className="w-full h-full bg-gray-700 flex items-center justify-center cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingGame(game);
                                      }}
                                    >
                                      {isFetching ? (
                                        <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                      ) : (
                                        <span className="text-gray-400 text-xs">No Image</span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Game Info and Metadata */}
                                <div className="flex-1 min-w-0 flex gap-4">
                                  <div className="flex-1 min-w-0">
                                    <h3 
                                      className="text-white font-semibold text-base cursor-pointer hover:text-blue-400 transition-colors mb-2"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingGame(game);
                                      }}
                                      title={gameName}
                                    >
                                      {gameName}
                                    </h3>
                                    
                                    {/* Metadata Details */}
                                    <div className="space-y-2 text-sm">
                                      <div className="flex items-center gap-4 flex-wrap">
                                        {existingGame?.releaseDate && (
                                          <div className="flex items-center gap-1 text-gray-400">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span>{formatDate(existingGame.releaseDate)}</span>
                                          </div>
                                        )}
                                        {existingGame?.ageRating && (
                                          <div className="text-gray-400">
                                            <span className="px-2 py-1 bg-gray-600/50 rounded text-xs">{existingGame.ageRating}</span>
                                          </div>
                                        )}
                                        {existingGame?.genres && existingGame.genres.length > 0 && (
                                          <div className="flex items-center gap-1 flex-wrap">
                                            {existingGame.genres.slice(0, 3).map((genre, idx) => (
                                              <span key={idx} className="px-2 py-1 bg-blue-600/20 border border-blue-500/50 rounded text-blue-300 text-xs">
                                                {genre}
                                              </span>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Description */}
                                      {existingGame?.description && (
                                        <p className="text-gray-300 text-xs line-clamp-3 leading-relaxed">
                                          {existingGame.description}
                                        </p>
                                      )}
                                      
                                      {/* App ID */}
                                      <p className="text-gray-500 text-xs">
                                        {isSteamGame(game) ? `Steam App ID: ${game.appId}` : isXboxGame ? `ID: ${game.id}` : `Path: ${(game as OtherGame).exePath || (game as OtherGame).installPath || game.id}`}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Banner Preview */}
                                  {bannerUrl && (
                                    <div className="flex-shrink-0 w-48 h-28 rounded overflow-hidden">
                                      <img
                                        src={bannerUrl}
                                        alt={`${gameName} banner`}
                                        className="w-full h-full object-cover cursor-pointer"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingGame(game);
                                        }}
                                        onError={(e) => {
                                          const target = e.target as HTMLImageElement;
                                          target.style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}

          {error && (
            <div className="mt-4 bg-red-900/20 border border-red-500 rounded p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-700 flex items-center justify-between">
          <div className="text-gray-400 text-sm">
            {selectedGames.size > 0 && `${selectedGames.size} game${selectedGames.size === 1 ? '' : 's'} selected`}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={isImporting}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={isImporting || selectedGames.size === 0}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? 'Importing...' : `Import ${selectedGames.size} Game${selectedGames.size === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </div>

      {/* Game Metadata Editor - Works for both Steam and Xbox games */}
      {editingGame && (
        <SteamGameMetadataEditor
          isOpen={!!editingGame}
          onClose={() => setEditingGame(null)}
          game={editingGame}
          currentMetadata={gameMetadata.get(getGameId(editingGame))}
          onSave={(metadata) => {
            // Update metadata for this game
            const gameId = getGameId(editingGame);
            setGameMetadata(prev => {
              const newMap = new Map(prev);
              newMap.set(gameId, metadata);
              return newMap;
            });
            setEditingGame(null);
          }}
        />
      )}
    </div>
  );
};
