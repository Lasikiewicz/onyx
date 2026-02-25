import React from 'react';

interface ButtonColorEditorProps {
  title: string;
  colors?: { playColor?: string; editColor?: string; modManagerColor?: string };
  onChange?: (colors: { playColor?: string; editColor?: string; modManagerColor?: string }) => void;
  onReset?: () => void;
  containerClassName?: string;
}

export const ButtonColorEditor: React.FC<ButtonColorEditorProps> = ({
  title,
  colors,
  onChange,
  onReset,
  containerClassName = 'px-3 py-2 bg-gray-700/30 rounded-md',
}) => {
  const defaultButtonColors = {
    playColor: '#0ea5e9',
    editColor: '#6b7280',
    modManagerColor: '#a855f7',
  };

  const resolveButtonColors = (colors?: { playColor?: string; editColor?: string; modManagerColor?: string }) => ({
    playColor: colors?.playColor || defaultButtonColors.playColor,
    editColor: colors?.editColor || defaultButtonColors.editColor,
    modManagerColor: colors?.modManagerColor || defaultButtonColors.modManagerColor,
  });

  const resolvedColors = resolveButtonColors(colors);
  const colorItems: Array<{
    key: 'playColor' | 'editColor' | 'modManagerColor';
    label: string;
    title: string;
  }> = [
      { key: 'playColor', label: 'Play', title: 'Play button color' },
      { key: 'editColor', label: 'Edit', title: 'Edit button color' },
      { key: 'modManagerColor', label: 'Mod Mgr', title: 'Mod Manager button color' },
    ];

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-xs text-gray-400 font-semibold">{title}</label>
        {onReset && (
          <button
            onClick={onReset}
            className="px-2 py-1 text-xs rounded bg-gray-600 hover:bg-gray-500 text-gray-300 border border-gray-500 transition-colors"
            title="Reset to defaults"
          >
            Reset
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        {colorItems.map((item) => (
          <div key={item.key} className="flex-1 min-w-0 flex items-center justify-between gap-2">
            <div className="text-[11px] text-gray-300">{item.label}</div>
            <input
              type="color"
              value={resolvedColors[item.key]}
              onChange={(e) => onChange?.({
                ...resolvedColors,
                [item.key]: e.target.value,
              })}
              className="color-chip-input w-7 h-5 rounded cursor-pointer"
              title={item.title}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
