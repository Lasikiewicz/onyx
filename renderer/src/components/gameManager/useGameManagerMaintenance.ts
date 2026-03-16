import { useCallback, useState } from 'react';
import type { MissingGame } from '../../types/game';

interface UseGameManagerMaintenanceOptions {
  selectedGameId: string | null;
  onDeleteGame?: (gameId: string) => Promise<void>;
  onReloadLibrary?: () => Promise<void>;
  setError: (value: string | null) => void;
  setSuccess: (value: string | null) => void;
  onDeleted: () => void;
}

export function useGameManagerMaintenance({
  selectedGameId,
  onDeleteGame,
  onReloadLibrary,
  setError,
  setSuccess,
  onDeleted,
}: UseGameManagerMaintenanceOptions) {
  const [showRemoveDeletedDialog, setShowRemoveDeletedDialog] = useState(false);
  const [missingGames, setMissingGames] = useState<MissingGame[]>([]);
  const [isScanningMissingGames, setIsScanningMissingGames] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenRemoveDialog = useCallback(async () => {
    setShowRemoveDeletedDialog(true);
    setIsScanningMissingGames(true);
    try {
      const result = await window.electronAPI.getMissingGames();
      if (result.success) {
        setMissingGames(result.games);
      } else {
        setError(result.error || 'Failed to scan for missing games');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan for missing games');
    } finally {
      setIsScanningMissingGames(false);
    }
  }, [setError]);

  const handleRemoveMissingGames = useCallback(async (gameIds: string[]) => {
    try {
      const result = await window.electronAPI.removeMissingGames(gameIds);
      if (result.success) {
        setSuccess(`Successfully removed ${result.removedCount} game(s)`);
        setShowRemoveDeletedDialog(false);
        if (onReloadLibrary) {
          await onReloadLibrary();
        }
      } else {
        setError(result.error || 'Failed to remove missing games');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove missing games');
    }
  }, [onReloadLibrary, setError, setSuccess]);

  const handleDelete = useCallback(async () => {
    if (!selectedGameId || !onDeleteGame) return;

    setIsDeleting(true);
    setError(null);

    try {
      await onDeleteGame(selectedGameId);
      setSuccess('Game deleted successfully');
      setShowDeleteConfirm(false);
      onDeleted();
      if (onReloadLibrary) {
        await onReloadLibrary();
      }
      setTimeout(() => {
        setSuccess(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete game');
      console.error('Error deleting game:', err);
    } finally {
      setIsDeleting(false);
    }
  }, [onDeleteGame, onDeleted, onReloadLibrary, selectedGameId, setError, setSuccess]);

  return {
    showRemoveDeletedDialog,
    setShowRemoveDeletedDialog,
    missingGames,
    isScanningMissingGames,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isDeleting,
    handleOpenRemoveDialog,
    handleRemoveMissingGames,
    handleDelete,
  };
}
