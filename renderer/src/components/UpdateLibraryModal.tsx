import React, { useState, useEffect } from 'react';

interface AppConfig {
  id: string;
  name: string;
  enabled: boolean;
  path: string;
  defaultPaths: string[];
  placeholder: string;
}

interface UpdateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
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
];

// Helper to check if a path exists
const findExistingPath = async (defaultPaths: string[]): Promise<string> => {
  return defaultPaths[0] || '';
};

export const UpdateLibraryModal: React.FC<UpdateLibraryModalProps> = ({
  isOpen,
  onClose,
  onShowImportModal,
}) => {
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [scanningApps, setScanningApps] = useState<Set<string>>(new Set());
  const [scanResults, setScanResults] = useState<Map<string, { success: boolean; gamesFound?: number; error?: string }>>(new Map());

  useEffect(() => {
    if (isOpen) {
      loadAppConfigs();
      setScanResults(new Map());
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
    } catch (err) {
      console.error('Error loading app configs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRescanApp = async (appId: string) => {
    const app = apps.find(a => a.id === appId);
    if (!app || !app.enabled || !app.path) {
      return;
    }

    setScanningApps(prev => new Set(prev).add(appId));
    setScanResults(prev => {
      const newMap = new Map(prev);
      newMap.delete(appId);
      return newMap;
    });

    try {
      if (appId === 'steam') {
        // Use existing Steam scan functionality (don't auto-merge)
        const result = await window.electronAPI.scanGamesWithPath(app.path, false);
        if (result.success) {
          if (result.games && result.games.length > 0) {
            // Show import modal with scanned games
            if (onShowImportModal) {
              onShowImportModal(result.games, 'steam');
            }
            
            setScanResults(prev => {
              const newMap = new Map(prev);
              newMap.set(appId, { 
                success: true, 
                gamesFound: result.games.length 
              });
              return newMap;
            });
          } else {
            setScanResults(prev => {
              const newMap = new Map(prev);
              newMap.set(appId, { 
                success: true, 
                gamesFound: 0 
              });
              return newMap;
            });
          }
        } else {
          setScanResults(prev => {
            const newMap = new Map(prev);
            newMap.set(appId, { success: false, error: result.error || 'Failed to scan' });
            return newMap;
          });
        }
      } else if (appId === 'xbox') {
        // Scan Xbox Game Pass games (don't auto-merge)
        const result = await window.electronAPI.scanXboxGames(app.path, false);
        if (result.success) {
          if (result.games && result.games.length > 0) {
            // Show import modal with scanned games
            if (onShowImportModal) {
              onShowImportModal(result.games, 'xbox');
            }
            
            setScanResults(prev => {
              const newMap = new Map(prev);
              newMap.set(appId, { 
                success: true, 
                gamesFound: result.games.length 
              });
              return newMap;
            });
          } else {
            setScanResults(prev => {
              const newMap = new Map(prev);
              newMap.set(appId, { 
                success: true, 
                gamesFound: 0 
              });
              return newMap;
            });
          }
        } else {
          setScanResults(prev => {
            const newMap = new Map(prev);
            newMap.set(appId, { success: false, error: result.error || 'Failed to scan' });
            return newMap;
          });
        }
      } else {
        // For other launchers (Epic, EA, GOG, Ubisoft, Battle.net), scan for executables
        try {
          const executables = await window.electronAPI.scanFolderForExecutables(app.path);
          
          if (executables && executables.length > 0) {
            // Convert executables to game format compatible with import modal
            const games = executables.map((exe, index) => {
              // Extract game name from executable filename (remove .exe extension)
              const gameName = exe.fileName.replace(/\.exe$/i, '').trim();
              // Create a unique ID based on the executable path (use btoa for base64 encoding in browser)
              const pathHash = btoa(exe.fullPath).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
              const gameId = `${appId}-${pathHash}`;
              
              return {
                id: gameId,
                name: gameName,
                installPath: exe.fullPath,
                exePath: exe.fullPath,
                type: appId,
              };
            });
            
            // Show import modal with scanned games
            if (onShowImportModal) {
              onShowImportModal(games, 'other');
            }
            
            setScanResults(prev => {
              const newMap = new Map(prev);
              newMap.set(appId, { 
                success: true, 
                gamesFound: games.length 
              });
              return newMap;
            });
          } else {
            setScanResults(prev => {
              const newMap = new Map(prev);
              newMap.set(appId, { 
                success: true, 
                gamesFound: 0 
              });
              return newMap;
            });
          }
        } catch (err) {
          setScanResults(prev => {
            const newMap = new Map(prev);
            newMap.set(appId, { 
              success: false, 
              error: err instanceof Error ? err.message : 'Failed to scan games' 
            });
            return newMap;
          });
        }
      }
    } catch (err) {
      setScanResults(prev => {
        const newMap = new Map(prev);
        newMap.set(appId, { success: false, error: err instanceof Error ? err.message : 'Unknown error' });
        return newMap;
      });
    } finally {
      setScanningApps(prev => {
        const newSet = new Set(prev);
        newSet.delete(appId);
        return newSet;
      });
    }
  };

  const handleRescanAll = async () => {
    const enabledApps = apps.filter(app => app.enabled && app.path);
    
    for (const app of enabledApps) {
      await handleRescanApp(app.id);
    }
  };

  const enabledApps = apps.filter(app => app.enabled && app.path);

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
          className="bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] border border-gray-700 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">Update Library</h2>
              <p className="text-sm text-gray-400 mt-1">
                Rescan configured launchers to find new games
              </p>
            </div>
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
          <div className="p-6 space-y-4 overflow-y-auto flex-1">
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-300">Loading app configurations...</p>
              </div>
            ) : enabledApps.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-300 mb-2">No apps configured</p>
                <p className="text-gray-400 text-sm">Configure apps in settings to enable library updates</p>
              </div>
            ) : (
              <>
                {/* Rescan All Button */}
                <div className="flex justify-end mb-4">
                  <button
                    onClick={handleRescanAll}
                    disabled={scanningApps.size > 0}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {scanningApps.size > 0 ? (
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
                        Rescan All
                      </>
                    )}
                  </button>
                </div>

                {/* App List - Two Row Grid */}
                <div className="grid grid-cols-2 gap-3">
                  {enabledApps.map((app) => {
                    const isScanning = scanningApps.has(app.id);
                    const result = scanResults.get(app.id);

                    return (
                      <div
                        key={app.id}
                        className="bg-gray-700/50 rounded-lg border border-gray-600 p-5 min-h-[120px]"
                      >
                        <div className="flex flex-col h-full">
                          <div className="flex-1 mb-3">
                            <h3 className="text-sm font-semibold text-white mb-2">
                              {app.name}
                            </h3>
                            <p className="text-xs text-gray-400 break-words mb-2" title={app.path}>
                              {app.path}
                            </p>
                            {result && (
                              <div className="mt-2">
                                {result.success ? (
                                  <p className="text-xs text-green-400">
                                    ✓ Scan complete
                                    {result.gamesFound !== undefined && result.gamesFound > 0 && ` • ${result.gamesFound} new ${result.gamesFound === 1 ? 'game' : 'games'} found`}
                                    {result.gamesFound === 0 && ' • Library up to date'}
                                  </p>
                                ) : (
                                  <p className="text-xs text-red-400">
                                    ✗ {result.error || 'Scan failed'}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleRescanApp(app.id)}
                            disabled={isScanning}
                            className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                          >
                            {isScanning ? (
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
                                Rescan
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
