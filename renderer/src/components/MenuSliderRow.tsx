import React, { useMemo, useState } from 'react';

interface InfoHintButtonProps {
  description: string;
}

export const InfoHintButton: React.FC<InfoHintButtonProps> = ({ description }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setIsOpen((current) => !current);
        }}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-white/20 text-[10px] font-semibold text-gray-300 transition-colors hover:border-white/35 hover:text-white"
        aria-label={description}
      >
        ?
      </button>
      {isOpen && (
        <div className="absolute left-1/2 top-[calc(100%+8px)] z-30 w-56 -translate-x-1/2 rounded-lg border border-white/10 bg-slate-900/92 px-3 py-2 text-[11px] leading-4 text-slate-100 shadow-2xl backdrop-blur-xl">
          {description}
        </div>
      )}
    </div>
  );
};

interface MenuSliderRowProps {
  label: string;
  description?: string;
  descriptionDisplay?: 'inline' | 'icon' | 'hidden';
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
  description,
  descriptionDisplay = 'inline',
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
  sliderClassName = 'h-1',
  disabled = false,
  epsilon = 0.001,
}) => {
  const displayValue = formatValue ? formatValue(value) : String(value);
  const effectiveMinLabel = minLabel ?? String(min);
  const effectiveMaxLabel = maxLabel ?? String(max);
  const isDirty = Math.abs(value - defaultValue) > epsilon;
  const sliderPercent = useMemo(() => {
    if (max <= min) return 0;
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }, [max, min, value]);

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-300 font-semibold">{label} ({displayValue})</label>
          {description && descriptionDisplay === 'icon' && (
            <InfoHintButton description={description} />
          )}
        </div>
        <div className="flex min-w-[52px] justify-end">
          {onReset && (
            <button
              onClick={onReset}
              className={`px-2 py-0.5 text-xs rounded bg-gray-600 hover:bg-gray-500 text-gray-300 border border-gray-500 transition-colors ${isDirty ? 'visible' : 'invisible pointer-events-none'}`}
            >
              Reset
            </button>
          )}
        </div>
      </div>
      {description && descriptionDisplay === 'inline' && (
        <p className="mb-2 text-[11px] leading-4 text-gray-300/90">{description}</p>
      )}
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
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(59,130,246,0.95) 0%, rgba(59,130,246,0.95) ${sliderPercent}%, rgba(255,255,255,0.18) ${sliderPercent}%, rgba(255,255,255,0.18) 100%)`,
            backgroundSize: '100% 2px',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
          }}
          className={`flex-1 ${sliderClassName} bg-white/12 rounded-full appearance-none cursor-pointer slider accent-blue-500 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        />
        <span className="text-xs text-gray-500 w-10 text-right">{effectiveMaxLabel}</span>
      </div>
    </div>
  );
};
