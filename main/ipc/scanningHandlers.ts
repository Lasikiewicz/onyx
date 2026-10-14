import { BrowserWindow, ipcMain } from 'electron';
import { dirname } from 'node:path';
import { GameStore } from '../GameStore.js';
import { AppConfigService } from '../AppConfigService.js';
import { ImportService } from '../ImportService.js';
import { findMissingGames } from '../missingGames.js';
import { isProcessAlive } from '../processAlive.js';
import { gameProcessEvents, PROCESS_FOUND_EVENT, SESSION_ENDED_EVENT, type ProcessFoundEvent, type SessionEndedEvent } from '../gameProcessEvents.js';
import { recordPlaySession } from '../playtime.js';
import { libraryBackups } from '../libraryBackups.js';
import { MetadataFetcherService } from '../MetadataFetcherService.js';
import { ImageCacheService } from '../ImageCacheService.js';
import type { UserPreferencesService } from '../UserPreferencesService.js';
import { promises as fsp } from 'node:fs';

let backgroundScanInterval: NodeJS.Timeout | null = null;
let backgroundScanPaused = false;

/**
 * Games the renderer has reported as running. Background scanning is suppressed while this is
 * non-empty, so a stale entry disables background scanning for the rest of the session.
 *
 * `scanning:gameStopped` is the happy path, but it never arrives if the game crashes, the
 * renderer reloads, or the launch-monitor interval is torn down mid-session. Each entry
 * therefore carries enough context to be verified independently — see `pruneRunningGames`.
 */
interface RunningGameEntry {
    /** Process id when the launcher reported one; absent for the poll-only launch path. */
    pid?: number;
    startedAt: number;
}

const runningGames = new Map<string, RunningGameEntry>();

// Protocol launches have no PID at launch time. The launcher finds the real game process a few
// seconds later and reports it here, so pausing and restore follow the game, not the launcher (A4).
gameProcessEvents.on(PROCESS_FOUND_EVENT, (event: ProcessFoundEvent) => {
    const entry = runningGames.get(event.gameId);
    runningGames.set(event.gameId, {
        pid: event.pid,
        startedAt: entry?.startedAt ?? Date.now(),
    });
    console.log(`[BackgroundScan] Tracking ${event.gameId} by process ${event.pid}`);
});

/**
 * Stop tracking a game and report its session, so playtime is recorded however the session ended:
 * a normal stop, a process that vanished, or a stale entry (E1).
 */
function endRunningSession(gameId: string): void {
    const entry = runningGames.get(gameId);
    runningGames.delete(gameId);
    if (entry) {
        gameProcessEvents.emit(SESSION_ENDED_EVENT, { gameId, startedAt: entry.startedAt, endedAt: Date.now() } satisfies SessionEndedEvent);
    }
}

/**
 * How long a pid-less entry may sit before it is assumed dead. The renderer's fallback poll
 * gives up after ~60s, so anything older than this has no monitor left to clear it.
 */
const PIDLESS_ENTRY_TTL_MS = 2 * 60 * 1000;

/** Cross-platform liveness check; mirrors the `process:checkExists` handler. */

/**
 * Drop entries that can no longer correspond to a live game, so a missed `gameStopped` cannot
 * disable background scanning permanently.
 */
async function pruneRunningGames(): Promise<void> {
    const now = Date.now();
    for (const [gameId, entry] of [...runningGames]) {
        if (entry.pid !== undefined) {
            if (!(await isProcessAlive(entry.pid))) {
                endRunningSession(gameId);
                console.log(`[BackgroundScan] Dropping stale running game ${gameId} (pid ${entry.pid} is gone)`);
            }
        } else if (now - entry.startedAt > PIDLESS_ENTRY_TTL_MS) {
            endRunningSession(gameId);
            console.log(`[BackgroundScan] Dropping stale running game ${gameId} (no pid, older than TTL)`);
        }
    }
}

/** Cleared when the renderer reloads: the new renderer has no launch monitors for old entries. */
export function clearRunningGames(): void {
    if (runningGames.size > 0) {
        console.log(`[BackgroundScan] Clearing ${runningGames.size} running game(s) after renderer reload`);
    }
    runningGames.clear();
}

/**
 * Async replacement for fs.existsSync - this runs on the main process, so a sync fs call here
 * (checking every library game's exe, potentially hundreds of them) blocks window paint/input
 * and IPC handling for its duration, same class of bug as the ImportService scanners.
 */
async function pathExists(path: string): Promise<boolean> {
    try {
        await fsp.access(path);
        return true;
    } catch {
        return false;
    }
}

export function getBackgroundScanUiChannels(fromStartup: boolean): {
    progressChannel: 'startup:progress' | null;
    newGamesChannel: 'startup:newGamesFound' | 'background:newGamesFound';
} {
    return {
        progressChannel: fromStartup ? 'startup:progress' : null,
        newGamesChannel: fromStartup ? 'startup:newGamesFound' : 'background:newGamesFound',
    };
}

export function registerScanningHandlers(
    winReference: { readonly current: BrowserWindow | null },
    gameStore: GameStore,
    appConfigService: AppConfigService,
    importService: ImportService,
    metadataFetcher: MetadataFetcherService,
    imageCacheService: ImageCacheService,
    userPreferencesService: Pick<UserPreferencesService, 'getPreferences'>,
) {
    let backgroundScanInFlight = false;

    // Each finished session adds its playtime to the library record (E1). Registered here, not at
    // module level, because the store is only available once handlers are wired up.
    gameProcessEvents.on(SESSION_ENDED_EVENT, (session: SessionEndedEvent) => {
        if (recordPlaySession(gameStore, session)) {
            console.log(`[Playtime] Recorded session for ${session.gameId}`);
        }
    });

    const performBackgroundScan = async (skipEnabledCheck: boolean = false, fromStartup: boolean = false) => {
        // The hourly interval and the app:performBackgroundScan IPC can fire together;
        // without this guard both run a full multi-source disk walk concurrently.
        if (backgroundScanInFlight) {
            console.log('[BackgroundScan] Skipping scan - a scan is already in progress');
            return;
        }
        backgroundScanInFlight = true;
        try {
            const channels = getBackgroundScanUiChannels(fromStartup);
            if (backgroundScanPaused) {
                console.log('[BackgroundScan] Skipping scan - background scanning is paused');
                return;
            }

            if (!skipEnabledCheck) {
                const enabled = await appConfigService.getBackgroundScanEnabled();
                if (!enabled) {
                    return;
                }
            }

            // Skip background scan if games are currently running. Verify first: an entry whose
            // process has exited (crash, missed gameStopped) must not keep scanning disabled.
            await pruneRunningGames();
            if (runningGames.size > 0) {
                console.log(`[BackgroundScan] Skipping scan - ${runningGames.size} game(s) currently running`);
                return;
            }

            console.log('[BackgroundScan] Starting background scan...');
            // Background scans can be stopped by the importer. Their result is still used for the
            // missing-games check below, so cancellation is turned off here (A3).
            const scanReport = await importService.scanAllSourcesWithReport((message) => {
                if (channels.progressChannel && winReference.current && !winReference.current.isDestroyed()) {
                    winReference.current.webContents.send(channels.progressChannel, { message });
                }
            }, undefined, { cancellable: false });
            const scannedResults = scanReport.results;
            console.log(`[BackgroundScan] Scanned ${scannedResults.length} total games`);

            if (backgroundScanPaused) {
                console.log('[BackgroundScan] Ignoring scan results - background scanning was paused while scan was running');
                return;
            }

            if (scannedResults.length > 0) {
                const existingLibrary = await gameStore.getLibrary();
                const preferences = await userPreferencesService.getPreferences();
                const ignoredGames = new Set(preferences.ignoredGames || []);
                const existingGameIds = new Set(existingLibrary.map(g => g.id));
                const existingExePaths = new Set(
                    existingLibrary
                        .map(g => g.exePath)
                        .filter((path): path is string => !!path)
                        .map(path => path.toLowerCase().replace(/\\/g, '/').trim())
                );
                const normalizeDir = (p: string) =>
                    p.toLowerCase().replace(/\\/g, '/').trim().replace(/\/+$/, '');
                const existingInstallDirs = new Set(
                    existingLibrary
                        .map(g => {
                            const dir = g.installationDirectory || (g.exePath ? dirname(g.exePath) : '');
                            return dir ? normalizeDir(dir) : '';
                        })
                        .filter(Boolean)
                );
                const isExistingInstallDir = (candidate: string) =>
                    existingInstallDirs.has(candidate) ||
                    Array.from(existingInstallDirs).some(existing =>
                        candidate.startsWith(`${existing}/`) || existing.startsWith(`${candidate}/`),
                    );

                const newGames = scannedResults.filter(g => {
                    const ignoreKey = `${g.source}-${g.appId || g.originalName || g.title || ''}`;
                    if (ignoredGames.has(ignoreKey)) return false;
                    if (g.source === 'steam' && g.appId) {
                        if (existingGameIds.has(`steam-${g.appId}`)) return false;
                    }
                    if (g.exePath) {
                        const normalized = g.exePath.toLowerCase().replace(/\\/g, '/').trim();
                        if (existingExePaths.has(normalized)) return false;
                    }
                    const scannedInstallDir = normalizeDir(g.installPath || (g.exePath ? dirname(g.exePath) : ''));
                    if (scannedInstallDir && isExistingInstallDir(scannedInstallDir)) return false;
                    return true;
                });

                if (newGames.length > 0) {
                    console.log(`[BackgroundScan] Found ${newGames.length} new games to import`);
                    if (winReference.current && !winReference.current.isDestroyed()) {
                        winReference.current.webContents.send(channels.newGamesChannel, {
                            count: newGames.length,
                            games: newGames
                        });
                    }

                    // Auto-import disabled in favor of user confirmation
                    /* 
                    for (const game of newGames) {
                        try {
                            // Auto-import with basic metadata
                            await gameStore.saveGame({
                                id: game.source === 'steam' ? `steam-${game.appId}` : `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                                title: game.title,
                                exePath: game.exePath,
                                source: game.source,
                                installationDirectory: game.installPath,
                                platform: 'pc',
                            });
                        } catch (err) {
                            console.error(`[BackgroundScan] Error importing new game ${game.title}:`, err);
                        }
                    }
                    */
                }
            }

            // Check for missing games. Uses the scan report, so a cancelled or failed Steam scan
            // can't flag the whole Steam library (A3).
            const missingGames = await findMissingGames(await gameStore.getLibrary(), scanReport, pathExists);

            if (missingGames.length > 0) {
                console.log(`[BackgroundScan] Found ${missingGames.length} missing games`);
                if (winReference.current && !winReference.current.isDestroyed()) {
                    // Send missing games to renderer for user confirmation
                    winReference.current.webContents.send('scan:missing-games', {
                        games: missingGames.map(g => ({
                            id: g.id,
                            title: g.title,
                            exePath: g.exePath,
                            platform: g.platform,
                            source: g.source
                        }))
                    });
                }
            }
        } catch (error) {
            console.error('[BackgroundScan] Error during background scan:', error);
        } finally {
            backgroundScanInFlight = false;
        }
    };

    const startBackgroundScan = async () => {
        if (backgroundScanPaused || backgroundScanInterval) return;
        const interval = 60 * 60 * 1000; // 1 hour
        backgroundScanInterval = setInterval(() => performBackgroundScan(), interval);
        console.log('[BackgroundScan] Background scan interval started (1 hour)');
    };

    const stopBackgroundScan = () => {
        if (backgroundScanInterval) {
            clearInterval(backgroundScanInterval);
            backgroundScanInterval = null;
            console.log('[BackgroundScan] Background scan interval stopped');
        }
    };

    const pauseBackgroundScan = async () => {
        if (backgroundScanPaused) return { success: true };
        backgroundScanPaused = true;
        stopBackgroundScan();
        console.log('[BackgroundScan] Background scanning paused');
        return { success: true };
    };

    const resumeBackgroundScan = async () => {
        if (!backgroundScanPaused) return { success: true };
        backgroundScanPaused = false;
        console.log('[BackgroundScan] Background scanning resumed');
        const enabled = await appConfigService.getBackgroundScanEnabled();
        if (enabled) {
            await startBackgroundScan();
        }
        return { success: true };
    };

    ipcMain.handle('app:performBackgroundScan', async (_event, quiet: boolean = false) => {
        await performBackgroundScan(quiet);
        return { success: true };
    });

    // Handle manual scan all sources request from the Game Importer
    ipcMain.handle('import:scanAllSources', async () => {
        try {
            console.log('[ImportService] Starting manual scan from Game Importer...');

            // Forward progress text as it comes in, and push each source's games to the
            // renderer as soon as that source finishes scanning — so the Add Games list
            // populates progressively instead of waiting for every launcher to finish.
            const scannedResults = await importService.scanAllSources(
                (message) => {
                    if (winReference.current && !winReference.current.isDestroyed()) {
                        winReference.current.webContents.send('import:scanProgress', { message });
                    }
                },
                (games) => {
                    if (winReference.current && !winReference.current.isDestroyed()) {
                        winReference.current.webContents.send('import:gamesFoundInSource', { games });
                    }
                }
            );

            console.log(`[ImportService] Manual scan completed: ${scannedResults.length} games found`);

            return {
                success: true,
                games: scannedResults
            };
        } catch (error) {
            console.error('[ImportService] Error during manual scan:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                games: []
            };
        }
    });

    // Handle manual scan all sources request from the Game Importer
    ipcMain.handle('import:cancelScan', async () => {
        try {
            console.log('[ImportService] Received cancel scan request from renderer');
            importService.cancelScanAllSources();
            return { success: true };
        } catch (error) {
            console.error('[ImportService] Error cancelling scan:', error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
        }
    });

    // Handle getting list of missing games without removing them
    ipcMain.handle('scan:getMissingGames', async () => {
        try {
            console.log('[BackgroundScan] Getting list of missing games...');

            // Scan all sources to get current state. Not cancellable from the importer.
            const scanReport = await importService.scanAllSourcesWithReport(undefined, undefined, { cancellable: false });
            const missingGames = await findMissingGames(await gameStore.getLibrary(), scanReport, pathExists);

            console.log(`[BackgroundScan] Found ${missingGames.length} missing games during manual scan`);

            return {
                success: true,
                games: missingGames.map(g => ({
                    id: g.id,
                    title: g.title,
                    exePath: g.exePath,
                    platform: g.platform,
                    source: g.source
                }))
            };
        } catch (error) {
            console.error('[BackgroundScan] Error getting missing games:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                games: []
            };
        }
    });

    // Handle removal of missing games
    ipcMain.handle('scan:removeMissingGames', async (_event, gameIds: string[]) => {
        try {
            console.log(`[BackgroundScan] Removing ${gameIds.length} missing games...`);
            // Snapshot before removing anything, so a bulk removal can be restored (E3).
            await libraryBackups().snapshot(await gameStore.getLibrary(), 'remove missing games');
            let removedCount = 0;

            for (const gameId of gameIds) {
                try {
                    // Delete cached artwork too, as gameStore:deleteGame does, so nothing is left behind (A11).
                    await imageCacheService.deleteAllGameImages(gameId);
                    await gameStore.deleteGame(gameId);
                    removedCount++;
                    console.log(`[BackgroundScan] Removed missing game: ${gameId}`);
                } catch (err) {
                    console.error(`[BackgroundScan] Error removing game ${gameId}:`, err);
                }
            }

            console.log(`[BackgroundScan] Successfully removed ${removedCount}/${gameIds.length} missing games`);
            return { success: true, removedCount };
        } catch (error) {
            console.error('[BackgroundScan] Error removing missing games:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                removedCount: 0
            };
        }
    });

    // Track running games to pause background scanning during gameplay
    ipcMain.handle('scanning:gameStarted', (_event, gameId: string, pid?: number) => {
        runningGames.set(gameId, {
            pid: typeof pid === 'number' && Number.isFinite(pid) && pid > 0 ? pid : undefined,
            startedAt: Date.now(),
        });
        console.log(`[BackgroundScan] Game started: ${gameId} (pid ${pid ?? 'unknown'}), running games: ${runningGames.size}`);
    });

    ipcMain.handle('scanning:gameStopped', (_event, gameId: string) => {
        endRunningSession(gameId);
        console.log(`[BackgroundScan] Game stopped: ${gameId}, running games: ${runningGames.size}`);
    });

    ipcMain.handle('appConfig:pauseBackgroundScan', pauseBackgroundScan);
    ipcMain.handle('appConfig:resumeBackgroundScan', resumeBackgroundScan);

    return { performBackgroundScan, startBackgroundScan, stopBackgroundScan, pauseBackgroundScan, resumeBackgroundScan };
}
