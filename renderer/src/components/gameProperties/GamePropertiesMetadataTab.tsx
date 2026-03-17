import type { ReactNode, KeyboardEvent } from 'react';
import type { Game } from '../../types/game';
import type { StagedGame } from '../../types/importer';
import type { EditableGameFields } from '../../types/EditableGame';

interface GamePropertiesMetadataTabProps {
  allCategories: string[];
  canUndo: boolean;
  editedFields: EditableGameFields;
  editingDisabled: boolean;
  game: Game | StagedGame;
  isSearchingMetadata: boolean;
  isStaged: boolean;
  metadataSearchQuery: string;
  metadataSearchResults: any[];
  newCategoryInput: string;
  onAddCategory: (category: string) => void;
  onApplyMatch: (result: any) => void;
  onCategoryInputChange: (value: string) => void;
  onCategoryInputKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onFixMatchSearch: () => void;
  onToggleFixMatch: () => void;
  onUndo: () => void;
  renderImageStrip: () => ReactNode;
  setMetadataSearchQuery: (value: string) => void;
  showFixMatch: boolean;
  updateField: <K extends keyof EditableGameFields>(field: K, value: EditableGameFields[K]) => void;
}

export function GamePropertiesMetadataTab({
  allCategories,
  canUndo,
  editedFields,
  editingDisabled,
  game,
  isSearchingMetadata,
  isStaged,
  metadataSearchQuery,
  metadataSearchResults,
  newCategoryInput,
  onAddCategory,
  onApplyMatch,
  onCategoryInputChange,
  onCategoryInputKeyDown,
  onFixMatchSearch,
  onToggleFixMatch,
  onUndo,
  renderImageStrip,
  setMetadataSearchQuery,
  showFixMatch,
  updateField,
}: GamePropertiesMetadataTabProps) {
  const filteredAutocompleteCategories = allCategories.filter(
    (category) =>
      category.toLowerCase().includes(newCategoryInput.toLowerCase()) &&
      !(editedFields.categories || []).includes(category),
  );

  return (
    <div className="space-y-4">
      {renderImageStrip()}

      <div>
        <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
        <div className="flex gap-2">
          {canUndo && (
            <button onClick={onUndo} disabled={editingDisabled} className="px-2 py-1.5 text-xs text-yellow-400 hover:text-yellow-300 bg-gray-700 rounded disabled:opacity-50">
              Undo
            </button>
          )}
          <input
            type="text"
            value={!showFixMatch ? editedFields.title : metadataSearchQuery}
            onChange={(e) => (showFixMatch ? setMetadataSearchQuery(e.target.value) : updateField('title', e.target.value))}
            onKeyDown={(e) => showFixMatch && e.key === 'Enter' && onFixMatchSearch()}
            placeholder={showFixMatch ? 'Enter game title to search...' : ''}
            className="flex-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            disabled={editingDisabled || (showFixMatch && isSearchingMetadata)}
          />
          {showFixMatch && (
            <button onClick={onFixMatchSearch} disabled={editingDisabled || isSearchingMetadata} className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2">
              {isSearchingMetadata ? <><span className="animate-pulse">Searching...</span></> : 'Search'}
            </button>
          )}
          <button
            onClick={onToggleFixMatch}
            disabled={editingDisabled}
            className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {showFixMatch ? 'Hide' : 'Fix Match'}
          </button>
        </div>
      </div>

      {showFixMatch && metadataSearchResults.length > 0 && (
        <div className="max-h-48 overflow-y-auto bg-gray-800 rounded border border-gray-700">
          {metadataSearchResults.map((result) => (
            <div key={result.id} onClick={() => !editingDisabled && onApplyMatch(result)} className={`p-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
              <div className="font-medium text-sm text-white">{result.title || result.name}</div>
              <div className="text-xs text-gray-400">{result.year} • {result.platform || result.source}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
          <textarea
            value={editedFields.description || ''}
            onChange={(e) => updateField('description', e.target.value)}
            className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            disabled={editingDisabled}
            rows={4}
          />
        </div>
        <div className="w-full lg:w-[35%] flex flex-col">
          <label className="block text-xs font-medium text-gray-400 mb-1">Categories</label>
          <div className="p-2 bg-gray-800/50 rounded border border-gray-700 flex flex-col gap-2 max-h-[104px] overflow-y-auto">
            <div className="flex flex-wrap gap-1">
              {editedFields.categories?.map((category) => (
                <span key={category} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-blue-900/30 text-blue-200 border border-blue-700/30 rounded-full">
                  {category}
                  <button onClick={() => !editingDisabled && updateField('categories', (editedFields.categories || []).filter((value) => value !== category))} disabled={editingDisabled} className="ml-0.5 text-blue-400 hover:text-white disabled:opacity-50">x</button>
                </span>
              ))}
            </div>
            <div className="relative">
              <input
                value={newCategoryInput}
                onChange={(e) => onCategoryInputChange(e.target.value)}
                onKeyDown={onCategoryInputKeyDown}
                placeholder="Add category..."
                disabled={editingDisabled}
                className="w-full bg-transparent border-none text-xs text-white focus:outline-none placeholder-gray-500 disabled:opacity-50"
              />
              {newCategoryInput.trim() && filteredAutocompleteCategories.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-700 rounded shadow-xl max-h-32 overflow-y-auto">
                  {filteredAutocompleteCategories.map((category) => (
                    <div
                      key={category}
                      onClick={() => {
                        onAddCategory(category);
                        onCategoryInputChange('');
                      }}
                      className="px-2 py-1.5 text-xs text-white hover:bg-blue-600 cursor-pointer border-b border-gray-700/50 last:border-0"
                    >
                      {category}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {allCategories.length > 0 && (
            <div className="mt-2">
              <p className="text-[10px] uppercase font-bold text-gray-500 mb-1">Quick Add</p>
              <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto custom-scrollbar">
                {allCategories
                  .filter((category) => !(editedFields.categories || []).includes(category))
                  .slice(0, 20)
                  .map((category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => onAddCategory(category)}
                      disabled={editingDisabled}
                      className="px-2 py-0.5 text-[10px] bg-gray-800/80 hover:bg-gray-700 text-gray-400 hover:text-white rounded border border-gray-700 hover:border-gray-500 transition-colors disabled:opacity-50"
                    >
                      + {category}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Release Date</label>
          <input
            type="text"
            value={editedFields.releaseDate || ''}
            onChange={(e) => updateField('releaseDate', e.target.value)}
            placeholder="YYYY-MM-DD"
            disabled={editingDisabled}
            className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Age Rating</label>
          <input
            type="text"
            value={editedFields.ageRating || ''}
            onChange={(e) => updateField('ageRating', e.target.value)}
            disabled={editingDisabled}
            className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Genres</label>
          <input
            type="text"
            value={editedFields.genres?.join(', ') || ''}
            onChange={(e) => updateField('genres', e.target.value.split(',').map((value) => value.trim()).filter(Boolean))}
            disabled={editingDisabled}
            className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Developers</label>
          <input
            type="text"
            value={editedFields.developers?.join(', ') || ''}
            onChange={(e) => updateField('developers', e.target.value.split(',').map((value) => value.trim()).filter(Boolean))}
            disabled={editingDisabled}
            className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Publishers</label>
          <input
            type="text"
            value={editedFields.publishers?.join(', ') || ''}
            onChange={(e) => updateField('publishers', e.target.value.split(',').map((value) => value.trim()).filter(Boolean))}
            disabled={editingDisabled}
            className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </div>
        {isStaged && (game as StagedGame).source !== undefined && (
          <div>
            <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Source</label>
            <input
              type="text"
              value={(game as StagedGame).source ? (game as StagedGame).source!.charAt(0).toUpperCase() + (game as StagedGame).source!.slice(1) : ''}
              readOnly
              className="w-full px-2 py-1 text-xs bg-gray-800/50 border border-gray-600 rounded text-gray-400"
            />
          </div>
        )}
        {isStaged && (
          <>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Install Directory</label>
              <input
                type="text"
                value={editedFields.installPath ?? (game as StagedGame).installPath ?? ''}
                onChange={(e) => updateField('installPath', e.target.value)}
                disabled={editingDisabled}
                className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Executable Path</label>
              <input
                type="text"
                value={editedFields.exePath ?? (game as StagedGame).exePath ?? ''}
                onChange={(e) => updateField('exePath', e.target.value)}
                disabled={editingDisabled}
                className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Launch arguments</label>
              <input
                type="text"
                value={editedFields.launchArgs ?? (game as any).launchArgs ?? ''}
                onChange={(e) => updateField('launchArgs', e.target.value)}
                disabled={editingDisabled}
                placeholder="e.g. -savetouserdir"
                className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 placeholder:text-gray-500"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
