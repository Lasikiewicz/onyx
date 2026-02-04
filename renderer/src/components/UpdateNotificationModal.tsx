import React, { useState } from 'react';

interface UpdateNotificationModalProps {
  isOpen: boolean;
  version: string;
  status: 'available' | 'downloading' | 'downloaded' | 'error';
  error?: string;
  onUpdateNow: () => Promise<void>;
  onDismiss: () => void;
  onInstall: () => void;
}

export const UpdateNotificationModal: React.FC<UpdateNotificationModalProps> = ({
  isOpen,
  version,
  status,
  error,
  onUpdateNow,
  onDismiss,
  onInstall,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const handleUpdateNow = async () => {
    setIsDownloading(true);
    try {
      await onUpdateNow();
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[999]" />
      
      {/* Modal */}
      <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
        <div className="bg-gradient-to-br from-gray-900/95 to-slate-950/95 backdrop-blur-xl border border-cyan-500/40 rounded-3xl shadow-2xl w-full max-w-md p-8 animate-in fade-in zoom-in duration-300">
          <div className="flex flex-col items-center gap-6">
            {/* Icon */}
            <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>

            {/* Title */}
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-100 mb-2">
                Update Available
              </h2>
              <p className="text-slate-300 text-sm">
                A new version of Onyx is available: <span className="text-cyan-400 font-semibold">v{version}</span>
              </p>
            </div>

            {/* Status Messages */}
            {status === 'downloading' && (
              <div className="w-full bg-slate-800/50 rounded-lg p-4 border border-cyan-500/20">
                <div className="flex items-center gap-3">
                  <div className="animate-spin w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full" />
                  <span className="text-slate-200 text-sm">Downloading update... Please wait.</span>
                </div>
              </div>
            )}

            {status === 'downloaded' && (
              <div className="w-full bg-emerald-900/30 rounded-lg p-4 border border-emerald-500/30">
                <p className="text-emerald-300 text-sm text-center">
                  Update downloaded successfully! Click "Install Now" to apply the update.
                </p>
              </div>
            )}

            {status === 'error' && error && (
              <div className="w-full bg-red-900/30 rounded-lg p-4 border border-red-500/30">
                <p className="text-red-300 text-sm text-center">
                  {error}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-3 w-full">
              {status === 'available' && (
                <>
                  <button
                    onClick={handleUpdateNow}
                    disabled={isDownloading}
                    className="w-full px-6 py-3 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDownloading ? (
                      <>
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        Downloading...
                      </>
                    ) : (
                      'Download Update'
                    )}
                  </button>
                  <button
                    onClick={onDismiss}
                    className="w-full px-6 py-3 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-medium transition-colors border border-slate-600/50"
                  >
                    Dismiss
                  </button>
                </>
              )}

              {status === 'downloaded' && (
                <>
                  <button
                    onClick={onInstall}
                    className="w-full px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
                  >
                    Install Now
                  </button>
                  <button
                    onClick={onDismiss}
                    className="w-full px-6 py-3 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 font-medium transition-colors border border-slate-600/50"
                  >
                    Install Later
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
