import React, { useState, useEffect } from 'react';
import { Game } from '../types/game';

interface GameEditorProps {
  isOpen: boolean;
  game: Game | null;
  onClose: () => void;
  onSave: (game: Game) => Promise<void>;
  onDelete?: (gameId: string) => Promise<void>;
  allCategories?: string[];
}

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

export const GameEditor: React.FC<GameEditorProps> = ({ isOpen, onClose, onSave, game, onDelete, allCategories = [] }) => {
  const [editedGame, setEditedGame] = useState<Game | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<IGDBGameResult[]>([]);
  const [selectedGameResult, setSelectedGameResult] = useState<IGDBGameResult | null>(null);
  const [showImageSelector, setShowImageSelector] = useState<'cover' | 'banner' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryInput, setCategoryInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'images'>('details');
  const [imageSearchQuery, setImageSearchQuery] = useState<string>('');
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState<IGDBGameResult[]>([]);
  const [selectedImageResult, setSelectedImageResult] = useState<IGDBGameResult | null>(null);

  useEffect(() => {
    if (game && isOpen) {
      setEditedGame({ ...game });
      setError(null);
      setSuccess(null);
      setSearchResults([]);
      setImageSearchResults([]);
      setShowDeleteConfirm(false);
      setActiveTab('details');
      setImageSearchQuery('');
      setSelectedImageResult(null);
    }
  }, [game, isOpen]);

  if (!isOpen || !editedGame) return null;

  const handleFieldChange = (field: keyof Game, value: any) => {
    setEditedGame({ ...editedGame, [field]: value });
  };

  const formatReleaseDate = (timestamp?: number): string => {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toISOString().split('T')[0];
  };

  const handleSearchMetadata = async () => {
    if (!editedGame.title.trim()) {
      setError('Please enter a game title to search');
      return;
    }

    setIsSearchingMetadata(true);
    setError(null);
    setSearchResults([]);

    try {
      const response = await window.electronAPI.searchMetadata(editedGame.title.trim());
      if (response.success && response.results && response.results.length > 0) {
        setSearchResults(response.results);
      } else {
        setError(response.error || 'No results found');
      }
    } catch (err) {
      setError('Failed to search for metadata');
      console.error('Error searching metadata:', err);
    } finally {
      setIsSearchingMetadata(false);
    }
  };

  const handleSelectResult = (result: IGDBGameResult) => {
    setSelectedGameResult(result);
    
    // Check if we need to show image selector
    const hasMultipleScreenshots = result.screenshotUrls && result.screenshotUrls.length > 1;
    
    // Auto-apply all fields immediately, including age rating and description
    const updatedGame: Game = {
      ...editedGame,
      title: result.name || editedGame.title,
      releaseDate: formatReleaseDate(result.releaseDate) || editedGame.releaseDate,
      platform: result.platform || editedGame.platform || 'other',
      // Always set age rating if available, even if empty string
      ageRating: result.ageRating !== undefined ? result.ageRating : editedGame.ageRating,
      categories: result.categories && result.categories.length > 0 
        ? result.categories 
        : editedGame.categories || [],
      boxArtUrl: result.coverUrl || editedGame.boxArtUrl,
      bannerUrl: result.screenshotUrls && result.screenshotUrls.length > 0 
        ? result.screenshotUrls[0] 
        : editedGame.bannerUrl,
      // Always set description if available
      description: result.summary !== undefined ? result.summary : editedGame.description,
    };
    
    setEditedGame(updatedGame);
    
    // If multiple screenshots, show selector for banner and switch to images tab
    if (hasMultipleScreenshots) {
      setShowImageSelector('banner');
      setActiveTab('images');
    } else {
      setSuccess('Metadata applied successfully');
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const handleSelectImage = (imageUrl: string, type: 'cover' | 'banner') => {
    if (!editedGame) return;
    
    if (type === 'cover') {
      setEditedGame({ ...editedGame, boxArtUrl: imageUrl });
    } else {
      setEditedGame({ ...editedGame, bannerUrl: imageUrl });
    }
    
    setShowImageSelector(null);
    setSearchResults([]);
    setSelectedGameResult(null);
    setSuccess('Metadata applied successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSearchImages = async () => {
    const query = imageSearchQuery.trim() || editedGame.title.trim();
    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setIsSearchingImages(true);
    setError(null);
    setImageSearchResults([]);
    setSelectedImageResult(null);

    try {
      const response = await window.electronAPI.searchMetadata(query);
      if (response.success && response.results && response.results.length > 0) {
        setImageSearchResults(response.results);
      } else {
        setError(response.error || 'No results found');
      }
    } catch (err) {
      setError('Failed to search for images');
      console.error('Error searching images:', err);
    } finally {
      setIsSearchingImages(false);
    }
  };

  const handleSelectImageFromSearch = (imageUrl: string, type: 'cover' | 'banner') => {
    if (!editedGame) return;
    
    if (type === 'cover') {
      setEditedGame({ ...editedGame, boxArtUrl: imageUrl });
    } else {
      setEditedGame({ ...editedGame, bannerUrl: imageUrl });
    }
    
    setSuccess('Image applied successfully');
    setTimeout(() => setSuccess(null), 2000);
  };

  const addCategory = (category: string) => {
    if (!category.trim() || !editedGame) return;
    const current = editedGame.categories || [];
    if (!current.includes(category.trim())) {
      setEditedGame({ ...editedGame, categories: [...current, category.trim()] });
    }
    setCategoryInput('');
  };

  const removeCategory = (category: string) => {
    if (!editedGame) return;
    const current = editedGame.categories || [];
    setEditedGame({ ...editedGame, categories: current.filter(item => item !== category) });
  };

  const handleSave = async () => {
    if (!editedGame || !editedGame.title.trim()) {
      setError('Game title is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(editedGame);
      setSuccess('Game saved successfully');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save game');
      console.error('Error saving game:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editedGame || !onDelete) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(editedGame.id);
      setSuccess('Game deleted successfully');
      setTimeout(() => {
        setSuccess(null);
        onClose();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete game');
      console.error('Error deleting game:', err);
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleClose = () => {
    if (!isSaving && !isDeleting) {
      setError(null);
      setSuccess(null);
      setSearchResults([]);
      setSelectedGameResult(null);
      setShowImageSelector(null);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`bg-gray-800 rounded-lg shadow-xl border border-gray-700 h-[95vh] mx-4 flex ${
        (searchResults.length > 0 && !showImageSelector) || (imageSearchResults.length > 0 && activeTab === 'images')
          ? 'w-full max-w-[95vw]' 
          : 'w-full max-w-2xl'
      }`}>
        {/* Main Edit Form */}
        <div className={`${(searchResults.length > 0 && !showImageSelector) || (imageSearchResults.length > 0 && activeTab === 'images') ? 'w-1/2' : 'w-full'} overflow-y-auto flex flex-col`}>
          <div className="p-6 flex-1">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Edit Game</h2>
              <button
                onClick={handleClose}
                disabled={isSaving || isDeleting}
                className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-700 mb-6">
              <button
                type="button"
                onClick={() => setActiveTab('details')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'details'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('images')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'images'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Images
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
              <div className="space-y-4">
              {/* Name */}
              <div>
                <label htmlFor="game-name" className="block text-sm font-medium text-gray-300 mb-2">
                  Name *
                </label>
                <div className="flex gap-2">
                  <input
                    id="game-name"
                    type="text"
                    value={editedGame.title}
                    onChange={(e) => handleFieldChange('title', e.target.value)}
                    disabled={isSaving || isDeleting}
                    className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder="Enter game name"
                  />
                  <button
                    type="button"
                    onClick={handleSearchMetadata}
                    disabled={isSearchingMetadata || isSaving || isDeleting || !editedGame.title.trim()}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSearchingMetadata ? 'Searching...' : 'Search IGDB'}
                  </button>
                </div>
              </div>


            {/* Release Date */}
            <div>
              <label htmlFor="release-date" className="block text-sm font-medium text-gray-300 mb-2">
                Release Date
              </label>
              <input
                id="release-date"
                type="date"
                value={editedGame.releaseDate || ''}
                onChange={(e) => handleFieldChange('releaseDate', e.target.value)}
                disabled={isSaving || isDeleting}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Platform */}
            <div>
              <label htmlFor="platform" className="block text-sm font-medium text-gray-300 mb-2">
                Platform
              </label>
              <input
                id="platform"
                type="text"
                value={editedGame.platform || ''}
                onChange={(e) => handleFieldChange('platform', e.target.value)}
                disabled={isSaving || isDeleting}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="e.g., PC, PlayStation, Xbox"
              />
            </div>

            {/* Age Rating */}
            <div>
              <label htmlFor="age-rating" className="block text-sm font-medium text-gray-300 mb-2">
                Age Rating
              </label>
              <input
                id="age-rating"
                type="text"
                value={editedGame.ageRating || ''}
                onChange={(e) => handleFieldChange('ageRating', e.target.value)}
                disabled={isSaving || isDeleting}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="e.g., PEGI 18, ESRB M"
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                id="description"
                value={editedGame.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                disabled={isSaving || isDeleting}
                rows={4}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-y"
                placeholder="Game description..."
              />
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Categories
              </label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addCategory(categoryInput);
                    }
                  }}
                  disabled={isSaving || isDeleting}
                  className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  placeholder="Add category"
                />
                <button
                  type="button"
                  onClick={() => addCategory(categoryInput)}
                  disabled={isSaving || isDeleting || !categoryInput.trim()}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  +
                </button>
              </div>
              
              {/* Existing Categories for Quick Selection */}
              {allCategories.length > 0 && (
                <div className="mb-3">
                  <p className="text-xs text-gray-400 mb-2">Quick select existing categories:</p>
                  <div className="flex flex-wrap gap-2">
                    {allCategories
                      .filter(cat => !editedGame.categories?.includes(cat))
                      .map((category) => (
                        <button
                          key={category}
                          type="button"
                          onClick={() => addCategory(category)}
                          disabled={isSaving || isDeleting}
                          className="px-3 py-1 bg-gray-700/50 hover:bg-gray-700 border border-gray-600 hover:border-gray-500 rounded text-sm text-gray-300 transition-colors disabled:opacity-50"
                        >
                          + {category}
                        </button>
                      ))}
                  </div>
                </div>
              )}
              
              {/* Selected Categories */}
              {editedGame.categories && editedGame.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {editedGame.categories.map((category, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600/20 border border-blue-500/50 rounded text-sm text-blue-300"
                    >
                      {category}
                      <button
                        type="button"
                        onClick={() => removeCategory(category)}
                        disabled={isSaving || isDeleting}
                        className="text-blue-300 hover:text-blue-100 disabled:opacity-50"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/20 border border-red-500 rounded p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="bg-green-900/20 border border-green-500 rounded p-3">
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            )}

              </div>
            )}

            {/* Images Tab */}
            {activeTab === 'images' && (
              <div className="space-y-4">
                {/* Image Search */}
                <div>
                  <label htmlFor="image-search" className="block text-sm font-medium text-gray-300 mb-2">
                    Search for Images
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="image-search"
                      type="text"
                      value={imageSearchQuery}
                      onChange={(e) => setImageSearchQuery(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          handleSearchImages();
                        }
                      }}
                      disabled={isSearchingImages || isSaving || isDeleting}
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      placeholder={editedGame.title || "Enter game name to search"}
                    />
                    <button
                      type="button"
                      onClick={handleSearchImages}
                      disabled={isSearchingImages || isSaving || isDeleting || (!imageSearchQuery.trim() && !editedGame.title.trim())}
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSearchingImages ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </div>

                {/* Box Art URL */}
                <div>
                  <label htmlFor="box-art-url" className="block text-sm font-medium text-gray-300 mb-2">
                    Box Art URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="box-art-url"
                      type="text"
                      value={editedGame.boxArtUrl || ''}
                      onChange={(e) => handleFieldChange('boxArtUrl', e.target.value)}
                      disabled={isSaving || isDeleting}
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      placeholder="Enter box art image URL"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const path = await window.electronAPI.showImageDialog();
                        if (path) {
                          handleFieldChange('boxArtUrl', path);
                        }
                      }}
                      disabled={isSaving || isDeleting}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                      title="Browse for local image"
                    >
                      Browse
                    </button>
                  </div>
                  {editedGame.boxArtUrl && (
                    <div className="mt-3">
                      <img
                        src={editedGame.boxArtUrl}
                        alt="Box Art"
                        className="max-w-xs max-h-48 rounded border border-gray-600 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Banner URL */}
                <div>
                  <label htmlFor="banner-url" className="block text-sm font-medium text-gray-300 mb-2">
                    Banner URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="banner-url"
                      type="text"
                      value={editedGame.bannerUrl || ''}
                      onChange={(e) => handleFieldChange('bannerUrl', e.target.value)}
                      disabled={isSaving || isDeleting}
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      placeholder="Enter banner image URL"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const path = await window.electronAPI.showImageDialog();
                        if (path) {
                          handleFieldChange('bannerUrl', path);
                        }
                      }}
                      disabled={isSaving || isDeleting}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                      title="Browse for local image"
                    >
                      Browse
                    </button>
                  </div>
                  {editedGame.bannerUrl && (
                    <div className="mt-3">
                      <img
                        src={editedGame.bannerUrl}
                        alt="Banner"
                        className="max-w-full max-h-64 rounded border border-gray-600 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {/* Image Selector from IGDB */}
                {showImageSelector && selectedGameResult && (
                  <div className="border border-gray-600 rounded-lg p-4 bg-gray-700/30">
                    <h3 className="text-lg font-semibold text-white mb-4">
                      Select {showImageSelector === 'cover' ? 'Cover Art' : 'Banner Image'} from IGDB
                    </h3>
                    <div className="space-y-3">
                      {showImageSelector === 'cover' && selectedGameResult.coverUrl && (
                        <button
                          type="button"
                          onClick={() => handleSelectImage(selectedGameResult.coverUrl!, 'cover')}
                          className="w-full p-3 rounded-lg border border-gray-600 hover:bg-gray-700 hover:border-gray-500 transition-colors"
                        >
                          <img
                            src={selectedGameResult.coverUrl}
                            alt="Cover"
                            className="w-full h-auto rounded max-h-48 object-contain mx-auto"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                          <p className="text-white text-sm mt-2 text-center">Use this cover</p>
                        </button>
                      )}
                      
                      {showImageSelector === 'banner' && selectedGameResult.screenshotUrls && selectedGameResult.screenshotUrls.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                          {selectedGameResult.screenshotUrls.map((url, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleSelectImage(url, 'banner')}
                              className="p-2 rounded-lg border border-gray-600 hover:bg-gray-700 hover:border-gray-500 transition-colors"
                            >
                              <img
                                src={url}
                                alt={`Screenshot ${idx + 1}`}
                                className="w-full h-auto rounded max-h-32 object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <p className="text-white text-xs mt-1 text-center">Screenshot {idx + 1}</p>
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <button
                        type="button"
                        onClick={() => {
                          setShowImageSelector(null);
                          setSearchResults([]);
                          setSuccess('Metadata applied successfully');
                          setTimeout(() => setSuccess(null), 3000);
                        }}
                        className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors"
                      >
                        Skip Image Selection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="bg-red-900/20 border border-red-500 rounded p-4">
                <p className="text-red-400 font-semibold mb-3">
                  Are you sure you want to delete "{editedGame.title}"?
                </p>
                <p className="text-red-300 text-sm mb-4">
                  This action cannot be undone.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : 'Delete Game'}
                  </button>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              {onDelete && !showDeleteConfirm && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isSaving || isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                >
                  Delete Game
                </button>
              )}
              <button
                type="button"
                onClick={handleClose}
                disabled={isSaving || isDeleting}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isDeleting || !editedGame.title.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Search Results Side Panel (Details Tab) */}
        {searchResults.length > 0 && !showImageSelector && activeTab === 'details' && (
          <div className="w-1/2 border-l border-gray-700 overflow-y-auto bg-gray-800/50 flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Search Results ({searchResults.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setSearchResults([])}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Close results"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-3">
                {searchResults.map((result) => {
                  const releaseYear = result.releaseDate 
                    ? new Date(result.releaseDate * 1000).getFullYear().toString()
                    : '';
                  const isSelected = selectedGameResult?.id === result.id;
                  
                  return (
                    <button
                      key={result.id}
                      type="button"
                      onClick={() => handleSelectResult(result)}
                      className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-colors text-left ${
                        isSelected
                          ? 'bg-blue-600/30 border-blue-500 hover:bg-blue-600/40'
                          : 'border-gray-600 hover:bg-gray-700 hover:border-gray-500'
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
                        <h4 className="text-white font-semibold text-sm mb-1">
                          {result.name}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap mb-2">
                          {releaseYear && <span>{releaseYear}</span>}
                          {result.platform && <span className="truncate max-w-[200px]">{result.platform}</span>}
                          {result.ageRating && <span>{result.ageRating}</span>}
                          {result.genres && result.genres.length > 0 && (
                            <span>{result.genres.slice(0, 2).join(', ')}</span>
                          )}
                        </div>
                        {result.summary && (
                          <p className="text-xs text-gray-500 line-clamp-3">{result.summary}</p>
                        )}
                      </div>
                      
                      {/* Selection Indicator */}
                      {isSelected && (
                        <div className="flex-shrink-0">
                          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Image Search Results Side Panel (Images Tab) */}
        {imageSearchResults.length > 0 && activeTab === 'images' && (
          <div className="w-1/2 border-l border-gray-700 overflow-y-auto bg-gray-800/50 flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Image Search Results ({imageSearchResults.length})
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setImageSearchResults([]);
                    setSelectedImageResult(null);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Close results"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-4">
                {imageSearchResults.map((result) => {
                  const isSelected = selectedImageResult?.id === result.id;
                  
                  return (
                    <div
                      key={result.id}
                      className={`border rounded-lg p-4 transition-colors ${
                        isSelected
                          ? 'bg-blue-600/30 border-blue-500'
                          : 'border-gray-600 bg-gray-700/30'
                      }`}
                    >
                      <h4 className="text-white font-semibold text-sm mb-3">
                        {result.name}
                      </h4>
                      
                      {/* Cover Art */}
                      {result.coverUrl && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-400 mb-2">Cover Art</p>
                          <div className="relative group flex justify-center">
                            <div className="relative max-w-[200px]">
                              <img
                                src={result.coverUrl}
                                alt="Cover"
                                className="w-full max-h-64 rounded border border-gray-600 cursor-pointer hover:opacity-80 transition-opacity object-contain"
                                onClick={() => {
                                  setSelectedImageResult(result);
                                  handleSelectImageFromSearch(result.coverUrl!, 'cover');
                                }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedImageResult(result);
                                    handleSelectImageFromSearch(result.coverUrl!, 'cover');
                                  }}
                                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded"
                                >
                                  Use as Box Art
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Screenshots/Banners */}
                      {result.screenshotUrls && result.screenshotUrls.length > 0 && (
                        <div>
                          <p className="text-xs text-gray-400 mb-2">Screenshots ({result.screenshotUrls.length})</p>
                          <div className="grid grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                            {result.screenshotUrls.map((url, idx) => (
                              <div key={idx} className="relative group">
                                <img
                                  src={url}
                                  alt={`Screenshot ${idx + 1}`}
                                  className="w-full h-24 rounded border border-gray-600 cursor-pointer hover:opacity-80 transition-opacity object-cover"
                                  onClick={() => {
                                    setSelectedImageResult(result);
                                    handleSelectImageFromSearch(url, 'banner');
                                  }}
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedImageResult(result);
                                      handleSelectImageFromSearch(url, 'banner');
                                    }}
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded"
                                  >
                                    Use as Banner
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
