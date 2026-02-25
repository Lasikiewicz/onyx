import React from 'react';

interface ScanStats {
    found: number;
    processed: number;
    skipped: number;
}

interface ImportWorkbenchHeaderProps {
    isScanning: boolean;
    scanProgress: string;
    currentlyProcessingGame: string | null;
    queueLength: number;
    scanStats: ScanStats;
    showIgnored: boolean;
    onToggleShowIgnored: () => void;
    onClose: () => void;
}

export const ImportWorkbenchHeader: React.FC<ImportWorkbenchHeaderProps> = ({
    isScanning,
    scanProgress,
    currentlyProcessingGame,
    queueLength,
    scanStats,
    showIgnored,
    onToggleShowIgnored,
    onClose
}) => {
    return (
        <div className="min-h-[60px] flex items-center justify-between gap-4 px-6 border-b border-gray-800 bg-gray-900/50 flex-wrap py-2">
            <h2 className="text-xl font-semibold text-white shrink-0">Game Importer</h2>
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
                        {scanStats.found > 0 && <> · {scanStats.found} detected ({Math.round((scanStats.processed / scanStats.found) * 100)}%)</>}
                        {scanStats.skipped > 0 && <span className="text-yellow-500/70"> · {scanStats.skipped} skipped</span>}
                    </span>
                </div>
            )}
            <div className="flex items-center gap-3 ml-auto shrink-0">
                <button
                    onClick={onToggleShowIgnored}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showIgnored ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-700 hover:bg-gray-600'
                        } text-white`}
                >
                    {showIgnored ? 'Show Active' : 'Show Ignored'}
                </button>
                <button onClick={onClose} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium">
                    Close
                </button>
            </div>
        </div>
    );
};
