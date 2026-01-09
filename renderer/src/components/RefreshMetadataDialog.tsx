import React from 'react';

interface RefreshMetadataDialogProps {
  isOpen: boolean;
  onSelectAll: () => void;
  onSelectMissing: () => void;
  onCancel: () => void;
}

export const RefreshMetadataDialog: React.FC<RefreshMetadataDialogProps> = ({
  isOpen,
  onSelectAll,
  onSelectMissing,
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
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-white">Refresh Metadata</h2>
          </div>
          
          {/* Content */}
          <div className="px-6 py-6">
            <p className="text-gray-300 mb-6">Choose which games to refresh metadata and images for:</p>
            
            <div className="space-y-4">
              {/* Refresh All Games Option */}
              <button
                onClick={onSelectAll}
                className="w-full text-left p-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg hover:border-blue-600 hover:bg-gray-900 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-600/30 transition-colors">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">Refresh All Games</h3>
                    <p className="text-sm text-gray-400">
                      Removes all existing metadata and images for every game in your library and fetches fresh data from online sources. This will update all games regardless of whether they already have images.
                    </p>
                  </div>
                </div>
              </button>

              {/* Refresh Missing Only Option */}
              <button
                onClick={onSelectMissing}
                className="w-full text-left p-4 bg-gray-900/50 border-2 border-gray-700 rounded-lg hover:border-blue-600 hover:bg-gray-900 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center flex-shrink-0 group-hover:bg-green-600/30 transition-colors">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-1">Refresh Missing Images Only</h3>
                    <p className="text-sm text-gray-400">
                      Only refreshes games that are missing box art or banner images. Games that already have images will be left unchanged. This is faster and preserves your existing metadata.
                    </p>
                  </div>
                </div>
              </button>
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
