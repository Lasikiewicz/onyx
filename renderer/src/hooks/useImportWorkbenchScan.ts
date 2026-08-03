import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import type { Game } from '../types/game';
import { getImportIgnoreKey } from '../types/importer';
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
    setInvalidApiProviders: React.Dispatch<React.SetStateAction<string[]>>;
};

interface PendingGame {
    scanned: any;
    uuid: string;
    cleanTitle: string;
}

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
    setInvalidApiProviders,
}: UseImportWorkbenchScanParams) {
    const hasAutoScanned = useRef(false);

    // Shared across every processScannedGames call within one scan session (each source's
    // batch arrives as a separate call now — see the import:gamesFoundInSource listener
    // below), so duplicate paths/titles are still caught across batches, not just within one.
    const currentScanPathsRef = useRef<Set<string>>(new Set());
    const stagedTitlesRef = useRef<Set<string>>(new Set());

    // Shared metadata-processing queue across every processScannedGames call in a scan
    // session. Each source's batch (Steam, Epic, Xbox, ...) now arrives and stages its
    // stubs independently and concurrently (see the import:gamesFoundInSource listener
    // below), but their actual metadata fetches must NOT each run their own independent
    // concurrent-batch loop — that would let up to (batch size x number of sources)
    // requests hit the rate-limited main process at once instead of a single, globally
    // capped batch. Everything funnels through this one queue + single drain loop instead.
    const pendingMetadataQueueRef = useRef<PendingGame[]>([]);
    const activeDrainPromiseRef = useRef<Promise<void> | null>(null);
    // Sources report their found games in small, staggered batches (often just 1-3 games
    // each) as scanAllSources works through them one launcher at a time. Without this flag,
    // a worker that briefly finds the queue empty exits for good — so most of the pool
    // exits almost immediately after the first batch, and only one or two lingering workers
    // are left to slowly pick up whatever trickles in from later sources. Workers poll
    // instead of exiting until this is true (set once scanAllSources has fully resolved, so
    // no more batches can possibly arrive) and the queue is actually empty.
    const discoveryCompleteRef = useRef(false);

    const preScannedLength = useMemo(() => preScannedGames?.length ?? 0, [preScannedGames]);

    const processOneGame = useCallback(async (pending: PendingGame) => {
        const { scanned, uuid, cleanTitle } = pending;

        setGameProcessingStates(prev => new Map(prev).set(scanned.title, { status: 'Identifying...', progress: '15%' }));
        setScanProgress(`Identifying ${scanned.title}...`);

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
            return;
        }

        // Fetch full metadata (45s timeout)
        const searchTitle = matchResponse?.match?.title || scanned.title;
        const steamAppIdToPass = scanned.source === 'steam' ? scanned.appId : undefined;

        setScanProgress(`Fetching metadata for ${searchTitle}...`);
        setGameProcessingStates(prev =>
            new Map(prev).set(scanned.title, { status: 'Fetching metadata...', progress: '25%' }),
        );

        let metadata: any = {};
        try {
            // 45s (not 30s): the main-process artwork+description stages are each
            // bounded by an 8s per-provider ceiling, but also queue behind
            // RateLimitCoordinator's 2-concurrent-per-service cap — a game queued behind
            // others in the shared metadata queue below can legitimately take ~2 x 8s per
            // stage before its turn. 30s was tight enough that fully-successful fetches
            // were being discarded here as "timed out" even though the main process had
            // already resolved them (see MetadataFetcherService.ts's
            // fetchArtworkForGame/fetchDescriptionForGame).
            metadata = await Promise.race([
                window.electronAPI.searchArtwork(searchTitle, steamAppIdToPass, true),
                new Promise<any>((_, reject) =>
                    setTimeout(() => reject(new Error('Import metadata timeout')), 45000),
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
        setScanStats(prev => ({ ...prev, processed: prev.processed + 1 }));
    }, [abortScanRef, setGameProcessingStates, setQueue, setScanProgress, setScanStats]);

    // The real rate-limit protection lives in RateLimitCoordinator (main process): every
    // outbound request, from any number of concurrent games, is serialized per-provider at
    // a fixed 250ms interval (~4 req/sec, matching IGDB's actual documented limit) with at
    // most 2 in flight at once — so raising this doesn't risk the providers' real limits,
    // it just means more games' identify+metadata chains are active at once, each still
    // queuing safely behind that same shared throttle. The tradeoff is purely local: more
    // concurrent games compete for that same throughput, so a game further back in a large
    // batch waits longer for its turn before its own 45s client-side timeout applies.
    const METADATA_CONCURRENCY = 6;

    // Rolling worker pool, not batch-and-wait: each of the 3 workers pulls the next queued
    // game the instant it finishes its own, rather than the whole trio waiting for its
    // slowest member before any of them can start the next one. This also means a game
    // starts processing the moment a slot is free, not only at the start of a "round" —
    // so the very first discovered game starts immediately instead of waiting to be
    // batched with others.
    const drainMetadataQueue = useCallback(async () => {
        const activeTitles = new Set<string>();
        const updateCurrentlyProcessing = () => {
            setCurrentlyProcessingGame(activeTitles.size > 0 ? Array.from(activeTitles).join(', ') : null);
        };

        const worker = async () => {
            while (true) {
                if (abortScanRef.current) {
                    pendingMetadataQueueRef.current = [];
                    return;
                }

                const next = pendingMetadataQueueRef.current.shift();
                if (!next) {
                    if (discoveryCompleteRef.current) {
                        return;
                    }
                    // More sources may still report games — wait briefly and check again
                    // rather than exiting the pool early.
                    await new Promise(resolve => setTimeout(resolve, 150));
                    continue;
                }

                activeTitles.add(next.scanned.title);
                updateCurrentlyProcessing();
                try {
                    await processOneGame(next);
                } catch (err) {
                    console.error(`[Importer] Failed to process ${next.scanned.title}:`, err);
                    setScanStats(prev => ({ ...prev, processed: prev.processed + 1 }));
                } finally {
                    activeTitles.delete(next.scanned.title);
                    updateCurrentlyProcessing();
                }
            }
        };

        await Promise.all(Array.from({ length: METADATA_CONCURRENCY }, () => worker()));
        setCurrentlyProcessingGame(null);
    }, [abortScanRef, processOneGame, setCurrentlyProcessingGame, setScanStats]);

    // Enqueue games for metadata processing and ensure exactly one drain loop is active —
    // if a drain is already running (from another source's batch), this just adds to the
    // queue it's already consuming from, rather than starting a second competing loop.
    // Always returns/awaits the active drain (even if THIS call added nothing new) — the
    // safety-net call in handleScanAll passes an empty/already-deduped list once every
    // game has already been staged incrementally, and it still needs to block on whatever
    // drain is in flight so isScanning doesn't flip false while games are still processing.
    const enqueueForMetadataProcessing = useCallback((pendingGames: PendingGame[]) => {
        if (pendingGames.length > 0) {
            pendingMetadataQueueRef.current.push(...pendingGames);
        }
        if (!activeDrainPromiseRef.current) {
            if (pendingMetadataQueueRef.current.length === 0) {
                return Promise.resolve();
            }
            activeDrainPromiseRef.current = drainMetadataQueue().finally(() => {
                activeDrainPromiseRef.current = null;
            });
        }
        return activeDrainPromiseRef.current;
    }, [drainMetadataQueue]);

    // This stays in the hook so scanner-related UI behavior doesn't require edits to ImportWorkbench.
    const processScannedGames = useCallback(
        async (scannedGames: any[]) => {
            if (!scannedGames || scannedGames.length === 0) return;

            // Each call represents one newly-arrived batch (one source, or the pre-scanned
            // handoff list) so found accumulates across calls within a scan session.
            setScanStats(prev => ({ ...prev, found: prev.found + scannedGames.length }));

            // Shared across batches within this scan session so duplicate paths found by two
            // different sources (e.g. registry + folder scan) are still caught.
            const currentScanPaths = currentScanPathsRef.current;

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
                    .flatMap(g => {
                        const installPath = normalizePath((g as any).installationDirectory);
                        const exePath = normalizePath((g as any).exePath);
                        const exeDirectory = exePath.includes('/') ? exePath.slice(0, exePath.lastIndexOf('/')) : '';
                        return [installPath, exeDirectory];
                    })
                    .filter(Boolean),
            );

            const isExistingInstallPath = (candidate: string): boolean => {
                if (existingInstallPaths.has(candidate)) return true;
                return Array.from(existingInstallPaths).some(existing =>
                    candidate.startsWith(`${existing}/`) || existing.startsWith(`${candidate}/`),
                );
            };

            const existingExePaths = new Set(
                existingLibrary
                    .map(g => normalizePath((g as any).exePath))
                    .filter(Boolean),
            );

            let ignoredGameKeys = new Set<string>();
            try {
                const preferences = await window.electronAPI.getPreferences();
                ignoredGameKeys = new Set(preferences.ignoredGames || []);
            } catch (error) {
                console.warn('[Importer] Failed to load ignored games:', error);
            }

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

            const pendingGames: PendingGame[] = [];
            const allStubs: StagedGame[] = [];

            for (let i = 0; i < scannedGames.length; i++) {
                const scanned = scannedGames[i];

                const ignoreKey = getImportIgnoreKey(
                    scanned.source,
                    scanned.appId,
                    scanned.originalName || scanned.title || scanned.name,
                );
                if (ignoredGameKeys.has(ignoreKey)) {
                    console.log(`[Importer] Skipping ignored game: ${scanned.title || scanned.name || scanned.originalName}`);
                    setScanStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
                    continue;
                }

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
                        (isExistingInstallPath(normalizedInstall) || currentScanPaths.has(normalizedInstall))
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
                if (normalizedTitle && (existingTitles.has(normalizedTitle) || stagedTitlesRef.current.has(normalizedTitle))) {
                    console.log(`[Importer] Skipping duplicate by title: ${scanned.title}`);
                    setScanStats(prev => ({ ...prev, skipped: prev.skipped + 1 }));
                    continue;
                }
                if (normalizedTitle) {
                    stagedTitlesRef.current.add(normalizedTitle);
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

            // ── Phase 2: Enqueue for metadata processing ──
            // Feeds into the shared, globally-capped queue (see enqueueForMetadataProcessing
            // above) instead of running its own independent batch loop — so concurrent
            // batches from different sources don't each spin up their own concurrency and
            // collectively overwhelm the rate-limited main process. Always called (even with
            // an empty list) — it awaits any already-active drain from another call, which
            // matters for the safety-net call in handleScanAll (see that function's comment).
            await enqueueForMetadataProcessing(pendingGames);
        },
        [
            enqueueForMetadataProcessing,
            existingLibrary,
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

            // This is a one-shot, complete list (not a streaming discovery like
            // scanAllSources), so the metadata worker pool shouldn't wait around for more.
            discoveryCompleteRef.current = true;

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
        setInvalidApiProviders([]);
        currentScanPathsRef.current = new Set();
        stagedTitlesRef.current = new Set();
        pendingMetadataQueueRef.current = [];
        activeDrainPromiseRef.current = null;
        discoveryCompleteRef.current = false;

        // Quick API check before starting. Bounded by an 8s per-provider timeout on the
        // main-process side, so a dead API can't stall this step (see MetadataFetcherService).
        setScanProgress('Verifying API credentials...');
        try {
            const validation = await window.electronAPI.validateMetadataProviders();
            const providersWithCreds = ['igdb', 'rawg', 'steamgriddb', 'giantbomb'];
            const invalidProviders = Object.entries(validation)
                .filter(([name, isValid]) => !isValid && providersWithCreds.includes(name))
                .map(([name]) => name.toUpperCase());

            // Surfaced persistently in the header (not just this transient progress line),
            // so the user can still see and act on it after the scan moves past this step.
            setInvalidApiProviders(invalidProviders);
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
            // No more import:gamesFoundInSource batches can arrive past this point — lets
            // the metadata worker pool stop polling once the queue actually empties instead
            // of waiting around indefinitely for sources that have already finished.
            discoveryCompleteRef.current = true;

            if (abortScanRef.current) {
                console.log('[Importer] Scan aborted by user after scanAllSources returned');
                return;
            }

            if (results.success && results.games) {
                // Games are normally already staged incrementally as each source finishes
                // (see the import:gamesFoundInSource listener below). This call is a safety
                // net for anything that slipped through — the shared dedup refs above mean
                // anything already staged is skipped here, not duplicated.
                await processScannedGames(results.games);
            } else {
                setError(results.error || 'Scan failed');
            }
        } catch (err) {
            discoveryCompleteRef.current = true;
            if (!abortScanRef.current) {
                setError('Failed to scan sources');
                console.error(err);
            }
        } finally {
            setIsScanning(false);
            setScanProgress('');
            setCurrentlyProcessingGame(null);
        }
    }, [
        abortScanRef,
        processScannedGames,
        setCurrentlyProcessingGame,
        setError,
        setGameProcessingStates,
        setInvalidApiProviders,
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

            // Note: `processed` is not incremented here — these events are emitted
            // during source discovery (main process) on a simulated timer and don't
            // reflect real metadata-processing completion. The single source of truth
            // for `processed` is processOneGame in processScannedGames below.
        };

        const handleGamesFoundInSource = (_event: any, data: { games: any[] }) => {
            if (data?.games?.length) {
                void processScannedGames(data.games);
            }
        };

        const removeProgressListener = window.electronAPI?.on && window.electronAPI.on('import:scanProgress', handleScanProgress);
        const removeDiscoveredListener = window.electronAPI?.on && window.electronAPI.on('import:gameDiscovered', handleGameDiscovered);
        const removeProcessingListener =
            window.electronAPI?.on && window.electronAPI.on('import:gameProcessingUpdate', handleGameProcessingUpdate);
        const removeGamesFoundListener =
            window.electronAPI?.on && window.electronAPI.on('import:gamesFoundInSource', handleGamesFoundInSource);

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
            if (removeGamesFoundListener && typeof removeGamesFoundListener === 'function') {
                removeGamesFoundListener();
            }
        };
    }, [isOpen, processScannedGames, setCurrentlyProcessingGame, setGameProcessingStates, setScanProgress, setScanStats]);

    // Auto-scroll to bottom when queue changes
    useEffect(() => {
        // Only scroll if we're adding items (scanning)
        if (isScanning && queueLength > 0 && sidebarRef.current) {
            sidebarRef.current.scrollTop = sidebarRef.current.scrollHeight;
        }
    }, [isScanning, queueLength, sidebarRef]);

    return { handleScanAll };
}
