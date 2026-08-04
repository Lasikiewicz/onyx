import React from 'react';

export interface ImportProgressState {
    current: number;
    total: number;
    phase: string;
    detail?: string;
}

export interface ImportWorkbenchFooterProps {
    isImporting: boolean;
    importProgress: ImportProgressState | null;
    readyCount: number;
    selectedReadyCount: number;
    visibleCount: number;
    onImport: () => void;
    onSelectAll: () => void;
    onSelectNone: () => void;
}

export const ImportWorkbenchFooter: React.FC<ImportWorkbenchFooterProps> = ({
    isImporting,
    importProgress,
    readyCount,
    selectedReadyCount,
    visibleCount,
    onImport,
    onSelectAll,
    onSelectNone,
}) => {
    return (
        <div className="min-h-[60px] flex flex-col justify-center px-6 py-3 border-t border-gray-800 bg-gray-900/50 gap-2">
            {isImporting ? (
                importProgress ? (
                    <div className="flex flex-col gap-1.5 w-full">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-gray-300">{importProgress.phase}</span>
                            <span className="text-gray-400 tabular-nums">
                                {importProgress.current} / {importProgress.total}
                            </span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-cyan-500 transition-all duration-300"
                                style={{
                                    width: `${importProgress.total ? (100 * importProgress.current) / importProgress.total : 0}%`,
                                }}
                            />
                        </div>
                        {importProgress.detail && (
                            <p className="text-xs text-gray-500 truncate" title={importProgress.detail}>
                                {importProgress.detail}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className="animate-spin inline-block w-4 h-4 border-2 border-cyan-500 border-t-transparent rounded-full" />
                        Starting import...
                    </div>
                )
            ) : (
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="text-sm text-gray-300 truncate">
                            {selectedReadyCount} of {readyCount} ready selected
                            <span className="text-gray-500"> ({visibleCount} found)</span>
                        </div>
                        {visibleCount > 0 && (
                            <div className="flex items-center gap-2 text-xs">
                                <button
                                    onClick={onSelectAll}
                                    disabled={isImporting}
                                    className="text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Select all
                                </button>
                                <span className="text-gray-600">|</span>
                                <button
                                    onClick={onSelectNone}
                                    disabled={isImporting}
                                    className="text-blue-400 hover:text-blue-300 disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Select none
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onImport}
                        disabled={isImporting || selectedReadyCount === 0}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2 flex-shrink-0"
                    >
                        {isImporting
                            ? 'Importing...'
                            : `Import ${selectedReadyCount} ${selectedReadyCount === 1 ? 'Game' : 'Games'}`}
                        <span>→</span>
                    </button>
                </div>
            )}
        </div>
    );
};
