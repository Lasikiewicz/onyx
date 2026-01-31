import React, { ReactNode } from 'react';

// --- Setting Section ---
interface SettingsSectionProps {
    title: string;
    description?: string;
    children: ReactNode;
    className?: string;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({
    title,
    description,
    children,
    className = ''
}) => {
    return (
        <div className={`space-y-4 mb-6 ${className}`}>
            <div className="border-b border-gray-700/50 pb-2">
                <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
                {description && <p className="text-gray-400 text-xs mt-1">{description}</p>}
            </div>
            <div className="space-y-3">
                {children}
            </div>
        </div>
    );
};

// --- Setting Card ---
interface SettingsCardProps {
    children: ReactNode;
    className?: string;
    onClick?: () => void;
}

export const SettingsCard: React.FC<SettingsCardProps> = ({
    children,
    className = '',
    onClick
}) => {
    return (
        <div
            className={`
        bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 
        transition-all duration-200
        ${onClick ? 'hover:bg-gray-700/40 hover:border-gray-600/50 cursor-pointer active:scale-[0.99]' : ''}
        ${className}
      `}
            onClick={onClick}
        >
            {children}
        </div>
    );
};

// --- Setting Toggle ---
interface SettingsToggleProps {
    label: string;
    description?: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}

export const SettingsToggle: React.FC<SettingsToggleProps> = ({
    label,
    description,
    checked,
    onChange,
    disabled = false
}) => {
    return (
        <SettingsCard className={`flex items-center justify-between py-2 px-3 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex-1 pr-4">
                <label className="text-gray-200 text-sm font-medium block mb-1">
                    {label}
                </label>
                {description && (
                    <p className="text-gray-400 text-xs leading-relaxed">
                        {description}
                    </p>
                )}
            </div>
            <button
                onClick={() => onChange(!checked)}
                disabled={disabled}
                className={`
          relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50
          ${checked ? 'bg-blue-600' : 'bg-gray-600'}
        `}
            >
                <span
                    className={`
            inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm
            ${checked ? 'translate-x-[18px]' : 'translate-x-[3px]'}
          `}
                />
            </button>
        </SettingsCard>
    );
};

// --- Setting Input ---
interface SettingsInputProps {
    label: string;
    description?: string;
    value: string | number;
    onChange: (value: string) => void;
    type?: 'text' | 'number' | 'password';
    placeholder?: string;
    suffix?: string;
    disabled?: boolean;
}

export const SettingsInput: React.FC<SettingsInputProps> = ({
    label,
    description,
    value,
    onChange,
    type = 'text',
    placeholder,
    suffix,
    disabled = false
}) => {
    return (
        <SettingsCard className={`space-y-2 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div>
                <label className="text-gray-200 text-sm font-medium block mb-0.5">
                    {label}
                </label>
                {description && (
                    <p className="text-gray-400 text-xs">
                        {description}
                    </p>
                )}
            </div>
            <div className="flex items-center gap-3">
                <input
                    type={type}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    disabled={disabled}
                    className="
            flex-1 px-2.5 py-1.5 bg-gray-900/80 border border-gray-600 rounded text-sm text-white 
            placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500
            transition-all
          "
                />
                {suffix && (
                    <span className="text-gray-400 text-xs font-medium">
                        {suffix}
                    </span>
                )}
            </div>
        </SettingsCard>
    );
};
