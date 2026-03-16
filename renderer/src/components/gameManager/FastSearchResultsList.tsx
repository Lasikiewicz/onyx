interface FastSearchGameLike {
  id: number;
  name: string;
  coverUrl: string;
  bannerUrl: string;
  logoUrl: string;
  screenshotUrls: string[];
  steamAppId?: string;
  releaseDate?: number;
  source: string;
}

interface FastSearchResultsListProps {
  fastSearchResults: FastSearchGameLike[];
  selectedFastGameId: number | null;
  onSelectGame: (game: FastSearchGameLike) => void;
  onClear: () => void;
  onImageLoadError: (url: string | undefined, event: React.SyntheticEvent<HTMLImageElement>) => void;
}

export function FastSearchResultsList({
  fastSearchResults,
  selectedFastGameId,
  onSelectGame,
  onClear,
  onImageLoadError,
}: FastSearchResultsListProps) {
  if (fastSearchResults.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-300">
          <span className="text-green-400">⚡</span> Quick Results - Click to see images:
        </h4>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-gray-400 hover:text-white"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-1">
        {fastSearchResults.map((game) => (
          <button
            key={game.id}
            type="button"
            onClick={() => onSelectGame(game)}
            className={`flex items-center gap-3 p-2 rounded-lg border transition-all hover:bg-gray-800 text-left ${selectedFastGameId === game.id
              ? 'border-green-500 bg-green-900/10'
              : 'border-gray-700 bg-gray-800/50 hover:border-gray-500'
              }`}
          >
            <div className="w-10 h-14 bg-gray-800 flex-shrink-0 rounded overflow-hidden">
              {game.coverUrl ? (
                <img
                  src={game.coverUrl}
                  alt={game.name}
                  className="w-full h-full object-cover"
                  onError={(event) => {
                    onImageLoadError(game.coverUrl, event);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600">
                  <svg className="w-4 h-4 group- hover:animate-edit-image group-hover:animate-edit-image" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-white truncate">{game.name}</div>
              <div className="text-xs text-gray-400">
                {game.releaseDate ? new Date(game.releaseDate * 1000).getFullYear() : 'Unknown Year'} • {game.source || 'Unknown Source'}
              </div>
            </div>
            <div className="text-xs px-2 py-1 bg-gray-700 rounded text-gray-300 group-hover:bg-green-600 group-hover:text-white transition-colors">
              Select
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
