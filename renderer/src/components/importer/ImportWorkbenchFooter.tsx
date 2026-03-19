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
    visibleCount: number;
    onImport: () => void;
}

export const ImportWorkbenchFooter: React.FC<ImportWorkbenchFooterProps> = ({
    isImporting,
    importProgress,
    readyCount,
    visibleCount,
    onImport,
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
                <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-300">
                        {readyCount} of {visibleCount} games ready to import
                    </div>
                    <button
                        onClick={onImport}
                        disabled={isImporting || readyCount === 0}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2"
                    >
                        {isImporting ? 'Importing...' : `Import ${readyCount} Games`}
                        <span>→</span>
                    </button>
                </div>
            )}
        </div>
    );
};
