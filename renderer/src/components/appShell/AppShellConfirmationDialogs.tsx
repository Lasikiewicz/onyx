import { ConfirmationDialog } from '../ConfirmationDialog';
import type { Game } from '../../types/game';

interface AppShellConfirmationDialogsProps {
  confirmLaunch: () => Promise<void>;
  hideConfirmation: { game: Game } | null;
  launchConfirmation: { game: Game } | null;
  onCancelHide: () => void;
  onCancelLaunch: () => void;
  onCancelUninstall: () => void;
  onConfirmHide: () => Promise<void>;
  onConfirmUninstall: () => Promise<void>;
  onRemoveFromLibraryChange: (checked: boolean) => void;
  uninstallConfirmation: { game: Game; removeFromLibrary: boolean } | null;
}

export function AppShellConfirmationDialogs({
  confirmLaunch,
  hideConfirmation,
  launchConfirmation,
  onCancelHide,
  onCancelLaunch,
  onCancelUninstall,
  onConfirmHide,
  onConfirmUninstall,
  onRemoveFromLibraryChange,
  uninstallConfirmation,
}: AppShellConfirmationDialogsProps) {
  return (
    <>
      {hideConfirmation && (
        <ConfirmationDialog
          isOpen={true}
          title={`Hide "${hideConfirmation.game.title}"?`}
          message="This game will be hidden from your library view."
          note="You can find hidden games by selecting the 'Hidden' category from the Categories dropdown."
          confirmText="Hide"
          cancelText="Cancel"
          onConfirm={onConfirmHide}
          onCancel={onCancelHide}
        />
      )}

      {uninstallConfirmation && (
        <ConfirmationDialog
          isOpen={true}
          title={`Uninstall "${uninstallConfirmation.game.title}"?`}
          message="Onyx will try to open the game's uninstaller. If no local uninstaller is found, Windows Settings > Apps will open instead."
          note="Removing a game from the library only affects Onyx. It does not uninstall files by itself."
          confirmText="Open Uninstaller"
          cancelText="Cancel"
          onConfirm={onConfirmUninstall}
          onCancel={onCancelUninstall}
          variant="danger"
        >
          <label className="flex items-start gap-3 rounded border border-gray-700 bg-gray-900/50 p-3 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={uninstallConfirmation.removeFromLibrary}
              onChange={(event) => onRemoveFromLibraryChange(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500"
            />
            <span>Also remove this game from the Onyx library after opening the uninstall flow.</span>
          </label>
        </ConfirmationDialog>
      )}

      {launchConfirmation && (
        <ConfirmationDialog
          isOpen={true}
          title={`Launch "${launchConfirmation.game.title}"?`}
          message="Are you sure you want to launch this game?"
          confirmText="Launch"
          cancelText="Cancel"
          onConfirm={confirmLaunch}
          onCancel={onCancelLaunch}
        />
      )}
    </>
  );
}
