import type { Game } from '../../types/game';

interface GameManagerModManagerTabProps {
  editedGame: Game;
  isSaving: boolean;
  onEditedGameChange: (game: Game) => void;
  onBrowse: () => void;
  onLaunch: () => void;
  onSave: () => void;
  onCancel: () => void;
}

export function GameManagerModManagerTab({
  editedGame,
  isSaving,
  onEditedGameChange,
  onBrowse,
  onLaunch,
  onSave,
  onCancel,
}: GameManagerModManagerTabProps) {
  return (
    <div className="p-4">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Mod Manager Link</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={editedGame.modManagerUrl || ''}
              onChange={(event) => onEditedGameChange({ ...editedGame, modManagerUrl: event.target.value })}
              className="flex-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Enter mod manager URL or path (e.g., https://example.com/mod-manager)"
            />
            <button
              type="button"
              onClick={onBrowse}
              className="px-4 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
              title="Browse for mod manager executable"
            >
              Browse
            </button>
            <button
              type="button"
              onClick={onLaunch}
              className="px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              title="Test Launch Mod Manager"
            >
              Launch
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Enter the URL or path to your mod manager. This will appear in the game&apos;s context menu and bottom bar.
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
