import React, { useState, useEffect } from 'react';
import iconPng from '../../../resources/icon.png';
import iconSvg from '../../../resources/icon.svg';
import { SettingsLayout } from './settings/SettingsLayout';
import { SettingsSidebar, SettingsTab } from './settings/SettingsSidebar';
import { SettingsSection, SettingsToggle, SettingsInput } from './settings/SettingsComponents';

interface OnyxSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  // Allow both old and new tab names for compatibility during migration
  initialTab?: 'general' | 'apis' | 'apps' | 'reset' | 'about' | 'appearance' | 'integrations' | 'launchers' | 'library' | 'advanced' | 'controller';
  onShowImportModal?: (games: Array<any>, appType?: 'steam' | 'xbox' | 'other') => void;
}

interface OnyxSettings {
  minimizeToTray: boolean;
  showSystemTrayIcon: boolean;
  startWithComputer: boolean;
  startClosedToTray: boolean;
  updateLibrariesOnStartup: boolean;
  checkForUpdatesOnStartup: boolean;
  minimizeOnGameLaunch: boolean;
  hideGameTitles: boolean;
  gameTilePadding: number;
  // New Settings
  enableHardwareAcceleration: boolean;
  closeToTray: boolean;
  confirmGameLaunch: boolean;
  restoreAfterLaunch: boolean;
  defaultStartupPage: 'library' | 'recent' | 'favorites';
  // Fullscreen settings
  startInFullscreen: boolean;
  hideMouseCursorInFullscreen: boolean;
  cursorHideTimeout: number;
  // Gamepad settings
  enableGamepadSupport: boolean;
  gamepadNavigationSpeed: number;
  gamepadButtonLayout: 'xbox' | 'playstation';
}

type TabType = 'general' | 'library' | 'launchers' | 'integrations' | 'appearance' | 'advanced' | 'about' | 'controller'; // Keep legacy types for state compatibility, but UI will hide them

interface AppConfig {
  id: string;
  name: string;
  enabled: boolean;
  path: string;
  defaultPaths: string[];
  placeholder: string;
  autoAdd?: boolean;
  syncPlaytime?: boolean;
  autoCategory?: string[];
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
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    if (initialTab === 'apps') return 'launchers';
    if (initialTab === 'apis') return 'integrations';
    if ((initialTab as string) === 'folders') return 'library';
    if (initialTab === 'reset') return 'advanced';
    return initialTab as TabType;
  });
  const [apiCredentials, setApiCredentials] = useState<APICredentials>({
    igdbClientId: '',
    igdbClientSecret: '',
    rawgApiKey: '',
    steamGridDBApiKey: '',
  });
  const [activeAPITab, setActiveAPITab] = useState<APITabType>('steamgriddb');
  // const [isLoadingAPI, setIsLoadingAPI] = useState(false);
  // const [apiSaveStatus, setApiSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [scanningAppId, setScanningAppId] = useState<string | null>(null);
  // const [newlyEnabledApps, setNewlyEnabledApps] = useState<Set<string>>(new Set());
  // const [steamAuthState, setSteamAuthState] = useState<{ authenticated: boolean; steamId?: string; username?: string }>({ authenticated: false });
  // const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [manualFolders, setManualFolders] = useState<string[]>([]);
  const [manualFolderConfigs, setManualFolderConfigs] = useState<Record<string, { id: string; name: string; path: string; enabled: boolean; autoCategory?: string[] }>>({});
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editingManualFolderId, setEditingManualFolderId] = useState<string | null>(null);
  // const [isImporting, setIsImporting] = useState(false);
  const [settings, setSettings] = useState<OnyxSettings>({
    minimizeToTray: false,
    showSystemTrayIcon: true,
    startWithComputer: false,
    startClosedToTray: false,
    updateLibrariesOnStartup: false,
    checkForUpdatesOnStartup: true,
    minimizeOnGameLaunch: false,
    hideGameTitles: false,
    gameTilePadding: 16,
    enableHardwareAcceleration: true,
    closeToTray: false,
    confirmGameLaunch: false,
    restoreAfterLaunch: false,
    defaultStartupPage: 'library',
    startInFullscreen: false,
    hideMouseCursorInFullscreen: true,
    cursorHideTimeout: 3000,
    enableGamepadSupport: true,
    gamepadNavigationSpeed: 1.0,
    gamepadButtonLayout: 'xbox',
  });
  const [showLogoOverBoxart, setShowLogoOverBoxart] = useState(true);
  const [logoPosition, setLogoPosition] = useState<'top' | 'middle' | 'bottom' | 'underneath'>('middle');
  const [appVersion, setAppVersion] = useState<string>('0.0.0');
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

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
            checkForUpdatesOnStartup: prefs.checkForUpdatesOnStartup ?? true,
            minimizeOnGameLaunch: prefs.minimizeOnGameLaunch ?? false,
            hideGameTitles: prefs.hideGameTitles ?? false,
            gameTilePadding: prefs.gameTilePadding ?? 16,
            enableHardwareAcceleration: prefs.enableHardwareAcceleration ?? true,
            closeToTray: prefs.closeToTray ?? false,
            confirmGameLaunch: prefs.confirmGameLaunch ?? false,
            restoreAfterLaunch: prefs.restoreAfterLaunch ?? false,
            defaultStartupPage: (prefs.defaultStartupPage as any) ?? 'library',
            startInFullscreen: prefs.startInFullscreen ?? false,
            hideMouseCursorInFullscreen: prefs.hideMouseCursorInFullscreen ?? true,
            cursorHideTimeout: prefs.cursorHideTimeout ?? 3000,
            enableGamepadSupport: prefs.enableGamepadSupport ?? true,
            gamepadNavigationSpeed: prefs.gamepadNavigationSpeed ?? 1.0,
            gamepadButtonLayout: prefs.gamepadButtonLayout ?? 'xbox',
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

  // Subscribe to update status from main process (packaged app only)
  useEffect(() => {
    if (!isOpen || !window.electronAPI.onUpdateStatus) return;
    const unsubscribe = window.electronAPI.onUpdateStatus((payload) => {
      setUpdateStatus(payload.status as any);
      setUpdateVersion(payload.version ?? null);
      setUpdateError(payload.error ?? null);
    });
    return unsubscribe;
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
      if (initialTab === 'apps') setActiveTab('launchers');
      else if (initialTab === 'apis') setActiveTab('integrations');
      else if ((initialTab as string) === 'folders') setActiveTab('library');
      else if (initialTab === 'reset') setActiveTab('advanced');
      else setActiveTab(initialTab as TabType);
    }
  }, [isOpen, initialTab]);



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
          // setNewlyEnabledApps(new Set());
        } catch (err) {
          console.error('Error loading app configs:', err);
        } finally {
          setIsLoadingApps(false);
        }
      };
      loadAppConfigs();

      // loadSteamAuth removed (unused)
    }
  }, [isOpen]);

  const handleToggle = (key: keyof OnyxSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
  };

  // const handleSelectChange = (key: keyof OnyxSettings, value: any) => {
  //   setSettings({ ...settings, [key]: value });
  // };

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
    // setApiSaveStatus('idle');
  };

  // handleAPISave removed (unused)

  // handleOpenIGDB removed (unused)

  const handleToggleAppEnabled = (appId: string) => {
    setApps((prev) => {
      const updated = prev.map((app) => {
        if (app.id === appId) {
          return { ...app, enabled: !app.enabled };
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

  // handleToggleAutoAdd removed (unused)

  // handleToggleSyncPlaytime removed (unused)

  const handleUpdateAppCategory = (appId: string, categories: string[]) => {
    setApps((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, autoCategory: categories } : app))
    );
  };

  // handleSteamAuthenticate removed (unused)

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
      // setNewlyEnabledApps removed (unused)
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
        checkForUpdatesOnStartup: settings.checkForUpdatesOnStartup,
        minimizeOnGameLaunch: settings.minimizeOnGameLaunch,
        hideGameTitles: settings.hideGameTitles,
        gameTilePadding: settings.gameTilePadding,
        showLogoOverBoxart: showLogoOverBoxart,
        logoPosition: logoPosition,
        enableHardwareAcceleration: settings.enableHardwareAcceleration,
        closeToTray: settings.closeToTray,
        confirmGameLaunch: settings.confirmGameLaunch,
        restoreAfterLaunch: settings.restoreAfterLaunch,
        defaultStartupPage: settings.defaultStartupPage,
        startInFullscreen: settings.startInFullscreen,
        hideMouseCursorInFullscreen: settings.hideMouseCursorInFullscreen,
        cursorHideTimeout: settings.cursorHideTimeout,
        enableGamepadSupport: settings.enableGamepadSupport,
        gamepadNavigationSpeed: settings.gamepadNavigationSpeed,
        gamepadButtonLayout: settings.gamepadButtonLayout,
      });

      // Save API credentials
      await window.electronAPI.saveAPICredentials({
        igdbClientId: apiCredentials.igdbClientId,
        igdbClientSecret: apiCredentials.igdbClientSecret,
        steamGridDBApiKey: apiCredentials.steamGridDBApiKey,
        rawgApiKey: apiCredentials.rawgApiKey,
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

      // Update gamepad service with new settings
      try {
        await window.electronAPI.gamepad.setEnabled(settings.enableGamepadSupport);
        await window.electronAPI.gamepad.setNavigationSpeed(settings.gamepadNavigationSpeed);
        await window.electronAPI.gamepad.setButtonLayout(settings.gamepadButtonLayout);
        
        // Notify hooks that gamepad preferences have changed
        window.dispatchEvent(new Event('gamepad-preferences-changed'));
      } catch (err) {
        console.error('Error updating gamepad settings:', err);
      }

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

  const tabs: SettingsTab[] = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'controller',
      label: 'Fullscreen',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <circle cx="9" cy="12" r="1" fill="currentColor" />
          <circle cx="15" cy="12" r="1" fill="currentColor" />
        </svg>
      ),
    },
    {
      id: 'library',
      label: 'Libraries',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'integrations',
      label: 'API Integrations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },

    {
      id: 'advanced',
      label: 'Advanced',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      id: 'about',
      label: 'About',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  return (
    <SettingsLayout isOpen={isOpen} onClose={onClose}>
      <SettingsSidebar
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(id) => setActiveTab(id as TabType)}
        appVersion={appVersion}
      />

      <div className="flex-1 bg-gray-900 flex flex-col overflow-hidden">
        <div className="flex-1 w-full overflow-y-auto custom-scrollbar">
          {activeTab === 'general' && (
            <div className="space-y-6 p-6">
              <SettingsSection title="System" description="Configure how Onyx integrates with your system">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <SettingsToggle
                    label="Start with Windows"
                    description="Automatically start Onyx when you log into Windows"
                    checked={settings.startWithComputer}
                    onChange={() => handleToggle('startWithComputer')}
                  />
                  <SettingsToggle
                    label="System Tray Icon"
                    description="Show Onyx in the system tray"
                    checked={settings.showSystemTrayIcon}
                    onChange={() => handleToggle('showSystemTrayIcon')}
                  />
                  <SettingsToggle
                    label="Minimize to Tray"
                    description="Minimize to the system tray instead of the taskbar"
                    checked={settings.minimizeToTray}
                    onChange={() => handleToggle('minimizeToTray')}
                  />
                  <SettingsToggle
                    label="Close to Tray"
                    description="Close button minimizes to tray instead of quitting"
                    checked={settings.closeToTray}
                    onChange={() => handleToggle('closeToTray')}
                  />
                  <SettingsToggle
                    label="Start Closed to Tray"
                    description="Launch Onyx in the background"
                    checked={settings.startClosedToTray}
                    onChange={() => handleToggle('startClosedToTray')}
                  />
                  <SettingsToggle
                    label="Hardware Acceleration"
                    description="Use GPU for rendering (Requires Restart)"
                    checked={settings.enableHardwareAcceleration}
                    onChange={() => handleToggle('enableHardwareAcceleration')}
                  />
                </div>


              </SettingsSection>

              <SettingsSection title="Scanning Options" description="Automatic game detection">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <SettingsToggle
                    label="Background Scanning"
                    description="Automatically scan for new games periodically"
                    checked={backgroundScanEnabled}
                    onChange={(checked) => {
                      setBackgroundScanEnabled(checked);
                      if (window.electronAPI.setBackgroundScanEnabled) {
                        window.electronAPI.setBackgroundScanEnabled(checked);
                      }
                    }}
                  />
                  {backgroundScanEnabled && (
                    <SettingsInput
                      label="Scan Interval (Minutes)"
                      value={backgroundScanIntervalMinutes}
                      onChange={(val) => {
                        const num = parseInt(val) || 30;
                        setBackgroundScanIntervalMinutes(num);
                        if (window.electronAPI.setBackgroundScanIntervalMinutes) {
                          window.electronAPI.setBackgroundScanIntervalMinutes(num);
                        }
                      }}
                      type="number"
                      description="How often to check for new games (1-1440 minutes)"
                    />
                  )}
                  <SettingsToggle
                    label="Update Libraries on Startup"
                    description="Automatically scan for new games when Onyx starts"
                    checked={settings.updateLibrariesOnStartup}
                    onChange={() => handleToggle('updateLibrariesOnStartup')}
                  />
                  <SettingsToggle
                    label="Check for Updates on Startup"
                    description="Check for app updates when Onyx starts"
                    checked={settings.checkForUpdatesOnStartup}
                    onChange={() => handleToggle('checkForUpdatesOnStartup')}
                  />
                </div>
              </SettingsSection>

              <SettingsSection title="Window Behavior">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  <SettingsToggle
                    label="Minimize on Game Launch"
                    description="Automatically minimize Onyx when a game starts"
                    checked={settings.minimizeOnGameLaunch}
                    onChange={() => handleToggle('minimizeOnGameLaunch')}
                  />
                  <SettingsToggle
                    label="Restore Window on Game Exit"
                    description="Automatically restore Onyx when you close a game"
                    checked={settings.restoreAfterLaunch}
                    onChange={() => handleToggle('restoreAfterLaunch')}
                  />
                  <SettingsToggle
                    label="Confirm Game Launch"
                    description="Show a confirmation dialog before launching games"
                    checked={settings.confirmGameLaunch}
                    onChange={() => handleToggle('confirmGameLaunch')}
                  />
                </div>
              </SettingsSection>

            </div>
          )}
          {
            activeTab === 'controller' && (
              <div className="space-y-8 animate-fade-in h-full overflow-y-auto p-6">
                <SettingsSection title="Fullscreen Mode" description="Configure fullscreen behavior and appearance">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <SettingsToggle
                      label="Start in Fullscreen Mode"
                      description="Launch Onyx in fullscreen (Press F11 to toggle anytime)"
                      checked={settings.startInFullscreen}
                      onChange={() => handleToggle('startInFullscreen')}
                    />
                    <SettingsToggle
                      label="Auto-Hide Cursor in Fullscreen"
                      description="Automatically hide the mouse cursor when idle in fullscreen"
                      checked={settings.hideMouseCursorInFullscreen}
                      onChange={() => handleToggle('hideMouseCursorInFullscreen')}
                    />
                    {settings.hideMouseCursorInFullscreen && (
                      <SettingsInput
                        label="Cursor Hide Timeout (ms)"
                        value={settings.cursorHideTimeout}
                        onChange={(val) => {
                          const num = parseInt(val) || 3000;
                          setSettings({ ...settings, cursorHideTimeout: Math.max(500, Math.min(10000, num)) });
                        }}
                        type="number"
                        description="Time in milliseconds before hiding cursor (500-10000)"
                      />
                    )}
                  </div>
                </SettingsSection>

                <SettingsSection title="Gamepad Navigation" description="Configure controller support and button mapping">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <SettingsToggle
                      label="Enable Gamepad Support"
                      description="Use controller for navigation (A=Select, B=Back, D-Pad=Navigate)"
                      checked={settings.enableGamepadSupport}
                      onChange={() => handleToggle('enableGamepadSupport')}
                    />
                    {settings.enableGamepadSupport && (
                      <>
                        <SettingsInput
                          label="Navigation Speed"
                          value={settings.gamepadNavigationSpeed}
                          onChange={(val) => {
                            const num = parseFloat(val) || 1.0;
                            setSettings({ ...settings, gamepadNavigationSpeed: Math.max(0.1, Math.min(2.0, num)) });
                          }}
                          type="number"
                          step="0.1"
                          description="Analog stick sensitivity (0.1-2.0)"
                        />
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-slate-200">Button Layout</label>
                          <select
                            value={settings.gamepadButtonLayout}
                            onChange={(e) => setSettings({ ...settings, gamepadButtonLayout: e.target.value as 'xbox' | 'playstation' })}
                            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200"
                          >
                            <option value="xbox">Xbox (A/B/X/Y)</option>
                            <option value="playstation">PlayStation (✕/◯/□/△)</option>
                          </select>
                          <p className="text-xs text-slate-400">Choose your controller button layout for on-screen prompts</p>
                        </div>
                      </>
                    )}
                  </div>
                </SettingsSection>
              </div>
            )}
          {
            activeTab === 'library' && (
              <div className="space-y-8 animate-fade-in h-full overflow-y-auto p-6">
                {/* Manual Folders Section (Moved to Top) */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-700/50 pb-2">
                    <div>
                      <h3 className="text-base font-bold text-white tracking-tight">Manual Folders</h3>
                      <p className="text-gray-400 text-xs mt-0.5">Add custom directories to scan for games</p>
                    </div>
                    <button
                      onClick={handleAddManualFolder}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors flex items-center gap-1.5 shadow-sm shadow-blue-500/20"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Folder
                    </button>
                  </div>

                  {Object.keys(manualFolderConfigs).length === 0 ? (
                    <div className="text-center py-6 bg-gray-800/30 rounded-lg border border-gray-700/50 border-dashed hover:bg-gray-800/50 transition-colors">
                      <p className="text-gray-500 text-xs">No custom folders added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.values(manualFolderConfigs).map((folderConfig) => (
                        <div key={folderConfig.id} className="border border-gray-700/50 rounded-lg p-3 bg-gray-800/40 hover:bg-gray-800/60 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1 min-w-0 mr-4">
                              <input
                                type="text"
                                value={folderConfig.name}
                                onChange={(e) => handleUpdateManualFolderName(folderConfig.id, e.target.value)}
                                onBlur={() => {
                                  const config = manualFolderConfigs[folderConfig.id];
                                  if (config && window.electronAPI.saveManualFolderConfig) {
                                    window.electronAPI.saveManualFolderConfig(config);
                                  }
                                }}
                                className="font-medium text-white text-sm bg-transparent border-none p-0 focus:ring-0 focus:underline max-w-[150px]"
                              />
                              {/* Inline Categories Badges */}
                              {folderConfig.autoCategory && folderConfig.autoCategory.length > 0 && (
                                <div className="flex items-center gap-1.5 overflow-hidden">
                                  {folderConfig.autoCategory.slice(0, 3).map(cat => (
                                    <span key={cat} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-700 text-gray-400 border border-gray-600/50 whitespace-nowrap">
                                      {cat}
                                    </span>
                                  ))}
                                  {folderConfig.autoCategory.length > 3 && (
                                    <span className="text-[10px] text-gray-500">+{folderConfig.autoCategory.length - 3}</span>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3 flex-shrink-0">
                              {folderConfig.enabled && (
                                <button
                                  onClick={() => setEditingManualFolderId(editingManualFolderId === folderConfig.id ? null : folderConfig.id)}
                                  className={`text-xs font-medium px-2 py-1 rounded transition-colors ${editingManualFolderId === folderConfig.id ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={async () => {
                                  const updated = { ...folderConfig, enabled: !folderConfig.enabled };
                                  if (window.electronAPI.saveManualFolderConfig) {
                                    await window.electronAPI.saveManualFolderConfig(updated);
                                    setManualFolderConfigs({ ...manualFolderConfigs, [folderConfig.id]: updated });
                                  }
                                }}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${folderConfig.enabled ? 'bg-blue-600' : 'bg-gray-600'}`}
                              >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${folderConfig.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                              </button>
                            </div>
                          </div>

                          {editingManualFolderId === folderConfig.id && folderConfig.enabled && (
                            <div className="space-y-3 mt-3 pt-3 border-t border-gray-700/50 animate-fade-in origin-top">
                              <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Path</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={folderConfig.path}
                                    readOnly
                                    className="w-full px-2.5 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-gray-300 font-mono"
                                  />
                                  <button
                                    onClick={() => handleRemoveManualFolder(folderConfig.path)}
                                    className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded border border-red-500/20 transition-colors whitespace-nowrap"
                                  >
                                    Remove
                                  </button>
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Auto Categories</label>
                                <div className="space-y-2">
                                  <div className="flex flex-wrap gap-2">
                                    {(['Games', 'Apps', 'VR'] as const).map((cat) => {
                                      const isSelected = folderConfig.autoCategory?.includes(cat);
                                      return (
                                        <button
                                          key={cat}
                                          onClick={async () => {
                                            const current = folderConfig.autoCategory || [];
                                            const updated = isSelected ? current.filter(c => c !== cat) : [...current, cat];
                                            const updatedConfig = { ...folderConfig, autoCategory: updated };
                                            setManualFolderConfigs({ ...manualFolderConfigs, [folderConfig.id]: updatedConfig });
                                            if (window.electronAPI.saveManualFolderConfig) {
                                              await window.electronAPI.saveManualFolderConfig(updatedConfig);
                                            }
                                          }}
                                          className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${isSelected ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'}`}
                                        >
                                          {cat}
                                        </button>
                                      );
                                    })}
                                  </div>
                                  <input
                                    type="text"
                                    placeholder="Custom categories (comma separated)"
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
                                    className="w-full bg-gray-900/50 border border-gray-600/50 rounded px-2.5 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-blue-500 transition-colors"
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Launchers Section */}
                <div className="space-y-4">
                  <div className="border-b border-gray-700/50 pb-2">
                    <h3 className="text-base font-bold text-white tracking-tight">Launchers</h3>
                    <p className="text-gray-400 text-xs mt-0.5">Configure platform integrations</p>
                  </div>

                  {isLoadingApps ? (
                    <div className="flex items-center justify-center p-8">
                      <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {apps.map((app) => (
                        <div key={app.id} className="bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 hover:bg-gray-800/60 transition-colors">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className={`font-medium text-sm ${app.enabled ? 'text-white' : 'text-gray-500'}`}>{app.name}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {app.enabled && (
                                <button
                                  onClick={() => setEditingAppId(editingAppId === app.id ? null : app.id)}
                                  className={`text-xs font-medium px-2 py-1 rounded transition-colors ${editingAppId === app.id ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                                >
                                  Edit
                                </button>
                              )}
                              <button
                                onClick={() => handleToggleAppEnabled(app.id)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${app.enabled ? 'bg-blue-600' : 'bg-gray-600'}`}
                              >
                                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm ${app.enabled ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
                              </button>
                            </div>
                          </div>

                          {editingAppId === app.id && app.enabled && (
                            <div className="mt-3 pt-3 border-t border-gray-700/50 space-y-4 animate-slide-down origin-top">
                              {/* Path Input */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Installation Path</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={app.path || ''}
                                    readOnly
                                    className="flex-1 px-2.5 py-1.5 bg-gray-900/50 border border-gray-600/50 rounded text-xs text-gray-300 font-mono"
                                    placeholder="Not configured"
                                  />
                                  <button
                                    onClick={() => handleBrowseApp(app.id)}
                                    className="px-2.5 py-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-xs font-medium rounded border border-blue-600/20 transition-colors whitespace-nowrap"
                                  >
                                    Change
                                  </button>
                                </div>
                              </div>

                              {/* Auto Categories */}
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Auto Categories</label>
                                <div className="space-y-2">
                                  <input
                                    type="text"
                                    placeholder="e.g. FPS, RPG (comma separated)"
                                    value={app.autoCategory?.join(', ') || ''}
                                    onChange={(e) => handleUpdateAppCategory(app.id, e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                                    className="w-full bg-gray-900/50 border border-gray-600/50 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 transition-colors"
                                  />
                                  <div className="flex flex-wrap gap-1.5">
                                    {['Favorite', 'Multiplayer', 'Completed'].map(cat => (
                                      <button
                                        key={cat}
                                        onClick={() => {
                                          const current = app.autoCategory || [];
                                          const updated = current.includes(cat) ? current.filter(c => c !== cat) : [...current, cat];
                                          handleUpdateAppCategory(app.id, updated);
                                        }}
                                        className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${app.autoCategory?.includes(cat) ? 'bg-blue-600/20 border-blue-500/50 text-blue-300' : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'}`}
                                      >
                                        {cat}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex justify-end pt-1">
                                <button
                                  onClick={() => handleScanApp(app.id)}
                                  disabled={scanningAppId === app.id}
                                  className="px-3 py-1.5 bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white text-xs rounded border border-gray-600/50 flex items-center gap-2 transition-colors disabled:opacity-50"
                                >
                                  {scanningAppId === app.id ? (
                                    <>
                                      <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                      <span>Scanning...</span>
                                    </>
                                  ) : (
                                    <>
                                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                      </svg>
                                      <span>Force Scan</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          }

          {
            activeTab === 'integrations' && (
              <div className="space-y-6 animate-fade-in p-6">
                <div className="space-y-1 mb-6">
                  <h3 className="text-lg font-semibold text-white mb-2">API Integrations</h3>
                  <p className="text-gray-400 text-sm">
                    Configure external services for metadata and images.
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex space-x-6 border-b border-gray-700/50 mb-6">
                  {(['steamgriddb', 'igdb', 'rawg'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveAPITab(tab)}
                      className={`pb-3 text-sm font-medium transition-all duration-200 border-b-2 capitalize relative ${activeAPITab === tab
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-400 hover:text-gray-200'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {tab === 'steamgriddb' ? 'SteamGridDB (Mandatory)' : tab === 'igdb' ? 'IGDB (Optional)' : 'RAWG (Optional)'}
                        {((tab === 'igdb' && apiStatus.igdbConfigured) ||
                          (tab === 'steamgriddb' && apiStatus.steamGridDBConfigured) ||
                          (tab === 'rawg' && apiStatus.rawgConfigured)) && (
                            <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                      </div>
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="animate-fade-in">
                  {/* SteamGridDB Input */}
                  {activeAPITab === 'steamgriddb' && (
                    <div className="space-y-6">
                      <SettingsInput
                        label="API Key"
                        value={apiCredentials.steamGridDBApiKey}
                        onChange={(val) => handleAPIInputChange('steamGridDBApiKey', val)}
                        placeholder="SteamGridDB API Key"
                        type="password"
                        description="Required for searching games and fetching artwork."
                      />
                    </div>
                  )}

                  {/* IGDB Inputs */}
                  {activeAPITab === 'igdb' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <SettingsInput
                          label="Client ID"
                          value={apiCredentials.igdbClientId}
                          onChange={(val) => handleAPIInputChange('igdbClientId', val)}
                          placeholder="IGDB Client ID"
                          description="Optional game metadata"
                        />
                        <SettingsInput
                          label="Client Secret"
                          value={apiCredentials.igdbClientSecret}
                          onChange={(val) => handleAPIInputChange('igdbClientSecret', val)}
                          placeholder="IGDB Client Secret"
                          type="password"
                          description="Keep this secret safe"
                        />
                      </div>
                    </div>
                  )}

                  {/* RAWG Input */}
                  {activeAPITab === 'rawg' && (
                    <div className="space-y-6">
                      <SettingsInput
                        label="API Key"
                        value={apiCredentials.rawgApiKey}
                        onChange={(val) => handleAPIInputChange('rawgApiKey', val)}
                        placeholder="RAWG API Key"
                        type="password"
                        description="Alternative metadata source (Optional)"
                      />
                    </div>
                  )}
                </div>
              </div>
            )
          }

          {activeTab === 'integrations' && (
            /* Scrollable Instructions */
            <div className="flex-1 overflow-y-auto p-6 border-t border-gray-700/50">
              <div className="space-y-6 animate-slide-up">
                {activeAPITab === 'igdb' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                      <span className="text-sm font-semibold uppercase tracking-wider">Instructions</span>
                    </div>
                    <h4 className="text-lg font-medium text-white">How to configure IGDB</h4>
                    <ol className="space-y-3 list-decimal list-inside text-gray-300 text-sm pl-2">
                      <li>Log in to the <button onClick={() => window.electronAPI?.openExternal('https://dev.twitch.tv/console')} className="text-blue-400 hover:text-blue-300 underline">Twitch Developer Console</button></li>
                      <li>Click <span className="font-semibold text-white">"Register Your Application"</span></li>
                      <li>Name it (e.g. "Onyx") and set Category to <span className="font-semibold text-white">"Game Integration"</span></li>
                      <li>Click <span className="font-semibold text-white">"Create"</span>, then <span className="font-semibold text-white">"Manage"</span></li>
                      <li>Copy the <strong className="text-white">Client ID</strong></li>
                      <li>Click <span className="font-semibold text-white">"New Secret"</span> to generate a <strong className="text-white">Client Secret</strong></li>
                    </ol>
                    <div className="p-4 bg-blue-900/10 border border-blue-500/10 rounded-lg mt-4">
                      <p className="text-xs text-blue-300">IGDB provides essential metadata like release dates, genres, and summaries.</p>
                    </div>
                  </div>
                )}

                {activeAPITab === 'steamgriddb' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                      <span className="text-sm font-semibold uppercase tracking-wider">Instructions</span>
                    </div>
                    <h4 className="text-lg font-medium text-white">How to configure SteamGridDB</h4>
                    <ol className="space-y-3 list-decimal list-inside text-gray-300 text-sm pl-2">
                      <li>Log in to the <button onClick={() => window.electronAPI?.openExternal('https://www.steamgriddb.com/profile/preferences/api')} className="text-blue-400 hover:text-blue-300 underline">SteamGridDB API Page</button></li>
                      <li>Click the <span className="font-semibold text-white">"Generate API Key"</span> button</li>
                      <li>Copy the generated key and paste it into the field above</li>
                    </ol>
                    <div className="p-4 bg-blue-900/10 border border-blue-500/10 rounded-lg mt-4">
                      <p className="text-xs text-blue-300">SteamGridDB is the best source for high-quality vertical covers, heroes, and logos.</p>
                    </div>
                  </div>
                )}

                {activeAPITab === 'rawg' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-blue-400 mb-2">
                      <span className="text-sm font-semibold uppercase tracking-wider">Instructions</span>
                    </div>
                    <h4 className="text-lg font-medium text-white">How to configure RAWG</h4>
                    <ol className="space-y-3 list-decimal list-inside text-gray-300 text-sm pl-2">
                      <li>Sign up for an account at <button onClick={() => window.electronAPI?.openExternal('https://rawg.io/apidocs')} className="text-blue-400 hover:text-blue-300 underline">RAWG API</button></li>
                      <li>Click <span className="font-semibold text-white">"Get API Key"</span> on your profile or API page</li>
                      <li>Copy the key and paste it into the field above</li>
                    </ol>
                    <div className="p-4 bg-blue-900/10 border border-blue-500/10 rounded-lg mt-4">
                      <p className="text-xs text-blue-300">RAWG is an optional secondary source for metadata.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}


          {
            activeTab === 'advanced' && (
              <div className="space-y-8 p-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white mb-2">Advanced Settings</h3>
                  <p className="text-gray-400 text-sm">
                    Manage system folders and dangerous settings.
                  </p>
                </div>

                {/* System Folders */}
                <div className="space-y-4">
                  <h4 className="text-base font-medium text-white">System Folders</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {/* Image Cache Folder */}
                    <div className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg border border-gray-600 hover:bg-gray-700/50 transition-colors">
                      <div className="flex-1 min-w-0 pr-3">
                        <h4 className="text-xs font-medium text-white mb-0.5">Image Cache</h4>
                        <p className="text-xs text-gray-500 font-mono truncate">Cache Directory</p>
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
                        <p className="text-xs text-gray-500 font-mono truncate">Config Directory</p>
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
                  </div>
                </div>

                {/* Danger Zone */}
                <div className="space-y-4 pt-6 border-t border-gray-700">
                  <h4 className="text-base font-medium text-red-400">Danger Zone</h4>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Remove All Games */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-white mb-2">Remove All Games</h3>
                        <p className="text-gray-400 text-sm mb-4">
                          Clear your game library while keeping all app settings and configurations.
                        </p>
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
                            </div>
                          </div>
                        </div>
                        {/* Confirmation UI */}
                        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                          {removeGamesConfirmation.step === 1 && (
                            <button
                              onClick={handleRemoveAllGames}
                              className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors text-sm"
                            >
                              Remove All Games
                            </button>
                          )}
                          {removeGamesConfirmation.step === 2 && (
                            <div className="space-y-3">
                              <p className="text-gray-300 text-sm font-medium">Type <span className="text-orange-400 font-bold">DELETE</span> to confirm:</p>
                              <input
                                type="text"
                                value={removeGamesConfirmation.typedText}
                                onChange={(e) => setRemoveGamesConfirmation({ ...removeGamesConfirmation, typedText: e.target.value })}
                                placeholder="Type DELETE"
                                className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-600 rounded-lg text-white text-sm"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button onClick={() => setRemoveGamesConfirmation({ step: 1, typedText: '' })} className="flex-1 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm">Cancel</button>
                                <button onClick={handleRemoveAllGames} disabled={removeGamesConfirmation.typedText !== 'DELETE'} className="flex-1 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 text-sm">Continue</button>
                              </div>
                            </div>
                          )}
                          {removeGamesConfirmation.step === 3 && (
                            <div className="space-y-3">
                              <p className="text-yellow-300 text-sm font-medium">Final Confirmation: Delete all games?</p>
                              <div className="flex gap-2">
                                <button onClick={() => setRemoveGamesConfirmation({ step: 1, typedText: '' })} className="flex-1 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm">Cancel</button>
                                <button onClick={handleRemoveAllGames} disabled={isRemovingGames} className="flex-1 px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm">{isRemovingGames ? 'Removing...' : 'Remove Now'}</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reset Application */}
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-white mb-2">Reset Application</h3>
                        <p className="text-gray-400 text-sm mb-4">
                          Completely reset Onyx to its initial installation state.
                        </p>
                        <div className="bg-red-900/20 border-2 border-red-500/50 rounded-lg p-4 mb-4">
                          <div className="flex items-start gap-3">
                            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <div className="flex-1">
                              <h4 className="text-red-400 font-semibold mb-2">This will permanently delete EVERYTHING:</h4>
                              <ul className="list-disc list-inside text-red-300 text-sm space-y-1">
                                <li>All games, metadata, and images</li>
                                <li>All app configurations and settings</li>
                              </ul>
                            </div>
                          </div>
                        </div>
                        {/* Confirmation UI */}
                        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                          {resetConfirmation.step === 1 && (
                            <button
                              onClick={handleReset}
                              className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-sm"
                            >
                              Factory Reset
                            </button>
                          )}
                          {resetConfirmation.step === 2 && (
                            <div className="space-y-3">
                              <p className="text-gray-300 text-sm font-medium">Type <span className="text-red-400 font-bold">RESET</span> to confirm:</p>
                              <input
                                type="text"
                                value={resetConfirmation.typedText}
                                onChange={(e) => setResetConfirmation({ ...resetConfirmation, typedText: e.target.value })}
                                placeholder="Type RESET"
                                className="w-full px-3 py-2 bg-gray-800 border-2 border-gray-600 rounded-lg text-white text-sm"
                                autoFocus
                              />
                              <div className="flex gap-2">
                                <button onClick={() => setResetConfirmation({ step: 1, typedText: '' })} className="flex-1 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm">Cancel</button>
                                <button onClick={handleReset} disabled={resetConfirmation.typedText !== 'RESET'} className="flex-1 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 text-sm">Continue</button>
                              </div>
                            </div>
                          )}
                          {resetConfirmation.step === 3 && (
                            <div className="space-y-3">
                              <p className="text-yellow-300 text-sm font-medium">Final Confirmation: Reset everything?</p>
                              <div className="flex gap-2">
                                <button onClick={() => setResetConfirmation({ step: 1, typedText: '' })} className="flex-1 px-3 py-1.5 bg-gray-700 text-white rounded-lg text-sm">Cancel</button>
                                <button onClick={handleReset} disabled={isResetting} className="flex-1 px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">{isResetting ? 'Resetting...' : 'Reset Now'}</button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          {/* DISABLED: Suspend feature (Future Feature) */}


          {
            activeTab === 'about' && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-8">
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
                  <h2 className="text-3xl font-bold text-white tracking-wide">Onyx{__BUILD_PROFILE__ === 'alpha' ? ' Alpha' : ''}</h2>
                  <span className="text-sm font-medium text-slate-500 mt-1">v{appVersion}</span>
                </div>

                {/* Check for updates (packaged app only) */}
                {window.electronAPI.checkForUpdates && (
                  <div className="flex flex-col items-center gap-3 mt-2">
                    <button
                      onClick={() => {
                        setUpdateError(null);
                        setUpdateStatus('checking');
                        window.electronAPI.checkForUpdates?.();
                      }}
                      disabled={updateStatus === 'checking' || updateStatus === 'downloading'}
                      className="px-4 py-2 rounded-lg bg-slate-700/50 text-slate-200 hover:bg-slate-600/50 transition-colors border border-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {updateStatus === 'checking' || updateStatus === 'downloading' ? 'Checking...' : 'Check for Updates'}
                    </button>
                    {updateStatus === 'available' && updateVersion && (
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm text-emerald-400">Update available: v{updateVersion}</p>
                        <button
                          onClick={async () => {
                            setUpdateStatus('downloading');
                            const result = await window.electronAPI.downloadUpdate?.();
                            if (result?.success) setUpdateStatus('downloaded');
                            else setUpdateError(result?.error ?? 'Download failed');
                          }}
                          className="px-4 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-sm font-medium"
                        >
                          Download Update
                        </button>
                      </div>
                    )}
                    {updateStatus === 'downloaded' && (
                      <div className="flex flex-col items-center gap-2">
                        <p className="text-sm text-emerald-400">Update ready. Restart to install.</p>
                        <button
                          onClick={() => window.electronAPI.quitAndInstall?.()}
                          className="px-4 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-sm font-medium"
                        >
                          Restart to Update
                        </button>
                      </div>
                    )}
                    {updateStatus === 'not-available' && (
                      <p className="text-sm text-slate-500">You’re on the latest version.</p>
                    )}
                    {updateStatus === 'error' && updateError && (
                      <p className="text-sm text-red-400 max-w-xs text-center">{updateError}</p>
                    )}
                  </div>
                )}

                {/* Bug Report Button (Alpha only) */}
                {__BUILD_PROFILE__ === 'alpha' && (
                  <button
                    onClick={() => {
                      onClose();
                      // We need a way to open the bug report modal from here
                      // For now, it's just in the MenuBar, but we could add it here too
                      // For now I will just show it in the MenuBar as before
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 transition-all duration-300 border border-yellow-500/20"
                  >
                    Found a bug?
                  </button>
                )}

                {/* Bio / Story */}
                <div className="max-w-md space-y-4">
                  <p className="text-slate-400 leading-relaxed">
                    Onyx is a passion project built by a single developer who just wanted a better way to launch games.
                  </p>
                  <p className="text-slate-400 leading-relaxed font-medium">
                    No ads, no bloat—just games.
                  </p>
                  {/* API Credits */}
                  <div className="pt-4 border-t border-slate-700/50 mt-4">
                    <p className="text-xs text-slate-500">
                      Powered by <span className="text-slate-400 font-medium">IGDB</span>, <span className="text-slate-400 font-medium">SteamGridDB</span>, and <span className="text-slate-400 font-medium">RAWG.io</span>
                    </p>
                  </div>
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

                  {/* Official Website */}
                  <button
                    onClick={async () => {
                      try {
                        if (window.electronAPI && window.electronAPI.openExternal) {
                          const result = await window.electronAPI.openExternal('https://onyxlauncher.co.uk/');
                          if (!result.success) {
                            console.error('Failed to open external URL:', result.error);
                          }
                        }
                      } catch (error) {
                        console.error('Failed to open external URL:', error);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-700/10 text-slate-200 hover:bg-slate-700/20 transition-all duration-300 border border-slate-700/20 hover:scale-105"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2a10 10 0 100 20 10 10 0 000-20zM2 12h20M12 2v20" />
                    </svg>
                    <span>Official Website</span>
                  </button>

                  {/* Reddit */}
                  <button
                    onClick={async () => {
                      try {
                        if (window.electronAPI && window.electronAPI.openExternal) {
                          const result = await window.electronAPI.openExternal('https://www.reddit.com/r/OnyxLauncher/');
                          if (!result.success) {
                            console.error('Failed to open external URL:', result.error);
                          }
                        }
                      } catch (error) {
                        console.error('Failed to open external URL:', error);
                      }
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF4500]/10 text-[#FF4500] hover:bg-[#FF4500]/20 transition-all duration-300 border border-[#FF4500]/20 hover:scale-105"
                  >
                    <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M22 12c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2s10 4.477 10 10zM12 8a1.5 1.5 0 110-3 1.5 1.5 0 010 3zM7.5 13.5c1.5 1 4.5 1 6 0M16.5 13.5c-1.5 1-4.5 1-6 0" />
                    </svg>
                    <span>Visit Reddit</span>
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
            )
          }
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-700/50 bg-gray-900 flex justify-end gap-3 z-10 relative">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors font-medium text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-blue-600/20 text-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </SettingsLayout >
  );
};



