import React, { useState, useEffect } from 'react';
import { GameMetadata } from '../types/game';

interface SteamGame {
  appId: string;
  name: string;
  installDir: string;
  libraryPath: string;
}

interface XboxGame {
  id: string;
  name: string;
  installPath?: string;
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

interface IGDBGameResult {
  id: number;
  name: string;
  summary?: string;
  coverUrl?: string;
  screenshotUrls?: string[];
  rating?: number;
  releaseDate?: number;
  genres?: string[];
  platform?: string;
  ageRating?: string;
  categories?: string[];
}

interface SteamGameMetadataEditorProps {
  isOpen: boolean;
  onClose: () => void;
  game: ScannedGame;
  currentMetadata?: GameMetadata;
  onSave: (metadata: GameMetadata) => void;
}

// Helper to check if a game is a Steam game
const isSteamGame = (game: ScannedGame): game is SteamGame => {
  return 'appId' in game;
};

export const SteamGameMetadataEditor: React.FC<SteamGameMetadataEditorProps> = ({
  isOpen,
  onClose,
  game,
  currentMetadata,
  onSave,
}) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<IGDBGameResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<IGDBGameResult | null>(null);
  const [searchQuery, setSearchQuery] = useState(game.name);
  const [hasSearched, setHasSearched] = useState(false);
  const [metadata, setMetadata] = useState<GameMetadata>(
    currentMetadata || (isSteamGame(game) ? {
      boxArtUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`,
      bannerUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/library_600x900.jpg`,
    } : {
      boxArtUrl: '',
      bannerUrl: '',
    })
  );
  const [showImageSelector, setShowImageSelector] = useState<'boxart' | 'banner' | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reset search query to game name when modal opens
      setSearchQuery(game.name);
      setHasSearched(false);
      // Auto-search for metadata when modal opens
      handleSearch();
    }
  }, [isOpen, game]);

  const formatReleaseYear = (timestamp?: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.getFullYear().toString();
  };

  const handleSearch = async (customQuery?: string) => {
    const query = customQuery || searchQuery || game.name;
    if (!query.trim()) {
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedResult(null);
    setHasSearched(true);

    try {
      const response = await window.electronAPI.searchMetadata(query.trim());
      if (response.success && response.results && response.results.length > 0) {
        setSearchResults(response.results);
      }
    } catch (err) {
      console.error('Error searching metadata:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: IGDBGameResult) => {
    setSelectedResult(result);
    
    // Format release date from timestamp if available
    const formatReleaseDate = (timestamp?: number): string | undefined => {
      if (!timestamp) return undefined;
      const date = new Date(timestamp * 1000);
      return date.toISOString().split('T')[0];
    };
    
    // Update metadata with all selected result data
    const newMetadata: GameMetadata = {
      boxArtUrl: result.coverUrl || metadata.boxArtUrl,
      bannerUrl: result.screenshotUrls && result.screenshotUrls.length > 0 
        ? result.screenshotUrls[0] 
        : metadata.bannerUrl,
      screenshots: result.screenshotUrls,
      // Import all metadata fields
      title: result.name,
      description: result.summary,
      releaseDate: formatReleaseDate(result.releaseDate),
      genres: result.genres,
      ageRating: result.ageRating,
      categories: result.categories,
      rating: result.rating,
      platform: result.platform,
    };
    
    setMetadata(newMetadata);
  };

  const handleImageSelect = (imageUrl: string, type: 'boxart' | 'banner') => {
    if (type === 'boxart') {
      setMetadata({ ...metadata, boxArtUrl: imageUrl });
    } else {
      setMetadata({ ...metadata, bannerUrl: imageUrl });
    }
    setShowImageSelector(null);
  };

  const handleSave = () => {
    onSave(metadata);
    onClose();
  };

  const handleClose = () => {
    setSearchResults([]);
    setSelectedResult(null);
    setShowImageSelector(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-7xl mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-white">Select Metadata for {game.name}</h2>
              <p className="text-gray-400 text-sm mt-1">
                {isSteamGame(game) ? `App ID: ${game.appId}` : `ID: ${'id' in game ? game.id : 'unknown'}`}
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Current Images Preview */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Box Art</label>
                <div className="relative">
                  <img
                    src={metadata.boxArtUrl}
                    alt="Box art"
                    className="w-full h-auto rounded-lg border border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setShowImageSelector('boxart')}
                    onError={(e) => {
                      if (isSteamGame(game)) {
                        (e.target as HTMLImageElement).src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/header.jpg`;
                      } else {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }
                    }}
                  />
                  <button
                    onClick={() => setShowImageSelector('boxart')}
                    className="absolute top-2 right-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Banner Art</label>
                <div className="relative">
                  <img
                    src={metadata.bannerUrl}
                    alt="Banner art"
                    className="w-full h-auto rounded-lg border border-gray-600 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setShowImageSelector('banner')}
                    onError={(e) => {
                      if (isSteamGame(game)) {
                        (e.target as HTMLImageElement).src = `https://cdn.cloudflare.steamstatic.com/steam/apps/${game.appId}/library_600x900.jpg`;
                      } else {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }
                    }}
                  />
                  <button
                    onClick={() => setShowImageSelector('banner')}
                    className="absolute top-2 right-2 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                  >
                    Change
                  </button>
                </div>
              </div>
              {/* Image Selector - appears to the right */}
              {(showImageSelector === 'boxart' || showImageSelector === 'banner') && selectedResult && (
                <div className="border border-gray-600 rounded-lg p-4 bg-gray-700/30">
                  <h4 className="text-sm font-semibold text-white mb-3">
                    Select {showImageSelector === 'boxart' ? 'Box Art' : 'Banner Art'}
                  </h4>
                  <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                    {selectedResult.coverUrl && (
                      <button
                        onClick={() => handleImageSelect(selectedResult.coverUrl!, showImageSelector)}
                        className="relative group"
                      >
                        <img
                          src={selectedResult.coverUrl}
                          alt="Cover"
                          className="w-full h-auto rounded-lg border-2 border-gray-600 group-hover:border-blue-500 transition-colors"
                        />
                        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 transition-colors rounded-lg flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">Select</span>
                        </div>
                      </button>
                    )}
                    {selectedResult.screenshotUrls?.map((url, index) => (
                      <button
                        key={index}
                        onClick={() => handleImageSelect(url, showImageSelector)}
                        className="relative group"
                      >
                        <img
                          src={url}
                          alt={`Screenshot ${index + 1}`}
                          className="w-full h-auto rounded-lg border-2 border-gray-600 group-hover:border-blue-500 transition-colors"
                        />
                        <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/20 transition-colors rounded-lg flex items-center justify-center">
                          <span className="text-white opacity-0 group-hover:opacity-100 text-xs font-medium">Select</span>
                        </div>
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => setShowImageSelector(null)}
                    className="mt-3 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Manual Search Input */}
            <div className="border border-gray-600 rounded-lg p-4 bg-gray-700/30">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Search for Game Metadata
              </label>
              <p className="text-xs text-gray-400 mb-3">
                If no results were found, try searching with a different title (e.g., "Final Fantasy VI" instead of "FINAL.FANTASY.VI.RexaGames.com")
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearch();
                    }
                  }}
                  placeholder="Enter game title to search..."
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => handleSearch()}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Search Results */}
            {isSearching ? (
              <div className="text-center py-8">
                <svg className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-gray-300">Searching for metadata...</p>
              </div>
            ) : hasSearched && searchResults.length === 0 ? (
              <div className="border border-gray-600 rounded-lg p-6 bg-gray-700/30 text-center">
                <p className="text-gray-300 mb-2">No results found for "{searchQuery}"</p>
                <p className="text-gray-400 text-sm mb-4">
                  Try searching with a different title or check your API credentials in Settings &gt; APIs
                </p>
                <p className="text-gray-500 text-xs">
                  You can still save the game without metadata, or manually set images using the "Change" buttons above.
                </p>
              </div>
            ) : searchResults.length > 0 ? (
              <div className="border border-gray-600 rounded-lg p-4 bg-gray-700/30">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Search Results ({searchResults.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {searchResults.map((result) => {
                    const isSelected = selectedResult?.id === result.id;
                    const releaseYear = formatReleaseYear(result.releaseDate);
                    
                    return (
                      <button
                        key={result.id}
                        type="button"
                        onClick={() => handleSelectResult(result)}
                        className={`w-full flex items-center gap-4 p-3 rounded-lg border transition-colors text-left ${
                          isSelected
                            ? 'bg-blue-600/30 border-blue-500'
                            : 'bg-gray-700/50 border-gray-600 hover:bg-gray-700 hover:border-gray-500'
                        }`}
                      >
                        <div className="flex-shrink-0 w-20 h-28 bg-gray-600 rounded overflow-hidden">
                          {result.coverUrl ? (
                            <img
                              src={result.coverUrl}
                              alt={result.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                              No Cover
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold text-base mb-1 truncate">
                            {result.name}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            {releaseYear && <span>{releaseYear}</span>}
                            {result.rating && <span>{Math.round(result.rating)}/100</span>}
                            {result.genres && result.genres.length > 0 && (
                              <span className="truncate">{result.genres.slice(0, 2).join(', ')}</span>
                            )}
                          </div>
                          {result.summary && (
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">{result.summary}</p>
                          )}
                        </div>
                        
                        {isSelected && (
                          <div className="flex-shrink-0">
                            <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}


            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Save Metadata
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
