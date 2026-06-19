import type { Game } from '../../types/game';
import type { ProviderName } from './imageSearchUtils';
import type { ProviderProgressEntry } from './providerProgressUtils';
import type { OrderedResultsByType } from './imageResultUtils';
import { ProviderStatusRow } from './ProviderStatusRow';
import { GameArtworkStrip } from './GameArtworkStrip';
import { FastSearchResultsList } from './FastSearchResultsList';
import { ImageSearchResultsSections } from './ImageSearchResultsSections';

type ImageType = 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon';
type ImageSearchTab = 'all' | ImageType;

interface FastSearchGameLike {
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

interface GameManagerImagesTabProps {
  editedGame: Game;
  selectedGame: Game;
  showImageSearch: { type: ImageType; gameId: string } | null;
  imageSearchQuery: string;
  isSearchingImages: boolean;
  isFastSearching: boolean;
  providerProgress: ProviderProgressEntry[];
  providerFilter: 'all' | ProviderName;
  fastSearchResults: FastSearchGameLike[];
  selectedFastGameId: number | null;
  activeImageSearchTab: ImageSearchTab;
  orderedResultsByType: OrderedResultsByType;
  hasRawImageResults: boolean;
  hasVisibleImageResults: boolean;
  onOpenImageSearch: (type: ImageType) => void;
  onOpenArtworkContextMenu: (event: { pageX: number; pageY: number }, type: ImageType) => void;
  onImageSearchQueryChange: (value: string) => void;
  onSubmitImageSearch: (type: ImageType) => void;
  onFastSearch: () => void;
  onBrowseImage: (type: ImageType) => void;
  onClearResults: () => void;
  onProviderFilterChange: (provider: 'all' | ProviderName) => void;
  getImageCountForProvider: (providerName: string) => number;
  onSelectFastGame: (game: FastSearchGameLike) => void;
  onImageLoadError: (url: string | undefined, event: React.SyntheticEvent<HTMLImageElement>) => void;
  onImageSearchTabChange: (tab: ImageSearchTab) => void;
  getImageResultCountForTab: (tab: ImageType) => number;
  getRenderableImageUrl: (value?: string) => string | undefined;
  onSelectImage: (imageUrl: string, type: ImageType) => void;
  matchesProviderFilter: (source?: string) => boolean;
  onUploadCustomImageClick: () => void;
  onUploadWebmClick: () => void;
  onOpenGoogleImageSearch: (query: string) => void;
}

export function GameManagerImagesTab({
  editedGame,
  selectedGame,
  showImageSearch,
  imageSearchQuery,
  isSearchingImages,
  isFastSearching,
  providerProgress,
  providerFilter,
  fastSearchResults,
  selectedFastGameId,
  activeImageSearchTab,
  orderedResultsByType,
  hasRawImageResults,
  hasVisibleImageResults,
  onOpenImageSearch,
  onOpenArtworkContextMenu,
  onImageSearchQueryChange,
  onSubmitImageSearch,
  onFastSearch,
  onBrowseImage,
  onClearResults,
  onProviderFilterChange,
  getImageCountForProvider,
  onSelectFastGame,
  onImageLoadError,
  onImageSearchTabChange,
  getImageResultCountForTab,
  getRenderableImageUrl,
  onSelectImage,
  matchesProviderFilter,
  onUploadCustomImageClick,
  onUploadWebmClick,
  onOpenGoogleImageSearch,
}: GameManagerImagesTabProps) {
  const currentTitle = editedGame?.title || selectedGame?.title || '';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="p-2 space-y-2 flex-shrink-0 bg-gray-900/95 z-10 border-b border-gray-800">
        <GameArtworkStrip
          editedGame={editedGame}
          selectedGame={selectedGame}
          onOpenImageSearch={onOpenImageSearch}
          onOpenContextMenu={onOpenArtworkContextMenu}
        />
      </div>

      {!hasRawImageResults && (
        <div className="border-t border-gray-800 pt-4 px-4 flex-shrink-0">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {showImageSearch ? `Search for ${showImageSearch.type}` : 'Search Images'}
              {showImageSearch && <span className="text-gray-500 ml-2">(click an image above to change type)</span>}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={imageSearchQuery}
                onChange={(event) => onImageSearchQueryChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    onSubmitImageSearch(showImageSearch?.type || 'boxart');
                  }
                }}
                placeholder="Enter game title..."
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500"
                disabled={isSearchingImages}
              />
              <button
                onClick={onFastSearch}
                disabled={isFastSearching || isSearchingImages}
                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Quick search all image types at once"
              >
                {isFastSearching ? 'Fast...' : 'Quick All'}
              </button>
              <button
                onClick={() => onBrowseImage(showImageSearch?.type || 'boxart')}
                disabled={isSearchingImages}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
                title={
                  showImageSearch?.type === 'banner' || showImageSearch?.type === 'alternativeBanner'
                    ? 'Upload a WEBM video file for this artwork type (animated backgrounds)'
                    : 'Browse for a local image or WEBM file for this artwork type'
                }
              >
                {showImageSearch?.type === 'banner' || showImageSearch?.type === 'alternativeBanner' ? 'Upload WEBM' : 'Browse'}
              </button>
              <button
                onClick={onClearResults}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                disabled={isSearchingImages}
              >
                Clear
              </button>
            </div>

            <ProviderStatusRow
              className="mt-3"
              providerProgress={providerProgress}
              providerFilter={providerFilter}
              onFilterChange={onProviderFilterChange}
              getImageCountForProvider={getImageCountForProvider}
            />
            <FastSearchResultsList
              fastSearchResults={fastSearchResults}
              selectedFastGameId={selectedFastGameId}
              onSelectGame={onSelectFastGame}
              onClear={onClearResults}
              onImageLoadError={onImageLoadError}
            />
          </div>
        </div>
      )}

      {hasRawImageResults && (
        <div className="border-t border-gray-800 bg-gray-900 px-4 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center justify-between mb-4 border-b border-gray-700 pb-2">
            <div className="flex items-center gap-1">
              {['all', 'boxart', 'logo', 'banner', 'alternativeBanner', 'icon'].map((tab) => {
                const typedTab = tab as ImageSearchTab;
                const label = typedTab === 'alternativeBanner' ? 'Alt Banner' : typedTab.charAt(0).toUpperCase() + typedTab.slice(1);
                const isActive = activeImageSearchTab === typedTab;
                let count = 0;
                if (typedTab === 'all') {
                  count = getImageResultCountForTab('boxart') + getImageResultCountForTab('banner') + getImageResultCountForTab('logo') + getImageResultCountForTab('icon');
                } else {
                  count = getImageResultCountForTab(typedTab);
                }

                return (
                  <button
                    key={typedTab}
                    onClick={() => onImageSearchTabChange(typedTab)}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-green-500 text-green-400' : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'}`}
                  >
                    {label}
                    {count > 0 && <span className="ml-2 text-xs opacity-60 bg-gray-800 px-1.5 py-0.5 rounded-full">{count}</span>}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onUploadCustomImageClick}
                className="text-xs px-3 py-1 rounded border border-blue-500 bg-blue-600/20 text-blue-100 hover:bg-blue-600/30 hover:border-blue-400 transition-colors flex items-center gap-1"
              >
                Upload Image
              </button>
              <button onClick={onUploadWebmClick} className="text-xs px-3 py-1 rounded border border-emerald-500 bg-emerald-600/20 text-emerald-200 hover:bg-emerald-600/30 hover:border-emerald-400 transition-colors flex items-center gap-1">
                Upload WEBM
              </button>
              <button onClick={onClearResults} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 px-3 py-1 bg-gray-800 rounded border border-gray-700 hover:border-gray-500">
                New Search
              </button>
            </div>
          </div>
          <ProviderStatusRow
            className="px-1 pb-2"
            providerProgress={providerProgress}
            providerFilter={providerFilter}
            onFilterChange={onProviderFilterChange}
            getImageCountForProvider={getImageCountForProvider}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-1 custom-scrollbar relative">
        {hasRawImageResults && (
          <div>
            <div className="space-y-8">
              {!hasVisibleImageResults && (
                <div className="rounded-lg border border-gray-700 bg-gray-800/40 p-6 text-center">
                  <p className="text-sm text-gray-300">No results found for the current image filter.</p>
                  <p className="text-xs text-gray-500 mt-1">Try turning off filters or switching to another filter mode.</p>
                </div>
              )}
              <ImageSearchResultsSections
                activeImageSearchTab={activeImageSearchTab}
                orderedResultsByType={orderedResultsByType}
                providerFilter={providerFilter}
                getRenderableImageUrl={getRenderableImageUrl}
                handleImageResultLoadError={onImageLoadError}
                handleSelectImage={onSelectImage}
                getImageResultCountForTab={getImageResultCountForTab}
                matchesProviderFilter={matchesProviderFilter}
              />
            </div>
          </div>
        )}

        <div className="mt-8 mx-4 pt-6 border-t border-gray-800 pb-8 text-center opacity-80 hover:opacity-100 transition-opacity">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Can't find what you're looking for?</h4>
          <p className="text-xs text-gray-500 mb-4 max-w-md mx-auto">
            You can search Google Images for the exact asset you need, save it, and use the "Browse" button or <strong>Right-Click</strong> on the image slots above to upload it.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button onClick={() => onOpenGoogleImageSearch(`${currentTitle} box art`)} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-gray-300 rounded transition-all">Search Box Art</button>
            <button onClick={() => onOpenGoogleImageSearch(`${currentTitle} game logo transparent`)} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-gray-300 rounded transition-all">Search Logo</button>
            <button onClick={() => onOpenGoogleImageSearch(`${currentTitle} game banner wallpaper`)} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-gray-300 rounded transition-all">Search Banner</button>
            <button onClick={() => onOpenGoogleImageSearch(`${currentTitle} game icon`)} className="px-3 py-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-blue-500 text-gray-300 rounded transition-all">Search Icon</button>
          </div>
        </div>
      </div>
    </div>
  );
}
