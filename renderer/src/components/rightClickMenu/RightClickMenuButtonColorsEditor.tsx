export const DEFAULT_BUTTON_COLORS = {
  playColor: '#0ea5e9',
  editColor: '#6b7280',
  modManagerColor: '#a855f7',
} as const;

export type ButtonColors = {
  playColor?: string;
  editColor?: string;
  modManagerColor?: string;
};

export function resolveButtonColors(
  colors?: ButtonColors,
  defaults: ButtonColors = DEFAULT_BUTTON_COLORS,
): Required<ButtonColors> {
  const d = { ...DEFAULT_BUTTON_COLORS, ...defaults };
  return {
    playColor: colors?.playColor ?? d.playColor ?? DEFAULT_BUTTON_COLORS.playColor,
    editColor: colors?.editColor ?? d.editColor ?? DEFAULT_BUTTON_COLORS.editColor,
    modManagerColor: colors?.modManagerColor ?? d.modManagerColor ?? DEFAULT_BUTTON_COLORS.modManagerColor,
  };
}

export interface RightClickMenuButtonColorsEditorProps {
  title: string;
  colors?: ButtonColors;
  onChange?: (colors: ButtonColors) => void;
  onReset?: () => void;
  containerClassName?: string;
  defaultColors?: ButtonColors;
}

export function RightClickMenuButtonColorsEditor({
  title,
  colors,
  onChange,
  onReset,
  containerClassName = 'px-3 py-2 bg-gray-700/30 rounded-md',
  defaultColors = DEFAULT_BUTTON_COLORS,
}: RightClickMenuButtonColorsEditorProps) {
  const resolved = resolveButtonColors(colors, defaultColors);
  const colorItems: Array<{
    key: keyof ButtonColors;
    label: string;
    title: string;
  }> = [
    { key: 'playColor', label: 'Play', title: 'Play button color' },
    { key: 'editColor', label: 'Edit', title: 'Edit button color' },
    { key: 'modManagerColor', label: 'Mod Manager', title: 'Mod Manager button color' },
  ];

  return (
    <div className={containerClassName}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <label className="block text-sm text-white font-semibold">{title}</label>
          <p className="text-[11px] text-gray-400 mt-0.5">Choose per-button colors for this view.</p>
        </div>
        {onReset && (
          <button
            onClick={onReset}
            className="px-2.5 py-1.5 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-500 transition-colors"
            title="Reset to defaults"
          >
            Reset
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {colorItems.map((item) => (
          <div key={item.key} className="min-w-0 rounded-lg border border-gray-600 bg-gray-900/70 p-3">
            <div className="mb-2 text-center text-xs font-medium leading-tight text-gray-200">
              {item.label}
            </div>
            <input
              type="color"
              value={resolved[item.key]}
              onChange={(e) =>
                onChange?.({
                  ...resolved,
                  [item.key]: e.target.value,
                })
              }
              className="color-chip-input w-full h-12 rounded-md cursor-pointer bg-transparent"
              title={item.title}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
