import React, { useState, useEffect } from 'react';

interface UnmatchedGame {
  gameId: string;
  title: string;
  searchResults: Array<{
    id: string;
    title: string;
    source: string;
    externalId?: string;
    steamAppId?: string;
  }>;
}

interface MatchFixDialogProps {
  isOpen: boolean;
  unmatchedGames: UnmatchedGame[];
  onFix: (fixes: Map<string, { providerId: string; providerSource: string }>, ignoredGames: Set<string>) => Promise<void>;
  onCancel: () => void;
}

export const MatchFixDialog: React.FC<MatchFixDialogProps> = ({
  isOpen,
  unmatchedGames,
  onFix,
  onCancel,
}) => {
  const [selectedMatches, setSelectedMatches] = useState<Map<string, { providerId: string; providerSource: string }>>(new Map());
  const [ignoredGames, setIgnoredGames] = useState<Set<string>>(new Set());
  const [isFixing, setIsFixing] = useState(false);
  const [searchQueries, setSearchQueries] = useState<Map<string, string>>(new Map());
  const [searchResults, setSearchResults] = useState<Map<string, any[]>>(new Map());
  const [isSearching, setIsSearching] = useState<Map<string, boolean>>(new Map());

  const [missingKeyError, setMissingKeyError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Check for mandatory API keys
      window.electronAPI.getAPICredentials().then(creds => {
        if (!creds.steamGridDBApiKey || !creds.steamGridDBApiKey.trim()) {
          setMissingKeyError('SteamGridDB API Key is missing. Please configure it in Settings > API Integrations.');
        } else {
          setMissingKeyError(null);
        }
      });

      // Initialize with existing search results
      const initialResults = new Map<string, any[]>();
      unmatchedGames.forEach(game => {
        if (game.searchResults.length > 0) {
          initialResults.set(game.gameId, game.searchResults);
        }
      });
      setSearchResults(initialResults);
    } else {
      // Reset state when dialog closes
      setSelectedMatches(new Map());
      setIgnoredGames(new Set());
      setSearchQueries(new Map());
      setSearchResults(new Map());
      setIsSearching(new Map());
      setMissingKeyError(null);
    }
  }, [isOpen, unmatchedGames]);

  const handleSearch = async (gameId: string, query: string) => {
    if (missingKeyError || !query.trim()) return;

    setIsSearching(prev => new Map(prev).set(gameId, true));
    setSearchQueries(prev => new Map(prev).set(gameId, query));

    try {
      // Search all providers (SteamGridDB and IGDB) using searchGames
      const searchResult = await window.electronAPI.searchGames(query).catch(() => ({ success: false, results: [] }));

      const results: any[] = [];

      if (searchResult.success && searchResult.results) {
        searchResult.results.forEach((result: any) => {
          results.push({
            id: result.id,
            title: result.title || result.name,
            source: result.source,
            externalId: result.externalId || result.id.replace(/^(steamgriddb|igdb)-/, ''),
          });
        });
      }

      setSearchResults(prev => new Map(prev).set(gameId, results));
    } catch (error) {
      console.error('Error searching:', error);
    } finally {
      setIsSearching(prev => new Map(prev).set(gameId, false));
    }
  };

  const handleSelectMatch = (gameId: string, result: { id: string; source: string; externalId?: string }) => {
    const providerId = result.externalId || result.id;
    const providerSource = result.source === 'steamgriddb' ? 'steamgriddb' : 'igdb';

    setSelectedMatches(prev => {
      const newMap = new Map(prev);
      newMap.set(gameId, { providerId, providerSource });
      return newMap;
    });
  };

  const handleIgnore = (gameId: string) => {
    setIgnoredGames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
      } else {
        newSet.add(gameId);
      }
      return newSet;
    });
  };

  const handleFix = async () => {
    setIsFixing(true);
    try {
      await onFix(selectedMatches, ignoredGames);
    } finally {
      setIsFixing(false);
    }
  };

  if (!isOpen) return null;

  // Get visible games (non-ignored)
  const visibleGames = unmatchedGames.filter(game => !ignoredGames.has(game.gameId));
  const allMatched = visibleGames.length > 0 && visibleGames.every(game => selectedMatches.has(game.gameId));

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-white">Fix Game Matches</h2>
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
          {missingKeyError ? (
            <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-200 flex items-center gap-3">
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-bold">Configuration Required</h3>
                <p>{missingKeyError}</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-400 mb-4">
              {unmatchedGames.length} game{unmatchedGames.length !== 1 ? 's' : ''} couldn't be automatically matched.
              Please select the correct match for each game:
            </p>
          )}

          <div className="space-y-4">
            {unmatchedGames.map((game) => {
              const gameResults = searchResults.get(game.gameId) || game.searchResults;
              const isSearchingGame = isSearching.get(game.gameId);
              const selectedMatch = selectedMatches.get(game.gameId);
              const searchQuery = searchQueries.get(game.gameId) || '';
              const isIgnored = ignoredGames.has(game.gameId);

              if (isIgnored) {
                return (
                  <div key={game.gameId} className="border border-gray-700 rounded-lg p-4 bg-gray-900/30 opacity-50">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-gray-500 line-through">{game.title}</div>
                      <button
                        onClick={() => handleIgnore(game.gameId)}
                        className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800"
                      >
                        Unignore
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div key={game.gameId} className="border border-gray-700 rounded-lg p-4 bg-gray-900/50">
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium text-white">{game.title}</div>
                    <button
                      onClick={() => handleIgnore(game.gameId)}
                      className="text-xs text-gray-400 hover:text-gray-300 px-2 py-1 rounded hover:bg-gray-800"
                    >
                      Ignore
                    </button>
                  </div>

                  {/* Search Box */}
                  <div className="mb-3">
                    <input
                      type="text"
                      placeholder="Search for game..."
                      value={searchQuery}
                      onChange={(e) => {
                        const query = e.target.value;
                        setSearchQueries(prev => new Map(prev).set(game.gameId, query));
                        if (query.trim()) {
                          handleSearch(game.gameId, query);
                        }
                      }}
                      className={`w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 ${missingKeyError ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={!!missingKeyError}
                    />
                    {isSearchingGame && (
                      <div className="text-xs text-gray-500 mt-1">Searching...</div>
                    )}
                  </div>

                  {/* Results */}
                  {gameResults.length > 0 ? (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {gameResults.map((result, idx) => {
                        const isSelected = selectedMatch?.providerId === (result.externalId || result.id) &&
                          selectedMatch?.providerSource === result.source;
                        return (
                          <button
                            key={`${result.source}-${result.id}-${idx}`}
                            onClick={() => handleSelectMatch(game.gameId, result)}
                            className={`w-full text-left px-3 py-2 rounded border transition-colors ${isSelected
                              ? 'bg-blue-600 border-blue-500 text-white'
                              : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{result.title}</span>
                              <span className="text-xs opacity-75">
                                {result.source === 'steamgriddb' ? 'SteamGridDB' : 'IGDB'}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 py-4 text-center">
                      No results found. Try searching with a different name.
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
            {selectedMatches.size} of {visibleGames.length} game{visibleGames.length !== 1 ? 's' : ''} matched
            {ignoredGames.size > 0 && `, ${ignoredGames.size} ignored`}
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
              disabled={!allMatched || isFixing}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isFixing ? 'Fixing...' : 'Fix Matches'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
