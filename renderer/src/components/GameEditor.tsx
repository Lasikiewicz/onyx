import React, { useState, useEffect } from 'react';
import { Game } from '../types/game';
import { ImageSelector, ImageResult } from './ImageSelector';

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

interface FastSearchGame {
  id: number;
  name: string;
  coverUrl: string;
  bannerUrl: string;
  logoUrl: string;
  screenshotUrls: string[];
  steamAppId?: string;
  releaseDate?: number;
  source: string;
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
  const [steamGridDBResults, setSteamGridDBResults] = useState<{
    boxart: Array<{ gameId: number; gameName: string; images: Array<{ url: string; score: number; width: number; height: number }> }>;
    banner: Array<{ gameId: number; gameName: string; images: Array<{ url: string; score: number; width: number; height: number }> }>;
    logo: Array<{ gameId: number; gameName: string; images: Array<{ url: string; score: number; width: number; height: number }> }>;
  }>({ boxart: [], banner: [], logo: [] });
  const [searchingImageType, setSearchingImageType] = useState<'boxart' | 'banner' | 'logo' | 'icon' | null>(null);
  const [lastSearchedImageType, setLastSearchedImageType] = useState<'boxart' | 'banner' | 'logo' | 'icon' | null>(null);
  const [showPlaytime, setShowPlaytime] = useState(false);
  const [isSyncingPlaytime, setIsSyncingPlaytime] = useState(false);
  const [isWebSearchingImages, setIsWebSearchingImages] = useState(false);
  const [unifiedImageResults, setUnifiedImageResults] = useState<ImageResult[]>([]);
  const [isFastSearching, setIsFastSearching] = useState(false);
  const [fastSearchResults, setFastSearchResults] = useState<FastSearchGame[]>([]);
  const [selectedFastGame, setSelectedFastGame] = useState<FastSearchGame | null>(null);

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
      setSearchingImageType(null);
      setLastSearchedImageType(null);
      setIsApplyingMetadata(false);
      setShowPlaytime(false);
      setIsSyncingPlaytime(false);
      // Reset loading states when opening a new game
      setIsSaving(false);
      setIsDeleting(false);
      setIsSearchingMetadata(false);
      setIsSearchingImages(false);
      setIsFastSearching(false);
      setFastSearchResults([]);
      setSelectedFastGame(null);
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
      setSearchingImageType(null);
      setLastSearchedImageType(null);
      setIsApplyingMetadata(false);
      setShowPlaytime(false);
      setIsSyncingPlaytime(false);
      setShowImageSelector(null);
      setIsFastSearching(false);
      setFastSearchResults([]);
      setSelectedFastGame(null);
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


  const handleSelectImage = (imageUrl: string, type: 'cover' | 'banner' | 'logo' | 'icon') => {
    if (!editedGame) return;

    if (type === 'cover') {
      setEditedGame({ ...editedGame, boxArtUrl: imageUrl });
    } else if (type === 'banner') {
      setEditedGame({ ...editedGame, bannerUrl: imageUrl });
    } else if (type === 'logo') {
      setEditedGame({ ...editedGame, logoUrl: imageUrl });
    } else if (type === 'icon') {
      setEditedGame({ ...editedGame, iconUrl: imageUrl });
    }

    setShowImageSelector(null);
    setSelectedGameResult(null);
    setSuccess('Metadata applied successfully');
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSearchImages = async (imageType: 'boxart' | 'banner' | 'logo' | 'icon', useWeb: boolean = false) => {
    const query = imageSearchQuery.trim() || editedGame.title.trim();
    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    if (useWeb) {
      setIsWebSearchingImages(true);
    } else {
      setIsSearchingImages(true);
    }

    setSearchingImageType(imageType);
    setError(null);

    // Clear all results when starting a new provider search
    if (!useWeb) {
      setImageSearchResults([]);
      setSteamGridDBResults({ boxart: [], banner: [], logo: [] });
      setUnifiedImageResults([]);
    }

    // Helper to merge and sort results
    const updateResults = (newResults: ImageResult[]) => {
      setUnifiedImageResults(prev => {
        const normalizedQuery = query.toLowerCase().trim();
        const seenUrls = new Set(prev.map(r => r.url));
        const uniqueNew = newResults.filter(r => !seenUrls.has(r.url));
        const combined = [...prev, ...uniqueNew];

        return combined.sort((a, b) => {
          const aTitle = (a.title || '').toLowerCase().trim();
          const bTitle = (b.title || '').toLowerCase().trim();

          const aExact = aTitle === normalizedQuery;
          const bExact = bTitle === normalizedQuery;

          if (aExact && !bExact) return -1;
          if (!aExact && bExact) return 1;

          return (b.score || 0) - (a.score || 0);
        });
      });
    };

    try {
      if (useWeb) {
        const response = await window.electronAPI.searchWebImages(query, imageType);
        if (response.success && response.images) {
          const results: ImageResult[] = [];
          response.images.forEach((gameResult: any) => {
            results.push(...gameResult.images);
          });
          updateResults(results);
        }
      } else {
        // Define independent fetchers
        const fetchIgdb = async () => {
          if (imageType !== 'boxart' && imageType !== 'banner') return;

          try {
            const response = await window.electronAPI.searchMetadata(query);
            if (response && response.success && response.results) {
              const results: ImageResult[] = [];
              response.results.forEach((result: any) => {
                if (imageType === 'boxart' && result.coverUrl) {
                  results.push({
                    id: `igdb-${result.id}-cover`,
                    url: result.coverUrl,
                    title: result.name,
                    source: 'igdb'
                  });
                } else if (imageType === 'banner' && result.screenshotUrls) {
                  result.screenshotUrls.forEach((url: string, idx: number) => {
                    results.push({
                      id: `igdb-${result.id}-screenshot-${idx}`,
                      url: url,
                      title: result.name,
                      source: 'igdb'
                    });
                  });
                }
              });
              updateResults(results);
            }
          } catch (e) {
            console.warn('IGDB search failed:', e);
          }
        };

        const fetchSgdb = async () => {
          try {
            const response = await window.electronAPI.searchImages(query, imageType);
            if (response && response.success && response.images) {
              const results: ImageResult[] = [];
              response.images.forEach((gameResult: any) => {
                gameResult.images.forEach((img: any) => {
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
              updateResults(results);
            }
          } catch (e) {
            console.warn('SteamGridDB search failed:', e);
          }
        };

        // Run concurrently
        await Promise.all([fetchIgdb(), fetchSgdb()]);
      }

      // Final check for empty results (handled by UI, but good to set error if absolutely nothing)
      setUnifiedImageResults(current => {
        if (current.length === 0 && !useWeb) {
          setError(`No ${imageType} results found`);
        }
        return current;
      });

    } catch (err) {
      setError(`Failed to search for ${imageType}`);
      console.error(`Error searching ${imageType}:`, err);
    } finally {
      setIsSearchingImages(false);
      setIsWebSearchingImages(false);
      setSearchingImageType(null);
      setLastSearchedImageType(imageType);
    }
  };

  // Aggregated fast search - fetches all images at once with no rate limiting
  const handleFastSearch = async () => {
    const query = imageSearchQuery.trim() || editedGame.title.trim();
    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setIsFastSearching(true);
    setError(null);
    setFastSearchResults([]);
    setSelectedFastGame(null);
    setUnifiedImageResults([]);

    try {
      console.log(`[FastSearch] Searching for "${query}"...`);
      const startTime = Date.now();

      const response = await (window.electronAPI as any).fastImageSearch(query);

      console.log(`[FastSearch] Completed in ${Date.now() - startTime}ms`);

      if (response.success && response.games && response.games.length > 0) {
        setFastSearchResults(response.games);
        setSuccess(`Found ${response.games.length} game(s) in ${Date.now() - startTime}ms`);
        setTimeout(() => setSuccess(null), 3000);
      } else if (response.error) {
        setError(response.error);
      } else {
        setError('No games found');
      }
    } catch (err) {
      setError('Failed to search for images');
      console.error('[FastSearch] Error:', err);
    } finally {
      setIsFastSearching(false);
    }
  };

  // Apply images from a fast search result
  const handleApplyFastSearchGame = (gameResult: FastSearchGame) => {
    if (!editedGame) return;

    setSelectedFastGame(gameResult);

    // Apply all available images
    const updates: Partial<typeof editedGame> = {};
    if (gameResult.coverUrl) updates.boxArtUrl = gameResult.coverUrl;
    if (gameResult.bannerUrl) updates.bannerUrl = gameResult.bannerUrl;
    if (gameResult.logoUrl) updates.logoUrl = gameResult.logoUrl;

    setEditedGame({ ...editedGame, ...updates });
    setSuccess(`Applied images from "${gameResult.name}"`);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSelectImageFromSearch = (imageUrl: string, type: 'cover' | 'banner' | 'logo' | 'icon') => {
    if (!editedGame) return;

    if (type === 'cover') {
      setEditedGame({ ...editedGame, boxArtUrl: imageUrl });
    } else if (type === 'banner') {
      setEditedGame({ ...editedGame, bannerUrl: imageUrl });
    } else if (type === 'logo') {
      setEditedGame({ ...editedGame, logoUrl: imageUrl });
    } else if (type === 'icon') {
      setEditedGame({ ...editedGame, iconUrl: imageUrl });
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
    setSearchingImageType(null);
    setLastSearchedImageType(null);
    setIsApplyingMetadata(false);
    setShowImageSelector(null);
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className={`bg-gray-800 rounded-lg shadow-xl border border-gray-700 h-[95vh] mx-4 flex ${(gameSearchResults.length > 0 && activeTab === 'details') || ((imageSearchResults.length > 0 || steamGridDBResults.boxart.length > 0 || steamGridDBResults.banner.length > 0 || steamGridDBResults.logo.length > 0) && activeTab === 'images')
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
                className={`px-6 py-3 font-medium transition-colors ${activeTab === 'details'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
                  }`}
              >
                Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('images')}
                className={`px-6 py-3 font-medium transition-colors ${activeTab === 'images'
                  ? 'text-white border-b-2 border-blue-500'
                  : 'text-gray-400 hover:text-gray-300'
                  }`}
              >
                Images
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('modManager')}
                className={`px-6 py-3 font-medium transition-colors ${activeTab === 'modManager'
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

                  {/* Playtime Section - Only for Steam games */}
                  {editedGame.id.startsWith('steam-') && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-300">
                          Game Time
                        </label>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              setIsSyncingPlaytime(true);
                              try {
                                const result = await window.electronAPI.syncSteamPlaytime?.();
                                if (result?.success) {
                                  setSuccess(`Synced playtime for ${result.updatedCount || 0} game(s)`);
                                  // Reload the game to get updated playtime
                                  if (game) {
                                    const library = await window.electronAPI.getLibrary();
                                    const updatedGame = library.find(g => g.id === game.id);
                                    if (updatedGame) {
                                      setEditedGame({ ...updatedGame });
                                    }
                                  }
                                } else {
                                  setError(result?.error || 'Failed to sync playtime');
                                }
                              } catch (err) {
                                setError(err instanceof Error ? err.message : 'Failed to sync playtime');
                              } finally {
                                setIsSyncingPlaytime(false);
                              }
                            }}
                            disabled={isSyncingPlaytime || isSaving || isDeleting}
                            className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Sync playtime from Steam"
                          >
                            {isSyncingPlaytime ? 'Syncing...' : 'Sync'}
                          </button>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={showPlaytime}
                              onChange={(e) => setShowPlaytime(e.target.checked)}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                      {showPlaytime && editedGame.playtime !== undefined && editedGame.playtime > 0 && (
                        <div className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg">
                          <div className="text-white text-sm">
                            <span className="font-medium">{Math.floor(editedGame.playtime / 60)}</span> hours{' '}
                            <span className="text-gray-400">
                              ({editedGame.playtime} minutes)
                            </span>
                          </div>
                        </div>
                      )}
                      {showPlaytime && (!editedGame.playtime || editedGame.playtime === 0) && (
                        <div className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg">
                          <div className="text-gray-400 text-sm">
                            No playtime data available. Click "Sync" to fetch from Steam.
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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

                {/* Quick Search All - Aggregated instant search */}
                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={handleFastSearch}
                    disabled={isFastSearching || isSaving || isDeleting || (!imageSearchQuery.trim() && !editedGame.title.trim())}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded-lg transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isFastSearching ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>Searching...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Quick Search All (Instant)</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Fast Search Results - Game Selection Grid */}
                {fastSearchResults.length > 0 && (
                  <div className="bg-gray-900/50 rounded-lg border border-gray-700 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-gray-300">Select a game to apply all images:</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setFastSearchResults([]);
                          setSelectedFastGame(null);
                        }}
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 max-h-48 overflow-y-auto">
                      {fastSearchResults.map((game) => (
                        <button
                          key={game.id}
                          type="button"
                          onClick={() => handleApplyFastSearchGame(game)}
                          className={`relative group rounded-lg overflow-hidden border-2 transition-all hover:scale-105 ${selectedFastGame?.id === game.id
                            ? 'border-green-500 ring-2 ring-green-500/50'
                            : 'border-gray-600 hover:border-gray-400'
                            }`}
                        >
                          <div className="aspect-[2/3] bg-gray-800">
                            {game.coverUrl ? (
                              <img
                                src={game.coverUrl}
                                alt={game.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '';
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-600">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                            )}
                          </div>
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1.5">
                            <p className="text-[10px] text-white font-medium truncate">{game.name}</p>
                          </div>
                          {selectedFastGame?.id === game.id && (
                            <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                              <div className="bg-green-500 rounded-full p-1">
                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Images Grid - Box Art, Banner, Logo, Icon */}
                <div className="grid grid-cols-2 gap-4">
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
                        <div className="w-full h-32 bg-gray-700 rounded border border-gray-600 flex items-center justify-center p-4">
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

                  {/* Icon URL */}
                  <div>
                    <label htmlFor="icon-url" className="block text-sm font-medium text-gray-300 mb-2">
                      Icon URL
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        id="icon-url"
                        type="text"
                        value={editedGame.iconUrl || ''}
                        onChange={(e) => handleFieldChange('iconUrl', e.target.value)}
                        disabled={isSaving || isDeleting}
                        className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 text-sm"
                        placeholder="Enter icon image URL"
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const path = await window.electronAPI.showImageDialog();
                          if (path) {
                            handleFieldChange('iconUrl', path);
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
                      onClick={() => handleSearchImages('icon')}
                      disabled={isSearchingImages || isSaving || isDeleting || (!imageSearchQuery.trim() && !editedGame.title.trim())}
                      className="w-full mb-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      {isSearchingImages && searchingImageType === 'icon' ? 'Searching...' : 'Search Icon'}
                    </button>
                    {editedGame.iconUrl && (
                      <div className="mt-2">
                        <div className="w-full h-32 bg-gray-700 rounded border border-gray-600 flex items-center justify-center p-4">
                          <img
                            src={editedGame.iconUrl}
                            alt="Icon"
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

                {/* Unified Image Search Controls */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSearchImages('boxart', true)}
                    disabled={isSearchingImages || isWebSearchingImages || (!imageSearchQuery.trim() && !editedGame.title.trim())}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {isWebSearchingImages && lastSearchedImageType === 'boxart' ? '...' : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <span>Search Boxart On Web</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleSearchImages('banner', true)}
                    disabled={isSearchingImages || isWebSearchingImages || (!imageSearchQuery.trim() && !editedGame.title.trim())}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {isWebSearchingImages && lastSearchedImageType === 'banner' ? '...' : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <span>Search Banner On Web</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleSearchImages('logo', true)}
                    disabled={isSearchingImages || isWebSearchingImages || (!imageSearchQuery.trim() && !editedGame.title.trim())}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {isWebSearchingImages && lastSearchedImageType === 'logo' ? '...' : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <span>Search Logo On Web</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleSearchImages('icon', true)}
                    disabled={isSearchingImages || isWebSearchingImages || (!imageSearchQuery.trim() && !editedGame.title.trim())}
                    className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    {isWebSearchingImages && lastSearchedImageType === 'icon' ? '...' : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                        </svg>
                        <span>Search Icon On Web</span>
                      </>
                    )}
                  </button>
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
        {unifiedImageResults.length > 0 && activeTab === 'images' && (
          <div className="w-1/2 border-l border-gray-700 overflow-y-auto bg-gray-800/50 flex flex-col">
            <div className="p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">
                  {lastSearchedImageType === 'boxart' && 'Box Art Search Results'}
                  {lastSearchedImageType === 'banner' && 'Banner Search Results'}
                  {lastSearchedImageType === 'logo' && 'Logo Search Results'}
                  {!lastSearchedImageType && 'Image Search Results'}
                  {` (${unifiedImageResults.length} results)`}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setUnifiedImageResults([]);
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

              <ImageSelector
                images={unifiedImageResults}
                onSelect={(url) => {
                  const type = lastSearchedImageType === 'boxart' ? 'cover' :
                    lastSearchedImageType === 'banner' ? 'banner' :
                      lastSearchedImageType === 'icon' ? 'icon' : 'logo';
                  handleSelectImageFromSearch(url, type);
                }}
                selectedUrl={
                  lastSearchedImageType === 'boxart' ? editedGame.boxArtUrl :
                    lastSearchedImageType === 'banner' ? editedGame.bannerUrl :
                      lastSearchedImageType === 'icon' ? editedGame.iconUrl :
                        editedGame.logoUrl
                }
                imageType={lastSearchedImageType || 'boxart'}
                isLoading={isSearchingImages || isWebSearchingImages}
                emptyMessage={`No ${lastSearchedImageType} found. Try searching with a different name or use 'Search Web'.`}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
