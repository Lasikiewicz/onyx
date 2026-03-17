import { useCallback } from 'react';
import type { Game } from '../types/game';
import type { WelcomeScreenProps } from '../components/WelcomeScreen';
import type { GameContextMenuProps } from '../components/GameContextMenu';
import type { AppShellOverlaysProps } from '../components/appShell/AppShellOverlays';

interface MissingGame {
  id: string;
  title: string;
  exePath?: string;
  platform?: string;
  source?: string;
}

interface FoundGame {
  id?: string;
  title: string;
  exePath?: string;
  installPath?: string;
  platform?: string;
  source?: string;
  appId?: string;
  isDownloading?: boolean;
}

interface UpdateNotificationState {
  version: string;
  status: 'available' | 'downloading' | 'downloaded' | 'error';
  error?: string;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface UseAppShellSurfaceActionsOptions {
  changelogError: string | null;
  changelogLoading: boolean;
  changelogSource: string | null;
  closeLibraryTutorial: () => void;
  crashDumpPaths: string[] | null;
  currentVersion: string | null;
  foundGames: FoundGame[] | null;
  gameContextMenu: { game: Game; x: number; y: number } | null;
  handleAddFolder: WelcomeScreenProps['onAddFolder'];
  handleCancelFoundGames: () => void;
  handleCancelMissingGames: () => void;
  handleDismissCrashDumps: () => Promise<void>;
  handleDismissUpdateNotification: () => void;
  handleEditCategories: (game: Game) => void;
  handleEditGame: (game: Game) => void;
  handleEditImages: (game: Game) => void;
  handleFixMatch: (game: Game) => void;
  handleHideGame: (game: Game) => void;
  handleOpenCrashDumpFolder: () => Promise<void>;
  handlePlay: (game: Game) => Promise<void>;
  handleRemoveMissingGames: (gameIds: string[]) => void | Promise<void>;
  handleReviewFoundGames: (games: FoundGame[]) => void;
  handleSaveCrashDumps: () => Promise<void>;
  handleToggleFavorite: (game: Game) => Promise<void>;
  handleTogglePin: (game: Game) => Promise<void>;
  handleUnhideGame: (game: Game) => Promise<void>;
  handleUninstallGame: (game: Game) => Promise<void>;
  handleUpdateNow: () => Promise<void>;
  handleUpdateSteamLibrary: () => Promise<void>;
  isUpdateModalTest: boolean;
  missingGames: MissingGame[] | null;
  openImportWorkbench: (options?: { autoStartScan?: boolean }) => void;
  openOnyxSettings: (tab: 'general' | 'appearance' | 'apis' | 'apps' | 'about') => void;
  selectedCategory: string | null;
  setForceShowInitialOnboarding: (open: boolean) => void;
  setGameContextMenu: (menu: { game: Game; x: number; y: number } | null) => void;
  setIsAPISettingsOpen: (open: boolean) => void;
  setToast: (toast: ToastState | null) => void;
  showLibraryTutorial: boolean;
  startupProgress: { message: string } | null;
  toast: ToastState | null;
  updateNotification: UpdateNotificationState | null;
}

export function useAppShellSurfaceActions({
  changelogError,
  changelogLoading,
  changelogSource,
  closeLibraryTutorial,
  crashDumpPaths,
  currentVersion,
  foundGames,
  gameContextMenu,
  handleAddFolder,
  handleCancelFoundGames,
  handleCancelMissingGames,
  handleDismissCrashDumps,
  handleDismissUpdateNotification,
  handleEditCategories,
  handleEditGame,
  handleEditImages,
  handleFixMatch,
  handleHideGame,
  handleOpenCrashDumpFolder,
  handlePlay,
  handleRemoveMissingGames,
  handleReviewFoundGames,
  handleSaveCrashDumps,
  handleToggleFavorite,
  handleTogglePin,
  handleUnhideGame,
  handleUninstallGame,
  handleUpdateNow,
  handleUpdateSteamLibrary,
  isUpdateModalTest,
  missingGames,
  openImportWorkbench,
  openOnyxSettings,
  selectedCategory,
  setForceShowInitialOnboarding,
  setGameContextMenu,
  setIsAPISettingsOpen,
  setToast,
  showLibraryTutorial,
  startupProgress,
  toast,
  updateNotification,
}: UseAppShellSurfaceActionsOptions) {
  const closeGameContextMenu = useCallback(() => {
    setGameContextMenu(null);
  }, [setGameContextMenu]);

  const handleWelcomeScanGames = useCallback(() => {
    setForceShowInitialOnboarding(false);
    window.electronAPI.cancelStartupScan?.();
    openImportWorkbench({ autoStartScan: true });
  }, [openImportWorkbench, setForceShowInitialOnboarding]);

  const handleWelcomeAddFolder = useCallback<WelcomeScreenProps['onAddFolder']>((path, categories, icon) => {
    setForceShowInitialOnboarding(false);
    handleAddFolder(path, categories, icon);
  }, [handleAddFolder, setForceShowInitialOnboarding]);

  const handleWelcomeOpenSettings = useCallback(() => {
    setForceShowInitialOnboarding(false);
    setIsAPISettingsOpen(true);
  }, [setForceShowInitialOnboarding, setIsAPISettingsOpen]);

  const handleDismissToast = useCallback(() => {
    setToast(null);
  }, [setToast]);

  return {
    appShellOverlayProps: {
      changelogError,
      changelogLoading,
      changelogSource,
      crashDumpPaths,
      currentVersion,
      foundGames,
      isUpdateModalTest,
      missingGames,
      onCancelFoundGames: handleCancelFoundGames,
      onCancelMissingGames: handleCancelMissingGames,
      onCloseLibraryTutorial: closeLibraryTutorial,
      onDismissCrashDumps: handleDismissCrashDumps,
      onDismissToast: handleDismissToast,
      onDismissUpdate: handleDismissUpdateNotification,
      onInstallUpdate: () => {
        window.electronAPI.quitAndInstall?.();
      },
      onOpenCrashDumpFolder: handleOpenCrashDumpFolder,
      onOpenSettings: () => openOnyxSettings('general'),
      onOpenUpdateLibrary: handleUpdateSteamLibrary,
      onRemoveMissingGames: handleRemoveMissingGames,
      onReviewFoundGames: handleReviewFoundGames,
      onSaveCrashDumps: handleSaveCrashDumps,
      onUpdateNow: handleUpdateNow,
      showLibraryTutorial,
      startupProgress,
      toast,
      updateNotification,
    } satisfies AppShellOverlaysProps,
    gameContextMenuProps: gameContextMenu ? {
      game: gameContextMenu.game,
      isHiddenView: selectedCategory === 'hidden',
      onClose: closeGameContextMenu,
      onEdit: handleEditGame,
      onEditCategories: handleEditCategories,
      onEditImages: handleEditImages,
      onFavorite: handleToggleFavorite,
      onFixMatch: handleFixMatch,
      onHide: handleHideGame,
      onPin: handleTogglePin,
      onPlay: handlePlay,
      onUnhide: handleUnhideGame,
      onUninstall: handleUninstallGame,
      x: gameContextMenu.x,
      y: gameContextMenu.y,
    } satisfies GameContextMenuProps : null,
    welcomeScreenProps: {
      onAddFolder: handleWelcomeAddFolder,
      onOpenSettings: handleWelcomeOpenSettings,
      onScanGames: handleWelcomeScanGames,
    } satisfies WelcomeScreenProps,
  };
}
