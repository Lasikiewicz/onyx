import React, { useState, useEffect } from 'react';
import { Game } from '../types/game';

interface GameEditorProps {
  isOpen: boolean;
  game: Game | null;
  onClose: () => void;
  onSave: (game: Game) => Promise<void>;
  onDelete?: (gameId: string) => Promise<void>;
  allCategories?: string[];
  initialTab?: 'details' | 'images' | 'modManager';
}

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

export const GameEditor: React.FC<GameEditorProps> = ({ isOpen, onClose, onSave, game, onDelete, allCategories = [], initialTab = 'details' }) => {
  const [editedGame, setEditedGame] = useState<Game | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedGameResult, setSelectedGameResult] = useState<IGDBGameResult | null>(null);
  const [gameSearchResults, setGameSearchResults] = useState<Array<{
    id: string;
    title: string;
    source: string;
    externalId?: string | number;
    steamAppId?: string;
    year?: number;
    platform?: string;
  }>>([]);
  const [isApplyingMetadata, setIsApplyingMetadata] = useState(false);
  const [showImageSelector, setShowImageSelector] = useState<'cover' | 'banner' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [categoryInput, setCategoryInput] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'details' | 'images' | 'modManager'>('details');
  const [imageSearchQuery, setImageSearchQuery] = useState<string>('');
  const [isSearchingImages, setIsSearchingImages] = useState(false);
  const [imageSearchResults, setImageSearchResults] = useState<IGDBGameResult[]>([]);
  const [selectedImageResult, setSelectedImageResult] = useState<IGDBGameResult | null>(null);
  const [steamGridDBResults, setSteamGridDBResults] = useState<{
    boxart: Array<{ gameId: number; gameName: string; images: Array<{ url: string; score: number; width: number; height: number }> }>;
    banner: Array<{ gameId: number; gameName: string; images: Array<{ url: string; score: number; width: number; height: number }> }>;
    logo: Array<{ gameId: number; gameName: string; images: Array<{ url: string; score: number; width: number; height: number }> }>;
  }>({ boxart: [], banner: [], logo: [] });
  const [searchingImageType, setSearchingImageType] = useState<'boxart' | 'banner' | 'logo' | null>(null);
  const [lastSearchedImageType, setLastSearchedImageType] = useState<'boxart' | 'banner' | 'logo' | null>(null);

  useEffect(() => {
    if (game && isOpen) {
      setEditedGame({ ...game });
      setError(null);
      setSuccess(null);
      setGameSearchResults([]);
      setImageSearchResults([]);
      setSteamGridDBResults({ boxart: [], banner: [], logo: [] });
      setShowDeleteConfirm(false);
      setActiveTab(initialTab);
      setImageSearchQuery('');
      setSelectedImageResult(null);
      setSearchingImageType(null);
      setLastSearchedImageType(null);
      setIsApplyingMetadata(false);
      // Reset loading states when opening a new game
      setIsSaving(false);
      setIsDeleting(false);
      setIsSearchingMetadata(false);
      setIsSearchingImages(false);
    } else if (!isOpen) {
      // Reset all state when modal closes
      setEditedGame(null);
      setIsSaving(false);
      setIsDeleting(false);
      setIsSearchingMetadata(false);
      setIsSearchingImages(false);
      setError(null);
      setSuccess(null);
      setGameSearchResults([]);
      setImageSearchResults([]);
      setSteamGridDBResults({ boxart: [], banner: [], logo: [] });
      setShowDeleteConfirm(false);
      setSelectedGameResult(null);
      setSelectedImageResult(null);
      setSearchingImageType(null);
      setLastSearchedImageType(null);
      setIsApplyingMetadata(false);
      setShowImageSelector(null);
    }
  }, [game, isOpen, initialTab]);

  if (!isOpen || !editedGame) return null;

  const handleFieldChange = (field: keyof Game, value: any) => {
    setEditedGame({ ...editedGame, [field]: value });
  };


  const handleSearchMetadata = async () => {
    if (!editedGame.title.trim()) {
      setError('Please enter a game title to search');
      return;
    }

    setIsSearchingMetadata(true);
    setError(null);
    setGameSearchResults([]);

    try {
      const response = await window.electronAPI.searchGames(editedGame.title.trim());
      if (response.success && response.results && response.results.length > 0) {
        // Transform results to include year and platform info
        const transformedResults = response.results.map((result: any) => {
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
        setGameSearchResults(transformedResults);
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

  const handleSelectMetadataMatch = async (result: { id: string; source: string }) => {
    if (!editedGame) return;

    setIsApplyingMetadata(true);
    setError(null);
    try {
      const response = await window.electronAPI.fetchAndUpdateByProviderId(
        editedGame.id,
        result.id,
        result.source
      );

      if (response.success && response.metadata) {
        // Update the edited game with the new metadata
        const updatedGame: Game = {
          ...editedGame,
          title: response.metadata.title || editedGame.title,
          description: response.metadata.description || editedGame.description,
          releaseDate: response.metadata.releaseDate || editedGame.releaseDate,
          platform: response.metadata.platform || editedGame.platform || 'other',
          ageRating: response.metadata.ageRating || editedGame.ageRating,
          categories: response.metadata.categories || editedGame.categories || [],
          genres: response.metadata.genres || editedGame.genres || [],
          boxArtUrl: response.metadata.boxArtUrl || editedGame.boxArtUrl,
          bannerUrl: response.metadata.bannerUrl || editedGame.bannerUrl,
          logoUrl: response.metadata.logoUrl || editedGame.logoUrl,
        };
        setEditedGame(updatedGame);
        setGameSearchResults([]);
        setSuccess('Metadata updated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to update metadata');
      }
    } catch (err) {
      setError('Failed to update metadata');
      console.error('Error updating metadata:', err);
    } finally {
      setIsApplyingMetadata(false);
    }
  };


  const handleSelectImage = (imageUrl: string, type: 'cover' | 'banner' | 'logo') => {
    if (!editedGame) return;
    
    if (type === 'cover') {
      setEditedGame({ ...editedGame, boxArtUrl: imageUrl });
    } else if (type === 'banner') {
      setEditedGame({ ...editedGame, bannerUrl: imageUrl });
    } else if (type === 'logo') {
      setEditedGame({ ...editedGame, logoUrl: imageUrl });
    }
    
    setShowImageSelector(null);
    setSelectedGameResult(null);
    setSuccess('Metadata applied successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSearchImages = async (imageType: 'boxart' | 'banner' | 'logo') => {
    const query = imageSearchQuery.trim() || editedGame.title.trim();
    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setIsSearchingImages(true);
    setSearchingImageType(imageType);
    setError(null);
    setSelectedImageResult(null);

    // Clear all results when starting a new search
    setImageSearchResults([]);
    setSteamGridDBResults({ boxart: [], banner: [], logo: [] });

    try {
      // Search IGDB for metadata (only if searching for boxart or banner, as IGDB doesn't have logo search)
      let igdbResponse = null;
      if (imageType === 'boxart' || imageType === 'banner') {
        igdbResponse = await window.electronAPI.searchMetadata(query);
      }
      
      // Search SteamGridDB for the specific image type
      const sgdbResponse = await window.electronAPI.searchImages(query, imageType);

      // Process IGDB results - filter to only show relevant images
      let filteredIGDBResults: IGDBGameResult[] = [];
      if (igdbResponse && igdbResponse.success && igdbResponse.results && igdbResponse.results.length > 0) {
        // Filter results to only include games that have the relevant image type
        filteredIGDBResults = igdbResponse.results.filter(result => {
          if (imageType === 'boxart') {
            return result.coverUrl; // Only show games with cover art
          } else if (imageType === 'banner') {
            return result.screenshotUrls && result.screenshotUrls.length > 0; // Only show games with screenshots
          }
          return false;
        });
        setImageSearchResults(filteredIGDBResults);
      } else {
        setImageSearchResults([]);
      }

      // Process SteamGridDB results - only set the searched type
      if (sgdbResponse.success && sgdbResponse.images) {
        if (imageType === 'boxart') {
          setSteamGridDBResults(prev => ({ ...prev, boxart: sgdbResponse.images }));
        } else if (imageType === 'banner') {
          setSteamGridDBResults(prev => ({ ...prev, banner: sgdbResponse.images }));
        } else if (imageType === 'logo') {
          setSteamGridDBResults(prev => ({ ...prev, logo: sgdbResponse.images }));
        }
      }

      // Show error only if both searches failed
      const hasIGDBResults = filteredIGDBResults.length > 0;
      const hasSGDBResults = sgdbResponse.success && sgdbResponse.images && sgdbResponse.images.length > 0;

      if (!hasIGDBResults && !hasSGDBResults) {
        setError(`No ${imageType} results found`);
      }
    } catch (err) {
      setError(`Failed to search for ${imageType}`);
      console.error(`Error searching ${imageType}:`, err);
    } finally {
      setIsSearchingImages(false);
      setSearchingImageType(null);
      setLastSearchedImageType(imageType);
    }
  };

  const handleSelectImageFromSearch = (imageUrl: string, type: 'cover' | 'banner' | 'logo') => {
    if (!editedGame) return;
    
    if (type === 'cover') {
      setEditedGame({ ...editedGame, boxArtUrl: imageUrl });
    } else if (type === 'banner') {
      setEditedGame({ ...editedGame, bannerUrl: imageUrl });
    } else if (type === 'logo') {
      setEditedGame({ ...editedGame, logoUrl: imageUrl });
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
      // Reset deleting state before closing
      setIsDeleting(false);
      setShowDeleteConfirm(false);
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
    // Always allow closing, but reset states first
    if (isSaving || isDeleting) {
      // If in the middle of an operation, just close anyway to prevent stuck state
      setIsSaving(false);
      setIsDeleting(false);
    }
    setError(null);
    setSuccess(null);
    setGameSearchResults([]);
    setImageSearchResults([]);
    setSteamGridDBResults({ boxart: [], banner: [], logo: [] });
    setSelectedGameResult(null);
    setSelectedImageResult(null);
    setSearchingImageType(null);
    setLastSearchedImageType(null);
    setIsApplyingMetadata(false);
    setShowImageSelector(null);
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`bg-gray-800 rounded-lg shadow-xl border border-gray-700 h-[95vh] mx-4 flex ${
        (gameSearchResults.length > 0 && activeTab === 'details') || ((imageSearchResults.length > 0 || steamGridDBResults.boxart.length > 0 || steamGridDBResults.banner.length > 0 || steamGridDBResults.logo.length > 0) && activeTab === 'images')
          ? 'w-full max-w-[95vw]' 
          : 'w-full max-w-[90vw]'
      }`}>
        {/* Main Edit Form */}
        <div className={`${(gameSearchResults.length > 0 && activeTab === 'details') || ((imageSearchResults.length > 0 || steamGridDBResults.boxart.length > 0 || steamGridDBResults.banner.length > 0 || steamGridDBResults.logo.length > 0) && activeTab === 'images') ? 'w-1/2' : 'w-full'} flex flex-col`}>
          <div className="p-6 flex-1 overflow-y-auto">
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
              <button
                type="button"
                onClick={() => setActiveTab('modManager')}
                className={`px-6 py-3 font-medium transition-colors ${
                  activeTab === 'modManager'
                    ? 'text-white border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-gray-300'
                }`}
              >
                Mod Manager
              </button>
            </div>

            {/* Tab Content */}
            {activeTab === 'details' && (
              <div className="grid grid-cols-2 gap-6">
              {/* Left Column: Name, Description, Categories */}
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
                    {isSearchingMetadata ? 'Searching...' : 'Update Metadata'}
                  </button>
                </div>
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
                  rows={6}
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
              </div>

              {/* Right Column: Other Fields */}
              <div className="space-y-4">
              {/* Basic Information Section */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">Basic Information</h3>
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

            {/* Genres */}
            <div>
              <label htmlFor="genres" className="block text-sm font-medium text-gray-300 mb-2">
                Genres
              </label>
              <input
                id="genres"
                type="text"
                value={editedGame.genres?.join(', ') || ''}
                onChange={(e) => {
                  const genres = e.target.value.split(',').map(g => g.trim()).filter(g => g);
                  handleFieldChange('genres', genres);
                }}
                disabled={isSaving || isDeleting}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                placeholder="Comma-separated genres (e.g., Action, Adventure, RPG)"
              />
            </div>

            </div>

            {/* Error Message */}
            {error && (
              <div className="col-span-2 bg-red-900/20 border border-red-500 rounded p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="col-span-2 bg-green-900/20 border border-green-500 rounded p-3">
                <p className="text-green-400 text-sm">{success}</p>
              </div>
            )}

              </div>
            )}

            {/* Images Tab */}
            {activeTab === 'images' && (
              <div className="space-y-4">
                {/* Image Search Input */}
                <div>
                  <label htmlFor="image-search" className="block text-sm font-medium text-gray-300 mb-2">
                    Search Query
                  </label>
                  <input
                    id="image-search"
                    type="text"
                    value={imageSearchQuery}
                    onChange={(e) => setImageSearchQuery(e.target.value)}
                    disabled={isSearchingImages || isSaving || isDeleting}
                    className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    placeholder={editedGame.title || "Enter game name to search"}
                  />
                </div>

                {/* Images Grid - Box Art, Banner, Logo */}
                <div className="grid grid-cols-3 gap-4">
                  {/* Box Art URL */}
                  <div>
                    <label htmlFor="box-art-url" className="block text-sm font-medium text-gray-300 mb-2">
                      Box Art URL
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        id="box-art-url"
                        type="text"
                        value={editedGame.boxArtUrl || ''}
                        onChange={(e) => handleFieldChange('boxArtUrl', e.target.value)}
                        disabled={isSaving || isDeleting}
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
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
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
                        title="Browse for local image"
                      >
                        Browse
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSearchImages('boxart')}
                      disabled={isSearchingImages || isSaving || isDeleting || (!imageSearchQuery.trim() && !editedGame.title.trim())}
                      className="w-full mb-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isSearchingImages && searchingImageType === 'boxart' ? 'Searching...' : 'Search Box Art'}
                    </button>
                    {editedGame.boxArtUrl && (
                      <div className="mt-2">
                        <img
                          src={editedGame.boxArtUrl}
                          alt="Box Art"
                          className="w-full max-h-48 rounded border border-gray-600 object-contain"
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
                    <div className="flex gap-2 mb-2">
                      <input
                        id="banner-url"
                        type="text"
                        value={editedGame.bannerUrl || ''}
                        onChange={(e) => handleFieldChange('bannerUrl', e.target.value)}
                        disabled={isSaving || isDeleting}
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
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
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
                        title="Browse for local image"
                      >
                        Browse
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSearchImages('banner')}
                      disabled={isSearchingImages || isSaving || isDeleting || (!imageSearchQuery.trim() && !editedGame.title.trim())}
                      className="w-full mb-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isSearchingImages && searchingImageType === 'banner' ? 'Searching...' : 'Search Banner'}
                    </button>
                    {editedGame.bannerUrl && (
                      <div className="mt-2">
                        <img
                          src={editedGame.bannerUrl}
                          alt="Banner"
                          className="w-full max-h-48 rounded border border-gray-600 object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* Logo URL */}
                  <div>
                    <label htmlFor="logo-url" className="block text-sm font-medium text-gray-300 mb-2">
                      Logo URL
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        id="logo-url"
                        type="text"
                        value={editedGame.logoUrl || ''}
                        onChange={(e) => handleFieldChange('logoUrl', e.target.value)}
                        disabled={isSaving || isDeleting}
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
                        placeholder="Enter logo image URL"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const path = await window.electronAPI.showImageDialog();
                          if (path) {
                            handleFieldChange('logoUrl', path);
                          }
                        }}
                        disabled={isSaving || isDeleting}
                        className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
                        title="Browse for local image"
                      >
                        Browse
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSearchImages('logo')}
                      disabled={isSearchingImages || isSaving || isDeleting || (!imageSearchQuery.trim() && !editedGame.title.trim())}
                      className="w-full mb-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isSearchingImages && searchingImageType === 'logo' ? 'Searching...' : 'Search Logo'}
                    </button>
                    {editedGame.logoUrl && (
                      <div className="mt-2">
                        <div className="w-full max-h-48 bg-gray-700 rounded border border-gray-600 flex items-center justify-center p-4">
                          <img
                            src={editedGame.logoUrl}
                            alt="Logo"
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
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

            {/* Mod Manager Tab */}
            {activeTab === 'modManager' && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="mod-manager-url" className="block text-sm font-medium text-gray-300 mb-2">
                    Mod Manager Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="mod-manager-url"
                      type="text"
                      value={editedGame.modManagerUrl || ''}
                      onChange={(e) => handleFieldChange('modManagerUrl', e.target.value)}
                      disabled={isSaving || isDeleting}
                      className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      placeholder="Enter mod manager URL or path (e.g., https://example.com/mod-manager)"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const path = await window.electronAPI.showOpenDialog();
                        if (path) {
                          handleFieldChange('modManagerUrl', path);
                        }
                      }}
                      disabled={isSaving || isDeleting}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                      title="Browse for mod manager executable"
                    >
                      Browse
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Enter the URL or path to your mod manager. This will appear in the game's context menu and bottom bar.
                  </p>
                </div>
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
          </div>

          {/* Action Buttons - Pinned to Bottom */}
          <div className="p-6 pt-0 flex-shrink-0">
            <div className="flex gap-3">
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
        {gameSearchResults.length > 0 && activeTab === 'details' && (
          <div className="w-1/2 border-l border-gray-700 overflow-y-auto bg-gray-800/50 flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Matching Games ({gameSearchResults.length})
                </h3>
                <button
                  type="button"
                  onClick={() => setGameSearchResults([])}
                  className="text-gray-400 hover:text-white transition-colors"
                  title="Close results"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-400 mb-4">
                  Found {gameSearchResults.length} result{gameSearchResults.length !== 1 ? 's' : ''}. Select the correct match:
                </p>
                {gameSearchResults.map((result) => (
                  <button
                    key={result.id}
                    type="button"
                    onClick={() => handleSelectMetadataMatch(result)}
                    disabled={isApplyingMetadata}
                    className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg border border-gray-600 hover:border-gray-500 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-semibold text-white">{result.title}</h4>
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
                      {isApplyingMetadata && (
                        <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Image Search Results Side Panel (Images Tab) */}
        {(imageSearchResults.length > 0 || steamGridDBResults.boxart.length > 0 || steamGridDBResults.banner.length > 0 || steamGridDBResults.logo.length > 0) && activeTab === 'images' && (
          <div className="w-1/2 border-l border-gray-700 overflow-y-auto bg-gray-800/50 flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {lastSearchedImageType === 'boxart' && 'Box Art Search Results'}
                  {lastSearchedImageType === 'banner' && 'Banner Search Results'}
                  {lastSearchedImageType === 'logo' && 'Logo Search Results'}
                  {!lastSearchedImageType && 'Image Search Results'}
                  {imageSearchResults.length > 0 && ` (IGDB: ${imageSearchResults.length})`}
                  {((lastSearchedImageType === 'boxart' && steamGridDBResults.boxart.length > 0) ||
                    (lastSearchedImageType === 'banner' && steamGridDBResults.banner.length > 0) ||
                    (lastSearchedImageType === 'logo' && steamGridDBResults.logo.length > 0)) && 
                    ` (SteamGridDB: ${lastSearchedImageType === 'boxart' ? steamGridDBResults.boxart.length : lastSearchedImageType === 'banner' ? steamGridDBResults.banner.length : steamGridDBResults.logo.length} games)`}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setImageSearchResults([]);
                    setSelectedImageResult(null);
                    setSteamGridDBResults({ boxart: [], banner: [], logo: [] });
                    setLastSearchedImageType(null);
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
                {/* SteamGridDB Results - Only show the searched type */}
                {((lastSearchedImageType === 'boxart' && steamGridDBResults.boxart.length > 0) ||
                  (lastSearchedImageType === 'banner' && steamGridDBResults.banner.length > 0) ||
                  (lastSearchedImageType === 'logo' && steamGridDBResults.logo.length > 0)) && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-white mb-3 border-b border-gray-600 pb-2">SteamGridDB Results</h4>
                    
                    {/* Box Art from SteamGridDB - Only show when searching for boxart */}
                    {lastSearchedImageType === 'boxart' && steamGridDBResults.boxart.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-300 mb-2">Box Art</p>
                        <div className="space-y-3">
                          {steamGridDBResults.boxart.map((gameResult) => (
                            <div key={gameResult.gameId} className="border border-gray-600 rounded-lg p-3 bg-gray-700/30">
                              <p className="text-xs text-gray-400 mb-2">{gameResult.gameName}</p>
                              <div className="grid grid-cols-3 gap-2">
                                {gameResult.images.slice(0, 6).map((img, idx) => (
                                  <div key={idx} className="relative group">
                                    <img
                                      src={img.url}
                                      alt={`Box Art ${idx + 1}`}
                                      className="w-full h-24 rounded border border-gray-600 cursor-pointer hover:opacity-80 transition-opacity object-cover"
                                      onClick={() => handleSelectImageFromSearch(img.url, 'cover')}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                                      <button
                                        type="button"
                                        onClick={() => handleSelectImageFromSearch(img.url, 'cover')}
                                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded"
                                      >
                                        Use
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Banner from SteamGridDB - Only show when searching for banner */}
                    {lastSearchedImageType === 'banner' && steamGridDBResults.banner.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-300 mb-2">Banners</p>
                        <div className="space-y-3">
                          {steamGridDBResults.banner.map((gameResult) => (
                            <div key={gameResult.gameId} className="border border-gray-600 rounded-lg p-3 bg-gray-700/30">
                              <p className="text-xs text-gray-400 mb-2">{gameResult.gameName}</p>
                              <div className="grid grid-cols-3 gap-2">
                                {gameResult.images.slice(0, 6).map((img, idx) => (
                                  <div key={idx} className="relative group">
                                    <img
                                      src={img.url}
                                      alt={`Banner ${idx + 1}`}
                                      className="w-full h-24 rounded border border-gray-600 cursor-pointer hover:opacity-80 transition-opacity object-cover"
                                      onClick={() => handleSelectImageFromSearch(img.url, 'banner')}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                                      <button
                                        type="button"
                                        onClick={() => handleSelectImageFromSearch(img.url, 'banner')}
                                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded"
                                      >
                                        Use
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Logo from SteamGridDB - Only show when searching for logo */}
                    {lastSearchedImageType === 'logo' && steamGridDBResults.logo.length > 0 && (
                      <div className="mb-4">
                        <p className="text-sm font-medium text-gray-300 mb-2">Logos</p>
                        <div className="space-y-3">
                          {steamGridDBResults.logo.map((gameResult) => (
                            <div key={gameResult.gameId} className="border border-gray-600 rounded-lg p-3 bg-gray-700/30">
                              <p className="text-xs text-gray-400 mb-2">{gameResult.gameName}</p>
                              <div className="grid grid-cols-3 gap-2">
                                {gameResult.images.slice(0, 6).map((img, idx) => (
                                  <div key={idx} className="relative group bg-gray-800 rounded border border-gray-600 p-2">
                                    <img
                                      src={img.url}
                                      alt={`Logo ${idx + 1}`}
                                      className="w-full h-20 object-contain cursor-pointer hover:opacity-80 transition-opacity"
                                      onClick={() => handleSelectImageFromSearch(img.url, 'logo')}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                                      <button
                                        type="button"
                                        onClick={() => handleSelectImageFromSearch(img.url, 'logo')}
                                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded"
                                      >
                                        Use
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* IGDB Results - Only show relevant image type */}
                {imageSearchResults.length > 0 && (lastSearchedImageType === 'boxart' || lastSearchedImageType === 'banner') && (
                  <div>
                    <h4 className="text-md font-semibold text-white mb-3 border-b border-gray-600 pb-2">IGDB Results</h4>
                {imageSearchResults.map((result) => {
                  const isSelected = selectedImageResult?.id === result.id;
                  
                  return (
                    <div
                      key={result.id}
                      className={`border rounded-lg p-4 transition-colors mb-4 ${
                        isSelected
                          ? 'bg-blue-600/30 border-blue-500'
                          : 'border-gray-600 bg-gray-700/30'
                      }`}
                    >
                      <h4 className="text-white font-semibold text-sm mb-3">
                        {result.name}
                      </h4>
                      
                      {/* Cover Art - Only show when searching for boxart */}
                      {lastSearchedImageType === 'boxart' && result.coverUrl && (
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
                      
                      {/* Screenshots/Banners - Only show when searching for banner */}
                      {lastSearchedImageType === 'banner' && result.screenshotUrls && result.screenshotUrls.length > 0 && (
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
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
