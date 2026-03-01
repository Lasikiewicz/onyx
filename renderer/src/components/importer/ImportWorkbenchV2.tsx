/**
 * ImportWorkbenchV2 - A clean, maintainable game importer
 * Uses GamePropertiesPanel for unified game editing
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { StagedGame, ImportStatus, ImportSource } from '../../types/importer';
import { Game } from '../../types/game';
import { GamePropertiesPanel, GamePropertiesPanelHandle } from '../GamePropertiesPanel';
import { ConfirmationDialog } from '../ConfirmationDialog';

export type ImportProgressCallback = (current: number, total: number, phase: string, detail?: string) => void;

interface ImportWorkbenchV2Props {
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
    gog: 'GOG',
    xbox: 'Xbox',
    ubisoft: 'Ubisoft',
    rockstar: 'Rockstar',
    ea: 'EA',
    battle: 'Battle.net',
    manual_file: 'Manual File',
    manual_folder: 'Game',
};

const getSourceIcon = (source: string): React.ReactNode => {
    const cls = "w-4 h-4 flex-shrink-0";
    switch (source) {
        case 'steam':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.979 0C5.678 0 .511 4.86.022 10.91l6.432 2.658a3.387 3.387 0 0 1 1.912-.588c.063 0 .125.002.188.006l2.861-4.142V8.77a4.508 4.508 0 0 1 4.508-4.508 4.508 4.508 0 0 1 4.509 4.508 4.508 4.508 0 0 1-4.509 4.508h-.105l-4.076 2.91c0 .052.004.105.004.159 0 1.868-1.519 3.387-3.387 3.387a3.39 3.39 0 0 1-3.354-2.94L.458 14.84C1.891 19.928 6.502 23.8 12 23.8c6.627 0 12-5.373 12-12S18.627 0 12 0h-.021zm-6.36 16.578l-1.46-.603c.26.53.66.984 1.178 1.297a2.548 2.548 0 0 0 3.473-1.022 2.535 2.535 0 0 0 .001-2.038 2.537 2.537 0 0 0-1.373-1.374l1.51.625a1.87 1.87 0 0 1-1.458 3.448 1.87 1.87 0 0 1-1.871-1.333zm10.313-5.39a3.006 3.006 0 0 0-3.003-3.003 3.006 3.006 0 0 0-3.003 3.003 3.006 3.006 0 0 0 3.003 3.003 3.006 3.006 0 0 0 3.003-3.003zm-5.254-.001a2.253 2.253 0 0 1 2.252-2.252 2.253 2.253 0 0 1 2.252 2.252 2.253 2.253 0 0 1-2.252 2.252 2.253 2.253 0 0 1-2.252-2.252z" />
                </svg>
            );
        case 'epic':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.537 0C2.165 0 1.66.506 1.66 1.879V22.12c0 1.374.504 1.879 1.877 1.879h16.926c1.374 0 1.877-.505 1.877-1.879v-3.591h-1.69v3.404c0 .393-.26.601-.602.601H4.14c-.342 0-.601-.208-.601-.601V1.965c0-.393.26-.601.601-.601h15.908c.342 0 .602.208.602.601v3.404h1.69V1.879C22.34.505 21.837 0 20.463 0H3.537zm7.907 5.39v2.997H7.353v2.2h3.566v2.997H7.353v2.2h4.091v2.997H4.982V5.39h6.462zm1.949 0h3.028l2.043 5.597 2.043-5.597h2.828v13.39h-2.452V11.48l-1.842 4.927h-1.4l-1.843-4.856v7.23h-2.405V5.39z" />
                </svg>
            );
        case 'gog':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4A9.6 9.6 0 0 1 21.6 12 9.6 9.6 0 0 1 12 21.6 9.6 9.6 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4zm0 3.6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 2.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2z" />
                </svg>
            );
        case 'xbox':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.102 21.033A11.947 11.947 0 0 0 12 24a11.947 11.947 0 0 0 7.898-2.967c1.066-1.079-.508-4.633-3.738-7.873C12.907 9.838 9.834 8.038 8.59 8.59c-3.232 3.24-5.807 6.794-4.489 12.443zM12 2.4c1.682 0 3.27.44 4.645 1.21-.635.39-3.896 2.414-7.29 5.808C6.27 12.503 4.06 15.99 3.65 16.94 2.79 15.49 2.4 13.8 2.4 12 2.4 6.698 6.698 2.4 12 2.4zm0-2.4C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" />
                </svg>
            );
        case 'ubisoft':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.563 12c0-1.424-.248-2.79-.703-4.059a12.006 12.006 0 0 0-6.96-7.12A11.854 11.854 0 0 0 12 0C5.382 0 0 5.382 0 12s5.382 12 12 12c3.848 0 7.252-1.816 9.435-4.635A11.926 11.926 0 0 0 23.563 12zM12 21.6a9.6 9.6 0 1 1 0-19.2 9.6 9.6 0 0 1 0 19.2zm0-14.4a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6z" />
                </svg>
            );
        case 'rockstar':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.971 6.816l-.907 2.02L2.4 9.6l2.664.764.907 2.02.907-2.02L9.542 9.6l-2.664-.764-.907-2.02zM12 1.636L10.364 5.09 6.545 6.545l3.819 1.455L12 11.818l1.636-3.818 3.819-1.455-3.819-1.455L12 1.636zm6.029 5.18l-.907 2.02L14.458 9.6l2.664.764.907 2.02.907-2.02L21.6 9.6l-2.664-.764-.907-2.02zM12 12.182l-1.636 3.818L6.545 17.455l3.819 1.455L12 22.727l1.636-3.817 3.819-1.455-3.819-1.455L12 12.182z" />
                </svg>
            );
        case 'ea':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.635 6.162l-5.928 5.838 5.928 5.838H24V6.162h-7.365zM0 6.162v11.676h7.365l5.928-5.838-5.928-5.838H0z" />
                </svg>
            );
        case 'battle':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10.457 0c-.516 3.157-.753 5.066-2.007 7.065C7.197 9.064 5.178 10.467 4 11.6c2.775 2.888 5.442 3.467 7.13 3.467.89 0 2.065-.267 2.065-.267s-.377 2.133-.377 3.6C12.818 21.733 15.32 24 15.32 24s2.502-2.267 2.502-5.6c0-1.467-.377-3.6-.377-3.6s1.175.267 2.065.267c1.688 0 4.355-.579 7.13-3.467-1.178-1.133-3.197-2.536-4.45-4.535C20.936 5.066 20.699 3.157 20.183 0c-3.076 1.81-4.538 3.257-5.453 5.6C14.278 4.12 14.1 2.267 14.32.533 14.32.533 13.54 0 12 0c-1.54 0-2.32.533-2.32.533.22 1.734.042 3.587-.41 5.067C8.355 3.257 6.893 1.81 3.817 0h6.64z" />
                </svg>
            );
        case 'manual_file':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                </svg>
            );
        case 'manual_folder':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
            );
        default:
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <line x1="6" y1="12" x2="18" y2="12" />
                </svg>
            );
    }
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
    const gameRowRefs = useRef<Record<string, HTMLDivElement | null>>({});
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
                    <div ref={sidebarRef} className="w-[300px] lg:w-[350px] border-r border-gray-800 bg-gray-900/50 overflow-y-auto">
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
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-6 p-8">
                                <div className="text-center max-w-md space-y-2">
                                    <h3 className="text-xl font-semibold text-white">Welcome to Add Games</h3>
                                    <p className="text-gray-400">
                                        Detect games installed on your system from Steam, Epic, GOG, and other launchers.
                                    </p>
                                </div>

                                <div className="flex flex-col gap-3 my-4">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-10 h-5 md:w-12 md:h-6 rounded-full relative transition-colors duration-300 ${preferAnimatedBoxart ? 'bg-blue-600' : 'bg-gray-700 group-hover:bg-gray-600'}`}>
                                            <div className={`absolute top-1 left-1 bg-white w-3 h-3 md:w-4 md:h-4 rounded-full transition-transform duration-300 ${preferAnimatedBoxart ? 'translate-x-5 md:translate-x-6' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                                            Prefer Animated Box Art
                                        </span>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={preferAnimatedBoxart}
                                            onChange={handleTogglePreferAnimatedBoxart}
                                        />
                                    </label>

                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <div className={`w-10 h-5 md:w-12 md:h-6 rounded-full relative transition-colors duration-300 ${preferAnimatedBanner ? 'bg-blue-600' : 'bg-gray-700 group-hover:bg-gray-600'}`}>
                                            <div className={`absolute top-1 left-1 bg-white w-3 h-3 md:w-4 md:h-4 rounded-full transition-transform duration-300 ${preferAnimatedBanner ? 'translate-x-5 md:translate-x-6' : 'translate-x-0'}`} />
                                        </div>
                                        <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">
                                            Prefer Animated Banners
                                        </span>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={preferAnimatedBanner}
                                            onChange={handleTogglePreferAnimatedBanner}
                                        />
                                    </label>
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
                                            <svg className="w-6 h-6 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
