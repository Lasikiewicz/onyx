import { normalizeProviderName, type ProviderName } from './imageSearchUtils';

export interface ProviderProgressEntry {
  name: string;
  status: 'completed' | 'processing' | 'noApi';
}

export function buildProviderProgress(
  orderedProviders: ProviderName[],
  providerAvailability: Partial<Record<ProviderName, boolean>>,
  options?: {
    useWeb?: boolean;
    steamAppId?: string;
    effectiveImageType?: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon';
    markAllSearchable?: boolean;
  },
): ProviderProgressEntry[] {
  const useWeb = options?.useWeb ?? false;
  const markAllSearchable = options?.markAllSearchable ?? false;

  return orderedProviders.reduce<ProviderProgressEntry[]>((entries, name) => {
    if (name === 'Web Search' && !useWeb) {
      return entries;
    }

    const available = providerAvailability[name] ?? true;
    if (!available) {
      entries.push({ name, status: 'noApi' });
      return entries;
    }

    const needsSearch = markAllSearchable
      ? true
      : name === 'Steam Store API'
        ? !!options?.steamAppId
        : name === 'SteamGridDB'
          ? true
          : name === 'IGDB'
            ? (options?.effectiveImageType === 'boxart' || options?.effectiveImageType === 'banner')
            : name === 'RAWG'
              ? true
              : name === 'Giant Bomb'
              ? true
              : true;

    entries.push({ name, status: needsSearch ? 'processing' : 'completed' });
    return entries;
  }, []);
}

export function markProviderCompleted(
  providerProgress: ProviderProgressEntry[],
  providerName: ProviderName,
): ProviderProgressEntry[] {
  return providerProgress.map((provider) =>
    provider.name === providerName && provider.status === 'processing'
      ? { ...provider, status: 'completed' as const }
      : provider
  );
}

export function markAllProvidersCompleted(
  providerProgress: ProviderProgressEntry[],
): ProviderProgressEntry[] {
  return providerProgress.map((provider) => (
    provider.status === 'noApi' ? provider : { ...provider, status: 'completed' as const }
  ));
}

export function updateProviderProgressFromEvent(
  providerProgress: ProviderProgressEntry[],
  currentProviderRaw: string,
  remainingProviderRaws: string[],
): ProviderProgressEntry[] {
  const currentProvider = normalizeProviderName(currentProviderRaw);
  const remainingProviders = remainingProviderRaws.map((provider) => normalizeProviderName(provider));
  const order = [...new Set([...providerProgress.map((item) => item.name), currentProvider, ...remainingProviders])];

  return order.map((name) => ({
    name,
    status: (name === currentProvider || remainingProviders.includes(name)) ? 'processing' : 'completed',
  }));
}
