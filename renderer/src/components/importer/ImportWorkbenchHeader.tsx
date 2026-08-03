import React from 'react';

export type ImportScanStats = {
    found: number;
    processed: number;
    skipped: number;
};

export interface ImportWorkbenchHeaderProps {
    isScanning: boolean;
    scanProgress: string;
    currentlyProcessingGame: string | null;
    queueLength: number;
    scanStats: ImportScanStats;
    showIgnored: boolean;
    onToggleIgnored: () => void;
    onCloseClick: () => void;
    invalidApiProviders?: string[];
    onApiWarningClick?: () => void;
    onRestartScan?: () => void;
}

export const ImportWorkbenchHeader: React.FC<ImportWorkbenchHeaderProps> = ({
    isScanning,
    scanProgress,
    currentlyProcessingGame,
    queueLength,
    scanStats,
    showIgnored,
    onToggleIgnored,
    onCloseClick,
    invalidApiProviders = [],
    onApiWarningClick,
    onRestartScan,
}) => {
    return (
        <div className="min-h-[60px] flex items-center justify-between gap-4 px-6 border-b border-gray-800 bg-gray-900/50 flex-wrap py-2">
            <h2 className="text-xl font-semibold text-white shrink-0">Add Games</h2>
            {isScanning && (
                <div className="flex items-center gap-3 text-sm text-gray-300 flex-1 min-w-0">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent shrink-0" />
                    <span className="font-medium text-white">Scanning for games...</span>
                    {(scanProgress || currentlyProcessingGame) && (
                        <span className="text-gray-400 truncate" title={scanProgress || currentlyProcessingGame || ''}>
                            {scanProgress || (currentlyProcessingGame ? `Processing: ${currentlyProcessingGame}` : '')}
                        </span>
                    )}
                    <span className="text-gray-400 shrink-0">
                        {queueLength} {queueLength === 1 ? 'game' : 'games'} to import
                        {scanStats.found > 0 && (
                            <>
                                {' '}
                                · {scanStats.found} detected ({Math.round((scanStats.processed / scanStats.found) * 100)}%)
                            </>
                        )}
                        {scanStats.skipped > 0 && (
                            <span className="text-yellow-500/70"> · {scanStats.skipped} skipped</span>
                        )}
                    </span>
                </div>
            )}
            <div className="flex items-center gap-3 ml-auto shrink-0">
                {invalidApiProviders.length > 0 && (
                    <button
                        onClick={onApiWarningClick}
                        title="Some metadata API keys appear to be invalid or expired. Click to pause the scan and fix them in Settings."
                        className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-yellow-900/40 border border-yellow-600/50 text-yellow-300 hover:bg-yellow-900/60"
                    >
                        <span aria-hidden="true">⚠</span>
                        <span>
                            {invalidApiProviders.join(', ')} {invalidApiProviders.length === 1 ? 'key needs' : 'keys need'} attention
                        </span>
                    </button>
                )}
                {invalidApiProviders.length > 0 && !isScanning && onRestartScan && (
                    <button
                        onClick={onRestartScan}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
                    >
                        Restart Scan
                    </button>
                )}
                <button
                    onClick={onToggleIgnored}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        showIgnored ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-700 hover:bg-gray-600'
                    } text-white`}
                >
                    {showIgnored ? 'Show Active' : 'Show Ignored'}
                </button>
                <button
                    onClick={onCloseClick}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium"
                >
                    Close
                </button>
            </div>
        </div>
    );
};

