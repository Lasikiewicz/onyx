import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Game } from '../types/game';
import type { ImportSource, ImportStatus, StagedGame } from '../types/importer';

export type ImportWorkbenchPreScannedGame = {
    uuid?: string;
    source?: ImportSource;
    originalName?: string;
    installPath?: string;
    exePath?: string;
    appId?: string;
    title?: string;
    name?: string;
};

type ScanStats = { found: number; processed: number; skipped: number };

type GameProcessingState = {
    status: string;
    progress?: string;
};

const MAX_STAGED_SCREENSHOTS = 12;
const MAX_STAGED_LINKS = 20;

type UseImportWorkbenchScanParams = {
    isOpen: boolean;
    autoStartScan: boolean;
    preScannedGames?: ImportWorkbenchPreScannedGame[];
    existingLibrary: Game[];

    sidebarRef: React.RefObject<HTMLDivElement>;
    gameRowRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
    abortScanRef: React.MutableRefObject<boolean>;

    queueLength: number;
    isScanning: boolean;
    currentlyProcessingGame: string | null;

    setQueue: React.Dispatch<React.SetStateAction<StagedGame[]>>;
    setSelectedId: React.Dispatch<React.SetStateAction<string | null>>;
    setIsScanning: React.Dispatch<React.SetStateAction<boolean>>;
    setScanProgress: React.Dispatch<React.SetStateAction<string>>;
    setCurrentlyProcessingGame: React.Dispatch<React.SetStateAction<string | null>>;
    setGameProcessingStates: React.Dispatch<React.SetStateAction<Map<string, GameProcessingState>>>;
    setScanStats: React.Dispatch<React.SetStateAction<ScanStats>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
};

const sanitizeWebpArtworkUrl = (url?: string): string => {
    if (!url) return '';
    return /\.webp(\?|$)/i.test(url) ? '' : url;
};

const trimStagedMetadata = (metadata: any) => ({
    ...metadata,
    screenshots: Array.isArray(metadata?.screenshots)
        ? metadata.screenshots.slice(0, MAX_STAGED_SCREENSHOTS)
        : [],
    links: Array.isArray(metadata?.links)
        ? metadata.links.slice(0, MAX_STAGED_LINKS)
        : [],
});

export function useImportWorkbenchScan({
    isOpen,
    autoStartScan,
    preScannedGames,
    existingLibrary,

    sidebarRef,
    gameRowRefs,
    abortScanRef,

    queueLength,
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
}: UseImportWorkbenchScanParams) {
    const hasAutoScanned = useRef(false);

    const preScannedLength = useMemo(() => preScannedGames?.length ?? 0, [preScannedGames]);

    // This stays in the hook so scanner-related UI behavior doesn't require edits to ImportWorkbench.
    const processScannedGames = useCallback(
        async (scannedGames: any[]) => {
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
                    .replace(/\\/g, '/') // Standardize separators
                    .replace(/\/+$/, '') // Remove trailing slashes
                    .replace(/\/\/+/g, '/'); // Remove double slashes
            };

            const existingInstallPaths = new Set(
                existingLibrary
                    .map(g => normalizePath((g as any).installationDirectory))
                    .filter(Boolean),
            );

            const existingExePaths = new Set(
                existingLibrary
                    .map(g => normalizePath((g as any).exePath))
                    .filter(Boolean),
            );

            const titleMappings: Record<string, string> = {
                afop: 'Avatar: Frontiers of Pandora',
                'avatar frontiers of pandora': 'Avatar: Frontiers of Pandora',
                'ac odyssey': 'Assassin\'s Creed Odyssey',
                'ac valhalla': 'Assassin\'s Creed Valhalla',
                'ac origins': 'Assassin\'s Creed Origins',
                'ac mirage': 'Assassin\'s Creed Mirage',
                'ac unity': 'Assassin\'s Creed Unity',
                'ac syndicate': 'Assassin\'s Creed Syndicate',
                'ac black flag': 'Assassin\'s Creed IV Black Flag',
                'ac rogue': 'Assassin\'s Creed Rogue',
                'ac liberty': 'Assassin\'s Creed Liberation',
                'ac 3': 'Assassin\'s Creed III',
                'ac 2': 'Assassin\'s Creed II',
                ac: 'Assassin\'s Creed',
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
                    if (
                        normalizedInstall &&
                        (existingInstallPaths.has(normalizedInstall) || currentScanPaths.has(normalizedInstall))
                    ) {
                        console.log(`[Importer] Skipping duplicate by install path: ${scanned.title} (${scanned.installPath})`);
                        setScanStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
                        continue;
                    }
                    if (normalizedInstall) currentScanPaths.add(normalizedInstall);
                }

                if (scanned.exePath) {
                    const normalizedExe = normalizePath(scanned.exePath);
                    if (
                        normalizedExe &&
                        (existingExePaths.has(normalizedExe) || currentScanPaths.has(normalizedExe))
                    ) {
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
                    .replace(/_\d+$/, '') // Remove _1, _2 suffixes
                    .replace(/hs\w+$/, '') // Remove Epic internal suffixes like hsD4J
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
                        new Promise<any>((_, reject) => setTimeout(() => reject(new Error('Identify timeout')), 10000)),
                    ]);

                    if (matchResponse.success && matchResponse.match?.title) {
                        const officialTitle = matchResponse.match.title;
                        console.log(`[Importer] Identified "${scanned.title}" as official title: "${officialTitle}"`);

                        setQueue(prev =>
                            prev.map(game => (game.uuid === uuid ? { ...game, title: officialTitle } : game)),
                        );
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
                setGameProcessingStates(prev =>
                    new Map(prev).set(scanned.title, { status: 'Fetching metadata...', progress: '25%' }),
                );

                let metadata: any = {};
                try {
                    metadata = await Promise.race([
                        window.electronAPI.searchArtwork(searchTitle, steamAppIdToPass, true),
                        new Promise<any>((_, reject) =>
                            setTimeout(() => reject(new Error('Import metadata timeout')), 30000),
                        ),
                    ]);

                    setGameProcessingStates(prev =>
                        new Map(prev).set(scanned.title, { status: 'Metadata complete', progress: '75%' }),
                    );
                } catch (err) {
                    console.warn(`Failed to fetch metadata for ${scanned.title} (may have timed out):`, err);
                    setGameProcessingStates(prev =>
                        new Map(prev).set(scanned.title, { status: 'Metadata failed', progress: '50%' }),
                    );
                }

                const trimmedMetadata = trimStagedMetadata(metadata);
                const sanitizedMetadata = {
                    ...trimmedMetadata,
                    boxArtUrl: sanitizeWebpArtworkUrl(trimmedMetadata?.boxArtUrl),
                    bannerUrl: sanitizeWebpArtworkUrl(trimmedMetadata?.bannerUrl),
                    alternativeBannerUrl: sanitizeWebpArtworkUrl(trimmedMetadata?.alternativeBannerUrl),
                    logoUrl: sanitizeWebpArtworkUrl(trimmedMetadata?.logoUrl),
                    heroUrl: sanitizeWebpArtworkUrl(trimmedMetadata?.heroUrl),
                    iconUrl: sanitizeWebpArtworkUrl(trimmedMetadata?.iconUrl),
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
                if (
                    titleLower.includes('demo') ||
                    originalLower.includes('demo') ||
                    fullyProcessedGame.genres?.some(g => g.toLowerCase().includes('demo'))
                ) {
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
                if (fullyProcessedGame.boxArtUrl) {
                    fullyProcessedGame.status = 'ready';
                }

                // Replace stub with fully processed game
                setQueue(prev => prev.map(game => (game.uuid === uuid ? fullyProcessedGame : game)));
                setGameProcessingStates(prev =>
                    new Map(prev).set(scanned.title, { status: 'Added to queue', progress: '100%' }),
                );

                // Small delay for visual feedback
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        },
        [
            abortScanRef,
            existingLibrary,
            setCurrentlyProcessingGame,
            setGameProcessingStates,
            setQueue,
            setScanProgress,
            setScanStats,
            setSelectedId,
        ],
    );

    const processPreScannedGames = useCallback(
        async (games?: ImportWorkbenchPreScannedGame[]) => {
            if (!games) return;

            const normalized = games.map(g => ({
                title: g.title || g.name || g.originalName || 'Unknown',
                source: g.source || 'manual_folder',
                installPath: g.installPath,
                exePath: g.exePath,
                appId: g.appId,
            }));

            // Keep the existing scan-normalization path by sending through processScannedGames.
            await processScannedGames(normalized as any[]);
        },
        [processScannedGames],
    );

    const handleScanAll = useCallback(async () => {
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
                setScanProgress(
                    `Warning: API keys for ${invalidProviders.join(', ')} appear to be invalid or expired. Metadata quality may be reduced.`,
                );
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
    }, [
        abortScanRef,
        processScannedGames,
        setCurrentlyProcessingGame,
        setError,
        setGameProcessingStates,
        setIsScanning,
        setQueue,
        setScanProgress,
        setScanStats,
    ]);

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
    }, [currentlyProcessingGame, gameRowRefs, isScanning, sidebarRef]);

    // Do NOT reset queue on open: if user closes importer while scan runs, reopening should show games waiting for import.

    // Auto-scan only when opening with empty queue (first time or after user cleared). Do not restart scan on reopen.
    useEffect(() => {
        if (isOpen && autoStartScan && queueLength === 0 && preScannedLength === 0 && !hasAutoScanned.current) {
            hasAutoScanned.current = true;
            setTimeout(() => {
                void handleScanAll();
            }, 300);
        }
    }, [autoStartScan, handleScanAll, isOpen, preScannedLength, queueLength]);

    // Process pre-scanned games
    useEffect(() => {
        if (isOpen && preScannedGames && preScannedGames.length > 0) {
            void processPreScannedGames(preScannedGames);
        }
    }, [isOpen, preScannedGames, processPreScannedGames]);

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
            }
        };

        const handleGameDiscovered = (_event: any, data: { gameName: string; status: string; progress: string }) => {
            setCurrentlyProcessingGame(data.gameName);
            setGameProcessingStates(prev =>
                new Map(prev).set(data.gameName, {
                    status: data.status,
                    progress: data.progress,
                }),
            );
            setScanStats(prev => ({ ...prev, found: prev.found + 1 }));

            // Note: We don't create stub games here anymore to avoid conflicts.
            // Games will be processed and added to the queue by processScannedGames.
        };

        const handleGameProcessingUpdate = (
            _event: any,
            data: { gameName: string; status: string; progress: string },
        ) => {
            setGameProcessingStates(prev =>
                new Map(prev).set(data.gameName, {
                    status: data.status,
                    progress: data.progress,
                }),
            );

            if (data.progress === '100%') {
                setScanStats(prev => ({ ...prev, processed: prev.processed + 1 }));
                // Clear current processing game when done
                setTimeout(() => setCurrentlyProcessingGame(null), 500);
            }
        };

        const removeProgressListener = window.electronAPI?.on && window.electronAPI.on('import:scanProgress', handleScanProgress);
        const removeDiscoveredListener = window.electronAPI?.on && window.electronAPI.on('import:gameDiscovered', handleGameDiscovered);
        const removeProcessingListener =
            window.electronAPI?.on && window.electronAPI.on('import:gameProcessingUpdate', handleGameProcessingUpdate);

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
    }, [isOpen, setCurrentlyProcessingGame, setGameProcessingStates, setScanProgress, setScanStats]);

    // Auto-scroll to bottom when queue changes
    useEffect(() => {
        // Only scroll if we're adding items (scanning)
        if (isScanning && queueLength > 0 && sidebarRef.current) {
            sidebarRef.current.scrollTop = sidebarRef.current.scrollHeight;
        }
    }, [isScanning, queueLength, sidebarRef]);

    return { handleScanAll };
}
