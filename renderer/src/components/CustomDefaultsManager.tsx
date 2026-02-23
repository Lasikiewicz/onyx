import React, { useState, useEffect } from 'react';

type ViewMode = 'grid' | 'list' | 'logo' | 'carousel' | 'coverflow';
type ResolutionKey = '720p' | '1080p' | '1440p' | '4K';
type TabType = 'export' | 'import' | 'manage';

interface CustomDefaultsManagerProps {
  isOpen: boolean;
  onClose: () => void;
  currentViewMode: ViewMode;
  currentResolution: ResolutionKey;
  activeGameId?: string | null;
  onSettingsChange?: () => void;
}

interface ExportSelection {
  resolutions: Set<ResolutionKey>;
  viewModes: Set<ViewMode>;
  includePerGameSettings: boolean;
}

interface ImportPreview {
  fileName: string;
  fileSize: number;
  resolutions: ResolutionKey[];
  viewModes: ViewMode[];
  perGameSettingsCount: number;
  hasConflicts: boolean;
  conflictDetails: Array<{ resolution: ResolutionKey; viewMode: ViewMode }>;
}

interface SavedDefault {
  resolution: ResolutionKey;
  viewMode: ViewMode;
  lastModified?: string;
  hasPerGameSettings: boolean;
}

const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  grid: 'Grid View',
  list: 'List View',
  logo: 'Logo View',
  carousel: 'Carousel View',
  coverflow: 'Coverflow View',
};

const RESOLUTION_LABELS: Record<ResolutionKey, string> = {
  '720p': '720p HD',
  '1080p': '1080p Full HD',
  '1440p': '1440p QHD',
  '4K': '4K UHD',
};

export const CustomDefaultsManager: React.FC<CustomDefaultsManagerProps> = ({
  isOpen,
  onClose,
  currentViewMode,
  currentResolution,
  activeGameId: _activeGameId, // Reserved for future per-game filtering
  onSettingsChange,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('export');
  const [exportSelection, setExportSelection] = useState<ExportSelection>({
    resolutions: new Set([currentResolution]),
    viewModes: new Set([currentViewMode]),
    includePerGameSettings: false,
  });
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [savedDefaults, setSavedDefaults] = useState<SavedDefault[]>([]);
  const [perGameCount, setPerGameCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load per-game settings count on mount
  useEffect(() => {
    if (isOpen) {
      loadPerGameCount();
      loadSavedDefaults();
    }
  }, [isOpen]);

  const loadPerGameCount = async () => {
    try {
      const result = await window.electronAPI.getPerGameSettingsCount?.();
      setPerGameCount(result || 0);
    } catch (error) {
      console.error('Failed to load per-game settings count:', error);
    }
  };

  const loadSavedDefaults = async () => {
    try {
      const result = await window.electronAPI.getSavedDefaultsList?.();
      setSavedDefaults((result as SavedDefault[]) || []);
    } catch (error) {
      console.error('Failed to load saved defaults:', error);
    }
  };

  const showFeedback = (type: 'success' | 'error', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleExport = async () => {
    if (exportSelection.resolutions.size === 0 || exportSelection.viewModes.size === 0) {
      showFeedback('error', 'Please select at least one resolution and view mode');
      return;
    }

    setIsProcessing(true);
    try {
      const result = await window.electronAPI.exportCustomDefaultsSelective?.({
        resolutions: Array.from(exportSelection.resolutions),
        viewModes: Array.from(exportSelection.viewModes),
        includePerGameSettings: exportSelection.includePerGameSettings,
        currentResolution,
      });

      if (result?.success) {
        showFeedback('success', `Exported to ${result.filePath || 'file'}`);
      } else if (!result?.cancelled) {
        showFeedback('error', result?.error || 'Export failed');
      }
    } catch (error) {
      showFeedback('error', 'Export failed: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImportFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportFile(file);
    setIsProcessing(true);

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      const result = await window.electronAPI.validateImportFile?.(data);
      
      if (result?.valid) {
        setImportPreview({
          fileName: file.name,
          fileSize: file.size,
          resolutions: result.resolutions as ResolutionKey[] || [],
          viewModes: result.viewModes as ViewMode[] || [],
          perGameSettingsCount: result.perGameSettingsCount || 0,
          hasConflicts: result.hasConflicts || false,
          conflictDetails: (result.conflictDetails || []) as { resolution: ResolutionKey; viewMode: ViewMode }[],
        });
      } else {
        showFeedback('error', result?.error || 'Invalid import file');
        setImportFile(null);
      }
    } catch (error) {
      showFeedback('error', 'Failed to read file: ' + error);
      setImportFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async (options: { includePerGameSettings: boolean; mergeStrategy: 'overwrite' | 'keep' }) => {
    if (!importFile || !importPreview) return;

    setIsProcessing(true);
    try {
      const text = await importFile.text();
      const data = JSON.parse(text);

      const result = await window.electronAPI.importCustomDefaultsSelective?.({
        data,
        includePerGameSettings: options.includePerGameSettings,
        mergeStrategy: options.mergeStrategy,
      });

      if (result?.success) {
        showFeedback('success', 'Settings imported successfully');
        setImportFile(null);
        setImportPreview(null);
        loadSavedDefaults();
        onSettingsChange?.();
      } else {
        showFeedback('error', result?.error || 'Import failed');
      }
    } catch (error) {
      showFeedback('error', 'Import failed: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteDefault = async (resolution: ResolutionKey, viewMode: ViewMode) => {
    setIsProcessing(true);
    try {
      const result = await window.electronAPI.deleteCustomDefault?.({ resolution, viewMode });
      if (result?.success) {
        showFeedback('success', `Deleted ${VIEW_MODE_LABELS[viewMode]} at ${resolution}`);
        loadSavedDefaults();
      } else {
        showFeedback('error', result?.error || 'Delete failed');
      }
    } catch (error) {
      showFeedback('error', 'Delete failed: ' + error);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleResolution = (resolution: ResolutionKey) => {
    setExportSelection(prev => {
      const newResolutions = new Set(prev.resolutions);
      if (newResolutions.has(resolution)) {
        newResolutions.delete(resolution);
      } else {
        newResolutions.add(resolution);
      }
      return { ...prev, resolutions: newResolutions };
    });
  };

  const toggleViewMode = (viewMode: ViewMode) => {
    setExportSelection(prev => {
      const newViewModes = new Set(prev.viewModes);
      if (newViewModes.has(viewMode)) {
        newViewModes.delete(viewMode);
      } else {
        newViewModes.add(viewMode);
      }
      return { ...prev, viewModes: newViewModes };
    });
  };

  const selectAllResolutions = () => {
    setExportSelection(prev => ({
      ...prev,
      resolutions: new Set<ResolutionKey>(['720p', '1080p', '1440p', '4K']),
    }));
  };

  const selectAllViewModes = () => {
    setExportSelection(prev => ({
      ...prev,
      viewModes: new Set<ViewMode>(['grid', 'list', 'logo', 'carousel', 'coverflow']),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[10001] flex items-center justify-center p-[3vh]">
      <div className="w-[90vw] h-[82vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden relative">
        {/* Header */}
        <div className="h-[48px] flex items-center justify-between px-6 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <h2 className="text-lg font-semibold text-white">
              Custom Defaults Manager
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
            title="Close"
          >
            <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-gray-850 border-b border-gray-700 px-6">
          <div className="flex gap-1">
            {(['export', 'import', 'manage'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-8 py-3 font-semibold capitalize transition-all duration-200 relative text-base
                  ${activeTab === tab 
                    ? 'text-cyan-400 bg-gray-900' 
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  }
                `}
              >
                {tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"></div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          {activeTab === 'export' && (
            <ExportPanel
              exportSelection={exportSelection}
              currentViewMode={currentViewMode}
              currentResolution={currentResolution}
              perGameCount={perGameCount}
              onToggleResolution={toggleResolution}
              onToggleViewMode={toggleViewMode}
              onSelectAllResolutions={selectAllResolutions}
              onSelectAllViewModes={selectAllViewModes}
              onTogglePerGameSettings={() => 
                setExportSelection(prev => ({ ...prev, includePerGameSettings: !prev.includePerGameSettings }))
              }
              onExport={handleExport}
              isProcessing={isProcessing}
            />
          )}

          {activeTab === 'import' && (
            <ImportPanel
              importPreview={importPreview}
              onFileSelect={handleImportFileSelect}
              onImport={handleImport}
              onClearPreview={() => {
                setImportFile(null);
                setImportPreview(null);
              }}
              isProcessing={isProcessing}
            />
          )}

          {activeTab === 'manage' && (
            <ManagePanel
              savedDefaults={savedDefaults}
              onDelete={handleDeleteDefault}
              onRefresh={loadSavedDefaults}
              isProcessing={isProcessing}
            />
          )}
        </div>

        {/* Feedback Toast */}
        {feedback && (
          <div className={`
            absolute top-20 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg
            flex items-center gap-2 animate-fade-in z-10
            ${feedback.type === 'success' ? 'bg-green-600' : 'bg-red-600'}
          `}>
            {feedback.type === 'success' ? (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <span className="text-white font-medium">{feedback.message}</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Export Panel Component
interface ExportPanelProps {
  exportSelection: ExportSelection;
  currentViewMode: ViewMode;
  currentResolution: ResolutionKey;
  perGameCount: number;
  onToggleResolution: (resolution: ResolutionKey) => void;
  onToggleViewMode: (viewMode: ViewMode) => void;
  onSelectAllResolutions: () => void;
  onSelectAllViewModes: () => void;
  onTogglePerGameSettings: () => void;
  onExport: () => void;
  isProcessing: boolean;
}

const ExportPanel: React.FC<ExportPanelProps> = ({
  exportSelection,
  currentViewMode,
  currentResolution,
  perGameCount,
  onToggleResolution,
  onToggleViewMode,
  onSelectAllResolutions,
  onSelectAllViewModes,
  onTogglePerGameSettings,
  onExport,
  isProcessing,
}) => {
  const estimatedSize = (
    exportSelection.resolutions.size * 
    exportSelection.viewModes.size * 
    2.5 +
    (exportSelection.includePerGameSettings ? perGameCount * 0.1 : 0)
  ).toFixed(1);

  return (
    <div className="space-y-6">
      {/* Current Context */}
      <div className="bg-gray-850 rounded-lg p-5 border border-gray-700">
        <h3 className="text-sm font-semibold text-cyan-400 mb-3 tracking-wide uppercase">Current Configuration</h3>
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-gray-400">View Mode:</span>
            <span className="text-white ml-2 font-medium">{VIEW_MODE_LABELS[currentViewMode]}</span>
          </div>
          <div>
            <span className="text-gray-400">Resolution:</span>
            <span className="text-white ml-2 font-medium">{RESOLUTION_LABELS[currentResolution]}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Resolutions Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Resolutions
            </h3>
            <button
              onClick={onSelectAllResolutions}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
            >
              Select All
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['720p', '1080p', '1440p', '4K'] as ResolutionKey[]).map((resolution) => (
              <label
                key={resolution}
                className="flex items-center gap-3 p-4 rounded-lg bg-gray-850 hover:bg-gray-800 cursor-pointer transition-colors group border border-gray-700"
              >
                <input
                  type="checkbox"
                  checked={exportSelection.resolutions.has(resolution)}
                  onChange={() => onToggleResolution(resolution)}
                  className="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-500 focus:ring-2"
                />
                <span className="text-sm text-white group-hover:text-cyan-400 transition-colors">
                  {RESOLUTION_LABELS[resolution]}
                </span>
                {resolution === currentResolution && (
                  <span className="ml-auto text-xs bg-cyan-600 text-white px-2 py-0.5 rounded">Current</span>
                )}
              </label>
            ))}
          </div>
        </div>

        {/* View Modes Selection */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              View Modes
            </h3>
            <button
              onClick={onSelectAllViewModes}
              className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
            >
              Select All
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(['grid', 'list', 'logo', 'carousel', 'coverflow'] as ViewMode[]).map((viewMode) => (
              <label
                key={viewMode}
                className="flex items-center gap-3 p-4 rounded-lg bg-gray-850 hover:bg-gray-800 cursor-pointer transition-colors group border border-gray-700"
              >
                <input
                  type="checkbox"
                  checked={exportSelection.viewModes.has(viewMode)}
                  onChange={() => onToggleViewMode(viewMode)}
                  className="w-4 h-4 text-cyan-500 rounded focus:ring-cyan-500 focus:ring-2"
                />
                <span className="text-sm text-white group-hover:text-cyan-400 transition-colors">
                  {VIEW_MODE_LABELS[viewMode]}
                </span>
                {viewMode === currentViewMode && (
                  <span className="ml-auto text-xs bg-cyan-600 text-white px-2 py-0.5 rounded">Current</span>
                )}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Per-Game Settings Option */}
      <div className="bg-gray-850 rounded-lg p-5 border border-gray-700">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={exportSelection.includePerGameSettings}
            onChange={onTogglePerGameSettings}
            className="w-5 h-5 text-cyan-500 rounded focus:ring-cyan-500 focus:ring-2 mt-0.5"
          />
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors">
                Include Per-Game Settings
              </span>
              {perGameCount > 0 && (
                <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded">
                  {perGameCount} game{perGameCount !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Export custom logo sizes and settings for individual games
            </p>
          </div>
        </label>
      </div>

      {/* Export Preview */}
      <div className="bg-gradient-to-br from-cyan-900/40 to-blue-900/40 rounded-lg p-6 border-2 border-cyan-700/50">
        <h3 className="text-base font-semibold text-cyan-300 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          Export Preview
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-cyan-300">Resolutions:</span>
            <span className="text-white ml-2 font-medium">{exportSelection.resolutions.size}</span>
          </div>
          <div>
            <span className="text-cyan-300">View Modes:</span>
            <span className="text-white ml-2 font-medium">{exportSelection.viewModes.size}</span>
          </div>
          <div>
            <span className="text-cyan-300">Per-Game Settings:</span>
            <span className="text-white ml-2 font-medium">
              {exportSelection.includePerGameSettings ? `${perGameCount} games` : 'None'}
            </span>
          </div>
          <div>
            <span className="text-cyan-300">Est. Size:</span>
            <span className="text-white ml-2 font-medium">~{estimatedSize} KB</span>
          </div>
        </div>
      </div>

      {/* Export Button */}
      <button
        onClick={onExport}
        disabled={isProcessing || exportSelection.resolutions.size === 0 || exportSelection.viewModes.size === 0}
        className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-800 disabled:cursor-not-allowed text-white px-6 py-5 rounded-lg transition-all duration-200 flex items-center justify-center gap-3 text-lg font-semibold shadow-lg hover:shadow-cyan-500/50 group"
      >
        {isProcessing ? (
          <>
            <svg className="w-6 h-6 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-6 h-6 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Settings
          </>
        )}
      </button>
    </div>
  );
};

// Import Panel Component
interface ImportPanelProps {
  importPreview: ImportPreview | null;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: (options: { includePerGameSettings: boolean; mergeStrategy: 'overwrite' | 'keep' }) => void;
  onClearPreview: () => void;
  isProcessing: boolean;
}

const ImportPanel: React.FC<ImportPanelProps> = ({
  importPreview,
  onFileSelect,
  onImport,
  onClearPreview,
  isProcessing,
}) => {
  const [importOptions, setImportOptions] = useState({
    includePerGameSettings: true,
    mergeStrategy: 'overwrite' as 'overwrite' | 'keep',
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportClick = () => {
    onImport(importOptions);
  };

  return (
    <div className="space-y-6">
      {/* File Upload Section */}
      {!importPreview ? (
        <div className="space-y-4">
          <div className="bg-gray-850 rounded-lg p-12 border-2 border-dashed border-gray-600 hover:border-cyan-500 transition-colors">
            <div className="text-center space-y-4">
              <svg className="w-20 h-20 mx-auto text-gray-500 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Select Settings File to Import</h3>
                <p className="text-base text-gray-400 mb-6">
                  Choose a JSON file exported from Onyx Custom Defaults Manager
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={onFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 text-white px-8 py-4 rounded-lg transition-colors duration-200 inline-flex items-center gap-2 font-semibold text-lg shadow-lg"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Browse Files
                </button>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-5">
            <h4 className="text-base font-semibold text-blue-300 mb-3 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              What can be imported?
            </h4>
            <ul className="text-sm text-blue-200 space-y-2 ml-6 list-disc">
              <li>View mode settings (Grid, List, Logo, Carousel, Coverflow)</li>
              <li>Resolution-specific configurations (720p, 1080p, 1440p, 4K)</li>
              <li>Per-game custom settings (optional)</li>
              <li>Complete preset packages or individual views</li>
            </ul>
          </div>
        </div>
      ) : (
        // Preview and Import Options
        <div className="space-y-6">
          {/* File Info */}
          <div className="bg-gray-850 rounded-lg p-5 border border-gray-700">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-white">{importPreview.fileName}</h3>
                </div>
                <p className="text-sm text-gray-400">
                  {(importPreview.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={onClearPreview}
                className="text-gray-400 hover:text-red-400 transition-colors"
                title="Clear and select different file"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content Preview */}
          <div className="bg-gradient-to-br from-cyan-900 to-blue-900 rounded-lg p-3 border border-cyan-700">
            <h3 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              File Contents
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {/* Resolutions */}
              <div>
                <span className="text-xs text-cyan-300 font-medium">Resolutions</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {importPreview.resolutions.map((res) => (
                    <button
                      key={res}
                      type="button"
                      className="text-xs bg-cyan-800 text-cyan-100 px-2 py-1 rounded border border-cyan-700/60"
                    >
                      {RESOLUTION_LABELS[res]}
                    </button>
                  ))}
                </div>
              </div>

              {/* View Modes */}
              <div>
                <span className="text-xs text-cyan-300 font-medium">View Modes</span>
                <div className="flex flex-wrap gap-2 mt-1">
                  {importPreview.viewModes.map((view) => (
                    <button
                      key={view}
                      type="button"
                      className="text-xs bg-blue-800 text-blue-100 px-2 py-1 rounded border border-blue-700/60"
                    >
                      {VIEW_MODE_LABELS[view]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Per-Game Settings */}
              {importPreview.perGameSettingsCount > 0 && (
                <div className="col-span-2 flex items-center gap-2 pt-2 border-t border-cyan-700">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span className="text-sm text-white">
                    Contains <strong className="text-purple-300">{importPreview.perGameSettingsCount}</strong> per-game setting{importPreview.perGameSettingsCount !== 1 ? 's' : ''}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Conflicts Warning */}
          {importPreview.hasConflicts && (
            <div className="bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-yellow-300 mb-1">Conflicts Detected</h4>
                  <p className="text-xs text-yellow-200 mb-2">
                    The following configurations already exist and will be affected:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {importPreview.conflictDetails.map((conflict, idx) => (
                      <span key={idx} className="text-xs bg-yellow-800 text-yellow-100 px-2 py-1 rounded">
                        {VIEW_MODE_LABELS[conflict.viewMode]} @ {conflict.resolution}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Import Options */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white">Import Options</h3>

            {/* Per-Game Settings Option */}
            {importPreview.perGameSettingsCount > 0 && (
              <label className="flex items-start gap-3 p-4 rounded-lg bg-gray-800 border border-gray-700 cursor-pointer hover:border-cyan-600 transition-colors">
                <input
                  type="checkbox"
                  checked={importOptions.includePerGameSettings}
                  onChange={(e) => setImportOptions(prev => ({ ...prev, includePerGameSettings: e.target.checked }))}
                  className="w-5 h-5 text-cyan-500 rounded focus:ring-cyan-500 focus:ring-2 mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-sm font-semibold text-white">Import Per-Game Settings</span>
                  <p className="text-xs text-gray-400 mt-1">
                    Include the {importPreview.perGameSettingsCount} per-game custom settings from this file
                  </p>
                </div>
              </label>
            )}

            {/* Merge Strategy */}
            {importPreview.hasConflicts && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white">Conflict Resolution Strategy</label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-start gap-3 p-4 rounded-lg bg-gray-800 border border-gray-700 cursor-pointer hover:border-cyan-600 transition-colors">
                    <input
                      type="radio"
                      name="mergeStrategy"
                      checked={importOptions.mergeStrategy === 'overwrite'}
                      onChange={() => setImportOptions(prev => ({ ...prev, mergeStrategy: 'overwrite' }))}
                      className="w-5 h-5 text-cyan-500 focus:ring-cyan-500 focus:ring-2 mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-white">Overwrite Existing</span>
                      <p className="text-xs text-gray-400 mt-1">
                        Replace existing settings with imported values (recommended)
                      </p>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 p-4 rounded-lg bg-gray-800 border border-gray-700 cursor-pointer hover:border-cyan-600 transition-colors">
                    <input
                      type="radio"
                      name="mergeStrategy"
                      checked={importOptions.mergeStrategy === 'keep'}
                      onChange={() => setImportOptions(prev => ({ ...prev, mergeStrategy: 'keep' }))}
                      className="w-5 h-5 text-cyan-500 focus:ring-cyan-500 focus:ring-2 mt-0.5"
                    />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-white">Keep Existing</span>
                      <p className="text-xs text-gray-400 mt-1">
                        Only import settings that don't already exist
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Import Button */}
          <button
            onClick={handleImportClick}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white px-6 py-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-base font-semibold shadow-lg hover:shadow-green-500/50 group"
          >
            {isProcessing ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Importing...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 group-hover:animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L9 8m4-4v12" />
                </svg>
                Import Settings
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// Manage Panel Component
interface ManagePanelProps {
  savedDefaults: SavedDefault[];
  onDelete: (resolution: ResolutionKey, viewMode: ViewMode) => void;
  onRefresh: () => void;
  isProcessing: boolean;
}

const ManagePanel: React.FC<ManagePanelProps> = ({
  savedDefaults,
  onDelete,
  onRefresh,
  isProcessing,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<{ resolution: ResolutionKey; viewMode: ViewMode } | null>(null);

  const groupedByResolution = savedDefaults.reduce((acc, item) => {
    if (!acc[item.resolution]) {
      acc[item.resolution] = [];
    }
    acc[item.resolution].push(item);
    return acc;
  }, {} as Record<ResolutionKey, SavedDefault[]>);

  const handleDeleteClick = (resolution: ResolutionKey, viewMode: ViewMode) => {
    setDeleteConfirm({ resolution, viewMode });
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      onDelete(deleteConfirm.resolution, deleteConfirm.viewMode);
      setDeleteConfirm(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white">Saved Custom Defaults</h3>
          <p className="text-base text-gray-400 mt-1">
            Manage your saved view configurations
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={isProcessing}
          className="text-cyan-400 hover:text-cyan-300 transition-colors p-2 rounded-lg hover:bg-gray-850"
          title="Refresh list"
        >
          <svg className={`w-6 h-6 ${isProcessing ? 'animate-spin' : 'hover:animate-spin'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* List of saved defaults */}
      {savedDefaults.length === 0 ? (
        <div className="bg-gray-850 rounded-lg p-16 border-2 border-dashed border-gray-700 text-center">
          <svg className="w-20 h-20 mx-auto text-gray-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
          <h4 className="text-xl font-semibold text-gray-400 mb-2">No Saved Defaults</h4>
          <p className="text-base text-gray-500">
            Save your current view settings to create custom defaults
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {(['720p', '1080p', '1440p', '4K'] as ResolutionKey[]).map((resolution) => {
            const items = groupedByResolution[resolution];
            if (!items || items.length === 0) return null;

            return (
              <div key={resolution} className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
                {/* Resolution Header */}
                <div className="bg-gray-800 px-5 py-4 border-b border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <h4 className="font-semibold text-white text-base">{RESOLUTION_LABELS[resolution]}</h4>
                    </div>
                    <span className="text-sm text-gray-400">
                      {items.length} saved view{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* View Mode Items */}
                <div className="divide-y divide-gray-700">
                  {items.map((item) => (
                    <div
                      key={`${item.resolution}-${item.viewMode}`}
                      className="px-5 py-4 hover:bg-gray-800 transition-colors group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base font-medium text-white">
                              {VIEW_MODE_LABELS[item.viewMode]}
                            </span>
                            {item.hasPerGameSettings && (
                              <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                                Per-Game
                              </span>
                            )}
                          </div>
                          {item.lastModified && (
                            <p className="text-sm text-gray-400 mt-1">
                              Last modified: {new Date(item.lastModified).toLocaleDateString()}
                            </p>
                          )}
                        </div>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteClick(item.resolution, item.viewMode)}
                          disabled={isProcessing}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-30 p-2 rounded-lg disabled:opacity-50"
                          title="Delete this saved default"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-blue-300 mb-1">About Saved Defaults</h4>
            <p className="text-xs text-blue-200">
              These are your custom saved configurations. You can restore them at any time, export them to share with others, or delete them when no longer needed. Deleting a saved default does not affect your current settings.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[10002]">
          <div className="bg-gray-800 rounded-lg shadow-2xl w-[450px] border border-red-700">
            <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-3 rounded-t-lg">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Confirm Delete
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-white">
                Delete saved default for <strong className="text-red-400">{VIEW_MODE_LABELS[deleteConfirm.viewMode]}</strong> at <strong className="text-red-400">{RESOLUTION_LABELS[deleteConfirm.resolution]}</strong>?
              </p>
              <p className="text-sm text-gray-400">
                This will remove the saved configuration. Your current settings will not be affected.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
