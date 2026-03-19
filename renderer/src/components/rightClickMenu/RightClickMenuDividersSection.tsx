import { MenuSliderRow } from '../MenuSliderRow';
import type { RightClickMenuEditorSection } from './RightClickMenuHeader';

export interface DividersSliderDefaults {
  panelWidth: number;
  fanartHeight: number;
  descriptionWidth: number;
  detailsPanelBottomBarHeight: number;
}

export interface RightClickMenuDividersSectionProps {
  activeEditorSection: RightClickMenuEditorSection | null;
  detailsPanelBottomBarHeight: number;
  descriptionWidth: number;
  fanartHeight: number;
  focusedSectionLayoutClass: string;
  isFocusedEditorSection: boolean;
  panelWidth: number;
  settingDescriptionDisplay: 'icon' | 'inline';
  sliderDefaults: DividersSliderDefaults;
  onDetailsPanelBottomBarHeightChange?: (height: number) => void;
  onDescriptionWidthChange?: (width: number) => void;
  onFanartHeightChange?: (height: number) => void;
  onPanelWidthChange?: (width: number) => void;
}

export function RightClickMenuDividersSection({
  activeEditorSection,
  detailsPanelBottomBarHeight,
  descriptionWidth,
  fanartHeight,
  focusedSectionLayoutClass,
  isFocusedEditorSection,
  panelWidth,
  settingDescriptionDisplay,
  sliderDefaults,
  onDetailsPanelBottomBarHeightChange,
  onDescriptionWidthChange,
  onFanartHeightChange,
  onPanelWidthChange,
}: RightClickMenuDividersSectionProps) {
  return (
    <div
      className={`${
        isFocusedEditorSection
          ? activeEditorSection === 'dividers'
            ? focusedSectionLayoutClass
            : 'hidden'
          : 'space-y-2'
      }`}
    >
      <div className="px-3 py-2 bg-gray-700/30 rounded-md">
        <MenuSliderRow
          label="Right Panel Width"
          description="Changes how much horizontal space the game details panel uses."
          descriptionDisplay={settingDescriptionDisplay}
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

      <div className="px-3 py-2 bg-gray-700/30 rounded-md">
        <MenuSliderRow
          label="Banner Height"
          description="Changes how tall the top artwork banner is in the details panel."
          descriptionDisplay={settingDescriptionDisplay}
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

      <div className="px-3 py-2 bg-gray-700/30 rounded-md">
        <MenuSliderRow
          label="Description Width"
          description="Changes how much of the content area is given to the description column."
          descriptionDisplay={settingDescriptionDisplay}
          min={20}
          max={80}
          step={1}
          value={descriptionWidth}
          defaultValue={sliderDefaults.descriptionWidth}
          onChange={(value) => onDescriptionWidthChange?.(value)}
          onReset={() => onDescriptionWidthChange?.(sliderDefaults.descriptionWidth)}
          formatValue={(value) => `${Math.round(value)}%`}
          minLabel="20%"
          maxLabel="80%"
        />
      </div>

      <div className="px-3 py-2 bg-gray-700/30 rounded-md">
        <MenuSliderRow
          label="Bottom Bar Height"
          description="Changes the height of the bottom action bar with buttons and links."
          descriptionDisplay={settingDescriptionDisplay}
          min={48}
          max={140}
          step={2}
          value={detailsPanelBottomBarHeight}
          defaultValue={sliderDefaults.detailsPanelBottomBarHeight}
          onChange={(value) => onDetailsPanelBottomBarHeightChange?.(value)}
          onReset={() => onDetailsPanelBottomBarHeightChange?.(sliderDefaults.detailsPanelBottomBarHeight)}
          formatValue={(value) => `${value}px`}
          minLabel="48px"
          maxLabel="140px"
        />
      </div>
    </div>
  );
}
