import { ConfirmationDialog } from '../ConfirmationDialog';

type RefreshMode = 'nuclear' | 'images' | 'links' | 'optimizer' | null;

interface GameManagerRefreshConfirmDialogProps {
  isOpen: boolean;
  refreshMode: RefreshMode;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GameManagerRefreshConfirmDialog({
  isOpen,
  refreshMode,
  onConfirm,
  onCancel,
}: GameManagerRefreshConfirmDialogProps) {
  return (
    <ConfirmationDialog
      isOpen={isOpen}
      title={
        refreshMode === 'nuclear' ? 'Clear everything and re-run importer'
          : refreshMode === 'images' ? 'Search for missing images'
            : refreshMode === 'links' ? 'Refresh links from IGDB'
              : refreshMode === 'optimizer' ? 'Optimize all game images'
                : ''
      }
      message={
        refreshMode === 'nuclear'
          ? 'This will clear the entire library and image cache, then open Add Games to scan and import from scratch.'
          : refreshMode === 'images'
            ? 'This will keep your existing library and metadata, and only search for missing images.'
            : refreshMode === 'links'
              ? 'This will refresh links from IGDB for your existing games. IGDB API credentials are required.'
              : refreshMode === 'optimizer'
                ? 'Queue all current game images for background optimization (same pipeline as after import).'
                : ''
      }
      note={
        refreshMode === 'nuclear'
          ? 'Your library will be empty until you run the importer and import games again.'
          : refreshMode === 'optimizer'
            ? 'The optimizer panel will open so you can monitor progress.'
            : refreshMode === 'links'
              ? 'If IGDB is not configured, open Settings -> APIs and add IGDB client ID + secret first.'
              : 'Progress will run here and your library will stay in place.'
      }
      confirmText="Continue"
      cancelText="Cancel"
      variant="danger"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
