import { useCallback, useMemo } from 'react';
import type { TopBarPositions } from '../components/TopBarContextMenu';

interface UseMainViewShellControlsOptions {
  handleExit: () => Promise<void>;
  handleScanFolder: () => void;
  handleUpdateSteamLibrary: () => Promise<void>;
  isAlphaBuild: boolean;
  loadLibrary: () => Promise<void>;
  openGameManager: () => void;
  openLibraryTutorial: () => void;
  openOnyxSettings: (tab: 'general' | 'appearance' | 'apis' | 'apps' | 'about') => void;
  openSimulatedUpdateModal: () => void;
  savePreferences: (patch: Record<string, unknown>) => void;
  setForceShowInitialOnboarding: (open: boolean) => void;
  setIsBugReportOpen: (open: boolean) => void;
  setIsSteamConfigOpen: (open: boolean) => void;
  setSearchQuery: (value: string) => void;
  setTopBarPositions: (value: TopBarPositions) => void;
  setViewMode: (value: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card') => void;
  viewMode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow' | 'card';
}

export function useMainViewShellControls({
  handleExit,
  handleScanFolder,
  handleUpdateSteamLibrary,
  isAlphaBuild,
  loadLibrary,
  openGameManager,
  openLibraryTutorial,
  openOnyxSettings,
  openSimulatedUpdateModal,
  savePreferences,
  setForceShowInitialOnboarding,
  setIsBugReportOpen,
  setIsSteamConfigOpen,
  setSearchQuery,
  setTopBarPositions,
  setViewMode,
  viewMode,
}: UseMainViewShellControlsOptions) {
  const handleTopBarPositionsChange = useCallback(async (positions: TopBarPositions) => {
    setTopBarPositions(positions);
    try {
      savePreferences({ topBarPositions: positions });
    } catch (error) {
      console.error('Error saving top bar positions:', error);
    }
  }, [savePreferences, setTopBarPositions]);

  const handleGridToggle = useCallback(() => {
    setViewMode(viewMode === 'grid' ? 'list' : 'grid');
  }, [setViewMode, viewMode]);

  const handleAbout = useCallback(() => openOnyxSettings('about'), [openOnyxSettings]);
  const handleApiSettings = useCallback(() => openOnyxSettings('apis'), [openOnyxSettings]);
  const handleGeneralSettings = useCallback(() => openOnyxSettings('general'), [openOnyxSettings]);
  const handleBugReport = useCallback(() => setIsBugReportOpen(true), [setIsBugReportOpen]);
  const handleConfigureSteam = useCallback(() => setIsSteamConfigOpen(true), [setIsSteamConfigOpen]);
  const handleForceCloseOnboarding = useCallback(() => setForceShowInitialOnboarding(false), [setForceShowInitialOnboarding]);
  const handleForceOpenOnboarding = useCallback(() => setForceShowInitialOnboarding(true), [setForceShowInitialOnboarding]);

  // MenuBar and TopBar are memoization-sensitive: MenuBar is ~1500 lines and re-rendered on
  // every search keystroke if this object is rebuilt each render.
  const menuBarProps = useMemo(() => ({
    onAbout: handleAbout,
    onAPISettings: handleApiSettings,
    onBugReport: isAlphaBuild ? handleBugReport : undefined,
    onConfigureSteam: handleConfigureSteam,
    onExit: handleExit,
    onForceCloseOnboarding: handleForceCloseOnboarding,
    onForceOpenOnboarding: handleForceOpenOnboarding,
    onForceOpenUpdateFound: openSimulatedUpdateModal,
    onGameManager: openGameManager,
    onOnyxSettings: handleGeneralSettings,
    onScanFolder: handleScanFolder,
    onShowLibraryTutorial: openLibraryTutorial,
    onTopBarPositionsChange: handleTopBarPositionsChange,
    onUpdateLibrary: handleUpdateSteamLibrary,
    onUpdateSteamLibrary: handleUpdateSteamLibrary,
    topBarRefresh: loadLibrary,
  }), [
    handleAbout,
    handleApiSettings,
    handleBugReport,
    handleConfigureSteam,
    handleExit,
    handleForceCloseOnboarding,
    handleForceOpenOnboarding,
    handleGeneralSettings,
    handleScanFolder,
    handleTopBarPositionsChange,
    handleUpdateSteamLibrary,
    isAlphaBuild,
    loadLibrary,
    openGameManager,
    openLibraryTutorial,
    openSimulatedUpdateModal,
  ]);

  const topBarProps = useMemo(() => ({
    onFolder: handleScanFolder,
    onGridToggle: handleGridToggle,
    onRefresh: loadLibrary,
    onSearch: setSearchQuery,
    onSettings: handleConfigureSteam,
  }), [handleConfigureSteam, handleGridToggle, handleScanFolder, loadLibrary, setSearchQuery]);

  return { menuBarProps, topBarProps };
}
