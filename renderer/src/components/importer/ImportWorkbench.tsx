/**
 * ImportWorkbench - A clean, maintainable game importer
 * Uses GamePropertiesPanel for unified game editing
 */
import React, { useState, useMemo, useRef } from 'react';
import { StagedGame, ImportStatus, ImportSource } from '../../types/importer';
import { Game } from '../../types/game';
import { GamePropertiesPanelHandle } from '../GamePropertiesPanel';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { LauncherIcon, getLauncherDisplayName } from '../../utils/launcherIcons';
import { ImportWorkbenchSidebar } from './ImportWorkbenchSidebar';
import { ImportWorkbenchFooter } from './ImportWorkbenchFooter';
import { ImportWorkbenchEditor } from './ImportWorkbenchEditor';
import { ImportWorkbenchHeader } from './ImportWorkbenchHeader';
import { ImportWorkbenchEmptyState } from './ImportWorkbenchEmptyState';
import { useImportWorkbenchScan } from '../../hooks/useImportWorkbenchScan';
import { useImportWorkbenchActions } from '../../hooks/useImportWorkbenchActions';

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

const SOURCE_LABELS: Record<ImportSource, string> = {
    steam: 'Steam',
    epic: 'Epic Games',
    gog: 'GOG Galaxy',
    xbox: 'Xbox Game Pass',
    ubisoft: 'Ubisoft Connect',
    rockstar: 'Rockstar Games',
    ea: 'EA App / Origin',
    battle: 'Battle.net',
    manual_file: 'Manual File',
    manual_folder: 'Game',
};

const getSourceIcon = (source: string): React.ReactNode => {
    const cls = 'w-4 h-4 flex-shrink-0';
    if (source === 'manual_file') {
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                </svg>
            );
    }

    if (source === 'manual_folder') {
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
            );
    }

    return <LauncherIcon launcher={source} className={cls} alt={`${getLauncherDisplayName(source)} icon`} />;
};

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

    /* const handleScanAll = async () => {
        abortScanRef.current = false;
        setIsScanning(true);
        setError(null);
        setCurrentlyProcessingGame(null);
        setGameProcessingStates(new Map());
        setScanStats({ found: 0, processed: 0, skipped: 0 });
        setQueue([]); // Clear existing queue

        // Quick API check before starting
        setScanProgress('Verifying API credentials...');
        try {
            const validation = await window.electronAPI.validateMetadataProviders();
            const providersWithCreds = ['igdb', 'rawg', 'steamgriddb', 'giantbomb'];
            const invalidProviders = Object.entries(validation)
                .filter(([name, isValid]) => !isValid && providersWithCreds.includes(name))
                .map(([name]) => name.toUpperCase());

            if (invalidProviders.length > 0) {
                setScanProgress(`Warning: API keys for ${invalidProviders.join(', ')} appear to be invalid or expired. Metadata quality may be reduced.`);
                // Give user a moment to read the warning
                await new Promise(resolve => setTimeout(resolve, 3500));
            } else {
                setScanProgress('API credentials verified.');
                await new Promise(resolve => setTimeout(resolve, 800));
            }
        } catch (err) {
            console.warn('Failed to validate API credentials:', err);
        }

        if (abortScanRef.current) {
            setIsScanning(false);
            setScanProgress('');
            return;
        }

        setScanProgress('Starting scan...');

        try {
            const results = await window.electronAPI.scanAllSources();
            if (abortScanRef.current) {
                console.log('[Importer] Scan aborted by user after scanAllSources returned');
                return;
            }
            if (results.success && results.games) {
                await processScannedGames(results.games);
            } else {
                setError(results.error || 'Scan failed');
            }
        } catch (err) {
            if (!abortScanRef.current) {
                setError('Failed to scan sources');
                console.error(err);
            }
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
        if (isScanning && queue.length > 0 && sidebarRef.current) {
            sidebarRef.current.scrollTop = sidebarRef.current.scrollHeight;
        }
    }, [queue.length, isScanning]);

    const processScannedGames = async (scannedGames: any[]) => {
        if (!scannedGames || scannedGames.length === 0) return;

        // Ensure total count is set for progress display
        setScanStats(prev => ({ ...prev, found: Math.max(prev.found, scannedGames.length) }));

        // Track paths added during THIS scan to avoid intra-scan duplicates (e.g. registry + folder scan)
        const currentScanPaths = new Set<string>();

        const existingIds = new Set(existingLibrary.map(g => g.id));
        const existingTitles = new Set(existingLibrary.map(g => g.title.toLowerCase().trim()));
        const normalizePath = (p: string | undefined | null) => {
            if (!p) return '';
            return p.toLowerCase()
                .trim()
                .replace(/\\/g, '/')          // Standardize separators
                .replace(/\/+$/, '')          // Remove trailing slashes
                .replace(/\/\/+/g, '/');      // Remove double slashes
        };

        const existingInstallPaths = new Set(
            existingLibrary
                .map(g => normalizePath(g.installationDirectory))
                .filter(Boolean)
        );
        const existingExePaths = new Set(
            existingLibrary
                .map(g => normalizePath(g.exePath))
                .filter(Boolean)
        );

        const titleMappings: Record<string, string> = {
            'afop': 'Avatar: Frontiers of Pandora',
            'avatar frontiers of pandora': 'Avatar: Frontiers of Pandora',
            'ac odyssey': "Assassin's Creed Odyssey",
            'ac valhalla': "Assassin's Creed Valhalla",
            'ac origins': "Assassin's Creed Origins",
            'ac mirage': "Assassin's Creed Mirage",
            'ac unity': "Assassin's Creed Unity",
            'ac syndicate': "Assassin's Creed Syndicate",
            'ac black flag': "Assassin's Creed IV Black Flag",
            'ac rogue': "Assassin's Creed Rogue",
            'ac liberty': "Assassin's Creed Liberation",
            'ac 3': "Assassin's Creed III",
            'ac 2': "Assassin's Creed II",
            'ac': "Assassin's Creed",
        };

        // ── Phase 1: Create stubs for ALL non-duplicate games ──
        // This makes every game visible in the sidebar immediately
        setScanProgress('Preparing game list...');

        interface PendingGame {
            scanned: any;
            uuid: string;
            cleanTitle: string;
        }
        const pendingGames: PendingGame[] = [];
        const allStubs: StagedGame[] = [];

        for (let i = 0; i < scannedGames.length; i++) {
            const scanned = scannedGames[i];
            setScanStats(prev => ({ ...prev, processed: i + 1 }));

            // Skip duplicates
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
                    setScanStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
                    continue;
                }
            }

            if (scanned.installPath) {
                const normalizedInstall = normalizePath(scanned.installPath);
                if (normalizedInstall && (existingInstallPaths.has(normalizedInstall) || currentScanPaths.has(normalizedInstall))) {
                    console.log(`[Importer] Skipping duplicate by install path: ${scanned.title} (${scanned.installPath})`);
                    setScanStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
                    continue;
                }
                if (normalizedInstall) currentScanPaths.add(normalizedInstall);
            }

            if (scanned.exePath) {
                const normalizedExe = normalizePath(scanned.exePath);
                if (normalizedExe && (existingExePaths.has(normalizedExe) || currentScanPaths.has(normalizedExe))) {
                    console.log(`[Importer] Skipping duplicate by exe path: ${scanned.title} (${scanned.exePath})`);
                    setScanStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
                    continue;
                }
                if (normalizedExe) currentScanPaths.add(normalizedExe);
            }

            const normalizedTitle = (scanned.title || scanned.name || '').toLowerCase().trim();
            if (normalizedTitle && existingTitles.has(normalizedTitle)) {
                console.log(`[Importer] Skipping duplicate by title: ${scanned.title}`);
                setScanStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
                continue;
            }

            // Clean title
            let cleanScannedTitle = scanned.title
                .replace(/_\d+$/, '')        // Remove _1, _2 suffixes
                .replace(/hs\w+$/, '')      // Remove Epic internal suffixes like hsD4J
                .trim();

            const lowerTitle = cleanScannedTitle.toLowerCase();
            if (titleMappings[lowerTitle]) {
                cleanScannedTitle = titleMappings[lowerTitle];
            }
            scanned.title = cleanScannedTitle;

            const uuid = `${scanned.source}-${scanned.appId || Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

            const stubGame: StagedGame = {
                uuid,
                source: scanned.source,
                originalName: scanned.title,
                installPath: scanned.installPath,
                exePath: scanned.exePath,
                launchArgs: scanned.launchArgs,
                appId: scanned.appId,
                packageFamilyName: scanned.packageFamilyName,
                appUserModelId: scanned.appUserModelId,
                launchUri: scanned.launchUri,
                xboxKind: scanned.xboxKind,
                title: cleanScannedTitle,
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

            allStubs.push(stubGame);
            pendingGames.push({ scanned, uuid, cleanTitle: cleanScannedTitle });
        }

        // Add ALL stubs to queue at once so the full list is immediately visible
        setQueue(prev => [...prev, ...allStubs]);
        if (allStubs.length > 0) {
            setSelectedId(allStubs[0].uuid);
        }

        // ── Phase 2: Process metadata for each game sequentially ──
        for (let i = 0; i < pendingGames.length; i++) {
            if (abortScanRef.current) {
                console.log('[Importer] processScannedGames aborted by user');
                return;
            }

            const { scanned, uuid, cleanTitle } = pendingGames[i];

            setCurrentlyProcessingGame(scanned.title);
            setGameProcessingStates(prev => new Map(prev).set(scanned.title, { status: 'Identifying...', progress: '15%' }));
            setScanProgress(`Identifying ${scanned.title}... (${i + 1}/${pendingGames.length})`);

            // Quick match pass to get official title (10s timeout)
            let matchResponse: any = null;
            try {
                matchResponse = await Promise.race([
                    window.electronAPI.searchAndMatch(scanned),
                    new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Identify timeout')), 10000))
                ]);
                if (matchResponse.success && matchResponse.match?.title) {
                    const officialTitle = matchResponse.match.title;
                    console.log(`[Importer] Identified "${scanned.title}" as official title: "${officialTitle}"`);
                    setQueue(prev => prev.map(game =>
                        game.uuid === uuid ? { ...game, title: officialTitle } : game
                    ));
                }
            } catch (err) {
                console.warn(`Identification failed/timed out for ${scanned.title}:`, err);
            }

            if (abortScanRef.current) {
                console.log('[Importer] processScannedGames aborted by user');
                return;
            }

            // Fetch full metadata (30s timeout)
            const searchTitle = matchResponse?.match?.title || scanned.title;
            const steamAppIdToPass = scanned.source === 'steam' ? scanned.appId : undefined;
            setScanProgress(`Fetching metadata for ${searchTitle}... (${i + 1}/${pendingGames.length})`);
            setGameProcessingStates(prev => new Map(prev).set(scanned.title, { status: 'Fetching metadata...', progress: '25%' }));
            let metadata: any = {};
            try {
                metadata = await Promise.race([
                    window.electronAPI.searchArtwork(searchTitle, steamAppIdToPass, true),
                    new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Import metadata timeout')), 30000))
                ]);
                setGameProcessingStates(prev => new Map(prev).set(scanned.title, { status: 'Metadata complete', progress: '75%' }));
            } catch (err) {
                console.warn(`Failed to fetch metadata for ${scanned.title} (may have timed out):`, err);
                setGameProcessingStates(prev => new Map(prev).set(scanned.title, { status: 'Metadata failed', progress: '50%' }));
            }

            const sanitizedMetadata = {
                ...metadata,
                boxArtUrl: sanitizeWebpArtworkUrl(metadata?.boxArtUrl),
                bannerUrl: sanitizeWebpArtworkUrl(metadata?.bannerUrl),
                alternativeBannerUrl: sanitizeWebpArtworkUrl(metadata?.alternativeBannerUrl),
                logoUrl: sanitizeWebpArtworkUrl(metadata?.logoUrl),
                heroUrl: sanitizeWebpArtworkUrl(metadata?.heroUrl),
                iconUrl: sanitizeWebpArtworkUrl(metadata?.iconUrl),
            };

            // Build fully processed game
            const fullyProcessedGame: StagedGame = {
                uuid,
                source: scanned.source,
                originalName: scanned.title,
                installPath: scanned.installPath,
                exePath: scanned.exePath,
                launchArgs: scanned.launchArgs,
                appId: scanned.appId,
                packageFamilyName: scanned.packageFamilyName,
                appUserModelId: scanned.appUserModelId,
                launchUri: scanned.launchUri,
                xboxKind: scanned.xboxKind,
                title: sanitizedMetadata?.title || cleanTitle || scanned.title,
                description: sanitizedMetadata?.description || '',
                releaseDate: sanitizedMetadata?.releaseDate || '',
                genres: sanitizedMetadata?.genres || [],
                developers: sanitizedMetadata?.developers || [],
                publishers: sanitizedMetadata?.publishers || [],
                categories: [],
                boxArtUrl: sanitizedMetadata?.boxArtUrl || '',
                bannerUrl: sanitizedMetadata?.bannerUrl || '',
                alternativeBannerUrl: sanitizedMetadata?.alternativeBannerUrl || '',
                logoUrl: sanitizedMetadata?.logoUrl || '',
                heroUrl: sanitizedMetadata?.heroUrl || '',
                iconUrl: sanitizedMetadata?.iconUrl || '',
                screenshots: sanitizedMetadata?.screenshots || [],
                links: sanitizedMetadata?.links?.length ? sanitizedMetadata.links : undefined,
                ageRating: sanitizedMetadata?.ageRating || '',
                rating: sanitizedMetadata?.rating,
                status: 'ambiguous',
                isSelected: true,
                isIgnored: false,
            };

            // Auto-categorize
            if (scanned.categories) {
                if (!fullyProcessedGame.categories) fullyProcessedGame.categories = [];
                fullyProcessedGame.categories.push(...scanned.categories);
            }

            if (fullyProcessedGame.genres?.includes('Utilities')) {
                if (!fullyProcessedGame.categories) fullyProcessedGame.categories = [];
                if (!fullyProcessedGame.categories.includes('Apps')) {
                    fullyProcessedGame.categories.push('Apps');
                }
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
                    fullyProcessedGame.categories.push('Game');
                }
            }

            // Check if ready - boxArt is the minimum requirement for import
            // Description, banners, and other metadata are nice-to-have but not blockers
            if (fullyProcessedGame.boxArtUrl) {
                fullyProcessedGame.status = 'ready';
            }

            // Replace stub with fully processed game
            setQueue(prev => prev.map(game => game.uuid === uuid ? fullyProcessedGame : game));
            setGameProcessingStates(prev => new Map(prev).set(scanned.title, { status: 'Added to queue', progress: '100%' }));

            // Small delay for visual feedback
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    };
    */

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
                        {selectedGame ? (
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




