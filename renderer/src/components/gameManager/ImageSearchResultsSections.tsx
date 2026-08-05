import type { ProviderName } from './imageSearchUtils';
import type { OrderedResultsByType } from './imageResultUtils';

type ImageSearchTab = 'all' | 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon';
type ImageType = 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon';

interface ImageSearchResultsSectionsProps {
  activeImageSearchTab: ImageSearchTab;
  orderedResultsByType: OrderedResultsByType;
  providerFilter: 'all' | ProviderName;
  getRenderableImageUrl: (value?: string) => string | undefined;
  handleImageResultLoadError: (url: string | undefined, event: React.SyntheticEvent<HTMLImageElement>) => void;
  handleSelectImage: (imageUrl: string, type: ImageType) => void;
  getImageResultCountForTab: (tab: ImageType) => number;
  matchesProviderFilter: (source?: string) => boolean;
}

export function ImageSearchResultsSections({
  activeImageSearchTab,
  orderedResultsByType,
  getRenderableImageUrl,
  handleImageResultLoadError,
  handleSelectImage,
  getImageResultCountForTab,
  matchesProviderFilter,
}: ImageSearchResultsSectionsProps) {
  return (
    <div className="space-y-8">
      {(activeImageSearchTab === 'all' || activeImageSearchTab === 'boxart') &&
        (getImageResultCountForTab('boxart') > 0) && (
          <div>
            {activeImageSearchTab === 'all' && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Box Art & Covers</h4>}
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
              {orderedResultsByType.boxart.filter((result: any) => matchesProviderFilter(result.source)).map((result, idx) => (
                <div
                  key={`igdb-boxart-${result.id}-${idx}`}
                  onClick={() => handleSelectImage(result.boxArtUrl || result.coverUrl, 'boxart')}
                  className="group cursor-pointer"
                >
                  <div className="aspect-[2/3] rounded overflow-hidden border border-gray-700 bg-gray-800 group-hover:border-green-500 transition-all relative">
                    <img
                      src={result.boxArtUrl || result.coverUrl}
                      alt={result.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                      onError={(event) => {
                        handleImageResultLoadError(result.boxArtUrl || result.coverUrl, event);
                      }}
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                      <p className="text-[10px] text-white truncate text-center">{result.source || 'IGDB'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      {(activeImageSearchTab === 'all' || activeImageSearchTab === 'logo') &&
        (getImageResultCountForTab('logo') > 0) && (
          <div>
            {activeImageSearchTab === 'all' && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Logos</h4>}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
              {orderedResultsByType.logo.filter((result: any) => matchesProviderFilter(result.source)).map((result, idx) => (
                <div
                  key={`igdb-logo-${idx}`}
                  onClick={() => handleSelectImage(result.logoUrl, 'logo')}
                  className="group cursor-pointer flex items-center justify-center p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all h-24"
                >
                  <img
                    src={result.logoUrl}
                    alt="Logo"
                    loading="lazy"
                    decoding="async"
                    className="max-w-full max-h-full object-contain"
                    onError={(event) => {
                      handleImageResultLoadError(result.logoUrl, event);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

      {(activeImageSearchTab === 'all' || activeImageSearchTab === 'banner') &&
        (getImageResultCountForTab('banner') > 0) && (
          <div>
            {activeImageSearchTab === 'all' && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Banners & Screenshots</h4>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {orderedResultsByType.banner.filter((result: any) => matchesProviderFilter(result.source)).map((result, idx) => {
                const url = getRenderableImageUrl(result.bannerUrl || result.screenshotUrls?.[0]);
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
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                        onError={(event) => {
                          handleImageResultLoadError(url, event);
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                        <p className="text-[10px] text-white truncate text-center">{result.source || result.name}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {(activeImageSearchTab === 'all' || activeImageSearchTab === 'alternativeBanner') &&
        (getImageResultCountForTab('alternativeBanner') > 0) && (
          <div>
            {activeImageSearchTab === 'all' && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Alternative Banners</h4>}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {orderedResultsByType.banner.filter((result: any) => matchesProviderFilter(result.source)).map((result, idx) => {
                const url = getRenderableImageUrl(result.bannerUrl || result.screenshotUrls?.[0]);
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
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover"
                        onError={(event) => {
                          handleImageResultLoadError(url, event);
                        }}
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                        <p className="text-[10px] text-white truncate text-center">{result.source || result.name}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      {(activeImageSearchTab === 'all' || activeImageSearchTab === 'icon') &&
        (getImageResultCountForTab('icon') > 0) && (
          <div>
            {activeImageSearchTab === 'all' && <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Icons</h4>}
            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
              {orderedResultsByType.icon.filter((result: any) => matchesProviderFilter(result.source)).map((result, idx) => {
                const url = getRenderableImageUrl(result.iconUrl);
                if (!url) return null;
                return (
                  <div
                    key={`igdb-icon-${idx}`}
                    onClick={() => handleSelectImage(url, 'icon')}
                    className="group cursor-pointer flex items-center justify-center p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all aspect-square"
                  >
                    <img
                      src={url}
                      alt="Icon"
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-contain"
                      onError={(event) => {
                        handleImageResultLoadError(url, event);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
}
