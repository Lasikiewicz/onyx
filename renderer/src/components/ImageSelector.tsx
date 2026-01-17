import React from 'react';

export interface ImageResult {
    id: string;
    url: string;
    title?: string;
    source?: string;
    score?: number;
    width?: number;
    height?: number;
    mime?: string;
    isAnimated?: boolean;
}

interface ImageSelectorProps {
    images: ImageResult[];
    onSelect: (url: string) => void;
    selectedUrl?: string;
    imageType: 'boxart' | 'banner' | 'logo' | 'icon';
    isLoading?: boolean;
    emptyMessage?: string;
}

export const ImageSelector: React.FC<ImageSelectorProps> = ({
    images,
    onSelect,
    selectedUrl,
    imageType,
    isLoading,
    emptyMessage = 'No images found.',
}) => {
    const getAspectRatio = () => {
        switch (imageType) {
            case 'boxart':
                return 'aspect-[2/3]';
            case 'banner':
                return 'aspect-[16/9]';
            case 'logo':
                return 'aspect-video object-contain p-4';
            case 'icon':
                return 'aspect-square';
            default:
                return 'aspect-[2/3]';
        }
    };

    const getGridCols = () => {
        switch (imageType) {
            case 'boxart':
                return 'grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10';
            case 'banner':
                return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
            case 'logo':
                return 'grid-cols-3 sm:grid-cols-4';
            case 'icon':
                return 'grid-cols-4 sm:grid-cols-8 lg:grid-cols-12';
            default:
                return 'grid-cols-4';
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 animate-pulse">Searching for {imageType}s...</p>
            </div>
        );
    }

    if (images.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <svg className="w-12 h-12 text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={`grid ${getGridCols()} gap-3 overflow-y-auto pr-2 max-h-[60vh]`}>
            {images.map((result) => {
                const isSelected = selectedUrl === result.url;
                const isAnimated = result.isAnimated || result.url?.includes('.webp') || result.url?.includes('.gif');

                return (
                    <div
                        key={result.id}
                        className={`relative group cursor-pointer border-2 rounded-lg overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] ${isSelected
                                ? 'border-blue-500 ring-2 ring-blue-500/50 shadow-lg shadow-blue-500/20'
                                : 'border-gray-700/50 hover:border-gray-500 bg-gray-900/40'
                            }`}
                        onClick={() => onSelect(result.url)}
                    >
                        <div className={`${getAspectRatio()} relative overflow-hidden bg-gray-800 flex items-center justify-center`}>
                            <img
                                src={result.url}
                                alt={result.title || imageType}
                                className={`w-full h-full object-cover transition-opacity duration-300 ${imageType === 'logo' ? 'object-contain' : ''}`}
                                onLoad={(e) => {
                                    (e.target as HTMLImageElement).classList.remove('opacity-0');
                                }}
                                onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450?text=Error';
                                }}
                            />

                            {/* Overlay with details on hover */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
                                {result.width && result.height && (
                                    <div className="text-[10px] text-gray-300 font-medium truncate">
                                        {result.width}x{result.height}
                                    </div>
                                )}
                                {result.source && (
                                    <div className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                                        {result.source}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Badges */}
                        <div className="absolute top-1 left-1 flex flex-col gap-1">
                            {isAnimated && (
                                <div className="bg-purple-600/90 text-white text-[10px] px-1.5 py-0.5 rounded font-bold shadow-sm backdrop-blur-sm">
                                    GIF
                                </div>
                            )}
                        </div>

                        {/* Selected Indicator */}
                        {isSelected && (
                            <div className="absolute inset-0 bg-blue-500/10 flex items-center justify-center">
                                <div className="bg-blue-500 rounded-full p-1.5 shadow-lg animate-in zoom-in duration-200">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
