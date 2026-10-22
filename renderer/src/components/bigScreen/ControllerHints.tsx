import React from 'react';
import { controllerButtonLabel, type ControllerButtonLayout, type ControllerHintButton } from '../../utils/controllerLabels';

interface ControllerHintsProps {
  layout: ControllerButtonLayout;
}

const HINTS: Array<{ button: ControllerHintButton | 'shoulders'; label: string }> = [
  { button: 'primary', label: 'Play' },
  { button: 'back', label: 'Back' },
  { button: 'context', label: 'Options' },
  { button: 'secondary', label: 'Favorite' },
  { button: 'share', label: 'Search' },
  { button: 'options', label: 'Menu' },
  { button: 'shoulders', label: 'Category' },
];

export const ControllerHints: React.FC<ControllerHintsProps> = ({ layout }) => {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-lg text-slate-100">
      {HINTS.map((hint) => {
        const name = hint.button === 'shoulders'
          ? `${controllerButtonLabel(layout, 'shoulderLeft')}/${controllerButtonLabel(layout, 'shoulderRight')}`
          : controllerButtonLabel(layout, hint.button);
        return (
          <span key={hint.label} className="inline-flex items-center gap-2">
            <span className="rounded-full bg-white/15 px-3 py-1 text-base font-semibold tracking-wide">{name}</span>
            <span className="text-slate-200">{hint.label}</span>
          </span>
        );
      })}
    </div>
  );
};
