import React, { useState, useEffect } from 'react';

interface AppConfig {
  id: string;
  name: string;
  enabled: boolean;
  path: string;
  defaultPaths: string[];
  placeholder: string;
}

interface ScannedGame {
  id: string;
  name: string;
  appId?: string;
  installPath?: string;
  exePath?: string;
  type?: string;
  source?: string; // Which launcher it came from
}

interface UpdateLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
  onShowImportModal?: (games: Array<any>, appType?: 'steam' | 'xbox' | 'other') => void;
}

type ModalMode = 'wizard' | 'scan' | 'results';

export const UpdateLibraryModal: React.FC<UpdateLibraryModalProps> = ({
  isOpen,
  onClose,
  onShowImportModal,
}) => {
  const [mode, setMode] = useState<ModalMode>('wizard');
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ current: 0, total: 0, currentApp: '' });
  const [newGames, setNewGames] = useState<ScannedGame[]>([]);
  const [selectedGames, setSelectedGames] = useState<Set<string>>(new Set());
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionResults, setDetectionResults] = useState<Map<string, { detected: boolean; path: string }>>(new Map());

  useEffect(() => {
    if (isOpen) {
      loadAppConfigs();
      checkIfWizardNeeded();
    }
  }, [isOpen]);

  const checkIfWizardNeeded = async () => {
    try {
      const configs = await window.electronAPI.getAppConfigs();
      const hasConfiguredApps = Object.values(configs).some((config: any) => config.enabled && config.path);
      
      if (!hasConfiguredApps) {
        setMode('wizard');
      } else {
        setMode('scan');
      }
    } catch (err) {
      console.error('Error checking wizard status:', err);
      setMode('scan');
    }
  };

  const loadAppConfigs = async () => {
    try {
      const savedConfigs = await window.electronAPI.getAppConfigs();
      const defaultApps = getDefaultApps();
      
      const initializedApps: AppConfig[] = defaultApps.map((app) => {
        const savedConfig = savedConfigs[app.id];
        return {
          ...app,
          enabled: savedConfig?.enabled || false,
          path: savedConfig?.path || app.defaultPaths[0] || '',
        };
      });

      setApps(initializedApps);
    } catch (err) {
      console.error('Error loading app configs:', err);
    }
  };

  const getDefaultApps = (): Omit<AppConfig, 'enabled' | 'path'>[] => {
    return [
      { id: 'steam', name: 'Steam', defaultPaths: ['C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam'], placeholder: 'C:\\Program Files (x86)\\Steam' },
      { id: 'epic', name: 'Epic Games', defaultPaths: ['C:\\Program Files\\Epic Games', 'C:\\Program Files (x86)\\Epic Games'], placeholder: 'C:\\Program Files\\Epic Games' },
      { id: 'gog', name: 'GOG Galaxy', defaultPaths: ['C:\\Program Files (x86)\\GOG Galaxy', 'C:\\Program Files\\GOG Galaxy'], placeholder: 'C:\\Program Files (x86)\\GOG Galaxy' },
      { id: 'xbox', name: 'Xbox Game Pass', defaultPaths: ['C:\\XboxGames', 'C:\\Program Files\\WindowsApps'], placeholder: 'C:\\XboxGames' },
      { id: 'ea', name: 'EA App', defaultPaths: ['C:\\Program Files\\EA Games', 'C:\\Program Files (x86)\\EA Games'], placeholder: 'C:\\Program Files\\EA Games' },
    ];
  };

  const handleAutoDetect = async () => {
    setIsDetecting(true);
    try {
      const detected = await window.electronAPI.detectLaunchers();
      const results = new Map<string, { detected: boolean; path: string }>();
      
      detected.forEach((launcher) => {
        results.set(launcher.id, {
          detected: launcher.detected,
          path: launcher.path,
        });
      });

      setDetectionResults(results);

      // Update apps with detected paths
      setApps(prevApps => prevApps.map(app => {
        const detected = results.get(app.id);
        if (detected && detected.detected) {
          return {
            ...app,
            path: detected.path,
            enabled: true,
          };
        }
        return app;
      }));
    } catch (err) {
      console.error('Error detecting launchers:', err);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleOneClickScan = async () => {
    const enabledApps = apps.filter(app => app.enabled && app.path);
    if (enabledApps.length === 0) {
      return;
    }

    setIsScanning(true);
    setScanProgress({ current: 0, total: enabledApps.length, currentApp: '' });
    setNewGames([]);
    setSelectedGames(new Set());

    const allScannedGames: ScannedGame[] = [];

    try {
      for (let i = 0; i < enabledApps.length; i++) {
        const app = enabledApps[i];
        setScanProgress({
          current: i + 1,
          total: enabledApps.length,
          currentApp: app.name,
        });

        try {
          let games: ScannedGame[] = [];

          if (app.id === 'steam') {
            const result = await window.electronAPI.scanGamesWithPath(app.path, false);
            if (result.success && result.games) {
              games = result.games.map((g: any) => ({
                id: `steam-${g.appId}`,
                name: g.name,
                appId: g.appId,
                installPath: g.installDir,
                source: 'steam',
              }));
            }
          } else if (app.id === 'xbox') {
            const result = await window.electronAPI.scanXboxGames(app.path, false);
            if (result.success && result.games) {
              games = result.games.map((g: any) => ({
                id: g.id,
                name: g.name,
                installPath: g.installPath,
                source: 'xbox',
              }));
            }
          } else {
            const executables = await window.electronAPI.scanFolderForExecutables(app.path);
            if (executables && executables.length > 0) {
              games = executables.map((exe: any) => {
                const gameName = exe.fileName.replace(/\.exe$/i, '').trim();
                let hash = 0;
                const pathStr = exe.fullPath.toLowerCase();
                for (let i = 0; i < pathStr.length; i++) {
                  const char = pathStr.charCodeAt(i);
                  hash = ((hash << 5) - hash) + char;
                  hash = hash & hash;
                }
                const pathHash = Math.abs(hash).toString(36);
                return {
                  id: `${app.id}-${pathHash}`,
                  name: gameName,
                  exePath: exe.fullPath,
                  installPath: exe.fullPath,
                  source: app.id,
                };
              });
            }
          }

          allScannedGames.push(...games);
        } catch (err) {
          console.error(`Error scanning ${app.name}:`, err);
        }
      }

      // Check which games are new (not in existing library)
      const existingLibrary = await window.electronAPI.getLibrary();
      const existingGameIds = new Set(existingLibrary.map(g => g.id));
      
      const newGamesList = allScannedGames.filter(game => !existingGameIds.has(game.id));
      
      setNewGames(newGamesList);
      setSelectedGames(new Set(newGamesList.map(g => g.id))); // Select all by default
      
      if (newGamesList.length > 0) {
        setMode('results');
      } else {
        setIsScanning(false);
        // Show message that no new games were found
      }
    } catch (err) {
      console.error('Error during scan:', err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleImportSelected = async () => {
    const gamesToImport = newGames.filter(game => selectedGames.has(game.id));
    
    if (gamesToImport.length === 0) {
      return;
    }

    // Group games by source
    const gamesBySource = new Map<string, ScannedGame[]>();
    gamesToImport.forEach(game => {
      const source = game.source || 'other';
      if (!gamesBySource.has(source)) {
        gamesBySource.set(source, []);
      }
      gamesBySource.get(source)!.push(game);
    });

    // Show import modal for each source
    for (const [source, games] of gamesBySource) {
      const appType = source === 'steam' ? 'steam' : source === 'xbox' ? 'xbox' : 'other';
      if (onShowImportModal) {
        onShowImportModal(games, appType);
      }
    }

    onClose();
  };

  const toggleGameSelection = (gameId: string) => {
    setSelectedGames(prev => {
      const newSet = new Set(prev);
      if (newSet.has(gameId)) {
        newSet.delete(gameId);
      } else {
        newSet.add(gameId);
      }
      return newSet;
    });
  };

  const toggleAllGames = () => {
    if (selectedGames.size === newGames.length) {
      setSelectedGames(new Set());
    } else {
      setSelectedGames(new Set(newGames.map(g => g.id)));
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <div 
          className="bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] border border-gray-700 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-white">
                {mode === 'wizard' ? 'Welcome! Let\'s Set Up Your Libraries' : 
                 mode === 'scan' ? 'Update Library' : 
                 'New Games Found'}
              </h2>
              <p className="text-sm text-gray-400 mt-1">
                {mode === 'wizard' ? 'We\'ll help you find and configure your game launchers' :
                 mode === 'scan' ? 'Scan all enabled libraries for new games' :
                 `Found ${newGames.length} new ${newGames.length === 1 ? 'game' : 'games'}`}
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
            {mode === 'wizard' && (
              <div className="space-y-6">
                <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Auto-Detect Launchers</h3>
                  <p className="text-sm text-gray-300 mb-4">
                    We can automatically detect installed game launchers on your system. 
                    Click the button below to scan for Steam, Epic Games, GOG Galaxy, and more.
                  </p>
                  <button
                    onClick={handleAutoDetect}
                    disabled={isDetecting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isDetecting ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Detecting...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        Auto-Detect Launchers
                      </>
                    )}
                  </button>
                </div>

                {detectionResults.size > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-md font-semibold text-white">Detection Results</h3>
                    {apps.map(app => {
                      const result = detectionResults.get(app.id);
                      return (
                        <div key={app.id} className="bg-gray-700/50 rounded-lg p-3 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {result?.detected ? (
                              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            )}
                            <div>
                              <p className="text-sm font-medium text-white">{app.name}</p>
                              {result?.detected && (
                                <p className="text-xs text-gray-400">{result.path}</p>
                              )}
                            </div>
                          </div>
                          {result?.detected && (
                            <span className="text-xs text-green-400 font-medium">Detected</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setMode('scan')}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                  >
                    Skip Setup
                  </button>
                  {detectionResults.size > 0 && (
                    <button
                      onClick={() => {
                        // Save detected configs
                        const configs = apps
                          .filter(app => detectionResults.get(app.id)?.detected)
                          .map(app => ({
                            id: app.id,
                            name: app.name,
                            enabled: true,
                            path: detectionResults.get(app.id)!.path,
                          }));
                        
                        Promise.all(configs.map(config => 
                          window.electronAPI.saveAppConfig(config)
                        )).then(() => {
                          setMode('scan');
                        });
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                    >
                      Continue to Scan
                    </button>
                  )}
                </div>
              </div>
            )}

            {mode === 'scan' && (
              <div className="space-y-6">
                {isScanning ? (
                  <div className="space-y-4">
                    <div className="bg-gray-700/50 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-white">
                          Scanning {scanProgress.currentApp}...
                        </span>
                        <span className="text-sm text-gray-400">
                          {scanProgress.current} / {scanProgress.total}
                        </span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-blue-600 h-full transition-all duration-300"
                          style={{ width: `${(scanProgress.current / scanProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-700 rounded-lg p-6">
                      <h3 className="text-lg font-semibold text-white mb-2">One-Click Scan</h3>
                      <p className="text-sm text-gray-300 mb-4">
                        Scan all enabled libraries at once. New games will be shown in a summary for you to review.
                      </p>
                      <button
                        onClick={handleOneClickScan}
                        className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Scan All Libraries
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {mode === 'results' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">New Games Found</h3>
                    <p className="text-sm text-gray-400">
                      {selectedGames.size} of {newGames.length} selected
                    </p>
                  </div>
                  <button
                    onClick={toggleAllGames}
                    className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    {selectedGames.size === newGames.length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="bg-gray-700/50 rounded-lg border border-gray-600 max-h-96 overflow-y-auto">
                  <div className="divide-y divide-gray-600">
                    {newGames.map((game) => (
                      <label
                        key={game.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-600/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGames.has(game.id)}
                          onChange={() => toggleGameSelection(game.id)}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-white">{game.name}</p>
                          <p className="text-xs text-gray-400">
                            {game.source ? game.source.charAt(0).toUpperCase() + game.source.slice(1) : 'Other'}
                            {game.installPath && ` • ${game.installPath}`}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => {
                      setMode('scan');
                      setNewGames([]);
                      setSelectedGames(new Set());
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportSelected}
                    disabled={selectedGames.size === 0}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import {selectedGames.size} {selectedGames.size === 1 ? 'Game' : 'Games'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
