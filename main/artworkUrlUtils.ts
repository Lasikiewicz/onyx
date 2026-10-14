import type { Game } from './GameStore.js';

export const ARTWORK_URL_FIELDS = [
  'boxArtUrl',
  'bannerUrl',
  'alternativeBannerUrl',
  'logoUrl',
  'heroUrl',
  'iconUrl',
] as const satisfies ReadonlyArray<keyof Game>;

export type ArtworkUrlField = typeof ARTWORK_URL_FIELDS[number];

/**
 * Remove the app's own cache-busting suffix from an artwork URL.
 *
 * Local URLs (onyx-local, file) lose their whole query and fragment, because the query is only
 * ever a cache-buster there. Remote http(s) URLs keep every query parameter except the app's own
 * `t` cache-buster, because a signed CDN URL needs its other parameters to load (A15). The fragment
 * is never sent to a server, so it is always removed.
 */
export function stripTransientUrlSuffix(url?: string): string | undefined {
  if (url === undefined) return url;

  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const withoutFragment = trimmed.split('#')[0];
  const queryIndex = withoutFragment.indexOf('?');
  if (queryIndex === -1) return withoutFragment;

  const base = withoutFragment.slice(0, queryIndex);
  const lower = trimmed.toLowerCase();
  const isRemote = lower.startsWith('http://') || lower.startsWith('https://');
  if (!isRemote) return base;

  const kept = withoutFragment
    .slice(queryIndex + 1)
    .split('&')
    .filter((part) => part !== '' && part.split('=')[0] !== 't');

  return kept.length > 0 ? `${base}?${kept.join('&')}` : base;
}

export function normalizeOnyxLocalUrl(url?: string): string | undefined {
  const normalized = stripTransientUrlSuffix(url);
  if (!normalized?.startsWith('onyx-local://')) {
    return normalized;
  }

  return normalized.replace(/\/+$/, '');
}

export function sanitizeGameArtworkUrls(game: Game): Game {
  const sanitizedGame = { ...game };
  const artworkFields = sanitizedGame as unknown as Record<ArtworkUrlField, string | undefined>;

  for (const field of ARTWORK_URL_FIELDS) {
    const normalizedValue = stripTransientUrlSuffix(game[field]);
    artworkFields[field] = (field === 'boxArtUrl' || field === 'bannerUrl')
      ? normalizedValue || ''
      : normalizedValue;
  }

  return sanitizedGame;
}

export function parseOnyxLocalAssetUrl(url?: string): { gameId: string; imageType: string } | null {
  const normalized = normalizeOnyxLocalUrl(url);
  if (!normalized?.startsWith('onyx-local://')) {
    return null;
  }

  const urlPath = normalized.replace(/^onyx-local:\/\/\/?/, '');
  const match = urlPath.match(/^([^-]+(?:-[^-]+)*?)-(boxart|banner|alternativebanner|alternativeBanner|logo|hero|icon|screenshot-\d+)$/i);
  if (!match) {
    return null;
  }

  const rawType = match[2].toLowerCase();
  return {
    gameId: match[1],
    imageType: rawType === 'alternativebanner' ? 'alternativeBanner' : rawType,
  };
}