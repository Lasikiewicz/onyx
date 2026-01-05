import React, { useState, useEffect } from 'react';
import { Game } from '../types/game';

interface GameSearchResult {
  id: string;
  title: string;
  source: string;
  externalId?: string | number;
  steamAppId?: string;
  year?: number;
  platform?: string;
}

interface MetadataSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  game: Game;
  onSelect: (result: { id: string; source: string }) => Promise<void>;
}

export const MetadataSearchModal: React.FC<MetadataSearchModalProps> = ({
  isOpen,
  onClose,
  game,
  onSelect,
}) => {
  const [searchQuery, setSearchQuery] = useState(game.title);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GameSearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(game.title);
      setSearchResults([]);
      setError(null);
    }
  }, [isOpen, game]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResults([]);

    try {
      const response = await window.electronAPI.searchGames(searchQuery.trim());
      if (response.success && response.results) {
        // Transform results to include year and platform info
        const transformedResults: GameSearchResult[] = response.results.map((result: any) => {
          // Extract year from releaseDate if available
          let year: number | undefined;
          if (result.releaseDate) {
            const date = new Date(result.releaseDate * 1000);
            year = date.getFullYear();
          }

          return {
            id: result.id,
            title: result.title || result.name,
            source: result.source,
            externalId: result.externalId,
            steamAppId: result.steamAppId,
            year,
            platform: result.platform,
          };
        });
        setSearchResults(transformedResults);
      } else {
        setError(response.error || 'No results found');
      }
    } catch (err) {
      console.error('Error searching games:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while searching');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = async (result: GameSearchResult) => {
    setIsApplying(true);
    try {
      await onSelect({ id: result.id, source: result.source });
      onClose();
    } catch (err) {
      console.error('Error applying metadata:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply metadata');
    } finally {
      setIsApplying(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl mx-4 border border-gray-700 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">Fix Metadata/Match</h2>
              <p className="text-gray-400 text-sm mt-1">
                Search for the correct game match for: <span className="text-white font-medium">{game.title}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              disabled={isApplying}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter game title to search..."
              className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSearching || isApplying}
            />
            <button
              onClick={handleSearch}
              disabled={isSearching || isApplying || !searchQuery.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
            >
              {isSearching ? (
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
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {searchResults.length === 0 && !isSearching && !error && (
            <div className="text-center text-gray-400 py-12">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p>Enter a search query and click Search to find games</p>
            </div>
          )}

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-400 mb-4">
                Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}. Select the correct match:
              </p>
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectResult(result)}
                  disabled={isApplying}
                  className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-white">{result.title}</h3>
                        <span className="px-2 py-0.5 text-xs font-medium rounded bg-blue-600 text-white">
                          {result.source === 'igdb' ? 'IGDB' : result.source === 'steamgriddb' ? 'SteamGridDB' : result.source}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        {result.year && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {result.year}
                          </span>
                        )}
                        {result.platform && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {result.platform}
                          </span>
                        )}
                        {result.steamAppId && (
                          <span className="text-xs text-gray-500">
                            Steam App ID: {result.steamAppId}
                          </span>
                        )}
                      </div>
                    </div>
                    {isApplying && (
                      <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
