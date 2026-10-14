import React, { useCallback, useEffect, useState } from 'react';

interface LibraryBackup {
  file: string;
  savedAt: string;
  reason: string;
  gameCount: number;
}

/**
 * Lists the library snapshots Onyx keeps before destructive actions, and restores one (E3).
 * Restoring replaces the library and reloads the window, so the view shows the restored games.
 */
export const SettingsLibraryBackups: React.FC = () => {
  const [backups, setBackups] = useState<LibraryBackup[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [restoringFile, setRestoringFile] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await window.electronAPI.listLibraryBackups();
      setBackups(list);
    } catch (error) {
      console.error('Failed to list library backups:', error);
      setBackups([]);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const restore = async (file: string) => {
    setRestoringFile(file);
    setMessage(null);
    try {
      const result = await window.electronAPI.restoreLibraryBackup(file);
      if (result.success) {
        // The library is replaced in main. Reload so the view reads the restored state.
        window.location.reload();
        return;
      }
      setMessage(result.error || 'Restore failed');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Restore failed');
    } finally {
      setRestoringFile(null);
      setPendingFile(null);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-base font-medium text-white">Library Backups</h4>
      <p className="text-gray-400 text-sm">
        Onyx saves a copy of your library before bulk removals and before restoring. The newest five are kept.
      </p>

      {!loaded && <p className="text-gray-500 text-sm">Loading backups...</p>}
      {loaded && backups.length === 0 && (
        <p className="text-gray-500 text-sm">No backups yet.</p>
      )}

      {backups.length > 0 && (
        <ul className="space-y-2">
          {backups.map((backup) => (
            <li key={backup.file} className="flex items-center justify-between gap-3 p-3 bg-gray-700/30 rounded-lg border border-gray-600">
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{new Date(backup.savedAt).toLocaleString()}</p>
                <p className="text-xs text-gray-500 truncate">
                  {backup.reason} · {backup.gameCount} game{backup.gameCount === 1 ? '' : 's'}
                </p>
              </div>
              {pendingFile === backup.file ? (
                <div className="flex gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setPendingFile(null)}
                    className="px-3 py-1.5 bg-gray-700 text-white text-xs rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => void restore(backup.file)}
                    disabled={restoringFile !== null}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded disabled:opacity-50"
                  >
                    {restoringFile === backup.file ? 'Restoring...' : 'Confirm restore'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPendingFile(backup.file)}
                  disabled={restoringFile !== null}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded flex-shrink-0 disabled:opacity-50"
                >
                  Restore
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {message && <p className="text-red-400 text-sm">{message}</p>}
    </div>
  );
};
