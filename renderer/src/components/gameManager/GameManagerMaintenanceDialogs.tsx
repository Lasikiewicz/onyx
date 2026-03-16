import type { MissingGame } from '../../types/game';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { RemoveDeletedGamesDialog } from '../RemoveDeletedGamesDialog';

interface GameManagerMaintenanceDialogsProps {
  showDeleteConfirm: boolean;
  selectedGameTitle?: string;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  showRemoveDeletedDialog: boolean;
  missingGames: MissingGame[];
  isScanningMissingGames: boolean;
  onRemoveMissingGames: (gameIds: string[]) => Promise<void>;
  onCancelRemoveDeleted: () => void;
}

export function GameManagerMaintenanceDialogs({
  showDeleteConfirm,
  selectedGameTitle,
  onConfirmDelete,
  onCancelDelete,
  showRemoveDeletedDialog,
  missingGames,
  isScanningMissingGames,
  onRemoveMissingGames,
  onCancelRemoveDeleted,
}: GameManagerMaintenanceDialogsProps) {
  return (
    <>
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Game"
        message={`Are you sure you want to delete "${selectedGameTitle || 'this game'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={onConfirmDelete}
        onCancel={onCancelDelete}
        variant="danger"
      />

      <RemoveDeletedGamesDialog
        isOpen={showRemoveDeletedDialog}
        missingGames={missingGames}
        isScanning={isScanningMissingGames}
        onRemove={onRemoveMissingGames}
        onCancel={onCancelRemoveDeleted}
      />
    </>
  );
}
