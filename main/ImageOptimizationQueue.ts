import type { ImageCacheService } from './ImageCacheService.js';
import type { GameStore, Game } from './GameStore.js';
import type { ImageJobStatus } from './ImageOptimizationController.js';
import {
  getCurrentRunId,
  startRun,
  addJobs,
  updateJobByGameAndType,
  finishRun,
  setRuntimeMetrics,
  getStatus as getControllerStatus,
} from './ImageOptimizationController.js';
import { debugOptimizationLog, isDebugOptimizationEnabled } from './debugOptimizationLog.js';
import { cpus } from 'node:os';
import path from 'node:path';
import { existsSync } from 'node:fs';

type OptimizationPerformanceProfile = 'low' | 'balanced' | 'high';

// high hardCap kept moderate to avoid import hang: too many concurrent game workers
// exhausts resources (Sharp, file descriptors, memory) and can deadlock.
const PROFILE_LIMITS: Record<OptimizationPerformanceProfile, { reserveCores: number; utilization: number; hardCap: number }> = {
  low: { reserveCores: 4, utilization: 0.25, hardCap: 2 },
  balanced: { reserveCores: 2, utilization: 0.5, hardCap: 8 },
  high: { reserveCores: 1, utilization: 0.75, hardCap: 12 },
};

type CpuSnapshot = {
  idle: number;
  total: number;
};

export interface ImageQueueItem {
  gameId: string;
  gameTitle: string;
  phase: 'static' | 'animated';
  urls: {
    boxArtUrl?: string;
    bannerUrl?: string;
    alternativeBannerUrl?: string;
    logoUrl?: string;
    heroUrl?: string;
    iconUrl?: string;
  };
}

// Re-export for callers that still use ImageQueueItem
export type { ImageJobStatus };

export interface ImageQueueStatus {
  queued: number;
  completed: number;
  imagesQueued?: number;
  imagesCompleted?: number;
  imageJobs?: ImageJobStatus[];
}

const imageTypesFromUrls = (urls: ImageQueueItem['urls']) => {
  const out: { type: string; url: string }[] = [];
  if (urls.boxArtUrl) out.push({ type: 'boxart', url: urls.boxArtUrl });
  if (urls.bannerUrl) out.push({ type: 'banner', url: urls.bannerUrl });
  if (urls.alternativeBannerUrl) out.push({ type: 'alternativeBanner', url: urls.alternativeBannerUrl });
  if (urls.logoUrl) out.push({ type: 'logo', url: urls.logoUrl });
  if (urls.heroUrl) out.push({ type: 'hero', url: urls.heroUrl });
  if (urls.iconUrl) out.push({ type: 'icon', url: urls.iconUrl });
  return out;
};

const sourceExtFromUrl = (url: string): string | undefined => {
  if (!url) return undefined;
  try {
    if (url.startsWith('file://')) {
      const parsed = decodeURIComponent(url.replace('file://', '').replace(/^\//, ''));
      const ext = path.extname(parsed).replace('.', '').toUpperCase();
      return ext || undefined;
    }
    const ext = path.extname(new URL(url).pathname).replace('.', '').toUpperCase();
    return ext || undefined;
  } catch {
    return undefined;
  }
};

const CACHE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.webm', '.ico', '.avif'] as const;

const inferSourceExtFromCache = (cacheDir: string, gameId: string, imageType: string): string | undefined => {
  const safeGameId = gameId.replace(/[<>:"/\\|?*]/g, '_');
  for (const ext of CACHE_EXTENSIONS) {
    const filePath = path.join(cacheDir, `${safeGameId}-${imageType}${ext}`);
    if (existsSync(filePath)) return ext.replace('.', '').toUpperCase();
  }
  return undefined;
};

const isKnownStaticExt = (sourceExt?: string): boolean => {
  if (!sourceExt) return false;
  const normalized = sourceExt.toUpperCase();
  return normalized === 'JPG' || normalized === 'JPEG' || normalized === 'PNG' || normalized === 'ICO' || normalized === 'AVIF';
};

const countUrlEntries = (urls: ImageQueueItem['urls']): number =>
  (urls.boxArtUrl ? 1 : 0) +
  (urls.bannerUrl ? 1 : 0) +
  (urls.alternativeBannerUrl ? 1 : 0) +
  (urls.logoUrl ? 1 : 0) +
  (urls.heroUrl ? 1 : 0) +
  (urls.iconUrl ? 1 : 0);

export function createImageOptimizationQueue(
  imageCacheService: ImageCacheService,
  gameStore: GameStore,
  _sendStatus?: (status: ImageQueueStatus) => void,
  options?: {
    getOptimizationPerformance?: () => Promise<OptimizationPerformanceProfile | undefined>;
  }
) {
  const staticQueue: ImageQueueItem[] = [];
  const animatedQueue: ImageQueueItem[] = [];
  let processing = false;
  let completed = 0;
  let currentItem: ImageQueueItem | null = null;
  let activeWorkers = 0;
  let queueRunId: string | null = null;
  let cancelling = false;
  let currentProfile: OptimizationPerformanceProfile = 'balanced';
  let maxGameWorkers = 1;
  let availableWorkers = 1;
  let reserveCores = PROFILE_LIMITS.balanced.reserveCores;
  let cpuCount = cpus().length || 2;
  let lastCpuSnapshot: CpuSnapshot | null = null;
  let allStaticComplete = false; // Guard to allow animated processing - starts false, evaluated after items queued
  let startTimeout: ReturnType<typeof setTimeout> | null = null;
  const START_DELAY_MS = 600; // Defer processing so bulk import and UI getLibrary can complete before any optimizer work

  const takeCpuSnapshot = (): CpuSnapshot => {
    const cpuTimes = cpus();
    let idle = 0;
    let total = 0;
    for (const cpu of cpuTimes) {
      idle += cpu.times.idle;
      total += cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
    }
    return { idle, total };
  };

  const getSystemCpuUsage = (): number | undefined => {
    const next = takeCpuSnapshot();
    if (!lastCpuSnapshot) {
      lastCpuSnapshot = next;
      return undefined;
    }
    const idleDiff = next.idle - lastCpuSnapshot.idle;
    const totalDiff = next.total - lastCpuSnapshot.total;
    lastCpuSnapshot = next;
    if (totalDiff <= 0) return undefined;
    const usage = (1 - idleDiff / totalDiff) * 100;
    return Math.max(0, Math.min(100, usage));
  };

  const getQueuedItemsCount = () => staticQueue.length + animatedQueue.length;

  const updateStaticCompletionStatus = () => {
    // Check controller to see if all static items are terminal (done/failed/skipped)
    const status = getControllerStatus();
    if (!queueRunId || status.runId !== queueRunId) return; // No active run
    
    const staticJobs = status.jobs.filter((j) => j.source === 'importer' && isKnownStaticExt(j.sourceExt));
    const staticTerminal = staticJobs.filter((j) => j.phase === 'done' || j.phase === 'failed' || j.phase === 'skipped');
    
    // Mark complete if: no static queue items left AND (no static jobs exist OR all existing static jobs are terminal)
    allStaticComplete = staticQueue.length === 0 && (staticJobs.length === 0 || staticTerminal.length === staticJobs.length);
    if (allStaticComplete) {
      console.log('[ImageOptimizationQueue] All static jobs complete - animated barrier lifted');
    }
  };

  const getQueuedUniqueGamesCount = () => {
    const unique = new Set<string>();
    staticQueue.forEach((item) => unique.add(item.gameId));
    animatedQueue.forEach((item) => unique.add(item.gameId));
    if (currentItem) unique.add(currentItem.gameId);
    return unique.size;
  };

  const shiftNextItem = (): ImageQueueItem | undefined => {
    // Enforce strict barrier: animated items only start after all static jobs globally are complete
    if (staticQueue.length > 0) return staticQueue.shift();
    if (animatedQueue.length > 0) {
      // Before returning animated item, verify all static jobs are in terminal state
      if (allStaticComplete) {
        return animatedQueue.shift();
      }
    }
    return undefined;
  };

  const emitRuntimeMetrics = () => {
    setRuntimeMetrics({
      profile: currentProfile,
      cpuCount,
      reserveCores,
      availableWorkers,
      maxWorkers: maxGameWorkers,
      activeWorkers,
      queuedGames: getQueuedUniqueGamesCount(),
      allStaticComplete,
      systemCpuUsage: getSystemCpuUsage(),
    });
  };

  const refreshWorkerLimits = async () => {
    try {
      const pref = await options?.getOptimizationPerformance?.();
      currentProfile = pref ?? 'balanced';
    } catch {
      currentProfile = 'balanced';
    }

    const profileLimits = PROFILE_LIMITS[currentProfile];
    reserveCores = profileLimits.reserveCores;
    const detectedCores = cpus().length;
    cpuCount = detectedCores > 0 ? detectedCores : 2;
    availableWorkers = Math.max(1, cpuCount - reserveCores);
    const targetWorkers = Math.max(1, Math.floor(availableWorkers * profileLimits.utilization));
    // Cap by core count: never spawn more than 2x available cores to avoid overload
    const coreBasedCap = Math.max(2, Math.min(profileLimits.hardCap, cpuCount * 2));
    maxGameWorkers = Math.max(1, Math.min(coreBasedCap, availableWorkers, targetWorkers));
    // Use half of available workers; Sharp runs in worker thread so main process stays responsive
    const halfWorkers = Math.max(1, Math.floor(availableWorkers / 2));
    maxGameWorkers = Math.min(maxGameWorkers, halfWorkers);
    // Cap at 1 game at a time to avoid native crash under heavy concurrent load (saveGame + cache)
    maxGameWorkers = Math.min(maxGameWorkers, 1);
    emitRuntimeMetrics();
  };

  async function processNext() {
    while (true) {
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue loop top`);
      if (cancelling) {
        emitRuntimeMetrics();
        return;
      }
      if (getQueuedItemsCount() === 0) {
        emitRuntimeMetrics();
        return;
      }

      const item = shiftNextItem();
      if (!item) {
        emitRuntimeMetrics();
        return;
      }
      currentItem = item;
      if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue process gameId=${item.gameId} title=${item.gameTitle?.slice(0, 30)}`);

      try {
        try {
        const cached = await imageCacheService.cacheImages(
          item.urls,
          item.gameId,
          (img) => {
            if (queueRunId && !cancelling) {
              const phase =
                img.phase === 'downloading'
                  ? 'downloading'
                  : img.phase === 'optimizing'
                    ? 'optimizing'
                    : img.phase === 'done'
                      ? 'done'
                      : img.phase === 'skipped'
                        ? 'skipped'
                        : undefined;
              if (phase) {
                updateJobByGameAndType(queueRunId, item.gameId, img.imageType, {
                  phase,
                  fileName: img.fileName,
                  originalBytes: img.originalBytes,
                  optimizedBytes: img.optimizedBytes,
                });
              }
            }
          },
          () => cancelling,
          currentProfile,
          { fromImporterQueue: true }
        );

        if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue cacheImages done gameId=${item.gameId}`);

        if (cancelling) {
          continue;
        }

        if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue getLibrary before saveGame gameId=${item.gameId}`);
        const games = await gameStore.getLibrary();
        const game = games.find((g) => g.id === item.gameId);
        if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue game found=${Boolean(game)} gameId=${item.gameId} librarySize=${games.length}`);
        if (game) {
          if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue saveGame start gameId=${item.gameId}`);
          try {
            const updated: Game = {
              ...game,
              boxArtUrl: cached.boxArtUrl ?? game.boxArtUrl,
              bannerUrl: cached.bannerUrl ?? game.bannerUrl,
              alternativeBannerUrl: cached.alternativeBannerUrl ?? game.alternativeBannerUrl,
              logoUrl: cached.logoUrl ?? game.logoUrl,
              heroUrl: cached.heroUrl ?? game.heroUrl,
              iconUrl: cached.iconUrl ?? game.iconUrl,
            };
            await gameStore.saveGame(updated);
            if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue flushPending start gameId=${item.gameId}`);
            await gameStore.flushPending();
            if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue flushPending done gameId=${item.gameId}`);
            if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue saveGame done gameId=${item.gameId}`);
          } catch (saveErr) {
            const msg = saveErr instanceof Error ? saveErr.message : String(saveErr);
            const stack = saveErr instanceof Error ? saveErr.stack : undefined;
            if (isDebugOptimizationEnabled()) {
              debugOptimizationLog(`queue saveGame throw gameId=${item.gameId} error=${msg}`);
              if (stack) debugOptimizationLog(`queue saveGame stack ${stack.split('\n').slice(0, 8).join(' | ')}`);
            }
            throw saveErr;
          }
        }
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue catch gameId=${item.gameId} error=${errMsg}`);
        if (!cancelling) {
          console.warn('[ImageOptimizationQueue] Failed to cache images for', item.gameId, err);
        }
        if (queueRunId && !cancelling) {
          for (const { type } of imageTypesFromUrls(item.urls)) {
            updateJobByGameAndType(queueRunId, item.gameId, type, {
              phase: 'failed',
              error: errMsg,
            });
          }
        }
      }

        if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue after saveGame block gameId=${item.gameId}`);
        completed++;
        currentItem = null;
        if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue updateStaticCompletionStatus gameId=${item.gameId}`);
        updateStaticCompletionStatus(); // Check if static barrier is now satisfied
        if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue emitRuntimeMetrics gameId=${item.gameId}`);
        emitRuntimeMetrics();

        const queuedCount = getQueuedItemsCount();
        if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue check finish gameId=${item.gameId} queuedCount=${queuedCount} activeWorkers=${activeWorkers}`);
        if (!cancelling && queuedCount === 0 && activeWorkers === 1) {
          if (queueRunId) {
            if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue finishRun gameId=${item.gameId}`);
            finishRun(queueRunId);
            queueRunId = null;
          }
        }
        // Yield so IPC and UI can run; prevents main-thread starvation
        if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue setImmediate yield gameId=${item.gameId}`);
        await new Promise<void>((resolve) => setImmediate(resolve));
        if (isDebugOptimizationEnabled()) debugOptimizationLog(`queue loop next gameId=${item.gameId}`);
      } catch (loopErr) {
        // Top-level catch so release build never crashes out of the loop (e.g. from emitRuntimeMetrics)
        currentItem = null;
        completed++;
        if (!cancelling) {
          console.warn('[ImageOptimizationQueue] Loop error:', loopErr);
        }
        if (item && queueRunId && !cancelling) {
          for (const { type } of imageTypesFromUrls(item.urls)) {
            updateJobByGameAndType(queueRunId, item.gameId, type, {
              phase: 'failed',
              error: loopErr instanceof Error ? loopErr.message : String(loopErr),
            });
          }
        }
        emitRuntimeMetrics();
      }
    }
  }

  async function scheduleWorkers() {
    try {
      await refreshWorkerLimits();
      if (processing && activeWorkers >= maxGameWorkers) return;
      processing = true;
      while (activeWorkers < maxGameWorkers && getQueuedItemsCount() > 0) {
        activeWorkers++;
        emitRuntimeMetrics();
        processNext()
          .catch((err) => {
            console.warn('[ImageOptimizationQueue] Worker error:', err);
          })
          .finally(() => {
            activeWorkers--;
            emitRuntimeMetrics();
            if (getQueuedItemsCount() === 0 && activeWorkers === 0) {
              processing = false;
              currentItem = null;
              if (queueRunId) {
                finishRun(queueRunId);
                queueRunId = null;
              }
            } else if (getQueuedItemsCount() > 0) {
              void scheduleWorkers();
            }
          });
      }
    } catch (err) {
      console.warn('[ImageOptimizationQueue] scheduleWorkers error:', err);
      processing = false;
      emitRuntimeMetrics();
    }
  }

  function add(gameId: string, gameTitle: string, urls: ImageQueueItem['urls']) {
    if (cancelling) return;
    const runId = getCurrentRunId() ?? startRun('importer');
    if (!queueRunId) {
      allStaticComplete = false;
    }
    queueRunId = queueRunId ?? runId;
    const cacheDir = imageCacheService.getCacheDir();
    const entries = imageTypesFromUrls(urls).map(({ type, url }) => ({
      type,
      url,
      sourceExt: sourceExtFromUrl(url) ?? inferSourceExtFromCache(cacheDir, gameId, type),
    }));

    const staticUrls: ImageQueueItem['urls'] = {};
    const deferredUrls: ImageQueueItem['urls'] = {};
    const assignUrl = (target: ImageQueueItem['urls'], imageType: string, value: string) => {
      if (imageType === 'boxart') target.boxArtUrl = value;
      else if (imageType === 'banner') target.bannerUrl = value;
      else if (imageType === 'alternativeBanner') target.alternativeBannerUrl = value;
      else if (imageType === 'logo') target.logoUrl = value;
      else if (imageType === 'hero') target.heroUrl = value;
      else if (imageType === 'icon') target.iconUrl = value;
    };

    for (const entry of entries) {
      if (isKnownStaticExt(entry.sourceExt)) assignUrl(staticUrls, entry.type, entry.url);
      else assignUrl(deferredUrls, entry.type, entry.url);
    }

    const newJobs = entries.map(({ type, sourceExt }) => ({
      jobId: `${gameId}:${type}`,
      gameId,
      gameTitle,
      imageType: type,
      source: 'importer' as const,
      phase: 'queued' as const,
      sourceExt,
    }));
    addJobs(runId, newJobs);
    if (countUrlEntries(staticUrls) > 0) {
      staticQueue.push({ gameId, gameTitle, phase: 'static', urls: staticUrls });
    }
    if (countUrlEntries(deferredUrls) > 0) {
      animatedQueue.push({ gameId, gameTitle, phase: 'animated', urls: deferredUrls });
    }
    updateStaticCompletionStatus(); // Evaluate initial barrier state after queueing items
    emitRuntimeMetrics();
    // Debounce start so bulk import can complete and UI getLibrary can run before we block main thread
    if (startTimeout) clearTimeout(startTimeout);
    startTimeout = setTimeout(() => {
      startTimeout = null;
      void scheduleWorkers();
    }, START_DELAY_MS);
  }

  function getStatus(): ImageQueueStatus {
    const status = getControllerStatus();
    return {
      queued: getQueuedItemsCount(),
      completed,
      imagesQueued: status.imagesQueued,
      imagesCompleted: status.imagesDone,
      imageJobs: status.jobs,
    };
  }

  function cancelAll() {
    cancelling = true;
    if (startTimeout) {
      clearTimeout(startTimeout);
      startTimeout = null;
    }
    staticQueue.length = 0;
    animatedQueue.length = 0;
    allStaticComplete = false;
    processing = false;
    currentItem = null;
    if (queueRunId) {
      finishRun(queueRunId);
      queueRunId = null;
    }
    emitRuntimeMetrics();
  }

  return {
    add,
    cancelAll,
    getStatus,
    get queued() {
      return getQueuedItemsCount();
    },
    get completedCount() {
      return completed;
    },
  };
}
