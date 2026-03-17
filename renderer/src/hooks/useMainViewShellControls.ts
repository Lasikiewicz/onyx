import { useCallback } from 'react';
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
  setViewMode: (value: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow') => void;
  viewMode: 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow';
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

  return {
    menuBarProps: {
      onAbout: () => openOnyxSettings('about'),
      onAPISettings: () => openOnyxSettings('apis'),
      onBugReport: isAlphaBuild ? () => setIsBugReportOpen(true) : undefined,
      onConfigureSteam: () => setIsSteamConfigOpen(true),
      onExit: handleExit,
      onForceCloseOnboarding: () => setForceShowInitialOnboarding(false),
      onForceOpenOnboarding: () => setForceShowInitialOnboarding(true),
      onForceOpenUpdateFound: openSimulatedUpdateModal,
      onGameManager: openGameManager,
      onOnyxSettings: () => openOnyxSettings('general'),
      onScanFolder: handleScanFolder,
      onShowLibraryTutorial: openLibraryTutorial,
      onTopBarPositionsChange: handleTopBarPositionsChange,
      onUpdateLibrary: handleUpdateSteamLibrary,
      onUpdateSteamLibrary: handleUpdateSteamLibrary,
      topBarRefresh: loadLibrary,
    },
    topBarProps: {
      onFolder: handleScanFolder,
      onGridToggle: handleGridToggle,
      onRefresh: loadLibrary,
      onSearch: setSearchQuery,
      onSettings: () => setIsSteamConfigOpen(true),
    },
  };
}
