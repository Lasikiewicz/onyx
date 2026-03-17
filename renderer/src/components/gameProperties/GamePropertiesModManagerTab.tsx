import type { Game } from '../../types/game';

interface GamePropertiesModManagerTabProps {
  game: Game;
  isStaged: boolean;
}

export const GamePropertiesModManagerTab = ({
  game,
  isStaged,
}: GamePropertiesModManagerTabProps) => (
  <div className="space-y-4">
    {isStaged ? (
      <p className="text-sm text-gray-400 py-4">Mod manager can be configured after importing this game (in Game Manager {'->'} Mod Manager tab).</p>
    ) : (
      <div>
        <label className="text-xs font-medium text-gray-400 mb-1 block">Mod Manager Link</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={game.modManagerUrl || ''}
            readOnly
            className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-sm text-gray-400"
            placeholder="Configure in Game Manager"
          />
          {game.modManagerUrl && (
            <button
              type="button"
              onClick={async () => {
                if (!game.id) return;

                try {
                  const result = await window.electronAPI.launchModManager(game.id);
                  if (!result.success && result.error) {
                    console.error('Error launching mod manager:', result.error);
                  }
                } catch (error) {
                  console.error('Error opening mod manager:', error);
                }
              }}
              className="px-4 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
              title="Launch Mod Manager"
            >
              Launch
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-2">Edit the mod manager URL in Game Manager.</p>
      </div>
    )}
  </div>
);
