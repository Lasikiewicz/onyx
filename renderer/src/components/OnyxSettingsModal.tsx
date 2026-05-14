import React, { useState } from 'react';
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
import { useOnyxSettingsModalPersistence } from '../hooks/useOnyxSettingsModalPersistence';

export interface OnyxSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave?: () => void;
  // Allow both old and new tab names for compatibility during migration
  initialTab?: 'general' | 'apis' | 'apps' | 'reset' | 'about' | 'appearance' | 'integrations' | 'launchers' | 'library' | 'links' | 'advanced' | 'suspend' | 'animations';
  onShowImportModal?: (games: Array<any>, appType?: 'steam' | 'xbox' | 'other') => void;
}

export const OnyxSettingsModal: React.FC<OnyxSettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialTab = 'general',
  onShowImportModal,
}) => {
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
  });
  const {
    backgroundScanEnabled,
    backgroundScanIntervalMinutes,
    handleRemoveAllGames,
    handleReset,
    handleSave,
    handleToggle,
    isRemovingGames,
    isResetting,
    removeGamesConfirmation,
    resetConfirmation,
    setBackgroundScanEnabled,
    setBackgroundScanIntervalMinutes,
    setRemoveGamesConfirmation,
    setResetConfirmation,
    setSettings,
    settings,
  } = useOnyxSettingsModalPersistence({
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
  });

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
              enableGamepadSupport={settings.enableGamepadSupport}
              gamepadButtonLayout={settings.gamepadButtonLayout}
              gamepadNavigationSpeed={settings.gamepadNavigationSpeed}
              minimizeOnGameLaunch={settings.minimizeOnGameLaunch}
              minimizeToTray={settings.minimizeToTray}
              onGamepadButtonLayoutChange={(layout) => setSettings((prev) => ({ ...prev, gamepadButtonLayout: layout }))}
              onGamepadNavigationSpeedChange={(speed) => setSettings((prev) => ({ ...prev, gamepadNavigationSpeed: speed }))}
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





