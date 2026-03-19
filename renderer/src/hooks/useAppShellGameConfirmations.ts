import { useCallback, useState } from 'react';
import type { Game } from '../types/game';

interface UseAppShellGameConfirmationsOptions {
  deleteGame: (gameId: string) => Promise<boolean>;
  handleSaveGame: (game: Game, oldGame?: Game) => Promise<void>;
  setGameContextMenu: (menu: { game: Game; x: number; y: number } | null) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export function useAppShellGameConfirmations({
  deleteGame,
  handleSaveGame,
  setGameContextMenu,
  showToast,
}: UseAppShellGameConfirmationsOptions) {
  const [hideConfirmation, setHideConfirmation] = useState<{ game: Game } | null>(null);
  const [uninstallConfirmation, setUninstallConfirmation] = useState<{ game: Game; removeFromLibrary: boolean } | null>(null);

  const handleHideGame = useCallback((game: Game) => {
    setHideConfirmation({ game });
  }, []);

  const handleConfirmHide = useCallback(async () => {
    if (!hideConfirmation) return;
    const { game } = hideConfirmation;
    await handleSaveGame({ ...game, hidden: true });
    showToast(`"${game.title}" has been hidden`, 'success');
    setHideConfirmation(null);
  }, [handleSaveGame, hideConfirmation, showToast]);

  const handleCancelHide = useCallback(() => {
    setHideConfirmation(null);
  }, []);

  const handleUnhideGame = useCallback(async (game: Game) => {
    await handleSaveGame({ ...game, hidden: false });
    showToast(`"${game.title}" has been unhidden`, 'success');
  }, [handleSaveGame, showToast]);

  const handleUninstallGame = useCallback(async (game: Game) => {
    setGameContextMenu(null);
    setUninstallConfirmation({ game, removeFromLibrary: false });
  }, [setGameContextMenu]);

  const handleConfirmUninstall = useCallback(async () => {
    if (!uninstallConfirmation) return;

    const { game, removeFromLibrary } = uninstallConfirmation;
    setUninstallConfirmation(null);

    try {
      const result = await window.electronAPI.openGameUninstaller(game.id);
      if (result.success) {
        showToast(result.openedUninstaller ? 'Uninstaller opened' : 'Opened Windows Settings > Apps', 'success');

        if (removeFromLibrary) {
          const removed = await deleteGame(game.id);
          if (removed) {
            showToast(`Removed "${game.title}" from the library`, 'success');
          } else {
            showToast(`Opened uninstall flow, but failed to remove "${game.title}" from the library`, 'error');
          }
        }
      } else if (result.error) {
        showToast(result.error, 'error');
      }
    } catch {
      showToast('Failed to open uninstaller', 'error');
    }
  }, [deleteGame, showToast, uninstallConfirmation]);

  const handleCancelUninstall = useCallback(() => {
    setUninstallConfirmation(null);
  }, []);

  const handleRemoveFromLibraryChange = useCallback((checked: boolean) => {
    setUninstallConfirmation((current) => (
      current ? { ...current, removeFromLibrary: checked } : current
    ));
  }, []);

  return {
    handleCancelHide,
    handleCancelUninstall,
    handleConfirmHide,
    handleConfirmUninstall,
    handleHideGame,
    handleRemoveFromLibraryChange,
    handleUnhideGame,
    handleUninstallGame,
    hideConfirmation,
    uninstallConfirmation,
  };
}
