import { Game } from '../types/game';

const warmedAssets = new Set<string>();

const isWebmUrl = (url?: string) => !!url && /\.webm(\?|$)/i.test(url);

const normalizeUrl = (url?: string | null) => (url || '').trim();

export const prefetchImage = (url?: string | null) => {
  const normalized = normalizeUrl(url);
  if (!normalized || isWebmUrl(normalized) || warmedAssets.has(normalized)) return;

  warmedAssets.add(normalized);
  const img = new Image();
  img.decoding = 'async';
  img.src = normalized;
};

export const prefetchVideo = (url?: string | null) => {
  const normalized = normalizeUrl(url);
  if (!normalized || !isWebmUrl(normalized) || warmedAssets.has(normalized)) return;

  warmedAssets.add(normalized);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.src = normalized;
};

export const prefetchUrl = (url?: string | null, isVideo = false) => {
  if (isVideo) {
    prefetchVideo(url);
  } else {
    prefetchImage(url);
  }
};

export const prefetchGameArtwork = (game: Game, includeLogo = true) => {
  prefetchUrl(game.boxArtUrl, !!game.boxArtIsVideo);
  prefetchUrl(game.bannerUrl, !!game.bannerIsVideo);

  if (includeLogo) {
    prefetchUrl(game.logoUrl, !!game.logoIsVideo);
  }
};
