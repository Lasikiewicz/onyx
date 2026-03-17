import { useEffect, useState } from 'react';
import { DEFAULT_VISIBLE_LINK_TYPES, LINK_DISPLAY_ORDER } from '../components/GameLinks';
import type { SettingsLibraryAppConfig } from './useOnyxSettingsLibrarySources';
import type { SettingsModalApiCredentials } from './useOnyxSettingsModalShellState';

export interface OnyxSettings {
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
  startInFullscreen: boolean;
  hideMouseCursorInFullscreen: boolean;
  cursorHideTimeout: number;
  linkDisplayMode: 'icons' | 'dropdown';
  enableSuspendFeature: boolean;
  suspendShortcut: string;
}

export interface SettingsDestructiveConfirmationState {
  step: number;
  typedText: string;
}

interface UseOnyxSettingsModalPersistenceOptions {
  apiCredentials: SettingsModalApiCredentials;
  apps: SettingsLibraryAppConfig[];
  isCapturingSuspendShortcut: boolean;
  isOpen: boolean;
  linkDisplayOrder: string[];
  linkVisibleTypes: Record<string, boolean>;
  manualFolders: string[];
  onClose: () => void;
  onSave?: () => void | Promise<void>;
  setIsCapturingSuspendShortcut: React.Dispatch<React.SetStateAction<boolean>>;
  setLinkDisplayOrder: React.Dispatch<React.SetStateAction<string[]>>;
  setLinkVisibleTypes: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setSuspendShortcutCaptureError: React.Dispatch<React.SetStateAction<string | null>>;
}

const defaultSettings: OnyxSettings = {
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
};

export const useOnyxSettingsModalPersistence = ({
  apiCredentials,
  apps,
  isCapturingSuspendShortcut,
  isOpen,
  linkDisplayOrder,
  linkVisibleTypes,
  manualFolders,
  onClose,
  onSave,
  setIsCapturingSuspendShortcut,
  setLinkDisplayOrder,
  setLinkVisibleTypes,
  setSuspendShortcutCaptureError,
}: UseOnyxSettingsModalPersistenceOptions) => {
  const [settings, setSettings] = useState<OnyxSettings>(defaultSettings);
  const [showLogoOverBoxart, setShowLogoOverBoxart] = useState(true);
  const [logoPosition, setLogoPosition] = useState<'top' | 'middle' | 'bottom' | 'underneath'>('middle');
  const [backgroundScanEnabled, setBackgroundScanEnabled] = useState(false);
  const [backgroundScanIntervalMinutes, setBackgroundScanIntervalMinutes] = useState(30);
  const [resetConfirmation, setResetConfirmation] = useState<SettingsDestructiveConfirmationState>({
    step: 1,
    typedText: '',
  });
  const [isResetting, setIsResetting] = useState(false);
  const [removeGamesConfirmation, setRemoveGamesConfirmation] = useState<SettingsDestructiveConfirmationState>({
    step: 1,
    typedText: '',
  });
  const [isRemovingGames, setIsRemovingGames] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

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
          defaultStartupPage: (prefs.defaultStartupPage as OnyxSettings['defaultStartupPage']) ?? 'library',
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
        setLinkVisibleTypes(
          prefs.visibleLinkTypes && Object.keys(prefs.visibleLinkTypes).length > 0
            ? prefs.visibleLinkTypes
            : DEFAULT_VISIBLE_LINK_TYPES,
        );
        setLinkDisplayOrder(
          prefs.linkDisplayOrder && prefs.linkDisplayOrder.length > 0
            ? prefs.linkDisplayOrder
            : LINK_DISPLAY_ORDER,
        );

        try {
          setBackgroundScanEnabled(await window.electronAPI.getBackgroundScanEnabled());
          setBackgroundScanIntervalMinutes(await window.electronAPI.getBackgroundScanIntervalMinutes());
        } catch (error) {
          console.error('Error loading background scan settings:', error);
        }
      } catch (error) {
        console.error('Error loading Onyx settings:', error);
      }
    };

    void loadSettings();
  }, [isOpen, setLinkDisplayOrder, setLinkVisibleTypes]);

  useEffect(() => {
    if (!isCapturingSuspendShortcut) return;

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        setIsCapturingSuspendShortcut(false);
        setSuspendShortcutCaptureError(null);
        return;
      }

      const disallowedKeys = ['Control', 'Shift', 'Alt', 'Meta'];
      if (disallowedKeys.includes(event.key)) {
        setSuspendShortcutCaptureError('Press a non-modifier key with optional modifiers (Ctrl, Alt, Shift).');
        return;
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

      setSettings((prev) => ({ ...prev, suspendShortcut: [...modifiers, key].join('+') }));
      setSuspendShortcutCaptureError(null);
      setIsCapturingSuspendShortcut(false);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isCapturingSuspendShortcut, setIsCapturingSuspendShortcut, setSuspendShortcutCaptureError]);

  const handleToggle = (key: keyof OnyxSettings) => {
    setSettings((current) => ({ ...current, [key]: !current[key] }));
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

    setIsRemovingGames(true);
    try {
      const result = await window.electronAPI.clearGameLibrary();
      if (result.success) {
        setRemoveGamesConfirmation({ step: 1, typedText: '' });
        setIsRemovingGames(false);
        onClose();
        window.location.reload();
        return;
      }

      alert(`Failed to remove games: ${result.error || 'Unknown error'}`);
    } catch (error) {
      console.error('Error removing games:', error);
      alert(`Failed to remove games: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsRemovingGames(false);
      setRemoveGamesConfirmation({ step: 1, typedText: '' });
    }
  };

  const handleReset = async () => {
    if (resetConfirmation.step === 1) {
      setResetConfirmation({ step: 2, typedText: '' });
      return;
    }

    if (resetConfirmation.step === 2) {
      if (resetConfirmation.typedText !== 'RESET') {
        return;
      }
      setResetConfirmation({ step: 3, typedText: '' });
      return;
    }

    setIsResetting(true);
    try {
      const result = await window.electronAPI.resetApp();
      if (result.success) {
        onClose();
        window.location.reload();
        return;
      }

      alert(`Failed to reset application: ${result.error || 'Unknown error'}`);
    } catch (error) {
      console.error('Error resetting app:', error);
      alert(`Failed to reset application: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsResetting(false);
      setResetConfirmation({ step: 1, typedText: '' });
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
        showLogoOverBoxart,
        logoPosition,
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
        linkDisplayOrder,
      });

      const suspendShortcutResult = await window.electronAPI.suspend.setShortcut(settings.suspendShortcut);
      if (!suspendShortcutResult.success) {
        throw new Error(suspendShortcutResult.error || 'Failed to set suspend shortcut');
      }

      const suspendEnabledResult = await window.electronAPI.suspend.setFeatureEnabled(settings.enableSuspendFeature);
      if (!suspendEnabledResult.success) {
        throw new Error(suspendEnabledResult.error || 'Failed to apply suspend feature setting');
      }

      await window.electronAPI.saveAPICredentials({
        igdbClientId: apiCredentials.igdbClientId,
        igdbClientSecret: apiCredentials.igdbClientSecret,
        steamGridDBApiKey: apiCredentials.steamGridDBApiKey,
        rawgApiKey: apiCredentials.rawgApiKey,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to save preferences');
      }

      if (apps.length > 0) {
        const configsToSave = apps.map((app) => ({
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

        const steamApp = apps.find((app) => app.id === 'steam');
        if (steamApp && steamApp.enabled && steamApp.path) {
          await window.electronAPI.setSteamPath(steamApp.path);
        }
      }

      try {
        const manualFoldersResult = await window.electronAPI.saveManualFolders(manualFolders);
        if (!manualFoldersResult?.success) {
          console.error('Error saving manual folders:', manualFoldersResult?.error || 'Unknown error');
        }
      } catch (error) {
        console.error('Error saving manual folders:', error);
      }

      await window.electronAPI.applySystemTraySettings({
        showSystemTrayIcon: settings.showSystemTrayIcon,
        minimizeToTray: settings.minimizeToTray,
      });

      await window.electronAPI.applyStartupSettings({
        startWithComputer: settings.startWithComputer,
        startMinimized: settings.startMinimized,
        startClosedToTray: settings.startClosedToTray,
      });

      if (onSave) {
        await onSave();
      }

      onClose();
    } catch (error) {
      console.error('Error saving Onyx settings:', error);
      alert(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return {
    backgroundScanEnabled,
    backgroundScanIntervalMinutes,
    handleRemoveAllGames,
    handleReset,
    handleSave,
    handleToggle,
    isRemovingGames,
    isResetting,
    logoPosition,
    removeGamesConfirmation,
    resetConfirmation,
    setBackgroundScanEnabled,
    setBackgroundScanIntervalMinutes,
    setLogoPosition,
    setRemoveGamesConfirmation,
    setResetConfirmation,
    setSettings,
    settings,
    setShowLogoOverBoxart,
    showLogoOverBoxart,
  };
};
