import type { ProviderName } from './imageSearchUtils';
import type { ProviderProgressEntry } from './providerProgressUtils';

interface ProviderStatusRowProps {
  providerProgress: ProviderProgressEntry[];
  providerFilter: 'all' | ProviderName;
  onFilterChange: (provider: 'all' | ProviderName) => void;
  getImageCountForProvider: (providerName: string) => number;
  className?: string;
}

export function ProviderStatusRow({
  providerProgress,
  providerFilter,
  onFilterChange,
  getImageCountForProvider,
  className = '',
}: ProviderStatusRowProps) {
  if (providerProgress.length === 0) return null;

  return (
    <div className={`flex flex-wrap items-center gap-2 gap-y-1 text-xs ${className}`} role="status" aria-live="polite">
      <button
        type="button"
        onClick={() => onFilterChange('all')}
        className={`px-2.5 py-1 rounded border transition-colors ${providerFilter === 'all'
          ? 'bg-green-600/30 border-green-500 text-green-300 font-medium'
          : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-500 hover:text-white'
          }`}
        aria-pressed={providerFilter === 'all'}
        aria-label="Show images from all providers"
      >
        All
      </button>
      {providerProgress.map((provider) => {
        const isSelected = providerFilter === provider.name;
        const label =
          provider.status === 'noApi'
            ? `${provider.name} = No API`
            : provider.status === 'completed'
              ? `${provider.name} = ${getImageCountForProvider(provider.name)}`
              : `${provider.name} = Searching`;

        return (
          <button
            key={provider.name}
            type="button"
            onClick={() => onFilterChange(provider.name as ProviderName)}
            disabled={provider.status === 'noApi'}
            className={`px-2.5 py-1 rounded border transition-colors ${provider.status === 'noApi'
              ? 'bg-gray-800/50 border-gray-700 text-gray-500 cursor-default'
              : isSelected
                ? 'bg-green-600/30 border-green-500 text-green-300 font-medium'
                : provider.status === 'completed'
                  ? 'bg-gray-800 border-gray-600 text-green-400 hover:border-gray-500 hover:text-white'
                  : 'bg-gray-800 border-gray-600 text-amber-400 animate-pulse hover:border-amber-500'
              }`}
            aria-pressed={isSelected}
            aria-label={provider.status === 'noApi' ? `${provider.name}: API not configured` : `Filter by ${provider.name}`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
