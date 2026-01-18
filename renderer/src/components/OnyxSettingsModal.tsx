import React, { useState, useEffect, useCallback } from 'react';
import iconPng from '../../../resources/icon.png';
import iconSvg from '../../../resources/icon.svg';

interface OnyxSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  initialTab?: 'general' | 'apis' | 'apps' | 'reset' | 'about' | 'appearance';
  onShowImportModal?: (games: Array<any>, appType?: 'steam' | 'xbox' | 'other') => void;
}

interface OnyxSettings {
  minimizeToTray: boolean;
  showSystemTrayIcon: boolean;
  startWithComputer: boolean;
  startClosedToTray: boolean;
  updateLibrariesOnStartup: boolean;
  minimizeOnGameLaunch: boolean;
  hideGameTitles: boolean;
  gameTilePadding: number;
}

type TabType = 'general' | 'apis' | 'apps' | 'reset' | 'about' | 'appearance' | 'folders' | 'suspend';

interface AppConfig {
  id: string;
  name: string;
  enabled: boolean;
  path: string;
  defaultPaths: string[];
  placeholder: string;
  autoAdd?: boolean;
  syncPlaytime?: boolean;
}

interface APICredentials {
  igdbClientId: string;
  igdbClientSecret: string;
  rawgApiKey: string;
  steamGridDBApiKey: string;
}

type APITabType = 'igdb' | 'rawg' | 'steamgriddb';

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

const findExistingPath = async (defaultPaths: string[]): Promise<string> => {
  return defaultPaths[0] || '';
};

export const OnyxSettingsModal: React.FC<OnyxSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTab = 'general',
  onShowImportModal,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [apiCredentials, setApiCredentials] = useState<APICredentials>({
    igdbClientId: '',
    igdbClientSecret: '',
    rawgApiKey: '',
    steamGridDBApiKey: '',
  });
  const [activeAPITab, setActiveAPITab] = useState<APITabType>('igdb');
  const [isLoadingAPI, setIsLoadingAPI] = useState(false);
  const [apiSaveStatus, setApiSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [scanningAppId, setScanningAppId] = useState<string | null>(null);
  const [newlyEnabledApps, setNewlyEnabledApps] = useState<Set<string>>(new Set());
  const [steamAuthState, setSteamAuthState] = useState<{ authenticated: boolean; steamId?: string; username?: string }>({ authenticated: false });
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [manualFolders, setManualFolders] = useState<string[]>([]);
  const [manualFolderConfigs, setManualFolderConfigs] = useState<Record<string, { id: string; name: string; path: string; enabled: boolean; autoCategory?: string[] }>>({});
  // const [isImporting, setIsImporting] = useState(false);
  const [settings, setSettings] = useState<OnyxSettings>({
    minimizeToTray: false,
    showSystemTrayIcon: true,
    startWithComputer: false,
    startClosedToTray: false,
    updateLibrariesOnStartup: false,
    minimizeOnGameLaunch: false,
    hideGameTitles: false,
    gameTilePadding: 16,
  });
  const [showLogoOverBoxart, setShowLogoOverBoxart] = useState(true);
  const [logoPosition, setLogoPosition] = useState<'top' | 'middle' | 'bottom' | 'underneath'>('middle');
  const [appVersion, setAppVersion] = useState<string>('0.0.0');
  // Suspend feature state
  const [suspendFeatureEnabled, setSuspendFeatureEnabled] = useState(false);
  const [runningGames, setRunningGames] = useState<Array<{ gameId: string; title: string; pid: number; status: 'running' | 'suspended'; exePath?: string }>>([]);
  const [isLoadingGames, setIsLoadingGames] = useState(false);
  const [suspendShortcut, setSuspendShortcut] = useState<string>('Ctrl+Shift+S');
  const [isRecordingShortcut, setIsRecordingShortcut] = useState(false);
  const [backgroundScanEnabled, setBackgroundScanEnabled] = useState(false);
  const [backgroundScanIntervalMinutes, setBackgroundScanIntervalMinutes] = useState(30);

  // Load settings and version on mount
  useEffect(() => {
    if (isOpen) {
      const loadSettings = async () => {
        try {
          const prefs = await window.electronAPI.getPreferences();
          setSettings({
            minimizeToTray: prefs.minimizeToTray ?? false,
            showSystemTrayIcon: prefs.showSystemTrayIcon ?? true,
            startWithComputer: prefs.startWithComputer ?? false,
            startClosedToTray: prefs.startClosedToTray ?? false,
            updateLibrariesOnStartup: prefs.updateLibrariesOnStartup ?? false,
            minimizeOnGameLaunch: prefs.minimizeOnGameLaunch ?? false,
            hideGameTitles: prefs.hideGameTitles ?? false,
            gameTilePadding: prefs.gameTilePadding ?? 16,
          });
          setShowLogoOverBoxart(prefs.showLogoOverBoxart ?? true);
          setLogoPosition(prefs.logoPosition ?? 'middle');

          // Load app version
          try {
            const version = await window.electronAPI.getVersion();
            setAppVersion(version);
          } catch (error) {
            console.error('Error loading app version:', error);
          }

          // Load background scan settings
          try {
            const enabled = await window.electronAPI.getBackgroundScanEnabled();
            setBackgroundScanEnabled(enabled);
            const interval = await window.electronAPI.getBackgroundScanIntervalMinutes();
            setBackgroundScanIntervalMinutes(interval);
          } catch (error) {
            console.error('Error loading background scan settings:', error);
          }
        } catch (error) {
          console.error('Error loading Onyx settings:', error);
        }
      };
      loadSettings();
    }
  }, [isOpen]);

  const [apiStatus, setApiStatus] = useState<{
    igdbConfigured: boolean;
    rawgConfigured: boolean;
    steamGridDBConfigured: boolean;
    allRequiredConfigured: boolean;
  }>({
    igdbConfigured: false,
    rawgConfigured: false,
    steamGridDBConfigured: false,
    allRequiredConfigured: false,
  });

  // Load API credentials on mount
  useEffect(() => {
    if (isOpen) {
      const loadAPICredentials = async () => {
        try {
          const creds = await window.electronAPI.getAPICredentials();
          setApiCredentials({
            igdbClientId: creds.igdbClientId || '',
            igdbClientSecret: creds.igdbClientSecret || '',
            rawgApiKey: creds.rawgApiKey || '',
            steamGridDBApiKey: creds.steamGridDBApiKey || '',
          });

          // Check API status
          const igdbConfigured = !!(creds.igdbClientId && creds.igdbClientSecret &&
            creds.igdbClientId.trim() !== '' && creds.igdbClientSecret.trim() !== '');
          const rawgConfigured = !!(creds.rawgApiKey && creds.rawgApiKey.trim() !== '');
          const steamGridDBConfigured = !!(creds.steamGridDBApiKey && creds.steamGridDBApiKey.trim() !== '');

          setApiStatus({
            igdbConfigured,
            rawgConfigured,
            steamGridDBConfigured,
            allRequiredConfigured: igdbConfigured,
          });
        } catch (error) {
          console.error('Error loading API credentials:', error);
        }
      };
      loadAPICredentials();
    }
  }, [isOpen]);

  // Update active tab when initialTab changes
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Load suspend feature state
  useEffect(() => {
    if (isOpen) {
      const loadSuspendFeature = async () => {
        try {
          if (window.electronAPI.suspend?.getFeatureEnabled) {
            const enabled = await window.electronAPI.suspend.getFeatureEnabled();
            setSuspendFeatureEnabled(enabled);
            if (enabled) {
              loadRunningGames();
            }
          }
          if (window.electronAPI.suspend?.getShortcut) {
            const shortcut = await window.electronAPI.suspend.getShortcut();
            setSuspendShortcut(shortcut || 'Ctrl+Shift+S');
          }
        } catch (error) {
          console.error('Error loading suspend feature state:', error);
        }
      };
      loadSuspendFeature();
    }
  }, [isOpen]);

  // Load running games function
  const loadRunningGames = useCallback(async () => {
    if (!suspendFeatureEnabled) return;
    setIsLoadingGames(true);
    try {
      if (window.electronAPI.suspend?.getRunningGames) {
        const games = await window.electronAPI.suspend.getRunningGames();
        setRunningGames(games || []);
      }
    } catch (error) {
      console.error('Error loading running games:', error);
      setRunningGames([]);
    } finally {
      setIsLoadingGames(false);
    }
  }, [suspendFeatureEnabled]);

  // DISABLED: Auto-refresh running games when suspend tab is active (Future Feature)
  // useEffect(() => {
  //   if (activeTab === 'suspend' && suspendFeatureEnabled) {
  //     loadRunningGames();
  //     const interval = setInterval(() => {
  //       loadRunningGames();
  //     }, 5000); // Refresh every 5 seconds
  //     return () => clearInterval(interval);
  //   }
  // }, [activeTab, suspendFeatureEnabled, loadRunningGames]);

  // Load app configs and manual folders on mount
  useEffect(() => {
    if (isOpen) {
      const loadAppConfigs = async () => {
        setIsLoadingApps(true);
        try {
          const savedConfigs = await window.electronAPI.getAppConfigs();

          // Load manual folders
          try {
            const folders = await window.electronAPI.getManualFolders();
            setManualFolders(folders || []);
            // Load manual folder configs with custom names
            if (window.electronAPI.getManualFolderConfigs) {
              const configs = await window.electronAPI.getManualFolderConfigs();
              setManualFolderConfigs(configs || {});
            }
          } catch (err) {
            console.error('Error loading manual folders:', err);
            setManualFolders([]);
            setManualFolderConfigs({});
          }

          let steamPath = '';
          try {
            const path = await window.electronAPI.getSteamPath();
            if (path) steamPath = path;
          } catch (err) {
            // Ignore errors
          }

          const initializedApps: AppConfig[] = await Promise.all(
            defaultApps.map(async (app) => {
              const savedConfig = savedConfigs[app.id];

              if (savedConfig) {
                return {
                  ...app,
                  enabled: savedConfig.enabled,
                  path: savedConfig.path || app.defaultPaths[0] || '',
                  autoAdd: savedConfig.autoAdd || false,
                  syncPlaytime: savedConfig.syncPlaytime || false,
                };
              }

              let path = '';
              let enabled = true; // Enable all apps by default

              if (app.id === 'steam' && steamPath) {
                path = steamPath;
                enabled = true;
              } else {
                const existingPath = await findExistingPath(app.defaultPaths);
                if (existingPath) {
                  path = existingPath;
                  enabled = true; // Enable by default
                } else {
                  path = app.defaultPaths[0] || '';
                  enabled = true; // Enable by default
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
          setIsLoadingApps(false);
        }
      };
      loadAppConfigs();

      // Load Steam auth state
      const loadSteamAuth = async () => {
        try {
          if (window.electronAPI.getSteamAuthState) {
            const authState = await window.electronAPI.getSteamAuthState();
            setSteamAuthState(authState);
          }
        } catch (err) {
          console.error('Error loading Steam auth state:', err);
        }
      };
      loadSteamAuth();
    }
  }, [isOpen]);

  const handleToggle = (key: keyof OnyxSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
  };

  // const handlePaddingChange = (value: number) => {
  //   setSettings({ ...settings, gameTilePadding: value });
  // };

  // const handleRestoreDefaults = () => {
  //   setSettings({
  //     ...settings,
  //     hideGameTitles: false,
  //     gameTilePadding: 16,
  //   });
  // };

  const handleAPIInputChange = (key: keyof APICredentials, value: string) => {
    setApiCredentials((prev) => {
      const updated = { ...prev, [key]: value };

      // Update API status in real-time
      const igdbConfigured = !!(updated.igdbClientId.trim() && updated.igdbClientSecret.trim());
      const rawgConfigured = !!updated.rawgApiKey.trim();
      const steamGridDBConfigured = !!updated.steamGridDBApiKey.trim();

      setApiStatus({
        igdbConfigured,
        rawgConfigured,
        steamGridDBConfigured,
        allRequiredConfigured: igdbConfigured, // Only IGDB is required
      });

      return updated;
    });
    setApiSaveStatus('idle');
  };

  const handleAPISave = async () => {
    setIsLoadingAPI(true);
    setApiSaveStatus('saving');
    try {
      await window.electronAPI.saveAPICredentials({
        igdbClientId: apiCredentials.igdbClientId.trim(),
        igdbClientSecret: apiCredentials.igdbClientSecret.trim(),
        rawgApiKey: apiCredentials.rawgApiKey.trim(),
        steamGridDBApiKey: apiCredentials.steamGridDBApiKey.trim(),
      });
      setApiSaveStatus('success');

      // Update API status after save
      const igdbConfigured = !!(apiCredentials.igdbClientId.trim() && apiCredentials.igdbClientSecret.trim());
      const rawgConfigured = !!apiCredentials.rawgApiKey.trim();
      const steamGridDBConfigured = !!apiCredentials.steamGridDBApiKey.trim();

      setApiStatus({
        igdbConfigured,
        rawgConfigured,
        steamGridDBConfigured,
        allRequiredConfigured: igdbConfigured,
      });

      setTimeout(() => {
        setApiSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error('Error saving API credentials:', error);
      setApiSaveStatus('error');
    } finally {
      setIsLoadingAPI(false);
    }
  };

  const handleOpenIGDB = async () => {
    try {
      await window.electronAPI.openExternal('https://dev.twitch.tv/console/apps/create');
    } catch (error) {
      console.error('Error opening Twitch Developer Console:', error);
    }
  };

  const handleToggleAppEnabled = (appId: string) => {
    setApps((prev) => {
      const updated = prev.map((app) => {
        if (app.id === appId) {
          const wasEnabled = app.enabled;
          const nowEnabled = !app.enabled;

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

  const handleAppPathChange = (appId: string, path: string) => {
    setApps((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, path } : app))
    );
  };

  const handleToggleAutoAdd = (appId: string) => {
    setApps((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, autoAdd: !app.autoAdd } : app))
    );
  };

  const handleToggleSyncPlaytime = (appId: string) => {
    setApps((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, syncPlaytime: !app.syncPlaytime } : app))
    );
  };

  const handleSteamAuthenticate = async () => {
    setIsAuthenticating(true);
    try {
      if (!window.electronAPI.authenticateSteam) return;
      const result = await window.electronAPI.authenticateSteam();
      if (result.success) {
        setSteamAuthState({
          authenticated: true,
          steamId: result.steamId,
          username: result.username,
        });
      } else {
        alert(result.error || 'Failed to authenticate with Steam');
      }
    } catch (err) {
      console.error('Error authenticating with Steam:', err);
      alert('Failed to authenticate with Steam');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
  // const _handleSteamImportAll = async (): Promise<any> => {
  //   const steamApp = apps.find(a => a.id === 'steam');
  //   if (!steamApp || !steamApp.path) {
  //     alert('Please configure Steam path first');
  //     return;
  //   }
  //
  //   // setIsImporting(true);
  //   try {
  //     if (!window.electronAPI.importAllSteamGames) return;
  //     const result = await window.electronAPI.importAllSteamGames(steamApp.path);
  //     if (result.success) {
  //       alert(`Successfully imported ${result.importedCount} Steam games!`);
  //       if (onSave) {
  //         await onSave();
  //       }
  //     } else {
  //       alert(result.error || 'Failed to import Steam games');
  //     }
  //   } catch (err) {
  //     console.error('Error importing Steam games:', err);
  //     alert('Failed to import Steam games');
  //   } finally {
  //     // setIsImporting(false);
  //   }
  // };

  const handleBrowseApp = async (appId: string) => {
    try {
      const path = await window.electronAPI.showFolderDialog();
      if (path) {
        handleAppPathChange(appId, path);
      }
    } catch (err) {
      console.error(`Error browsing for ${appId} path:`, err);
    }
  };

  const handleAddManualFolder = async () => {
    try {
      const path = await window.electronAPI.showFolderDialog();
      if (path) {
        // Check if folder already exists
        const existingConfig = Object.values(manualFolderConfigs).find(c => c.path === path);
        if (existingConfig) {
          alert('This folder is already in the list.');
          return;
        }

        // Create config with default name (folder basename)
        const folderName = path.split(/[/\\]/).pop() || 'Manual Folder';
        // Generate a simple ID from the path
        const pathHash = btoa(path).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
        const folderId = `manual-${pathHash}`;

        const newConfig = {
          id: folderId,
          name: folderName,
          path: path,
          enabled: true,
        };

        // Save config
        if (window.electronAPI.saveManualFolderConfig) {
          const result = await window.electronAPI.saveManualFolderConfig(newConfig);
          if (result && result.success) {
            setManualFolderConfigs({ ...manualFolderConfigs, [folderId]: newConfig });
            const updated = [...manualFolders, path];
            setManualFolders(updated);
          } else {
            alert('Failed to save manual folder. Please try again.');
          }
        } else {
          // Fallback to old method
          const updated = [...manualFolders, path];
          setManualFolders(updated);
          const result = await window.electronAPI.saveManualFolders(updated);
          if (!result || !result.success) {
            alert('Failed to save manual folder. Please try again.');
            setManualFolders(manualFolders);
          }
        }
      }
    } catch (err) {
      console.error('Error adding manual folder:', err);
      alert('Failed to add manual folder: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleRemoveManualFolder = async (folderPath: string) => {
    // Find config by path
    const config = Object.values(manualFolderConfigs).find(c => c.path === folderPath);
    if (config && window.electronAPI.deleteManualFolderConfig) {
      const result = await window.electronAPI.deleteManualFolderConfig(config.id);
      if (result && result.success) {
        const updatedConfigs = { ...manualFolderConfigs };
        delete updatedConfigs[config.id];
        setManualFolderConfigs(updatedConfigs);
        const updated = manualFolders.filter(f => f !== folderPath);
        setManualFolders(updated);
      }
    } else {
      // Fallback to old method
      const updated = manualFolders.filter(f => f !== folderPath);
      setManualFolders(updated);
      try {
        await window.electronAPI.saveManualFolders(updated);
      } catch (err) {
        console.error('Error removing manual folder:', err);
      }
    }
  };

  const handleUpdateManualFolderName = async (folderId: string, newName: string) => {
    const config = manualFolderConfigs[folderId];
    if (config && window.electronAPI.saveManualFolderConfig) {
      const updatedConfig = { ...config, name: newName };
      const result = await window.electronAPI.saveManualFolderConfig(updatedConfig);
      if (result && result.success) {
        setManualFolderConfigs({ ...manualFolderConfigs, [folderId]: updatedConfig });
      }
    }
  };

  const handleScanApp = async (appId: string) => {
    const app = apps.find(a => a.id === appId);
    if (!app || !app.enabled || !app.path) {
      return;
    }

    setScanningAppId(appId);
    try {
      if (appId === 'steam') {
        const result = await window.electronAPI.scanGamesWithPath(app.path, false);
        if (result.success && result.games && result.games.length > 0) {
          if (onShowImportModal) {
            onShowImportModal(result.games, 'steam');
          }
        }
      } else if (appId === 'xbox') {
        const result = await window.electronAPI.scanXboxGames(app.path, false);
        if (result.success && result.games && result.games.length > 0) {
          if (onShowImportModal) {
            onShowImportModal(result.games, 'xbox');
          }
        }
      }
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

  const [resetConfirmation, setResetConfirmation] = useState({
    step: 1, // 1 = initial, 2 = type confirmation, 3 = final confirmation
    typedText: '',
  });
  const [isResetting, setIsResetting] = useState(false);

  // Remove All Games state (separate from full reset)
  const [removeGamesConfirmation, setRemoveGamesConfirmation] = useState({
    step: 1,
    typedText: '',
  });
  const [isRemovingGames, setIsRemovingGames] = useState(false);

  const handleRemoveAllGames = async () => {
    if (removeGamesConfirmation.step === 1) {
      setRemoveGamesConfirmation({ step: 2, typedText: '' });
      return;
    }

    if (removeGamesConfirmation.step === 2) {
      if (removeGamesConfirmation.typedText !== 'DELETE') {
        return;
      }
      setRemoveGamesConfirmation({ step: 3, typedText: '' });
      return;
    }

    if (removeGamesConfirmation.step === 3) {
      setIsRemovingGames(true);
      try {
        // Call backend to clear only games (library, images, metadata)
        const result = await window.electronAPI.clearGameLibrary();
        if (result.success) {
          setRemoveGamesConfirmation({ step: 1, typedText: '' });
          setIsRemovingGames(false);
          onClose();
          window.location.reload();
        } else {
          alert('Failed to remove games: ' + (result.error || 'Unknown error'));
          setIsRemovingGames(false);
          setRemoveGamesConfirmation({ step: 1, typedText: '' });
        }
      } catch (error) {
        console.error('Error removing games:', error);
        alert('Failed to remove games: ' + (error instanceof Error ? error.message : 'Unknown error'));
        setIsRemovingGames(false);
        setRemoveGamesConfirmation({ step: 1, typedText: '' });
      }
    }
  };

  const handleReset = async () => {
    if (resetConfirmation.step === 1) {
      // First step: show typing confirmation
      setResetConfirmation({ step: 2, typedText: '' });
      return;
    }

    if (resetConfirmation.step === 2) {
      // Second step: check if user typed "RESET"
      if (resetConfirmation.typedText !== 'RESET') {
        return;
      }
      // Move to final confirmation
      setResetConfirmation({ step: 3, typedText: '' });
      return;
    }

    // Final step: perform reset
    if (resetConfirmation.step === 3) {
      setIsResetting(true);
      try {
        const result = await window.electronAPI.resetApp();
        if (result.success) {
          // Close modal and reload the app
          onClose();
          // Reload the window to reflect changes
          window.location.reload();
        } else {
          alert('Failed to reset application: ' + (result.error || 'Unknown error'));
          setIsResetting(false);
          setResetConfirmation({ step: 1, typedText: '' });
        }
      } catch (error) {
        console.error('Error resetting app:', error);
        alert('Failed to reset application: ' + (error instanceof Error ? error.message : 'Unknown error'));
        setIsResetting(false);
        setResetConfirmation({ step: 1, typedText: '' });
      }
    }
  };

  const handleSave = async () => {
    try {
      const result = await window.electronAPI.savePreferences({
        minimizeToTray: settings.minimizeToTray,
        showSystemTrayIcon: settings.showSystemTrayIcon,
        startWithComputer: settings.startWithComputer,
        startClosedToTray: settings.startClosedToTray,
        updateLibrariesOnStartup: settings.updateLibrariesOnStartup,
        minimizeOnGameLaunch: settings.minimizeOnGameLaunch,
        hideGameTitles: settings.hideGameTitles,
        gameTilePadding: settings.gameTilePadding,
        showLogoOverBoxart: showLogoOverBoxart,
        logoPosition: logoPosition,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save preferences');
      }

      // Save app configs if we're on the apps tab or if apps have been modified
      if (apps.length > 0) {
        const configsToSave = apps.map(app => ({
          id: app.id,
          name: app.name,
          enabled: app.enabled,
          path: app.path,
          autoAdd: app.autoAdd || false,
          syncPlaytime: app.syncPlaytime || false,
        }));

        const appResult = await window.electronAPI.saveAppConfigs(configsToSave);

        if (!appResult.success) {
          console.error('Error saving app configs:', appResult.error);
        }

        // Also save Steam path for backward compatibility
        const steamApp = apps.find((app) => app.id === 'steam');
        if (steamApp && steamApp.enabled && steamApp.path) {
          await window.electronAPI.setSteamPath(steamApp.path);
        }
      }

      // Save manual folders
      try {
        const manualFoldersResult = await window.electronAPI.saveManualFolders(manualFolders);
        if (!manualFoldersResult || !manualFoldersResult.success) {
          console.error('Error saving manual folders:', manualFoldersResult?.error || 'Unknown error');
        }
      } catch (err) {
        console.error('Error saving manual folders:', err);
      }

      // Apply system tray settings
      await window.electronAPI.applySystemTraySettings({
        showSystemTrayIcon: settings.showSystemTrayIcon,
        minimizeToTray: settings.minimizeToTray,
      });

      // Apply startup settings
      await window.electronAPI.applyStartupSettings({
        startWithComputer: settings.startWithComputer,
        startClosedToTray: settings.startClosedToTray,
      });

      // Notify parent component to reload preferences
      if (onSave) {
        await onSave();
      }

      onClose();
    } catch (error) {
      console.error('Error saving Onyx settings:', error);
      alert('Failed to save settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  if (!isOpen) return null;

  const tabs: { id: TabType; label: string; icon: JSX.Element }[] = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'apps',
      label: 'Apps',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'folders',
      label: 'Folders',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      ),
    },
    {
      id: 'apis',
      label: "API's",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      id: 'reset',
      label: 'Reset',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
    },
    // DISABLED: Suspend feature (Future Feature)
    // {
    //   id: 'suspend',
    //   label: 'Suspend',
    //   icon: (
    //     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    //       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    //     </svg>
    //   ),
    // },
    {
      id: 'about',
      label: 'About',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />

      {/* Modal - Full Screen with 3% padding */}
      <div className="fixed inset-0 z-50" style={{ padding: '3%' }}>
        <div
          className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700/50 w-full h-full flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-4 py-2 border-b border-gray-700/50 bg-gray-800/95 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <img
                  src={iconPng}
                  alt="Onyx"
                  className="w-5 h-5"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = iconSvg;
                  }}
                />
                Onyx Settings
              </h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-gray-700"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 pt-2 pb-1 border-b border-gray-700/50 bg-gray-800/50">
            <div className="flex flex-wrap gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-sm font-medium transition-all ${activeTab === tab.id
                    ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-500'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/50'
                    }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-800/30">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white mb-4">System Behavior</h3>

                  {/* Settings Grid - 2 columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Minimize to tray */}
                    <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                      <div className="flex-1 pr-4">
                        <label className="text-gray-200 font-medium block mb-1">
                          Minimize to System Tray
                        </label>
                        <p className="text-gray-400 text-sm">
                          Minimize Onyx to system tray when the application window is closed
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggle('minimizeToTray')}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${settings.minimizeToTray ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.minimizeToTray ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Show system tray icon */}
                    <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                      <div className="flex-1 pr-4">
                        <label className="text-gray-200 font-medium block mb-1">
                          Show System Tray Icon
                        </label>
                        <p className="text-gray-400 text-sm">
                          Display Onyx icon in the system tray
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggle('showSystemTrayIcon')}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${settings.showSystemTrayIcon ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.showSystemTrayIcon ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Start with computer */}
                    <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                      <div className="flex-1 pr-4">
                        <label className="text-gray-200 font-medium block mb-1">
                          Start with Computer
                        </label>
                        <p className="text-gray-400 text-sm">
                          Launch Onyx automatically when your computer starts
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggle('startWithComputer')}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${settings.startWithComputer ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.startWithComputer ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Start closed to tray */}
                    <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                      <div className="flex-1 pr-4">
                        <label className="text-gray-200 font-medium block mb-1">
                          Start Minimized to Tray
                        </label>
                        <p className="text-gray-400 text-sm">
                          Start Onyx minimized to the system tray
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggle('startClosedToTray')}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${settings.startClosedToTray ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.startClosedToTray ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Update libraries on startup */}
                    <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                      <div className="flex-1 pr-4">
                        <label className="text-gray-200 font-medium block mb-1">
                          Update Libraries on Startup
                        </label>
                        <p className="text-gray-400 text-sm">
                          Automatically scan for new games when Onyx starts. If new games are found, you'll be prompted to configure metadata and images.
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggle('updateLibrariesOnStartup')}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${settings.updateLibrariesOnStartup ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.updateLibrariesOnStartup ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>

                    {/* Background scanning */}
                    <div className="space-y-4 p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 pr-4">
                          <label className="text-gray-200 font-medium block mb-1">
                            Background Scanning
                          </label>
                          <p className="text-gray-400 text-sm">
                            Automatically scan for new games at regular intervals while Onyx is running. New games will be detected and you'll be notified.
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            const newValue = !backgroundScanEnabled;
                            setBackgroundScanEnabled(newValue);
                            try {
                              await window.electronAPI.setBackgroundScanEnabled(newValue);
                            } catch (error) {
                              console.error('Error toggling background scan:', error);
                              setBackgroundScanEnabled(!newValue); // Revert on error
                            }
                          }}
                          className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${backgroundScanEnabled ? 'bg-blue-600' : 'bg-gray-600'
                            }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${backgroundScanEnabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                          />
                        </button>
                      </div>

                      {/* Scan interval setting */}
                      {backgroundScanEnabled && (
                        <div className="pt-2 border-t border-gray-600/50">
                          <label className="text-gray-200 font-medium block mb-2">
                            Scan Interval
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="1"
                              max="1440"
                              value={backgroundScanIntervalMinutes}
                              onChange={(e) => {
                                const value = parseInt(e.target.value, 10);
                                if (!isNaN(value) && value >= 1 && value <= 1440) {
                                  setBackgroundScanIntervalMinutes(value);
                                }
                              }}
                              onBlur={async () => {
                                try {
                                  await window.electronAPI.setBackgroundScanIntervalMinutes(backgroundScanIntervalMinutes);
                                } catch (error) {
                                  console.error('Error setting background scan interval:', error);
                                  // Reload the value on error
                                  const interval = await window.electronAPI.getBackgroundScanIntervalMinutes();
                                  setBackgroundScanIntervalMinutes(interval);
                                }
                              }}
                              className="w-24 px-3 py-2 bg-gray-600 text-white rounded border border-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <span className="text-gray-400 text-sm">
                              {backgroundScanIntervalMinutes === 1 ? 'minute' : 'minutes'}
                            </span>
                            <span className="text-gray-500 text-xs">
                              (1-1440 minutes, 24 hours max)
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Minimize on game launch */}
                    <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                      <div className="flex-1 pr-4">
                        <label className="text-gray-200 font-medium block mb-1">
                          Minimize When Game Opens
                        </label>
                        <p className="text-gray-400 text-sm">
                          Automatically minimize Onyx to the system tray when a game is launched
                        </p>
                      </div>
                      <button
                        onClick={() => handleToggle('minimizeOnGameLaunch')}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${settings.minimizeOnGameLaunch ? 'bg-blue-600' : 'bg-gray-600'
                          }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${settings.minimizeOnGameLaunch ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'apis' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white mb-4">API Credentials</h3>

                  {/* API Tabs */}
                  <div className="border-b border-gray-700 mb-6">
                    <nav className="flex space-x-8" aria-label="API Tabs">
                      {/* IGDB Tab Button */}
                      <button
                        onClick={() => setActiveAPITab('igdb')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeAPITab === 'igdb'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-gray-200'
                          }`}
                      >
                        IGDB
                        {apiStatus.igdbConfigured && (
                          <span className="text-green-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </button>

                      {/* RAWG Tab Button */}
                      <button
                        onClick={() => setActiveAPITab('rawg')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeAPITab === 'rawg'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-gray-200'
                          }`}
                      >
                        RAWG <span className="text-xs opacity-75">(Optional)</span>
                        {apiStatus.rawgConfigured && (
                          <span className="text-green-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </button>

                      {/* SteamGridDB Tab Button */}
                      <button
                        onClick={() => setActiveAPITab('steamgriddb')}
                        className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeAPITab === 'steamgriddb'
                          ? 'border-blue-500 text-blue-400'
                          : 'border-transparent text-gray-400 hover:text-gray-200'
                          }`}
                      >
                        SteamGridDB <span className="text-xs opacity-75">(Optional)</span>
                        {apiStatus.steamGridDBConfigured && (
                          <span className="text-green-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </span>
                        )}
                      </button>
                    </nav>
                  </div>

                  {/* IGDB Tab Content */}
                  {activeAPITab === 'igdb' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column - Instructions */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-base font-medium text-white mb-2">IGDB API (Mandatory)</h4>
                          <p className="text-sm text-gray-400 mb-4">
                            IGDB (Internet Game Database) provides comprehensive game metadata including covers, screenshots, descriptions, genres, and more. <span className="text-red-400 font-semibold">This API is required.</span>
                          </p>

                          {/* Instructions */}
                          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                            <h5 className="text-sm font-medium text-white mb-2">How to obtain IGDB API credentials:</h5>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                              <li>
                                Visit the{' '}
                                <button
                                  onClick={handleOpenIGDB}
                                  className="text-blue-400 hover:text-blue-300 underline"
                                >
                                  Twitch Developer Console
                                </button>
                                {' '}at https://dev.twitch.tv/console/apps/create
                              </li>
                              <li>Sign in with your Twitch account (create one if needed)</li>
                              <li>Click "Register Your Application" to create a new application</li>
                              <li>Fill in the form:
                                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                                  <li><strong>Name:</strong> Enter your application name (e.g., "Onyx")</li>
                                  <li><strong>OAuth Redirect URLs:</strong> Enter <code className="bg-gray-800 px-1 rounded">http://localhost</code> and click "Add"</li>
                                  <li><strong>Category:</strong> Select "Game Integration" from the dropdown</li>
                                  <li><strong>Client Type:</strong> Select "Confidential" (recommended for desktop applications)</li>
                                </ul>
                              </li>
                              <li>Click the "Create" button</li>
                              <li>On the next page, you'll see your <strong>Client ID</strong> and can click "New Secret" to generate a <strong>Client Secret</strong></li>
                              <li>Copy both values and paste them into the fields on the right</li>
                            </ol>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Input Fields */}
                      <div className="space-y-4">
                        {/* Client ID Input */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-200">
                            Client ID
                          </label>
                          <input
                            type="text"
                            value={apiCredentials.igdbClientId}
                            onChange={(e) => handleAPIInputChange('igdbClientId', e.target.value)}
                            placeholder="Enter your IGDB Client ID"
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Client Secret Input */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-200">
                            Client Secret
                          </label>
                          <input
                            type="password"
                            value={apiCredentials.igdbClientSecret}
                            onChange={(e) => handleAPIInputChange('igdbClientSecret', e.target.value)}
                            placeholder="Enter your IGDB Client Secret"
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        {/* Status Message */}
                        {apiSaveStatus === 'success' && activeAPITab === 'igdb' && (
                          <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-2 rounded-lg text-sm">
                            IGDB credentials saved successfully! Service will be restarted.
                          </div>
                        )}
                        {apiSaveStatus === 'error' && activeAPITab === 'igdb' && (
                          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">
                            Failed to save credentials. Please try again.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* RAWG Tab Content */}
                  {activeAPITab === 'rawg' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column - Instructions */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-base font-medium text-white mb-2">RAWG API (Optional)</h4>
                          <p className="text-sm text-gray-400 mb-4">
                            RAWG (Rapid API for Video Games) provides comprehensive game metadata including descriptions, genres, ratings, and release dates. This is an optional API that can enhance metadata quality when IGDB results are incomplete.
                          </p>

                          {/* Why use RAWG */}
                          <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/50 mb-4">
                            <h5 className="text-sm font-medium text-blue-300 mb-2">Why use RAWG API?</h5>
                            <ul className="list-disc list-inside space-y-1 text-sm text-blue-200">
                              <li>Fallback metadata source when IGDB doesn't have complete information</li>
                              <li>Comprehensive game database with detailed descriptions</li>
                              <li>User ratings and reviews data</li>
                              <li>Better coverage for indie and lesser-known games</li>
                              <li>Free tier available with generous rate limits</li>
                            </ul>
                          </div>

                          {/* Instructions */}
                          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                            <h5 className="text-sm font-medium text-white mb-2">How to obtain RAWG API key:</h5>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                              <li>
                                Visit{' '}
                                <button
                                  onClick={async () => {
                                    try {
                                      await window.electronAPI.openExternal('https://rawg.io/apidocs');
                                    } catch (error) {
                                      console.error('Error opening RAWG API docs:', error);
                                    }
                                  }}
                                  className="text-blue-400 hover:text-blue-300 underline"
                                >
                                  RAWG API Documentation
                                </button>
                                {' '}at https://rawg.io/apidocs
                              </li>
                              <li>Click "Get API Key" or "Sign Up" to create a free account</li>
                              <li>Sign in with your account (or create one if needed)</li>
                              <li>Navigate to your API dashboard or profile settings</li>
                              <li>Generate a new API key (free tier is sufficient for most users)</li>
                              <li>Copy the generated API key</li>
                              <li>Paste it into the field on the right</li>
                            </ol>
                            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs text-yellow-300">
                              <strong>Note:</strong> RAWG API is optional. The app will work with just IGDB, but adding RAWG can improve metadata quality for some games.
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Input Fields */}
                      <div className="space-y-4">
                        {/* API Key Input */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-200">
                            API Key <span className="text-gray-500 text-xs">(Optional)</span>
                          </label>
                          <input
                            type="password"
                            value={apiCredentials.rawgApiKey}
                            onChange={(e) => handleAPIInputChange('rawgApiKey', e.target.value)}
                            placeholder="Enter your RAWG API Key"
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500">
                            Your API key is stored securely and used as a fallback for game metadata
                          </p>
                        </div>

                        {/* Status Message */}
                        {apiSaveStatus === 'success' && activeAPITab === 'rawg' && (
                          <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-2 rounded-lg text-sm">
                            RAWG API key saved successfully! Service will be restarted.
                          </div>
                        )}
                        {apiSaveStatus === 'error' && activeAPITab === 'rawg' && (
                          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">
                            Failed to save API key. Please try again.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* SteamGridDB Tab Content */}
                  {activeAPITab === 'steamgriddb' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column - Instructions */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-base font-medium text-white mb-2">SteamGridDB API (Optional)</h4>
                          <p className="text-sm text-gray-400 mb-4">
                            SteamGridDB is a community-driven database for custom game assets. It provides high-quality grids, heroes, and logos that can replace standard metadata images.
                          </p>

                          {/* Why use SteamGridDB */}
                          <div className="bg-blue-900/20 rounded-lg p-4 border border-blue-700/50 mb-4">
                            <h5 className="text-sm font-medium text-blue-300 mb-2">Why use SteamGridDB API?</h5>
                            <ul className="list-disc list-inside space-y-1 text-sm text-blue-200">
                              <li>Access to thousands of community-created assets</li>
                              <li>Animated grids and heroes (APNG/WebM) support</li>
                              <li>High-resolution logos and icons</li>
                              <li>Better coverage for non-Steam games</li>
                            </ul>
                          </div>

                          {/* Instructions */}
                          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                            <h5 className="text-sm font-medium text-white mb-2">How to obtain SteamGridDB API key:</h5>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                              <li>
                                Visit{' '}
                                <button
                                  onClick={async () => {
                                    try {
                                      await window.electronAPI.openExternal('https://www.steamgriddb.com/profile/preferences');
                                    } catch (error) {
                                      console.error('Error opening SteamGridDB page:', error);
                                    }
                                  }}
                                  className="text-blue-400 hover:text-blue-300 underline"
                                >
                                  SteamGridDB Profile Preferences
                                </button>
                                {' '}at steamgriddb.com
                              </li>
                              <li>Log in with your Steam account</li>
                              <li>Scan down to the "API" section</li>
                              <li>Click "Create API Key" if you haven't already</li>
                              <li>Copy the generated API Key</li>
                              <li>Paste it into the field on the right</li>
                            </ol>
                            <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded text-xs text-yellow-300">
                              <strong>Note:</strong> SteamGridDB is optional. It is primarily used for finding better artwork for games.
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Input Fields */}
                      <div className="space-y-4">
                        {/* API Key Input */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-200">
                            API Key <span className="text-gray-500 text-xs">(Optional)</span>
                          </label>
                          <input
                            type="password"
                            value={apiCredentials.steamGridDBApiKey}
                            onChange={(e) => handleAPIInputChange('steamGridDBApiKey', e.target.value)}
                            placeholder="Enter your SteamGridDB API Key"
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500">
                            Your API key is stored securely and used to fetch community artwork.
                          </p>
                        </div>

                        {/* Status Message */}
                        {apiSaveStatus === 'success' && activeAPITab === 'steamgriddb' && (
                          <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-2 rounded-lg text-sm">
                            SteamGridDB API key saved successfully!
                          </div>
                        )}
                        {apiSaveStatus === 'error' && activeAPITab === 'steamgriddb' && (
                          <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-2 rounded-lg text-sm">
                            Failed to save API key. Please try again.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Save All API Credentials Button */}
                  <div className="flex justify-end pt-6 border-t border-gray-700">
                    <button
                      onClick={handleAPISave}
                      disabled={isLoadingAPI}
                      className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoadingAPI ? 'Saving...' : 'Save All API Credentials'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'apps' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white mb-4">Configure Game Launchers</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Enable and configure game launchers to automatically import your games
                  </p>

                  {isLoadingApps ? (
                    <div className="text-center py-8">
                      <p className="text-gray-300">Loading app configurations...</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-5 gap-3">
                      {apps.map((app) => (
                        <div key={app.id} className="border border-gray-700 rounded-lg p-2.5 bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">
                              {app.name}
                            </h4>
                            {/* Enable/Disable Toggle */}
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={app.enabled}
                                onChange={() => handleToggleAppEnabled(app.id)}
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>

                          {app.enabled && (
                            <div className="space-y-1.5">
                              <div>
                                <label className="block text-xs text-gray-400 mb-0.5">
                                  Installation Path
                                </label>
                                <div className="flex gap-1.5">
                                  <input
                                    type="text"
                                    value={app.path}
                                    onChange={(e) => handleAppPathChange(app.id, e.target.value)}
                                    placeholder={app.placeholder}
                                    className="flex-1 px-1.5 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <button
                                    onClick={() => handleBrowseApp(app.id)}
                                    className="px-1.5 py-1 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors"
                                  >
                                    Browse
                                  </button>
                                </div>
                              </div>

                              {/* Steam-specific options - hidden when not signed in */}
                              {app.id === 'steam' && steamAuthState.authenticated && (
                                <div className="space-y-2 pt-1.5 border-t border-gray-600">
                                  {/* Steam Authentication Status - hidden when not signed in */}
                                  {steamAuthState.authenticated && (
                                    <div className="flex items-center justify-between p-1.5 bg-gray-800/50 rounded">
                                      <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full ${steamAuthState.authenticated ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                                        <span className="text-xs text-gray-300 truncate">
                                          {steamAuthState.authenticated
                                            ? steamAuthState.username || `Steam ID: ${steamAuthState.steamId?.substring(0, 8)}...`
                                            : 'Not signed in'}
                                        </span>
                                      </div>
                                      {steamAuthState.authenticated && (
                                        <button
                                          onClick={async () => {
                                            if (confirm('Sign out of Steam?')) {
                                              if (window.electronAPI.clearSteamAuth) {
                                                await window.electronAPI.clearSteamAuth();
                                              }
                                              setSteamAuthState({ authenticated: false });
                                            }
                                          }}
                                          className="text-xs text-gray-400 hover:text-gray-200"
                                        >
                                          Sign out
                                        </button>
                                      )}
                                    </div>
                                  )}

                                  {/* Sign into Steam button - DISABLED */}
                                  {false && !steamAuthState.authenticated && (
                                    <button
                                      onClick={handleSteamAuthenticate}
                                      disabled={isAuthenticating}
                                      className="w-full px-2 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                                    >
                                      {isAuthenticating ? (
                                        <>
                                          <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                          </svg>
                                          <span className="text-xs">Authenticating...</span>
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                          </svg>
                                          <span className="text-xs">Sign into Steam</span>
                                        </>
                                      )}
                                    </button>
                                  )}

                                  {/* Auto add toggle - only show when authenticated */}
                                  {steamAuthState.authenticated && (
                                    <>
                                      <div className="flex items-center justify-between p-1.5 bg-gray-800/30 rounded">
                                        <div className="flex-1">
                                          <label className="text-xs font-medium text-gray-300 block">Auto add</label>
                                          <p className="text-xs text-gray-500">Show notification when new games are found</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={app.autoAdd || false}
                                            onChange={() => handleToggleAutoAdd(app.id)}
                                            className="sr-only peer"
                                          />
                                          <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                      </div>

                                      {/* Sync Playtime toggle - only show when authenticated */}
                                      <div className="flex items-center justify-between p-1.5 bg-gray-800/30 rounded mt-1.5">
                                        <div className="flex-1">
                                          <label className="text-xs font-medium text-gray-300 block">Sync Playtime</label>
                                          <p className="text-xs text-gray-500">Automatically sync playtime from Steam</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={app.syncPlaytime || false}
                                            onChange={() => handleToggleSyncPlaytime(app.id)}
                                            className="sr-only peer"
                                          />
                                          <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                                        </label>
                                      </div>
                                    </>
                                  )}
                                </div>
                              )}

                              {/* Scan Now button for newly enabled apps (non-Steam) */}
                              {app.id !== 'steam' && newlyEnabledApps.has(app.id) && app.path && (
                                <div className="flex items-center gap-1.5 pt-1.5">
                                  <button
                                    onClick={() => handleScanApp(app.id)}
                                    disabled={scanningAppId === app.id}
                                    className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                                  >
                                    {scanningAppId === app.id ? (
                                      <>
                                        <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span className="text-xs">Scanning...</span>
                                      </>
                                    ) : (
                                      <>
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        <span className="text-xs">Scan Now</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Manual Folders Section - Display like apps */}
                  <div className="mt-8 pt-8 border-t border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white mb-1">Manual Folders</h3>
                        <p className="text-gray-400 text-sm">
                          Add custom folders to monitor for games. All locations are deep scanned recursively.
                        </p>
                      </div>
                      <button
                        onClick={handleAddManualFolder}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add Folder
                      </button>
                    </div>

                    {Object.keys(manualFolderConfigs).length === 0 ? (
                      <div className="text-center py-8 text-gray-500 text-sm">
                        No manual folders added. Click "Add Folder" to monitor a custom location.
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-3">
                        {Object.values(manualFolderConfigs).map((folderConfig) => (
                          <div key={folderConfig.id} className="border border-gray-700 rounded-lg p-2.5 bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <input
                                type="text"
                                value={folderConfig.name}
                                onChange={(e) => handleUpdateManualFolderName(folderConfig.id, e.target.value)}
                                onBlur={() => {
                                  // Save on blur
                                  const config = manualFolderConfigs[folderConfig.id];
                                  if (config && window.electronAPI.saveManualFolderConfig) {
                                    window.electronAPI.saveManualFolderConfig(config);
                                  }
                                }}
                                className="text-xs font-semibold text-gray-300 uppercase tracking-wide bg-transparent border-none p-0 w-full focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
                                style={{ textTransform: 'uppercase' }}
                              />
                              {/* Enable/Disable Toggle */}
                              <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={folderConfig.enabled}
                                  onChange={async () => {
                                    const updated = { ...folderConfig, enabled: !folderConfig.enabled };
                                    if (window.electronAPI.saveManualFolderConfig) {
                                      await window.electronAPI.saveManualFolderConfig(updated);
                                      setManualFolderConfigs({ ...manualFolderConfigs, [folderConfig.id]: updated });
                                    }
                                  }}
                                  className="sr-only peer"
                                />
                                <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>

                            {folderConfig.enabled && (
                              <div className="space-y-1.5">
                                <div>
                                  <label className="block text-xs text-gray-400 mb-0.5">
                                    Folder Path
                                  </label>
                                  <div className="flex gap-1.5">
                                    <input
                                      type="text"
                                      value={folderConfig.path}
                                      readOnly
                                      className="flex-1 px-1.5 py-1 bg-gray-900 border border-gray-600 rounded text-xs text-gray-400 cursor-not-allowed"
                                    />
                                    <button
                                      onClick={() => handleRemoveManualFolder(folderConfig.path)}
                                      className="px-1.5 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs rounded transition-colors"
                                      title="Remove folder"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>

                                {/* Auto Category Selection */}
                                <div>
                                  <label className="block text-xs text-gray-400 mb-0.5">
                                    Auto Category (optional)
                                  </label>
                                  <div className="flex gap-1.5 mb-1.5">
                                    <input
                                      type="text"
                                      value={folderConfig.autoCategory?.join(', ') || ''}
                                      onChange={(e) => {
                                        const categories = e.target.value.split(',').map(c => c.trim()).filter(c => c);
                                        const updated = { ...folderConfig, autoCategory: categories };
                                        setManualFolderConfigs({ ...manualFolderConfigs, [folderConfig.id]: updated });
                                      }}
                                      onBlur={async () => {
                                        const config = manualFolderConfigs[folderConfig.id];
                                        if (config && window.electronAPI.saveManualFolderConfig) {
                                          await window.electronAPI.saveManualFolderConfig(config);
                                        }
                                      }}
                                      className="flex-1 px-1.5 py-1 bg-gray-800 border border-gray-600 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                      placeholder="Games, Apps, VR (comma-separated)"
                                    />
                                  </div>
                                  <div className="flex flex-wrap gap-1">
                                    {(['Games', 'Apps', 'VR'] as const).map((cat) => {
                                      const isSelected = folderConfig.autoCategory?.includes(cat);
                                      return (
                                        <button
                                          key={cat}
                                          type="button"
                                          onClick={async () => {
                                            const current = folderConfig.autoCategory || [];
                                            const updated = isSelected
                                              ? current.filter(c => c !== cat)
                                              : [...current, cat];
                                            const updatedConfig = { ...folderConfig, autoCategory: updated };
                                            setManualFolderConfigs({ ...manualFolderConfigs, [folderConfig.id]: updatedConfig });
                                            if (window.electronAPI.saveManualFolderConfig) {
                                              await window.electronAPI.saveManualFolderConfig(updatedConfig);
                                            }
                                          }}
                                          className={`px-2 py-0.5 text-xs rounded transition-colors ${isSelected
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-700/50 text-gray-300 hover:bg-gray-700'
                                            }`}
                                        >
                                          {isSelected ? '✓' : '+'} {cat}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  {folderConfig.autoCategory && folderConfig.autoCategory.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {folderConfig.autoCategory.map((cat, idx) => (
                                        <span
                                          key={idx}
                                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600/20 border border-blue-500/50 rounded text-xs text-blue-300"
                                        >
                                          {cat}
                                          <button
                                            type="button"
                                            onClick={async () => {
                                              const updated = folderConfig.autoCategory?.filter(c => c !== cat) || [];
                                              const updatedConfig = { ...folderConfig, autoCategory: updated.length > 0 ? updated : undefined };
                                              setManualFolderConfigs({ ...manualFolderConfigs, [folderConfig.id]: updatedConfig });
                                              if (window.electronAPI.saveManualFolderConfig) {
                                                await window.electronAPI.saveManualFolderConfig(updatedConfig);
                                              }
                                            }}
                                            className="text-blue-300 hover:text-blue-100"
                                          >
                                            ×
                                          </button>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'reset' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Remove All Games */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-white mb-2">Remove All Games</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Clear your game library while keeping all app settings and configurations.
                    </p>

                    {/* Warning Box */}
                    <div className="bg-orange-900/20 border-2 border-orange-500/50 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1">
                          <h4 className="text-orange-400 font-semibold mb-2">This will permanently delete:</h4>
                          <ul className="list-disc list-inside text-orange-300 text-sm space-y-1">
                            <li>All games in your library</li>
                            <li>All game metadata and images</li>
                          </ul>
                          <p className="text-orange-200 text-xs mt-3">
                            Your app settings, API credentials, and launcher configurations will be preserved.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Confirmation Section */}
                    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                      {removeGamesConfirmation.step === 1 && (
                        <div className="space-y-3">
                          <p className="text-gray-300 text-sm">
                            Click below to start the removal process.
                          </p>
                          <button
                            onClick={handleRemoveAllGames}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors text-sm"
                          >
                            Remove All Games
                          </button>
                        </div>
                      )}

                      {removeGamesConfirmation.step === 2 && (
                        <div className="space-y-3">
                          <p className="text-gray-300 text-sm font-medium">
                            Type <span className="text-orange-400 font-bold">DELETE</span> to confirm:
                          </p>
                          <input
                            type="text"
                            value={removeGamesConfirmation.typedText}
                            onChange={(e) => setRemoveGamesConfirmation({ ...removeGamesConfirmation, typedText: e.target.value })}
                            placeholder="Type DELETE here"
                            className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setRemoveGamesConfirmation({ step: 1, typedText: '' })}
                              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleRemoveAllGames}
                              disabled={removeGamesConfirmation.typedText !== 'DELETE'}
                              className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              Continue
                            </button>
                          </div>
                        </div>
                      )}

                      {removeGamesConfirmation.step === 3 && (
                        <div className="space-y-3">
                          <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3">
                            <p className="text-yellow-300 text-sm font-medium">Final Confirmation</p>
                            <p className="text-yellow-200 text-xs mt-1">This will delete all games and their images permanently.</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setRemoveGamesConfirmation({ step: 1, typedText: '' })}
                              disabled={isRemovingGames}
                              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleRemoveAllGames}
                              disabled={isRemovingGames}
                              className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                            >
                              {isRemovingGames ? (
                                <>
                                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Removing...
                                </>
                              ) : (
                                'Remove All Games Now'
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Reset Application */}
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-white mb-2">Reset Application</h3>
                    <p className="text-gray-400 text-sm mb-4">
                      Completely reset Onyx to its initial installation state.
                    </p>

                    {/* Warning Box */}
                    <div className="bg-red-900/20 border-2 border-red-500/50 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <div className="flex-1">
                          <h4 className="text-red-400 font-semibold mb-2">This will permanently delete EVERYTHING:</h4>
                          <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
                            <li>All games in your library</li>
                            <li>All game metadata and images</li>
                            <li>All app configurations (Steam, Xbox, etc.)</li>
                            <li>All user preferences and settings</li>
                            <li>All API credentials</li>
                          </ul>
                          <p className="text-red-200 text-xs mt-3 font-medium">
                            You will need to reconfigure everything from scratch.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Confirmation Section */}
                    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                      {resetConfirmation.step === 1 && (
                        <div className="space-y-3">
                          <p className="text-gray-300 text-sm">
                            Click below to start the reset process.
                          </p>
                          <button
                            onClick={handleReset}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm"
                          >
                            Factory Reset
                          </button>
                        </div>
                      )}

                      {resetConfirmation.step === 2 && (
                        <div className="space-y-3">
                          <p className="text-gray-300 text-sm font-medium">
                            Type <span className="text-red-400 font-bold">RESET</span> to confirm:
                          </p>
                          <input
                            type="text"
                            value={resetConfirmation.typedText}
                            onChange={(e) => setResetConfirmation({ ...resetConfirmation, typedText: e.target.value })}
                            placeholder="Type RESET here"
                            className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => setResetConfirmation({ step: 1, typedText: '' })}
                              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleReset}
                              disabled={resetConfirmation.typedText !== 'RESET'}
                              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                              Continue
                            </button>
                          </div>
                        </div>
                      )}

                      {resetConfirmation.step === 3 && (
                        <div className="space-y-3">
                          <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-3">
                            <p className="text-yellow-300 text-sm font-medium">Final Confirmation</p>
                            <p className="text-yellow-200 text-xs mt-1">This will reset Onyx to factory settings permanently.</p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setResetConfirmation({ step: 1, typedText: '' })}
                              disabled={isResetting}
                              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-sm"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleReset}
                              disabled={isResetting}
                              className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                            >
                              {isResetting ? (
                                <>
                                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                  Resetting...
                                </>
                              ) : (
                                'Reset Now'
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* DISABLED: Suspend feature (Future Feature) */}
            {false && activeTab === 'suspend' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white mb-4">Suspend/Resume Feature</h3>

                  {/* Feature Toggle */}
                  <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                    <div className="flex-1 pr-4">
                      <label className="text-gray-200 font-medium block mb-1">
                        Enable Suspend/Resume Feature
                      </label>
                      <p className="text-gray-400 text-sm mb-2">
                        Allow suspending and resuming running games to free up system resources.
                        Similar to console suspend functionality (like Nintendo Switch or PlayStation).
                      </p>
                      <p className="text-yellow-400 text-xs">
                        ⚠️ May require administrator privileges. Some games may crash when suspended.
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        const newValue = !suspendFeatureEnabled;
                        setSuspendFeatureEnabled(newValue);
                        try {
                          if (window.electronAPI.suspend?.setFeatureEnabled) {
                            await window.electronAPI.suspend.setFeatureEnabled(newValue);
                            // Reload running games if enabled
                            if (newValue) {
                              loadRunningGames();
                            } else {
                              setRunningGames([]);
                            }
                          }
                        } catch (error) {
                          console.error('Error toggling suspend feature:', error);
                          setSuspendFeatureEnabled(!newValue); // Revert on error
                        }
                      }}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${suspendFeatureEnabled ? 'bg-blue-600' : 'bg-gray-600'
                        }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${suspendFeatureEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                      />
                    </button>
                  </div>

                  {/* Keyboard Shortcut Configuration */}
                  {suspendFeatureEnabled && (
                    <div className="p-4 rounded-lg bg-gray-700/30">
                      <label className="text-gray-200 font-medium block mb-2">
                        Keyboard Shortcut
                      </label>
                      <p className="text-gray-400 text-sm mb-3">
                        Press a key combination to suspend/resume the active game. Works globally even when Onyx is in the background.
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          {isRecordingShortcut ? (
                            <div className="px-4 py-2 bg-yellow-600/20 border-2 border-yellow-500 rounded text-yellow-300 text-sm font-mono">
                              Press keys...
                            </div>
                          ) : (
                            <div className="px-4 py-2 bg-gray-600/50 border border-gray-500 rounded text-white text-sm font-mono">
                              {suspendShortcut || 'Not set'}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => {
                            if (isRecordingShortcut) {
                              setIsRecordingShortcut(false);
                            } else {
                              setIsRecordingShortcut(true);
                              const handleKeyDown = async (e: KeyboardEvent) => {
                                e.preventDefault();
                                e.stopPropagation();

                                const parts: string[] = [];
                                if (e.ctrlKey) parts.push('Ctrl');
                                if (e.altKey) parts.push('Alt');
                                if (e.shiftKey) parts.push('Shift');
                                if (e.metaKey) parts.push('Meta');

                                // Get the key, excluding modifiers
                                let key = e.key;

                                // Handle special keys - map to Electron's expected format
                                const keyMap: Record<string, string> = {
                                  ' ': 'Space',
                                  'ArrowUp': 'Up',
                                  'ArrowDown': 'Down',
                                  'ArrowLeft': 'Left',
                                  'ArrowRight': 'Right',
                                  'End': 'End',
                                  'Home': 'Home',
                                  'PageUp': 'PageUp',
                                  'PageDown': 'PageDown',
                                  'Insert': 'Insert',
                                  'Delete': 'Delete',
                                  'Backspace': 'Backspace',
                                  'Enter': 'Enter',
                                  'Escape': 'Escape',
                                  'Tab': 'Tab',
                                  'CapsLock': 'CapsLock',
                                  'NumLock': 'NumLock',
                                  'ScrollLock': 'ScrollLock',
                                  'Pause': 'Pause',
                                  'PrintScreen': 'PrintScreen',
                                };

                                // Map special keys
                                if (keyMap[key]) {
                                  key = keyMap[key];
                                } else if (key.startsWith('F') && (key.length === 2 || key.length === 3)) {
                                  // Function keys F1-F12 (F1, F2, ..., F12)
                                  key = key.toUpperCase();
                                } else if (key.length === 1 && /[a-zA-Z0-9]/.test(key)) {
                                  // Regular character keys (letters and numbers)
                                  key = key.toUpperCase();
                                } else {
                                  // Other special keys - use as-is (End, Home, etc. should already be correct)
                                  key = key;
                                }

                                // Don't add if it's just a modifier
                                if (!['Control', 'Alt', 'Shift', 'Meta', 'Tab', 'Escape'].includes(key)) {
                                  parts.push(key);
                                }

                                // Allow single keys OR key combinations
                                if (parts.length >= 1) {
                                  const shortcut = parts.join('+');
                                  setSuspendShortcut(shortcut);
                                  setIsRecordingShortcut(false);

                                  try {
                                    if (window.electronAPI.suspend?.setShortcut) {
                                      await window.electronAPI.suspend.setShortcut(shortcut);
                                    }
                                  } catch (error) {
                                    console.error('Error setting shortcut:', error);
                                  }

                                  window.removeEventListener('keydown', handleKeyDown);
                                }
                              };

                              window.addEventListener('keydown', handleKeyDown, true);

                              // Cancel after 5 seconds
                              setTimeout(() => {
                                setIsRecordingShortcut(false);
                                window.removeEventListener('keydown', handleKeyDown);
                              }, 5000);
                            }
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                        >
                          {isRecordingShortcut ? 'Cancel' : 'Change Shortcut'}
                        </button>
                        {suspendShortcut && (
                          <button
                            onClick={async () => {
                              setSuspendShortcut('');
                              try {
                                if (window.electronAPI.suspend?.setShortcut) {
                                  await window.electronAPI.suspend.setShortcut('');
                                }
                              } catch (error) {
                                console.error('Error clearing shortcut:', error);
                              }
                            }}
                            className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Running Games List */}
                  {suspendFeatureEnabled && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-white">Running Games</h3>
                        <button
                          onClick={loadRunningGames}
                          disabled={isLoadingGames}
                          className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          <svg className={`w-4 h-4 ${isLoadingGames ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Refresh
                        </button>
                      </div>
                      {isLoadingGames ? (
                        <div className="text-gray-400 p-4 rounded-lg bg-gray-700/30 text-center">Loading...</div>
                      ) : runningGames.length === 0 ? (
                        <div className="text-gray-400 p-4 rounded-lg bg-gray-700/30 text-center">
                          No games currently running
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {runningGames.map((game) => (
                            <div
                              key={game.gameId}
                              className="flex items-center justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0 pr-4">
                                <div className="text-white font-medium truncate">{game.title}</div>
                                <div className="text-gray-400 text-sm">
                                  PID: {game.pid} • {game.status === 'suspended' ? 'Suspended' : 'Running'}
                                </div>
                              </div>
                              <div className="flex gap-2 flex-shrink-0">
                                {game.status === 'running' ? (
                                  <button
                                    onClick={async () => {
                                      try {
                                        if (window.electronAPI.suspend?.suspendGame) {
                                          const result = await window.electronAPI.suspend.suspendGame(game.gameId);
                                          if (result.success) {
                                            loadRunningGames();
                                          } else {
                                            alert(`Failed to suspend game: ${result.error || 'Unknown error'}`);
                                          }
                                        }
                                      } catch (error) {
                                        console.error('Error suspending game:', error);
                                        alert('Failed to suspend game');
                                      }
                                    }}
                                    className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-white text-sm transition-colors"
                                  >
                                    Suspend
                                  </button>
                                ) : (
                                  <button
                                    onClick={async () => {
                                      try {
                                        if (window.electronAPI.suspend?.resumeGame) {
                                          const result = await window.electronAPI.suspend.resumeGame(game.gameId);
                                          if (result.success) {
                                            loadRunningGames();
                                          } else {
                                            alert(`Failed to resume game: ${result.error || 'Unknown error'}`);
                                          }
                                        }
                                      } catch (error) {
                                        console.error('Error resuming game:', error);
                                        alert('Failed to resume game');
                                      }
                                    }}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm transition-colors"
                                  >
                                    Resume
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'about' && (
              <div className="flex flex-col items-center justify-center min-h-[400px] text-center space-y-6 p-8">
                {/* Header Section */}
                <div className="flex flex-col items-center animate-fade-in">
                  <img
                    src={iconPng}
                    alt="Onyx Logo"
                    className="w-24 h-24 mb-4 drop-shadow-[0_0_15px_rgba(14,165,233,0.3)]"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = iconSvg;
                    }}
                  />
                  <h2 className="text-3xl font-bold text-white tracking-wide">Onyx</h2>
                  <span className="text-sm font-medium text-slate-500 mt-1">v{appVersion}</span>
                </div>

                {/* Bio / Story */}
                <div className="max-w-md space-y-4">
                  <p className="text-slate-400 leading-relaxed">
                    Onyx is a passion project built by a single developer who just wanted a better way to launch games.
                  </p>
                  <p className="text-slate-400 leading-relaxed font-medium">
                    No ads, no bloat—just games.
                  </p>
                </div>

                {/* Social Actions Row */}
                <div className="flex items-center gap-4 mt-4">
                  {/* Discord */}
                  <button
                    onClick={async () => {
                      try {
                        if (window.electronAPI && window.electronAPI.openExternal) {
                          const result = await window.electronAPI.openExternal('https://discord.gg/m2dgd4ZUPu');
                          if (!result.success) {
                            console.error('Failed to open external URL:', result.error);
                          }
                        }
                      } catch (error) {
                        console.error('Failed to open external URL:', error);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#5865F2]/10 text-[#5865F2] hover:bg-[#5865F2]/20 transition-all duration-300 border border-[#5865F2]/20 hover:scale-105"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span>Join Discord</span>
                  </button>

                  {/* Ko-fi Support */}
                  <button
                    onClick={async () => {
                      try {
                        if (window.electronAPI && window.electronAPI.openExternal) {
                          const result = await window.electronAPI.openExternal('https://ko-fi.com/oynxgilga');
                          if (!result.success) {
                            console.error('Failed to open external URL:', result.error);
                          }
                        }
                      } catch (error) {
                        console.error('Failed to open external URL:', error);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all duration-300 border border-rose-500/20 hover:scale-105"
                  >
                    <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span>Support Onyx</span>
                  </button>
                </div>

                {/* Footer */}
                <div className="mt-auto pt-12">
                  <p className="text-xs text-slate-700">
                    © 2026 Onyx. All rights reserved.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'folders' && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white mb-2">Application Folders</h3>
                  <p className="text-gray-400 text-xs mb-4">
                    View and open all folders used by Onyx
                  </p>

                  <div className="grid grid-cols-3 gap-3">
                    {/* Image Cache Folder */}
                    <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600 hover:bg-gray-700/50 transition-colors">
                      <div className="flex-1 min-w-0 pr-3">
                        <h4 className="text-xs font-medium text-white mb-0.5">Image Cache</h4>
                        <p className="text-xs text-gray-500 font-mono truncate" title={(() => {
                          const isWindows = navigator.platform.toLowerCase().includes('win');
                          if (isWindows) {
                            return '%LOCALAPPDATA%\\onyx-launcher\\images';
                          }
                          return '~/.cache/onyx-launcher/images';
                        })()}>
                          {(() => {
                            const isWindows = navigator.platform.toLowerCase().includes('win');
                            if (isWindows) {
                              return '%LOCALAPPDATA%\\onyx-launcher\\images';
                            }
                            return '~/.cache/onyx-launcher/images';
                          })()}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            if (window.electronAPI.openPath) {
                              await window.electronAPI.openPath('cache');
                            } else {
                              alert('Open folder functionality not available');
                            }
                          } catch (err) {
                            console.error('Error opening folder:', err);
                          }
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center gap-1.5 flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open
                      </button>
                    </div>

                    {/* App Data Folder */}
                    <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600 hover:bg-gray-700/50 transition-colors">
                      <div className="flex-1 min-w-0 pr-3">
                        <h4 className="text-xs font-medium text-white mb-0.5">Application Data</h4>
                        <p className="text-xs text-gray-500 font-mono truncate" title={(() => {
                          const isWindows = navigator.platform.toLowerCase().includes('win');
                          if (isWindows) {
                            return '%APPDATA%\\onyx-launcher';
                          }
                          return '~/.config/onyx-launcher';
                        })()}>
                          {(() => {
                            const isWindows = navigator.platform.toLowerCase().includes('win');
                            if (isWindows) {
                              return '%APPDATA%\\onyx-launcher';
                            }
                            return '~/.config/onyx-launcher';
                          })()}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            if (window.electronAPI.openPath) {
                              await window.electronAPI.openPath('appData');
                            } else {
                              alert('Open folder functionality not available');
                            }
                          } catch (err) {
                            console.error('Error opening folder:', err);
                          }
                        }}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center gap-1.5 flex-shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open
                      </button>
                    </div>

                    {/* Install Locations - Show all configured app paths */}
                    {apps.filter(app => app.enabled && app.path).map((app) => (
                      <div key={app.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600 hover:bg-gray-700/50 transition-colors">
                        <div className="flex-1 min-w-0 pr-3">
                          <h4 className="text-xs font-medium text-white mb-0.5">{app.name}</h4>
                          <p className="text-xs text-gray-500 font-mono truncate" title={app.path}>
                            {app.path}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              if (window.electronAPI.openPath) {
                                await window.electronAPI.openPath(app.path);
                              } else {
                                alert('Open folder functionality not available');
                              }
                            } catch (err) {
                              console.error('Error opening folder:', err);
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center gap-1.5 flex-shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open
                        </button>
                      </div>
                    ))}

                    {/* Manual Folders */}
                    {Object.values(manualFolderConfigs).filter(f => f.enabled).map((folderConfig) => (
                      <div key={folderConfig.id} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600 hover:bg-gray-700/50 transition-colors">
                        <div className="flex-1 min-w-0 pr-3">
                          <h4 className="text-xs font-medium text-white mb-0.5">{folderConfig.name}</h4>
                          <p className="text-xs text-gray-500 font-mono truncate" title={folderConfig.path}>
                            {folderConfig.path}
                          </p>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              if (window.electronAPI.openPath) {
                                await window.electronAPI.openPath(folderConfig.path);
                              } else {
                                alert('Open folder functionality not available');
                              }
                            } catch (err) {
                              console.error('Error opening folder:', err);
                            }
                          }}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors flex items-center gap-1.5 flex-shrink-0"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Open
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-700/50 bg-gray-800/95 backdrop-blur-sm flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-600/20"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
