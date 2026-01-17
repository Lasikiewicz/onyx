import React, { useState, useEffect } from 'react';
import { ImageSelector, ImageResult } from './ImageSelector';

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
  const [isWebSearching, setIsWebSearching] = useState<Map<string, boolean>>(new Map());
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
      setIsWebSearching(new Map());
      setExpandedGameId(null);
    }
  }, [isOpen, missingBoxartGames]);

  const handleSearch = async (gameId: string, query: string, useWeb: boolean = false) => {
    if (!query.trim()) return;

    const game = missingBoxartGames.find(g => g.gameId === gameId);
    if (!game) return;

    if (useWeb) {
      setIsWebSearching(prev => new Map(prev).set(gameId, true));
    } else {
      setIsSearching(prev => new Map(prev).set(gameId, true));
    }

    setSearchQueries(prev => new Map(prev).set(gameId, query));

    try {
      let results: ImageResult[] = [];

      if (useWeb) {
        const response = await window.electronAPI.searchWebImages(query, 'boxart');
        if (response.success && response.images) {
          response.images.forEach((gameResult: any) => {
            results.push(...gameResult.images);
          });
        }
      } else {
        // Standard provider search
        const steamAppId = game.steamAppId;
        const response = await window.electronAPI.searchImages(query, 'boxart', steamAppId);

        if (response.success && response.images) {
          response.images.forEach((gameResult: any) => {
            gameResult.images.forEach((img: any) => {
              // Verify it's a vertical grid (portrait orientation)
              if (img.width && img.height) {
                const aspectRatio = img.height / img.width;
                if (aspectRatio < 0.9) return;
              }
              results.push({
                id: `${gameResult.gameId}-${img.url}`,
                url: img.url,
                title: gameResult.gameName,
                source: 'steamgriddb',
                score: img.score,
                width: img.width,
                height: img.height,
                mime: img.mime,
                isAnimated: img.mime === 'image/webp' || img.mime === 'image/gif' ||
                  img.url?.includes('.webp') || img.url?.includes('.gif'),
              });
            });
          });
        }

        // Also search IGDB
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
          console.warn('IGDB search failed:', e);
        }
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

        return (b.score || 0) - (a.score || 0);
      });

      // Merge with existing results if it's a web search, or replace if it's a new provider search
      if (useWeb) {
        setSearchResults(prev => {
          const existing = prev.get(gameId) || [];
          // Avoid duplicates
          const seenUrls = new Set(existing.map(r => r.url));
          const newResults = results.filter(r => !seenUrls.has(r.url));
          return new Map(prev).set(gameId, [...existing, ...newResults]);
        });
      } else {
        setSearchResults(prev => new Map(prev).set(gameId, results));
      }
    } catch (error) {
      console.error('Error searching for boxart:', error);
      if (!useWeb) {
        setSearchResults(prev => new Map(prev).set(gameId, []));
      }
    } finally {
      if (useWeb) {
        setIsWebSearching(prev => new Map(prev).set(gameId, false));
      } else {
        setIsSearching(prev => new Map(prev).set(gameId, false));
      }
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
              const isWebSearchingGame = isWebSearching.get(game.gameId);
              const selectedBoxart = selectedBoxarts.get(game.gameId);
              const searchQuery = searchQueries.get(game.gameId) || game.title;
              const isExpanded = expandedGameId === game.gameId;

              return (
                <div key={game.gameId} className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="font-medium text-white">{game.title}</div>
                      {selectedBoxart && (
                        <div className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded border border-blue-500/30 font-bold">
                          BOXART SELECTED
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setExpandedGameId(isExpanded ? null : game.gameId)}
                      className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${isExpanded
                          ? 'bg-gray-700 text-white shadow-inner'
                          : 'bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700'
                        }`}
                    >
                      {isExpanded ? 'Collapse' : 'Select Boxart'}
                    </button>
                  </div>

                  {isExpanded && (
                    <div className="space-y-4 animate-in slide-in-from-top-2 duration-300">
                      {/* Search Box */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="text"
                            placeholder="Search for boxart..."
                            value={searchQuery}
                            onChange={(e) => setSearchQueries(prev => new Map(prev).set(game.gameId, e.target.value))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && searchQuery.trim()) {
                                handleSearch(game.gameId, searchQuery);
                              }
                            }}
                            className="w-full pl-10 pr-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
                          />
                          <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                        <button
                          onClick={() => handleSearch(game.gameId, searchQuery)}
                          disabled={!searchQuery.trim() || isSearchingGame || isWebSearchingGame}
                          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-500/20"
                        >
                          {isSearchingGame ? 'Searching...' : 'Search Providers'}
                        </button>
                        <button
                          onClick={() => handleSearch(game.gameId, searchQuery, true)}
                          disabled={!searchQuery.trim() || isSearchingGame || isWebSearchingGame}
                          className="px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-purple-500/20 flex items-center gap-2"
                        >
                          {isWebSearchingGame ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Web...</span>
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                              </svg>
                              <span>Search Web</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Unified Image Selector */}
                      <ImageSelector
                        images={gameResults}
                        onSelect={(url) => handleSelectBoxart(game.gameId, url)}
                        selectedUrl={selectedBoxart}
                        imageType="boxart"
                        isLoading={isSearchingGame}
                        emptyMessage="No boxart found. Try 'Search Web' for more results."
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700 flex items-center justify-between bg-gray-900/40 rounded-b-lg">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-400">
              <span className="text-white font-bold">{selectedBoxarts?.size || 0}</span> of <span className="text-white font-bold">{visibleGames.length}</span> selected
            </div>
            <div className="h-4 w-px bg-gray-700"></div>
            <div className="w-48 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${(selectedBoxarts?.size || 0) / (visibleGames.length || 1) * 100}%` }}
              ></div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleFix}
              disabled={!allFixed || isFixing}
              className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold rounded-lg transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-gray-700 disabled:to-gray-700"
            >
              {isFixing ? 'Applying...' : 'Apply All Boxart'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
