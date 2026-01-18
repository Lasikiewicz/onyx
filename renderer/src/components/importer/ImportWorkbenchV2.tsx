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

    // --- Handlers ---

    const handleScanAll = async () => {
        setIsScanning(true);
        setError(null);
        setScanProgress('Starting scan...');

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
        let firstGameUuid: string | null = null;

        for (const scanned of scannedGames) {
            // Skip if already in library by ID (check various patterns)
            if (scanned.appId) {
                const idPatterns = [
                    `steam-${scanned.appId}`,
                    `epic-${scanned.appId}`,
                    `gog-${scanned.appId}`,
                    `xbox-${scanned.appId}`,
                    scanned.appId, // raw ID
                ];
                if (idPatterns.some(id => existingIds.has(id))) continue;
            }

            // Skip if already in library by title (normalized)
            const normalizedTitle = (scanned.title || scanned.name || '').toLowerCase().trim();
            if (normalizedTitle && existingTitles.has(normalizedTitle)) continue;

            const uuid = `${scanned.source}-${scanned.appId || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
            if (!firstGameUuid) firstGameUuid = uuid;

            // Fetch metadata
            setScanProgress(`Fetching metadata for ${scanned.title}...`);
            let metadata: any = {};
            try {
                metadata = await window.electronAPI.searchArtwork(scanned.title, scanned.appId);
            } catch (err) {
                console.warn(`Failed to fetch metadata for ${scanned.title}:`, err);
            }

            const staged: StagedGame = {
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

            // Auto-categorize "Apps" for Utilities
            if (staged.genres?.includes('Utilities')) {
                if (!staged.categories) staged.categories = [];
                staged.categories.push('Apps');
            }

            // Auto-categorize "Demo"
            const titleLower = staged.title.toLowerCase();
            const originalLower = staged.originalName.toLowerCase();
            if (titleLower.includes('demo') || originalLower.includes('demo') || staged.genres?.some(g => g.toLowerCase().includes('demo'))) {
                if (!staged.categories) staged.categories = [];
                if (!staged.categories.includes('Demo')) {
                    staged.categories.push('Demo');
                }
            }
            // Auto-categorize Manual Folder games as "Games" if no other category
            if (scanned.source === 'manual_folder') {
                if (!staged.categories) staged.categories = [];
                if (staged.categories.length === 0) {
                    staged.categories.push('Games');
                }
            }


            // Check if ready
            const hasImages = staged.boxArtUrl && staged.bannerUrl && staged.logoUrl;
            const hasDesc = staged.description;
            // Relaxed ready check: if high confidence match OR has verified images/desc OR manual folder with title
            // User requested that "direct matches" should be ready even if some data missing (implied)
            // But safely: if we have images and description, it's ready.
            if (hasImages && hasDesc) {
                staged.status = 'ready';
            } else if (metadata?.title && (metadata.title.toLowerCase() === scanned.title.toLowerCase())) {
                // Exact title match from metadata provider -> consider ready even if missing some art?
                // User said "Ambiguous should be changed to attention needed".
                // User also said "Lots of things should ambiguous even though the titles would be direct matches" -> wait, they said "should NOT be ambiguous" is typically what that means, but let's re-read carefully.
                // "Lots of things should ambiguous even though the titles would be direct matches"
                // This phrasing is tricky. "Lots of things SHOW ambiguous...".
                // I will assume they want FEWER false positives for Ambiguous.
                // If we have a title match and at least a boxart, let's call it ready.
                if (staged.boxArtUrl) {
                    staged.status = 'ready';
                }
            }

            // Add to queue immediately so it appears in sidebar
            setQueue(prev => [...prev, staged]);

            // Select first game if none selected
            if (!selectedId && firstGameUuid === uuid) {
                setSelectedId(uuid);
            }
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
                        <button
                            onClick={handleScanAll}
                            disabled={isScanning}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white rounded-lg text-sm font-medium"
                        >
                            {isScanning ? 'Scanning...' : 'Scan All'}
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
                            <div className="flex-1 flex items-center justify-center text-gray-400">
                                <p>Select a game from the sidebar to view details</p>
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
