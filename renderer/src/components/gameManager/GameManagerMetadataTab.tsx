import { LauncherIcon, getLauncherDisplayName } from '../../utils/launcherIcons';
import type { Game } from '../../types/game';
import { GameArtworkStrip } from './GameArtworkStrip';

type ImageType = 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon';

interface MetadataSearchResult {
  id: string;
  source: string;
  steamAppId?: string;
  title?: string;
  name?: string;
  releaseDate?: number | string;
  year?: number;
}

interface GameManagerMetadataTabProps {
  editedGame: Game;
  selectedGame: Game;
  showFixMatch: boolean;
  metadataSearchQuery: string;
  metadataSearchResults: MetadataSearchResult[];
  isSearchingMetadata: boolean;
  isApplyingMetadata: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  newCategoryInput: string;
  canDelete: boolean;
  onOpenImageSearch: (type: ImageType) => void;
  onEditedGameChange: (game: Game) => void;
  onMetadataSearchQueryChange: (value: string) => void;
  onFixMatchSearch: () => void;
  onToggleFixMatch: () => Promise<void> | void;
  onSelectMetadataMatch: (result: { id: string; source: string; steamAppId?: string; title?: string }) => void;
  onNewCategoryInputChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  getSourceDisplayName: (source: string) => string;
}

export function GameManagerMetadataTab({
  editedGame,
  selectedGame,
  showFixMatch,
  metadataSearchQuery,
  metadataSearchResults,
  isSearchingMetadata,
  isApplyingMetadata,
  isSaving,
  isDeleting,
  newCategoryInput,
  canDelete,
  onOpenImageSearch,
  onEditedGameChange,
  onMetadataSearchQueryChange,
  onFixMatchSearch,
  onToggleFixMatch,
  onSelectMetadataMatch,
  onNewCategoryInputChange,
  onSave,
  onCancel,
  onDelete,
  getSourceDisplayName,
}: GameManagerMetadataTabProps) {
  const updateEditedGame = (patch: Partial<Game>) => {
    onEditedGameChange({ ...editedGame, ...patch });
  };

  return (
    <div className="p-4 h-full overflow-y-auto">
      <div className="mb-6 rounded-lg border border-gray-800 bg-gray-900/50 p-3">
        <GameArtworkStrip
          editedGame={editedGame}
          selectedGame={selectedGame}
          onOpenImageSearch={onOpenImageSearch}
          onOpenContextMenu={() => {
            return;
          }}
        />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-400">Title</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  const newLockedFields = { ...editedGame.lockedFields };
                  newLockedFields.title = !newLockedFields.title;
                  updateEditedGame({ lockedFields: newLockedFields });
                }}
                className={`flex items-center justify-center rounded p-1.5 transition-colors ${editedGame.lockedFields?.title ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white'}`}
                title={editedGame.lockedFields?.title ? 'Unlock Title' : 'Lock Title'}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {editedGame.lockedFields?.title ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                  )}
                </svg>
              </button>
              <input
                type="text"
                value={showFixMatch ? metadataSearchQuery : editedGame.title}
                onChange={(event) => {
                  if (showFixMatch) {
                    onMetadataSearchQueryChange(event.target.value);
                    return;
                  }

                  updateEditedGame({ title: event.target.value });
                }}
                onKeyDown={(event) => {
                  if (showFixMatch && event.key === 'Enter') {
                    onFixMatchSearch();
                  }
                }}
                placeholder={showFixMatch ? 'Enter game title to search...' : ''}
                className="flex-1 rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                disabled={(showFixMatch && isSearchingMetadata) || editedGame.lockedFields?.title}
              />
              {showFixMatch && (
                <button
                  onClick={onFixMatchSearch}
                  disabled={isSearchingMetadata}
                  className="flex items-center gap-2 rounded bg-blue-600 px-4 py-1.5 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSearchingMetadata ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Searching...
                    </>
                  ) : (
                    'Search'
                  )}
                </button>
              )}
              <button
                onClick={() => {
                  void onToggleFixMatch();
                }}
                className="flex items-center gap-1.5 rounded bg-purple-600 px-3 py-1.5 text-sm text-white transition-colors hover:bg-purple-700"
              >
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                {showFixMatch ? 'Hide' : 'Fix Match'}
              </button>
            </div>
          </div>
        </div>

        {showFixMatch && (
          <div className="space-y-2">
            {isSearchingMetadata && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Searching for metadata matches...
              </div>
            )}

            {metadataSearchResults.length > 0 && (
              <div className="max-h-96 overflow-y-auto">
                <div className="space-y-2">
                  {metadataSearchResults.map((result) => {
                    let displayDate: string | undefined;
                    if (result.releaseDate) {
                      if (typeof result.releaseDate === 'number') {
                        const date = new Date(result.releaseDate * 1000);
                        displayDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                      } else if (typeof result.releaseDate === 'string') {
                        const date = new Date(result.releaseDate);
                        displayDate = Number.isNaN(date.getTime())
                          ? result.releaseDate
                          : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                      }
                    } else if (result.year) {
                      displayDate = result.year.toString();
                    }

                    return (
                      <button
                        key={result.id}
                        onClick={() => onSelectMetadataMatch({ id: result.id, source: result.source, steamAppId: result.steamAppId, title: result.title || result.name })}
                        disabled={isApplyingMetadata}
                        className="relative flex w-full items-center gap-3 rounded border border-gray-600 bg-gray-800 p-3 text-left text-sm transition-colors hover:bg-gray-700 disabled:opacity-50"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-white" title={result.title || result.name}>
                            {result.title || result.name}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className={`text-xs ${result.source === 'steam' ? 'text-blue-400' : 'text-gray-400'}`}>
                              {result.source === 'steam' ? 'Steam' : result.source === 'igdb' ? 'IGDB' : result.source === 'steamgriddb' ? 'SGDB' : result.source}
                            </span>
                            {result.steamAppId && <span className="text-xs text-gray-500">App ID: {result.steamAppId}</span>}
                            {displayDate && <span className="text-xs text-gray-400">Date: {displayDate}</span>}
                          </div>
                        </div>
                        {isApplyingMetadata && (
                          <div className="absolute inset-0 flex items-center justify-center rounded bg-black/50">
                            <svg className="h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-4 lg:flex-row">
          <div className="flex-1">
            <label className="mb-1 block text-xs font-medium text-gray-400">Description</label>
            <textarea
              value={editedGame.description || ''}
              onChange={(event) => updateEditedGame({ description: event.target.value })}
              className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={4}
            />
          </div>

          <div className="flex w-full flex-col lg:w-[35%]">
            <label className="mb-1 block text-xs font-medium text-gray-400">Categories</label>
            <div className="flex max-h-[104px] flex-1 flex-col gap-2 overflow-y-auto rounded border border-gray-700 bg-gray-800/50 p-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-600">
              <div className="flex flex-wrap gap-1">
                {editedGame.categories?.map((category, index) => (
                  <span key={index} className="group inline-flex items-center gap-1 rounded-full border border-blue-700/30 bg-blue-900/30 px-2 py-0.5 text-[10px] font-medium text-blue-200 transition-colors hover:border-blue-500/50">
                    {category}
                    <button
                      onClick={() => {
                        const newCategories = [...(editedGame.categories || [])];
                        newCategories.splice(index, 1);
                        updateEditedGame({ categories: newCategories });
                      }}
                      className="ml-0.5 rounded-full text-blue-400 focus:outline-none hover:text-white"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                value={newCategoryInput}
                onChange={(event) => onNewCategoryInputChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') {
                    return;
                  }

                  event.preventDefault();
                  const newCategory = newCategoryInput.trim();
                  if (!newCategory) {
                    return;
                  }

                  const currentCategories = editedGame.categories || [];
                  if (currentCategories.includes(newCategory)) {
                    return;
                  }

                  updateEditedGame({ categories: [...currentCategories, newCategory] });
                  onNewCategoryInputChange('');
                }}
                placeholder="Add category..."
                className="w-full border-none bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {editedGame.platform && editedGame.platform !== 'other' && (
            <div>
              <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Platform</label>
              <div className="relative">
                <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-300">
                  <LauncherIcon launcher={editedGame.platform} className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  value={getLauncherDisplayName(editedGame.platform)}
                  onChange={(event) => updateEditedGame({ platform: event.target.value })}
                  className="w-full rounded border border-gray-600 bg-gray-800 py-1 pl-7 pr-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Release Date</label>
            <input
              type="text"
              value={editedGame.releaseDate || ''}
              onChange={(event) => updateEditedGame({ releaseDate: event.target.value })}
              placeholder="YYYY-MM-DD"
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Age Rating</label>
            <input
              type="text"
              value={editedGame.ageRating || ''}
              onChange={(event) => updateEditedGame({ ageRating: event.target.value })}
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Series</label>
            <input
              type="text"
              value={editedGame.series || ''}
              onChange={(event) => updateEditedGame({ series: event.target.value })}
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Genres</label>
            <input
              type="text"
              value={editedGame.genres?.join(', ') || ''}
              onChange={(event) => updateEditedGame({ genres: event.target.value.split(',').map((genre) => genre.trim()).filter(Boolean) })}
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Developers</label>
            <input
              type="text"
              value={editedGame.developers?.join(', ') || ''}
              onChange={(event) => updateEditedGame({ developers: event.target.value.split(',').map((developer) => developer.trim()).filter(Boolean) })}
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Publishers</label>
            <input
              type="text"
              value={editedGame.publishers?.join(', ') || ''}
              onChange={(event) => updateEditedGame({ publishers: event.target.value.split(',').map((publisher) => publisher.trim()).filter(Boolean) })}
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Source</label>
            <div className="relative">
              <div className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-gray-300">
                <LauncherIcon launcher={editedGame.source || 'other'} className="h-3.5 w-3.5" />
              </div>
              <input
                type="text"
                value={getSourceDisplayName(editedGame.source || '')}
                onChange={(event) => updateEditedGame({ source: event.target.value })}
                className="w-full rounded border border-gray-600 bg-gray-800 py-1 pl-7 pr-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="col-span-2">
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Install Directory</label>
            <input
              type="text"
              value={editedGame.installationDirectory || ''}
              onChange={(event) => updateEditedGame({ installationDirectory: event.target.value })}
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="col-span-2">
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Executable Path</label>
            <input
              type="text"
              value={editedGame.exePath || ''}
              onChange={(event) => updateEditedGame({ exePath: event.target.value })}
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-gray-500">Install Size</label>
            <input
              type="text"
              value={editedGame.installSize ? `${Math.round(editedGame.installSize / 1024 / 1024 / 1024 * 100) / 100} GB` : ''}
              readOnly
              className="w-full rounded border border-gray-600 bg-gray-800/50 px-2 py-1 text-xs text-gray-400"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex-1 rounded bg-blue-600 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onCancel}
            className="rounded bg-gray-600 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700"
          >
            Cancel
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
