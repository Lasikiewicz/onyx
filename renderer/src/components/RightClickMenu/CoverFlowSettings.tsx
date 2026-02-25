import React from 'react';
import { RightClickMenuProps } from './types';
import { MenuSliderRow } from '../MenuSliderRow';
import { ButtonColorEditor } from './ButtonColorEditor';
import { sliderDefaults, defaultButtonColors } from './constants';

interface CoverFlowSettingsProps extends RightClickMenuProps {
  onAlternativeBackgroundToggle: () => void;
}

export const CoverFlowSettings: React.FC<CoverFlowSettingsProps> = ({
  // Props from RightClickMenuProps
  activeGame,
  backgroundBlur = 40,
  onBackgroundBlurChange,
  backgroundBrightness = 0.3,
  onBackgroundBrightnessChange,
  coverFlowCoverSize = 300,
  onCoverFlowCoverSizeChange,
  coverFlowReflection = 60,
  onCoverFlowReflectionChange,
  coverFlowVerticalOffset = 0,
  onCoverFlowVerticalOffsetChange,
  coverFlowSideOpacity = 100,
  onCoverFlowSideOpacityChange,
  coverFlowShowButtons = true,
  onCoverFlowShowButtonsChange,
  coverFlowButtonPosition = 'middle',
  onCoverFlowButtonPositionChange,
  coverFlowButtonColors,
  onCoverFlowButtonColorsChange,
  // New props
  onAlternativeBackgroundToggle,
}) => {
  return (
    <div className="px-2 py-2 space-y-3">
      {onCoverFlowCoverSizeChange && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <MenuSliderRow
            label="Boxart size"
            min={150}
            max={450}
            step={10}
            value={coverFlowCoverSize}
            defaultValue={sliderDefaults.coverFlowCoverSize}
            onChange={onCoverFlowCoverSizeChange}
            onReset={() => onCoverFlowCoverSizeChange(sliderDefaults.coverFlowCoverSize)}
            formatValue={(value) => `${value}px`}
            minLabel="150px"
            maxLabel="450px"
            sliderClassName="h-2"
          />
        </div>
      )}
      {onCoverFlowReflectionChange && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <MenuSliderRow
            label="Reflection transparency"
            min={0}
            max={100}
            step={5}
            value={coverFlowReflection}
            defaultValue={sliderDefaults.coverFlowReflection}
            onChange={onCoverFlowReflectionChange}
            onReset={() => onCoverFlowReflectionChange(sliderDefaults.coverFlowReflection)}
            formatValue={(value) => `${value}%`}
            minLabel="0%"
            maxLabel="100%"
            sliderClassName="h-2"
          />
        </div>
      )}
      {onCoverFlowVerticalOffsetChange && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <MenuSliderRow
            label="Boxart vertical position"
            min={-500}
            max={500}
            step={5}
            value={coverFlowVerticalOffset}
            defaultValue={sliderDefaults.coverFlowVerticalOffset}
            onChange={onCoverFlowVerticalOffsetChange}
            onReset={() => onCoverFlowVerticalOffsetChange(sliderDefaults.coverFlowVerticalOffset)}
            formatValue={(value) => value > 0 ? `+${value}px` : `${value}px`}
            minLabel="-500px"
            maxLabel="500px"
            sliderClassName="h-2"
          />
        </div>
      )}
      {onCoverFlowSideOpacityChange && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <MenuSliderRow
            label="Side boxart opacity"
            min={0}
            max={100}
            step={5}
            value={coverFlowSideOpacity}
            defaultValue={sliderDefaults.coverFlowSideOpacity}
            onChange={onCoverFlowSideOpacityChange}
            onReset={() => onCoverFlowSideOpacityChange(sliderDefaults.coverFlowSideOpacity)}
            formatValue={(value) => `${value}%`}
            minLabel="0%"
            maxLabel="100%"
            sliderClassName="h-2"
          />
        </div>
      )}
      {onBackgroundBlurChange && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <MenuSliderRow
            label="Background Blur Amount"
            min={0}
            max={100}
            step={1}
            value={backgroundBlur}
            defaultValue={sliderDefaults.backgroundBlur}
            onChange={onBackgroundBlurChange}
            onReset={() => onBackgroundBlurChange(sliderDefaults.backgroundBlur)}
            formatValue={(value) => `${value}px`}
            minLabel="0px"
            maxLabel="100px"
            sliderClassName="h-2"
          />
        </div>
      )}
      {onBackgroundBrightnessChange && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-3">
          <MenuSliderRow
            label="Background brightness"
            min={0}
            max={100}
            step={5}
            value={Math.round((backgroundBrightness ?? 0) * 100)}
            defaultValue={sliderDefaults.backgroundBrightnessPercent}
            onChange={(value) => onBackgroundBrightnessChange(value / 100)}
            onReset={() => onBackgroundBrightnessChange(sliderDefaults.backgroundBrightnessPercent / 100)}
            formatValue={(value) => `${value}%`}
            minLabel="0%"
            maxLabel="100%"
            sliderClassName="h-2"
          />

          {activeGame && (
            <div className="flex items-center justify-between pt-3 border-t border-white/5">
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
          )}
        </div>
      )}
      <div className="px-3 py-2 bg-gray-700/30 rounded-md space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs text-gray-300 font-medium">Show Buttons</label>
          <button
            onClick={() => onCoverFlowShowButtonsChange?.(!coverFlowShowButtons)}
            className={`relative inline-flex h-3.5 w-7 items-center rounded-full transition-all ${coverFlowShowButtons ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' : 'bg-gray-600'}`}
          >
            <span
              className={`inline-block h-2.5 w-2.5 transform rounded-full bg-white transition-all shadow-sm ${coverFlowShowButtons ? 'translate-x-[14px]' : 'translate-x-0.5'}`}
            />
          </button>
        </div>
        {coverFlowShowButtons && (
          <>
            <div>
              <label className="block text-xs text-gray-400 mb-1 font-semibold">Button position</label>
              <div className="flex gap-1">
                {(['left', 'middle', 'right'] as const).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => onCoverFlowButtonPositionChange?.(pos)}
                    className={`flex-1 px-2 py-1 text-xs rounded transition-colors ${coverFlowButtonPosition === pos ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-300 hover:bg-gray-500'}`}
                  >
                    {pos === 'middle' ? 'Middle' : pos.charAt(0).toUpperCase() + pos.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {onCoverFlowButtonColorsChange && (
              <>
                <ButtonColorEditor
                  title="Button Colours"
                  colors={coverFlowButtonColors}
                  onChange={onCoverFlowButtonColorsChange}
                  onReset={() => onCoverFlowButtonColorsChange(defaultButtonColors)}
                  containerClassName="space-y-2 pt-2 border-t border-white/5"
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
