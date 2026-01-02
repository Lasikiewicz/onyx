import React, { useState, useEffect } from 'react';
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

type ScannedGame = SteamGame | XboxGame;

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

// Helper to get game ID (works for both Steam and Xbox)
const getGameId = (game: ScannedGame): string => {
  return isSteamGame(game) ? game.appId : game.id;
};

// Helper to get game name
const getGameName = (game: ScannedGame): string => {
  return game.name;
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

  useEffect(() => {
    if (isOpen) {
      if (preScannedGames && preScannedGames.length > 0) {
        // Use pre-scanned games
        setScannedGames(preScannedGames);
        
        // Restore previous selections or auto-select all if first time
        const allGameIds = new Set(preScannedGames.map(g => getGameId(g)));
        if (persistedSelections.size > 0) {
          // Only include games that were previously selected and still exist
          const restoredSelections = new Set(
            Array.from(persistedSelections).filter(id => allGameIds.has(id))
          );
          // If no previous selections match, default to all selected
          setSelectedGames(restoredSelections.size > 0 ? restoredSelections : allGameIds);
        } else {
          // First time - select all
          setSelectedGames(allGameIds);
        }
        
        // Load existing metadata from library if available
        const metadataMap = new Map<string, GameMetadata>();
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
        
        // Fetch metadata for games that don't have images (Steam and Xbox)
        if (appType === 'steam') {
          const steamGames = preScannedGames.filter(isSteamGame);
          fetchMetadataForAll(steamGames, metadataMap);
        } else if (appType === 'xbox') {
          // Fetch metadata for Xbox games that don't have images
          const xboxGames = preScannedGames.filter((g): g is XboxGame => !isSteamGame(g));
          fetchMetadataForXboxGames(xboxGames, metadataMap);
        }
      } else {
        // Scan now
        handleScan();
      }
    } else {
      // Save current selections when modal closes
      if (selectedGames.size > 0) {
        setPersistedSelections(new Set(selectedGames));
      }
      // Don't reset games/metadata when closing, just clear error
      setError(null);
      setEditingGame(null);
    }
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

  const fetchMetadataForXboxGame = async (game: XboxGame, existingMetadata?: Map<string, GameMetadata>) => {
    const gameId = getGameId(game);
    
    // Skip if we already have metadata from the library
    if (existingMetadata && existingMetadata.has(gameId)) {
      const existing = existingMetadata.get(gameId)!;
      // Only auto-fetch if there's no image and it hasn't been selected before
      if (existing.boxArtUrl || existing.bannerUrl) {
        return; // Already has artwork, don't overwrite
      }
    }
    
    setIsFetchingMetadata(prev => new Set(prev).add(gameId));
    
    try {
      // Search for metadata using game name
      const response = await window.electronAPI.searchMetadata(game.name);
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

  const toggleGameSelection = (gameId: string) => {
    setSelectedGames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
      } else {
        newSet.add(gameId);
      }
      // Update persisted selections
      setPersistedSelections(new Set(newSet));
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
      const gamesToImport: Game[] = scannedGames
        .filter(game => selectedGames.has(getGameId(game)))
        .map(game => {
          const gameId = getGameId(game);
          const metadata = gameMetadata.get(gameId);
          
          if (isSteamGame(game)) {
            return {
              id: `steam-${game.appId}`,
              title: game.name,
              platform: 'steam' as const,
              exePath: '',
              boxArtUrl: metadata?.boxArtUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`,
              bannerUrl: metadata?.bannerUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/library_600x900.jpg`,
            };
          } else {
            // Xbox game
            return {
              id: game.id,
              title: game.name,
              platform: 'xbox' as const,
              exePath: game.installPath,
              boxArtUrl: metadata?.boxArtUrl || '',
              bannerUrl: metadata?.bannerUrl || '',
            };
          }
        });

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
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl mx-4 my-8 border border-gray-700 max-h-[90vh] flex flex-col">
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

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {scannedGames.map((game) => {
                  const gameId = getGameId(game);
                  const gameName = getGameName(game);
                  const metadata = gameMetadata.get(gameId);
                  const isSelected = selectedGames.has(gameId);
                  const isFetching = isFetchingMetadata.has(gameId);
                  
                  // Get boxart URL based on game type
                  let boxArtUrl = '';
                  let bannerUrl = '';
                  if (isSteamGame(game)) {
                    boxArtUrl = metadata?.boxArtUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`;
                    bannerUrl = metadata?.bannerUrl || `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/library_600x900.jpg`;
                  } else {
                    boxArtUrl = metadata?.boxArtUrl || '';
                    bannerUrl = metadata?.bannerUrl || '';
                  }

                  return (
                    <div
                      key={gameId}
                      className={`relative rounded-lg border-2 transition-all flex flex-col ${
                        isSelected
                          ? 'border-blue-500 bg-blue-500/10'
                          : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                      }`}
                    >
                      <div className="relative overflow-hidden rounded-t-lg mx-auto mt-2" style={{ width: '120px', height: '120px' }}>
                        {boxArtUrl ? (
                          <img
                            src={boxArtUrl}
                            alt={gameName}
                            className="w-full h-full object-cover cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Allow editing for both Steam and Xbox games
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
                              // Allow editing for both Steam and Xbox games
                              setEditingGame(game);
                            }}
                          >
                            {isFetching ? (
                              <svg className="animate-spin h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <span className="text-gray-400 text-sm">No Image</span>
                            )}
                          </div>
                        )}
                        
                        {/* Selection Checkbox */}
                        <div 
                          className="absolute top-2 right-2 cursor-pointer z-10"
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
                      </div>
                      
                      <div className="p-2 flex-1 flex flex-col">
                        <h3 
                          className="text-white font-medium text-xs line-clamp-2 text-center cursor-pointer hover:text-blue-400 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Allow editing for both Steam and Xbox games
                            if (isSteamGame(game)) {
                              setEditingGame(game);
                            } else {
                              // For Xbox games, we'll use a generic metadata editor
                              setEditingGame(game as any);
                            }
                          }}
                        >
                          {gameName}
                        </h3>
                        <p className="text-gray-400 text-xs mt-1 text-center">
                          {isSteamGame(game) ? `App ID: ${game.appId}` : `ID: ${game.id}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
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
