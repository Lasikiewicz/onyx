import type { ReactNode } from 'react';
import type { ButtonColors } from './RightClickMenuButtonColorsEditor';
import { resolveButtonColors } from './RightClickMenuButtonColorsEditor';

export interface RightClickMenuButtonColorsTriggerProps {
  editorKey: 'carousel' | 'details';
  title: string;
  description?: string;
  colors?: ButtonColors;
  isOpen: boolean;
  onClick: (anchorRect: DOMRect) => void;
  settingDescriptionDisplay: 'icon' | 'inline';
  renderSettingHintIcon?: (description: string) => ReactNode;
  defaultColors?: ButtonColors;
}

export function RightClickMenuButtonColorsTrigger({
  editorKey: _editorKey,
  title,
  description,
  colors,
  isOpen,
  onClick,
  settingDescriptionDisplay,
  renderSettingHintIcon,
  defaultColors,
}: RightClickMenuButtonColorsTriggerProps) {
  const resolvedColors = resolveButtonColors(colors, defaultColors);

  return (
    <div className="px-3 py-2 bg-gray-700/30 rounded-md">
      <button
        onClick={(event) => onClick(event.currentTarget.getBoundingClientRect())}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div>
          <div className="flex items-center gap-2">
            <div className="text-xs text-gray-400 font-semibold">{title}</div>
            {description && settingDescriptionDisplay === 'icon' && renderSettingHintIcon?.(description)}
          </div>
          {description && settingDescriptionDisplay === 'inline' ? (
            <div className="text-[11px] text-gray-300/90 mt-0.5">{description}</div>
          ) : (
            <div className="text-[11px] text-gray-500 mt-0.5">
              {settingDescriptionDisplay === 'inline' ? 'Open color picker' : ''}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <span
              className="w-4 h-4 rounded border border-gray-500"
              style={{ backgroundColor: resolvedColors.playColor }}
              title="Play button color"
            />
            <span
              className="w-4 h-4 rounded border border-gray-500"
              style={{ backgroundColor: resolvedColors.editColor }}
              title="Edit button color"
            />
            <span
              className="w-4 h-4 rounded border border-gray-500"
              style={{ backgroundColor: resolvedColors.modManagerColor }}
              title="Mod Manager button color"
            />
          </div>
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
    </div>
  );
}
