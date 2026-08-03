import type { ReactNode } from 'react';
import type { Game } from '../../types/game';
import { MenuSliderRow } from '../MenuSliderRow';
import type { RightClickMenuEditorSection } from './RightClickMenuHeader';

export interface GamesViewSliderDefaults {
  categoriesTopSize: number;
  gameTilePadding: number;
  gridSize: number;
  cardColumns: number;
  logoSize: number;
  logoBackgroundOpacity: number;
  backgroundBlur: number;
  backgroundBrightnessPercent: number;
  listTileHeight: number;
  listBoxartSize: number;
  listLogoSize: number;
  listTitleTextSize: number;
  listSectionTextSize: number;
}

export type ListViewOptions = {
  showDescription: boolean;
  showCategories: boolean;
  showPlaytime: boolean;
  showReleaseDate: boolean;
  showGenres: boolean;
  showPlatform: boolean;
  showLauncher?: boolean;
  showLogos?: boolean;
  titleTextSize?: number;
  displayMode?: 'boxart-title' | 'logo-title' | 'logo-only' | 'title-only' | 'icon-title';
  sectionTextSize?: number;
  tileHeight?: number;
  boxartSize?: number;
  logoSize?: number;
};

export interface RightClickMenuGamesViewSectionProps {
  activeEditorSection: RightClickMenuEditorSection | null;
  activeGame?: Game;
  backgroundBlur: number;
  backgroundBrightness: number;
  gridSmartFill: boolean;
  gridMaximizeSpace: boolean;
  categoriesPosition: 'top' | 'bottom';
  categoriesTopAlignment: 'left' | 'center' | 'right';
  categoriesTopSize: number;
  cardColumns: number;
  cardPostersOnly: boolean;
  cardSmartFill: boolean;
  focusedGamesViewLayoutClass: string;
  gameTilePadding: number;
  gridSize: number;
  isFocusedEditorSection: boolean;
  listSize: number;
  listViewOptions?: ListViewOptions;
  logoBackgroundOpacity: number;
  logoPosition: 'top' | 'middle' | 'bottom' | 'underneath';
  logoSize: number;
  settingDescriptionDisplay: 'icon' | 'inline';
  showCategoriesInGameList: boolean;
  showLogoOverBoxart: boolean;
  sliderDefaults: GamesViewSliderDefaults;
  viewMode: 'grid' | 'list' | 'logo' | 'card';
  onGridSmartFillChange?: (enabled: boolean) => void;
  onGridMaximizeSpaceChange?: (enabled: boolean) => void;
  onBackgroundBlurChange?: (blur: number) => void;
  onBackgroundBrightnessChange?: (brightness: number) => void;
  onCategoriesPositionChange?: (position: 'top' | 'bottom') => void;
  onCategoriesTopAlignmentChange?: (alignment: 'left' | 'center' | 'right') => void;
  onCategoriesTopSizeChange?: (size: number) => void;
  onGameTilePaddingChange?: (padding: number) => void;
  onGridSizeChange?: (size: number) => void;
  onCardColumnsChange?: (columns: number) => void;
  onCardPostersOnlyChange?: (enabled: boolean) => void;
  onCardSmartFillChange?: (enabled: boolean) => void;
  onListViewOptionsChange?: (options: ListViewOptions) => void;
  onLogoBackgroundOpacityChange?: (opacity: number) => void;
  onLogoPositionChange?: (position: 'top' | 'middle' | 'bottom' | 'underneath') => void;
  onLogoSizeChange?: (size: number) => void;
  onShowCategoriesInGameListChange?: (show: boolean) => void;
  onShowLogoOverBoxartChange?: (show: boolean) => void;
  renderSettingDescription: (description: string) => ReactNode;
  renderSettingHintIcon: (description: string) => ReactNode;
  handleAlternativeBackgroundToggle: () => void;
  handleSizeChange: (value: number) => void;
}

function getSizeLabel(viewMode: 'grid' | 'list' | 'logo' | 'card'): string {
  if (viewMode === 'grid') return 'Boxart Size';
  if (viewMode === 'logo') return 'Logo Size';
  return 'Game Tile Size';
}

function getSizeRange(viewMode: 'grid' | 'list' | 'logo' | 'card'): { min: number; max: number } {
  if (viewMode === 'list') return { min: 10, max: 300 };
  return { min: 50, max: 600 };
}

function getPaddingRange(viewMode: 'grid' | 'list' | 'logo' | 'card'): { min: number; max: number } {
  if (viewMode === 'logo') return { min: 0, max: 32 };
  return { min: 0, max: 10 };
}

function getPaddingLabel(viewMode: 'grid' | 'list' | 'logo' | 'card'): string {
  if (viewMode === 'grid') return 'Boxart Padding';
  if (viewMode === 'logo') return 'Logo Padding';
  if (viewMode === 'card') return 'Card / Poster Spacing';
  return 'Game Tile Padding';
}

export function RightClickMenuGamesViewSection({
  activeEditorSection,
  activeGame,
  backgroundBlur,
  backgroundBrightness,
  gridSmartFill,
  gridMaximizeSpace,
  cardColumns,
  cardPostersOnly,
  cardSmartFill,
  categoriesPosition,
  categoriesTopAlignment,
  categoriesTopSize,
  focusedGamesViewLayoutClass,
  gameTilePadding,
  gridSize,
  isFocusedEditorSection,
  listSize,
  listViewOptions,
  logoBackgroundOpacity,
  logoPosition,
  logoSize,
  settingDescriptionDisplay,
  showCategoriesInGameList,
  showLogoOverBoxart,
  sliderDefaults,
  viewMode,
  onGridSmartFillChange,
  onGridMaximizeSpaceChange,
  onBackgroundBlurChange,
  onBackgroundBrightnessChange,
  onCategoriesPositionChange,
  onCategoriesTopAlignmentChange,
  onCategoriesTopSizeChange,
  onGameTilePaddingChange,
  onGridSizeChange,
  onCardColumnsChange,
  onCardPostersOnlyChange,
  onCardSmartFillChange,
  onListViewOptionsChange,
  onLogoBackgroundOpacityChange,
  onLogoPositionChange,
  onLogoSizeChange,
  onShowCategoriesInGameListChange,
  onShowLogoOverBoxartChange,
  renderSettingDescription,
  renderSettingHintIcon,
  handleAlternativeBackgroundToggle,
  handleSizeChange,
}: RightClickMenuGamesViewSectionProps) {
  const sizeValue = viewMode === 'grid' ? gridSize : viewMode === 'logo' ? logoSize : listSize;
  const sizeRange = getSizeRange(viewMode);
  const paddingRange = getPaddingRange(viewMode);
  const paddingLabel = getPaddingLabel(viewMode);
  const sizeLabel = getSizeLabel(viewMode);

  return (
    <div
      className={`${
        isFocusedEditorSection
          ? activeEditorSection === 'games-view'
            ? focusedGamesViewLayoutClass
            : 'hidden'
          : viewMode === 'list'
            ? 'col-span-2 grid grid-cols-2 gap-2'
            : 'space-y-2'
      }`}
    >
      {/* Categories Section */}
      {onShowCategoriesInGameListChange && (
        <>
          <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-300 font-medium">Show Categories</label>
                {settingDescriptionDisplay === 'icon' &&
                  renderSettingHintIcon('Shows or hides the pinned category chips above or below the games view.')}
              </div>
              <button
                onClick={() => onShowCategoriesInGameListChange(!showCategoriesInGameList)}
                className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-all ${
                  showCategoriesInGameList ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-all shadow-sm ${
                    showCategoriesInGameList ? 'translate-x-[14px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {renderSettingDescription('Shows or hides the pinned category chips above or below the games view.')}
          </div>

          <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-300 font-medium">Alternative Background</label>
                {settingDescriptionDisplay === 'icon' &&
                  renderSettingHintIcon(
                    'Switches the selected game to its alternate background artwork when available.',
                  )}
              </div>
              <button
                onClick={handleAlternativeBackgroundToggle}
                disabled={!activeGame}
                className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-all ${
                  activeGame?.useAlternativeBackground
                    ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]'
                    : 'bg-gray-600'
                } ${!activeGame ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-all shadow-sm ${
                    activeGame?.useAlternativeBackground ? 'translate-x-[14px]' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            {renderSettingDescription(
              'Switches the selected game to its alternate background artwork when available.',
            )}
          </div>

          {showCategoriesInGameList && (
            <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <div>
                <label className="block text-xs text-gray-400 mb-2 font-semibold">Categories Position</label>
                <div className="flex gap-1">
                  {(['top', 'bottom'] as const).map((pos) => (
                    <button
                      key={pos}
                      onClick={() => onCategoriesPositionChange?.(pos)}
                      className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                        categoriesPosition === pos
                          ? 'bg-blue-600/40 text-white border border-blue-500'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                      }`}
                    >
                      {pos.charAt(0).toUpperCase() + pos.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-2 font-semibold">Categories Alignment</label>
                <div className="flex gap-1">
                  {(['left', 'center', 'right'] as const).map((alignment) => (
                    <button
                      key={alignment}
                      onClick={() => onCategoriesTopAlignmentChange?.(alignment)}
                      className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${
                        categoriesTopAlignment === alignment
                          ? 'bg-blue-600/40 text-white border border-blue-500'
                          : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                      }`}
                    >
                      {alignment.charAt(0).toUpperCase() + alignment.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <MenuSliderRow
                  label="Categories Size"
                  description="Changes the size of the category chips shown in the games view."
                  descriptionDisplay={settingDescriptionDisplay}
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
        </>
      )}

      {/* Smart Fill - common position across Card, Grid, and Logo views - auto-shrinks tiles so every game fits on screen with no scrolling */}
      {viewMode === 'card' && onCardSmartFillChange && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 font-medium">Smart Fill</label>
              {settingDescriptionDisplay === 'icon' &&
                renderSettingHintIcon(
                  'Automatically shrinks cards or posters so every game in the current view fits on one screen without scrolling.',
                )}
            </div>
            <button
              onClick={() => onCardSmartFillChange(!cardSmartFill)}
              className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${
                cardSmartFill ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              title="Toggle smart fill"
            >
              <span
                className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                  cardSmartFill ? 'translate-x-3' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          {renderSettingDescription(
            'Automatically shrinks cards or posters so every game in the current view fits on one screen without scrolling.',
          )}
        </div>
      )}

      {(viewMode === 'grid' || viewMode === 'logo') && onGridSmartFillChange && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 font-medium">Smart Fill</label>
              {settingDescriptionDisplay === 'icon' &&
                renderSettingHintIcon(
                  'Automatically shrinks tiles so every game in the current view fits on one screen without scrolling.',
                )}
            </div>
            <button
              onClick={() => onGridSmartFillChange(!gridSmartFill)}
              className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${
                gridSmartFill ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              title="Toggle smart fill"
            >
              <span
                className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                  gridSmartFill ? 'translate-x-3' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          {renderSettingDescription(
            'Automatically shrinks tiles so every game in the current view fits on one screen without scrolling.',
          )}
        </div>
      )}

      {gridSmartFill && (viewMode === 'grid' || viewMode === 'logo') && onGridMaximizeSpaceChange && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 font-medium">Maximize Space</label>
              {settingDescriptionDisplay === 'icon' &&
                renderSettingHintIcon(
                  'Automatically resizes the details panel so the games view always uses the biggest tiles it can with no leftover space at the bottom. The details panel stays at least 25% of the window width.',
                )}
            </div>
            <button
              onClick={() => onGridMaximizeSpaceChange(!gridMaximizeSpace)}
              className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${
                gridMaximizeSpace ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              title="Toggle maximize space"
            >
              <span
                className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                  gridMaximizeSpace ? 'translate-x-3' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          {renderSettingDescription(
            'Automatically resizes the details panel so the games view always uses the biggest tiles it can with no leftover space at the bottom. The details panel stays at least 25% of the window width.',
          )}
        </div>
      )}

      {/* Size control per view */}
      {!gridSmartFill && ((viewMode === 'grid' && onGridSizeChange) || (viewMode === 'logo' && onLogoSizeChange)) && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <MenuSliderRow
            label={sizeLabel}
            description={
              viewMode === 'grid'
                ? 'Changes how large each game card appears in the grid.'
                : 'Changes how large each logo tile appears in this view.'
            }
            descriptionDisplay={settingDescriptionDisplay}
            min={sizeRange.min}
            max={sizeRange.max}
            step={1}
            value={sizeValue}
            defaultValue={viewMode === 'grid' ? sliderDefaults.gridSize : sliderDefaults.logoSize}
            onChange={handleSizeChange}
            onReset={() =>
              handleSizeChange(viewMode === 'grid' ? sliderDefaults.gridSize : sliderDefaults.logoSize)
            }
            formatValue={(value) => `${value}px`}
            minLabel={`${sizeRange.min}px`}
            maxLabel={`${sizeRange.max}px`}
            sliderClassName="h-2"
          />
        </div>
      )}

      {/* Poster Only (Card / Poster view only) */}
      {viewMode === 'card' && onCardPostersOnlyChange && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 font-medium">Posters Only</label>
              {settingDescriptionDisplay === 'icon' &&
                renderSettingHintIcon(
                  'Shows only poster artwork in Card / Poster view instead of the wide card layout.',
                )}
            </div>
            <button
              onClick={() => onCardPostersOnlyChange(!cardPostersOnly)}
              className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${
                cardPostersOnly ? 'bg-blue-600' : 'bg-gray-600'
              }`}
              title="Toggle posters only"
            >
              <span
                className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                  cardPostersOnly ? 'translate-x-3' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
          {renderSettingDescription(
            'Shows only poster artwork in Card / Poster view instead of the wide card layout.',
          )}
        </div>
      )}

      {/* Games per row (Card / Poster view only) - tiles are evenly spaced across the full width */}
      {viewMode === 'card' && !cardSmartFill && onCardColumnsChange && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <MenuSliderRow
            label="Games Per Row"
            description="Changes how many cards or posters are shown per row. They are evenly spaced across the full width."
            descriptionDisplay={settingDescriptionDisplay}
            min={1}
            max={10}
            step={1}
            value={cardColumns}
            defaultValue={sliderDefaults.cardColumns}
            onChange={onCardColumnsChange}
            onReset={() => onCardColumnsChange(sliderDefaults.cardColumns)}
            formatValue={(value) => `${value}`}
            minLabel="1"
            maxLabel="10"
            sliderClassName="h-2"
          />
        </div>
      )}

      {/* Show Logo Over Boxart Toggle (Grid only) */}
      {viewMode === 'grid' && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-400 font-medium">Show Logo Over Boxart</label>
              {settingDescriptionDisplay === 'icon' &&
                renderSettingHintIcon(
                  'Shows the game logo on top of the cover art instead of leaving the cover clean.',
                )}
            </div>
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
          {renderSettingDescription(
            'Shows the game logo on top of the cover art instead of leaving the cover clean.',
          )}

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
      )}

      {/* Game Tile Padding - only for grid and logo views */}
      {viewMode !== 'list' && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <MenuSliderRow
            label={paddingLabel}
            description="Adds or removes spacing between game tiles."
            descriptionDisplay={settingDescriptionDisplay}
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
            description="Controls how visible the logo tile background panel is in logo view."
            descriptionDisplay={settingDescriptionDisplay}
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
      {viewMode === 'list' && listViewOptions && onListViewOptionsChange && (
        <>
          <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-2">
            <label className="block text-xs text-gray-400 mb-2 font-semibold">Display</label>
            <div className="grid grid-cols-2 gap-1">
              <button
                onClick={() =>
                  onListViewOptionsChange({
                    ...listViewOptions,
                    displayMode: 'boxart-title',
                  })
                }
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  listViewOptions.displayMode === 'boxart-title' || !listViewOptions.displayMode
                    ? 'bg-blue-600/40 text-white border border-blue-500'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                }`}
              >
                Boxart + Title
              </button>
              <button
                onClick={() =>
                  onListViewOptionsChange({
                    ...listViewOptions,
                    displayMode: 'logo-title',
                  })
                }
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  listViewOptions.displayMode === 'logo-title'
                    ? 'bg-blue-600/40 text-white border border-blue-500'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                }`}
              >
                Logo + Title
              </button>
              <button
                onClick={() =>
                  onListViewOptionsChange({
                    ...listViewOptions,
                    displayMode: 'logo-only',
                  })
                }
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  listViewOptions.displayMode === 'logo-only'
                    ? 'bg-blue-600/40 text-white border border-blue-500'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                }`}
              >
                Logo Only
              </button>
              <button
                onClick={() =>
                  onListViewOptionsChange({
                    ...listViewOptions,
                    displayMode: 'title-only',
                  })
                }
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  listViewOptions.displayMode === 'title-only'
                    ? 'bg-blue-600/40 text-white border border-blue-500'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                }`}
              >
                Title Only
              </button>
              <button
                onClick={() =>
                  onListViewOptionsChange({
                    ...listViewOptions,
                    displayMode: 'icon-title',
                  })
                }
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  listViewOptions.displayMode === 'icon-title'
                    ? 'bg-blue-600/40 text-white border border-blue-500'
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'
                }`}
              >
                Icon + Title
              </button>
            </div>

            {(listViewOptions.displayMode === 'boxart-title' || !listViewOptions.displayMode) && (
              <div className="pt-2">
                <MenuSliderRow
                  label="Boxart Size"
                  description="Changes how large the cover art appears in each list row."
                  descriptionDisplay={settingDescriptionDisplay}
                  min={30}
                  max={200}
                  step={1}
                  value={listViewOptions.boxartSize ?? sliderDefaults.listBoxartSize}
                  defaultValue={sliderDefaults.listBoxartSize}
                  onChange={(value) =>
                    onListViewOptionsChange({
                      ...listViewOptions,
                      boxartSize: value,
                    })
                  }
                  onReset={() =>
                    onListViewOptionsChange({
                      ...listViewOptions,
                      boxartSize: sliderDefaults.listBoxartSize,
                    })
                  }
                  formatValue={(value) => `${value}px`}
                  minLabel="30px"
                  maxLabel="200px"
                />
              </div>
            )}

            {(listViewOptions.displayMode === 'logo-title' || listViewOptions.displayMode === 'logo-only') && (
              <div className="pt-2">
                <MenuSliderRow
                  label="Logo Size"
                  description="Changes how large the logo appears in each list row."
                  descriptionDisplay={settingDescriptionDisplay}
                  min={30}
                  max={200}
                  step={1}
                  value={listViewOptions.logoSize ?? sliderDefaults.listLogoSize}
                  defaultValue={sliderDefaults.listLogoSize}
                  onChange={(value) =>
                    onListViewOptionsChange({
                      ...listViewOptions,
                      logoSize: value,
                    })
                  }
                  onReset={() =>
                    onListViewOptionsChange({
                      ...listViewOptions,
                      logoSize: sliderDefaults.listLogoSize,
                    })
                  }
                  formatValue={(value) => `${value}px`}
                  minLabel="30px"
                  maxLabel="200px"
                />
              </div>
            )}

            {listViewOptions.displayMode === 'icon-title' && (
              <div className="pt-2">
                <MenuSliderRow
                  label="Tile Size"
                  description="Changes how large the icon tile appears in each list row."
                  descriptionDisplay={settingDescriptionDisplay}
                  min={30}
                  max={200}
                  step={1}
                  value={listViewOptions.tileHeight ?? sliderDefaults.listTileHeight}
                  defaultValue={sliderDefaults.listTileHeight}
                  onChange={(value) =>
                    onListViewOptionsChange({
                      ...listViewOptions,
                      tileHeight: value,
                    })
                  }
                  onReset={() =>
                    onListViewOptionsChange({
                      ...listViewOptions,
                      tileHeight: sliderDefaults.listTileHeight,
                    })
                  }
                  formatValue={(value) => `${value}px`}
                  minLabel="30px"
                  maxLabel="200px"
                />
              </div>
            )}

            {listViewOptions.displayMode !== 'logo-only' && (
              <div>
                <MenuSliderRow
                  label="Title Text Size"
                  description="Changes the size of the game title text in list rows."
                  descriptionDisplay={settingDescriptionDisplay}
                  min={12}
                  max={32}
                  step={1}
                  value={listViewOptions.titleTextSize ?? sliderDefaults.listTitleTextSize}
                  defaultValue={sliderDefaults.listTitleTextSize}
                  onChange={(value) =>
                    onListViewOptionsChange({
                      ...listViewOptions,
                      titleTextSize: value,
                    })
                  }
                  onReset={() =>
                    onListViewOptionsChange({
                      ...listViewOptions,
                      titleTextSize: sliderDefaults.listTitleTextSize,
                    })
                  }
                  formatValue={(value) => `${value}px`}
                  minLabel="12px"
                  maxLabel="32px"
                />
              </div>
            )}
          </div>

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
              const currentValue = !!listViewOptions[key as keyof ListViewOptions];
              return (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-gray-300">{label}</span>
                  <button
                    onClick={() =>
                      onListViewOptionsChange({
                        ...listViewOptions,
                        [key]: !currentValue,
                      })
                    }
                    className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${
                      currentValue ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${
                        currentValue ? 'translate-x-3' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              );
            })}
            <div className="pt-2">
              <MenuSliderRow
                label="Section Text Size"
                description="Changes the size of the extra metadata text shown in each row."
                descriptionDisplay={settingDescriptionDisplay}
                min={10}
                max={18}
                step={1}
                value={listViewOptions.sectionTextSize ?? sliderDefaults.listSectionTextSize}
                defaultValue={sliderDefaults.listSectionTextSize}
                onChange={(value) =>
                  onListViewOptionsChange({
                    ...listViewOptions,
                    sectionTextSize: value,
                  })
                }
                onReset={() =>
                  onListViewOptionsChange({
                    ...listViewOptions,
                    sectionTextSize: sliderDefaults.listSectionTextSize,
                  })
                }
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
          description="Controls how much the background artwork is blurred behind the games view."
          descriptionDisplay={settingDescriptionDisplay}
          min={0}
          max={100}
          step={1}
          value={backgroundBlur}
          defaultValue={sliderDefaults.backgroundBlur}
          onChange={(value) => onBackgroundBlurChange?.(value)}
          onReset={() => onBackgroundBlurChange?.(sliderDefaults.backgroundBlur)}
          formatValue={(value) => `${value}%`}
          minLabel="0%"
          maxLabel="100%"
        />
      </div>

      {/* Background Brightness */}
      <div className="px-3 py-2 bg-gray-700/30 rounded-md">
        <MenuSliderRow
          label="Background Brightness"
          description="Controls how bright the background artwork appears behind the games view."
          descriptionDisplay={settingDescriptionDisplay}
          min={0}
          max={100}
          step={1}
          value={Math.round(backgroundBrightness * 100)}
          defaultValue={sliderDefaults.backgroundBrightnessPercent}
          onChange={(value) => onBackgroundBrightnessChange?.(value / 100)}
          onReset={() =>
            onBackgroundBrightnessChange?.(sliderDefaults.backgroundBrightnessPercent / 100)
          }
          formatValue={(value) => `${value}%`}
          minLabel="0%"
          maxLabel="100%"
        />
      </div>
    </div>
  );
}
