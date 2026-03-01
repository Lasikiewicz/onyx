import React from 'react';

interface RefreshMetadataDialogProps {
  isOpen: boolean;
  onSelectAll: () => void;
  onSelectMissing: () => void;
  onSelectLinksOnly?: () => void;
  onSelectOptimizeAllImages?: () => void;
  onSelectOptimizeAnimatedImages?: () => void;
  onCancel: () => void;
}

export const RefreshMetadataDialog: React.FC<RefreshMetadataDialogProps> = ({
  isOpen,
  onSelectAll,
  onSelectMissing,
  onSelectLinksOnly,
  onSelectOptimizeAllImages,
  onSelectOptimizeAnimatedImages,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[100] backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal - Centered */}
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div
          className="bg-gray-800 rounded-lg shadow-xl border border-gray-700 w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-600/20">
              <svg className="w-5 h-5 text-blue-400 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Manage Metadata</h2>
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            <p className="text-gray-300 mb-6">Choose an option:</p>

            <div className="space-y-4">
              {/* Refresh All Games Option */}
              <button
                onClick={onSelectAll}
                className="w-full text-left p-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg hover:border-blue-600 hover:bg-gray-900 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 px-2 py-0.5 bg-blue-600/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg border-l border-b border-blue-600/30">
                  Nuclear
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/30 transition-colors">
                    <svg className="w-6 h-6 text-blue-400 group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1 pr-12">
                    <h3 className="text-lg font-semibold text-white mb-1">Refresh all metadata for all games</h3>
                    <p className="text-sm text-gray-400">
                      This is the nuclear option. Removes all stored metadata and pulls everything fresh: metadata, images, icons, link icons.
                    </p>
                  </div>
                </div>
              </button>

              {/* Search for missing images only */}
              <button
                onClick={onSelectMissing}
                className="w-full text-left p-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg hover:border-green-600 hover:bg-gray-900 transition-all group relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 px-2 py-0.5 bg-green-600/20 text-green-400 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg border-l border-b border-green-600/30">
                  Images only
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-green-600/30 transition-colors">
                    <svg className="w-6 h-6 text-green-400 group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1 pr-12">
                    <h3 className="text-lg font-semibold text-white mb-1">Search for missing images only</h3>
                    <p className="text-sm text-gray-400">
                      This will only search for missing images (all image types).
                    </p>
                  </div>
                </div>
              </button>

              {/* Refresh all Links */}
              {onSelectLinksOnly && (
                <button
                  onClick={onSelectLinksOnly}
                  className="w-full text-left p-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg hover:border-purple-600 hover:bg-gray-900 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-purple-600/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg border-l border-b border-purple-600/30">
                    Links only
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-purple-600/30 transition-colors">
                      <svg className="w-6 h-6 text-purple-400 group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                    </div>
                    <div className="flex-1 pr-12">
                      <h3 className="text-lg font-semibold text-white mb-1">Refresh all Links</h3>
                      <p className="text-sm text-gray-400">
                        Nukes all links from all games and adds them fresh.
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {onSelectOptimizeAllImages && (
                <button
                  onClick={onSelectOptimizeAllImages}
                  className="w-full text-left p-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg hover:border-amber-600 hover:bg-gray-900 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-amber-600/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg border-l border-b border-amber-600/30">
                    Optimizer
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-amber-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-600/30 transition-colors">
                      <svg className="w-6 h-6 text-amber-400 group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 pr-12">
                      <h3 className="text-lg font-semibold text-white mb-1">Optimize all game images</h3>
                      <p className="text-sm text-gray-400">
                        Queue all current game images for background optimization using the same importer optimizer pipeline.
                      </p>
                    </div>
                  </div>
                </button>
              )}

              {onSelectOptimizeAnimatedImages && (
                <button
                  onClick={onSelectOptimizeAnimatedImages}
                  className="w-full text-left p-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg hover:border-cyan-600 hover:bg-gray-900 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 px-2 py-0.5 bg-cyan-600/20 text-cyan-400 text-[10px] font-bold uppercase tracking-wider rounded-bl-lg border-l border-b border-cyan-600/30">
                    WebP only
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-cyan-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-cyan-600/30 transition-colors">
                      <svg className="w-6 h-6 text-cyan-400 group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="flex-1 pr-12">
                      <h3 className="text-lg font-semibold text-white mb-1">Optimize animated images</h3>
                      <p className="text-sm text-gray-400">
                        Opens the optimizer and runs a WebP-only pass. Files above 15MB are force-processed instead of skipped.
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="px-6 py-4 border-t border-gray-700 flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
