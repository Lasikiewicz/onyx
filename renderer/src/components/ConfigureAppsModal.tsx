import React, { useState, useEffect } from 'react';

interface AppConfig {
  id: string;
  name: string;
  enabled: boolean;
  path: string;
  defaultPaths: string[];
  placeholder: string;
}

interface ConfigureAppsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  onScan?: (appId: string) => Promise<void>;
  onShowImportModal?: (games: Array<any>, appType?: 'steam' | 'xbox' | 'other') => void;
}

// Default game install locations for Windows
const getDefaultPaths = (appId: string): string[] => {
  const paths: Record<string, string[]> = {
    steam: [
      'C:\\Program Files (x86)\\Steam',
      'C:\\Program Files\\Steam',
    ],
    epic: [
      'C:\\Program Files\\Epic Games',
      'C:\\Program Files (x86)\\Epic Games',
    ],
    ea: [
      'C:\\Program Files\\EA Games',
      'C:\\Program Files (x86)\\EA Games',
      'C:\\Program Files\\Electronic Arts',
    ],
    gog: [
      'C:\\Program Files (x86)\\GOG Galaxy',
      'C:\\Program Files\\GOG Galaxy',
    ],
    ubisoft: [
      'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher',
      'C:\\Program Files\\Ubisoft\\Ubisoft Game Launcher',
    ],
    battle: [
      'C:\\Program Files (x86)\\Battle.net',
      'C:\\Program Files\\Battle.net',
    ],
    xbox: [
      'C:\\XboxGames',
      'C:\\Program Files\\WindowsApps',
    ],
    humble: [
      'C:\\Program Files\\Humble App',
      'C:\\Program Files (x86)\\Humble App',
      '%LOCALAPPDATA%\\Humble App',
    ],
    itch: [
      '%LOCALAPPDATA%\\itch',
      'C:\\Program Files\\itch',
      'C:\\Program Files (x86)\\itch',
    ],
    rockstar: [
      'C:\\Program Files\\Rockstar Games',
      'C:\\Program Files (x86)\\Rockstar Games',
      '%USERPROFILE%\\Documents\\Rockstar Games',
    ],
  };
  return paths[appId] || [];
};

const defaultApps: Omit<AppConfig, 'enabled' | 'path'>[] = [
  { id: 'steam', name: 'Steam', defaultPaths: getDefaultPaths('steam'), placeholder: 'C:\\Program Files (x86)\\Steam' },
  { id: 'epic', name: 'Epic Games', defaultPaths: getDefaultPaths('epic'), placeholder: 'C:\\Program Files\\Epic Games' },
  { id: 'ea', name: 'EA App / Origin', defaultPaths: getDefaultPaths('ea'), placeholder: 'C:\\Program Files\\EA Games' },
  { id: 'gog', name: 'GOG Galaxy', defaultPaths: getDefaultPaths('gog'), placeholder: 'C:\\Program Files (x86)\\GOG Galaxy' },
  { id: 'ubisoft', name: 'Ubisoft Connect', defaultPaths: getDefaultPaths('ubisoft'), placeholder: 'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher' },
  { id: 'battle', name: 'Battle.net', defaultPaths: getDefaultPaths('battle'), placeholder: 'C:\\Program Files (x86)\\Battle.net' },
  { id: 'xbox', name: 'Xbox Game Pass', defaultPaths: getDefaultPaths('xbox'), placeholder: 'C:\\XboxGames' },
  { id: 'humble', name: 'Humble', defaultPaths: getDefaultPaths('humble'), placeholder: 'C:\\Program Files\\Humble App' },
  { id: 'itch', name: 'itch.io', defaultPaths: getDefaultPaths('itch'), placeholder: '%LOCALAPPDATA%\\itch' },
  { id: 'rockstar', name: 'Rockstar Games', defaultPaths: getDefaultPaths('rockstar'), placeholder: 'C:\\Program Files\\Rockstar Games' },
];

// Helper to check if a path exists (we'll need to add IPC for this, but for now we'll just use the first default)
const findExistingPath = async (defaultPaths: string[]): Promise<string> => {
  // For now, return the first default path
  // In a real implementation, we'd check each path via IPC
  return defaultPaths[0] || '';
};

export const ConfigureAppsModal: React.FC<ConfigureAppsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onScan,
  onShowImportModal,
}) => {
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scanningAppId, setScanningAppId] = useState<string | null>(null);
  const [newlyEnabledApps, setNewlyEnabledApps] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadAppConfigs();
    }
  }, [isOpen]);

  const loadAppConfigs = async () => {
    setIsLoading(true);
    try {
      // Load saved app configs
      const savedConfigs = await window.electronAPI.getAppConfigs();
      
      // Load Steam path if it exists (for backward compatibility)
      let steamPath = '';
      try {
        const path = await window.electronAPI.getSteamPath();
        if (path) steamPath = path;
      } catch (err) {
        // Ignore errors
      }

      // Initialize apps with saved configs or defaults
      const initializedApps: AppConfig[] = await Promise.all(
        defaultApps.map(async (app) => {
          // Check if we have a saved config for this app
          const savedConfig = savedConfigs[app.id];
          
          if (savedConfig) {
            return {
              ...app,
              enabled: savedConfig.enabled,
              path: savedConfig.path || app.defaultPaths[0] || '',
            };
          }

          // Fallback to old Steam path logic for backward compatibility
          let path = '';
          let enabled = false;

          if (app.id === 'steam' && steamPath) {
            path = steamPath;
            enabled = true;
          } else {
            // Try to find existing path for other apps
            const existingPath = await findExistingPath(app.defaultPaths);
            if (existingPath) {
              path = existingPath;
              enabled = false; // Start disabled by default
            } else {
              path = app.defaultPaths[0] || '';
            }
          }

          return {
            ...app,
            enabled,
            path,
          };
        })
      );

      setApps(initializedApps);
      setNewlyEnabledApps(new Set());
    } catch (err) {
      console.error('Error loading app configs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleEnabled = (appId: string) => {
    setApps((prev) => {
      const updated = prev.map((app) => {
        if (app.id === appId) {
          const wasEnabled = app.enabled;
          const nowEnabled = !app.enabled;
          
          // Track newly enabled apps
          if (nowEnabled && !wasEnabled) {
            setNewlyEnabledApps(prevSet => new Set(prevSet).add(appId));
          } else if (!nowEnabled && wasEnabled) {
            setNewlyEnabledApps(prevSet => {
              const newSet = new Set(prevSet);
              newSet.delete(appId);
              return newSet;
            });
          }
          
          return { ...app, enabled: nowEnabled };
        }
        return app;
      });
      return updated;
    });
  };

  const handlePathChange = (appId: string, path: string) => {
    setApps((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, path } : app))
    );
  };

  const handleBrowse = async (appId: string) => {
    try {
      const path = await window.electronAPI.showFolderDialog();
      if (path) {
        handlePathChange(appId, path);
      }
    } catch (err) {
      console.error(`Error browsing for ${appId} path:`, err);
    }
  };

  const handleScanNow = async (appId: string) => {
    const app = apps.find(a => a.id === appId);
    if (!app || !app.enabled || !app.path) {
      return;
    }

    setScanningAppId(appId);
    try {
      if (appId === 'steam') {
        // Scan Steam games (don't auto-merge)
        const result = await window.electronAPI.scanGamesWithPath(app.path, false);
        if (result.success && result.games && result.games.length > 0) {
          // Show import modal with scanned games
          if (onShowImportModal) {
            onShowImportModal(result.games, 'steam');
          }
        } else if (result.success && result.games && result.games.length === 0) {
          // No games found
          console.log('No Steam games found');
        } else {
          console.error('Scan failed:', result.error);
        }
      } else if (appId === 'xbox') {
        // Scan Xbox Game Pass games (don't auto-merge)
        const result = await window.electronAPI.scanXboxGames(app.path, false);
        if (result.success && result.games && result.games.length > 0) {
          // Show import modal with scanned games
          if (onShowImportModal) {
            onShowImportModal(result.games, 'xbox');
          }
        } else if (result.success && result.games && result.games.length === 0) {
          // No games found
          console.log('No Xbox games found');
        } else {
          console.error('Scan failed:', result.error);
        }
      } else if (onScan) {
        await onScan(appId);
      }
      // Remove from newly enabled apps after scanning
      setNewlyEnabledApps(prev => {
        const newSet = new Set(prev);
        newSet.delete(appId);
        return newSet;
      });
    } catch (err) {
      console.error('Error scanning app:', err);
    } finally {
      setScanningAppId(null);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Save all app configs
      const configsToSave = apps.map(app => ({
        id: app.id,
        name: app.name,
        enabled: app.enabled,
        path: app.path,
      }));

      const result = await window.electronAPI.saveAppConfigs(configsToSave);
      
      if (!result.success) {
        console.error('Error saving app configs:', result.error);
        return;
      }

      // Also save Steam path for backward compatibility
      const steamApp = apps.find((app) => app.id === 'steam');
      if (steamApp && steamApp.enabled && steamApp.path) {
        await window.electronAPI.setSteamPath(steamApp.path);
      }

      onSave?.();
      onClose();
    } catch (err) {
      console.error('Error saving paths:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal - Centered on screen */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div 
          className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[85vh] border border-gray-700 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between sticky top-0 bg-gray-800">
            <h2 className="text-xl font-semibold text-white">Configure Apps</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-300">Loading app configurations...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-6">
                {apps.map((app) => (
                  <div key={app.id} className="border border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
                          {app.name}
                        </h3>
                        {/* Enable/Disable Toggle */}
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={app.enabled}
                            onChange={() => handleToggleEnabled(app.id)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                          <span className="ml-3 text-sm text-gray-400">
                            {app.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </label>
                      </div>
                    </div>
                    
                    {app.enabled && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm text-gray-400 mb-2">
                            {app.name} Installation Path
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={app.path}
                              onChange={(e) => handlePathChange(app.id, e.target.value)}
                              placeholder={app.placeholder}
                              className="flex-1 px-4 py-2 bg-gray-700/50 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => handleBrowse(app.id)}
                              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                            >
                              Browse
                            </button>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            Path to your {app.name} installation directory
                          </p>
                        </div>
                        
                        {/* Scan Now button for newly enabled apps */}
                        {newlyEnabledApps.has(app.id) && app.path && (
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => handleScanNow(app.id)}
                              disabled={scanningAppId === app.id}
                              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                              {scanningAppId === app.id ? (
                                <>
                                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Scanning...
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  Scan Now
                                </>
                              )}
                            </button>
                            <p className="text-xs text-gray-400">
                              Scan for games after enabling this launcher
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-700">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
