import React from 'react';
import iconPng from '../../../../resources/icon.png';
import iconSvg from '../../../../resources/icon.svg';

export interface SettingsTab {
    id: string;
    label: string;
    icon: JSX.Element;
    danger?: boolean; // For "Reset" tab type styling
}

interface SettingsSidebarProps {
    tabs: SettingsTab[];
    activeTab: string;
    onTabChange: (id: string) => void;
    onClose: () => void;
    appVersion?: string;
}

export const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
    tabs,
    activeTab,
    onTabChange,
    onClose,
    appVersion = '0.0.0'
}) => {
    return (
        <div className="w-64 flex flex-col bg-gray-900 border-r border-gray-700/50 flex-shrink-0">
            {/* Header */}
            <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                <img
                    src={iconPng}
                    alt="Onyx"
                    className="w-8 h-8 drop-shadow-lg"
                    onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = iconSvg;
                    }}
                />
                <div>
                    <h2 className="text-lg font-bold text-white leading-tight">Settings</h2>
                    <p className="text-xs text-gray-500 font-medium">v{appVersion}</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => onTabChange(tab.id)}
                            className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                                    ? 'bg-blue-600/10 text-blue-400 ring-1 ring-blue-500/20'
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                                }
                ${tab.danger && !isActive ? 'text-red-400 hover:text-red-300 hover:bg-red-900/10' : ''}
                ${tab.danger && isActive ? 'bg-red-900/10 text-red-400 ring-red-500/20' : ''}
              `}
                        >
                            <div className={`${isActive ? 'text-blue-400' : 'text-gray-500'} ${tab.danger ? 'text-red-500' : ''} transition-colors`}>
                                {tab.icon}
                            </div>
                            {tab.label}
                        </button>
                    );
                })}
            </nav>


        </div>
    );
};
