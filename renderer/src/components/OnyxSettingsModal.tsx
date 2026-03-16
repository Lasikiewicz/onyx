import React, { useState, useEffect, useRef } from 'react';
import { SettingsLayout } from './settings/SettingsLayout';
import { SettingsSidebar, SettingsTab } from './settings/SettingsSidebar';
import { SettingsSection, SettingsToggle, SettingsInput } from './settings/SettingsComponents';
import { SettingsIntegrationsTab } from './settings/SettingsIntegrationsTab';
import { SettingsAboutTab } from './settings/SettingsAboutTab';
import { LINK_DISPLAY_ORDER, DEFAULT_VISIBLE_LINK_TYPES, LINK_DISPLAY_NAME_TO_KEY, LinkIcon } from './GameLinks';
import { LauncherIcon } from '../utils/launcherIcons';
import manualFolderIconBaseline from '../assets/manual-folder-icons/baseline-games.svg';
import manualFolderIconVariant1 from '../assets/manual-folder-icons/games-variant-1.svg';
import manualFolderIconVariant2 from '../assets/manual-folder-icons/games-variant-2.svg';
import manualFolderIconVariant3 from '../assets/manual-folder-icons/games-variant-3.svg';
import manualFolderIconApps16Filled from '../assets/manual-folder-icons/apps-16-filled.svg';
import manualFolderIconAppsFilled from '../assets/manual-folder-icons/apps-filled.svg';
import manualFolderIconAppsOutline from '../assets/manual-folder-icons/apps-outline.svg';
import manualFolderIconBadgeVrFill from '../assets/manual-folder-icons/badge-vr-fill.svg';
import manualFolderIconBadgeVrOutline from '../assets/manual-folder-icons/badge-vr-outline.svg';
import manualFolderIconVrCompact from '../assets/manual-folder-icons/vr-compact.svg';
import manualFolderIconVrBadge from '../assets/manual-folder-icons/vr-badge.svg';
import manualFolderIconVrGogglesFilled from '../assets/manual-folder-icons/vr-goggles-filled.svg';
import manualFolderIconVrGogglesOutline from '../assets/manual-folder-icons/vr-goggles-outline.svg';
import manualFolderIconVrSquare from '../assets/manual-folder-icons/vr-square.svg';

interface OnyxSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  // Allow both old and new tab names for compatibility during migration
  initialTab?: 'general' | 'apis' | 'apps' | 'reset' | 'about' | 'appearance' | 'integrations' | 'launchers' | 'library' | 'links' | 'advanced' | 'suspend' | 'animations';
  onShowImportModal?: (games: Array<any>, appType?: 'steam' | 'xbox' | 'other') => void;
}

interface OnyxSettings {
  minimizeToTray: boolean;
  showSystemTrayIcon: boolean;
  startWithComputer: boolean;
  startMinimized: boolean;
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
  disableAllAnimations: boolean;
  disableAnimatedBanners: boolean;
  disableAnimatedBoxarts: boolean;
  disableAnimatedBackgrounds: boolean;
  disableAnimatedIcons: boolean;
  disableAnimatedLogos: boolean;
  // Fullscreen settings
  startInFullscreen: boolean;
  hideMouseCursorInFullscreen: boolean;
  cursorHideTimeout: number;
  linkDisplayMode: 'icons' | 'dropdown';
  enableSuspendFeature: boolean;
  suspendShortcut: string;
}

type TabType = 'general' | 'scanning' | 'library' | 'launchers' | 'integrations' | 'links' | 'appearance' | 'animations' | 'advanced' | 'suspend' | 'about'; // Keep legacy types for state compatibility, but UI will hide them

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
  giantBombApiKey: string;
}

interface ManualFolderConfig {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  autoCategory?: string[];
  icon?: string;
}

const MANUAL_FOLDER_ICON_PRESETS: Array<{ id: string; name: string; src: string }> = [
  { id: 'baseline-games', name: 'Baseline Games', src: manualFolderIconBaseline },
  { id: 'games-variant-1', name: 'Games 1', src: manualFolderIconVariant1 },
  { id: 'games-variant-2', name: 'Games 2', src: manualFolderIconVariant2 },
  { id: 'games-variant-3', name: 'Games 3', src: manualFolderIconVariant3 },
  { id: 'apps-16-filled', name: 'Apps 16 Filled', src: manualFolderIconApps16Filled },
  { id: 'apps-filled', name: 'Apps Filled', src: manualFolderIconAppsFilled },
  { id: 'apps-outline', name: 'Apps Outline', src: manualFolderIconAppsOutline },
  { id: 'badge-vr-fill', name: 'Badge VR Filled', src: manualFolderIconBadgeVrFill },
  { id: 'badge-vr-outline', name: 'Badge VR Outline', src: manualFolderIconBadgeVrOutline },
  { id: 'vr-compact', name: 'VR Compact', src: manualFolderIconVrCompact },
  { id: 'vr-badge', name: 'VR Badge', src: manualFolderIconVrBadge },
  { id: 'vr-goggles-filled', name: 'VR Goggles Filled', src: manualFolderIconVrGogglesFilled },
  { id: 'vr-goggles-outline', name: 'VR Goggles Outline', src: manualFolderIconVrGogglesOutline },
  { id: 'vr-square', name: 'VR Square', src: manualFolderIconVrSquare },
];

const getManualFolderIconPreset = (iconId?: string): { id: string; name: string; src: string } | undefined =>
  MANUAL_FOLDER_ICON_PRESETS.find(preset => preset.id === iconId);

type APITabType = 'igdb' | 'rawg' | 'steamgriddb' | 'giantbomb';

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

const sanitizeUpdateErrorForDisplay = (error?: string | null): string | null => {
  if (!error) return null;
  const trimmed = error.trim();
  if (!trimmed) return null;

  if (/<!doctype html|<html|<head|<body|<style|<script|<div|<span/i.test(trimmed)) {
    return 'Update check failed due to an unexpected server response. Please try again.';
  }

  const singleLine = trimmed.replace(/\s+/g, ' ');
  return singleLine.length > 220 ? `${singleLine.slice(0, 217)}...` : singleLine;
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
    giantBombApiKey: '',
  });
  const [activeAPITab, setActiveAPITab] = useState<APITabType>('steamgriddb');
  const [apps, setApps] = useState<AppConfig[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [scanningAppId, setScanningAppId] = useState<string | null>(null);

  const [manualFolders, setManualFolders] = useState<string[]>([]);
  const [manualFolderConfigs, setManualFolderConfigs] = useState<Record<string, ManualFolderConfig>>({});
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editingManualFolderId, setEditingManualFolderId] = useState<string | null>(null);

  const [settings, setSettings] = useState<OnyxSettings>({
    minimizeToTray: false,
    showSystemTrayIcon: true,
    startWithComputer: false,
    startMinimized: false,
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
    disableAllAnimations: false,
    disableAnimatedBanners: false,
    disableAnimatedBoxarts: false,
    disableAnimatedBackgrounds: false,
    disableAnimatedIcons: false,
    disableAnimatedLogos: false,
    startInFullscreen: false,
    hideMouseCursorInFullscreen: true,
    cursorHideTimeout: 3000,
    linkDisplayMode: 'icons',
    enableSuspendFeature: false,
    suspendShortcut: 'Ctrl+Shift+S',
  });
  const [showLogoOverBoxart, setShowLogoOverBoxart] = useState(true);
  const [logoPosition, setLogoPosition] = useState<'top' | 'middle' | 'bottom' | 'underneath'>('middle');
  const [appVersion, setAppVersion] = useState<string>('0.0.0');
  const [isPackagedApp, setIsPackagedApp] = useState<boolean>(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const updateCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [backgroundScanEnabled, setBackgroundScanEnabled] = useState(false);
  const [backgroundScanIntervalMinutes, setBackgroundScanIntervalMinutes] = useState(30);

  const [linkVisibleTypes, setLinkVisibleTypes] = useState<Record<string, boolean>>(DEFAULT_VISIBLE_LINK_TYPES);
  const [linkDisplayOrder, setLinkDisplayOrder] = useState<string[]>(LINK_DISPLAY_ORDER);
  const [isCapturingSuspendShortcut, setIsCapturingSuspendShortcut] = useState(false);
  const [suspendShortcutCaptureError, setSuspendShortcutCaptureError] = useState<string | null>(null);

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
            startMinimized: prefs.startMinimized ?? false,
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
            disableAllAnimations: prefs.disableAllAnimations ?? false,
                  disableAnimatedBanners: prefs.disableAnimatedBanners ?? false,
                  disableAnimatedBoxarts: prefs.disableAnimatedBoxarts ?? false,
                  disableAnimatedBackgrounds: prefs.disableAnimatedBackgrounds ?? false,
                  disableAnimatedIcons: prefs.disableAnimatedIcons ?? false,
                  disableAnimatedLogos: prefs.disableAnimatedLogos ?? false,
            startInFullscreen: prefs.startInFullscreen ?? false,
            hideMouseCursorInFullscreen: prefs.hideMouseCursorInFullscreen ?? true,
            cursorHideTimeout: prefs.cursorHideTimeout ?? 3000,
            linkDisplayMode: prefs.linkDisplayMode ?? 'icons',
            enableSuspendFeature: prefs.enableSuspendFeature ?? false,
            suspendShortcut: prefs.suspendShortcut ?? 'Ctrl+Shift+S',
          });
          setShowLogoOverBoxart(prefs.showLogoOverBoxart ?? true);
          setLogoPosition(prefs.logoPosition ?? 'middle');

          if (prefs.visibleLinkTypes && Object.keys(prefs.visibleLinkTypes).length > 0) {
            setLinkVisibleTypes(prefs.visibleLinkTypes);
          } else {
            setLinkVisibleTypes(DEFAULT_VISIBLE_LINK_TYPES);
          }
          if (prefs.linkDisplayOrder && prefs.linkDisplayOrder.length > 0) {
            setLinkDisplayOrder(prefs.linkDisplayOrder);
          } else {
            setLinkDisplayOrder(LINK_DISPLAY_ORDER);
          }

          // Load app version
          try {
            const version = await window.electronAPI.getVersion();
            setAppVersion(version);
          } catch (error) {
            console.error('Error loading app version:', error);
          }

          // Determine whether auto-updater is active in this runtime
          try {
            const packaged = await window.electronAPI.isPackaged?.();
            setIsPackagedApp(Boolean(packaged));
          } catch (error) {
            console.error('Error loading packaged state:', error);
            setIsPackagedApp(false);
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
      if (updateCheckTimeoutRef.current) {
        clearTimeout(updateCheckTimeoutRef.current);
        updateCheckTimeoutRef.current = null;
      }
      setUpdateStatus(payload.status as any);
      setUpdateVersion(payload.version ?? null);
      setUpdateError(sanitizeUpdateErrorForDisplay(payload.error ?? null));
    });
    return () => {
      if (updateCheckTimeoutRef.current) {
        clearTimeout(updateCheckTimeoutRef.current);
        updateCheckTimeoutRef.current = null;
      }
      unsubscribe();
    };
  }, [isOpen]);

  const [apiStatus, setApiStatus] = useState<{
    igdbConfigured: boolean;
    rawgConfigured: boolean;
    steamGridDBConfigured: boolean;
    giantBombConfigured: boolean;
    allRequiredConfigured: boolean;
  }>({
    igdbConfigured: false,
    rawgConfigured: false,
    steamGridDBConfigured: false,
    giantBombConfigured: false,
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
            giantBombApiKey: creds.giantBombApiKey || '',
          });

          // Check API status
          const igdbConfigured = !!(creds.igdbClientId && creds.igdbClientSecret &&
            creds.igdbClientId.trim() !== '' && creds.igdbClientSecret.trim() !== '');
          const rawgConfigured = !!(creds.rawgApiKey && creds.rawgApiKey.trim() !== '');
          const steamGridDBConfigured = !!(creds.steamGridDBApiKey && creds.steamGridDBApiKey.trim() !== '');
          const giantBombConfigured = !!(creds.giantBombApiKey && creds.giantBombApiKey.trim() !== '');

          setApiStatus({
            igdbConfigured,
            rawgConfigured,
            steamGridDBConfigured,
            giantBombConfigured,
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

        } catch (err) {
          console.error('Error loading app configs:', err);
        } finally {
          setIsLoadingApps(false);
        }
      };
      loadAppConfigs();


    }
  }, [isOpen]);

  const handleToggle = (key: keyof OnyxSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
  };

  const formatSuspendShortcutFromEvent = (event: KeyboardEvent): string | null => {
    const disallowedKeys = ['Control', 'Shift', 'Alt', 'Meta'];
    if (disallowedKeys.includes(event.key)) {
      return null;
    }

    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push('Ctrl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');
    if (event.metaKey) modifiers.push('Super');

    let key = event.key;
    if (key.length === 1) {
      key = key.toUpperCase();
    } else {
      const keyAliases: Record<string, string> = {
        ' ': 'Space',
        ArrowUp: 'Up',
        ArrowDown: 'Down',
        ArrowLeft: 'Left',
        ArrowRight: 'Right',
        Escape: 'Esc',
      };
      key = keyAliases[key] || key;
    }

    return [...modifiers, key].join('+');
  };

  useEffect(() => {
    if (!isCapturingSuspendShortcut) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        setIsCapturingSuspendShortcut(false);
        setSuspendShortcutCaptureError(null);
        return;
      }

      const shortcut = formatSuspendShortcutFromEvent(event);
      if (!shortcut) {
        setSuspendShortcutCaptureError('Press a non-modifier key with optional modifiers (Ctrl, Alt, Shift).');
        return;
      }

      setSettings((prev) => ({
        ...prev,
        suspendShortcut: shortcut,
      }));
      setSuspendShortcutCaptureError(null);
      setIsCapturingSuspendShortcut(false);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [isCapturingSuspendShortcut]);



  const handleAPIInputChange = (key: keyof APICredentials, value: string) => {
    setApiCredentials((prev) => {
      const updated = { ...prev, [key]: value };

      // Update API status in real-time
      const igdbConfigured = !!(updated.igdbClientId.trim() && updated.igdbClientSecret.trim());
      const rawgConfigured = !!updated.rawgApiKey.trim();
      const steamGridDBConfigured = !!updated.steamGridDBApiKey.trim();
      const giantBombConfigured = !!updated.giantBombApiKey.trim();

      setApiStatus({
        igdbConfigured,
        rawgConfigured,
        steamGridDBConfigured,
        giantBombConfigured,
        allRequiredConfigured: igdbConfigured, // Only IGDB is required
      });

      return updated;
    });

  };

  const handleCheckForUpdates = async () => {
    setUpdateError(null);

    if (!isPackagedApp) {
      setUpdateStatus('error');
      setUpdateError('Updater is only available in installed builds.');
      return;
    }

    if (updateCheckTimeoutRef.current) {
      clearTimeout(updateCheckTimeoutRef.current);
      updateCheckTimeoutRef.current = null;
    }

    setUpdateStatus('checking');
    await window.electronAPI.checkForUpdates?.();

    updateCheckTimeoutRef.current = setTimeout(() => {
      setUpdateStatus((prev) => {
        if (prev !== 'checking') return prev;
        setUpdateError('Update check timed out. Please try again.');
        return 'error';
      });
      updateCheckTimeoutRef.current = null;
    }, 15000);
  };

  const handleDownloadUpdate = async () => {
    setUpdateStatus('downloading');
    const result = await window.electronAPI.downloadUpdate?.();
    if (result?.success) {
      setUpdateStatus('downloaded');
      return;
    }

    setUpdateError(result?.error ?? 'Download failed');
  };

  const handleOpenBugReportFromAbout = () => {
    onClose();
  };



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



  const handleUpdateAppCategory = (appId: string, categories: string[]) => {
    setApps((prev) =>
      prev.map((app) => (app.id === appId ? { ...app, autoCategory: categories } : app))
    );
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
        notifyManualFolderIconsUpdated();
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

  const notifyManualFolderIconsUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('onyx:manual-folder-icons-updated'));
    }
  };

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
        startMinimized: settings.startMinimized,
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
        disableAllAnimations: settings.disableAllAnimations,
        disableAnimatedBanners: settings.disableAnimatedBanners,
        disableAnimatedBoxarts: settings.disableAnimatedBoxarts,
        disableAnimatedBackgrounds: settings.disableAnimatedBackgrounds,
        disableAnimatedIcons: settings.disableAnimatedIcons,
        disableAnimatedLogos: settings.disableAnimatedLogos,
        startInFullscreen: settings.startInFullscreen,
        hideMouseCursorInFullscreen: settings.hideMouseCursorInFullscreen,
        cursorHideTimeout: settings.cursorHideTimeout,
        linkDisplayMode: settings.linkDisplayMode,
        enableSuspendFeature: settings.enableSuspendFeature,
        suspendShortcut: settings.suspendShortcut,
        visibleLinkTypes: linkVisibleTypes,
        linkDisplayOrder: linkDisplayOrder,
      });

      const suspendShortcutResult = await window.electronAPI.suspend.setShortcut(settings.suspendShortcut);
      if (!suspendShortcutResult.success) {
        throw new Error(suspendShortcutResult.error || 'Failed to set suspend shortcut');
      }

      const suspendEnabledResult = await window.electronAPI.suspend.setFeatureEnabled(settings.enableSuspendFeature);
      if (!suspendEnabledResult.success) {
        throw new Error(suspendEnabledResult.error || 'Failed to apply suspend feature setting');
      }

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
        startMinimized: settings.startMinimized,
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

  const tabs: SettingsTab[] = [
    {
      id: 'general',
      label: 'General',
      icon: (
        <svg className="w-5 h-5 group- hover:animate-gear-spin group-hover:animate-gear-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      id: 'animations',
      label: 'Animations',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4h5l2 4 2-4h5l-3 8 3 8h-5l-2-4-2 4H4l3-8z" />
        </svg>
      ),
    },
    {
      id: 'scanning',
      label: 'Scanning',
      icon: (
        <svg className="w-5 h-5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      id: 'library',
      label: 'Libraries',
      icon: (
        <svg className="w-5 h-5 group- hover:animate-gear-spin group-hover:animate-gear-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      id: 'integrations',
      label: 'API Integrations',
      icon: (
        <svg className="w-5 h-5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
    },
    {
      id: 'links',
      label: 'Link Management',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      ),
    },
    {
      id: 'advanced',
      label: 'Advanced',
      icon: (
        <svg className="w-5 h-5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
        </svg>
      ),
    },
    {
      id: 'suspend',
      label: 'Suspend/Resume',
      icon: (
        <svg className="w-5 h-5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6M5 7h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2V9a2 2 0 012-2z" />
        </svg>
      ),
    },
    {
      id: 'about',
      label: 'About',
      icon: (
        <svg className="w-5 h-5 group- hover:animate-gear-spin group-hover:animate-gear-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    label="Start Minimized"
                    description="Start Onyx minimized on launch"
                    checked={settings.startMinimized}
                    onChange={() => handleToggle('startMinimized')}
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
          {activeTab === 'animations' && (
            <div className="space-y-6 p-6">
              <SettingsSection title="Animations" description="Control animated UI and artwork to reduce CPU usage">
                <SettingsToggle
                  label="Disable all animations"
                  description="Turn off UI motion and animated artwork. Some changes may require restart."
                  checked={settings.disableAllAnimations}
                  onChange={(checked) => {
                    setSettings(prev => ({
                      ...prev,
                      disableAllAnimations: checked,
                    }));
                  }}
                />
                <SettingsToggle
                  label="Disable animated banners"
                  description="Stop animated hero/banner artwork from animating."
                  checked={settings.disableAnimatedBanners}
                  disabled={settings.disableAllAnimations}
                  onChange={(checked) => setSettings(prev => ({ ...prev, disableAnimatedBanners: checked }))}
                />
                <SettingsToggle
                  label="Disable animated boxarts"
                  description="Force boxart tiles to stay static even when animated versions exist."
                  checked={settings.disableAnimatedBoxarts}
                  disabled={settings.disableAllAnimations}
                  onChange={(checked) => setSettings(prev => ({ ...prev, disableAnimatedBoxarts: checked }))}
                />
                <SettingsToggle
                  label="Disable animated alt banners"
                  description="Prevent animated alternative banner backgrounds from animating."
                  checked={settings.disableAnimatedBackgrounds}
                  disabled={settings.disableAllAnimations}
                  onChange={(checked) => setSettings(prev => ({ ...prev, disableAnimatedBackgrounds: checked }))}
                />
                <SettingsToggle
                  label="Disable animated icons"
                  description="Disable animations on small icon-style artwork and badges."
                  checked={settings.disableAnimatedIcons}
                  disabled={settings.disableAllAnimations}
                  onChange={(checked) => setSettings(prev => ({ ...prev, disableAnimatedIcons: checked }))}
                />
                <SettingsToggle
                  label="Disable animated logos"
                  description="Disable animations on game and publisher logos."
                  checked={settings.disableAnimatedLogos}
                  disabled={settings.disableAllAnimations}
                  onChange={(checked) => setSettings(prev => ({ ...prev, disableAnimatedLogos: checked }))}
                />
              </SettingsSection>
            </div>
          )}
          {activeTab === 'scanning' && (
            <div className="space-y-6 p-6">
              <SettingsSection title="Automatic Scanning" description="Configure how Onyx detects new games">
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
                </div>
              </SettingsSection>

              <SettingsSection title="Startup Behavior" description="Configure scanning behavior on application start">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
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
                      <svg className="w-3.5 h-3.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Add Folder
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-400">
                    <span>Need more icon options?</span>
                    <button
                      onClick={() => window.electronAPI.openExternal?.('https://allsvgicons.com')}
                      className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                    >
                      allsvgicons.com
                    </button>
                    <span>Open an icon page, right-click the icon, then use Save As and keep the .svg format.</span>
                  </div>

                  {Object.keys(manualFolderConfigs).length === 0 ? (
                    <div className="text-center py-6 bg-gray-800/30 rounded-lg border border-gray-700/50 border-dashed hover:bg-gray-800/50 transition-colors">
                      <p className="text-gray-500 text-xs">No custom folders added yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-[2rem_minmax(120px,1fr)_minmax(180px,2fr)_minmax(140px,1.2fr)_auto_auto] gap-3 px-1 text-[10px] uppercase tracking-wider text-gray-500 font-semibold">
                        <span>Icon</span>
                        <span>Name</span>
                        <span>Path</span>
                        <span>Category</span>
                        <span></span>
                        <span></span>
                      </div>
                      {Object.values(manualFolderConfigs).map((folderConfig) => (
                        <div key={folderConfig.id} className="border border-gray-700/50 rounded-lg p-3 bg-gray-800/40 hover:bg-gray-800/60 transition-colors">
                          <div className="grid grid-cols-[2rem_minmax(120px,1fr)_minmax(180px,2fr)_minmax(140px,1.2fr)_auto_auto] gap-3 items-center">
                            <div className="w-8 h-8 rounded border border-gray-600/60 bg-gray-900/60 flex items-center justify-center">
                              {getManualFolderIconPreset(folderConfig.icon) ? (
                                <img
                                  src={getManualFolderIconPreset(folderConfig.icon)!.src}
                                  alt={`${folderConfig.name} icon`}
                                  className="w-4 h-4 brightness-0 invert opacity-90"
                                />
                              ) : (
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h5l2 2h7a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                                </svg>
                              )}
                            </div>

                            <input
                              type="text"
                              value={folderConfig.name}
                              onChange={(e) => handleUpdateManualFolderName(folderConfig.id, e.target.value)}
                              onBlur={() => {
                                const config = manualFolderConfigs[folderConfig.id];
                                if (config && window.electronAPI.saveManualFolderConfig) {
                                  window.electronAPI.saveManualFolderConfig(config);
                                  notifyManualFolderIconsUpdated();
                                }
                              }}
                              className="font-medium text-white text-sm bg-transparent border-none p-0 focus:ring-0 focus:underline min-w-0"
                            />

                            <div className="text-xs text-gray-300 font-mono truncate" title={folderConfig.path}>
                              {folderConfig.path}
                            </div>

                            <div className="flex items-center gap-1.5 overflow-hidden min-w-0">
                              {folderConfig.autoCategory && folderConfig.autoCategory.length > 0 ? (
                                <>
                                  {folderConfig.autoCategory.slice(0, 3).map(cat => (
                                    <span key={cat} className="px-1.5 py-0.5 rounded text-[10px] bg-gray-700 text-gray-300 border border-gray-600/50 whitespace-nowrap">
                                      {cat}
                                    </span>
                                  ))}
                                  {folderConfig.autoCategory.length > 3 && (
                                    <span className="text-[10px] text-gray-500">+{folderConfig.autoCategory.length - 3}</span>
                                  )}
                                </>
                              ) : (
                                <span className="text-[10px] text-gray-500">None</span>
                              )}
                            </div>

                            {folderConfig.enabled ? (
                              <button
                                onClick={() => setEditingManualFolderId(editingManualFolderId === folderConfig.id ? null : folderConfig.id)}
                                className={`text-xs font-medium px-2 py-1 rounded transition-colors ${editingManualFolderId === folderConfig.id ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400 hover:text-white hover:bg-gray-700/50'}`}
                              >
                                Edit
                              </button>
                            ) : (
                              <span />
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
                                <label className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Icon (SVG)</label>
                                <div className="grid grid-cols-6 md:grid-cols-8 gap-2">
                                  <button
                                    onClick={async () => {
                                      const updatedConfig = { ...folderConfig, icon: undefined };
                                      setManualFolderConfigs({ ...manualFolderConfigs, [folderConfig.id]: updatedConfig });
                                      if (window.electronAPI.saveManualFolderConfig) {
                                        await window.electronAPI.saveManualFolderConfig(updatedConfig);
                                        notifyManualFolderIconsUpdated();
                                      }
                                    }}
                                    className={`h-9 rounded border text-[10px] transition-colors ${!folderConfig.icon ? 'border-blue-500/60 text-blue-300 bg-blue-500/10' : 'border-gray-600 text-gray-400 hover:border-gray-500'}`}
                                  >
                                    None
                                  </button>
                                  {MANUAL_FOLDER_ICON_PRESETS.map((preset) => {
                                    const isSelected = folderConfig.icon === preset.id;
                                    return (
                                      <button
                                        key={preset.id}
                                        onClick={async () => {
                                          const updatedConfig = { ...folderConfig, icon: preset.id };
                                          setManualFolderConfigs({ ...manualFolderConfigs, [folderConfig.id]: updatedConfig });
                                          if (window.electronAPI.saveManualFolderConfig) {
                                            await window.electronAPI.saveManualFolderConfig(updatedConfig);
                                            notifyManualFolderIconsUpdated();
                                          }
                                        }}
                                        className={`h-9 rounded border flex items-center justify-center transition-colors ${isSelected ? 'border-blue-500/60 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500 bg-gray-900/40'}`}
                                        title={preset.name}
                                      >
                                        <img src={preset.src} alt={preset.name} className="w-4 h-4 brightness-0 invert opacity-90" />
                                      </button>
                                    );
                                  })}
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
                      <svg className="animate-spin h-6 w-6 text-blue-500 group- hover:animate-wobble group-hover:animate-wobble" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                              <LauncherIcon launcher={app.id} className="w-5 h-5" />
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
                                      <svg className="w-3.5 h-3.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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

          {activeTab === 'integrations' && (
            <SettingsIntegrationsTab
              activeAPITab={activeAPITab}
              apiCredentials={apiCredentials}
              apiStatus={apiStatus}
              onActiveTabChange={setActiveAPITab}
              onAPIInputChange={handleAPIInputChange}
              onOpenExternal={(url) => void window.electronAPI?.openExternal(url)}
            />
          )}

          {activeTab === 'links' && (
            <div className="space-y-6 p-6">
              <SettingsSection
                title="Link Management"
                description="Choose which link types appear on the game bar and in what order. Hidden-by-default links still appear in the right-click icon menu."
              >
                <div className="space-y-1">
                  {linkDisplayOrder.map((displayName, index) => {
                    const key = LINK_DISPLAY_NAME_TO_KEY[displayName] || displayName.toLowerCase().replace(/\s+/g, '');
                    const isVisible = linkVisibleTypes[key] === true;
                    const hiddenByDefault = !isVisible;
                    return (
                      <div
                        key={displayName}
                        className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (index <= 0) return;
                              const next = [...linkDisplayOrder];
                              [next[index - 1], next[index]] = [next[index], next[index - 1]];
                              setLinkDisplayOrder(next);
                            }}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded"
                            title="Move up"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (index >= linkDisplayOrder.length - 1) return;
                              const next = [...linkDisplayOrder];
                              [next[index], next[index + 1]] = [next[index + 1], next[index]];
                              setLinkDisplayOrder(next);
                            }}
                            disabled={index === linkDisplayOrder.length - 1}
                            className="p-1 text-gray-400 hover:text-white disabled:opacity-30 rounded"
                            title="Move down"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                          </button>
                        </div>
                        <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center rounded text-white">
                          <LinkIcon iconKey={key} className="w-[70%] h-[70%]" darkBackground={true} />
                        </div>
                        <span className="flex-1 text-sm text-white truncate">{displayName}</span>
                        <label className="flex items-center gap-1.5 shrink-0 cursor-pointer">
                          <span className="text-xs text-gray-400">Hidden by default</span>
                          <input
                            type="checkbox"
                            checked={hiddenByDefault}
                            onChange={() => setLinkVisibleTypes(prev => ({ ...prev, [key]: !isVisible }))}
                            className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
                          />
                        </label>
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-gray-500 mt-2">Changes are saved when you click Save. Hidden-by-default links still appear when you right-click the link icons.</p>
              </SettingsSection>
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
                        <svg className="w-3.5 h-3.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                        <svg className="w-3.5 h-3.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            <svg className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                            <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

          {activeTab === 'suspend' && (
            <div className="space-y-6 p-6">
              <SettingsSection
                title="Suspend/Resume (Experimental)"
                description="Windows-only process suspend controls adapted for Nyrna-style workflows. May require running Onyx as Administrator for some games."
              >
                <SettingsToggle
                  label="Enable Suspend/Resume Feature"
                  description="Allows pausing and resuming tracked running games from Onyx."
                  checked={settings.enableSuspendFeature}
                  onChange={(checked) => setSettings({ ...settings, enableSuspendFeature: checked })}
                />
                <SettingsInput
                  label="Suspend Toggle Shortcut"
                  description="Global shortcut used to toggle between suspend/resume for tracked games."
                  value={settings.suspendShortcut}
                  onChange={(value) => setSettings({ ...settings, suspendShortcut: value })}
                  placeholder="Ctrl+Shift+S"
                  disabled={true}
                />

                <div className={`bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 ${!settings.enableSuspendFeature ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-gray-200 text-sm font-medium">Shortcut Capture</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {isCapturingSuspendShortcut
                          ? 'Press your preferred key combination now (Esc to cancel).'
                          : `Current: ${settings.suspendShortcut}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSuspendShortcutCaptureError(null);
                        setIsCapturingSuspendShortcut(true);
                      }}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    >
                      {isCapturingSuspendShortcut ? 'Listening…' : 'Set Shortcut'}
                    </button>
                  </div>
                  {suspendShortcutCaptureError && (
                    <p className="text-xs text-red-400 mt-2">{suspendShortcutCaptureError}</p>
                  )}
                </div>

                <div className={`bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 ${!settings.enableSuspendFeature ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-gray-200 text-sm font-medium">Administrator Access</p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        Some games require elevation for process suspend/resume to work.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          if (!window.electronAPI.restartAsAdmin) {
                            alert('Restart-as-admin is not available in this build.');
                            return;
                          }

                          const result = await window.electronAPI.restartAsAdmin();
                          if (!result.success) {
                            alert(result.error || 'Failed to restart as administrator.');
                          }
                        } catch (error) {
                          alert(`Failed to restart as administrator: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded transition-colors"
                    >
                      Restart as Administrator
                    </button>
                  </div>
                </div>

                <p className="pt-3 border-t border-gray-700/50 text-xs text-gray-400">
                  Suspend/Resume integration thanks to{' '}
                  <a
                    href="https://nyrna.merritt.codes/"
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={async (event) => {
                      event.preventDefault();
                      try {
                        if (window.electronAPI?.openExternal) {
                          await window.electronAPI.openExternal('https://nyrna.merritt.codes/');
                        } else {
                          window.open('https://nyrna.merritt.codes/', '_blank', 'noopener,noreferrer');
                        }
                      } catch (error) {
                        console.error('Failed to open Nyrna link:', error);
                      }
                    }}
                    className="text-gray-300 font-medium hover:text-sky-400 transition-colors"
                  >
                    Nyrna
                  </a>
                </p>
              </SettingsSection>
            </div>
          )}

          {/* DISABLED: Suspend feature (Future Feature) */}


          {activeTab === 'about' && (
            <SettingsAboutTab
              appVersion={appVersion}
              isAlphaBuild={__BUILD_PROFILE__ === 'alpha'}
              isPackagedApp={isPackagedApp}
              updateStatus={updateStatus}
              updateVersion={updateVersion}
              updateError={updateError}
              onCheckForUpdates={handleCheckForUpdates}
              onDownloadUpdate={handleDownloadUpdate}
              onRestartToUpdate={() => window.electronAPI.quitAndInstall?.()}
              onBugReportClick={handleOpenBugReportFromAbout}
              onOpenExternal={async (url) => {
                try {
                  const result = await window.electronAPI.openExternal(url);
                  if (!result.success) {
                    console.error('Failed to open external URL:', result.error);
                  }
                } catch (error) {
                  console.error('Failed to open external URL:', error);
                }
              }}
            />
          )}


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





