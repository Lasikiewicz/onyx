import React from 'react';
import { RightClickMenuProps } from './types';
import { MenuSliderRow } from '../MenuSliderRow';
import { ButtonColorEditor } from './ButtonColorEditor';
import { sliderDefaults, defaultButtonColors } from './constants';

interface CarouselSettingsProps extends RightClickMenuProps {
  localLogoSize: number;
  onPerGameLogoSizeChange: (size: number) => void;
  onAlternativeBackgroundToggle: () => void;
}

export const CarouselSettings: React.FC<CarouselSettingsProps> = ({
  // Props from RightClickMenuProps that are used here
  activeGame,
  showCarouselDetails = true,
  onShowCarouselDetailsChange,
  detailsBarSize = 14,
  onDetailsBarSizeChange,
  selectedBoxArtSize = 12.5,
  onSelectedBoxArtSizeChange,
  gameTilePadding = 3,
  onGameTilePaddingChange,
  backgroundBlur = 40,
  onBackgroundBlurChange,
  backgroundBrightness = 0.3,
  onBackgroundBrightnessChange,
  showCarouselLogos = true,
  onShowCarouselLogosChange,
  carouselLogoSize = 100,
  onCarouselLogoSizeChange,
  carouselLogoAlignment = 'center',
  onCarouselLogoAlignmentChange,
  carouselDescriptionSize = 18,
  onCarouselDescriptionSizeChange,
  carouselDescriptionAlignment = 'center',
  onCarouselDescriptionAlignmentChange,
  carouselButtonSize = 14,
  onCarouselButtonSizeChange,
  carouselButtonAlignment = 'center',
  onCarouselButtonAlignmentChange,
  carouselButtonColors,
  onCarouselButtonColorsChange,
  // New props
  localLogoSize,
  onPerGameLogoSizeChange,
  onAlternativeBackgroundToggle,
}) => {
  const handleShowCarouselDetailsToggle = () => {
    onShowCarouselDetailsChange?.(!showCarouselDetails);
  };

  const handleShowCarouselLogosToggle = () => {
    onShowCarouselLogosChange?.(!showCarouselLogos);
  };

  return (
    <>
      <div className="grid grid-cols-2 text-xs text-gray-400 px-3 pb-1 font-semibold">
        <span>Games View</span>
        <span className="text-right">Game Details</span>
      </div>
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
                  className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${showCarouselDetails ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                >
                  <span
                    className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${showCarouselDetails ? 'translate-x-3' : 'translate-x-0.5'
                      }`}
                  />
                </button>
              </div>

              {/* Details Bar Size - only show when details are enabled */}
              {showCarouselDetails && onDetailsBarSizeChange && (
                <>
                  <MenuSliderRow
                    label="Details Bar Size"
                    min={10}
                    max={24}
                    step={1}
                    value={detailsBarSize}
                    defaultValue={sliderDefaults.detailsBarSize}
                    onChange={onDetailsBarSizeChange}
                    onReset={() => onDetailsBarSizeChange(sliderDefaults.detailsBarSize)}
                    formatValue={(value) => `${value}px`}
                    minLabel="10px"
                    maxLabel="24px"
                  />
                </>
              )}
            </div>

            {/* Selected Box Art Size */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Selected Box Art Size"
                min={5}
                max={30}
                step={0.5}
                value={selectedBoxArtSize}
                defaultValue={sliderDefaults.selectedBoxArtSize}
                onChange={(value) => onSelectedBoxArtSizeChange?.(value)}
                onReset={() => onSelectedBoxArtSizeChange?.(sliderDefaults.selectedBoxArtSize)}
                formatValue={(value) => `${value}vw`}
                minLabel="5vw"
                maxLabel="30vw"
              />
            </div>

            {/* Game Tile Padding - for Carousel */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Game Tile Padding"
                min={0}
                max={3}
                step={1}
                value={gameTilePadding}
                defaultValue={sliderDefaults.gameTilePadding}
                onChange={(value) => onGameTilePaddingChange?.(value)}
                onReset={() => onGameTilePaddingChange?.(sliderDefaults.gameTilePadding)}
                formatValue={(value) => `${value}px`}
                minLabel="0px"
                maxLabel="3px"
              />
            </div>

            {/* Background Blur Amount - for Carousel */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <MenuSliderRow
                label="Background Blur Amount"
                min={0}
                max={100}
                step={1}
                value={backgroundBlur}
                defaultValue={0}
                onChange={(value) => onBackgroundBlurChange?.(value)}
                onReset={() => onBackgroundBlurChange?.(0)}
                formatValue={(value) => `${value}px`}
                minLabel="0px"
                maxLabel="100px"
              />
            </div>

            {/* Background Brightness - for Carousel */}
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

          {/* Right Column */}
          <div className="space-y-2">
            {/* Per-Game Logo Size Control for Carousel */}
            {activeGame && (
              <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-gray-300 font-medium">Alternative Background</label>
                  <button
                    onClick={onAlternativeBackgroundToggle}
                    className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-all ${activeGame?.useAlternativeBackground ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-600'}`}
                  >
                    <span
                      className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-all shadow-sm ${activeGame?.useAlternativeBackground ? 'translate-x-[14px]' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>

                <div className="pt-3 border-t border-white/5">
                  <MenuSliderRow
                    label="Game Logo Size"
                    min={50}
                    max={600}
                    step={5}
                    value={localLogoSize}
                    defaultValue={sliderDefaults.perGameLogoSize}
                    onChange={onPerGameLogoSizeChange}
                    onReset={() => onPerGameLogoSizeChange(sliderDefaults.perGameLogoSize)}
                    formatValue={(value) => `${value}px`}
                    minLabel="50px"
                    maxLabel="600px"
                    sliderClassName="h-2"
                  />
                </div>
              </div>
            )}

            {/* Game Logos Section */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              {/* Show Game Logos Toggle */}
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs text-gray-400 font-medium">Show Game Logos</label>
                <button
                  onClick={handleShowCarouselLogosToggle}
                  className={`relative inline-flex h-3 w-6 items-center rounded-full transition-colors ${showCarouselLogos ? 'bg-blue-600' : 'bg-gray-600'
                    }`}
                >
                  <span
                    className={`inline-block h-2 w-2 transform rounded-full bg-white transition-transform ${showCarouselLogos ? 'translate-x-3' : 'translate-x-0.5'
                      }`}
                  />
                </button>
              </div>

              {/* Logo Size - only show when logos are enabled AND no per-game override */}
              {showCarouselLogos && !activeGame && onCarouselLogoSizeChange && (
                <>
                  <MenuSliderRow
                    label="Logo Size"
                    min={50}
                    max={600}
                    step={5}
                    value={carouselLogoSize}
                    defaultValue={sliderDefaults.carouselLogoSize}
                    onChange={onCarouselLogoSizeChange}
                    onReset={() => onCarouselLogoSizeChange(sliderDefaults.carouselLogoSize)}
                    formatValue={(value) => `${value}px`}
                    minLabel="50px"
                    maxLabel="600px"
                  />
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
                        className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${carouselLogoAlignment === alignment
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
              <MenuSliderRow
                label="Description Text Size"
                min={12}
                max={28}
                step={1}
                value={carouselDescriptionSize}
                defaultValue={sliderDefaults.carouselDescriptionSize}
                onChange={(value) => onCarouselDescriptionSizeChange?.(value)}
                onReset={() => onCarouselDescriptionSizeChange?.(sliderDefaults.carouselDescriptionSize)}
                formatValue={(value) => `${value}px`}
                minLabel="12px"
                maxLabel="28px"
              />
            </div>

            {/* Description Text Alignment */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <label className="block text-xs text-gray-400 mb-2 font-semibold">Description Text Alignment</label>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((alignment) => (
                  <button
                    key={alignment}
                    onClick={() => onCarouselDescriptionAlignmentChange?.(alignment)}
                    className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${carouselDescriptionAlignment === alignment
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
              <MenuSliderRow
                label="Button Size"
                min={10}
                max={24}
                step={1}
                value={carouselButtonSize}
                defaultValue={sliderDefaults.carouselButtonSize}
                onChange={(value) => onCarouselButtonSizeChange?.(value)}
                onReset={() => onCarouselButtonSizeChange?.(sliderDefaults.carouselButtonSize)}
                formatValue={(value) => `${value}px`}
                minLabel="10px"
                maxLabel="24px"
              />
            </div>

            {/* Button Colors */}
            <ButtonColorEditor
              title="Button Colors"
              colors={carouselButtonColors}
              onChange={onCarouselButtonColorsChange}
              onReset={() => {
                onCarouselButtonColorsChange?.(defaultButtonColors);
                window.electronAPI.savePreferences({ carouselButtonColors: defaultButtonColors });
              }}
            />

            {/* Button Alignment */}
            <div className="px-3 py-2 bg-gray-700/30 rounded-md">
              <label className="block text-xs text-gray-400 mb-2 font-semibold">Button Alignment</label>
              <div className="flex gap-1">
                {(['left', 'center', 'right'] as const).map((alignment) => (
                  <button
                    key={alignment}
                    onClick={() => onCarouselButtonAlignmentChange?.(alignment)}
                    className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${carouselButtonAlignment === alignment
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
  );
};
