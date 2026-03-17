import type { ReactNode } from 'react';

type ImageType = 'boxart' | 'banner' | 'logo' | 'icon' | 'alternativeBanner';
type ImageSearchTab = 'all' | ImageType;

interface ImageResultBuckets {
  boxart: any[];
  banner: any[];
  alternativeBanner: any[];
  logo: any[];
  icon: any[];
}

interface GamePropertiesImagesTabProps {
  activeImageSearchTab: ImageSearchTab;
  editingDisabled: boolean;
  fastSearchResults: any[];
  imageSearchQuery: string;
  isFastSearching: boolean;
  isSearchingImages: boolean;
  onBrowseImage: (type: ImageType) => void | Promise<void>;
  onClearFastSearchResults: () => void;
  onClearImageResults: () => void;
  onFastSearch: () => void | Promise<void>;
  onImageSearchQueryChange: (value: string) => void;
  onImageSearchTabChange: (tab: ImageSearchTab) => void;
  onSearchImages: (type: ImageType) => void | Promise<void>;
  onSelectFastGame: (result: any) => void | Promise<void>;
  onSelectImage: (type: ImageType, url: string) => void;
  renderImageStrip: () => ReactNode;
  steamGridDBResults: ImageResultBuckets;
}

const imageSearchTabs: ImageSearchTab[] = ['all', 'boxart', 'logo', 'banner', 'alternativeBanner', 'icon'];

function getImageCount(results: ImageResultBuckets, type: ImageSearchTab) {
  if (type === 'all') {
    return results.boxart.length + results.logo.length + results.banner.length + results.alternativeBanner.length + results.icon.length;
  }

  return results[type]?.length || 0;
}

export function GamePropertiesImagesTab({
  activeImageSearchTab,
  editingDisabled,
  fastSearchResults,
  imageSearchQuery,
  isFastSearching,
  isSearchingImages,
  onBrowseImage,
  onClearFastSearchResults,
  onClearImageResults,
  onFastSearch,
  onImageSearchQueryChange,
  onImageSearchTabChange,
  onSearchImages,
  onSelectFastGame,
  onSelectImage,
  renderImageStrip,
  steamGridDBResults,
}: GamePropertiesImagesTabProps) {
  const renderResultGrid = (
    items: any[],
    keyPrefix: string,
    emptyLabel: string,
    getUrl: (result: any) => string | undefined,
    onSelect: (url: string) => void,
    className: string,
    imageClassName: string,
    emptyClassName = 'col-span-full',
  ) => (
    <>
      {items.map((result: any, idx: number) => {
        const url = getUrl(result);
        if (!url) return null;

        return (
          <div
            key={`${keyPrefix}-${idx}`}
            onClick={() => !editingDisabled && onSelect(url)}
            className={`${className} ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <img src={url} alt="" className={imageClassName} />
          </div>
        );
      })}
      {items.length === 0 && !isSearchingImages && (
        <div className={`${emptyClassName} text-center text-gray-500 py-8`}>{emptyLabel}</div>
      )}
    </>
  );

  return (
    <div>
      {renderImageStrip()}

      <div className="flex gap-2 mb-4 sticky top-0 bg-gray-900 z-10 py-2">
        <input
          type="text"
          value={imageSearchQuery}
          onChange={(e) => onImageSearchQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (activeImageSearchTab === 'all' ? onFastSearch() : onSearchImages(activeImageSearchTab))}
          placeholder="Enter game title..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-sm"
        />
        <button
          onClick={() => onFastSearch()}
          disabled={editingDisabled || isFastSearching || isSearchingImages}
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
          onClick={() => onBrowseImage(activeImageSearchTab === 'all' ? 'boxart' : activeImageSearchTab)}
          disabled={editingDisabled || isSearchingImages}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Choose a local image or WEBM file"
        >
          Browse
        </button>
        <button
          onClick={() => {
            onClearFastSearchResults();
            onClearImageResults();
          }}
          disabled={editingDisabled || isSearchingImages}
          className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Clear
        </button>
      </div>

      {fastSearchResults.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-300">
              <span className="text-green-400">Quick</span> Results - Click to see images:
            </h4>
            <button onClick={onClearFastSearchResults} className="text-xs text-gray-400 hover:text-white">
              Clear
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
            {fastSearchResults.map((result: any) => (
              <div
                key={result.id}
                onClick={() => !editingDisabled && onSelectFastGame(result)}
                className={`flex items-center gap-2 p-2 bg-gray-800 rounded border border-gray-700 hover:border-green-500 cursor-pointer transition-colors ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {result.coverUrl && (
                  <img src={result.coverUrl} alt="" className="w-10 h-14 object-cover rounded" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{result.name}</div>
                  <div className="text-xs text-gray-400">{result.releaseDate ? new Date(result.releaseDate * 1000).getFullYear() : ''}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-1 mb-4 border-b border-gray-800 overflow-x-auto">
        {imageSearchTabs.map((type) => (
          <button
            key={type}
            onClick={() => onImageSearchTabChange(type)}
            className={`px-3 py-2 text-xs font-medium uppercase border-b-2 transition-colors whitespace-nowrap ${activeImageSearchTab === type ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            {type === 'alternativeBanner' ? 'Alt Banner' : type} <span className="ml-1 opacity-70">({getImageCount(steamGridDBResults, type)})</span>
          </button>
        ))}
      </div>

      {activeImageSearchTab === 'all' && (
        <div className="space-y-8 pb-8">
          {Object.values(steamGridDBResults).every((arr) => arr.length === 0) && !isSearchingImages && (
            <div className="text-center text-gray-500 py-12 flex flex-col items-center">
              <svg className="w-12 h-12 mb-4 opacity-20 group- hover:animate-edit-image group-hover:animate-edit-image" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>No images found. Click "Quick All" to search everywhere.</p>
            </div>
          )}

          {steamGridDBResults.boxart.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-800 pb-1 flex justify-between">
                Boxart <span className="bg-gray-800 px-2 rounded text-gray-400">{steamGridDBResults.boxart.length}</span>
              </h4>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
                {renderResultGrid(
                  steamGridDBResults.boxart,
                  'all-boxart',
                  'No box art found',
                  (result) => result.url || result.boxArtUrl || result.coverUrl,
                  (url) => onSelectImage('boxart', url),
                  'group cursor-pointer aspect-[2/3] rounded overflow-hidden border border-gray-700 bg-gray-800 hover:border-green-500 transition-all',
                  'w-full h-full object-cover',
                )}
              </div>
            </div>
          )}

          {steamGridDBResults.logo.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-800 pb-1 flex justify-between">
                Logo <span className="bg-gray-800 px-2 rounded text-gray-400">{steamGridDBResults.logo.length}</span>
              </h4>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                {renderResultGrid(
                  steamGridDBResults.logo,
                  'all-logo',
                  'No logos found',
                  (result) => result.url || result.logoUrl,
                  (url) => onSelectImage('logo', url),
                  'group cursor-pointer flex items-center justify-center p-3 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all aspect-video',
                  'max-w-full max-h-full object-contain',
                )}
              </div>
            </div>
          )}

          {steamGridDBResults.banner.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-800 pb-1 flex justify-between">
                Banner <span className="bg-gray-800 px-2 rounded text-gray-400">{steamGridDBResults.banner.length}</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {renderResultGrid(
                  steamGridDBResults.banner,
                  'all-banner',
                  'No banners found',
                  (result) => result.url || result.bannerUrl,
                  (url) => onSelectImage('banner', url),
                  'group cursor-pointer aspect-video rounded overflow-hidden border border-gray-700 bg-gray-800 hover:border-green-500 transition-all',
                  'w-full h-full object-cover',
                )}
              </div>
            </div>
          )}

          {steamGridDBResults.icon.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-800 pb-1 flex justify-between">
                Icon <span className="bg-gray-800 px-2 rounded text-gray-400">{steamGridDBResults.icon.length}</span>
              </h4>
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                {renderResultGrid(
                  steamGridDBResults.icon,
                  'all-icon',
                  'No icons found',
                  (result) => result.url || result.iconUrl,
                  (url) => onSelectImage('icon', url),
                  'group cursor-pointer flex items-center justify-center p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all aspect-square',
                  'w-full h-full object-contain',
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeImageSearchTab === 'boxart' && (
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
          {renderResultGrid(
            steamGridDBResults.boxart,
            'boxart',
            'No box art found',
            (result) => result.url || result.boxArtUrl || result.coverUrl,
            (url) => onSelectImage('boxart', url),
            'group cursor-pointer aspect-[2/3] rounded overflow-hidden border border-gray-700 bg-gray-800 hover:border-green-500 transition-all',
            'w-full h-full object-cover',
          )}
        </div>
      )}

      {activeImageSearchTab === 'logo' && (
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
          {renderResultGrid(
            steamGridDBResults.logo,
            'logo',
            'No logos found',
            (result) => result.url || result.logoUrl,
            (url) => onSelectImage('logo', url),
            'group cursor-pointer flex items-center justify-center p-3 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all aspect-video',
            'max-w-full max-h-full object-contain',
          )}
        </div>
      )}

      {activeImageSearchTab === 'banner' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {renderResultGrid(
            steamGridDBResults.banner,
            'banner',
            'No banners found',
            (result) => result.url || result.bannerUrl,
            (url) => onSelectImage('banner', url),
            'group cursor-pointer aspect-video rounded overflow-hidden border border-gray-700 bg-gray-800 hover:border-green-500 transition-all',
            'w-full h-full object-cover',
          )}
        </div>
      )}

      {activeImageSearchTab === 'alternativeBanner' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {renderResultGrid(
            steamGridDBResults.alternativeBanner,
            'alt-banner',
            'No alt banners found',
            (result) => result.url || result.bannerUrl,
            (url) => onSelectImage('alternativeBanner', url),
            'group cursor-pointer aspect-video rounded overflow-hidden border border-gray-700 bg-gray-800 hover:border-green-500 transition-all',
            'w-full h-full object-cover',
          )}
        </div>
      )}

      {activeImageSearchTab === 'icon' && (
        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
          {renderResultGrid(
            steamGridDBResults.icon,
            'icon',
            'No icons found',
            (result) => result.url || result.iconUrl,
            (url) => onSelectImage('icon', url),
            'group cursor-pointer flex items-center justify-center p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all aspect-square',
            'w-full h-full object-contain',
          )}
        </div>
      )}

      {isSearchingImages && <div className="text-center text-gray-500 py-8 animate-pulse">Searching...</div>}
    </div>
  );
}
