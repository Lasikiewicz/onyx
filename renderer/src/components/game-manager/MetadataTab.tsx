import React, { useState } from 'react';
import { Game } from '../../types/game';

interface MetadataTabProps {
  editedGame: Game;
  setEditedGame: React.Dispatch<React.SetStateAction<Game | null>>;
  selectedGame: Game;
  showFixMatch: boolean;
  setShowFixMatch: (show: boolean) => void;
  metadataSearchQuery: string;
  setMetadataSearchQuery: (query: string) => void;
  metadataSearchResults: any[];
  setMetadataSearchResults: (results: any[]) => void;
  isSearchingMetadata: boolean;
  setIsSearchingMetadata: (searching: boolean) => void;
  handleFixMatchSearch: () => void;
  handleSelectMetadataMatch: (result: { id: string; source: string; steamAppId?: string; title?: string }) => void;
  isApplyingMetadata: boolean;
  onSave: () => void;
  isSaving: boolean;
  onCancel: () => void;
  onDeleteGame?: (gameId: string) => Promise<void>;
  setShowDeleteConfirm: (show: boolean) => void;
  isDeleting: boolean;
  setError: (error: string | null) => void;
  setActiveTab: (tab: 'metadata' | 'images' | 'links' | 'modManager') => void;
  setShowImageSearch: (search: { type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon'; gameId: string } | null) => void;
  setActiveImageSearchTab: (tab: 'all' | 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => void;
  setImageSearchQuery: (query: string) => void;
  handleSearchImages: (type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon', useWeb?: boolean) => void;
}

export const MetadataTab: React.FC<MetadataTabProps> = ({
  editedGame,
  setEditedGame,
  selectedGame,
  showFixMatch,
  setShowFixMatch,
  metadataSearchQuery,
  setMetadataSearchQuery,
  metadataSearchResults,
  setMetadataSearchResults,
  isSearchingMetadata,
  setIsSearchingMetadata,
  handleFixMatchSearch,
  handleSelectMetadataMatch,
  isApplyingMetadata,
  onSave,
  isSaving,
  onCancel,
  onDeleteGame,
  setShowDeleteConfirm,
  isDeleting,
  setError,
  setActiveTab,
  setShowImageSearch,
  setActiveImageSearchTab,
  setImageSearchQuery,
  handleSearchImages,
}) => {
  const [newCategoryInput, setNewCategoryInput] = useState('');

  return (
    <div className="p-4 h-full overflow-y-auto">
      {/* Image Preview Strip - Copied from Images Tab */}
      <div className="flex gap-2 mb-6 items-start p-3 bg-gray-900/50 rounded-lg border border-gray-800">
        {/* Boxart */}
        <div
          onClick={() => {
            setActiveTab('images');
            setShowImageSearch({ type: 'boxart', gameId: selectedGame.id });
            setActiveImageSearchTab('boxart');
            setImageSearchQuery(selectedGame.title);
            handleSearchImages('boxart');
          }}
          className="h-24 w-auto aspect-[2/3] relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
        >
          {(editedGame.boxArtUrl || selectedGame.boxArtUrl) ? (
            <img
              src={editedGame.boxArtUrl || selectedGame.boxArtUrl}
              alt="Boxart"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-[8px] text-gray-600 text-center p-1">Boxart</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-[10px] text-white font-medium">Edit</span>
          </div>
        </div>

        {/* Logo */}
        <div
          onClick={() => {
            setActiveTab('images');
            setShowImageSearch({ type: 'logo', gameId: selectedGame.id });
            setActiveImageSearchTab('logo');
            setImageSearchQuery(selectedGame.title);
            handleSearchImages('logo');
          }}
          className="h-24 w-36 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
        >
          {(editedGame.logoUrl || selectedGame.logoUrl) ? (
            <div className="w-full h-full p-2 flex items-center justify-center">
              <img
                src={editedGame.logoUrl || selectedGame.logoUrl}
                alt="Logo"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-2">
              <span className="text-[8px] text-gray-600">Logo</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-[10px] text-white font-medium">Edit</span>
          </div>
        </div>

        {/* Banner + Alt Banner */}
        <div className="h-24 flex-1 flex gap-1">
          {/* Banner */}
          <div
            onClick={() => {
              setActiveTab('images');
              setShowImageSearch({ type: 'banner', gameId: selectedGame.id });
              setActiveImageSearchTab('banner');
              setImageSearchQuery(selectedGame.title);
              handleSearchImages('banner');
            }}
            className="flex-1 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors"
          >
            {(editedGame.bannerUrl || selectedGame.bannerUrl) ? (
              <img
                src={editedGame.bannerUrl || selectedGame.bannerUrl}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[8px] text-gray-600">Banner</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-[10px] text-white font-medium">Edit</span>
            </div>
          </div>

          {/* Alt Banner */}
          <div
            onClick={() => {
              setActiveTab('images');
              setShowImageSearch({ type: 'alternativeBanner', gameId: selectedGame.id });
              setActiveImageSearchTab('alternativeBanner');
              setImageSearchQuery(selectedGame.title);
              handleSearchImages('alternativeBanner');
            }}
            className="flex-1 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors"
          >
            {(editedGame.alternativeBannerUrl || selectedGame.alternativeBannerUrl) ? (
              <img
                src={editedGame.alternativeBannerUrl || selectedGame.alternativeBannerUrl}
                alt="Alt Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-[8px] text-gray-600">Alt Banner</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-[10px] text-white font-medium">Edit</span>
            </div>
          </div>
        </div>

        {/* Icon */}
        <div
          onClick={() => {
            setActiveTab('images');
            setShowImageSearch({ type: 'icon', gameId: selectedGame.id });
            setActiveImageSearchTab('icon');
            setImageSearchQuery(selectedGame.title);
            handleSearchImages('icon');
          }}
          className="h-24 w-24 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
        >
          {(editedGame.iconUrl || selectedGame.iconUrl) ? (
            <div className="w-full h-full p-2 flex items-center justify-center">
              <img
                src={editedGame.iconUrl || selectedGame.iconUrl}
                alt="Icon"
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-center p-1">
              <span className="text-[8px] text-gray-600">Icon</span>
            </div>
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-[10px] text-white font-medium">Edit</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Title Row with Fix Match */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const newLockedFields = { ...editedGame.lockedFields };
                  newLockedFields.title = !newLockedFields.title;
                  setEditedGame({ ...editedGame, lockedFields: newLockedFields });
                }}
                className={`flex items-center justify-center p-1.5 rounded transition-colors ${editedGame.lockedFields?.title ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}`}
                title={editedGame.lockedFields?.title ? "Unlock Title" : "Lock Title"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {editedGame.lockedFields?.title ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  )}
                </svg>
              </button>
              <input
                type="text"
                value={showFixMatch ? metadataSearchQuery : editedGame.title}
                onChange={(e) => {
                  if (showFixMatch) {
                    setMetadataSearchQuery(e.target.value);
                  } else {
                    setEditedGame({ ...editedGame, title: e.target.value });
                  }
                }}
                onKeyDown={(e) => {
                  if (showFixMatch && e.key === 'Enter') {
                    handleFixMatchSearch();
                  }
                }}
                placeholder={showFixMatch ? "Enter game title to search..." : ""}
                className="flex-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={(showFixMatch && isSearchingMetadata) || editedGame.lockedFields?.title}
              />
              {showFixMatch && (
                <button
                  onClick={handleFixMatchSearch}
                  disabled={isSearchingMetadata}
                  className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSearchingMetadata ? (
                    <>
                      <svg className="animate-spin h-4 w-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Searching...
                    </>
                  ) : (
                    'Search'
                  )}
                </button>
              )}
              <button
                onClick={async () => {
                  const wasHidden = !showFixMatch;
                  setShowFixMatch(!showFixMatch);
                  if (wasHidden) {
                    // When opening, set search query to current title and auto-search
                    setMetadataSearchQuery(editedGame.title || selectedGame.title);
                    const query = editedGame.title || selectedGame.title;
                    if (query) {
                      setIsSearchingMetadata(true);
                      setMetadataSearchResults([]);
                      setError(null);
                      try {
                        // Note: searchGames returns an array directly, not a {success, results} wrapper
                        const response = await window.electronAPI.searchGames(query);
                        const results = Array.isArray(response) ? response : (response.results || []);

                        if (results.length === 0) {
                          setError('No matches found. Try a different search term.');
                          setMetadataSearchResults([]);
                        } else {
                          // Sort: Score > Date > Exact Match
                          const normalizedQuery = query.toLowerCase().trim();
                          const sortedResults = results.sort((a: any, b: any) => {
                            // 1. Score (assigned by backend)
                            const scoreA = a.score || 0;
                            const scoreB = b.score || 0;
                            if (scoreA !== scoreB) return scoreB - scoreA;

                            // 2. Release Date (Newest first)
                            const getDate = (r: any) => {
                              if (r.releaseDate) return typeof r.releaseDate === 'number' ? r.releaseDate * 1000 : new Date(r.releaseDate).getTime();
                              if (r.year) return new Date(r.year, 0, 1).getTime();
                              return 0;
                            };
                            const dateA = getDate(a);
                            const dateB = getDate(b);
                            if (dateA !== dateB && dateA > 0 && dateB > 0) return dateB - dateA;

                            // 3. Exact Match
                            const nameA = (a.title || a.name || "").toLowerCase().trim();
                            const nameB = (b.title || b.name || "").toLowerCase().trim();
                            if (nameA === normalizedQuery && nameB !== normalizedQuery) return -1;
                            if (nameA !== normalizedQuery && nameB === normalizedQuery) return 1;

                            return 0;
                          });
                          setMetadataSearchResults(sortedResults);
                        }
                      } catch (err) {
                        console.error('Error searching metadata:', err);
                        setError('Failed to search for games. Please try again.');
                      } finally {
                        setIsSearchingMetadata(false);
                      }
                    }
                  } else {
                    // When hiding, clear search results
                    setMetadataSearchResults([]);
                    setMetadataSearchQuery('');
                    setError(null);
                  }
                }}
                className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {showFixMatch ? 'Hide' : 'Fix Match'}
              </button>
            </div>
          </div>
        </div>

        {/* Fix Match Results */}
        {showFixMatch && (
          <div className="space-y-2">
            {isSearchingMetadata && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="animate-spin h-4 w-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Searching for metadata matches...
              </div>
            )}

            {metadataSearchResults.length > 0 && (
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {metadataSearchResults.map((result) => {
                    // Extract release date properly - show full date, not just year
                    let displayDate: string | undefined;
                    if (result.releaseDate) {
                      // Handle both Unix timestamp (seconds) and Date objects
                      if (typeof result.releaseDate === 'number') {
                        const date = new Date(result.releaseDate * 1000);
                        displayDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                      } else if (typeof result.releaseDate === 'string') {
                        const date = new Date(result.releaseDate);
                        if (!isNaN(date.getTime())) {
                          displayDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                        } else {
                          // Try parsing as ISO date string
                          displayDate = result.releaseDate;
                        }
                      }
                    } else if (result.year) {
                      // Fallback to year only if no full date available
                      displayDate = result.year.toString();
                    }

                    return (
                      <button
                        key={result.id}
                        onClick={() => handleSelectMetadataMatch({ id: result.id, source: result.source, steamAppId: result.steamAppId, title: result.title || result.name })}
                        disabled={isApplyingMetadata}
                        className="relative w-full text-left p-3 text-sm bg-gray-800 hover:bg-gray-700 rounded border border-gray-600 disabled:opacity-50 transition-colors flex items-center gap-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white font-medium text-sm truncate" title={result.title || result.name}>
                            {result.title || result.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`text-xs ${result.source === 'steam' ? 'text-blue-400' : 'text-gray-400'}`}>
                              {result.source === 'steam' ? 'Steam' : result.source === 'igdb' ? 'IGDB' : result.source === 'steamgriddb' ? 'SGDB' : result.source}
                            </span>
                            {result.steamAppId && (
                              <span className="text-xs text-gray-500">App ID: {result.steamAppId}</span>
                            )}
                            {displayDate && (
                              <span className="text-xs text-gray-400">ï¿½ï¿½ï¿½ {displayDate}</span>
                            )}
                          </div>
                        </div>
                        {isApplyingMetadata && (
                          <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                            <svg className="animate-spin h-5 w-5 text-blue-500 group- hover:animate-wobble group-hover:animate-wobble" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Description and Categories Row */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Description */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
            <textarea
              value={editedGame.description || ''}
              onChange={(e) => setEditedGame({ ...editedGame, description: e.target.value })}
              className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={4}
            />
          </div>

          {/* Categories - vertical scroll layout */}
          <div className="w-full lg:w-[35%] flex flex-col">
            <label className="block text-xs font-medium text-gray-400 mb-1">Categories</label>
            <div className="flex-1 p-2 bg-gray-800/50 rounded border border-gray-700 flex flex-col gap-2 max-h-[104px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
              <div className="flex flex-wrap gap-1">
                {editedGame.categories?.map((category, index) => (
                  <span key={index} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-blue-900/30 text-blue-200 border border-blue-700/30 rounded-full group hover:border-blue-500/50 transition-colors">
                    {category}
                    <button
                      onClick={() => {
                        const newCategories = [...(editedGame.categories || [])];
                        newCategories.splice(index, 1);
                        setEditedGame({ ...editedGame, categories: newCategories });
                      }}
                      className="ml-0.5 text-blue-400 hover:text-white focus:outline-none rounded-full"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={newCategoryInput}
                onChange={(e) => setNewCategoryInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (newCategoryInput.trim()) {
                      const currentCategories = editedGame.categories || [];
                      const newCat = newCategoryInput.trim();
                      if (!currentCategories.includes(newCat)) {
                        setEditedGame({
                          ...editedGame,
                          categories: [...currentCategories, newCat]
                        });
                        setNewCategoryInput('');
                      }
                    }
                  }
                }}
                placeholder="Add category..."
                className="w-full bg-transparent border-none text-xs text-white focus:outline-none placeholder-gray-500"
              />
            </div>
          </div>
        </div>

        {/* Metadata Grid - 5 Columns */}
        <div className="grid grid-cols-5 gap-2">
          {/* Platform */}
          {editedGame.platform && editedGame.platform !== 'other' && (
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Platform</label>
              <input
                type="text"
                value={editedGame.platform}
                onChange={(e) => setEditedGame({ ...editedGame, platform: e.target.value })}
                className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Release Date</label>
            <input
              type="text"
              value={editedGame.releaseDate || ''}
              onChange={(e) => setEditedGame({ ...editedGame, releaseDate: e.target.value })}
              placeholder="YYYY-MM-DD"
              className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Age Rating</label>
            <input
              type="text"
              value={editedGame.ageRating || ''}
              onChange={(e) => setEditedGame({ ...editedGame, ageRating: e.target.value })}
              className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Series</label>
            <input
              type="text"
              value={editedGame.series || ''}
              onChange={(e) => setEditedGame({ ...editedGame, series: e.target.value })}
              className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Genres</label>
            <input
              type="text"
              value={editedGame.genres?.join(', ') || ''}
              onChange={(e) => setEditedGame({ ...editedGame, genres: e.target.value.split(',').map(g => g.trim()).filter(g => g) })}
              className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Developers</label>
            <input
              type="text"
              value={editedGame.developers?.join(', ') || ''}
              onChange={(e) => setEditedGame({ ...editedGame, developers: e.target.value.split(',').map(d => d.trim()).filter(d => d) })}
              className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Publishers</label>
            <input
              type="text"
              value={editedGame.publishers?.join(', ') || ''}
              onChange={(e) => setEditedGame({ ...editedGame, publishers: e.target.value.split(',').map(p => p.trim()).filter(p => p) })}
              className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Source</label>
            <input
              type="text"
              value={editedGame.source || ''}
              onChange={(e) => setEditedGame({ ...editedGame, source: e.target.value })}
              className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Install Directory</label>
            <input
              type="text"
              value={editedGame.installationDirectory || ''}
              onChange={(e) => setEditedGame({ ...editedGame, installationDirectory: e.target.value })}
              className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Executable Path</label>
            <input
              type="text"
              value={editedGame.exePath || ''}
              onChange={(e) => setEditedGame({ ...editedGame, exePath: e.target.value })}
              className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Install Size</label>
            <input
              type="text"
              value={editedGame.installSize ? `${Math.round(editedGame.installSize / 1024 / 1024 / 1024 * 100) / 100} GB` : ''}
              readOnly
              className="w-full px-2 py-1 text-xs bg-gray-800/50 border border-gray-600 rounded text-gray-400"
            />
          </div>

        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Cancel
          </button>
          {onDeleteGame && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting}
              className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
