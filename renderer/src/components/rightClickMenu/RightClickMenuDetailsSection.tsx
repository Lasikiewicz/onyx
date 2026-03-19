import type { ReactNode } from 'react';
import type { Game } from '../../types/game';
import { MenuSliderRow } from '../MenuSliderRow';
import type { RightClickMenuEditorSection } from './RightClickMenuHeader';

type ButtonColors = { playColor?: string; editColor?: string; modManagerColor?: string };

interface SliderDefaults {
  detailsPanelOpacity: number;
  perGameLogoSize: number;
  rightPanelBoxartSize: number;
  rightPanelButtonSize: number;
  rightPanelTextSize: number;
}

interface RightClickMenuDetailsSectionProps {
  activeEditorSection: RightClickMenuEditorSection | null;
  activeGame?: Game;
  defaultButtonColors: ButtonColors;
  defaultDetailsPanelTransparency: number;
  detailsLogoSliderDefault: number;
  detailsLogoSliderMax: number;
  detailsPanelTransparency: number;
  focusedSectionLayoutClass: string;
  gridButtonColors?: ButtonColors;
  isFocusedEditorSection: boolean;
  listButtonColors?: ButtonColors;
  localLogoSizes: {
    grid: number;
    list: number;
    logo: number;
    carousel: number;
  };
  logoButtonColors?: ButtonColors;
  rightPanelBoxartPosition: 'left' | 'right' | 'none';
  rightPanelBoxartSize: number;
  rightPanelButtonColors?: ButtonColors;
  rightPanelButtonLocation: 'left' | 'middle' | 'right';
  rightPanelButtonSize: number;
  rightPanelTextSize: number;
  settingDescriptionDisplay: 'icon' | 'inline';
  sliderDefaults: SliderDefaults;
  viewMode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow';
  onGridButtonColorsChange?: (colors: ButtonColors) => void;
  onListButtonColorsChange?: (colors: ButtonColors) => void;
  onLogoButtonColorsChange?: (colors: ButtonColors) => void;
  onRightPanelBoxartPositionChange?: (position: 'left' | 'right' | 'none') => void;
  onRightPanelBoxartSizeChange?: (size: number) => void;
  onRightPanelButtonColorsChange?: (colors: ButtonColors) => void;
  onRightPanelButtonLocationChange?: (location: 'left' | 'middle' | 'right') => void;
  onRightPanelButtonSizeChange?: (size: number) => void;
  onRightPanelTextSizeChange?: (size: number) => void;
  onDetailsPanelOpacityChange?: (opacity: number) => void;
  renderButtonColorsTrigger: (options: {
    editorKey: 'carousel' | 'details';
    title: string;
    description?: string;
    colors?: ButtonColors;
    onChange?: (colors: ButtonColors) => void;
    onReset?: () => void;
  }) => ReactNode;
  renderSettingDescription: (description: string) => ReactNode;
  renderSettingHintIcon: (description: string) => ReactNode;
  handlePerGameLogoSizeChange: (viewModeType: 'grid' | 'list' | 'logo' | 'carousel', size: number) => void;
}

export function RightClickMenuDetailsSection({
  activeEditorSection,
  activeGame,
  defaultButtonColors,
  defaultDetailsPanelTransparency,
  detailsLogoSliderDefault,
  detailsLogoSliderMax,
  detailsPanelTransparency,
  focusedSectionLayoutClass,
  gridButtonColors,
  isFocusedEditorSection,
  listButtonColors,
  localLogoSizes,
  logoButtonColors,
  rightPanelBoxartPosition,
  rightPanelBoxartSize,
  rightPanelButtonColors,
  rightPanelButtonLocation,
  rightPanelButtonSize,
  rightPanelTextSize,
  settingDescriptionDisplay,
  sliderDefaults,
  viewMode,
  onGridButtonColorsChange,
  onListButtonColorsChange,
  onLogoButtonColorsChange,
  onRightPanelBoxartPositionChange,
  onRightPanelBoxartSizeChange,
  onRightPanelButtonColorsChange,
  onRightPanelButtonLocationChange,
  onRightPanelButtonSizeChange,
  onRightPanelTextSizeChange,
  onDetailsPanelOpacityChange,
  renderButtonColorsTrigger,
  renderSettingDescription,
  renderSettingHintIcon,
  handlePerGameLogoSizeChange,
}: RightClickMenuDetailsSectionProps) {
  return (
    <div className={`${isFocusedEditorSection ? (activeEditorSection === 'details-view' ? focusedSectionLayoutClass : 'hidden') : 'space-y-2'}`}>
      {activeGame && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          {viewMode === 'grid' && (
            <MenuSliderRow
              label={activeGame.logoUrl ? 'Game Logo Size' : 'Title Size'}
              description="Changes the selected game's logo size in the details panel."
              descriptionDisplay={settingDescriptionDisplay}
              min={50}
              max={detailsLogoSliderMax}
              step={5}
              value={Math.min(localLogoSizes.grid, detailsLogoSliderMax)}
              defaultValue={detailsLogoSliderDefault}
              onChange={(value) => handlePerGameLogoSizeChange('grid', value)}
              onReset={() => handlePerGameLogoSizeChange('grid', detailsLogoSliderDefault)}
              formatValue={(value) => `${value}px`}
              minLabel="50px"
              maxLabel={`${detailsLogoSliderMax}px`}
              sliderClassName="h-2"
            />
          )}

          {viewMode === 'list' && (
            <MenuSliderRow
              label={activeGame.logoUrl ? 'Game Logo Size' : 'Title Size'}
              description="Changes the selected game's logo size in the details panel."
              descriptionDisplay={settingDescriptionDisplay}
              min={50}
              max={detailsLogoSliderMax}
              step={5}
              value={Math.min(localLogoSizes.list, detailsLogoSliderMax)}
              defaultValue={detailsLogoSliderDefault}
              onChange={(value) => handlePerGameLogoSizeChange('list', value)}
              onReset={() => handlePerGameLogoSizeChange('list', detailsLogoSliderDefault)}
              formatValue={(value) => `${value}px`}
              minLabel="50px"
              maxLabel={`${detailsLogoSliderMax}px`}
              sliderClassName="h-2"
            />
          )}

          {viewMode === 'logo' && (
            <MenuSliderRow
              label={activeGame.logoUrl ? 'Game Logo Size' : 'Title Size'}
              description="Changes the selected game's logo size in the details panel."
              descriptionDisplay={settingDescriptionDisplay}
              min={50}
              max={detailsLogoSliderMax}
              step={5}
              value={Math.min(localLogoSizes.logo, detailsLogoSliderMax)}
              defaultValue={detailsLogoSliderDefault}
              onChange={(value) => handlePerGameLogoSizeChange('logo', value)}
              onReset={() => handlePerGameLogoSizeChange('logo', detailsLogoSliderDefault)}
              formatValue={(value) => `${value}px`}
              minLabel="50px"
              maxLabel={`${detailsLogoSliderMax}px`}
              sliderClassName="h-2"
            />
          )}
        </div>
      )}

      <div className="px-3 py-2 bg-gray-700/30 rounded-md">
        <div className="mb-2 flex items-center gap-2">
          <label className="block text-xs text-gray-400 font-semibold">Boxart Position</label>
          {settingDescriptionDisplay === 'icon' && renderSettingHintIcon("Chooses which side of the details panel the selected game's boxart sits on.")}
        </div>
        {renderSettingDescription("Chooses which side of the details panel the selected game's boxart sits on.")}
        <div className="grid grid-cols-3 gap-1 mb-3">
          {(['left', 'right', 'none'] as const).map((position) => (
            <button
              key={position}
              onClick={() => onRightPanelBoxartPositionChange?.(position)}
              className={`px-2 py-1 text-xs rounded transition-colors ${rightPanelBoxartPosition === position ? 'bg-blue-600/40 text-white border border-blue-500' : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'}`}
            >
              {position === 'none' ? 'None' : position.charAt(0).toUpperCase() + position.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {(rightPanelBoxartPosition === 'left' || rightPanelBoxartPosition === 'right') && (
        <div className="px-3 py-2 bg-gray-700/30 rounded-md">
          <MenuSliderRow
            label="Resize Boxart"
            description="Changes how large the selected game's boxart appears in the details panel."
            descriptionDisplay={settingDescriptionDisplay}
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
        </div>
      )}

      <div className="px-3 py-2 bg-gray-700/30 rounded-md">
        <MenuSliderRow
          label="Text Size"
          description="Changes the size of the description and metadata text in the details panel."
          descriptionDisplay={settingDescriptionDisplay}
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

      <div className="px-3 py-2 bg-gray-700/30 rounded-md">
        <MenuSliderRow
          label="Button Size"
          description="Changes the size of the action buttons shown at the bottom of the details panel."
          descriptionDisplay={settingDescriptionDisplay}
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

      <div className="px-3 py-2 bg-gray-700/30 rounded-md">
        <div className="mb-2 flex items-center gap-2">
          <label className="block text-xs text-gray-400 font-semibold">Button Location</label>
          {settingDescriptionDisplay === 'icon' && renderSettingHintIcon('Chooses whether the action buttons sit left, centered, or right in the bottom bar.')}
        </div>
        {renderSettingDescription('Chooses whether the action buttons sit left, centered, or right in the bottom bar.')}
        <div className="grid grid-cols-3 gap-1">
          {(['left', 'middle', 'right'] as const).map((location) => (
            <button
              key={location}
              onClick={() => onRightPanelButtonLocationChange?.(location)}
              className={`px-2 py-1 text-xs rounded transition-colors ${rightPanelButtonLocation === location ? 'bg-blue-600/40 text-white border border-blue-500' : 'bg-gray-600 text-gray-300 hover:bg-gray-500 border border-gray-500'}`}
            >
              {location.charAt(0).toUpperCase() + location.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {(() => {
        const getColors = () => {
          if (viewMode === 'grid') return { colors: gridButtonColors, handler: onGridButtonColorsChange, preferenceKey: 'gridButtonColors' };
          if (viewMode === 'list') return { colors: listButtonColors, handler: onListButtonColorsChange, preferenceKey: 'listButtonColors' };
          if (viewMode === 'logo') return { colors: logoButtonColors, handler: onLogoButtonColorsChange, preferenceKey: 'logoButtonColors' };
          return { colors: rightPanelButtonColors, handler: onRightPanelButtonColorsChange, preferenceKey: 'rightPanelButtonColors' };
        };

        const { colors, handler, preferenceKey } = getColors();
        return renderButtonColorsTrigger({
          editorKey: 'details',
          title: 'Button Colors',
          description: 'Opens the color picker for the Play, Edit, and Mod Manager buttons.',
          colors,
          onChange: handler,
          onReset: () => {
            handler?.(defaultButtonColors);
            window.electronAPI.savePreferences({ [preferenceKey]: defaultButtonColors });
          },
        });
      })()}

      <div className="px-3 py-2 bg-gray-700/30 rounded-md">
        <MenuSliderRow
          label="Details View Transparency"
          description="Controls how transparent the details panel surface becomes over the background artwork."
          descriptionDisplay={settingDescriptionDisplay}
          min={0}
          max={100}
          step={1}
          value={detailsPanelTransparency}
          defaultValue={defaultDetailsPanelTransparency}
          onChange={(value) => onDetailsPanelOpacityChange?.(100 - value)}
          onReset={() => onDetailsPanelOpacityChange?.(sliderDefaults.detailsPanelOpacity)}
          formatValue={(value) => `${value}%`}
          minLabel="0%"
          maxLabel="100%"
        />
      </div>
    </div>
  );
}
