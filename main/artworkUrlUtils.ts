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

export function stripTransientUrlSuffix(url?: string): string | undefined {
  if (url === undefined) return url;

  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  const queryIndex = trimmed.indexOf('?');
  const hashIndex = trimmed.indexOf('#');
  const cutIndex =
    queryIndex === -1
      ? hashIndex
      : hashIndex === -1
        ? queryIndex
        : Math.min(queryIndex, hashIndex);

  return cutIndex === -1 ? trimmed : trimmed.slice(0, cutIndex);
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