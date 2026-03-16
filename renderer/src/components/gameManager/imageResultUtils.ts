import {
  matchesAnimationFilter,
  normalizeProviderName,
  type ProviderName,
} from './imageSearchUtils';

export type ImageSearchTab = 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon';
type OrderedImageType = 'boxart' | 'banner' | 'logo' | 'icon';

export interface OrderedResultsByType {
  boxart: any[];
  banner: any[];
  logo: any[];
  icon: any[];
}

interface SteamGridDbResultsLike {
  boxart: any[];
  banner: any[];
  alternativeBanner: any[];
  logo: any[];
  icon: any[];
}

type RenderableImageUrlGetter = (value?: string) => string | undefined;

function matchesNamedProvider(source: string | undefined, providerName: string): boolean {
  const normalized = normalizeProviderName(source || '') as ProviderName | string;
  if (normalized === providerName) return true;

  const raw = (source || '').toLowerCase();
  if (providerName === 'Steam Store API') return raw === 'steam';
  if (providerName === 'SteamGridDB') return raw === 'steamgriddb';
  if (providerName === 'IGDB') return raw.includes('igdb');
  if (providerName === 'RAWG') return raw.includes('rawg');
  if (providerName === 'Giant Bomb') return raw.includes('giantbomb');
  if (providerName === 'Web Search') return raw.includes('web');
  return false;
}

export function matchesProviderFilter(source: string | undefined, providerFilter: 'all' | ProviderName): boolean {
  if (providerFilter === 'all') return true;
  return matchesNamedProvider(source, providerFilter);
}

export function buildOrderedResultsByType(
  imageSearchResults: any[],
  steamGridDBResults: SteamGridDbResultsLike,
  getRenderableImageUrl: RenderableImageUrlGetter,
): OrderedResultsByType {
  type OrderedEntry = { item: any; type: OrderedImageType; order: number; key: string };

  const entries: OrderedEntry[] = [];
  let fallbackOrder = 1000000;
  const toOrder = (value: unknown) => (typeof value === 'number' ? value : fallbackOrder++);

  const pushDirect = (item: any, type: OrderedImageType, urlCandidate: string | undefined) => {
    const normalizedUrl = getRenderableImageUrl(urlCandidate);
    if (!normalizedUrl || !matchesAnimationFilter(normalizedUrl, item)) return;

    const source = item.source || '';
    entries.push({
      item,
      type,
      order: toOrder(item?.foundOrder),
      key: `${normalizedUrl}|${source}|${type}`,
    });
  };

  imageSearchResults.forEach((item) => {
    pushDirect(item, 'boxart', item.boxArtUrl || item.coverUrl);
    pushDirect(item, 'banner', item.bannerUrl || item.screenshotUrls?.[0]);
    pushDirect(item, 'logo', item.logoUrl);
    pushDirect(item, 'icon', item.iconUrl);
  });

  steamGridDBResults.boxart.forEach((item) => {
    const normalizedUrl = getRenderableImageUrl(item.url || item.boxArtUrl || item.coverUrl);
    if (!normalizedUrl || !matchesAnimationFilter(normalizedUrl, item)) return;

    const mapped = { ...item, boxArtUrl: normalizedUrl, coverUrl: normalizedUrl, source: item.source || 'SteamGridDB' };
    entries.push({ item: mapped, type: 'boxart', order: toOrder(item?.foundOrder), key: `${normalizedUrl}|${mapped.source}|boxart` });
  });

  steamGridDBResults.banner.forEach((item) => {
    const normalizedUrl = getRenderableImageUrl(item.url || item.bannerUrl);
    if (!normalizedUrl || !matchesAnimationFilter(normalizedUrl, item)) return;

    const mapped = { ...item, bannerUrl: normalizedUrl, screenshotUrls: [normalizedUrl], source: item.source || 'SteamGridDB' };
    entries.push({ item: mapped, type: 'banner', order: toOrder(item?.foundOrder), key: `${normalizedUrl}|${mapped.source}|banner` });
  });

  steamGridDBResults.logo.forEach((item) => {
    const normalizedUrl = getRenderableImageUrl(item.url || item.logoUrl);
    if (!normalizedUrl || !matchesAnimationFilter(normalizedUrl, item)) return;

    const mapped = { ...item, logoUrl: normalizedUrl, source: item.source || 'SteamGridDB' };
    entries.push({ item: mapped, type: 'logo', order: toOrder(item?.foundOrder), key: `${normalizedUrl}|${mapped.source}|logo` });
  });

  steamGridDBResults.icon.forEach((item) => {
    const normalizedUrl = getRenderableImageUrl(item.url || item.iconUrl);
    if (!normalizedUrl || !matchesAnimationFilter(normalizedUrl, item)) return;

    const mapped = { ...item, iconUrl: normalizedUrl, source: item.source || 'SteamGridDB' };
    entries.push({ item: mapped, type: 'icon', order: toOrder(item?.foundOrder), key: `${normalizedUrl}|${mapped.source}|icon` });
  });

  entries.sort((a, b) => a.order - b.order);

  const seen = new Set<string>();
  const result: OrderedResultsByType = { boxart: [], banner: [], logo: [], icon: [] };

  entries.forEach((entry) => {
    if (seen.has(entry.key)) return;
    seen.add(entry.key);
    result[entry.type].push(entry.item);
  });

  return result;
}

export function getImageResultCountForTab(
  orderedResultsByType: OrderedResultsByType,
  providerFilter: 'all' | ProviderName,
  tab: ImageSearchTab,
): number {
  if (tab === 'boxart') return orderedResultsByType.boxart.filter((item) => matchesProviderFilter(item.source, providerFilter)).length;
  if (tab === 'banner' || tab === 'alternativeBanner') return orderedResultsByType.banner.filter((item) => matchesProviderFilter(item.source, providerFilter)).length;
  if (tab === 'logo') return orderedResultsByType.logo.filter((item) => matchesProviderFilter(item.source, providerFilter)).length;
  return orderedResultsByType.icon.filter((item) => matchesProviderFilter(item.source, providerFilter)).length;
}

export function hasAnyVisibleImageResults(
  orderedResultsByType: OrderedResultsByType,
  providerFilter: 'all' | ProviderName,
): boolean {
  return (
    getImageResultCountForTab(orderedResultsByType, providerFilter, 'boxart') +
    getImageResultCountForTab(orderedResultsByType, providerFilter, 'banner') +
    getImageResultCountForTab(orderedResultsByType, providerFilter, 'logo') +
    getImageResultCountForTab(orderedResultsByType, providerFilter, 'icon')
  ) > 0;
}

export function hasAnyRawImageResults(
  imageSearchResults: any[],
  steamGridDBResults: SteamGridDbResultsLike,
): boolean {
  return (
    imageSearchResults.length > 0 ||
    steamGridDBResults.boxart.length > 0 ||
    steamGridDBResults.banner.length > 0 ||
    steamGridDBResults.alternativeBanner.length > 0 ||
    steamGridDBResults.logo.length > 0 ||
    steamGridDBResults.icon.length > 0
  );
}

export function getImageCountForProvider(
  orderedResultsByType: OrderedResultsByType,
  providerName: string,
): number {
  return [
    ...orderedResultsByType.boxart,
    ...orderedResultsByType.banner,
    ...orderedResultsByType.logo,
    ...orderedResultsByType.icon,
  ].filter((item) => matchesNamedProvider(item.source, providerName)).length;
}
