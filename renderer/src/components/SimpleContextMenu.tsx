import React, { useEffect, useRef } from 'react';

interface SimpleContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onEditAppearance: () => void;
  viewMode: 'grid' | 'list' | 'logo' | 'carousel';
  onViewModeChange?: (mode: 'grid' | 'list' | 'logo' | 'carousel') => void;
  gridSize?: number;
  onGridSizeChange?: (size: number) => void;
  logoSize?: number;
  onLogoSizeChange?: (size: number) => void;
  listSize?: number;
  onListSizeChange?: (size: number) => void;
  gameTilePadding?: number;
  onGameTilePaddingChange?: (padding: number) => void;
  backgroundBlur?: number;
  onBackgroundBlurChange?: (blur: number) => void;
  selectedBoxArtSize?: number;
  onSelectedBoxArtSizeChange?: (size: number) => void;
  carouselLogoSize?: number;
  onCarouselLogoSizeChange?: (size: number) => void;
  detailsBarSize?: number;
  onDetailsBarSizeChange?: (size: number) => void;
  showCarouselDetails?: boolean;
  onShowCarouselDetailsChange?: (show: boolean) => void;
  showCarouselLogos?: boolean;
  onShowCarouselLogosChange?: (show: boolean) => void;
  carouselButtonSize?: number;
  onCarouselButtonSizeChange?: (size: number) => void;
  carouselDescriptionSize?: number;
  onCarouselDescriptionSizeChange?: (size: number) => void;
  // Grid view specific props
  showLogoOverBoxart?: boolean;
  onShowLogoOverBoxartChange?: (show: boolean) => void;
  logoPosition?: 'top' | 'middle' | 'bottom' | 'underneath';
  onLogoPositionChange?: (position: 'top' | 'middle' | 'bottom' | 'underneath') => void;
  // Logo view specific props
  logoBackgroundColor?: string;
  onLogoBackgroundColorChange?: (color: string) => void;
  logoBackgroundOpacity?: number;
  onLogoBackgroundOpacityChange?: (opacity: number) => void;
  // Right panel (GameDetailsPanel) specific props
  rightPanelLogoSize?: number;
  onRightPanelLogoSizeChange?: (size: number) => void;
  rightPanelBoxartPosition?: 'left' | 'right' | 'none';
  onRightPanelBoxartPositionChange?: (position: 'left' | 'right' | 'none') => void;
  rightPanelBoxartSize?: number;
  onRightPanelBoxartSizeChange?: (size: number) => void;
  rightPanelTextSize?: number;
  onRightPanelTextSizeChange?: (size: number) => void;
  rightPanelButtonSize?: number;
  onRightPanelButtonSizeChange?: (size: number) => void;
  rightPanelButtonLocation?: 'left' | 'middle' | 'right';
  onRightPanelButtonLocationChange?: (location: 'left' | 'middle' | 'right') => void;
}

export const SimpleContextMenu: React.FC<SimpleContextMenuProps> = ({
  x,
  y,
  onClose,
  onEditAppearance,
  viewMode,
  onViewModeChange,
  gridSize = 120,
  onGridSizeChange,
  logoSize = 120,
  onLogoSizeChange,
  listSize = 128,
  onListSizeChange,
  gameTilePadding = 16,
  onGameTilePaddingChange,
  backgroundBlur = 40,
  onBackgroundBlurChange,
  selectedBoxArtSize = 12.5,
  onSelectedBoxArtSizeChange,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (x + rect.width > viewportWidth) {
        menuRef.current.style.left = `${viewportWidth - rect.width - 10}px`;
      }
      if (y + rect.height > viewportHeight) {
        menuRef.current.style.top = `${viewportHeight - rect.height - 10}px`;
      }
    }
  }, [x, y]);

  const handleEditAppearance = () => {
    onEditAppearance();
    onClose();
  };

  const handleViewModeChange = (mode: 'grid' | 'list' | 'logo' | 'carousel') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  // Get the appropriate size value based on view mode
  const getSizeValue = () => {
    if (viewMode === 'grid') return gridSize;
    if (viewMode === 'logo') return logoSize;
    return listSize;
  };

  // Get the appropriate size change handler based on view mode
  const handleSizeChange = (value: number) => {
    if (viewMode === 'grid' && onGridSizeChange) onGridSizeChange(value);
    if (viewMode === 'logo' && onLogoSizeChange) onLogoSizeChange(value);
    if (viewMode === 'list' && onListSizeChange) onListSizeChange(value);
  };

  // Get size label based on view mode
  const getSizeLabel = () => {
    if (viewMode === 'grid') return 'Grid Size';
    if (viewMode === 'logo') return 'Logo Size';
    return 'List View Size';
  };

  // Get size range based on view mode
  const getSizeRange = () => {
    if (viewMode === 'grid') return { min: 80, max: 500 };
    if (viewMode === 'logo') return { min: 80, max: 500 };
    return { min: 80, max: 200 };
  };

  const sizeValue = getSizeValue();
  const sizeRange = getSizeRange();

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[360px] py-1"
      style={{ left: `${x}px`, top: `${y}px` }}
    >
      {/* View Mode Toggle Buttons - Single Row */}
      <div className="px-3 py-3 grid grid-cols-4 gap-2">
        <button
          onClick={() => handleViewModeChange('grid')}
          className={`px-3 py-2 text-sm rounded transition-colors flex flex-col items-center gap-1 font-medium ${
            viewMode === 'grid'
              ? 'bg-blue-600/40 text-white border border-blue-500'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
          }`}
          title="Grid View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Grid
        </button>
        <button
          onClick={() => handleViewModeChange('list')}
          className={`px-3 py-2 text-sm rounded transition-colors flex flex-col items-center gap-1 font-medium ${
            viewMode === 'list'
              ? 'bg-blue-600/40 text-white border border-blue-500'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
          }`}
          title="List View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          List
        </button>
        <button
          onClick={() => handleViewModeChange('logo')}
          className={`px-3 py-2 text-sm rounded transition-colors flex flex-col items-center gap-1 font-medium ${
            viewMode === 'logo'
              ? 'bg-blue-600/40 text-white border border-blue-500'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
          }`}
          title="Logo View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Logo
        </button>
        <button
          onClick={() => handleViewModeChange('carousel')}
          className={`px-3 py-2 text-sm rounded transition-colors flex flex-col items-center gap-1 font-medium ${
            viewMode === 'carousel'
              ? 'bg-blue-600/40 text-white border border-blue-500'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
          }`}
          title="Carousel View"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
          Carousel
        </button>
      </div>

      <div className="border-t border-gray-700 my-2" />

      {/* View-specific size controls */}
      {((viewMode === 'grid' && onGridSizeChange) || 
        (viewMode === 'logo' && onLogoSizeChange) || 
        (viewMode === 'list' && onListSizeChange)) && (
        <div className="px-4 py-3">
          <label className="block text-xs text-gray-400 mb-2 font-semibold">{getSizeLabel()}</label>
          <input
            type="range"
            min={sizeRange.min}
            max={sizeRange.max}
            step="1"
            value={sizeValue}
            onChange={(e) => handleSizeChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{sizeRange.min}px</span>
            <span className="font-medium text-gray-300">{sizeValue}px</span>
            <span>{sizeRange.max}px</span>
          </div>
        </div>
      )}

      {/* Game Tile Padding - for Grid, Logo, and Carousel views */}
      {(viewMode === 'grid' || viewMode === 'logo' || viewMode === 'carousel') && onGameTilePaddingChange && (
        <div className="px-4 py-3">
          <label className="block text-xs text-gray-400 mb-2 font-semibold">Game Tile Padding</label>
          <input
            type="range"
            min="0"
            max="32"
            step="1"
            value={gameTilePadding}
            onChange={(e) => onGameTilePaddingChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0px</span>
            <span className="font-medium text-gray-300">{gameTilePadding}px</span>
            <span>32px</span>
          </div>
        </div>
      )}

      {/* Selected Box Art Size - for Carousel view only */}
      {viewMode === 'carousel' && onSelectedBoxArtSizeChange && (
        <div className="px-4 py-3">
          <label className="block text-xs text-gray-400 mb-2 font-semibold">Selected Box Art Size</label>
          <input
            type="range"
            min="5"
            max="30"
            step="0.5"
            value={selectedBoxArtSize}
            onChange={(e) => onSelectedBoxArtSizeChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>5vw</span>
            <span className="font-medium text-gray-300">{selectedBoxArtSize}vw</span>
            <span>30vw</span>
          </div>
        </div>
      )}

      {/* Background Blur Amount - for all views */}
      {onBackgroundBlurChange && (
        <div className="px-4 py-3">
          <label className="block text-xs text-gray-400 mb-2 font-semibold">Background Blur Amount</label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={backgroundBlur}
            onChange={(e) => onBackgroundBlurChange(Number(e.target.value))}
            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>0px</span>
            <span className="font-medium text-gray-300">{backgroundBlur}px</span>
            <span>100px</span>
          </div>
        </div>
      )}

      <div className="border-t border-gray-700 my-1" />

      {/* More Settings button */}
      <button
        onClick={handleEditAppearance}
        className="w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        More Settings
      </button>
    </div>
  );
};
