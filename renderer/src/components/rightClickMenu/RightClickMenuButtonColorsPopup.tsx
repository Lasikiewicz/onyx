import { forwardRef } from 'react';
import type { ButtonColors } from './RightClickMenuButtonColorsEditor';
import {
  DEFAULT_BUTTON_COLORS,
  RightClickMenuButtonColorsEditor,
} from './RightClickMenuButtonColorsEditor';

export interface ButtonColorsPopupState {
  editorKey: 'carousel' | 'details';
  title: string;
  colors?: ButtonColors;
  onChange?: (colors: ButtonColors) => void;
  onReset?: () => void;
  anchorRect: DOMRect;
}

export interface RightClickMenuButtonColorsPopupProps {
  popup: ButtonColorsPopupState | null;
  onResetWithClose?: (editorKey: 'carousel' | 'details') => () => void;
  defaultButtonColors?: ButtonColors;
}

export const RightClickMenuButtonColorsPopup = forwardRef<
  HTMLDivElement,
  RightClickMenuButtonColorsPopupProps
>(function RightClickMenuButtonColorsPopup(
  { popup, onResetWithClose, defaultButtonColors = DEFAULT_BUTTON_COLORS },
  ref,
) {
  if (!popup) return null;

  const popupWidth = 420;
  const popupHeight = 170;
  const margin = 12;
  const { anchorRect, colors, editorKey, onChange, onReset, title } = popup;
  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const top =
    spaceBelow >= popupHeight + margin
      ? Math.min(anchorRect.bottom + 8, window.innerHeight - popupHeight - margin)
      : Math.max(margin, anchorRect.top - popupHeight - 8);
  const preferredLeft = anchorRect.right - popupWidth;
  const left = Math.max(margin, Math.min(preferredLeft, window.innerWidth - popupWidth - margin));

  return (
    <div
      ref={ref}
      className="fixed z-[10020] w-[420px] rounded-xl border border-gray-500/80 bg-gray-800 shadow-2xl shadow-black/50"
      style={{ left, top }}
    >
      <RightClickMenuButtonColorsEditor
        title={title}
        colors={colors}
        onChange={onChange}
        onReset={
          onResetWithClose
            ? () => {
                onReset?.();
                onResetWithClose(editorKey);
              }
            : onReset
        }
        containerClassName="px-4 py-4 bg-transparent rounded-xl"
        defaultColors={defaultButtonColors}
      />
    </div>
  );
});
