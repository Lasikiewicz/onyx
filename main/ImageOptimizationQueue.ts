import type { ImageCacheService } from './ImageCacheService.js';
import type { GameStore, Game } from './GameStore.js';

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

export interface ImageQueueStatus {
  queued: number;
  completed: number;
  currentGameTitle?: string;
  imageIndex?: number;
  imageTotal?: number;
  imageType?: string;
  phase?: string;
}

type SendStatus = (status: ImageQueueStatus) => void;

export function createImageOptimizationQueue(
  imageCacheService: ImageCacheService,
  gameStore: GameStore,
  sendStatus: SendStatus
) {
  const queue: ImageQueueItem[] = [];
  let processing = false;
  let completed = 0;
  let currentItem: ImageQueueItem | null = null;

  function emit() {
    sendStatus({
      queued: queue.length,
      completed,
      ...(processing && currentItem ? { currentGameTitle: currentItem.gameTitle } : {}),
    });
  }

  function emitWithImageProgress(item: ImageQueueStatus) {
    sendStatus({
      queued: queue.length,
      completed,
      currentGameTitle: item.currentGameTitle,
      imageIndex: item.imageIndex,
      imageTotal: item.imageTotal,
      imageType: item.imageType,
      phase: item.phase,
    });
  }

  async function processNext() {
    if (queue.length === 0) {
      processing = false;
      currentItem = null;
      emit();
      return;
    }
    processing = true;
    const item = queue.shift()!;
    currentItem = item;
    emit();

    try {
      const cached = await imageCacheService.cacheImages(
        item.urls,
        item.gameId,
        (img) => {
          emitWithImageProgress({
            queued: queue.length,
            completed,
            currentGameTitle: item.gameTitle,
            imageIndex: img.index,
            imageTotal: img.total,
            imageType: img.imageType,
            phase: img.phase,
          });
        }
      );

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
      console.warn('[ImageOptimizationQueue] Failed to cache images for', item.gameId, err);
    }

    completed++;
    currentItem = null;
    emit();
    if (queue.length > 0) {
      setImmediate(() => processNext());
    } else {
      processing = false;
    }
  }

  function add(gameId: string, gameTitle: string, urls: ImageQueueItem['urls']) {
    queue.push({ gameId, gameTitle, urls });
    emit();
    if (!processing) {
      processNext();
    }
  }

  function getStatus(): ImageQueueStatus {
    return {
      queued: queue.length,
      completed,
      ...(processing && currentItem ? { currentGameTitle: currentItem.gameTitle } : {}),
    };
  }

  return { add, getStatus, get queued() { return queue.length; }, get completedCount() { return completed; } };
}
