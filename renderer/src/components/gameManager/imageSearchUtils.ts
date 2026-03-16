export type ProviderName =
  | 'Steam Store API'
  | 'SteamGridDB'
  | 'IGDB'
  | 'RAWG'
  | 'Giant Bomb'
  | 'Web Search';

export interface ImageSearchResultLike {
  mime?: string;
  isAnimated?: boolean;
  animated?: boolean;
  is_animated?: boolean;
  notes?: string;
}

export function normalizeImageUrl(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const lower = trimmed.toLowerCase();
  if (lower === 'null' || lower === 'undefined' || lower === 'n/a') return undefined;
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (
    lower.startsWith('https://') ||
    lower.startsWith('http://') ||
    lower.startsWith('data:') ||
    lower.startsWith('blob:') ||
    lower.startsWith('file://') ||
    lower.startsWith('onyx-local://')
  ) {
    return trimmed;
  }
  return undefined;
}

export function isAnimatedAssetUrl(url?: string): boolean {
  return !!url && /\.(gif|webp|apng)(\?|$)/i.test(url);
}

export function isWebmAssetUrl(url?: string): boolean {
  return !!url && /\.webm(\?|$)/i.test(url);
}

export function isAnimatedAsset(url?: string, image?: ImageSearchResultLike): boolean {
  if (!url && !image) return false;
  const mime = (image?.mime || '').toLowerCase();
  const notes = (image?.notes || '').toLowerCase();
  const explicitAnimated = image?.isAnimated === true || image?.animated === true || image?.is_animated === true;

  if (explicitAnimated) return true;
  if (mime.includes('image/apng') || mime.includes('image/gif') || mime.includes('image/webp')) return true;
  if (mime === 'image/png' && /\banimat(ed|ion)\b/i.test(notes)) return true;
  return isAnimatedAssetUrl(url);
}

export function normalizeProviderName(provider: string): ProviderName | string {
  const key = provider.toLowerCase();
  if (key.includes('steam store') || key.includes('auto-match') || key === 'steam') return 'Steam Store API';
  if (key.includes('steamgriddb') || key.includes('steam grid')) return 'SteamGridDB';
  if (key.includes('igdb')) return 'IGDB';
  if (key.includes('rawg')) return 'RAWG';
  if (key.includes('giantbomb') || key.includes('giant bomb')) return 'Giant Bomb';
  if (key.includes('web')) return 'Web Search';
  return provider;
}

export function matchesAnimationFilter(url?: string, image?: ImageSearchResultLike): boolean {
  if (!url && !image) return false;
  // Completely hide animated assets (webp/gif/apng) from search results;
  // WEBM uploads are handled via explicit "Upload WEBM" flow instead.
  return !isAnimatedAsset(url, image);
}
