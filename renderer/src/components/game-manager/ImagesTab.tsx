import React from 'react';
import { FastSearchGame, Game } from '../../types/game';

interface ImagesTabProps {
  editedGame: Game;
  selectedGame: Game;
  showImageSearch: { type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon'; gameId: string } | null;
  setShowImageSearch: (search: { type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon'; gameId: string } | null) => void;
  activeImageSearchTab: 'all' | 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon';
  setActiveImageSearchTab: (tab: 'all' | 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => void;
  imageSearchQuery: string;
  setImageSearchQuery: (query: string) => void;
  handleSearchImages: (type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon', useWeb?: boolean) => void;
  isSearchingImages: boolean;
  handleFastSearch: () => void;
  isFastSearching: boolean;
  fastSearchResults: FastSearchGame[];
  setFastSearchResults: React.Dispatch<React.SetStateAction<FastSearchGame[]>>;
  selectedFastGame: FastSearchGame | null;
  handleSelectFastGame: (game: FastSearchGame) => void;
  setSelectedFastGame: React.Dispatch<React.SetStateAction<FastSearchGame | null>>;
  imageSearchResults: any[];
  setImageSearchResults: React.Dispatch<React.SetStateAction<any[]>>;
  steamGridDBResults: { boxart: any[]; banner: any[]; alternativeBanner: any[]; logo: any[]; icon: any[] };
  setSteamGridDBResults: React.Dispatch<React.SetStateAction<{ boxart: any[]; banner: any[]; alternativeBanner: any[]; logo: any[]; icon: any[] }>>;
  handleSelectImage: (imageUrl: string, type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => void;
  handleBrowseImage: (type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => void;
  showAnimatedImages: boolean;
  setShowAnimatedImages: (show: boolean) => void;
  imageSearchProviderStatus: { currentProvider: string; remaining: string[] } | null;
  setContextMenu: React.Dispatch<React.SetStateAction<{ x: number; y: number; type: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon' } | null>>;
}

export const ImagesTab: React.FC<ImagesTabProps> = ({
  editedGame,
  selectedGame,
  showImageSearch,
  setShowImageSearch,
  activeImageSearchTab,
  setActiveImageSearchTab,
  imageSearchQuery,
  setImageSearchQuery,
  handleSearchImages,
  isSearchingImages,
  handleFastSearch,
  isFastSearching,
  fastSearchResults,
  setFastSearchResults,
  selectedFastGame,
  handleSelectFastGame,
  setSelectedFastGame,
  imageSearchResults,
  setImageSearchResults,
  steamGridDBResults,
  setSteamGridDBResults,
  handleSelectImage,
  handleBrowseImage,
  showAnimatedImages,
  setShowAnimatedImages,
  imageSearchProviderStatus,
  setContextMenu,
}) => {
  return (
    <>
      <div className="p-2 space-y-2 flex-shrink-0 bg-gray-900/95 z-10 border-b border-gray-800">
        {/* Top Images Section - Compact Flex Layout */}
        <div className="flex gap-2 mb-1 items-start">
          {/* Boxart */}
          <div
            onClick={() => {
              setShowImageSearch({ type: 'boxart', gameId: selectedGame.id });
              setActiveImageSearchTab('boxart');
              setImageSearchQuery(selectedGame.title);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.pageX, y: e.pageY, type: 'boxart' });
            }}
            className="h-36 w-auto aspect-[2/3] relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
          >
            {(editedGame.boxArtUrl || selectedGame.boxArtUrl) ? (
              <img
                key={editedGame.boxArtUrl || selectedGame.boxArtUrl}
                src={editedGame.boxArtUrl || selectedGame.boxArtUrl}
                alt="Boxart"
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.parentElement?.classList.add('flex', 'items-center', 'justify-center');
                  target.parentElement!.innerHTML = '<span class="text-[8px] text-gray-500 text-center p-1">No Image</span>';
                }}
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

          {/* Logo - Moved to 2nd position */}
          <div
            onClick={() => {
              setShowImageSearch({ type: 'logo', gameId: selectedGame.id });
              setActiveImageSearchTab('logo');
              setImageSearchQuery(selectedGame.title);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.pageX, y: e.pageY, type: 'logo' });
            }}
            className="h-36 w-56 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
          >
            {(editedGame.logoUrl || selectedGame.logoUrl) ? (
              <div className="w-full h-full p-2 flex items-center justify-center">
                <img
                  key={editedGame.logoUrl || selectedGame.logoUrl}
                  src={editedGame.logoUrl || selectedGame.logoUrl}
                  alt="Logo"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center p-2">
                <span className="text-xs text-gray-600">Click to search for logo</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-xs text-white font-medium">Edit Logo</span>
            </div>
          </div>

          {/* Banner - Split into two sections */}
          <div className="h-36 flex-1 flex gap-1">
            {/* Banner */}
            <div
              onClick={() => {
                setShowImageSearch({ type: 'banner', gameId: selectedGame.id });
                setActiveImageSearchTab('banner');
                setImageSearchQuery(selectedGame.title);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.pageX, y: e.pageY, type: 'banner' });
              }}
              className="flex-1 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors"
            >
              {(editedGame.bannerUrl || selectedGame.bannerUrl) ? (
                <img
                  key={editedGame.bannerUrl || selectedGame.bannerUrl}
                  src={editedGame.bannerUrl || selectedGame.bannerUrl}
                  alt="Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs text-gray-600">Banner</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[10px] text-white font-medium">Edit</span>
              </div>
            </div>

            {/* Alternative Banner */}
            <div
              onClick={() => {
                setShowImageSearch({ type: 'alternativeBanner', gameId: selectedGame.id });
                setActiveImageSearchTab('alternativeBanner');
                setImageSearchQuery(selectedGame.title);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ x: e.pageX, y: e.pageY, type: 'alternativeBanner' });
              }}
              className="flex-1 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors"
            >
              {(editedGame.alternativeBannerUrl || selectedGame.alternativeBannerUrl) ? (
                <img
                  key={editedGame.alternativeBannerUrl || selectedGame.alternativeBannerUrl}
                  src={editedGame.alternativeBannerUrl || selectedGame.alternativeBannerUrl}
                  alt="Alternative Banner"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-xs text-gray-600">Alt Banner</span>
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <span className="text-[10px] text-white font-medium">Edit</span>
              </div>
            </div>
          </div>

          {/* Icon - Moved to 4th position */}
          <div
            onClick={() => {
              setShowImageSearch({ type: 'icon', gameId: selectedGame.id });
              setActiveImageSearchTab('icon');
              setImageSearchQuery(selectedGame.title);
            }}
            onContextMenu={(e) => {
              e.preventDefault();
              setContextMenu({ x: e.pageX, y: e.pageY, type: 'icon' });
            }}
            className="h-36 w-36 relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0"
          >
            {(editedGame.iconUrl || selectedGame.iconUrl) ? (
              <div className="w-full h-full p-2 flex items-center justify-center">
                <img
                  key={editedGame.iconUrl || selectedGame.iconUrl}
                  src={editedGame.iconUrl || selectedGame.iconUrl}
                  alt="Icon"
                  className="max-w-full max-h-full object-contain"
                />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-center p-1">
                <span className="text-[10px] text-gray-600">Click to search for icon</span>
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-[10px] text-white font-medium">Edit Icon</span>
            </div>
          </div>
        </div>
      </div>

      {/* Image Search Input - Hidden when results found */}
      {(!imageSearchResults.length &&
        !steamGridDBResults.boxart.length &&
        !steamGridDBResults.banner.length &&
        !steamGridDBResults.logo.length &&
        !steamGridDBResults.icon.length) && (
          <div className="border-t border-gray-800 pt-4 px-4">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                {showImageSearch ? `Search for ${showImageSearch.type}` : 'Search Images'}
                {showImageSearch && <span className="text-gray-500 ml-2">(click an image above to change type)</span>}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={imageSearchQuery}
                  onChange={(e) => setImageSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleSearchImages(showImageSearch?.type || 'boxart');
                    }
                  }}
                  placeholder="Enter game title..."
                  className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500"
                  disabled={isSearchingImages}
                />
                {/* Quick Search All - Aggregated instant search */ /* community-requested feature */}
                <button
                  onClick={handleFastSearch}
                  disabled={isFastSearching || isSearchingImages}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title="Quick search all image types at once"
                >
                  {isFastSearching ? (
                    <>
                      <svg className="animate-spin h-4 w-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Fast...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span>Quick All</span>
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleBrowseImage(showImageSearch?.type as any || 'boxart')}
                  disabled={isSearchingImages}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
                  title="Browse for local image file"
                >
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Browse
                </button>
                <button
                  onClick={() => {
                    setImageSearchResults([]);
                    setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
                    setFastSearchResults([]);
                    setSelectedFastGame(null);
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                  disabled={isSearchingImages}
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowAnimatedImages(!showAnimatedImages)}
                  className={`px-3 py-2 rounded border transition-colors flex items-center gap-2 ${showAnimatedImages
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                    }`}
                  title="Include animated images (GIF/WebP) in search results"
                >
                  <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {showAnimatedImages ? 'Animated' : 'Static'}
                </button>
              </div>

              {/* Fast Search Results - Game Selection (inline, no border) */}
              {fastSearchResults.length > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-300">
                      <span className="text-green-400">⚡</span> Quick Results - Click to see images:
                    </h4>
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
                  <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
                    {fastSearchResults.map((game) => (
                      <button
                        key={game.id}
                        type="button"
                        onClick={() => handleSelectFastGame(game)}
                        className={`flex items-center gap-3 p-2 rounded-lg border transition-all hover:bg-gray-800 text-left ${selectedFastGame?.id === game.id
                          ? 'border-green-500 bg-green-900/10'
                          : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
                          }`}
                      >
                        <div className="w-10 h-14 bg-gray-800 flex-shrink-0 rounded overflow-hidden">
                          {game.coverUrl ? (
                            <img
                              src={game.coverUrl}
                              alt={game.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-600">
                              <svg className="w-4 h-4 group- hover:animate-edit-image group-hover:animate-edit-image" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">{game.name}</div>
                          <div className="text-xs text-gray-400">
                            {game.releaseDate ? new Date(game.releaseDate * 1000).getFullYear() : 'Unknown Year'} • {game.source || 'Unknown Source'}
                          </div>
                        </div>
                        <div className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300 group-hover:bg-green-600 group-hover:text-white transition-colors">
                          Select
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {isSearchingImages && (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                  <svg className="animate-spin h-4 w-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Searching for {showImageSearch?.type || 'images'}...
                </div>
              )}
            </div>
          </div>
        )}

      {/* Sticky Tabs Header - Outside Scrollable Container */}
      {(imageSearchResults.length > 0 ||
        steamGridDBResults.boxart.length > 0 ||
        steamGridDBResults.banner.length > 0 ||
        steamGridDBResults.alternativeBanner.length > 0 ||
        steamGridDBResults.logo.length > 0 ||
        steamGridDBResults.icon.length > 0) && (
          <div className="border-t border-gray-800 bg-gray-900 px-4 pt-4 pb-2">
            {/* Tabs Header with New Search Button */}
            <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
              <div className="flex items-center gap-1">
                {['all', 'boxart', 'logo', 'banner', 'alternativeBanner', 'icon'].map((tab) => {
                  const label = tab === 'alternativeBanner' ? 'Alt Banner' : tab.charAt(0).toUpperCase() + tab.slice(1);
                  const isActive = activeImageSearchTab === tab;

                  // Calculate counts
                  let count = 0;
                  if (tab === 'all') {
                    count = imageSearchResults.length +
                      steamGridDBResults.boxart.length +
                      steamGridDBResults.banner.length +
                      steamGridDBResults.logo.length +
                      steamGridDBResults.icon.length;
                  } else {
                    if (tab === 'boxart') count = imageSearchResults.filter(i => i.boxArtUrl || i.coverUrl).length + steamGridDBResults.boxart.length;
                    else if (tab === 'banner') count = imageSearchResults.filter(i => i.bannerUrl || i.screenshotUrls).length + steamGridDBResults.banner.length;
                    else if (tab === 'alternativeBanner') count = imageSearchResults.filter(i => i.bannerUrl || i.screenshotUrls).length + steamGridDBResults.banner.length;
                    else if (tab === 'logo') count = steamGridDBResults.logo.length + imageSearchResults.filter(i => i.logoUrl).length; // Add logos from main results if any
                    else if (tab === 'icon') count = steamGridDBResults.icon.length + imageSearchResults.filter(i => i.iconUrl).length;
                  }

                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveImageSearchTab(tab as any)}
                      className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${isActive
                        ? 'border-green-500 text-green-400'
                        : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
                        }`}
                    >
                      {label}
                      {count > 0 && <span className="ml-2 text-xs opacity-60 bg-gray-800 px-1.5 py-0.5 rounded-full">{count}</span>}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => {
                  setImageSearchResults([]);
                  setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
                  setFastSearchResults([]);
                  setSelectedFastGame(null);
                }}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 px-3 py-1 bg-gray-800 rounded border border-gray-700 hover:border-gray-500"
              >
                <svg className="w-3 h-3 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                New Search
              </button>
            </div>
            {/* Provider progress indicator */}
            {isSearchingImages && imageSearchProviderStatus && imageSearchProviderStatus.currentProvider && (
              <div className="flex items-center gap-2 px-1 pb-2 text-xs text-gray-400">
                <svg className="w-3 h-3 animate-spin text-green-400" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>
                  Searching <span className="text-green-400 font-medium">{imageSearchProviderStatus.currentProvider}</span>
                  {imageSearchProviderStatus.remaining.length > 0 && (
                    <span className="text-gray-500"> · Remaining: {imageSearchProviderStatus.remaining.join(', ')}</span>
                  )}
                </span>
              </div>
            )}
          </div>
        )}

      {/* Result Tabs Content - Scrollable Container */}
      <div className="flex-1 overflow-y-auto px-4 py-1 custom-scrollbar relative">
        {(imageSearchResults.length > 0 ||
          steamGridDBResults.boxart.length > 0 ||
          steamGridDBResults.banner.length > 0 ||
          steamGridDBResults.alternativeBanner.length > 0 ||
          steamGridDBResults.logo.length > 0 ||
          steamGridDBResults.icon.length > 0) && (
            <div>
              {/* Content */}
              <div className="space-y-8">
                {/* Boxart Section */}
                {(activeImageSearchTab === 'all' || activeImageSearchTab === 'boxart') &&
                  (imageSearchResults.some(i => i.boxArtUrl || i.coverUrl) || steamGridDBResults.boxart.length > 0) && (
                    <div>
                      {activeImageSearchTab === 'all' && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Box Art & Covers</h4>}
                      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
                        {/* IGDB Covers */}
                        {imageSearchResults.filter(i => i.boxArtUrl || i.coverUrl).map((result, idx) => (
                          <div
                            key={`igdb-boxart-${result.id}-${idx}`}
                            onClick={() => handleSelectImage(result.boxArtUrl || result.coverUrl, 'boxart')}
                            className="group cursor-pointer"
                          >
                            <div className="aspect-[2/3] rounded overflow-hidden border border-gray-700 bg-gray-800 group-hover:border-green-500 transition-all relative">
                              <img
                                src={result.boxArtUrl || result.coverUrl}
                                alt={result.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).parentElement?.parentElement?.remove(); // Remove the entire card container
                                }}
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                                <p className="text-[10px] text-white truncate text-center">{result.source || 'IGDB'}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                        {/* SGDB Boxarts */}
                        {steamGridDBResults.boxart.map((result: any, idx: number) => (
                          <div
                            key={`sgdb-boxart-${idx}`}
                            onClick={() => handleSelectImage(result.url || result.boxArtUrl || result.coverUrl, 'boxart')}
                            className="group cursor-pointer"
                          >
                            <div className="aspect-[2/3] rounded overflow-hidden border border-gray-700 bg-gray-800 group-hover:border-green-500 transition-all relative">
                              <img
                                src={result.url || result.boxArtUrl || result.coverUrl}
                                alt={result.name}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).parentElement?.parentElement?.remove();
                                }}
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                                <p className="text-[10px] text-white truncate text-center">SteamGridDB</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Logo Section */}
                {(activeImageSearchTab === 'all' || activeImageSearchTab === 'logo') &&
                  (steamGridDBResults.logo.length > 0 || imageSearchResults.some(i => i.logoUrl)) && (
                    <div>
                      {activeImageSearchTab === 'all' && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Logos</h4>}
                      <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                        {steamGridDBResults.logo.map((result: any, idx: number) => {
                          const url = result.url || result.logoUrl;
                          if (!url) return null;
                          return (
                            <div
                              key={`sgdb-logo-${idx}`}
                              onClick={() => handleSelectImage(url, 'logo')}
                              className="group cursor-pointer flex items-center justify-center p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all h-24"
                            >
                              <img src={url} alt="Logo" className="max-w-full max-h-full object-contain" />
                            </div>
                          );
                        })}
                        {imageSearchResults.filter(i => i.logoUrl).map((result, idx) => (
                          <div
                            key={`igdb-logo-${idx}`}
                            onClick={() => handleSelectImage(result.logoUrl, 'logo')}
                            className="group cursor-pointer flex items-center justify-center p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all h-24"
                          >
                            <img src={result.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Banner Section */}
                {(activeImageSearchTab === 'all' || activeImageSearchTab === 'banner') &&
                  (imageSearchResults.some(i => i.bannerUrl || i.screenshotUrls) || steamGridDBResults.banner.length > 0) && (
                    <div>
                      {activeImageSearchTab === 'all' && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Banners & Screenshots</h4>}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {/* IGDB Screenshots/Banners */}
                        {imageSearchResults.filter(i => i.bannerUrl || i.screenshotUrls).map((result, idx) => {
                          const url = result.bannerUrl || result.screenshotUrls?.[0];
                          if (!url) return null;
                          return (
                            <div
                              key={`igdb-banner-${result.id}-${idx}`}
                              onClick={() => handleSelectImage(url, 'banner')}
                              className="group cursor-pointer"
                            >
                              <div className="aspect-video rounded overflow-hidden border border-gray-700 bg-gray-800 group-hover:border-green-500 transition-all relative">
                                <img
                                  src={url}
                                  alt={result.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement?.parentElement?.remove();
                                  }}
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                                  <p className="text-[10px] text-white truncate text-center">{result.source || result.name}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {/* SGDB Heroes/Banners */}
                        {steamGridDBResults.banner.map((result: any, idx: number) => {
                          const url = result.url || result.bannerUrl;
                          if (!url) return null;
                          return (
                            <div
                              key={`sgdb-banner-${idx}`}
                              onClick={() => handleSelectImage(url, 'banner')}
                              className="group cursor-pointer"
                            >
                              <div className="aspect-video rounded overflow-hidden border border-gray-700 bg-gray-800 group-hover:border-green-500 transition-all relative">
                                <img
                                  src={url}
                                  alt={result.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement?.parentElement?.remove();
                                  }}
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                                  <p className="text-[10px] text-white truncate text-center">SteamGridDB</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Alternative Banner Section */}
                {(activeImageSearchTab === 'all' || activeImageSearchTab === 'alternativeBanner') &&
                  (imageSearchResults.some(i => i.bannerUrl || i.screenshotUrls) || steamGridDBResults.banner.length > 0) && (
                    <div>
                      {activeImageSearchTab === 'all' && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Alternative Banners</h4>}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {/* IGDB Screenshots/Banners */}
                        {imageSearchResults.filter(i => i.bannerUrl || i.screenshotUrls).map((result, idx) => {
                          const url = result.bannerUrl || result.screenshotUrls?.[0];
                          if (!url) return null;
                          return (
                            <div
                              key={`igdb-alt-banner-${result.id}-${idx}`}
                              onClick={() => handleSelectImage(url, 'alternativeBanner')}
                              className="group cursor-pointer"
                            >
                              <div className="aspect-video rounded overflow-hidden border border-gray-700 bg-gray-800 group-hover:border-green-500 transition-all relative">
                                <img
                                  src={url}
                                  alt={result.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement?.parentElement?.remove();
                                  }}
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                                  <p className="text-[10px] text-white truncate text-center">{result.source || result.name}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {/* SGDB Heroes/Banners */}
                        {steamGridDBResults.banner.map((result: any, idx: number) => {
                          const url = result.url || result.bannerUrl;
                          if (!url) return null;
                          return (
                            <div
                              key={`sgdb-alt-banner-${idx}`}
                              onClick={() => handleSelectImage(url, 'alternativeBanner')}
                              className="group cursor-pointer"
                            >
                              <div className="aspect-video rounded overflow-hidden border border-gray-700 bg-gray-800 group-hover:border-green-500 transition-all relative">
                                <img
                                  src={url}
                                  alt={result.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                    (e.target as HTMLImageElement).parentElement?.parentElement?.remove();
                                  }}
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                                  <p className="text-[10px] text-white truncate text-center">SteamGridDB</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {/* Icon Section */}
                {(activeImageSearchTab === 'all' || activeImageSearchTab === 'icon') &&
                  (steamGridDBResults.icon.length > 0 || imageSearchResults.some(i => i.iconUrl)) && (
                    <div>
                      {activeImageSearchTab === 'all' && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Icons</h4>}
                      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                        {imageSearchResults.filter(i => i.iconUrl).map((result, idx) => {
                          const url = result.iconUrl;
                          if (!url) return null;
                          return (
                            <div
                              key={`igdb-icon-${idx}`}
                              onClick={() => handleSelectImage(url, 'icon')}
                              className="group cursor-pointer flex items-center justify-center p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all aspect-square"
                            >
                              <img src={url} alt="Icon" className="w-full h-full object-contain" />
                            </div>
                          );
                        })}
                        {steamGridDBResults.icon.map((result: any, idx: number) => {
                          const url = result.url || result.iconUrl;
                          if (!url) return null;
                          return (
                            <div
                              key={`sgdb-icon-${idx}`}
                              onClick={() => handleSelectImage(url, 'icon')}
                              className="group cursor-pointer flex items-center justify-center p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all aspect-square"
                            >
                              <img src={url} alt="Icon" className="w-full h-full object-contain" />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          )}

      {/* Manual Search / Help Footer */}
      <div className="mt-8 mx-4 pt-6 border-t border-gray-800 pb-8 text-center opacity-80 hover:opacity-100 transition-opacity">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Can't find what you're looking for?</h4>
        <p className="text-xs text-gray-500 mb-4 max-w-md mx-auto">
          You can search Google Images for the exact asset you need, save it, and use the "Browse" button or <strong>Right-Click</strong> on the image slots above to upload it.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={() => {
              const query = `${editedGame?.title || selectedGame?.title} box art`;
              window.electronAPI.openExternal(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`);
            }}
            className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-gray-300 rounded transition-all flex items-center gap-2"
          >
            <svg className="w-3 h-3 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Search Box Art
          </button>
          <button
            onClick={() => {
              const query = `${editedGame?.title || selectedGame?.title} game logo transparent`;
              window.electronAPI.openExternal(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`);
            }}
            className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-gray-300 rounded transition-all flex items-center gap-2"
          >
            <svg className="w-3 h-3 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Search Logo
          </button>
          <button
            onClick={() => {
              const query = `${editedGame?.title || selectedGame?.title} game banner wallpaper`;
              window.electronAPI.openExternal(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`);
            }}
            className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-gray-300 rounded transition-all flex items-center gap-2"
          >
            <svg className="w-3 h-3 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Search Banner
          </button>
          <button
            onClick={() => {
              const query = `${editedGame?.title || selectedGame?.title} game icon`;
              window.electronAPI.openExternal(`https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`);
            }}
            className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-gray-300 rounded transition-all flex items-center gap-2"
          >
            <svg className="w-3 h-3 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            Search Icon
          </button>
        </div>
      </div>
    </div>

    </>
  );
};
