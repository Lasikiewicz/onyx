import { Game } from '../types/game';

/**
 * Bounded LRU of already-warmed asset URLs.
 *
 * This used to be an unbounded Set that lived for the whole process. With cache-busted
 * artwork URLs a long session (scans, imports, metadata refreshes) keeps minting new URLs,
 * so the Set only ever grew. A cap costs at worst a redundant prefetch of an evicted URL —
 * which the HTTP/protocol cache absorbs anyway.
 */
const MAX_WARMED_ASSETS = 600;
const warmedAssets = new Set<string>();

const markWarmed = (url: string) => {
  // Set preserves insertion order, so the first key is the least recently added.
  if (warmedAssets.size >= MAX_WARMED_ASSETS) {
    const oldest = warmedAssets.values().next().value;
    if (oldest !== undefined) warmedAssets.delete(oldest);
  }
  warmedAssets.add(url);
};

const isWebmUrl = (url?: string) => !!url && /\.webm(\?|$)/i.test(url);

const normalizeUrl = (url?: string | null) => (url || '').trim();

export const prefetchImage = (url?: string | null) => {
  const normalized = normalizeUrl(url);
  if (!normalized || isWebmUrl(normalized) || warmedAssets.has(normalized)) return;

  markWarmed(normalized);
  const img = new Image();
  img.decoding = 'async';
  img.src = normalized;
};

export const prefetchVideo = (url?: string | null) => {
  const normalized = normalizeUrl(url);
  if (!normalized || !isWebmUrl(normalized) || warmedAssets.has(normalized)) return;

  markWarmed(normalized);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.src = normalized;

  // The element is detached and dropped on the next line, but the media load it started keeps
  // the decoder and its buffers alive until the element is collected. Releasing the source
  // once metadata has arrived (or the load failed) tears that down deterministically.
  const release = () => {
    video.onloadedmetadata = null;
    video.onerror = null;
    video.removeAttribute('src');
    video.load();
  };
  video.onloadedmetadata = release;
  video.onerror = release;
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
