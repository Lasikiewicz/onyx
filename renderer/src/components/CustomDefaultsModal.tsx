import React from 'react';

interface CustomDefaultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewMode: 'grid' | 'list' | 'logo' | 'carousel';
  resolution: string;
  hasCustomDefaults: boolean;
  onSaveCurrentView: () => void;
  onSaveAllViews: () => void;
  onRestoreCurrentView: () => void;
  onRestoreAllViews: () => void;
  onExportCurrentView: () => void;
  onExportAllViews: () => void;
  onImportSettings: () => void;
  saveFeedback?: { type: 'current' | 'all'; show: boolean };
  restoreFeedback?: { type: 'current' | 'all'; show: boolean };
}

export const CustomDefaultsModal: React.FC<CustomDefaultsModalProps> = ({
  isOpen,
  onClose,
  viewMode,
  resolution,
  hasCustomDefaults,
  onSaveCurrentView,
  onSaveAllViews,
  onRestoreCurrentView,
  onRestoreAllViews,
  onExportCurrentView,
  onExportAllViews,
  onImportSettings,
  saveFeedback = { type: 'current', show: false },
  restoreFeedback = { type: 'current', show: false },
}) => {
  if (!isOpen) return null;

  const viewModeDisplay = {
    grid: 'Grid',
    list: 'List',
    logo: 'Logo',
    carousel: 'Carousel',
  };

  const currentViewDisplay = `${viewModeDisplay[viewMode]} View ${resolution}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[10001]">
      <div className="bg-gray-900 rounded-lg shadow-2xl w-[520px] max-h-[75vh] overflow-y-auto border border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-5 py-3">
          <h2 className="text-lg font-bold text-white">Custom Defaults Manager</h2>
          <p className="text-blue-100 text-xs mt-0.5">
            Save, restore, and share your view settings
          </p>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Current View Info */}
          <div className="bg-gray-800 rounded-lg p-3 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-xs">Current View Mode</p>
                <p className="text-white text-base font-semibold">{currentViewDisplay}</p>
              </div>
              <div className="text-right">
                <p className="text-gray-400 text-xs">Custom Defaults Status</p>
                <p className={`text-sm font-semibold ${hasCustomDefaults ? 'text-green-400' : 'text-gray-500'}`}>
                  {hasCustomDefaults ? '✓ Saved' : 'Not Saved'}
                </p>
              </div>
            </div>
          </div>

          {/* Save Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              Save Custom Defaults
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Save your current view settings as custom defaults. These will be stored separately from the factory defaults.
            </p>
            <div className="pt-1">
              <button
                onClick={onSaveCurrentView}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1.5 text-xs font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {saveFeedback.show && saveFeedback.type === 'current' ? 'Saved ✓' : `Save ${viewModeDisplay[viewMode]} View`}
              </button>
            </div>
          </div>

          {/* Restore Section */}
          {hasCustomDefaults && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Restore Custom Defaults
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed">
                Restore previously saved custom defaults. This will apply your saved settings.
              </p>
              <div className="pt-1">
                <button
                  onClick={onRestoreCurrentView}
                  className="w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1.5 text-xs font-medium"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {restoreFeedback.show && restoreFeedback.type === 'current' ? 'Restored ✓' : `Restore ${viewModeDisplay[viewMode]}`}
                </button>
              </div>
            </div>
          )}

          {/* Export/Import Section */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Settings
            </h3>
            <p className="text-gray-400 text-xs leading-relaxed">
              Export your custom defaults to share with others, or import settings from a file.
            </p>
            <div className="space-y-2 pt-1">
              <button
                onClick={onExportCurrentView}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1.5 text-xs font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export {viewModeDisplay[viewMode]}
              </button>
              <button
                onClick={onImportSettings}
                className="w-full bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg transition-colors duration-200 flex items-center justify-center gap-1.5 text-xs font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l4 4m0 0l4-4m-4 4V4" />
                </svg>
                Import Settings File
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-3">
            <p className="text-blue-200 text-xs leading-relaxed">
              <strong>💡 Tip:</strong> Custom defaults are saved separately for each view mode. 
              Save and export your settings for each view to share your perfect configuration with other Onyx users!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-800 px-5 py-3 border-t border-gray-700 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-700 hover:bg-gray-600 text-white px-5 py-1.5 rounded-lg transition-colors duration-200 text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
