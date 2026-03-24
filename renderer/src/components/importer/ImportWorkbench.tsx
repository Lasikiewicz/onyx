/**
 * ImportWorkbench - A clean, maintainable game importer
 * Uses GamePropertiesPanel for unified game editing
 */
import React, { useState, useMemo, useRef } from 'react';
import { StagedGame, ImportSource } from '../../types/importer';
import { Game } from '../../types/game';
import { GamePropertiesPanelHandle } from '../GamePropertiesPanel';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { ImportWorkbenchSidebar } from './ImportWorkbenchSidebar';
import { ImportWorkbenchFooter } from './ImportWorkbenchFooter';
import { ImportWorkbenchEditor } from './ImportWorkbenchEditor';
import { ImportWorkbenchHeader } from './ImportWorkbenchHeader';
import { ImportWorkbenchEmptyState } from './ImportWorkbenchEmptyState';
import { useImportWorkbenchScan } from '../../hooks/useImportWorkbenchScan';
import { useImportWorkbenchActions } from '../../hooks/useImportWorkbenchActions';
import { SOURCE_LABELS, getSourceIcon, getStatusColor, getStatusIcon } from './ImportWorkbenchDisplayUtils';

export type ImportProgressCallback = (current: number, total: number, phase: string, detail?: string) => void;

export interface ImportWorkbenchProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (games: Game[], onProgress?: ImportProgressCallback) => Promise<void>;
    existingLibrary?: Game[];
    autoStartScan?: boolean;
    initialMode?: 'nuclear' | 'images' | 'links' | null;
    onRefreshComplete?: () => Promise<void> | void;
    preScannedGames?: Array<{
        uuid?: string;
        source?: ImportSource;
        originalName?: string;
        installPath?: string;
        exePath?: string;
        appId?: string;
        title?: string;
        name?: string;
    }>;
}

// SOURCE_LABELS/getSourceIcon/getStatusColor/getStatusIcon are in ImportWorkbenchDisplayUtils.tsx.

export const ImportWorkbench: React.FC<ImportWorkbenchProps> = ({
    isOpen,
    onClose,
    onImport,
    existingLibrary = [],
    autoStartScan = false,
    preScannedGames,
}) => {
    // Core State
    const [queue, setQueue] = useState<StagedGame[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importProgress, setImportProgress] = useState<{ current: number; total: number; phase: string; detail?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [scanProgress, setScanProgress] = useState('');
    const [showIgnored, setShowIgnored] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    // New state for real-time scanning
    const [currentlyProcessingGame, setCurrentlyProcessingGame] = useState<string | null>(null);
    const [gameProcessingStates, setGameProcessingStates] = useState<Map<string, { status: string; progress?: string }>>(new Map());
    const [scanStats, setScanStats] = useState({ found: 0, processed: 0, skipped: 0 });

    // Refs
    const sidebarRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<GamePropertiesPanelHandle>(null);
    const gameRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const abortScanRef = useRef(false);

    // Get selected game from queue
    const selectedGame = useMemo(() => queue.find(g => g.uuid === selectedId) || null, [queue, selectedId]);

    // Filter visible games
    const visibleGames = useMemo(() => {
        return showIgnored ? queue.filter(g => g.isIgnored) : queue.filter(g => !g.isIgnored);
    }, [queue, showIgnored]);

    const showSidebar = isScanning || queue.length > 0;

    // Group games by source
    const groupedGames = useMemo(() => {
        const groups: Record<string, StagedGame[]> = {};
        visibleGames.forEach(game => {
            if (!groups[game.source]) groups[game.source] = [];
            groups[game.source]!.push(game);
        });
        return groups;
    }, [visibleGames]);

    // Count ready games
    const readyCount = useMemo(() => visibleGames.filter(g => g.status === 'ready').length, [visibleGames]);

    const { handleScanAll } = useImportWorkbenchScan({
        isOpen,
        autoStartScan,
        preScannedGames,
        existingLibrary,
        sidebarRef,
        gameRowRefs,
        abortScanRef,
        queueLength: queue.length,
        isScanning,
        currentlyProcessingGame,
        setQueue,
        setSelectedId,
        setIsScanning,
        setScanProgress,
        setCurrentlyProcessingGame,
        setGameProcessingStates,
        setScanStats,
        setError,
    });

    const { handleUpdateGame, handleSkipGame, handleIgnoreGame, handleImport } = useImportWorkbenchActions({
        onImport,
        onClose,
        panelRef,

        selectedId,
        visibleGames,

        setQueue,
        setSelectedId,

        setIsImporting,
        setImportProgress,
        setError,
    });

    // --- Handlers ---

    const handleCloseClick = () => {
        if (isScanning || queue.length > 0) {
            setShowCloseConfirm(true);
        } else {
            onClose();
        }
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-[5vh]">
            <div className="w-[90vw] h-[90vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">

                <ImportWorkbenchHeader
                    isScanning={isScanning}
                    scanProgress={scanProgress}
                    currentlyProcessingGame={currentlyProcessingGame}
                    queueLength={queue.length}
                    scanStats={scanStats}
                    showIgnored={showIgnored}
                    onToggleIgnored={() => setShowIgnored(!showIgnored)}
                    onCloseClick={handleCloseClick}
                />

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    <ImportWorkbenchSidebar
                        showSidebar={showSidebar}
                        sidebarRef={sidebarRef}
                        groupedGames={groupedGames}
                        visibleGames={visibleGames}
                        selectedId={selectedId}
                        setSelectedId={setSelectedId}
                        isScanning={isScanning}
                        gameProcessingStates={gameProcessingStates}
                        onSkipGame={handleSkipGame}
                        onIgnoreGame={handleIgnoreGame}
                        getStatusColor={getStatusColor}
                        getStatusIcon={getStatusIcon}
                        gameRowRefs={gameRowRefs}
                        getSourceIcon={getSourceIcon}
                        sourceLabels={SOURCE_LABELS}
                        showIgnored={showIgnored}
                    />

                    {/* Main Panel - Game Details / Empty Hero */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {isScanning ? (
                            <div className="flex h-full flex-col items-center justify-center gap-4 px-8 text-center text-gray-300">
                                <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500/30 border-t-blue-400" />
                                <div className="space-y-2">
                                    <h2 className="text-xl font-semibold text-white">Scanning your libraries</h2>
                                    <p className="max-w-xl text-sm text-gray-400">
                                        Onyx keeps the importer editor lightweight while scanning so large result sets and metadata updates do not blank the app.
                                    </p>
                                    {scanProgress && (
                                        <p className="text-sm text-blue-300">{scanProgress}</p>
                                    )}
                                    {currentlyProcessingGame && (
                                        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                                            Processing {currentlyProcessingGame}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : selectedGame ? (
                            <ImportWorkbenchEditor
                                selectedGame={selectedGame}
                                queue={visibleGames}
                                isScanning={isScanning}
                                panelRef={panelRef}
                                onUpdateGame={handleUpdateGame}
                            />
                        ) : (
                            <ImportWorkbenchEmptyState isScanning={isScanning} onScanAll={handleScanAll} />
                        )}
                    </div>
                </div>

                <ImportWorkbenchFooter
                    isImporting={isImporting}
                    importProgress={importProgress}
                    readyCount={readyCount}
                    visibleCount={visibleGames.length}
                    onImport={handleImport}
                />

                {/* Error Toast */}
                {error && (
                    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-white/80 hover:text-white font-bold">×</button>
                    </div>
                )}
            </div>

            <ConfirmationDialog
                isOpen={showCloseConfirm}
                title="Discard Changes?"
                message={isScanning ? "A scan is currently in progress. If you close the importer, the scan and any changes you've made to imported games will be lost." : "You have imported games that haven't been saved. Closing this window will discard them."}
                confirmText="Discard and Close"
                cancelText="Cancel"
                variant="danger"
                onConfirm={() => {
                    abortScanRef.current = true;
                    if (isScanning && window.electronAPI.cancelScanAllSources) {
                        window.electronAPI.cancelScanAllSources().catch(console.error);
                    }
                    setIsScanning(false);
                    setQueue([]);
                    setShowCloseConfirm(false);
                    onClose();
                }}
                onCancel={() => setShowCloseConfirm(false)}
            />
        </div>
    );
};




