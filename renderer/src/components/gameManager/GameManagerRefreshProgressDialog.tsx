interface RefreshProgressState {
  current: number;
  total: number;
  message: string;
  gameTitle?: string;
  links?: Array<{ name: string; url: string }>;
  images?: string[];
  mode?: 'all' | 'missing' | 'links';
}

interface GameManagerRefreshProgressDialogProps {
  refreshProgress: RefreshProgressState | null;
  isCancellingRefresh: boolean;
  onCancelRefresh: () => void;
  onClose: () => void;
}

export function GameManagerRefreshProgressDialog({
  refreshProgress,
  isCancellingRefresh,
  onCancelRefresh,
  onClose,
}: GameManagerRefreshProgressDialogProps) {
  if (!refreshProgress) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center"
      style={{
        pointerEvents: refreshProgress.message?.includes('Reloading') ? 'none' : 'auto',
        transition: 'opacity 0.3s ease-out',
      }}
    >
      <div className={`bg-gray-800 rounded-lg shadow-xl border ${refreshProgress.mode === 'links' ? 'border-purple-500/50' : 'border-gray-700'} w-full max-w-md p-6 overflow-hidden`}>
        <div className="flex items-center gap-3 mb-4">
          {refreshProgress.mode === 'links' ? (
            <div className="w-8 h-8 rounded-lg bg-purple-600/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
          )}
          <h3 className="text-xl font-semibold text-white">
            {refreshProgress.mode === 'links' ? 'Refreshing Links' : 'Refreshing Metadata'}
          </h3>
        </div>

        <div className="w-full bg-gray-700 rounded-full h-3 mb-4 overflow-hidden">
          <div
            className={`${refreshProgress.mode === 'links' ? 'bg-purple-600' : 'bg-blue-600'} h-full transition-all duration-300 ease-out rounded-full`}
            style={{
              width: refreshProgress.total > 0
                ? `${(refreshProgress.current / refreshProgress.total) * 100}%`
                : '0%',
            }}
          />
        </div>

        <div className="flex justify-between items-center mb-1">
          <div className="text-sm text-gray-300">
            {refreshProgress.total > 0 ? (
              <span>
                {refreshProgress.current} of {refreshProgress.total} games
              </span>
            ) : (
              <span>Preparing...</span>
            )}
          </div>
          <div className="text-[10px] text-gray-500 font-mono">
            {refreshProgress.total > 0 ? `${Math.round((refreshProgress.current / refreshProgress.total) * 100)}%` : '0%'}
          </div>
        </div>

        <div className="text-sm text-gray-400 min-h-[20px] mb-2">
          {refreshProgress.message}
        </div>

        <div className="bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
          {refreshProgress.gameTitle ? (
            <div className="text-sm text-white font-medium mb-1 truncate">
              {refreshProgress.gameTitle}
            </div>
          ) : (
            <div className="text-xs text-gray-500 italic">Waiting for discovery...</div>
          )}

          {refreshProgress.mode === 'links' && refreshProgress.links && refreshProgress.links.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {refreshProgress.links.map((link, idx) => (
                <span key={idx} className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 py-0.5 rounded">
                  {link.name}
                </span>
              ))}
            </div>
          ) : refreshProgress.mode !== 'links' && refreshProgress.images && refreshProgress.images.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {refreshProgress.images.map((asset, idx) => (
                <span key={idx} className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                  {asset}
                </span>
              ))}
            </div>
          ) : refreshProgress.gameTitle && !refreshProgress.message.includes('Searching') && !refreshProgress.message.includes('Fetching') ? (
            <div className="text-[10px] text-gray-500 italic mt-1">No new {refreshProgress.mode === 'links' ? 'links' : 'assets'} found for this game.</div>
          ) : null}
        </div>

        {refreshProgress.current < refreshProgress.total && !refreshProgress.message?.includes('Reloading') && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={onCancelRefresh}
              disabled={isCancellingRefresh}
              className="px-4 py-2 bg-red-600/90 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isCancellingRefresh ? 'Cancelling...' : 'Cancel Refresh'}
            </button>
          </div>
        )}

        {refreshProgress.total > 0 && refreshProgress.current >= refreshProgress.total && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-sm text-green-400 font-medium flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Refresh completed!
            </div>
            {refreshProgress.mode === 'links' && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                >
                  Finish
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
