import React, { useState, useRef, useEffect } from 'react';

interface PlatformFilterProps {
  launchers: string[];
  selectedLauncher: string | null;
  onLauncherChange: (launcher: string | null) => void;
}

// Launcher display names mapping
const launcherDisplayNames: Record<string, string> = {
  steam: 'Steam',
  epic: 'Epic Games',
  gog: 'GOG Galaxy',
  xbox: 'Xbox Game Pass',
  ea: 'EA App',
  ubisoft: 'Ubisoft Connect',
  battle: 'Battle.net',
  humble: 'Humble',
  itch: 'itch.io',
  rockstar: 'Rockstar Games',
  other: 'Other',
};

// Get display name for launcher
const getLauncherDisplayName = (launcher: string): string => {
  return launcherDisplayNames[launcher.toLowerCase()] || launcher;
};

export const PlatformFilter: React.FC<PlatformFilterProps> = ({
  launchers,
  selectedLauncher,
  onLauncherChange,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  if (launchers.length === 0) {
    return null;
  }

  const selectedDisplayName = selectedLauncher 
    ? getLauncherDisplayName(selectedLauncher)
    : 'All Launchers';

  return (
    <div className="px-4 py-2 bg-gray-800/50 border-b border-gray-700/50 flex items-center gap-2">
      <span className="text-xs text-gray-400 font-medium">Launcher:</span>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="px-3 py-1.5 bg-gray-700/20 hover:bg-gray-700/40 border border-gray-600/30 rounded text-sm text-gray-300 hover:text-white transition-colors flex items-center gap-2"
        >
          <span>{selectedDisplayName}</span>
          <svg 
            className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isDropdownOpen && (
          <div className="absolute left-0 mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50">
            <div className="p-2">
              <button
                onClick={() => {
                  onLauncherChange(null);
                  setIsDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                  selectedLauncher === null
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                All Launchers
              </button>
              {launchers.map((launcher) => {
                const displayName = getLauncherDisplayName(launcher);
                const isSelected = selectedLauncher === launcher;
                return (
                  <button
                    key={launcher}
                    onClick={() => {
                      onLauncherChange(isSelected ? null : launcher);
                      setIsDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {displayName}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
