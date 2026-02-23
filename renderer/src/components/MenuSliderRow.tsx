import React from 'react';

interface MenuSliderRowProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
  defaultValue: number;
  onReset?: () => void;
  formatValue?: (value: number) => string;
  minLabel?: string;
  maxLabel?: string;
  className?: string;
  sliderClassName?: string;
  disabled?: boolean;
  epsilon?: number;
}

export const MenuSliderRow: React.FC<MenuSliderRowProps> = ({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  defaultValue,
  onReset,
  formatValue,
  minLabel,
  maxLabel,
  className = '',
  sliderClassName = 'h-1.5',
  disabled = false,
  epsilon = 0.001,
}) => {
  const displayValue = formatValue ? formatValue(value) : String(value);
  const effectiveMinLabel = minLabel ?? String(min);
  const effectiveMaxLabel = maxLabel ?? String(max);
  const isDirty = Math.abs(value - defaultValue) > epsilon;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs text-gray-400 font-semibold">{label} ({displayValue})</label>
        {isDirty && onReset && (
          <button
            onClick={onReset}
            className="px-2 py-0.5 text-xs rounded bg-gray-600 hover:bg-gray-500 text-gray-300 border border-gray-500 transition-colors"
          >
            Reset
          </button>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 w-10 text-left">{effectiveMinLabel}</span>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={disabled}
          className={`flex-1 ${sliderClassName} bg-gray-700 rounded-lg appearance-none cursor-pointer slider accent-blue-600 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
        <span className="text-xs text-gray-500 w-10 text-right">{effectiveMaxLabel}</span>
      </div>
    </div>
  );
};
