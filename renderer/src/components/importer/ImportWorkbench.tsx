/**
 * ImportWorkbench - A clean, maintainable game importer
 * Uses GamePropertiesPanel for unified game editing
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { StagedGame, ImportStatus, ImportSource } from '../../types/importer';
import { Game } from '../../types/game';
import { GamePropertiesPanel, GamePropertiesPanelHandle } from '../GamePropertiesPanel';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { LauncherIcon, getLauncherDisplayName } from '../../utils/launcherIcons';
import { InteractiveOnyxLogo } from './InteractiveOnyxLogo';

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

const IMPORT_SOURCE_PREVIEW = [
    'Steam',
    'Epic Games',
    'GOG Galaxy',
    'Xbox Game Pass',
    'Ubisoft Connect',
    'Rockstar Games',
    'EA App / Origin',
    'Battle.net',
];

const IMPORT_REVIEW_POINTS = [
    'Scan your launchers and folders in one pass.',
    'Review matches before anything touches your library.',
    'Fix artwork, metadata, and launch details before import.',
];

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

const sanitizeWebpArtworkUrl = (url?: string): string => {
    if (!url) return '';
    return /\.webp(\?|$)/i.test(url) ? '' : url;
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
    const hasAutoScanned = useRef(false);
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

    // --- Effects ---

    // While scanning, keep the currently processing game in view in the sidebar
    useEffect(() => {
        if (!isScanning || !currentlyProcessingGame) return;
        const sidebar = sidebarRef.current;
        if (!sidebar) return;
        const row = gameRowRefs.current[currentlyProcessingGame];
        if (!row) return;

        const rowTop = row.offsetTop;
        const rowBottom = rowTop + row.offsetHeight;
        const viewTop = sidebar.scrollTop;
        const viewBottom = viewTop + sidebar.clientHeight;

        if (rowTop < viewTop || rowBottom > viewBottom) {
            sidebar.scrollTop = rowTop - sidebar.clientHeight / 2 + row.offsetHeight / 2;
        }
    }, [isScanning, currentlyProcessingGame]);

    // Do NOT reset queue on open: if user closes importer while scan runs, reopening should show games waiting for import.

    // Auto-scan only when opening with empty queue (first time or after user cleared). Do not restart scan on reopen.
    useEffect(() => {
        if (isOpen && autoStartScan && queue.length === 0 && !preScannedGames?.length && !hasAutoScanned.current) {
            hasAutoScanned.current = true;
            setTimeout(() => handleScanAll(), 300);
        }
    }, [isOpen, autoStartScan, queue.length, preScannedGames?.length]);

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

    // --- Handlers ---

    const handleCloseClick = () => {
        if (isScanning || queue.length > 0) {
            setShowCloseConfirm(true);
        } else {
            onClose();
        }
    };

    const handleScanAll = async () => {
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

    const handleUpdateGame = useCallback((updatedGame: StagedGame) => {
        setQueue(prev => prev.map(g => {
            if (g.uuid !== updatedGame.uuid) return g;

            const hasImages = Boolean(updatedGame.boxArtUrl && (updatedGame.bannerUrl || updatedGame.alternativeBannerUrl || updatedGame.heroUrl));
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
        setImportProgress(null);
        setError(null);

        try {
            // Flush current panel edits to queue and get merged game so import uses latest data
            const updatedGame = await panelRef.current?.saveToParent?.() as StagedGame | undefined;
            const listToImport = selectedId && updatedGame
                ? visibleGames.map(staged => staged.uuid === selectedId ? updatedGame : staged)
                : visibleGames;

            const gamesToImport: Game[] = listToImport.map(staged => {
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
                    launchArgs: staged.launchArgs,
                    boxArtUrl: staged.boxArtUrl,
                    bannerUrl: staged.bannerUrl,
                    alternativeBannerUrl: staged.alternativeBannerUrl,
                    useAlternativeBackground: staged.useAlternativeBackground,
                    logoUrl: staged.logoUrl,
                    heroUrl: staged.heroUrl,
                    iconUrl: staged.iconUrl,
                    screenshots: staged.screenshots,
                    links: staged.links,
                    description: staged.description,
                    releaseDate: staged.releaseDate,
                    genres: staged.genres,
                    developers: staged.developers,
                    publishers: staged.publishers,
                    categories: staged.categories,
                    ageRating: staged.ageRating,
                    userScore: staged.rating,
                    installationDirectory: staged.installPath,
                    xboxKind: staged.xboxKind,
                    packageFamilyName: staged.packageFamilyName,
                    appUserModelId: staged.appUserModelId,
                    launchUri: staged.launchUri,
                };
            });

            await onImport(gamesToImport, (current, total, phase, detail) => {
                setImportProgress({ current, total, phase, detail: detail ?? '' });
            });
            setQueue([]); // Clear queue for a fresh start next time
            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Import failed');
        } finally {
            setIsImporting(false);
            setImportProgress(null);
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

                {/* Header: title, scan status (when scanning), and actions */}
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
                                {queue.length} {queue.length === 1 ? 'game' : 'games'} to import
                                {scanStats.found > 0 && <> · {scanStats.found} detected ({Math.round((scanStats.processed / scanStats.found) * 100)}%)</>}
                                {scanStats.skipped > 0 && <span className="text-yellow-500/70"> · {scanStats.skipped} skipped</span>}
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-3 ml-auto shrink-0">
                        <button
                            onClick={() => setShowIgnored(!showIgnored)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showIgnored ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-gray-700 hover:bg-gray-600'
                                } text-white`}
                        >
                            {showIgnored ? 'Show Active' : 'Show Ignored'}
                        </button>
                        <button onClick={handleCloseClick} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-medium">
                            Close
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Sidebar - Game List */}
                    <div
                        ref={sidebarRef}
                        className={`border-r border-gray-800 bg-gray-900/50 overflow-hidden transition-[width,opacity,transform] duration-500 ease-out ${showSidebar ? 'w-[300px] lg:w-[350px] opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-6 border-r-0'
                            }`}
                    >
                        <div className="h-full overflow-y-auto">
                        {Object.entries(groupedGames).map(([source, games]) => {
                            if (!games || games.length === 0) return null;
                            return (
                                <div key={source} className="border-b border-gray-800">
                                    <div className="px-4 py-2 bg-gray-800/50 text-sm font-medium text-gray-300 sticky top-0 flex items-center gap-2">
                                        {getSourceIcon(source)}
                                        {SOURCE_LABELS[source as ImportSource] || source} ({games.length})
                                    </div>
                                    {games.map(game => (
                                        <div
                                            key={game.uuid}
                                            ref={(el) => {
                                                if (!el) return;
                                                // Use title as key since currentlyProcessingGame is title-based
                                                gameRowRefs.current[game.title] = el;
                                            }}
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
                                                            disabled={isScanning}
                                                            className="text-gray-500 hover:text-gray-300 text-xs px-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title="Skip"
                                                        >
                                                            ↷
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleIgnoreGame(game); }}
                                                            disabled={isScanning}
                                                            className="text-red-500 hover:text-red-300 text-xs px-1 disabled:opacity-30 disabled:cursor-not-allowed"
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
                    </div>

                    {/* Main Panel - Game Details */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {selectedGame ? (
                            <GamePropertiesPanel
                                ref={panelRef}
                                game={selectedGame}
                                isStaged={true}
                                onSave={async (updatedGame) => handleUpdateGame(updatedGame as StagedGame)}
                                allCategories={Array.from(new Set(queue.flatMap(g => g.categories || [])))}
                                editingDisabled={isScanning}
                                editingDisabledReason="Editing is disabled while the scan is in progress. Please wait for the scan to complete to avoid the app hanging."
                            />
                        ) : (
                            <div className="relative flex-1 overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.12),transparent_30%),radial-gradient(circle_at_80%_18%,rgba(59,130,246,0.16),transparent_24%),linear-gradient(135deg,#0b1120_0%,#111827_46%,#090e1a_100%)]">
                                <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] [background-size:36px_36px]" />
                                <div className="relative z-10 flex h-full flex-col justify-center p-8 lg:p-10">
                                    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,1fr)]">
                                        <div className="max-w-2xl space-y-6 lg:pl-8 xl:pl-12">
                                            <div className="space-y-4">
                                                <div className="space-y-3">
                                                    <h3 className="max-w-xl text-4xl font-semibold tracking-tight text-white lg:text-5xl">
                                                        Discover your installed games and bring them into Onyx
                                                    </h3>
                                                    <p className="max-w-xl text-base leading-7 text-slate-300 lg:text-lg">
                                                        Scan your launchers, review what was found, and refine metadata before you import anything into your library.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex flex-wrap gap-2">
                                                {IMPORT_SOURCE_PREVIEW.map(source => (
                                                    <span
                                                        key={source}
                                                        className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm font-medium text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
                                                    >
                                                        {source}
                                                    </span>
                                                ))}
                                            </div>

                                            <button
                                                onClick={handleScanAll}
                                                disabled={isScanning}
                                                className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-blue-600 px-7 py-4 text-lg font-semibold text-white shadow-[0_18px_45px_rgba(37,99,235,0.35)] transition-all hover:scale-[1.01] hover:shadow-[0_24px_55px_rgba(14,165,233,0.35)] disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-600 disabled:shadow-none md:max-w-[calc(100%-0rem)]"
                                            >
                                                {isScanning ? (
                                                    <>
                                                        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                                        <span>Scanning System...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                                        </svg>
                                                        <span>Scan For Games</span>
                                                    </>
                                                )}
                                            </button>

                                            <div className="grid gap-3 md:grid-cols-3">
                                                {IMPORT_REVIEW_POINTS.map(point => (
                                                    <div
                                                        key={point}
                                                        className="rounded-2xl border border-white/8 bg-white/[0.035] p-4 backdrop-blur-xl"
                                                    >
                                                        <div className="mb-3 h-1.5 w-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" />
                                                        <p className="text-sm leading-6 text-slate-300">{point}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-center">
                                            <InteractiveOnyxLogo />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
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
                                        style={{ width: `${importProgress.total ? (100 * importProgress.current) / importProgress.total : 0}%` }}
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
                        <>
                            <div className="flex items-center justify-between">
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
                        </>
                    )}
                </div>

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




