/**
 * ImportWorkbenchV2 - A clean, maintainable game importer
 * Uses GamePropertiesPanel for unified game editing
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { StagedGame, ImportStatus, ImportSource } from '../../types/importer';
import { Game } from '../../types/game';
import { GamePropertiesPanel } from '../GamePropertiesPanel';

interface ImportWorkbenchV2Props {
    isOpen: boolean;
    onClose: () => void;
    onImport: (games: Game[]) => Promise<void>;
    existingLibrary?: Game[];
    autoStartScan?: boolean;
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

const SOURCE_LABELS: Record<ImportSource, string> = {
    steam: '🎮 Steam',
    epic: '🎯 Epic Games',
    gog: '🌟 GOG',
    xbox: '🎲 Xbox',
    ubisoft: '🔷 Ubisoft',
    rockstar: '⭐ Rockstar',
    ea: '🔶 EA',
    battle: '⚔️ Battle.net',
    manual_file: '📁 Manual File',
    manual_folder: '📂 Manual Folder',
};

export const ImportWorkbenchV2: React.FC<ImportWorkbenchV2Props> = ({
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
    const [error, setError] = useState<string | null>(null);
    const [scanProgress, setScanProgress] = useState('');
    const [showIgnored, setShowIgnored] = useState(false);
    
    // New state for real-time scanning
    const [currentlyProcessingGame, setCurrentlyProcessingGame] = useState<string | null>(null);
    const [gameProcessingStates, setGameProcessingStates] = useState<Map<string, { status: string; progress?: string }>>(new Map());
    const [scanStats, setScanStats] = useState({ found: 0, processed: 0 });

    // Refs
    const hasAutoScanned = useRef(false);

    // Get selected game from queue
    const selectedGame = useMemo(() => queue.find(g => g.uuid === selectedId) || null, [queue, selectedId]);

    // Filter visible games
    const visibleGames = useMemo(() => {
        return showIgnored ? queue.filter(g => g.isIgnored) : queue.filter(g => !g.isIgnored);
    }, [queue, showIgnored]);

    // Group games by source
    const groupedGames = useMemo(() => {
        const groups: Partial<Record<ImportSource, StagedGame[]>> = {};
        visibleGames.forEach(game => {
            if (!groups[game.source]) groups[game.source] = [];
            groups[game.source]!.push(game);
        });
        return groups;
    }, [visibleGames]);

    // Count ready games
    const readyCount = useMemo(() => visibleGames.filter(g => g.status === 'ready').length, [visibleGames]);

    // --- Effects ---

    // Auto-scan on open
    useEffect(() => {
        if (isOpen && autoStartScan && !hasAutoScanned.current && !preScannedGames) {
            hasAutoScanned.current = true;
            setTimeout(() => handleScanAll(), 300);
        }
        if (!isOpen) hasAutoScanned.current = false;
    }, [isOpen, autoStartScan, preScannedGames]);

    // Process pre-scanned games
    useEffect(() => {
        if (isOpen && preScannedGames && preScannedGames.length > 0) {
            processPreScannedGames(preScannedGames);
        }
    }, [isOpen, preScannedGames]);

    // Pause/resume background scan
    useEffect(() => {
        if (isOpen) {
            window.electronAPI.pauseBackgroundScan?.().catch(console.error);
        } else {
            window.electronAPI.resumeBackgroundScan?.().catch(console.error);
        }
    }, [isOpen]);

    // Listen for real-time scan progress
    useEffect(() => {
        if (!isOpen) return;

        const handleScanProgress = (_event: any, data: { message: string }) => {
            if (data.message) {
                setScanProgress(data.message);
                
                // Parse specific game discovery messages for stats
                if (data.message.includes('Found:')) {
                    setScanStats(prev => ({ ...prev, found: prev.found + 1 }));
                }
            }
        };

        const handleGameDiscovered = (_event: any, data: { gameName: string; status: string; progress: string }) => {
            setCurrentlyProcessingGame(data.gameName);
            setGameProcessingStates(prev => new Map(prev).set(data.gameName, { 
                status: data.status, 
                progress: data.progress 
            }));
            setScanStats(prev => ({ ...prev, found: prev.found + 1 }));
            
            // Note: We don't create stub games here anymore to avoid conflicts.
            // Games will be processed and added to the queue by processScannedGames.
        };

        const handleGameProcessingUpdate = (_event: any, data: { gameName: string; status: string; progress: string }) => {
            setGameProcessingStates(prev => new Map(prev).set(data.gameName, { 
                status: data.status, 
                progress: data.progress 
            }));
            
            if (data.progress === '100%') {
                setScanStats(prev => ({ ...prev, processed: prev.processed + 1 }));
                // Clear current processing game when done
                setTimeout(() => setCurrentlyProcessingGame(null), 500);
            }
        };

        const removeProgressListener = window.electronAPI?.on && window.electronAPI.on('import:scanProgress', handleScanProgress);
        const removeDiscoveredListener = window.electronAPI?.on && window.electronAPI.on('import:gameDiscovered', handleGameDiscovered);
        const removeProcessingListener = window.electronAPI?.on && window.electronAPI.on('import:gameProcessingUpdate', handleGameProcessingUpdate);

        return () => {
            if (removeProgressListener && typeof removeProgressListener === 'function') {
                removeProgressListener();
            }
            if (removeDiscoveredListener && typeof removeDiscoveredListener === 'function') {
                removeDiscoveredListener();
            }
            if (removeProcessingListener && typeof removeProcessingListener === 'function') {
                removeProcessingListener();
            }
        };
    }, [isOpen]);

    // --- Handlers ---

    const handleScanAll = async () => {
        setIsScanning(true);
        setError(null);
        setScanProgress('Starting scan...');
        setCurrentlyProcessingGame(null);
        setGameProcessingStates(new Map());
        setScanStats({ found: 0, processed: 0 });
        setQueue([]); // Clear existing queue

        try {
            const results = await window.electronAPI.scanAllSources();
            if (results.success && results.games) {
                await processScannedGames(results.games);
            } else {
                setError(results.error || 'Scan failed');
            }
        } catch (err) {
            setError('Failed to scan sources');
            console.error(err);
        } finally {
            setIsScanning(false);
            setScanProgress('');
            setCurrentlyProcessingGame(null);
            setScanStats(prev => ({ ...prev, processed: prev.found }));
        }
    };

    const processPreScannedGames = async (games: typeof preScannedGames) => {
        if (!games) return;
        const normalized = games.map(g => ({
            title: g.title || g.name || g.originalName || 'Unknown',
            source: g.source || 'manual_folder' as ImportSource,
            installPath: g.installPath,
            exePath: g.exePath,
            appId: g.appId,
        }));
        await processScannedGames(normalized);
    };

    // Auto-scroll to bottom when queue changes
    useEffect(() => {
        // Only scroll if we're adding items (scanning)
        if (isScanning && queue.length > 0) {
            const container = document.querySelector('.overflow-y-auto.h-full');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
    }, [queue.length, isScanning]);

    const processScannedGames = async (scannedGames: any[]) => {
        const existingIds = new Set(existingLibrary.map(g => g.id));
        const existingTitles = new Set(existingLibrary.map(g => g.title.toLowerCase().trim()));
        const existingInstallPaths = new Set(
            existingLibrary
                .map(g => g.installationDirectory?.toLowerCase().trim())
                .filter(Boolean)
        );
        const existingExePaths = new Set(
            existingLibrary
                .map(g => g.exePath?.toLowerCase().trim())
                .filter(Boolean)
        );
        let firstGameUuid: string | null = null;

        for (let i = 0; i < scannedGames.length; i++) {
            const scanned = scannedGames[i];
            
            // Update current processing game for real-time feedback
            setCurrentlyProcessingGame(scanned.title);
            setScanStats(prev => ({ ...prev, processed: i + 1 }));
            
            // Skip duplicates with progress feedback
            if (scanned.appId) {
                const idPatterns = [
                    `steam-${scanned.appId}`,
                    `epic-${scanned.appId}`,
                    `gog-${scanned.appId}`,
                    `xbox-${scanned.appId}`,
                    scanned.appId,
                ];
                if (idPatterns.some(id => existingIds.has(id))) {
                    console.log(`[Importer] Skipping duplicate by app ID: ${scanned.title} (${scanned.appId})`);
                    setGameProcessingStates(prev => new Map(prev).set(scanned.title, { status: 'Duplicate - skipped' }));
                    continue;
                }
            }

            if (scanned.installPath) {
                const normalizedPath = scanned.installPath.toLowerCase().trim();
                if (existingInstallPaths.has(normalizedPath)) {
                    console.log(`[Importer] Skipping duplicate by install path: ${scanned.title}`);
                    setGameProcessingStates(prev => new Map(prev).set(scanned.title, { status: 'Duplicate - skipped' }));
                    continue;
                }
            }

            if (scanned.exePath) {
                const normalizedExe = scanned.exePath.toLowerCase().trim();
                if (existingExePaths.has(normalizedExe)) {
                    console.log(`[Importer] Skipping duplicate by exe path: ${scanned.title}`);
                    setGameProcessingStates(prev => new Map(prev).set(scanned.title, { status: 'Duplicate - skipped' }));
                    continue;
                }
            }

            const normalizedTitle = (scanned.title || scanned.name || '').toLowerCase().trim();
            if (normalizedTitle && existingTitles.has(normalizedTitle)) {
                console.log(`[Importer] Skipping duplicate by title: ${scanned.title}`);
                setGameProcessingStates(prev => new Map(prev).set(scanned.title, { status: 'Duplicate - skipped' }));
                continue;
            }

            const uuid = `${scanned.source}-${scanned.appId || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            if (!firstGameUuid) firstGameUuid = uuid;

            // Create a basic stub game immediately for real-time display
            const stubGame: StagedGame = {
                uuid,
                source: scanned.source,
                originalName: scanned.title,
                installPath: scanned.installPath,
                exePath: scanned.exePath,
                appId: scanned.appId,
                title: scanned.title,
                description: '',
                releaseDate: '',
                genres: [],
                developers: [],
                publishers: [],
                categories: [],
                boxArtUrl: '',
                bannerUrl: '',
                logoUrl: '',
                heroUrl: '',
                iconUrl: '',
                ageRating: '',
                rating: undefined,
                status: 'scanning' as ImportStatus,
                isSelected: true,
                isIgnored: false,
            };

            // Add stub game immediately to queue for real-time display
            setQueue(prev => [...prev, stubGame]);
            
            // Select first game if none selected
            if (!selectedId && firstGameUuid === uuid) {
                setSelectedId(uuid);
            }

            // Fetch metadata with progress updates
            setScanProgress(`Fetching metadata for ${scanned.title}...`);
            setGameProcessingStates(prev => new Map(prev).set(scanned.title, { status: 'Fetching metadata...', progress: '25%' }));
            let metadata: any = {};
            try {
                metadata = await window.electronAPI.searchArtwork(scanned.title, scanned.appId);
                setGameProcessingStates(prev => new Map(prev).set(scanned.title, { status: 'Metadata complete', progress: '75%' }));
            } catch (err) {
                console.warn(`Failed to fetch metadata for ${scanned.title}:`, err);
                setGameProcessingStates(prev => new Map(prev).set(scanned.title, { status: 'Metadata failed - using basic info', progress: '50%' }));
            }

            // Update the stub game with full metadata
            const fullyProcessedGame: StagedGame = {
                uuid,
                source: scanned.source,
                originalName: scanned.title,
                installPath: scanned.installPath,
                exePath: scanned.exePath,
                appId: scanned.appId,
                title: metadata?.title || scanned.title,
                description: metadata?.description || '',
                releaseDate: metadata?.releaseDate || '',
                genres: metadata?.genres || [],
                developers: metadata?.developers || [],
                publishers: metadata?.publishers || [],
                categories: [],
                boxArtUrl: metadata?.boxArtUrl || '',
                bannerUrl: metadata?.bannerUrl || '',
                logoUrl: metadata?.logoUrl || '',
                heroUrl: metadata?.heroUrl || '',
                iconUrl: metadata?.iconUrl || '',
                ageRating: metadata?.ageRating || '',
                rating: metadata?.rating,
                status: 'ambiguous',
                isSelected: true,
                isIgnored: false,
            };

            // Auto-categorize
            if (fullyProcessedGame.genres?.includes('Utilities')) {
                if (!fullyProcessedGame.categories) fullyProcessedGame.categories = [];
                fullyProcessedGame.categories.push('Apps');
            }

            const titleLower = fullyProcessedGame.title.toLowerCase();
            const originalLower = fullyProcessedGame.originalName.toLowerCase();
            if (titleLower.includes('demo') || originalLower.includes('demo') || fullyProcessedGame.genres?.some(g => g.toLowerCase().includes('demo'))) {
                if (!fullyProcessedGame.categories) fullyProcessedGame.categories = [];
                if (!fullyProcessedGame.categories.includes('Demo')) {
                    fullyProcessedGame.categories.push('Demo');
                }
            }
            
            if (scanned.source === 'manual_folder') {
                if (!fullyProcessedGame.categories) fullyProcessedGame.categories = [];
                if (fullyProcessedGame.categories.length === 0) {
                    fullyProcessedGame.categories.push('Games');
                }
            }

            // Check if ready
            const hasImages = fullyProcessedGame.boxArtUrl && fullyProcessedGame.bannerUrl && fullyProcessedGame.logoUrl;
            const hasDesc = fullyProcessedGame.description;
            if (hasImages && hasDesc) {
                fullyProcessedGame.status = 'ready';
            } else if (metadata?.title && (metadata.title.toLowerCase() === scanned.title.toLowerCase())) {
                if (fullyProcessedGame.boxArtUrl) {
                    fullyProcessedGame.status = 'ready';
                }
            }

            // Replace stub game with fully processed game
            setQueue(prev => prev.map(game => game.uuid === uuid ? fullyProcessedGame : game));
            setGameProcessingStates(prev => new Map(prev).set(scanned.title, { status: 'Added to queue', progress: '100%' }));
            
            // Small delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    };

    const handleUpdateGame = useCallback((updatedGame: StagedGame) => {
        setQueue(prev => prev.map(g => {
            if (g.uuid !== updatedGame.uuid) return g;

            const hasImages = updatedGame.boxArtUrl && updatedGame.bannerUrl && updatedGame.logoUrl;
            const hasDesc = updatedGame.description;
            const status: ImportStatus = (hasImages && hasDesc) ? 'ready' : 'ambiguous';

            return { ...updatedGame, status };
        }));
    }, []);

    const handleSkipGame = (game: StagedGame) => {
        setQueue(prev => prev.filter(g => g.uuid !== game.uuid));
        if (selectedId === game.uuid) {
            const remaining = queue.filter(g => g.uuid !== game.uuid && !g.isIgnored);
            setSelectedId(remaining[0]?.uuid || null);
        }
    };

    const handleIgnoreGame = async (game: StagedGame) => {
        const gameId = `${game.source}-${game.appId || game.originalName}`;
        try {
            const prefs = await window.electronAPI.getPreferences();
            const ignored = new Set(prefs.ignoredGames || []);
            ignored.add(gameId);
            await window.electronAPI.savePreferences({
                ...prefs,
                ignoredGames: Array.from(ignored),
            });
        } catch (err) {
            console.error('Failed to ignore game:', err);
        }
        setQueue(prev => prev.map(g => g.uuid === game.uuid ? { ...g, isIgnored: true } : g));
    };

    const handleImport = async () => {
        if (visibleGames.length === 0) {
            setError('No games to import');
            return;
        }

        setIsImporting(true);
        setError(null);

        try {
            const gamesToImport: Game[] = visibleGames.map(staged => {
                let gameId: string;
                let launcherSource: string;

                if (staged.source === 'steam' && staged.appId) {
                    gameId = `steam-${staged.appId}`;
                    launcherSource = 'steam';
                } else if (staged.source === 'xbox') {
                    gameId = staged.uuid;
                    launcherSource = 'xbox';
                } else {
                    gameId = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
                    launcherSource = staged.source;
                }

                return {
                    id: gameId,
                    title: staged.title,
                    platform: staged.platform || staged.source,
                    source: launcherSource,
                    exePath: staged.exePath || staged.installPath,
                    boxArtUrl: staged.boxArtUrl,
                    bannerUrl: staged.bannerUrl,
                    alternativeBannerUrl: staged.alternativeBannerUrl,
                    logoUrl: staged.logoUrl,
                    heroUrl: staged.heroUrl,
                    iconUrl: staged.iconUrl,
                    description: staged.description,
                    releaseDate: staged.releaseDate,
                    genres: staged.genres,
                    developers: staged.developers,
                    publishers: staged.publishers,
                    categories: staged.categories,
                    ageRating: staged.ageRating,
                    userScore: staged.rating,
                    installationDirectory: staged.installPath,
                };
            });

            await onImport(gamesToImport);
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setIsImporting(false);
        }
    };

    // Status helpers
    const getStatusColor = (status: ImportStatus) => {
        switch (status) {
            case 'ready': return 'text-green-400';
            case 'matched': return 'text-blue-400';
            case 'ambiguous': return 'text-yellow-400';
            case 'error': return 'text-red-400';
            case 'pending': return 'text-gray-500';
            case 'scanning': return 'text-blue-300';
            default: return 'text-gray-400';
        }
    };

    const getStatusIcon = (status: ImportStatus) => {
        switch (status) {
            case 'ready': return '✓';
            case 'matched': return '◎';
            case 'ambiguous': return '?';
            case 'error': return '✗';
            case 'pending': return '○';
            case 'scanning': return '↻';
            default: return '○';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-[5vh]">
            <div className="w-[90vw] h-[90vh] bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-col overflow-hidden">

                {/* Scanning Indicator */}
                {isScanning && (
                    <div className="bg-blue-600 text-white px-6 py-3 flex items-center gap-3 border-b border-blue-700">
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                        <div className="flex-1">
                            <div className="font-medium">Scanning for games...</div>
                            {scanProgress && <div className="text-sm text-blue-100 mt-1">{scanProgress}</div>}
                            {currentlyProcessingGame && (
                                <div className="text-sm text-blue-100 mt-1">
                                    Processing: {currentlyProcessingGame}
                                </div>
                            )}
                        </div>
                        <div className="text-right text-sm">
                            <div>Found: {scanStats.found}</div>
                            <div>Processed: {scanStats.processed}</div>
                        </div>
                    </div>
                )}

                {/* Header */}
                <div className="h-[60px] flex items-center justify-between px-6 border-b border-gray-800 bg-gray-900/50">
                    <h2 className="text-xl font-semibold text-white">Game Importer</h2>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowIgnored(!showIgnored)}
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

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar - Game List */}
                    <div className="w-[300px] lg:w-[350px] border-r border-gray-800 bg-gray-900/50 overflow-y-auto">
                        {Object.entries(groupedGames).map(([source, games]) => {
                            if (!games || games.length === 0) return null;
                            return (
                                <div key={source} className="border-b border-gray-800">
                                    <div className="px-4 py-2 bg-gray-800/50 text-sm font-medium text-gray-300 sticky top-0">
                                        {SOURCE_LABELS[source as ImportSource] || source} ({games.length})
                                    </div>
                                    {games.map(game => (
                                        <div
                                            key={game.uuid}
                                            onClick={() => setSelectedId(game.uuid)}
                                            className={`px-4 py-3 flex items-center gap-3 cursor-pointer border-b border-gray-800/50 transition-colors ${selectedId === game.uuid ? 'bg-blue-900/30 border-l-2 border-l-blue-500' : 'hover:bg-gray-800/50'
                                                }`}
                                        >
                                            {/* Thumbnail */}
                                            <div className="w-10 h-14 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                                                {game.boxArtUrl ? (
                                                    <img src={game.boxArtUrl} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">?</div>
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-white truncate">{game.title}</div>
                                                
                                                {/* Progress bar for currently processing games */}
                                                {isScanning && gameProcessingStates.has(game.title) && (
                                                    <div className="mt-1 mb-1">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs text-gray-400 truncate">
                                                                {gameProcessingStates.get(game.title)?.status}
                                                            </span>
                                                            {gameProcessingStates.get(game.title)?.progress && (
                                                                <span className="text-xs text-gray-500">
                                                                    {gameProcessingStates.get(game.title)?.progress}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="w-full bg-gray-700 rounded-full h-1">
                                                            <div 
                                                                className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                                                                style={{ 
                                                                    width: gameProcessingStates.get(game.title)?.progress || '0%' 
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-xs ${getStatusColor(game.status)}`}>
                                                        {getStatusIcon(game.status)} {game.status === 'ambiguous' ? 'Attention Needed' : game.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-1">
                                                {!showIgnored && (
                                                    <>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleSkipGame(game); }}
                                                            className="text-gray-500 hover:text-gray-300 text-xs px-1"
                                                            title="Skip"
                                                        >
                                                            ↷
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleIgnoreGame(game); }}
                                                            className="text-red-500 hover:text-red-300 text-xs px-1"
                                                            title="Ignore"
                                                        >
                                                            ×
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        })}

                        {visibleGames.length === 0 && (
                            <div className="px-4 py-8 text-center text-gray-400">
                                <p className="text-sm">
                                    {showIgnored
                                        ? 'No ignored games.'
                                        : 'No games found. Click "Scan All" to start.'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Main Panel - Game Details */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {selectedGame ? (
                            <GamePropertiesPanel
                                game={selectedGame}
                                isStaged={true}
                                onSave={async (updatedGame) => handleUpdateGame(updatedGame as StagedGame)}
                                allCategories={Array.from(new Set(queue.flatMap(g => g.categories || [])))}
                            />
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-6 p-8">
                                <div className="text-center max-w-md space-y-2">
                                    <h3 className="text-xl font-semibold text-white">Welcome to Game Importer</h3>
                                    <p className="text-gray-400">
                                        Detect games installed on your system from Steam, Epic, GOG, and other launchers.
                                    </p>
                                </div>

                                <button
                                    onClick={handleScanAll}
                                    disabled={isScanning}
                                    className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-xl text-lg font-medium shadow-lg hover:shadow-blue-500/20 transition-all flex items-center gap-3"
                                >
                                    {isScanning ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent" />
                                            <span>Scanning System...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <span>Scan For Games</span>
                                        </>
                                    )}
                                </button>

                                <p className="text-xs text-gray-500 max-w-xs text-center">
                                    You can review matches and fix file info before final import.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="h-[60px] flex items-center justify-between px-6 border-t border-gray-800 bg-gray-900/50">
                    <div className="text-sm text-gray-300">
                        {readyCount} of {visibleGames.length} games ready to import
                    </div>
                    <button
                        onClick={handleImport}
                        disabled={isImporting || readyCount === 0}
                        className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium flex items-center gap-2"
                    >
                        {isImporting ? 'Importing...' : `Import ${readyCount} Games`}
                        <span>→</span>
                    </button>
                </div>

                {/* Error Toast */}
                {error && (
                    <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3">
                        <span>{error}</span>
                        <button onClick={() => setError(null)} className="text-white/80 hover:text-white font-bold">×</button>
                    </div>
                )}
            </div>
        </div>
    );
};
