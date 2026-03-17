import type { EditableGameFields } from '../../types/EditableGame';
import { LinkIcon, inferLinkKey } from '../GameLinks';

interface GamePropertiesLinksTabProps {
  editedFields: EditableGameFields;
  editingDisabled: boolean;
  updateField: <K extends keyof EditableGameFields>(field: K, value: EditableGameFields[K]) => void;
}

export const GamePropertiesLinksTab = ({
  editedFields,
  editingDisabled,
  updateField,
}: GamePropertiesLinksTabProps) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Links</label>
      <button
        type="button"
        onClick={() => updateField('links', [...(editedFields.links || []), { name: '', url: '' }])}
        disabled={editingDisabled}
        className="text-xs text-blue-400 hover:text-blue-300 font-medium px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        + Add Link
      </button>
    </div>
    {!editedFields.links || editedFields.links.length === 0 ? (
      <p className="text-sm text-gray-500 italic py-4">No links. Add links manually or they may be filled when you fix metadata match.</p>
    ) : (
      <div className="space-y-2">
        {(editedFields.links || []).map((link, idx) => (
          <div key={idx} className="flex gap-2 items-center">
            <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded border border-gray-600 bg-gray-800">
              <LinkIcon iconKey={inferLinkKey(link.url, link.name)} className="w-[70%] h-[70%]" customIconUrl={link.iconUrl} />
            </div>
            <input
              type="text"
              value={link.name}
              onChange={(event) => {
                const next = [...(editedFields.links || [])];
                next[idx] = { ...next[idx], name: event.target.value };
                updateField('links', next);
              }}
              placeholder="Label (e.g. Steam)"
              disabled={editingDisabled}
              className="w-28 px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <input
              type="text"
              value={link.url}
              onChange={(event) => {
                const next = [...(editedFields.links || [])];
                next[idx] = { ...next[idx], url: event.target.value };
                updateField('links', next);
              }}
              placeholder="URL"
              disabled={editingDisabled}
              className="flex-1 px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => updateField('links', (editedFields.links || []).filter((_, i) => i !== idx))}
              disabled={editingDisabled}
              className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded shrink-0 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    )}
  </div>
);
