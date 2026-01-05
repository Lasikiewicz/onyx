import React, { useState } from 'react';
import { ExecutableFile } from '../types/game';
import { GameMetadata } from '../types/game';

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

interface GameMetadataEditorProps {
  isOpen: boolean;
  onClose: () => void;
  executable: ExecutableFile;
  onSave: (title: string, exePath: string, metadata: GameMetadata) => Promise<void>;
}

export const GameMetadataEditor: React.FC<GameMetadataEditorProps> = ({
  isOpen,
  onClose,
  executable,
  onSave,
}) => {
  const [title, setTitle] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<IGDBGameResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<IGDBGameResult | null>(null);
  const [metadata, setMetadata] = useState<GameMetadata | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formatReleaseYear = (timestamp?: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.getFullYear().toString();
  };

  const handleSearch = async () => {
    if (!title.trim()) {
      setError('Please enter a game title');
      return;
    }

    setIsSearching(true);
    setError(null);
    setSearchResults([]);
    setSelectedResult(null);
    setMetadata(null);

    try {
      const response = await window.electronAPI.searchMetadata(title.trim());
      if (response.success && response.results && response.results.length > 0) {
        setSearchResults(response.results);
      } else {
        const errorMsg = response.error || 'No results found. You can still save the game.';
        setError(errorMsg);
      }
    } catch (err) {
      setError('Failed to search for metadata');
      console.error('Error searching metadata:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: IGDBGameResult) => {
    setSelectedResult(result);
    setTitle(result.name);
    
    // Format release date from timestamp if available
    const formatReleaseDate = (timestamp?: number): string | undefined => {
      if (!timestamp) return undefined;
      const date = new Date(timestamp * 1000);
      return date.toISOString().split('T')[0];
    };
    
    // Convert IGDB result to GameMetadata with all fields
    const gameMetadata: GameMetadata = {
      boxArtUrl: result.coverUrl || '',
      bannerUrl: result.screenshotUrls && result.screenshotUrls.length > 0 
        ? result.screenshotUrls[0] 
        : result.coverUrl || '',
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
    
    setMetadata(gameMetadata);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Game title is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const finalMetadata: GameMetadata = metadata || {
        boxArtUrl: '',
        bannerUrl: '',
      };

      await onSave(title.trim(), executable.fullPath, finalMetadata);
      
      // Reset form
      setTitle('');
      setMetadata(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save game');
      console.error('Error saving game:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (!isSaving) {
      setTitle('');
      setMetadata(null);
      setSearchResults([]);
      setSelectedResult(null);
      setError(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl mx-4 border border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Add Game with Metadata</h2>
            <button
              onClick={handleClose}
              disabled={isSaving}
              className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="space-y-6">
            {/* Game Title Input */}
            <div>
              <label htmlFor="game-title" className="block text-sm font-medium text-gray-300 mb-2">
                Game Title *
              </label>
              <div className="flex gap-2">
                <input
                  id="game-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Enter game title"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching || isSaving || !title.trim()}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSearching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>

            {/* Executable Path (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Executable Path
              </label>
              <input
                type="text"
                value={executable.fullPath}
                readOnly
                className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 cursor-not-allowed"
              />
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
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
                        {/* Cover Image */}
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
                        
                        {/* Game Info */}
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white font-semibold text-base mb-1 truncate">
                            {result.name}
                          </h4>
                          <div className="flex items-center gap-3 text-sm text-gray-400">
                            {releaseYear && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                {releaseYear}
                              </span>
                            )}
                            {result.rating && (
                              <span className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {Math.round(result.rating)}/100
                              </span>
                            )}
                            {result.genres && result.genres.length > 0 && (
                              <span className="truncate">
                                {result.genres.slice(0, 2).join(', ')}
                              </span>
                            )}
                          </div>
                          {result.summary && (
                            <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                              {result.summary}
                            </p>
                          )}
                        </div>
                        
                        {/* Selection Indicator */}
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
            )}

            {/* Metadata Preview */}
            {metadata && selectedResult && (
              <div className="border border-gray-600 rounded-lg p-4 bg-gray-700/30">
                <h3 className="text-lg font-semibold text-white mb-4">Selected Game Preview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {metadata.boxArtUrl && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Cover Art</p>
                      <img
                        src={metadata.boxArtUrl}
                        alt="Cover art"
                        className="w-full h-auto rounded-lg border border-gray-600"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  {metadata.bannerUrl && (
                    <div>
                      <p className="text-sm text-gray-400 mb-2">Banner Art</p>
                      <img
                        src={metadata.bannerUrl}
                        alt="Banner art"
                        className="w-full h-auto rounded-lg border border-gray-600"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !title.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save Game'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
