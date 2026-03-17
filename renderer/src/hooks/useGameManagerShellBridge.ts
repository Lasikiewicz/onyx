import { useCallback } from 'react';
import { Game } from '../types/game';

type ImportWorkbenchMode = 'nuclear' | 'images' | 'links';

interface UseGameManagerShellBridgeOptions {
  games: Game[];
  closeGameManager: () => void;
  deleteGame: (gameId: string) => Promise<unknown>;
  loadLibrary: () => Promise<void>;
  openImportWorkbench: (options?: { autoStartScan?: boolean; initialMode?: ImportWorkbenchMode | null }) => void;
  setShowOptimizerModal: (open: boolean) => void;
  updateGameInState: (game: Game) => void;
}

export function useGameManagerShellBridge({
  games,
  closeGameManager,
  deleteGame,
  loadLibrary,
  openImportWorkbench,
  setShowOptimizerModal,
  updateGameInState,
}: UseGameManagerShellBridgeOptions) {
  const handleOpenImporterWithMode = useCallback(async (mode: ImportWorkbenchMode) => {
    closeGameManager();

    if (mode === 'nuclear') {
      const result = await window.electronAPI.clearLibrary?.();
      if (!result?.success) {
        console.error('Failed to clear library:', result?.error);
        return;
      }
      await loadLibrary();
      openImportWorkbench({ initialMode: 'nuclear', autoStartScan: true });
      return;
    }

    if (mode === 'images') {
      const result = await window.electronAPI.clearAllImages?.();
      if (!result?.success) {
        console.error('Failed to clear images:', result?.error);
        return;
      }
      await loadLibrary();
      openImportWorkbench({ initialMode: 'images' });
      return;
    }

    const result = await window.electronAPI.clearAllLinks?.();
    if (!result?.success) {
      console.error('Failed to clear links:', result?.error);
      return;
    }
    await loadLibrary();
    openImportWorkbench({ initialMode: 'links' });
  }, [closeGameManager, loadLibrary, openImportWorkbench]);

  const handleRequestOptimizer = useCallback(() => {
    setShowOptimizerModal(true);
  }, [setShowOptimizerModal]);

  const handleSaveGame = useCallback(async (game: Game, oldGame?: Game) => {
    const previousGame = oldGame ?? games.find((candidate) => candidate.id === game.id);
    await window.electronAPI.saveGame(game, previousGame);

    const isImageUpdate = !!previousGame && (
      game.boxArtUrl !== previousGame.boxArtUrl ||
      game.bannerUrl !== previousGame.bannerUrl ||
      game.alternativeBannerUrl !== previousGame.alternativeBannerUrl ||
      game.logoUrl !== previousGame.logoUrl ||
      game.heroUrl !== previousGame.heroUrl ||
      game.iconUrl !== previousGame.iconUrl
    );

    if (isImageUpdate) {
      updateGameInState(game);
      return;
    }

    await loadLibrary();
  }, [games, loadLibrary, updateGameInState]);

  const handleDeleteGame = useCallback(async (gameId: string) => {
    await deleteGame(gameId);
    await loadLibrary();
  }, [deleteGame, loadLibrary]);

  return {
    handleDeleteGame,
    handleOpenImporterWithMode,
    handleRequestOptimizer,
    handleSaveGame,
  };
}
