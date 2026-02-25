import React from 'react';
import { RightClickMenuProps } from './types';
import { MenuSliderRow } from '../MenuSliderRow';
import { ButtonColorEditor } from './ButtonColorEditor';
import { sliderDefaults, defaultButtonColors } from './constants';

interface StandardSettingsProps extends RightClickMenuProps {
  localLogoSizes: {
    grid: number;
    list: number;
    logo: number;
    carousel: number;
  };
  onPerGameLogoSizeChange: (viewModeType: 'grid' | 'list' | 'logo' | 'carousel', size: number) => void;
  onAlternativeBackgroundToggle: () => void;
}

export const StandardSettings: React.FC<StandardSettingsProps> = ({
  // Props from RightClickMenuProps
  viewMode,
  activeGame,
  gridSize = 120,
  onGridSizeChange,
  logoSize = 100,
  onLogoSizeChange,
  listSize = 120,
  onListSizeChange,
  gameTilePadding = 3,
  onGameTilePaddingChange,
  backgroundBlur = 40,
  onBackgroundBlurChange,
  backgroundBrightness = 0.3,
  onBackgroundBrightnessChange,
  listViewOptions,
  onListViewOptionsChange,
  showLogoOverBoxart = true,
  onShowLogoOverBoxartChange,
  logoPosition = 'middle',
  onLogoPositionChange,
  logoBackgroundOpacity = 100,
  onLogoBackgroundOpacityChange,
  rightPanelBoxartPosition = 'right',
  onRightPanelBoxartPositionChange,
  // rightPanelLogoSize and onRightPanelLogoSizeChange are not used in UI but kept in props if needed elsewhere, removed here to avoid warning
  rightPanelBoxartSize = 120,
  onRightPanelBoxartSizeChange,
  rightPanelTextSize = 14,
  onRightPanelTextSizeChange,
  rightPanelButtonSize = 14,
  onRightPanelButtonSizeChange,
  rightPanelButtonLocation = 'right',
  onRightPanelButtonLocationChange,
  detailsPanelOpacity = 80,
  onDetailsPanelOpacityChange,
  panelWidth = 800,
  onPanelWidthChange,
  fanartHeight = 320,
  onFanartHeightChange,
  descriptionWidth = 50,
  onDescriptionWidthChange,
  showCategoriesInGameList = false,
  onShowCategoriesInGameListChange,
  categoriesPosition = 'top',
  onCategoriesPositionChange,
  categoriesTopAlignment = 'left',
  onCategoriesTopAlignmentChange,
  categoriesTopSize = 12,
  onCategoriesTopSizeChange,
  rightPanelButtonColors,
  onRightPanelButtonColorsChange,
  gridButtonColors,
  onGridButtonColorsChange,
  listButtonColors,
  onListButtonColorsChange,
  logoButtonColors,
  onLogoButtonColorsChange,
  // New props
  localLogoSizes,
  onPerGameLogoSizeChange,
  onAlternativeBackgroundToggle,
}) => {

  const getSizeLabel = () => {
    if (viewMode === 'grid') return 'Boxart Size';
    if (viewMode === 'logo') return 'Logo Size';
    return 'Game Tile Size';
  };

  const getSizeRange = () => {
    if (viewMode === 'list') return { min: 10, max: 300 };
    return { min: 50, max: 600 };
  };

  const getPaddingRange = () => {
    if (viewMode === 'logo') return { min: 0, max: 32 };
    return { min: 0, max: 10 };
  };

  const getPaddingLabel = () => {
    if (viewMode === 'grid') return 'Boxart Padding';
    if (viewMode === 'logo') return 'Logo Padding';
    return 'Game Tile Padding';
  };

  const getSizeValue = () => {
    if (viewMode === 'grid') return gridSize;
    if (viewMode === 'logo') return logoSize;
    return listSize;
  };

  const handleSizeChange = (value: number) => {
    if (viewMode === 'grid' && onGridSizeChange) onGridSizeChange(value);
    if (viewMode === 'logo' && onLogoSizeChange) onLogoSizeChange(value);
    if (viewMode === 'list' && onListSizeChange) onListSizeChange(value);
  };

  const paddingLabel = getPaddingLabel();
  const sizeValue = getSizeValue();
  const sizeRange = getSizeRange();
  const paddingRange = getPaddingRange();

  return (
    <>
      {/* 3-column layout for all views (4-column for list) */}
      <div className={`grid text-xs text-gray-400 px-3 pb-1 font-semibold ${viewMode === 'list' ? 'grid-cols-4' : 'grid-cols-3'}`}>
        <span className={viewMode === 'list' ? 'col-span-2' : ''}>Games View</span>
        <span className="text-center">Dividers</span>
        <span className="text-right">Game Details</span>
      </div>
      <div className="px-2 py-2">
        <div className={`grid gap-3 ${viewMode === 'list' ? 'grid-cols-4' : 'grid-cols-3'}`}>
          {/* Left Column(s) - Split into 2 columns for list view */}
          <div className={viewMode === 'list' ? 'col-span-2 grid grid-cols-2 gap-2' : 'space-y-2'}>
            {/* Categories Section */}
            {(viewMode as string) !== 'carousel' && onShowCategoriesInGameListChange && (
              <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-medium">Show Categories</label>
                  <button
                    onClick={() => onShowCategoriesInGameListChange(!showCategoriesInGameList)}
                    className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-all ${showCategoriesInGameList ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-600'
                      }`}
                  >
                    <span
                      className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-all shadow-sm ${showCategoriesInGameList ? 'translate-x-[14px]' : 'translate-x-0.5'
                        }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-medium">Alternative Background</label>
                  <button
                    onClick={onAlternativeBackgroundToggle}
                    disabled={!activeGame}
                    className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-all ${activeGame?.useAlternativeBackground ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-600'} ${!activeGame ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span
                      className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-all shadow-sm ${activeGame?.useAlternativeBackground ? 'translate-x-[14px]' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>

                {showCategoriesInGameList && (
                  <div className="space-y-3 pt-3 border-t border-white/5 animate-in fade-in slide-in-from-top-1 duration-200">
                    {/* Position */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-2 font-semibold">Categories Position</label>
                      <div className="flex gap-1">
                        {(['top', 'bottom'] as const).map((pos) => (
                          <button
                            key={pos}
                            onClick={() => onCategoriesPositionChange?.(pos)}
                            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${categoriesPosition === pos
                              ? 'bg-blue-600/40 text-white border border-blue-500'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                              }`}
                          >
                            {pos.charAt(0).toUpperCase() + pos.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Alignment */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-2 font-semibold">Categories Alignment</label>
                      <div className="flex gap-1">
                        {(['left', 'center', 'right'] as const).map((alignment) => (
                          <button
                            key={alignment}
                            onClick={() => onCategoriesTopAlignmentChange?.(alignment)}
                            className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${categoriesTopAlignment === alignment
                              ? 'bg-blue-600/40 text-white border border-blue-500'
                              : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                              }`}
                          >
                            {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Text Size */}
                    <div>
                      <MenuSliderRow
                        label="Categories Size"
                        min={10}
                        max={24}
                        step={1}
                        value={categoriesTopSize}
                        defaultValue={sliderDefaults.categoriesTopSize}
                        onChange={(value) => onCategoriesTopSizeChange?.(value)}
                        onReset={() => onCategoriesTopSizeChange?.(sliderDefaults.categoriesTopSize)}
                        formatValue={(value) => `${value}px`}
                        minLabel="10px"
                        maxLabel="24px"
                        sliderClassName="h-1.5"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Size control per view */}
            {((viewMode === 'grid' && onGridSizeChange) || (viewMode === 'logo' && onLogoSizeChange)) && (
              <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                <MenuSliderRow
                  label={getSizeLabel()}
                  min={sizeRange.min}
                  max={sizeRange.max}
                  step={1}
                  value={sizeValue}
                  defaultValue={viewMode === 'grid' ? sliderDefaults.gridSize : sliderDefaults.logoSize}
                  onChange={handleSizeChange}
                  onReset={() => handleSizeChange(viewMode === 'grid' ? sliderDefaults.gridSize : sliderDefaults.logoSize)}
                  formatValue={(value) => `${value}px`}
                  minLabel={`${sizeRange.min}px`}
                  maxLabel={`${sizeRange.max}px`}
                  sliderClassName="h-2"
                />
              </div>
            )}

            {/* Show Logo Over Boxart Toggle (Grid only) */}
            {viewMode === 'grid' && (
              <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400 font-medium">Show Logo Over Boxart</label>
                  <button
                    onClick={() => onShowLogoOverBoxartChange?.(!showLogoOverBoxart)}
                    className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${showLogoOverBoxart ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                  >
                    <span
                      className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${showLogoOverBoxart ? 'translate-x-3' : 'translate-x-0.5'
                        }`}
                    />
                  </button>
                </div>

                {showLogoOverBoxart && (
                  <>
                    <label className="block text-xs text-gray-400 mb-2 font-semibold">Logo Position</label>
                    <div className="grid grid-cols-3 gap-1 mb-2">
                      <button
                        onClick={() => onLogoPositionChange?.('top')}
                        className={`px-2 py-1 text-xs rounded transition-colors ${logoPosition === 'top'
                          ? 'bg-blue-600/40 text-white border border-blue-500'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                          }`}
                      >
                        Top
                      </button>
                      <button
                        onClick={() => onLogoPositionChange?.('middle')}
                        className={`px-2 py-1 text-xs rounded transition-colors ${logoPosition === 'middle'
                          ? 'bg-blue-600/40 text-white border border-blue-500'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                          }`}
                      >
                        Middle
                      </button>
                      <button
                        onClick={() => onLogoPositionChange?.('bottom')}
                        className={`px-2 py-1 text-xs rounded transition-colors ${logoPosition === 'bottom'
                          ? 'bg-blue-600/40 text-white border border-blue-500'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                          }`}
                      >
                        Bottom
                      </button>
                    </div>
                    <button
                      onClick={() => onLogoPositionChange?.('underneath')}
                      className={`w-full px-2 py-1 text-xs rounded transition-colors ${logoPosition === 'underneath'
                        ? 'bg-blue-600/40 text-white border border-blue-500'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                        }`}
                    >
                      Below
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Game Tile Padding - only for grid and logo views */}
            {viewMode !== 'list' && (
              <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                <MenuSliderRow
                  label={paddingLabel}
                  min={paddingRange.min}
                  max={paddingRange.max}
                  step={1}
                  value={gameTilePadding}
                  defaultValue={sliderDefaults.gameTilePadding}
                  onChange={(value) => onGameTilePaddingChange?.(value)}
                  onReset={() => onGameTilePaddingChange?.(sliderDefaults.gameTilePadding)}
                  formatValue={(value) => `${value}px`}
                  minLabel={`${paddingRange.min}px`}
                  maxLabel={`${paddingRange.max}px`}
                />
              </div>
            )}

            {/* Logo tile background transparency (Logo view) */}
            {viewMode === 'logo' && (
              <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                <MenuSliderRow
                  label="Logo Tile Background Transparency"
                  min={0}
                  max={100}
                  step={1}
                  value={logoBackgroundOpacity}
                  defaultValue={sliderDefaults.logoBackgroundOpacity}
                  onChange={(value) => onLogoBackgroundOpacityChange?.(value)}
                  onReset={() => onLogoBackgroundOpacityChange?.(sliderDefaults.logoBackgroundOpacity)}
                  formatValue={(value) => `${value}%`}
                  minLabel="0%"
                  maxLabel="100%"
                />
              </div>
            )}

            {/* List view specific controls */}
            {viewMode === 'list' && listViewOptions && (
              <>
                {/* Tile Height control - always visible */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                  <MenuSliderRow
                    label="Tile Height"
                    min={10}
                    max={300}
                    step={1}
                    value={listViewOptions.tileHeight ?? 128}
                    defaultValue={sliderDefaults.listTileHeight}
                    onChange={(value) => onListViewOptionsChange?.({
                      ...listViewOptions,
                      tileHeight: value,
                    })}
                    onReset={() => onListViewOptionsChange?.({
                      ...listViewOptions,
                      tileHeight: sliderDefaults.listTileHeight,
                    })}
                    formatValue={(value) => `${value}px`}
                    minLabel="10px"
                    maxLabel="300px"
                  />
                </div>

                {/* Display Mode controls */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-2">
                  <label className="block text-xs text-gray-400 mb-2 font-semibold">Display</label>
                  <div className="grid grid-cols-2 gap-1">
                    <button
                      onClick={() => onListViewOptionsChange?.({
                        ...listViewOptions,
                        displayMode: 'boxart-title',
                      })}
                      className={`px-2 py-1 text-xs rounded transition-colors ${(listViewOptions.displayMode === 'boxart-title' || !listViewOptions.displayMode)
                        ? 'bg-blue-600/40 text-white border border-blue-500'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                        }`}
                    >
                      Boxart + Title
                    </button>
                    <button
                      onClick={() => onListViewOptionsChange?.({
                        ...listViewOptions,
                        displayMode: 'logo-title',
                      })}
                      className={`px-2 py-1 text-xs rounded transition-colors ${listViewOptions.displayMode === 'logo-title'
                        ? 'bg-blue-600/40 text-white border border-blue-500'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                        }`}
                    >
                      Logo + Title
                    </button>
                    <button
                      onClick={() => onListViewOptionsChange?.({
                        ...listViewOptions,
                        displayMode: 'logo-only',
                      })}
                      className={`px-2 py-1 text-xs rounded transition-colors ${listViewOptions.displayMode === 'logo-only'
                        ? 'bg-blue-600/40 text-white border border-blue-500'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                        }`}
                    >
                      Logo Only
                    </button>
                    <button
                      onClick={() => onListViewOptionsChange?.({
                        ...listViewOptions,
                        displayMode: 'title-only',
                      })}
                      className={`px-2 py-1 text-xs rounded transition-colors ${listViewOptions.displayMode === 'title-only'
                        ? 'bg-blue-600/40 text-white border border-blue-500'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                        }`}
                    >
                      Title Only
                    </button>
                    <button
                      onClick={() => onListViewOptionsChange?.({
                        ...listViewOptions,
                        displayMode: 'icon-title',
                      })}
                      className={`px-2 py-1 text-xs rounded transition-colors ${listViewOptions.displayMode === 'icon-title'
                        ? 'bg-blue-600/40 text-white border border-blue-500'
                        : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                        }`}
                    >
                      Icon + Title
                    </button>
                  </div>

                  {/* Boxart Size - only for Boxart + Title mode */}
                  {(listViewOptions.displayMode === 'boxart-title' || !listViewOptions.displayMode) && (
                    <div className="pt-2">
                      <MenuSliderRow
                        label="Boxart Size"
                        min={30}
                        max={200}
                        step={1}
                        value={listViewOptions.boxartSize ?? sliderDefaults.listBoxartSize}
                        defaultValue={sliderDefaults.listBoxartSize}
                        onChange={(value) => onListViewOptionsChange?.({
                          ...listViewOptions,
                          boxartSize: value,
                        })}
                        onReset={() => onListViewOptionsChange?.({
                          ...listViewOptions,
                          boxartSize: sliderDefaults.listBoxartSize,
                        })}
                        formatValue={(value) => `${value}px`}
                        minLabel="30px"
                        maxLabel="200px"
                      />
                    </div>
                  )}

                  {/* Logo Size - only for Logo + Title mode */}
                  {listViewOptions.displayMode === 'logo-title' && (
                    <div className="pt-2">
                      <MenuSliderRow
                        label="Logo Size"
                        min={30}
                        max={200}
                        step={1}
                        value={listViewOptions.logoSize ?? sliderDefaults.listLogoSize}
                        defaultValue={sliderDefaults.listLogoSize}
                        onChange={(value) => onListViewOptionsChange?.({
                          ...listViewOptions,
                          logoSize: value,
                        })}
                        onReset={() => onListViewOptionsChange?.({
                          ...listViewOptions,
                          logoSize: sliderDefaults.listLogoSize,
                        })}
                        formatValue={(value) => `${value}px`}
                        minLabel="30px"
                        maxLabel="200px"
                      />
                    </div>
                  )}

                  {/* Title Text Size - for all modes except Logo Only */}
                  {listViewOptions.displayMode !== 'logo-only' && (
                    <div>
                      <MenuSliderRow
                        label="Title Text Size"
                        min={12}
                        max={32}
                        step={1}
                        value={listViewOptions.titleTextSize ?? sliderDefaults.listTitleTextSize}
                        defaultValue={sliderDefaults.listTitleTextSize}
                        onChange={(value) => onListViewOptionsChange?.({
                          ...listViewOptions,
                          titleTextSize: value,
                        })}
                        onReset={() => onListViewOptionsChange?.({
                          ...listViewOptions,
                          titleTextSize: sliderDefaults.listTitleTextSize,
                        })}
                        formatValue={(value) => `${value}px`}
                        minLabel="12px"
                        maxLabel="32px"
                      />
                    </div>
                  )}
                </div>

                {/* Game Tile Sections */}
                <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-2">
                  <label className="block text-xs text-gray-400 font-semibold">Game Tile Sections</label>
                  {(
                    [
                      { key: 'showDescription', label: 'Description' },
                      { key: 'showReleaseDate', label: 'Release Date' },
                      { key: 'showGenres', label: 'Genres' },
                      { key: 'showCategories', label: 'Categories' },
                      { key: 'showPlatform', label: 'Platform' },
                      { key: 'showLauncher', label: 'Launcher' },
                    ] as const
                  ).map(({ key, label }) => {
                    const currentValue = !!listViewOptions[key as keyof typeof listViewOptions];
                    return (
                      <div key={key} className="flex items-center justify-between text-xs">
                        <span className="text-gray-300">{label}</span>
                        <button
                          onClick={() => onListViewOptionsChange?.({
                            ...listViewOptions,
                            [key]: !currentValue,
                          })}
                          className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${currentValue ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                        >
                          <span
                            className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${currentValue ? 'translate-x-3' : 'translate-x-0.5'
                              }`}
                          />
                        </button>
                      </div>
                    );
                  })}

                  <div className="pt-2">
                    <MenuSliderRow
                      label="Section Text Size"
                      min={10}
                      max={18}
                      step={1}
                      value={listViewOptions.sectionTextSize ?? sliderDefaults.listSectionTextSize}
                      defaultValue={sliderDefaults.listSectionTextSize}
                      onChange={(value) => onListViewOptionsChange?.({
                        ...listViewOptions,
                        sectionTextSize: value,
                      })}
                      onReset={() => onListViewOptionsChange?.({
                        ...listViewOptions,
                        sectionTextSize: sliderDefaults.listSectionTextSize,
                      })}
                      formatValue={(value) => `${value}px`}
                      minLabel="10px"
                      maxLabel="18px"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Background Blur Amount */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Background Blur Amount"
                min={0}
                max={100}
                step={1}
                value={backgroundBlur}
                defaultValue={sliderDefaults.backgroundBlur}
                onChange={(value) => onBackgroundBlurChange?.(value)}
                onReset={() => onBackgroundBlurChange?.(sliderDefaults.backgroundBlur)}
                formatValue={(value) => `${value}px`}
                minLabel="0px"
                maxLabel="100px"
              />
            </div>

            {/* Background Brightness */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Background Brightness"
                min={0}
                max={100}
                step={1}
                value={Math.round(backgroundBrightness * 100)}
                defaultValue={sliderDefaults.backgroundBrightnessPercent}
                onChange={(value) => onBackgroundBrightnessChange?.(value / 100)}
                onReset={() => onBackgroundBrightnessChange?.(sliderDefaults.backgroundBrightnessPercent / 100)}
                formatValue={(value) => `${value}%`}
                minLabel="0%"
                maxLabel="100%"
              />
            </div>
          </div>

          {/* Middle Column - Dividers (All non-carousel views) */}
          <div className="space-y-2">
            {/* Right Panel Width Control */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Right Panel Width"
                min={400}
                max={Math.floor(window.innerWidth * 0.75)}
                step={10}
                value={panelWidth}
                defaultValue={sliderDefaults.panelWidth}
                onChange={(value) => onPanelWidthChange?.(value)}
                onReset={() => onPanelWidthChange?.(sliderDefaults.panelWidth)}
                formatValue={(value) => `${value}px`}
                minLabel="400px"
                maxLabel={`${Math.floor(window.innerWidth * 0.75)}px`}
              />
            </div>

            {/* Banner Height Control */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Banner Height"
                min={150}
                max={500}
                step={10}
                value={fanartHeight}
                defaultValue={sliderDefaults.fanartHeight}
                onChange={(value) => onFanartHeightChange?.(value)}
                onReset={() => onFanartHeightChange?.(sliderDefaults.fanartHeight)}
                formatValue={(value) => `${value}px`}
                minLabel="150px"
                maxLabel="500px"
              />
            </div>

            {/* Description Width Control */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Description Width"
                min={20}
                max={80}
                step={1}
                value={descriptionWidth}
                defaultValue={sliderDefaults.descriptionWidth}
                onChange={(value) => onDescriptionWidthChange?.(value)}
                onReset={() => onDescriptionWidthChange?.(sliderDefaults.descriptionWidth)}
                formatValue={(value) => `${value}%`}
                minLabel="20%"
                maxLabel="80%"
              />
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-2">
            {/* Per-Game Logo Size Control - Top of Game Details, only for current view */}
            {activeGame && (
              <div className="px-3 py-2 bg-gray-700/30 rounded-md">
                {/* Grid View */}
                {viewMode === 'grid' && (
                  <MenuSliderRow
                    label={activeGame.logoUrl ? 'Game Logo Size' : 'Title Size'}
                    min={50}
                    max={600}
                    step={5}
                    value={localLogoSizes.grid}
                    defaultValue={sliderDefaults.perGameLogoSize}
                    onChange={(value) => onPerGameLogoSizeChange('grid', value)}
                    onReset={() => onPerGameLogoSizeChange('grid', sliderDefaults.perGameLogoSize)}
                    formatValue={(value) => `${value}px`}
                    minLabel="50px"
                    maxLabel="600px"
                    sliderClassName="h-2"
                  />
                )}

                {/* List View */}
                {viewMode === 'list' && (
                  <MenuSliderRow
                    label={activeGame.logoUrl ? 'Game Logo Size' : 'Title Size'}
                    min={50}
                    max={600}
                    step={5}
                    value={localLogoSizes.list}
                    defaultValue={sliderDefaults.perGameLogoSize}
                    onChange={(value) => onPerGameLogoSizeChange('list', value)}
                    onReset={() => onPerGameLogoSizeChange('list', sliderDefaults.perGameLogoSize)}
                    formatValue={(value) => `${value}px`}
                    minLabel="50px"
                    maxLabel="600px"
                    sliderClassName="h-2"
                  />
                )}

                {/* Logo View */}
                {viewMode === 'logo' && (
                  <MenuSliderRow
                    label={activeGame.logoUrl ? 'Game Logo Size' : 'Title Size'}
                    min={50}
                    max={600}
                    step={5}
                    value={localLogoSizes.logo}
                    defaultValue={sliderDefaults.perGameLogoSize}
                    onChange={(value) => onPerGameLogoSizeChange('logo', value)}
                    onReset={() => onPerGameLogoSizeChange('logo', sliderDefaults.perGameLogoSize)}
                    formatValue={(value) => `${value}px`}
                    minLabel="50px"
                    maxLabel="600px"
                    sliderClassName="h-2"
                  />
                )}
              </div>
            )}

            {/* Boxart Position and Size - Grouped together */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <label className="block text-xs text-gray-400 mb-2 font-semibold">Boxart Position</label>
              <div className="grid grid-cols-3 gap-1 mb-3">
                <button
                  onClick={() => onRightPanelBoxartPositionChange?.('left')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${rightPanelBoxartPosition === 'left'
                    ? 'bg-blue-600/40 text-white border border-blue-500'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                    }`}
                >
                  Left
                </button>
                <button
                  onClick={() => onRightPanelBoxartPositionChange?.('right')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${rightPanelBoxartPosition === 'right'
                    ? 'bg-blue-600/40 text-white border border-blue-500'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                    }`}
                >
                  Right
                </button>
                <button
                  onClick={() => onRightPanelBoxartPositionChange?.('none')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${rightPanelBoxartPosition === 'none'
                    ? 'bg-blue-600/40 text-white border border-blue-500'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                    }`}
                >
                  None
                </button>
              </div>

              {(rightPanelBoxartPosition === 'left' || rightPanelBoxartPosition === 'right') && (
                <>
                  <MenuSliderRow
                    label="Resize Boxart"
                    min={80}
                    max={200}
                    step={5}
                    value={rightPanelBoxartSize}
                    defaultValue={sliderDefaults.rightPanelBoxartSize}
                    onChange={(value) => onRightPanelBoxartSizeChange?.(value)}
                    onReset={() => onRightPanelBoxartSizeChange?.(sliderDefaults.rightPanelBoxartSize)}
                    formatValue={(value) => `${value}px`}
                    minLabel="80px"
                    maxLabel="200px"
                  />
                </>
              )}
            </div>

            {/* Text Size */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Text Size"
                min={10}
                max={24}
                step={1}
                value={rightPanelTextSize}
                defaultValue={sliderDefaults.rightPanelTextSize}
                onChange={(value) => onRightPanelTextSizeChange?.(value)}
                onReset={() => onRightPanelTextSizeChange?.(sliderDefaults.rightPanelTextSize)}
                formatValue={(value) => `${value}px`}
                minLabel="10px"
                maxLabel="24px"
              />
            </div>

            {/* Button Size */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Button Size"
                min={10}
                max={24}
                step={1}
                value={rightPanelButtonSize}
                defaultValue={sliderDefaults.rightPanelButtonSize}
                onChange={(value) => onRightPanelButtonSizeChange?.(value)}
                onReset={() => onRightPanelButtonSizeChange?.(sliderDefaults.rightPanelButtonSize)}
                formatValue={(value) => `${value}px`}
                minLabel="10px"
                maxLabel="24px"
              />
            </div>

            {/* Button Location */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <label className="block text-xs text-gray-400 mb-2 font-semibold">Button Location</label>
              <div className="grid grid-cols-3 gap-1">
                <button
                  onClick={() => onRightPanelButtonLocationChange?.('left')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${rightPanelButtonLocation === 'left'
                    ? 'bg-blue-600/40 text-white border border-blue-500'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                    }`}
                >
                  Left
                </button>
                <button
                  onClick={() => onRightPanelButtonLocationChange?.('middle')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${rightPanelButtonLocation === 'middle'
                    ? 'bg-blue-600/40 text-white border border-blue-500'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                    }`}
                >
                  Middle
                </button>
                <button
                  onClick={() => onRightPanelButtonLocationChange?.('right')}
                  className={`px-2 py-1 text-xs rounded transition-colors ${rightPanelButtonLocation === 'right'
                    ? 'bg-blue-600/40 text-white border border-blue-500'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                    }`}
                >
                  Right
                </button>
              </div>
            </div>

            {/* Button Colors - View Specific */}
            {(() => {
              const getColors = () => {
                if (viewMode === 'grid') return { colors: gridButtonColors, handler: onGridButtonColorsChange, preferenceKey: 'gridButtonColors' };
                if (viewMode === 'list') return { colors: listButtonColors, handler: onListButtonColorsChange, preferenceKey: 'listButtonColors' };
                if (viewMode === 'logo') return { colors: logoButtonColors, handler: onLogoButtonColorsChange, preferenceKey: 'logoButtonColors' };
                return { colors: rightPanelButtonColors, handler: onRightPanelButtonColorsChange, preferenceKey: 'rightPanelButtonColors' };
              };
              const { colors, handler, preferenceKey } = getColors();
              return (
                <ButtonColorEditor
                  title="Button Colors"
                  colors={colors}
                  onChange={handler}
                  onReset={() => {
                    handler?.(defaultButtonColors);
                    window.electronAPI.savePreferences({ [preferenceKey]: defaultButtonColors });
                  }}
                />
              );
            })()}

            {/* Details View Transparency */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Details View Transparency"
                min={0}
                max={100}
                step={1}
                value={detailsPanelOpacity}
                defaultValue={sliderDefaults.detailsPanelOpacity}
                onChange={(value) => onDetailsPanelOpacityChange?.(value)}
                onReset={() => onDetailsPanelOpacityChange?.(sliderDefaults.detailsPanelOpacity)}
                formatValue={(value) => `${value}%`}
                minLabel="0%"
                maxLabel="100%"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
