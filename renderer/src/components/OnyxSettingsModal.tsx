import React, { useState, useEffect } from 'react';
import { SettingsLayout } from './settings/SettingsLayout';
import { SettingsSidebar, SettingsTab } from './settings/SettingsSidebar';
import { SettingsAdvancedTab } from './settings/SettingsAdvancedTab';
import { SettingsAnimationsTab } from './settings/SettingsAnimationsTab';
import { SettingsGeneralTab } from './settings/SettingsGeneralTab';
import { SettingsIntegrationsTab } from './settings/SettingsIntegrationsTab';
import { SettingsAboutTab } from './settings/SettingsAboutTab';
import { SettingsLibrariesTab } from './settings/SettingsLibrariesTab';
import { SettingsLinksTab } from './settings/SettingsLinksTab';
import { SettingsScanningTab } from './settings/SettingsScanningTab';
import { SettingsSuspendTab } from './settings/SettingsSuspendTab';
import { LINK_DISPLAY_ORDER, DEFAULT_VISIBLE_LINK_TYPES } from './GameLinks';
import { SettingsModalTab, useOnyxSettingsModalShellState } from '../hooks/useOnyxSettingsModalShellState';
import { useOnyxSettingsLibrarySources } from '../hooks/useOnyxSettingsLibrarySources';

export interface OnyxSettingsModalProps {
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

export const OnyxSettingsModal: React.FC<OnyxSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTab = 'general',
  onShowImportModal,
}) => {
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

  const [backgroundScanEnabled, setBackgroundScanEnabled] = useState(false);
  const [backgroundScanIntervalMinutes, setBackgroundScanIntervalMinutes] = useState(30);

  const [linkVisibleTypes, setLinkVisibleTypes] = useState<Record<string, boolean>>(DEFAULT_VISIBLE_LINK_TYPES);
  const [linkDisplayOrder, setLinkDisplayOrder] = useState<string[]>(LINK_DISPLAY_ORDER);
  const {
    apps,
    editingAppId,
    editingManualFolderId,
    handleAddManualFolder,
    handleBrowseApp,
    handleRemoveManualFolder,
    handleScanApp,
    handleToggleAppEnabled,
    handleUpdateAppCategory,
    handleUpdateManualFolderName,
    isLoadingApps,
    manualFolderConfigs,
    manualFolders,
    notifyManualFolderIconsUpdated,
    scanningAppId,
    setEditingAppId,
    setEditingManualFolderId,
    setManualFolderConfigs,
  } = useOnyxSettingsLibrarySources({
    isOpen,
    onShowImportModal,
  });
  const {
    activeAPITab,
    activeTab,
    apiCredentials,
    apiStatus,
    appVersion,
    handleAPIInputChange,
    handleCheckForUpdates,
    handleDownloadUpdate,
    handleOpenBugReportFromAbout,
    isCapturingSuspendShortcut,
    isPackagedApp,
    setActiveAPITab,
    setActiveTab,
    setIsCapturingSuspendShortcut,
    setSuspendShortcutCaptureError,
    suspendShortcutCaptureError,
    updateError,
    updateStatus,
    updateVersion,
  } = useOnyxSettingsModalShellState({
    initialTab,
    isOpen,
    onClose,
    setSettings,
  });

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
  }, [isOpen]);

  const handleToggle = (key: keyof OnyxSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
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
        onTabChange={(id) => setActiveTab(id as SettingsModalTab)}
        appVersion={appVersion}
      />

      <div className="flex-1 bg-gray-900 flex flex-col overflow-hidden">
        <div className="flex-1 w-full overflow-y-auto custom-scrollbar">
          {activeTab === 'general' && (
            <SettingsGeneralTab
              closeToTray={settings.closeToTray}
              confirmGameLaunch={settings.confirmGameLaunch}
              enableHardwareAcceleration={settings.enableHardwareAcceleration}
              minimizeOnGameLaunch={settings.minimizeOnGameLaunch}
              minimizeToTray={settings.minimizeToTray}
              onToggle={handleToggle}
              restoreAfterLaunch={settings.restoreAfterLaunch}
              showSystemTrayIcon={settings.showSystemTrayIcon}
              startClosedToTray={settings.startClosedToTray}
              startMinimized={settings.startMinimized}
              startWithComputer={settings.startWithComputer}
            />
          )}
          {activeTab === 'animations' && (
            <SettingsAnimationsTab
              disableAllAnimations={settings.disableAllAnimations}
              disableAnimatedBackgrounds={settings.disableAnimatedBackgrounds}
              disableAnimatedBanners={settings.disableAnimatedBanners}
              disableAnimatedBoxarts={settings.disableAnimatedBoxarts}
              disableAnimatedIcons={settings.disableAnimatedIcons}
              disableAnimatedLogos={settings.disableAnimatedLogos}
              onSetDisableAllAnimations={(checked) => {
                setSettings((prev) => ({
                  ...prev,
                  disableAllAnimations: checked,
                }));
              }}
              onSetDisableAnimatedBackgrounds={(checked) => setSettings((prev) => ({ ...prev, disableAnimatedBackgrounds: checked }))}
              onSetDisableAnimatedBanners={(checked) => setSettings((prev) => ({ ...prev, disableAnimatedBanners: checked }))}
              onSetDisableAnimatedBoxarts={(checked) => setSettings((prev) => ({ ...prev, disableAnimatedBoxarts: checked }))}
              onSetDisableAnimatedIcons={(checked) => setSettings((prev) => ({ ...prev, disableAnimatedIcons: checked }))}
              onSetDisableAnimatedLogos={(checked) => setSettings((prev) => ({ ...prev, disableAnimatedLogos: checked }))}
            />
          )}
          {activeTab === 'scanning' && (
            <SettingsScanningTab
              backgroundScanEnabled={backgroundScanEnabled}
              backgroundScanIntervalMinutes={backgroundScanIntervalMinutes}
              checkForUpdatesOnStartup={settings.checkForUpdatesOnStartup}
              onSetBackgroundScanEnabled={setBackgroundScanEnabled}
              onSetBackgroundScanIntervalMinutes={setBackgroundScanIntervalMinutes}
              onToggleCheckForUpdatesOnStartup={() => handleToggle('checkForUpdatesOnStartup')}
              onToggleUpdateLibrariesOnStartup={() => handleToggle('updateLibrariesOnStartup')}
              updateLibrariesOnStartup={settings.updateLibrariesOnStartup}
            />
          )}
          {
            activeTab === 'library' && (
              <SettingsLibrariesTab
                apps={apps}
                editingAppId={editingAppId}
                editingManualFolderId={editingManualFolderId}
                isLoadingApps={isLoadingApps}
                manualFolderConfigs={manualFolderConfigs}
                notifyManualFolderIconsUpdated={notifyManualFolderIconsUpdated}
                onAddManualFolder={handleAddManualFolder}
                onBrowseApp={handleBrowseApp}
                onOpenExternal={(url) => void window.electronAPI?.openExternal(url)}
                onRemoveManualFolder={handleRemoveManualFolder}
                onScanApp={handleScanApp}
                onSetEditingAppId={setEditingAppId}
                onSetEditingManualFolderId={setEditingManualFolderId}
                onSetManualFolderConfigs={setManualFolderConfigs}
                onToggleAppEnabled={handleToggleAppEnabled}
                onUpdateAppCategory={handleUpdateAppCategory}
                onUpdateManualFolderName={handleUpdateManualFolderName}
                scanningAppId={scanningAppId}
              />
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
            <SettingsLinksTab
              linkDisplayOrder={linkDisplayOrder}
              linkVisibleTypes={linkVisibleTypes}
              onSetLinkDisplayOrder={setLinkDisplayOrder}
              onSetLinkVisibleTypes={setLinkVisibleTypes}
            />
          )}

          {
            activeTab === 'advanced' && (
              <SettingsAdvancedTab
                isRemovingGames={isRemovingGames}
                isResetting={isResetting}
                onRemoveAllGames={handleRemoveAllGames}
                onReset={handleReset}
                onSetRemoveGamesConfirmation={setRemoveGamesConfirmation}
                onSetResetConfirmation={setResetConfirmation}
                removeGamesConfirmation={removeGamesConfirmation}
                resetConfirmation={resetConfirmation}
              />
            )
          }

          {activeTab === 'suspend' && (
            <SettingsSuspendTab
              enableSuspendFeature={settings.enableSuspendFeature}
              isCapturingSuspendShortcut={isCapturingSuspendShortcut}
              onBeginShortcutCapture={() => {
                setSuspendShortcutCaptureError(null);
                setIsCapturingSuspendShortcut(true);
              }}
              onSetEnableSuspendFeature={(checked) => setSettings({ ...settings, enableSuspendFeature: checked })}
              onSetSuspendShortcut={(value) => setSettings({ ...settings, suspendShortcut: value })}
              suspendShortcut={settings.suspendShortcut}
              suspendShortcutCaptureError={suspendShortcutCaptureError}
            />
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





