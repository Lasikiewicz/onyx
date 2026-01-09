import React, { useState, useEffect } from 'react';
import iconPng from '../../../resources/icon.png';
import iconSvg from '../../../resources/icon.svg';

interface OnyxSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  initialTab?: 'general' | 'appearance' | 'apis' | 'apps' | 'reset' | 'about';
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

type TabType = 'general' | 'appearance' | 'apis' | 'apps' | 'reset' | 'about';

interface AppConfig {
  id: string;
  name: string;
  enabled: boolean;
  path: string;
  defaultPaths: string[];
  placeholder: string;
  autoAdd?: boolean;
}

interface APICredentials {
  igdbClientId: string;
  igdbClientSecret: string;
  steamGridDBApiKey: string;
}

type APITabType = 'igdb' | 'steamgriddb';

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
        } catch (error) {
          console.error('Error loading Onyx settings:', error);
        }
      };
      loadSettings();
    }
  }, [isOpen]);

  // Load API credentials on mount
  useEffect(() => {
    if (isOpen) {
      const loadAPICredentials = async () => {
        try {
          const creds = await window.electronAPI.getAPICredentials();
          setApiCredentials({
            igdbClientId: creds.igdbClientId || '',
            igdbClientSecret: creds.igdbClientSecret || '',
            steamGridDBApiKey: creds.steamGridDBApiKey || '',
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

  // Load app configs on mount
  useEffect(() => {
    if (isOpen) {
      const loadAppConfigs = async () => {
        setIsLoadingApps(true);
        try {
          const savedConfigs = await window.electronAPI.getAppConfigs();
          
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
                };
              }

              let path = '';
              let enabled = false;

              if (app.id === 'steam' && steamPath) {
                path = steamPath;
                enabled = true;
              } else {
                const existingPath = await findExistingPath(app.defaultPaths);
                if (existingPath) {
                  path = existingPath;
                  enabled = false;
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

  const handlePaddingChange = (value: number) => {
    setSettings({ ...settings, gameTilePadding: value });
  };

  const handleRestoreDefaults = () => {
    setSettings({
      ...settings,
      hideGameTitles: false,
      gameTilePadding: 16,
    });
  };

  const handleAPIInputChange = (key: keyof APICredentials, value: string) => {
    setApiCredentials((prev) => ({ ...prev, [key]: value }));
    setApiSaveStatus('idle');
  };

  const handleAPISave = async () => {
    setIsLoadingAPI(true);
    setApiSaveStatus('saving');
    try {
      await window.electronAPI.saveAPICredentials({
        igdbClientId: apiCredentials.igdbClientId.trim(),
        igdbClientSecret: apiCredentials.igdbClientSecret.trim(),
        steamGridDBApiKey: apiCredentials.steamGridDBApiKey.trim(),
      });
      setApiSaveStatus('success');
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

  const handleOpenSteamGridDB = async () => {
    try {
      await window.electronAPI.openExternal('https://www.steamgriddb.com/profile/preferences/api');
    } catch (error) {
      console.error('Error opening SteamGridDB API page:', error);
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
  const handleSteamImportAll = async (): Promise<any> => {
    const steamApp = apps.find(a => a.id === 'steam');
    if (!steamApp || !steamApp.path) {
      alert('Please configure Steam path first');
      return;
    }

    // setIsImporting(true);
    try {
      if (!window.electronAPI.importAllSteamGames) return;
      const result = await window.electronAPI.importAllSteamGames(steamApp.path);
      if (result.success) {
        alert(`Successfully imported ${result.importedCount} Steam games!`);
        if (onSave) {
          await onSave();
        }
      } else {
        alert(result.error || 'Failed to import Steam games');
      }
    } catch (err) {
      console.error('Error importing Steam games:', err);
      alert('Failed to import Steam games');
    } finally {
      // setIsImporting(false);
    }
  };

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
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'apps',
      label: 'Apps',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'appearance',
      label: 'Appearance',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      ),
    },
    {
      id: 'apis',
      label: "API's",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      ),
    },
    {
      id: 'reset',
      label: 'Reset',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
        onClick={onClose}
      />
      
      {/* Modal - Centered */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700/50 w-full max-w-[1400px] max-h-[90vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-gray-700/50 bg-gray-800/95 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <img 
                  src={iconPng} 
                  alt="Onyx" 
                  className="w-7 h-7"
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
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-4 border-b border-gray-700/50 bg-gray-800/50">
            <div className="flex flex-wrap gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg font-medium transition-all ${
                    activeTab === tab.id
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
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        settings.minimizeToTray ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          settings.minimizeToTray ? 'translate-x-6' : 'translate-x-1'
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
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        settings.showSystemTrayIcon ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          settings.showSystemTrayIcon ? 'translate-x-6' : 'translate-x-1'
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
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        settings.startWithComputer ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          settings.startWithComputer ? 'translate-x-6' : 'translate-x-1'
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
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        settings.startClosedToTray ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          settings.startClosedToTray ? 'translate-x-6' : 'translate-x-1'
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
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        settings.updateLibrariesOnStartup ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          settings.updateLibrariesOnStartup ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
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
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        settings.minimizeOnGameLaunch ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          settings.minimizeOnGameLaunch ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white mb-4">Library Display</h3>
                  
                  {/* Settings Grid - 2 columns */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Hide game titles */}
                  <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                    <div className="flex-1 pr-4">
                      <label className="text-gray-200 font-medium block mb-1">
                        Hide Game Titles
                      </label>
                      <p className="text-gray-400 text-sm">
                        Hide game titles on game tiles for a cleaner, image-focused view
                      </p>
                    </div>
                    <button
                      onClick={() => handleToggle('hideGameTitles')}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        settings.hideGameTitles ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          settings.hideGameTitles ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Game tile padding - Full width */}
                  <div className="lg:col-span-2 p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 pr-4">
                        <label className="text-gray-200 font-medium block mb-1">
                          Game Tile Padding
                        </label>
                        <p className="text-gray-400 text-sm">
                          Adjust the spacing between game tiles (in pixels)
                        </p>
                      </div>
                      <div className="text-blue-400 font-semibold min-w-[3rem] text-right">
                        {settings.gameTilePadding}px
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <input
                        type="range"
                        min="4"
                        max="32"
                        step="2"
                        value={settings.gameTilePadding}
                        onChange={(e) => handlePaddingChange(Number(e.target.value))}
                        className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePaddingChange(Math.max(4, settings.gameTilePadding - 2))}
                          className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-lg transition-colors"
                        >
                          -
                        </button>
                        <button
                          onClick={() => handlePaddingChange(Math.min(32, settings.gameTilePadding + 2))}
                          className="px-3 py-1.5 text-sm bg-gray-600 hover:bg-gray-500 text-gray-200 rounded-lg transition-colors"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-2">
                      <span>Compact</span>
                      <span>Spacious</span>
                    </div>
                  </div>

                  {/* Show Logo Over Boxart */}
                  <div className="flex items-start justify-between p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                    <div className="flex-1 pr-4">
                      <label className="text-gray-200 font-medium block mb-1">
                        Show Logo Over Boxart
                      </label>
                      <p className="text-gray-400 text-sm">
                        Display game logos overlaid on boxart images in the grid view
                      </p>
                    </div>
                    <button
                      onClick={() => setShowLogoOverBoxart(!showLogoOverBoxart)}
                      className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors flex-shrink-0 ${
                        showLogoOverBoxart ? 'bg-blue-600' : 'bg-gray-600'
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                          showLogoOverBoxart ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Logo Position */}
                  {showLogoOverBoxart && (
                    <div className="lg:col-span-2 p-4 rounded-lg bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex-1 pr-4">
                          <label className="text-gray-200 font-medium block mb-1">
                            Logo Position
                          </label>
                          <p className="text-gray-400 text-sm">
                            Choose where logos appear on game tiles
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {(['top', 'middle', 'bottom', 'underneath'] as const).map((position) => (
                          <button
                            key={position}
                            onClick={() => setLogoPosition(position)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              logoPosition === position
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                            }`}
                          >
                            {position.charAt(0).toUpperCase() + position.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  </div>

                  {/* Restore Defaults Button */}
                  <div className="pt-4 border-t border-gray-700/50">
                    <button
                      onClick={() => {
                        handleRestoreDefaults();
                        setShowLogoOverBoxart(true);
                        setLogoPosition('middle');
                      }}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 rounded-lg transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Restore Defaults
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'apis' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white mb-4">API Credentials</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    Configure API credentials for enhanced game metadata and artwork
                  </p>
                  
                  {/* API Tabs */}
                  <div className="border-b border-gray-700 mb-6">
                    <nav className="flex space-x-8" aria-label="API Tabs">
                      <button
                        onClick={() => setActiveAPITab('igdb')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeAPITab === 'igdb'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                        }`}
                      >
                        IGDB
                      </button>
                      <button
                        onClick={() => setActiveAPITab('steamgriddb')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                          activeAPITab === 'steamgriddb'
                            ? 'border-blue-500 text-blue-400'
                            : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                        }`}
                      >
                        SteamGridDB
                      </button>
                    </nav>
                  </div>

                  {/* IGDB Tab Content */}
                  {activeAPITab === 'igdb' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column - Instructions */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-base font-medium text-white mb-2">IGDB API</h4>
                          <p className="text-sm text-gray-400 mb-4">
                            IGDB (Internet Game Database) provides comprehensive game metadata including covers, screenshots, descriptions, genres, and more.
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

                  {/* SteamGridDB Tab Content */}
                  {activeAPITab === 'steamgriddb' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Left Column - Instructions */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-base font-medium text-white mb-2">SteamGridDB API</h4>
                          <p className="text-sm text-gray-400 mb-4">
                            SteamGridDB provides high-quality game artwork including box art, banners, logos, and hero images. Perfect for customizing your game library's appearance.
                          </p>
                          
                          {/* Instructions */}
                          <div className="bg-gray-900/50 rounded-lg p-4 border border-gray-700">
                            <h5 className="text-sm font-medium text-white mb-2">How to obtain SteamGridDB API key:</h5>
                            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-300">
                              <li>
                                Visit{' '}
                                <button
                                  onClick={handleOpenSteamGridDB}
                                  className="text-blue-400 hover:text-blue-300 underline"
                                >
                                  SteamGridDB Profile Preferences
                                </button>
                                {' '}at https://www.steamgriddb.com/profile/preferences/api
                              </li>
                              <li>Sign in with your SteamGridDB account (create one if needed)</li>
                              <li>Navigate to the "API" section in your profile preferences</li>
                              <li>Click "Generate API Key" to create a new API key</li>
                              <li>Copy the generated API key</li>
                              <li>Paste it into the field on the right</li>
                            </ol>
                            <div className="mt-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded text-xs text-blue-300">
                              <strong>Note:</strong> SteamGridDB API keys are free and help support the community-driven artwork database.
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Input Fields */}
                      <div className="space-y-4">
                        {/* API Key Input */}
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-gray-200">
                            API Key
                          </label>
                          <input
                            type="password"
                            value={apiCredentials.steamGridDBApiKey}
                            onChange={(e) => handleAPIInputChange('steamGridDBApiKey', e.target.value)}
                            placeholder="Enter your SteamGridDB API Key"
                            className="w-full px-4 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                          <p className="text-xs text-gray-500">
                            Your API key is stored securely and used to fetch game artwork
                          </p>
                        </div>

                        {/* Status Message */}
                        {apiSaveStatus === 'success' && activeAPITab === 'steamgriddb' && (
                          <div className="bg-green-900/30 border border-green-700 text-green-300 px-4 py-2 rounded-lg text-sm">
                            SteamGridDB API key saved successfully! Service will be restarted.
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {apps.map((app) => (
                        <div key={app.id} className="border border-gray-700 rounded-lg p-4 bg-gray-700/30 hover:bg-gray-700/50 transition-colors">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">
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
                              <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                          </div>
                          
                          {app.enabled && (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-sm text-gray-400 mb-2">
                                  Installation Path
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={app.path}
                                    onChange={(e) => handleAppPathChange(app.id, e.target.value)}
                                    placeholder={app.placeholder}
                                    className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <button
                                    onClick={() => handleBrowseApp(app.id)}
                                    className="px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                                  >
                                    Browse
                                  </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                  Path to your {app.name} installation directory
                                </p>
                              </div>
                              
                              {/* Steam-specific options */}
                              {app.id === 'steam' && (
                                <div className="space-y-3 pt-2 border-t border-gray-600">
                                  {/* Steam Authentication Status */}
                                  <div className="flex items-center justify-between p-2 bg-gray-800/50 rounded">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${steamAuthState.authenticated ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                                      <span className="text-xs text-gray-300">
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
                                  
                                  {/* Sign into Steam button - only show when not authenticated */}
                                  {!steamAuthState.authenticated && (
                                    <button
                                      onClick={handleSteamAuthenticate}
                                      disabled={isAuthenticating}
                                      className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                      {isAuthenticating ? (
                                        <>
                                          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                          </svg>
                                          Authenticating...
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                                          </svg>
                                          Sign into Steam
                                        </>
                                      )}
                                    </button>
                                  )}
                                  
                                  {/* Import installed games button - only show when authenticated */}
                                  {steamAuthState.authenticated && (
                                    <button
                                      onClick={() => handleScanApp(app.id)}
                                      disabled={scanningAppId === app.id || !app.path}
                                      className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                          </svg>
                                          Import installed games
                                        </>
                                      )}
                                    </button>
                                  )}
                                  
                                  {/* Auto add toggle - only show when authenticated */}
                                  {steamAuthState.authenticated && (
                                    <div className="flex items-center justify-between p-2 bg-gray-800/30 rounded">
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
                                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                      </label>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* Scan Now button for newly enabled apps (non-Steam) */}
                              {app.id !== 'steam' && newlyEnabledApps.has(app.id) && app.path && (
                                <div className="flex items-center gap-2 pt-2">
                                  <button
                                    onClick={() => handleScanApp(app.id)}
                                    disabled={scanningAppId === app.id}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reset' && (
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white mb-2">Reset Application</h3>
                  <p className="text-gray-400 text-sm mb-6">
                    This will completely reset Onyx to its default state. All data will be permanently deleted.
                  </p>
                  
                  {/* Warning Box */}
                  <div className="bg-red-900/20 border-2 border-red-500/50 rounded-lg p-6 mb-6">
                    <div className="flex items-start gap-4">
                      <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <div className="flex-1">
                        <h4 className="text-red-400 font-semibold mb-2">Warning: This action cannot be undone!</h4>
                        <p className="text-red-300 text-sm mb-4">
                          Resetting the application will permanently delete:
                        </p>
                        <ul className="list-disc list-inside text-red-300 text-sm space-y-1 ml-2">
                          <li>All games in your library</li>
                          <li>All game metadata and images</li>
                          <li>All app configurations (Steam, Xbox, etc.)</li>
                          <li>All user preferences and settings</li>
                          <li>All API credentials</li>
                        </ul>
                        <p className="text-red-200 text-sm mt-4 font-medium">
                          This will restore Onyx to a fresh installation state. You will need to reconfigure everything from scratch.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Confirmation Section */}
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6">
                    {resetConfirmation.step === 1 && (
                      <div className="space-y-4">
                        <p className="text-gray-300 text-sm">
                          To confirm you understand the consequences, click the button below to proceed with the reset process.
                        </p>
                        <button
                          onClick={handleReset}
                          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                        >
                          I Understand, Proceed with Reset
                        </button>
                      </div>
                    )}

                    {resetConfirmation.step === 2 && (
                      <div className="space-y-4">
                        <p className="text-gray-300 text-sm font-medium mb-2">
                          Type <span className="text-red-400 font-bold">RESET</span> in the box below to confirm:
                        </p>
                        <input
                          type="text"
                          value={resetConfirmation.typedText}
                          onChange={(e) => setResetConfirmation({ ...resetConfirmation, typedText: e.target.value })}
                          placeholder="Type RESET here"
                          className="w-full px-4 py-3 bg-gray-800 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                          autoFocus
                        />
                        <div className="flex gap-3">
                          <button
                            onClick={() => setResetConfirmation({ step: 1, typedText: '' })}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleReset}
                            disabled={resetConfirmation.typedText !== 'RESET'}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Continue
                          </button>
                        </div>
                      </div>
                    )}

                    {resetConfirmation.step === 3 && (
                      <div className="space-y-4">
                        <div className="bg-yellow-900/20 border border-yellow-500/50 rounded-lg p-4">
                          <p className="text-yellow-300 text-sm font-medium mb-2">
                            Final Confirmation Required
                          </p>
                          <p className="text-yellow-200 text-sm">
                            This is your last chance to cancel. Clicking "Reset Now" will immediately and permanently delete all your data.
                          </p>
                        </div>
                        <div className="flex gap-3">
                          <button
                            onClick={() => setResetConfirmation({ step: 1, typedText: '' })}
                            disabled={isResetting}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleReset}
                            disabled={isResetting}
                            className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                          const result = await window.electronAPI.openExternal('https://discord.gg/PLACEHOLDER');
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
                    <span>Join Community</span>
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
