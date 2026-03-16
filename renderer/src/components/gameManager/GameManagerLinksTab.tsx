import { LinkIcon, inferLinkKey } from '../GameLinks';
import type { Game } from '../../types/game';

interface FoundLink {
  name: string;
  url: string;
}

interface GameManagerLinksTabProps {
  editedGame: Game;
  isRefreshingLinks: boolean;
  foundLinks: FoundLink[] | null;
  isSaving: boolean;
  isDeleting: boolean;
  canDelete: boolean;
  onRefreshLinks: () => void;
  onEditedGameChange: (game: Game) => void;
  onSetFoundLinks: (links: FoundLink[] | null) => void;
  onSetLinkIconPopupIndex: (index: number | null) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
}

export function GameManagerLinksTab({
  editedGame,
  isRefreshingLinks,
  foundLinks,
  isSaving,
  isDeleting,
  canDelete,
  onRefreshLinks,
  onEditedGameChange,
  onSetFoundLinks,
  onSetLinkIconPopupIndex,
  onSave,
  onCancel,
  onDelete,
}: GameManagerLinksTabProps) {
  return (
    <div className="p-4 h-full overflow-y-auto flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Official Links</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRefreshLinks}
            disabled={isRefreshingLinks}
            className="text-xs text-green-400 hover:text-green-300 font-medium px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 rounded transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg className={`w-4 h-4 ${isRefreshingLinks ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {isRefreshingLinks ? 'Searching...' : 'Refresh Links'}
          </button>
          <button
            type="button"
            onClick={() => {
              onEditedGameChange({
                ...editedGame,
                links: [...(editedGame.links || []), { name: '', url: '' }],
              });
            }}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded transition-colors"
          >
            + Add Link
          </button>
        </div>
      </div>
      <div className="space-y-2 flex-1 min-h-0 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {isRefreshingLinks ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <div className="text-sm text-gray-400">Searching for Links...</div>
          </div>
        ) : foundLinks ? (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Found Links</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const existing = editedGame.links || [];
                    const existingTypes = new Set(existing.map((link) => (link.name || '').toLowerCase()));
                    const deduped = foundLinks.filter((link) => !existingTypes.has((link.name || '').toLowerCase()));
                    onEditedGameChange({
                      ...editedGame,
                      links: [...existing, ...deduped],
                    });
                    onSetFoundLinks(null);
                  }}
                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                >
                  Apply All
                </button>
                <button
                  type="button"
                  onClick={() => onSetFoundLinks(null)}
                  className="text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 px-2 py-1 rounded transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              {foundLinks.map((link, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs bg-gray-800/50 px-2 py-1.5 rounded">
                  <span className="text-gray-300 font-medium truncate">{link.name}</span>
                  <span className="text-gray-500 truncate ml-2 max-w-[200px]">{link.url}</span>
                </div>
              ))}
              {foundLinks.length === 0 && <div className="text-xs text-gray-500 italic py-2">No new links found.</div>}
            </div>
          </div>
        ) : !editedGame.links || editedGame.links.length === 0 ? (
          <div className="text-sm text-gray-500 italic py-6">No links added. Use Refresh Links to fetch from IGDB or add manually.</div>
        ) : (
          <div className="space-y-2">
            {editedGame.links.map((link, idx) => {
              const iconKey = inferLinkKey(link.url, link.name);
              return (
                <div key={idx} className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() => onSetLinkIconPopupIndex(idx)}
                    title="Change icon"
                    className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded text-white border border-gray-600 hover:border-gray-500 transition-colors"
                  >
                    <LinkIcon iconKey={iconKey} className="w-[70%] h-[70%]" customIconUrl={link.iconUrl} />
                  </button>
                  <input
                    type="text"
                    value={link.name}
                    onChange={(event) => {
                      const newLinks = [...editedGame.links!];
                      newLinks[idx] = { ...newLinks[idx], name: event.target.value };
                      onEditedGameChange({ ...editedGame, links: newLinks });
                    }}
                    placeholder="Label (e.g. Steam)"
                    className="w-28 px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={link.url}
                    onChange={(event) => {
                      const newLinks = [...editedGame.links!];
                      newLinks[idx] = { ...newLinks[idx], url: event.target.value };
                      onEditedGameChange({ ...editedGame, links: newLinks });
                    }}
                    placeholder="URL"
                    className="flex-1 px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const newLinks = [...editedGame.links!];
                      newLinks.splice(idx, 1);
                      onEditedGameChange({ ...editedGame, links: newLinks });
                    }}
                    className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors shrink-0"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className="flex gap-2 pt-4 mt-4 border-t border-gray-700 flex-shrink-0">
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
        {canDelete && (
          <button
            onClick={onDelete}
            disabled={isDeleting}
            className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
