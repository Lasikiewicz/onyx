import React, { useState, useEffect } from 'react';

interface IGDBGameResult {
  id: number;
  name: string;
  summary?: string;
  coverUrl?: string;
  screenshotUrls?: string[];
  logoUrl?: string;
  rating?: number;
  releaseDate?: number;
  genres?: string[];
  platform?: string;
  ageRating?: string;
  categories?: string[];
}

interface ImageSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle: string;
  imageType: 'artwork' | 'boxart';
  onSelectImage: (imageUrl: string) => void;
}

export const ImageSearchModal: React.FC<ImageSearchModalProps> = ({
  isOpen,
  onClose,
  gameTitle,
  imageType,
  onSelectImage,
}) => {
  const [searchQuery, setSearchQuery] = useState(gameTitle);
  const [searchResults, setSearchResults] = useState<IGDBGameResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<IGDBGameResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(gameTitle);
      setSearchResults([]);
      setSelectedResult(null);
      setError(null);
    }
  }, [isOpen, gameTitle]);

  const handleSearch = async () => {
    const query = searchQuery.trim() || gameTitle.trim();
    if (!query) {
      setError('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResults([]);
    setSelectedResult(null);

    try {
      const response = await window.electronAPI.searchMetadata(query.trim());
      if (response.success && response.results && response.results.length > 0) {
        setSearchResults(response.results);
      } else {
        setError(response.error || 'No results found');
      }
    } catch (err) {
      setError('Failed to search for images');
      console.error('Error searching images:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: IGDBGameResult) => {
    setSelectedResult(result);
  };

  const handleSelectImage = (imageUrl: string) => {
    onSelectImage(imageUrl);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-4xl h-[90vh] mx-4 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">
              Search for {imageType === 'artwork' ? 'Artwork/Screenshots/Logos' : 'Boxart/Logos'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Search Input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search for game..."
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded transition-colors"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Search Results List */}
          <div className="w-1/3 border-r border-gray-700 overflow-y-auto">
            {error && (
              <div className="p-4 text-red-400 text-sm">{error}</div>
            )}
            {searchResults.length > 0 && (
              <div className="p-4 space-y-2">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => handleSelectResult(result)}
                    className={`w-full text-left p-3 rounded transition-colors ${
                      selectedResult?.id === result.id
                        ? 'bg-blue-600/30 border border-blue-500/50'
                        : 'bg-gray-700 hover:bg-gray-600 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {result.coverUrl && (
                        <img
                          src={result.coverUrl}
                          alt={result.name}
                          className="w-12 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium truncate">{result.name}</p>
                        {result.releaseDate && (
                          <p className="text-gray-400 text-xs">
                            {new Date(result.releaseDate * 1000).getFullYear()}
                          </p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Image Selection */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedResult && (
              <div>
                <h3 className="text-lg font-semibold text-white mb-4">{selectedResult.name}</h3>
                
                {imageType === 'boxart' && selectedResult.coverUrl && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Boxart</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        onClick={() => handleSelectImage(selectedResult.coverUrl!)}
                        className="cursor-pointer group"
                      >
                        <img
                          src={selectedResult.coverUrl}
                          alt="Boxart"
                          className="w-full aspect-[2/3] object-cover rounded border-2 border-transparent group-hover:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {imageType === 'artwork' && selectedResult.screenshotUrls && selectedResult.screenshotUrls.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Screenshots</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {selectedResult.screenshotUrls.map((url, index) => (
                        <div
                          key={index}
                          onClick={() => handleSelectImage(url)}
                          className="cursor-pointer group"
                        >
                          <img
                            src={url}
                            alt={`Screenshot ${index + 1}`}
                            className="w-full aspect-video object-cover rounded border-2 border-transparent group-hover:border-blue-500 transition-colors"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {imageType === 'artwork' && !selectedResult.screenshotUrls?.length && selectedResult.coverUrl && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Cover Art</h4>
                    <div
                      onClick={() => handleSelectImage(selectedResult.coverUrl!)}
                      className="cursor-pointer group"
                    >
                      <img
                        src={selectedResult.coverUrl}
                        alt="Cover"
                        className="w-full max-w-md aspect-video object-cover rounded border-2 border-transparent group-hover:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                )}

                {imageType === 'artwork' && !selectedResult.screenshotUrls?.length && !selectedResult.coverUrl && (
                  <p className="text-gray-400">No artwork available for this game</p>
                )}

                {/* Logo section - shown for both boxart and artwork types */}
                {selectedResult.logoUrl && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-400 mb-3">Logo</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div
                        onClick={() => handleSelectImage(selectedResult.logoUrl!)}
                        className="cursor-pointer group"
                      >
                        <div className="w-full aspect-video bg-gray-700 rounded border-2 border-transparent group-hover:border-blue-500 transition-colors flex items-center justify-center p-4">
                          <img
                            src={selectedResult.logoUrl}
                            alt="Logo"
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              console.error('Failed to load logo:', selectedResult.logoUrl, e);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            {!selectedResult && searchResults.length === 0 && !isSearching && (
              <div className="text-center text-gray-400 mt-12">
                <p>Search for a game to see available images</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
