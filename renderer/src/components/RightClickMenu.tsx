import React, { useEffect, useRef } from 'react';

interface RightClickMenuProps {
  x: number;
  y: number;
  onClose: () => void;
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
  carouselDescriptionAlignment?: 'left' | 'center' | 'right';
  onCarouselDescriptionAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  carouselButtonAlignment?: 'left' | 'center' | 'right';
  onCarouselButtonAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  carouselLogoAlignment?: 'left' | 'center' | 'right';
  onCarouselLogoAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  // Grid view specific props
  showLogoOverBoxart?: boolean;
  onShowLogoOverBoxartChange?: (show: boolean) => void;
  logoPosition?: 'top' | 'middle' | 'bottom' | 'underneath';
  onLogoPositionChange?: (position: 'top' | 'middle' | 'bottom' | 'underneath') => void;
  logoBackgroundColor?: string;
  onLogoBackgroundColorChange?: (color: string) => void;
  logoBackgroundOpacity?: number;
  onLogoBackgroundOpacityChange?: (opacity: number) => void;
  gridDescriptionSize?: number;
  onGridDescriptionSizeChange?: (size: number) => void;
  gridButtonSize?: number;
  onGridButtonSizeChange?: (size: number) => void;
  gridButtonLocation?: 'left' | 'middle' | 'right';
  onGridButtonLocationChange?: (location: 'left' | 'middle' | 'right') => void;
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

export const RightClickMenu: React.FC<RightClickMenuProps> = ({
  x,
  y,
  onClose,
  viewMode,
  onViewModeChange,
  gridSize = 120,
  onGridSizeChange,
  logoSize = 120,
  onLogoSizeChange,
  listSize = 128,
  onListSizeChange,
  gameTilePadding = 3,
  onGameTilePaddingChange,
  backgroundBlur = 40,
  onBackgroundBlurChange,
  selectedBoxArtSize = 12.5,
  onSelectedBoxArtSizeChange,
  carouselLogoSize = 100,
  onCarouselLogoSizeChange,
  detailsBarSize = 14,
  onDetailsBarSizeChange,
  showCarouselDetails = true,
  onShowCarouselDetailsChange,
  showCarouselLogos = true,
  onShowCarouselLogosChange,
  carouselButtonSize = 14,
  onCarouselButtonSizeChange,
  carouselDescriptionSize = 18,
  onCarouselDescriptionSizeChange,
  carouselDescriptionAlignment = 'center',
  onCarouselDescriptionAlignmentChange,
  carouselButtonAlignment = 'center',
  onCarouselButtonAlignmentChange,
  carouselLogoAlignment = 'center',
  onCarouselLogoAlignmentChange,
  // Grid view specific props
  showLogoOverBoxart = true,
  onShowLogoOverBoxartChange,
  logoPosition = 'middle',
  onLogoPositionChange,
  // Right panel (GameDetailsPanel) specific props
  rightPanelLogoSize = 100,
  onRightPanelLogoSizeChange,
  rightPanelBoxartPosition = 'right',
  onRightPanelBoxartPositionChange,
  rightPanelBoxartSize = 120,
  onRightPanelBoxartSizeChange,
  rightPanelTextSize = 14,
  onRightPanelTextSizeChange,
  rightPanelButtonSize = 14,
  onRightPanelButtonSizeChange,
  rightPanelButtonLocation = 'right',
  onRightPanelButtonLocationChange,
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

  const handleViewModeChange = (mode: 'grid' | 'list' | 'logo' | 'carousel') => {
    if (onViewModeChange) {
      onViewModeChange(mode);
    }
  };

  // Get the appropriate size value based on view mode (excluding grid)
  const getSizeValue = () => {
    if (viewMode === 'logo') return logoSize;
    return listSize;
  };

  // Get the appropriate size change handler based on view mode (excluding grid)
  const handleSizeChange = (value: number) => {
    if (viewMode === 'logo' && onLogoSizeChange) onLogoSizeChange(value);
    if (viewMode === 'list' && onListSizeChange) onListSizeChange(value);
  };

  // Get size label based on view mode (excluding grid)
  const getSizeLabel = () => {
    if (viewMode === 'logo') return 'Logo Size';
    return 'List View Size';
  };

  // Get size range based on view mode (excluding grid)
  const getSizeRange = () => {
    if (viewMode === 'logo') return { min: 80, max: 500 };
    return { min: 80, max: 200 };
  };

  const sizeValue = getSizeValue();
  const sizeRange = getSizeRange();

  const handleShowCarouselDetailsToggle = () => {
    onShowCarouselDetailsChange?.(!showCarouselDetails);
  };

  const handleShowCarouselLogosToggle = () => {
    onShowCarouselLogosChange?.(!showCarouselLogos);
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1"
      style={{ 
        left: `${x}px`, 
        top: `${y}px`,
        minWidth: (viewMode === 'carousel' || viewMode === 'grid') ? '600px' : '360px'
      }}
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

      {/* View-specific size controls - exclude Grid view since it has its own section */}
      {((viewMode === 'logo' && onLogoSizeChange) || 
        (viewMode === 'list' && onListSizeChange)) && (
        <div className="px-4 py-2">
          <label className="block text-xs text-gray-400 mb-1 font-semibold">{getSizeLabel()}</label>
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

      {/* Carousel Settings - in two columns */}
      {viewMode === 'carousel' && (
        <>
          <div className="px-2 py-2">
            <div className="grid grid-cols-2 gap-3">
              {/* Left Column */}
              <div className="space-y-2">
                {/* Details Section */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  {/* Show Details Toggle */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-400 font-medium">Show Details Across Top</label>
                    <button
                      onClick={handleShowCarouselDetailsToggle}
                      className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${
                        showCarouselDetails ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                          showCarouselDetails ? 'translate-x-3' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Details Bar Size - only show when details are enabled */}
                  {showCarouselDetails && onDetailsBarSizeChange && (
                    <>
                      <label className="block text-xs text-gray-400 mb-1 font-semibold">Details Bar Size</label>
                      <input
                        type="range"
                        min="10"
                        max="24"
                        step="1"
                        value={detailsBarSize}
                        onChange={(e) => onDetailsBarSizeChange(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>10px</span>
                        <span className="font-medium text-gray-300">{detailsBarSize}px</span>
                        <span>24px</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Selected Box Art Size */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Selected Box Art Size</label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="0.5"
                    value={selectedBoxArtSize}
                    onChange={(e) => onSelectedBoxArtSizeChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>5vw</span>
                    <span className="font-medium text-gray-300">{selectedBoxArtSize}vw</span>
                    <span>30vw</span>
                  </div>
                </div>

                {/* Game Tile Padding - for Carousel */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Game Tile Padding</label>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="1"
                    value={gameTilePadding}
                    onChange={(e) => onGameTilePaddingChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0px</span>
                    <span className="font-medium text-gray-300">{gameTilePadding}px</span>
                    <span>3px</span>
                  </div>
                </div>

                {/* Background Blur Amount - for Carousel */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Background Blur Amount</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={backgroundBlur}
                    onChange={(e) => onBackgroundBlurChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0px</span>
                    <span className="font-medium text-gray-300">{backgroundBlur}px</span>
                    <span>100px</span>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-2">
                {/* Game Logos Section */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  {/* Show Game Logos Toggle */}
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-400 font-medium">Show Game Logos</label>
                    <button
                      onClick={handleShowCarouselLogosToggle}
                      className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${
                        showCarouselLogos ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                          showCarouselLogos ? 'translate-x-3' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Logo Size - only show when logos are enabled */}
                  {showCarouselLogos && onCarouselLogoSizeChange && (
                    <>
                      <label className="block text-xs text-gray-400 mb-1 font-semibold">Logo Size</label>
                      <input
                        type="range"
                        min="50"
                        max="400"
                        step="5"
                        value={carouselLogoSize}
                        onChange={(e) => onCarouselLogoSizeChange(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>50px</span>
                        <span className="font-medium text-gray-300">{carouselLogoSize}px</span>
                        <span>400px</span>
                      </div>
                    </>
                  )}

                  {/* Logo Alignment - only show when logos are enabled */}
                  {showCarouselLogos && onCarouselLogoAlignmentChange && (
                    <>
                      <label className="block text-xs text-gray-400 mb-2 font-semibold mt-3">Logo Alignment</label>
                      <div className="flex gap-1">
                        {(['left', 'center', 'right'] as const).map((alignment) => (
                          <button
                            key={alignment}
                            onClick={() => onCarouselLogoAlignmentChange(alignment)}
                            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                              carouselLogoAlignment === alignment
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                            }`}
                          >
                            {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* Description Text Size */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Description Text Size</label>
                  <input
                    type="range"
                    min="12"
                    max="28"
                    step="1"
                    value={carouselDescriptionSize}
                    onChange={(e) => onCarouselDescriptionSizeChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>12px</span>
                    <span className="font-medium text-gray-300">{carouselDescriptionSize}px</span>
                    <span>28px</span>
                  </div>
                </div>

                {/* Description Text Alignment */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-2 font-semibold">Description Text Alignment</label>
                  <div className="flex gap-1">
                    {(['left', 'center', 'right'] as const).map((alignment) => (
                      <button
                        key={alignment}
                        onClick={() => onCarouselDescriptionAlignmentChange?.(alignment)}
                        className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                          carouselDescriptionAlignment === alignment
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                      >
                        {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Button Size */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Button Size</label>
                  <input
                    type="range"
                    min="10"
                    max="24"
                    step="1"
                    value={carouselButtonSize}
                    onChange={(e) => onCarouselButtonSizeChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10px</span>
                    <span className="font-medium text-gray-300">{carouselButtonSize}px</span>
                    <span>24px</span>
                  </div>
                </div>

                {/* Button Alignment */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-2 font-semibold">Button Alignment</label>
                  <div className="flex gap-1">
                    {(['left', 'center', 'right'] as const).map((alignment) => (
                      <button
                        key={alignment}
                        onClick={() => onCarouselButtonAlignmentChange?.(alignment)}
                        className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                          carouselButtonAlignment === alignment
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                        }`}
                      >
                        {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Grid Settings - in two columns */}
      {viewMode === 'grid' && (
        <>
          <div className="px-2 py-2">
            <div className="grid grid-cols-2 gap-3">
              {/* Left Column */}
              <div className="space-y-2">
                {/* Show Logo Over Boxart Toggle */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-400 font-medium">Show Logo Over Boxart</label>
                    <button
                      onClick={() => onShowLogoOverBoxartChange?.(!showLogoOverBoxart)}
                      className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${
                        showLogoOverBoxart ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                          showLogoOverBoxart ? 'translate-x-3' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Logo Position - only show when toggle is on */}
                  {showLogoOverBoxart && (
                    <>
                      <label className="block text-xs text-gray-400 mb-2 font-semibold">Logo Position</label>
                      <div className="grid grid-cols-3 gap-1 mb-2">
                        <button
                          onClick={() => onLogoPositionChange?.('top')}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            logoPosition === 'top'
                              ? 'bg-blue-600/40 text-white border border-blue-500'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                          }`}
                        >
                          Top
                        </button>
                        <button
                          onClick={() => onLogoPositionChange?.('middle')}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            logoPosition === 'middle'
                              ? 'bg-blue-600/40 text-white border border-blue-500'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                          }`}
                        >
                          Middle
                        </button>
                        <button
                          onClick={() => onLogoPositionChange?.('bottom')}
                          className={`px-2 py-1 text-xs rounded transition-colors ${
                            logoPosition === 'bottom'
                              ? 'bg-blue-600/40 text-white border border-blue-500'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                          }`}
                        >
                          Bottom
                        </button>
                      </div>
                      <button
                        onClick={() => onLogoPositionChange?.('underneath')}
                        className={`w-full px-2 py-1 text-xs rounded transition-colors ${
                          logoPosition === 'underneath'
                            ? 'bg-blue-600/40 text-white border border-blue-500'
                            : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                        }`}
                      >
                        Below
                      </button>
                    </>
                  )}
                </div>

                {/* Grid Size */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Grid Size</label>
                  <input
                    type="range"
                    min="80"
                    max="500"
                    step="1"
                    value={gridSize}
                    onChange={(e) => onGridSizeChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>80px</span>
                    <span className="font-medium text-gray-300">{gridSize}px</span>
                    <span>500px</span>
                  </div>
                </div>

                {/* Game Tile Padding */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Game Tile Padding</label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={gameTilePadding}
                    onChange={(e) => onGameTilePaddingChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0px</span>
                    <span className="font-medium text-gray-300">{gameTilePadding}px</span>
                    <span>10px</span>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-2">
                {/* Resize Logo */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Resize Logo</label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="5"
                    value={rightPanelLogoSize}
                    onChange={(e) => onRightPanelLogoSizeChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>50px</span>
                    <span className="font-medium text-gray-300">{rightPanelLogoSize}px</span>
                    <span>200px</span>
                  </div>
                </div>

                {/* Boxart Position and Size - Grouped together */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-2 font-semibold">Boxart Position</label>
                  <div className="grid grid-cols-3 gap-1 mb-3">
                    <button
                      onClick={() => onRightPanelBoxartPositionChange?.('left')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        rightPanelBoxartPosition === 'left'
                          ? 'bg-blue-600/40 text-white border border-blue-500'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                      }`}
                    >
                      Left
                    </button>
                    <button
                      onClick={() => onRightPanelBoxartPositionChange?.('right')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        rightPanelBoxartPosition === 'right'
                          ? 'bg-blue-600/40 text-white border border-blue-500'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                      }`}
                    >
                      Right
                    </button>
                    <button
                      onClick={() => onRightPanelBoxartPositionChange?.('none')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        rightPanelBoxartPosition === 'none'
                          ? 'bg-blue-600/40 text-white border border-blue-500'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                      }`}
                    >
                      None
                    </button>
                  </div>

                  {/* Resize Boxart - only show when left or right is selected */}
                  {(rightPanelBoxartPosition === 'left' || rightPanelBoxartPosition === 'right') && (
                    <>
                      <label className="block text-xs text-gray-400 mb-1 font-semibold">Resize Boxart</label>
                      <input
                        type="range"
                        min="80"
                        max="200"
                        step="5"
                        value={rightPanelBoxartSize}
                        onChange={(e) => onRightPanelBoxartSizeChange?.(Number(e.target.value))}
                        className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>80px</span>
                        <span className="font-medium text-gray-300">{rightPanelBoxartSize}px</span>
                        <span>200px</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Text Size */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Text Size</label>
                  <input
                    type="range"
                    min="10"
                    max="24"
                    step="1"
                    value={rightPanelTextSize}
                    onChange={(e) => onRightPanelTextSizeChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10px</span>
                    <span className="font-medium text-gray-300">{rightPanelTextSize}px</span>
                    <span>24px</span>
                  </div>
                </div>

                {/* Button Size */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-1 font-semibold">Button Size</label>
                  <input
                    type="range"
                    min="10"
                    max="24"
                    step="1"
                    value={rightPanelButtonSize}
                    onChange={(e) => onRightPanelButtonSizeChange?.(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>10px</span>
                    <span className="font-medium text-gray-300">{rightPanelButtonSize}px</span>
                    <span>24px</span>
                  </div>
                </div>

                {/* Button Location */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <label className="block text-xs text-gray-400 mb-2 font-semibold">Button Location</label>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      onClick={() => onRightPanelButtonLocationChange?.('left')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        rightPanelButtonLocation === 'left'
                          ? 'bg-blue-600/40 text-white border border-blue-500'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                      }`}
                    >
                      Left
                    </button>
                    <button
                      onClick={() => onRightPanelButtonLocationChange?.('middle')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        rightPanelButtonLocation === 'middle'
                          ? 'bg-blue-600/40 text-white border border-blue-500'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                      }`}
                    >
                      Middle
                    </button>
                    <button
                      onClick={() => onRightPanelButtonLocationChange?.('right')}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        rightPanelButtonLocation === 'right'
                          ? 'bg-blue-600/40 text-white border border-blue-500'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                      }`}
                    >
                      Right
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Game Tile Padding - for Logo views only (Grid now has its own section) */}
      {viewMode === 'logo' && onGameTilePaddingChange && (
        <div className="px-4 py-2">
          <label className="block text-xs text-gray-400 mb-1 font-semibold">Game Tile Padding</label>
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

      {/* Background Blur Amount - for non-carousel and non-grid views */}
      {(viewMode !== 'carousel' && viewMode !== 'grid') && onBackgroundBlurChange && (
        <div className="px-4 py-2">
          <label className="block text-xs text-gray-400 mb-1 font-semibold">Background Blur Amount</label>
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
    </div>
  );
};
