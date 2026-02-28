import React, { useState } from 'react';

interface CrashDumpModalProps {
  isOpen: boolean;
  dumpCount: number;
  onSave: () => Promise<void>;
  onOpenFolder: () => Promise<void>;
  onDismiss: () => Promise<void>;
}

export const CrashDumpModal: React.FC<CrashDumpModalProps> = ({
  isOpen,
  dumpCount,
  onSave,
  onOpenFolder,
  onDismiss,
}) => {
  const [saving, setSaving] = useState(false);
  const [opening, setOpening] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave();
    } finally {
      setSaving(false);
    }
  };

  const handleOpenFolder = async () => {
    setOpening(true);
    try {
      await onOpenFolder();
    } finally {
      setOpening(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
        onClick={() => onDismiss()}
      />
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-amber-600/20">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Previous session ended unexpectedly</h2>
          </div>
          <div className="px-6 py-4">
            <p className="text-gray-300 mb-3">
              A crash report from the last run is available. Would you like to save it for debugging?
            </p>
            <p className="text-sm text-gray-500 mb-2">
              Note: Reports are only saved when the app crashes unexpectedly. If the app stopped responding and was closed by Windows, no report is generated.
            </p>
            {dumpCount > 0 && (
              <p className="text-sm text-gray-400">
                {dumpCount} file{dumpCount !== 1 ? 's' : ''} available.
              </p>
            )}
          </div>
          <div className="px-6 py-4 border-t border-gray-700 flex flex-wrap gap-3 justify-end">
            <button
              onClick={() => onDismiss()}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Don&apos;t save
            </button>
            <button
              onClick={handleOpenFolder}
              disabled={opening}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {opening ? 'Opening…' : 'Open folder'}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save crash report…'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
