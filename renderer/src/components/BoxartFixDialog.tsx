import React, { useState, useEffect } from 'react';

interface MissingBoxartGame {
  gameId: string;
  title: string;
  steamAppId?: string;
}

interface BoxartFixDialogProps {
  isOpen: boolean;
  missingBoxartGames: MissingBoxartGame[];
  onFix: (fixes: Map<string, string>) => Promise<void>;
  onCancel: () => void;
}

interface ImageResult {
  id: string;
  url: string;
  title?: string;
  source?: string;
  score?: number;
  width?: number;
  height?: number;
  mime?: string;
  isAnimated?: boolean;
}

export const BoxartFixDialog: React.FC<BoxartFixDialogProps> = ({
  isOpen,
  missingBoxartGames,
  onFix,
  onCancel,
}) => {
  const [selectedBoxarts, setSelectedBoxarts] = useState<Map<string, string>>(new Map());
  const [isFixing, setIsFixing] = useState(false);
  const [searchQueries, setSearchQueries] = useState<Map<string, string>>(new Map());
  const [searchResults, setSearchResults] = useState<Map<string, ImageResult[]>>(new Map());
  const [isSearching, setIsSearching] = useState<Map<string, boolean>>(new Map());
  const [expandedGameId, setExpandedGameId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Initialize search queries with game titles
      const initialQueries = new Map<string, string>();
      missingBoxartGames.forEach(game => {
        initialQueries.set(game.gameId, game.title);
      });
      setSearchQueries(initialQueries);
    } else {
      // Reset state when dialog closes
      setSelectedBoxarts(new Map());
      setSearchQueries(new Map());
      setSearchResults(new Map());
      setIsSearching(new Map());
      setExpandedGameId(null);
    }
  }, [isOpen, missingBoxartGames]);

  const handleSearch = async (gameId: string, query: string) => {
    if (!query.trim()) return;

    const game = missingBoxartGames.find(g => g.gameId === gameId);
    if (!game) return;

    setIsSearching(prev => new Map(prev).set(gameId, true));
    setSearchQueries(prev => new Map(prev).set(gameId, query));

    try {
      // Search for boxart images
      const steamAppId = game.steamAppId;
      const response = await window.electronAPI.searchImages(query, 'boxart', steamAppId);

      const results: ImageResult[] = [];

      if (response.success && response.images) {
        // Flatten SteamGridDB results - these should be vertical grids (boxart) only
        response.images.forEach((gameResult: any) => {
          gameResult.images.forEach((img: any) => {
            // Verify it's a vertical grid (portrait orientation)
            // Boxart should have height >= width (aspect ratio >= 0.9 to be lenient)
            if (img.width && img.height) {
              const aspectRatio = img.height / img.width;
              if (aspectRatio < 0.9) {
                // Skip landscape images (these would be banners/heroes, not boxart)
                console.warn(`[BoxartFixDialog] Skipping landscape image (not boxart): ${img.width}x${img.height} (aspect ${aspectRatio.toFixed(2)})`);
                return;
              }
            }
            const isAnimated = img.mime === 'image/webp' || img.mime === 'image/gif' || 
                              img.url?.includes('.webp') || img.url?.includes('.gif');
            results.push({
              id: `${gameResult.gameId}-${img.url}`,
              url: img.url,
              title: gameResult.gameName,
              source: 'steamgriddb',
              score: img.score,
              width: img.width,
              height: img.height,
              mime: img.mime,
              isAnimated: isAnimated,
            });
          });
        });
      }

      // Also search IGDB for boxart
      try {
        const igdbResponse = await window.electronAPI.searchMetadata(query);
        if (igdbResponse && igdbResponse.success && igdbResponse.results) {
          igdbResponse.results.forEach((result: any) => {
            if (result.coverUrl) {
              results.push({
                id: `igdb-${result.id}-${result.coverUrl}`,
                url: result.coverUrl,
                title: result.name,
                source: 'igdb',
              });
            }
          });
        }
      } catch (e) {
        // IGDB search is optional, continue if it fails
        console.warn('IGDB search failed:', e);
      }

      // Sort results: exact matches first, then by score
      const normalizedQuery = query.toLowerCase().trim();
      results.sort((a, b) => {
        const aTitle = (a.title || '').toLowerCase().trim();
        const bTitle = (b.title || '').toLowerCase().trim();
        
        const aExact = aTitle === normalizedQuery;
        const bExact = bTitle === normalizedQuery;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // If both or neither are exact, sort by score (if available)
        return (b.score || 0) - (a.score || 0);
      });

      setSearchResults(prev => new Map(prev).set(gameId, results));
    } catch (error) {
      console.error('Error searching for boxart:', error);
      setSearchResults(prev => new Map(prev).set(gameId, []));
    } finally {
      setIsSearching(prev => new Map(prev).set(gameId, false));
    }
  };

  const handleSelectBoxart = (gameId: string, imageUrl: string) => {
    setSelectedBoxarts(prev => {
      const newMap = new Map(prev);
      newMap.set(gameId, imageUrl);
      return newMap;
    });
  };

  const handleFix = async () => {
    setIsFixing(true);
    try {
      await onFix(selectedBoxarts);
    } finally {
      setIsFixing(false);
    }
  };

  if (!isOpen) return null;

  // Get visible games (games that need boxart)
  const visibleGames = missingBoxartGames;
  const allFixed = visibleGames.length > 0 && selectedBoxarts && visibleGames.every(game => selectedBoxarts.has(game.gameId));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Fix Missing Boxart</h2>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
          >
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <p className="text-sm text-gray-400 mb-4">
            {missingBoxartGames.length} game{missingBoxartGames.length !== 1 ? 's' : ''} couldn't have boxart downloaded automatically. 
            Please search and select boxart for each game:
          </p>

          <div className="space-y-4">
            {missingBoxartGames.map((game) => {
              const gameResults = searchResults.get(game.gameId) || [];
              const isSearchingGame = isSearching.get(game.gameId);
              const selectedBoxart = selectedBoxarts.get(game.gameId);
              const searchQuery = searchQueries.get(game.gameId) || game.title;
              const isExpanded = expandedGameId === game.gameId;

              return (
                <div key={game.gameId} className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-white">{game.title}</div>
                    <button
                      onClick={() => setExpandedGameId(isExpanded ? null : game.gameId)}
                      className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800"
                    >
                      {isExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  </div>
                  
                  {isExpanded && (
                    <>
                      {/* Search Box */}
                      <div className="mb-3">
                        <input
                          type="text"
                          placeholder="Search for boxart..."
                          value={searchQuery}
                          onChange={(e) => {
                            const query = e.target.value;
                            setSearchQueries(prev => new Map(prev).set(game.gameId, query));
                            if (query.trim()) {
                              handleSearch(game.gameId, query);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && searchQuery.trim()) {
                              handleSearch(game.gameId, searchQuery);
                            }
                          }}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                        />
                        <button
                          onClick={() => handleSearch(game.gameId, searchQuery)}
                          disabled={!searchQuery.trim() || isSearchingGame}
                          className="mt-2 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded transition-colors"
                        >
                          {isSearchingGame ? 'Searching...' : 'Search'}
                        </button>
                        {isSearchingGame && (
                          <div className="text-xs text-gray-500 mt-1">Searching...</div>
                        )}
                      </div>

                      {/* Results */}
                      {gameResults.length > 0 ? (
                        <div className="grid grid-cols-10 gap-2 max-h-96 overflow-y-auto">
                          {gameResults.map((result) => {
                            const isSelected = selectedBoxart === result.url;
                            const isAnimated = result.isAnimated || result.url?.includes('.webp') || result.url?.includes('.gif');
                            return (
                              <div
                                key={result.id}
                                className={`relative group cursor-pointer border-2 rounded transition-all ${
                                  isSelected
                                    ? 'border-blue-500 ring-2 ring-blue-500/50'
                                    : 'border-gray-600 hover:border-gray-500'
                                }`}
                                onClick={() => handleSelectBoxart(game.gameId, result.url)}
                              >
                                {isAnimated ? (
                                  <img
                                    src={result.url}
                                    alt={result.title || 'Animated Boxart'}
                                    className="w-full aspect-[2/3] object-cover rounded"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                ) : (
                                  <img
                                    src={result.url}
                                    alt={result.title || 'Boxart'}
                                    className="w-full aspect-[2/3] object-cover rounded"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).style.display = 'none';
                                    }}
                                  />
                                )}
                                {isAnimated && (
                                  <div className="absolute top-1 right-1 bg-purple-600/80 text-white text-xs px-1.5 py-0.5 rounded flex items-center gap-1">
                                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                      <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                                    </svg>
                                    <span>GIF</span>
                                  </div>
                                )}
                                {isSelected && (
                                  <div className="absolute inset-0 bg-blue-500/20 flex items-center justify-center">
                                    <svg className="w-8 h-8 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : searchQuery.trim() && !isSearchingGame ? (
                        <div className="text-sm text-gray-500 py-4 text-center">
                          No results found. Try searching with a different name.
                        </div>
                      ) : null}
                    </>
                  )}

                  {/* Selected Boxart Indicator */}
                  {selectedBoxart && (
                    <div className="mt-3 p-2 bg-blue-600/20 border border-blue-600/50 rounded text-sm text-blue-300">
                      ✓ Boxart selected
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            {selectedBoxarts?.size || 0} of {visibleGames.length} game{visibleGames.length !== 1 ? 's' : ''} with boxart selected
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleFix}
              disabled={!allFixed || isFixing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFixing ? 'Applying...' : 'Apply Boxart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
