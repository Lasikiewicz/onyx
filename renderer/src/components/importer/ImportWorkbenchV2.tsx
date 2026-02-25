/**
 * ImportWorkbenchV2 - A clean, maintainable game importer
 * Uses GamePropertiesPanel for unified game editing
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { StagedGame, ImportStatus, ImportSource } from '../../types/importer';
import { Game } from '../../types/game';
import { GamePropertiesPanel, GamePropertiesPanelHandle } from '../GamePropertiesPanel';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { ImportWorkbenchHeader } from './ImportWorkbenchHeader';
import { ImportWorkbenchSidebar } from './ImportWorkbenchSidebar';
import { ImportWorkbenchWelcome } from './ImportWorkbenchWelcome';
import { ImportWorkbenchFooter } from './ImportWorkbenchFooter';

export type ImportProgressCallback = (current: number, total: number, phase: string, detail?: string) => void;

interface ImportWorkbenchV2Props {
    isOpen: boolean;
    onClose: () => void;
    onImport: (games: Game[], onProgress?: ImportProgressCallback) => Promise<void>;
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
    const [importProgress, setImportProgress] = useState<{ current: number; total: number; phase: string; detail?: string } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [scanProgress, setScanProgress] = useState('');
    const [showIgnored, setShowIgnored] = useState(false);
    const [showCloseConfirm, setShowCloseConfirm] = useState(false);

    // Preferences
    const [preferAnimatedBoxart, setPreferAnimatedBoxart] = useState(true);
    const [preferAnimatedBanner, setPreferAnimatedBanner] = useState(true);

    // New state for real-time scanning
    const [currentlyProcessingGame, setCurrentlyProcessingGame] = useState<string | null>(null);
    const [gameProcessingStates, setGameProcessingStates] = useState<Map<string, { status: string; progress?: string }>>(new Map());
    const [scanStats, setScanStats] = useState({ found: 0, processed: 0, skipped: 0 });

    // Refs
    const hasAutoScanned = useRef(false);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const panelRef = useRef<GamePropertiesPanelHandle>(null);
    const abortScanRef = useRef(false);

    // Get selected game from queue
    const selectedGame = useMemo(() => queue.find(g => g.uuid === selectedId) || null, [queue, selectedId]);

    // Filter visible games
    const visibleGames = useMemo(() => {
        return showIgnored ? queue.filter(g => g.isIgnored) : queue.filter(g => !g.isIgnored);
    }, [queue, showIgnored]);

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

    // Load preferences
    useEffect(() => {
        if (isOpen) {
            window.electronAPI.getPreferences()
                .then(prefs => {
                    setPreferAnimatedBoxart(prefs.preferAnimatedBoxart ?? true);
                    setPreferAnimatedBanner(prefs.preferAnimatedBanner ?? true);
                })
                .catch(console.error);
        }
    }, [isOpen]);

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

    const handleTogglePreferAnimatedBoxart = async () => {
        const newValue = !preferAnimatedBoxart;
        setPreferAnimatedBoxart(newValue);
        try {
            const prefs = await window.electronAPI.getPreferences();
            await window.electronAPI.savePreferences({ ...prefs, preferAnimatedBoxart: newValue });
        } catch (e) {
            console.error(e);
        }
    };

    const handleTogglePreferAnimatedBanner = async () => {
        const newValue = !preferAnimatedBanner;
        setPreferAnimatedBanner(newValue);
        try {
            const prefs = await window.electronAPI.getPreferences();
            await window.electronAPI.savePreferences({ ...prefs, preferAnimatedBanner: newValue });
        } catch (e) {
            console.error(e);
        }
    };

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
                appId: scanned.appId,
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

            // Build fully processed game
            const fullyProcessedGame: StagedGame = {
                uuid,
                source: scanned.source,
                originalName: scanned.title,
                installPath: scanned.installPath,
                exePath: scanned.exePath,
                appId: scanned.appId,
                title: metadata?.title || cleanTitle || scanned.title,
                description: metadata?.description || '',
                releaseDate: metadata?.releaseDate || '',
                genres: metadata?.genres || [],
                developers: metadata?.developers || [],
                publishers: metadata?.publishers || [],
                categories: [],
                boxArtUrl: metadata?.boxArtUrl || '',
                bannerUrl: metadata?.bannerUrl || '',
                alternativeBannerUrl: metadata?.alternativeBannerUrl || '',
                logoUrl: metadata?.logoUrl || '',
                heroUrl: metadata?.heroUrl || '',
                iconUrl: metadata?.iconUrl || '',
                links: metadata?.links?.length ? metadata.links : undefined,
                ageRating: metadata?.ageRating || '',
                rating: metadata?.rating,
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
                    boxArtUrl: staged.boxArtUrl,
                    bannerUrl: staged.bannerUrl,
                    alternativeBannerUrl: staged.alternativeBannerUrl,
                    logoUrl: staged.logoUrl,
                    heroUrl: staged.heroUrl,
                    iconUrl: staged.iconUrl,
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
                    onToggleShowIgnored={() => setShowIgnored(!showIgnored)}
                    onClose={handleCloseClick}
                />

                {/* Main Content */}
                <div className="flex flex-1 overflow-hidden">
                    <ImportWorkbenchSidebar
                        ref={sidebarRef}
                        groupedGames={groupedGames}
                        selectedId={selectedId}
                        onSelectGame={setSelectedId}
                        isScanning={isScanning}
                        gameProcessingStates={gameProcessingStates}
                        showIgnored={showIgnored}
                        visibleGamesCount={visibleGames.length}
                        onSkipGame={handleSkipGame}
                        onIgnoreGame={handleIgnoreGame}
                    />

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
                            <ImportWorkbenchWelcome
                                preferAnimatedBoxart={preferAnimatedBoxart}
                                onTogglePreferAnimatedBoxart={handleTogglePreferAnimatedBoxart}
                                preferAnimatedBanner={preferAnimatedBanner}
                                onTogglePreferAnimatedBanner={handleTogglePreferAnimatedBanner}
                                isScanning={isScanning}
                                onScanAll={handleScanAll}
                            />
                        )}
                    </div>
                </div>

                <ImportWorkbenchFooter
                    isImporting={isImporting}
                    importProgress={importProgress}
                    readyCount={readyCount}
                    visibleGamesCount={visibleGames.length}
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
