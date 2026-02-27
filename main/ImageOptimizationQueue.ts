import type { ImageCacheService } from './ImageCacheService.js';
import type { GameStore, Game } from './GameStore.js';
import type { ImageJobStatus } from './ImageOptimizationController.js';
import {
  getCurrentRunId,
  startRun,
  addJobs,
  updateJobByGameAndType,
  finishRun,
  getStatus as getControllerStatus,
} from './ImageOptimizationController.js';
import { cpus } from 'node:os';
import path from 'node:path';

type OptimizationPerformanceProfile = 'low' | 'balanced' | 'high';

const PROFILE_LIMITS: Record<OptimizationPerformanceProfile, { reserveCores: number; maxQueueWorkers: number }> = {
  low: { reserveCores: 4, maxQueueWorkers: 1 },
  balanced: { reserveCores: 2, maxQueueWorkers: 2 },
  high: { reserveCores: 1, maxQueueWorkers: 2 },
};

export interface ImageQueueItem {
  gameId: string;
  gameTitle: string;
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

export function createImageOptimizationQueue(
  imageCacheService: ImageCacheService,
  gameStore: GameStore,
  _sendStatus?: (status: ImageQueueStatus) => void,
  options?: {
    getOptimizationPerformance?: () => Promise<OptimizationPerformanceProfile | undefined>;
  }
) {
  const queue: ImageQueueItem[] = [];
  let processing = false;
  let completed = 0;
  let currentItem: ImageQueueItem | null = null;
  let activeWorkers = 0;
  let queueRunId: string | null = null;
  let cancelling = false;
  let currentProfile: OptimizationPerformanceProfile = 'balanced';
  let maxGameWorkers = 1;

  const refreshWorkerLimits = async () => {
    try {
      const pref = await options?.getOptimizationPerformance?.();
      currentProfile = pref ?? 'balanced';
    } catch {
      currentProfile = 'balanced';
    }

    const { reserveCores, maxQueueWorkers } = PROFILE_LIMITS[currentProfile];
    const cpuCount = cpus().length || 2;
    const availableWorkers = Math.max(1, cpuCount - reserveCores);
    maxGameWorkers = Math.max(1, Math.min(maxQueueWorkers, availableWorkers));
  };

  async function processNext() {
    while (true) {
      if (cancelling) {
        return;
      }
      if (queue.length === 0) {
        return;
      }

      const item = queue.shift()!;
      currentItem = item;

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
          currentProfile
        );

        if (cancelling) {
          continue;
        }

        const games = await gameStore.getLibrary();
        const game = games.find((g) => g.id === item.gameId);
        if (game) {
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
        }
      } catch (err) {
        if (!cancelling) {
          console.warn('[ImageOptimizationQueue] Failed to cache images for', item.gameId, err);
        }
        if (queueRunId && !cancelling) {
          for (const { type } of imageTypesFromUrls(item.urls)) {
            updateJobByGameAndType(queueRunId, item.gameId, type, {
              phase: 'failed',
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }

      completed++;
      currentItem = null;

      if (!cancelling && queue.length === 0 && activeWorkers === 1) {
        if (queueRunId) {
          finishRun(queueRunId);
          queueRunId = null;
        }
      }
    }
  }

  async function scheduleWorkers() {
    await refreshWorkerLimits();
    if (processing && activeWorkers >= maxGameWorkers) return;
    processing = true;
    while (activeWorkers < maxGameWorkers && queue.length > 0) {
      activeWorkers++;
      processNext()
        .catch((err) => {
          console.warn('[ImageOptimizationQueue] Worker error:', err);
        })
        .finally(() => {
          activeWorkers--;
          if (queue.length === 0 && activeWorkers === 0) {
            processing = false;
            currentItem = null;
            if (queueRunId) {
              finishRun(queueRunId);
              queueRunId = null;
            }
          } else if (queue.length > 0) {
            void scheduleWorkers();
          }
        });
    }
  }

  function add(gameId: string, gameTitle: string, urls: ImageQueueItem['urls']) {
    if (cancelling) return;
    const runId = getCurrentRunId() ?? startRun('importer');
    queueRunId = queueRunId ?? runId;
    const entries = imageTypesFromUrls(urls);
    const newJobs = entries.map(({ type, url }) => ({
      jobId: `${gameId}:${type}`,
      gameId,
      gameTitle,
      imageType: type,
      source: 'importer' as const,
      phase: 'queued' as const,
      sourceExt: sourceExtFromUrl(url),
    }));
    addJobs(runId, newJobs);
    queue.push({ gameId, gameTitle, urls });
    void scheduleWorkers();
  }

  function getStatus(): ImageQueueStatus {
    const status = getControllerStatus();
    return {
      queued: queue.length,
      completed,
      imagesQueued: status.imagesQueued,
      imagesCompleted: status.imagesDone,
      imageJobs: status.jobs,
    };
  }

  function cancelAll() {
    cancelling = true;
    queue.length = 0;
    processing = false;
    currentItem = null;
    if (queueRunId) {
      finishRun(queueRunId);
      queueRunId = null;
    }
  }

  return {
    add,
    cancelAll,
    getStatus,
    get queued() {
      return queue.length;
    },
    get completedCount() {
      return completed;
    },
  };
}
