import React, { useEffect, useRef, useState } from 'react';

interface ListViewOptions {
  showDescription: boolean;
  showCategories: boolean;
  showPlaytime: boolean;
  showReleaseDate: boolean;
  showGenres: boolean;
  showPlatform: boolean;
}

interface LibraryContextMenuProps {
  x?: number;
  y?: number;
  onClose: () => void;
  positionOverRightPanel?: boolean;
  rightPanelWidth?: number;
  viewMode: 'grid' | 'list' | 'logo';
  onViewModeChange: (mode: 'grid' | 'list' | 'logo') => void;
  backgroundBlur: number;
  onBackgroundBlurChange: (blur: number) => void;
  gameTilePadding: number;
  onGameTilePaddingChange: (padding: number) => void;
  hideGameTitles: boolean;
  onHideGameTitlesChange: (hide: boolean) => void;
  showLogoOverBoxart?: boolean;
  onShowLogoOverBoxartChange?: (show: boolean) => void;
  logoPosition?: 'top' | 'middle' | 'bottom' | 'underneath';
  onLogoPositionChange?: (position: 'top' | 'middle' | 'bottom' | 'underneath') => void;
  backgroundMode: 'image' | 'color';
  onBackgroundModeChange: (mode: 'image' | 'color') => void;
  backgroundColor: string;
  onBackgroundColorChange: (color: string) => void;
  listViewOptions: ListViewOptions;
  onListViewOptionsChange: (options: ListViewOptions) => void;
  listViewSize: number;
  onListViewSizeChange: (size: number) => void;
  autoSizeToFit?: boolean;
  onAutoSizeToFit?: () => void;
  gridSize?: number;
  onGridSizeChange?: (size: number) => void;
}

export const LibraryContextMenu: React.FC<LibraryContextMenuProps> = ({
  x = 0,
  y = 0,
  onClose,
  positionOverRightPanel = false,
  rightPanelWidth = 800,
  viewMode,
  onViewModeChange,
  backgroundBlur,
  onBackgroundBlurChange,
  gameTilePadding,
  onGameTilePaddingChange,
  hideGameTitles,
  onHideGameTitlesChange,
  showLogoOverBoxart = true,
  onShowLogoOverBoxartChange,
  logoPosition = 'middle',
  onLogoPositionChange,
  backgroundMode,
  onBackgroundModeChange,
  backgroundColor,
  onBackgroundColorChange,
  listViewOptions,
  onListViewOptionsChange,
  listViewSize,
  onListViewSizeChange,
  autoSizeToFit = false,
  onAutoSizeToFit,
  gridSize = 120,
  onGridSizeChange,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'grid' | 'list' | 'logo'>(viewMode);

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

  // Adjust position if menu would go off screen or position over right panel
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (positionOverRightPanel) {
        // Position over the right panel (centered vertically, aligned to right)
        const menuX = viewportWidth - rightPanelWidth - rect.width - 20;
        const menuY = Math.max(20, (viewportHeight - rect.height) / 2);
        menuRef.current.style.left = `${menuX}px`;
        menuRef.current.style.top = `${menuY}px`;
      } else {
        // Original positioning logic
        if (x + rect.width > viewportWidth) {
          menuRef.current.style.left = `${viewportWidth - rect.width - 10}px`;
        } else {
          menuRef.current.style.left = `${x}px`;
        }
        if (y + rect.height > viewportHeight) {
          menuRef.current.style.top = `${viewportHeight - rect.height - 10}px`;
        } else {
          menuRef.current.style.top = `${y}px`;
        }
      }
    }
  }, [x, y, positionOverRightPanel, rightPanelWidth]);

  // Update active tab when view mode changes externally
  useEffect(() => {
    setActiveTab(viewMode);
  }, [viewMode]);

  const handleTabChange = (tab: 'grid' | 'list' | 'logo') => {
    setActiveTab(tab);
    onViewModeChange(tab);
  };

  const handleBlurChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBackgroundBlurChange(Number(e.target.value));
  };

  const handlePaddingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onGameTilePaddingChange(Number(e.target.value));
  };

  const handleHideTitlesToggle = () => {
    onHideGameTitlesChange(!hideGameTitles);
  };

  const handleShowLogoToggle = () => {
    onShowLogoOverBoxartChange?.(!showLogoOverBoxart);
  };

  const handleLogoPositionChange = (position: 'top' | 'middle' | 'bottom' | 'underneath') => {
    onLogoPositionChange?.(position);
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBackgroundColorChange(e.target.value);
  };

  const handleListViewOptionToggle = (key: keyof ListViewOptions) => {
    onListViewOptionsChange({
      ...listViewOptions,
      [key]: !listViewOptions[key],
    });
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 min-w-[400px] max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col"
      style={{ left: positionOverRightPanel ? undefined : `${x}px`, top: positionOverRightPanel ? undefined : `${y}px` }}
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-700">
        <button
          onClick={() => handleTabChange('grid')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'grid'
              ? 'bg-gray-700 text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Grid View
        </button>
        <button
          onClick={() => handleTabChange('logo')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'logo'
              ? 'bg-gray-700 text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Logo View
        </button>
        <button
          onClick={() => handleTabChange('list')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'list'
              ? 'bg-gray-700 text-white border-b-2 border-blue-500'
              : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          List View
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto py-3">

        {/* Grid View Tab Content */}
        {activeTab === 'grid' && (
          <>
            {/* Auto Size to Fit */}
            {onAutoSizeToFit && (
              <div className="px-5 py-2">
                <button
                  onClick={onAutoSizeToFit}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    Auto Size to Fit
                  </span>
                  {autoSizeToFit && (
                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            )}

            {onAutoSizeToFit && <div className="border-t border-gray-700 my-2" />}

            {/* Game Tile Padding */}
            <div className="px-5 py-2">
              <label className="block text-xs text-gray-400 mb-2 px-3">Game Tile Padding</label>
              <div className="px-3">
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={gameTilePadding}
                  onChange={handlePaddingChange}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0px</span>
                  <span className="font-medium text-gray-300">{gameTilePadding}px</span>
                  <span>32px</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 my-2" />

            {/* Hide Game Titles */}
            <div className="px-5 py-2">
              <button
                onClick={handleHideTitlesToggle}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                  Hide Game Titles
                </span>
                {hideGameTitles && (
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>

            <div className="border-t border-gray-700 my-2" />

            {/* Show Logo Over Boxart */}
            {onShowLogoOverBoxartChange && (
              <div className="px-5 py-2">
                <button
                  onClick={handleShowLogoToggle}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Show Logo Over Boxart
                  </span>
                  {showLogoOverBoxart && (
                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            )}

            {/* Logo Position */}
            {showLogoOverBoxart && onLogoPositionChange && (
              <>
                <div className="border-t border-gray-700 my-2" />
                <div className="px-5 py-2">
                  <label className="block text-xs text-gray-400 mb-2 px-3">Logo Position</label>
                  <div className="px-3 space-y-2">
                    {(['top', 'middle', 'bottom', 'underneath'] as const).map((position) => (
                      <button
                        key={position}
                        onClick={() => handleLogoPositionChange(position)}
                        className={`w-full text-left px-3 py-2 text-sm rounded transition-colors flex items-center justify-between ${
                          logoPosition === position
                            ? 'bg-blue-600/20 text-blue-400 border border-blue-500/50'
                            : 'text-gray-300 hover:bg-gray-700'
                        }`}
                      >
                        <span className="capitalize">{position}</span>
                        {logoPosition === position && (
                          <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Logo View Tab Content */}
        {activeTab === 'logo' && (
          <>
            {/* Grid Size Resizer */}
            {onGridSizeChange && (
              <>
                <div className="px-5 py-2">
                  <label className="block text-xs text-gray-400 mb-2 px-3">Logo Size</label>
                  <div className="px-3">
                    <input
                      type="range"
                      min="80"
                      max="500"
                      step="1"
                      value={gridSize}
                      onChange={(e) => onGridSizeChange(Number(e.target.value))}
                      className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>80px</span>
                      <span className="font-medium text-gray-300">{gridSize}px</span>
                      <span>500px</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-gray-700 my-2" />
              </>
            )}

            {/* Auto Size to Fit */}
            {onAutoSizeToFit && (
              <div className="px-5 py-2">
                <button
                  onClick={onAutoSizeToFit}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
                >
                  <span className="flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    Auto Size to Fit
                  </span>
                  {autoSizeToFit && (
                    <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </button>
              </div>
            )}

            {onAutoSizeToFit && <div className="border-t border-gray-700 my-2" />}

            {/* Game Tile Padding */}
            <div className="px-5 py-2">
              <label className="block text-xs text-gray-400 mb-2 px-3">Game Tile Padding</label>
              <div className="px-3">
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={gameTilePadding}
                  onChange={handlePaddingChange}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0px</span>
                  <span className="font-medium text-gray-300">{gameTilePadding}px</span>
                  <span>32px</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 my-2" />

            {/* Hide Game Titles */}
            <div className="px-5 py-2">
              <button
                onClick={handleHideTitlesToggle}
                className="w-full text-left px-3 py-2.5 text-sm text-gray-300 hover:bg-gray-700 rounded transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                  Hide Game Titles
                </span>
                {hideGameTitles && (
                  <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </>
        )}

        {/* List View Tab Content */}
        {activeTab === 'list' && (
          <>
            {/* List View Size */}
            <div className="px-5 py-2">
              <label className="block text-xs text-gray-400 mb-2 px-3">List View Size</label>
              <div className="px-3">
                <input
                  type="range"
                  min="80"
                  max="200"
                  value={listViewSize}
                  onChange={(e) => onListViewSizeChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>80px</span>
                  <span className="font-medium text-gray-300">{listViewSize}px</span>
                  <span>200px</span>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-700 my-2" />

            {/* List View Options */}
            <div className="px-5 py-2">
              <div className="text-xs text-gray-400 mb-3 px-3 font-semibold uppercase tracking-wide">List View Options</div>
              <div className="grid grid-cols-3 gap-2 px-3">
                <button
                  onClick={() => handleListViewOptionToggle('showDescription')}
                  className={`px-3 py-2.5 text-sm rounded transition-colors flex flex-col items-center gap-1.5 ${
                    listViewOptions.showDescription
                      ? 'bg-blue-600/30 text-white border border-blue-500/50'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
                  }`}
                  title="Show Description"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  <span className="text-xs">Description</span>
                </button>
                <button
                  onClick={() => handleListViewOptionToggle('showCategories')}
                  className={`px-3 py-2.5 text-sm rounded transition-colors flex flex-col items-center gap-1.5 ${
                    listViewOptions.showCategories
                      ? 'bg-blue-600/30 text-white border border-blue-500/50'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
                  }`}
                  title="Show Categories"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-xs">Categories</span>
                </button>
                <button
                  onClick={() => handleListViewOptionToggle('showPlaytime')}
                  className={`px-3 py-2.5 text-sm rounded transition-colors flex flex-col items-center gap-1.5 ${
                    listViewOptions.showPlaytime
                      ? 'bg-blue-600/30 text-white border border-blue-500/50'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
                  }`}
                  title="Show Playtime"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-xs">Playtime</span>
                </button>
                <button
                  onClick={() => handleListViewOptionToggle('showReleaseDate')}
                  className={`px-3 py-2.5 text-sm rounded transition-colors flex flex-col items-center gap-1.5 ${
                    listViewOptions.showReleaseDate
                      ? 'bg-blue-600/30 text-white border border-blue-500/50'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
                  }`}
                  title="Show Release Date"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs">Release Date</span>
                </button>
                <button
                  onClick={() => handleListViewOptionToggle('showGenres')}
                  className={`px-3 py-2.5 text-sm rounded transition-colors flex flex-col items-center gap-1.5 ${
                    listViewOptions.showGenres
                      ? 'bg-blue-600/30 text-white border border-blue-500/50'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
                  }`}
                  title="Show Genres"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  <span className="text-xs">Genres</span>
                </button>
                <button
                  onClick={() => handleListViewOptionToggle('showPlatform')}
                  className={`px-3 py-2.5 text-sm rounded transition-colors flex flex-col items-center gap-1.5 ${
                    listViewOptions.showPlatform
                      ? 'bg-blue-600/30 text-white border border-blue-500/50'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-transparent'
                  }`}
                  title="Show Platform"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs">Platform</span>
                </button>
              </div>
            </div>
          </>
        )}

        {/* Background Section - Shown in both tabs */}
        <div className="border-t border-gray-700 my-2" />

        {/* Background Mode - Two Separate Buttons */}
        <div className="px-5 py-2">
          <div className="text-xs text-gray-400 mb-2 px-3 font-semibold uppercase tracking-wide">Background</div>
          <div className="space-y-1">
            <button
              onClick={() => onBackgroundModeChange('image')}
              className={`w-full text-left px-3 py-2.5 text-sm rounded transition-colors flex items-center justify-between ${
                backgroundMode === 'image'
                  ? 'bg-blue-600/30 text-white border border-blue-500/50'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Game Banner
              </span>
              {backgroundMode === 'image' && (
                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <button
              onClick={() => onBackgroundModeChange('color')}
              className={`w-full text-left px-3 py-2.5 text-sm rounded transition-colors flex items-center justify-between ${
                backgroundMode === 'color'
                  ? 'bg-blue-600/30 text-white border border-blue-500/50'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                Colour
              </span>
              {backgroundMode === 'color' && (
                <svg className="w-4 h-4 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Background Color Picker - Only show when color mode is active */}
        {backgroundMode === 'color' && (
          <>
            <div className="border-t border-gray-700 my-2" />
            <div className="px-5 py-2">
              <label className="block text-xs text-gray-400 mb-2 px-3">Background Color</label>
              <div className="px-3 flex items-center gap-3">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={handleColorChange}
                  className="w-12 h-12 rounded cursor-pointer border border-gray-600"
                />
                <input
                  type="text"
                  value={backgroundColor}
                  onChange={handleColorChange}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-300 text-sm"
                  placeholder="#000000"
                />
              </div>
            </div>
          </>
        )}

        {/* Background image blur amount - Only show when image mode is active */}
        {backgroundMode === 'image' && (
          <>
            <div className="border-t border-gray-700 my-2" />
            <div className="px-5 py-2">
              <label className="block text-xs text-gray-400 mb-2 px-3">Background Image Blur Amount</label>
              <div className="px-3">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={backgroundBlur}
                  onChange={handleBlurChange}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0px</span>
                  <span className="font-medium text-gray-300">{backgroundBlur}px</span>
                  <span>100px</span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
