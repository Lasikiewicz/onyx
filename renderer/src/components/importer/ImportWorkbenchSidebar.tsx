import React, { forwardRef } from 'react';
import { StagedGame, ImportSource, ImportStatus } from '../../types/importer';

interface ImportWorkbenchSidebarProps {
    groupedGames: Record<string, StagedGame[]>;
    selectedId: string | null;
    onSelectGame: (id: string) => void;
    isScanning: boolean;
    gameProcessingStates: Map<string, { status: string; progress?: string }>;
    showIgnored: boolean;
    visibleGamesCount: number;
    onSkipGame: (game: StagedGame) => void;
    onIgnoreGame: (game: StagedGame) => void;
}

const SOURCE_LABELS: Record<ImportSource, string> = {
    steam: 'Steam',
    epic: 'Epic Games',
    gog: 'GOG',
    xbox: 'Xbox',
    ubisoft: 'Ubisoft',
    rockstar: 'Rockstar',
    ea: 'EA',
    battle: 'Battle.net',
    manual_file: 'Manual File',
    manual_folder: 'Game',
};

const getSourceIcon = (source: string): React.ReactNode => {
    const cls = "w-4 h-4 flex-shrink-0";
    switch (source) {
        case 'steam':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.979 0C5.678 0 .511 4.86.022 10.91l6.432 2.658a3.387 3.387 0 0 1 1.912-.588c.063 0 .125.002.188.006l2.861-4.142V8.77a4.508 4.508 0 0 1 4.508-4.508 4.508 4.508 0 0 1 4.509 4.508 4.508 4.508 0 0 1-4.509 4.508h-.105l-4.076 2.91c0 .052.004.105.004.159 0 1.868-1.519 3.387-3.387 3.387a3.39 3.39 0 0 1-3.354-2.94L.458 14.84C1.891 19.928 6.502 23.8 12 23.8c6.627 0 12-5.373 12-12S18.627 0 12 0h-.021zm-6.36 16.578l-1.46-.603c.26.53.66.984 1.178 1.297a2.548 2.548 0 0 0 3.473-1.022 2.535 2.535 0 0 0 .001-2.038 2.537 2.537 0 0 0-1.373-1.374l1.51.625a1.87 1.87 0 0 1-1.458 3.448 1.87 1.87 0 0 1-1.871-1.333zm10.313-5.39a3.006 3.006 0 0 0-3.003-3.003 3.006 3.006 0 0 0-3.003 3.003 3.006 3.006 0 0 0 3.003 3.003 3.006 3.006 0 0 0 3.003-3.003zm-5.254-.001a2.253 2.253 0 0 1 2.252-2.252 2.253 2.253 0 0 1 2.252 2.252 2.253 2.253 0 0 1-2.252 2.252 2.253 2.253 0 0 1-2.252-2.252z" />
                </svg>
            );
        case 'epic':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.537 0C2.165 0 1.66.506 1.66 1.879V22.12c0 1.374.504 1.879 1.877 1.879h16.926c1.374 0 1.877-.505 1.877-1.879v-3.591h-1.69v3.404c0 .393-.26.601-.602.601H4.14c-.342 0-.601-.208-.601-.601V1.965c0-.393.26-.601.601-.601h15.908c.342 0 .602.208.602.601v3.404h1.69V1.879C22.34.505 21.837 0 20.463 0H3.537zm7.907 5.39v2.997H7.353v2.2h3.566v2.997H7.353v2.2h4.091v2.997H4.982V5.39h6.462zm1.949 0h3.028l2.043 5.597 2.043-5.597h2.828v13.39h-2.452V11.48l-1.842 4.927h-1.4l-1.843-4.856v7.23h-2.405V5.39z" />
                </svg>
            );
        case 'gog':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2.4A9.6 9.6 0 0 1 21.6 12 9.6 9.6 0 0 1 12 21.6 9.6 9.6 0 0 1 2.4 12 9.6 9.6 0 0 1 12 2.4zm0 3.6a6 6 0 1 0 0 12 6 6 0 0 0 0-12zm0 2.4a3.6 3.6 0 1 1 0 7.2 3.6 3.6 0 0 1 0-7.2z" />
                </svg>
            );
        case 'xbox':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M4.102 21.033A11.947 11.947 0 0 0 12 24a11.947 11.947 0 0 0 7.898-2.967c1.066-1.079-.508-4.633-3.738-7.873C12.907 9.838 9.834 8.038 8.59 8.59c-3.232 3.24-5.807 6.794-4.489 12.443zM12 2.4c1.682 0 3.27.44 4.645 1.21-.635.39-3.896 2.414-7.29 5.808C6.27 12.503 4.06 15.99 3.65 16.94 2.79 15.49 2.4 13.8 2.4 12 2.4 6.698 6.698 2.4 12 2.4zm0-2.4C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" />
                </svg>
            );
        case 'ubisoft':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.563 12c0-1.424-.248-2.79-.703-4.059a12.006 12.006 0 0 0-6.96-7.12A11.854 11.854 0 0 0 12 0C5.382 0 0 5.382 0 12s5.382 12 12 12c3.848 0 7.252-1.816 9.435-4.635A11.926 11.926 0 0 0 23.563 12zM12 21.6a9.6 9.6 0 1 1 0-19.2 9.6 9.6 0 0 1 0 19.2zm0-14.4a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6z" />
                </svg>
            );
        case 'rockstar':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M5.971 6.816l-.907 2.02L2.4 9.6l2.664.764.907 2.02.907-2.02L9.542 9.6l-2.664-.764-.907-2.02zM12 1.636L10.364 5.09 6.545 6.545l3.819 1.455L12 11.818l1.636-3.818 3.819-1.455-3.819-1.455L12 1.636zm6.029 5.18l-.907 2.02L14.458 9.6l2.664.764.907 2.02.907-2.02L21.6 9.6l-2.664-.764-.907-2.02zM12 12.182l-1.636 3.818L6.545 17.455l3.819 1.455L12 22.727l1.636-3.817 3.819-1.455-3.819-1.455L12 12.182z" />
                </svg>
            );
        case 'ea':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.635 6.162l-5.928 5.838 5.928 5.838H24V6.162h-7.365zM0 6.162v11.676h7.365l5.928-5.838-5.928-5.838H0z" />
                </svg>
            );
        case 'battle':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="currentColor">
                    <path d="M10.457 0c-.516 3.157-.753 5.066-2.007 7.065C7.197 9.064 5.178 10.467 4 11.6c2.775 2.888 5.442 3.467 7.13 3.467.89 0 2.065-.267 2.065-.267s-.377 2.133-.377 3.6C12.818 21.733 15.32 24 15.32 24s2.502-2.267 2.502-5.6c0-1.467-.377-3.6-.377-3.6s1.175.267 2.065.267c1.688 0 4.355-.579 7.13-3.467-1.178-1.133-3.197-2.536-4.45-4.535C20.936 5.066 20.699 3.157 20.183 0c-3.076 1.81-4.538 3.257-5.453 5.6C14.278 4.12 14.1 2.267 14.32.533 14.32.533 13.54 0 12 0c-1.54 0-2.32.533-2.32.533.22 1.734.042 3.587-.41 5.067C8.355 3.257 6.893 1.81 3.817 0h6.64z" />
                </svg>
            );
        case 'manual_file':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                </svg>
            );
        case 'manual_folder':
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
            );
        default:
            return (
                <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <line x1="6" y1="12" x2="18" y2="12" />
                </svg>
            );
    }
};

const getStatusColor = (status: ImportStatus) => {
    switch (status) {
        case 'ready': return 'text-green-400';
        case 'matched': return 'text-blue-400';
        case 'ambiguous': return 'text-yellow-400';
        case 'error': return 'text-red-400';
        case 'pending': return 'text-gray-500';
        case 'scanning': return 'text-blue-300';
        default: return 'text-gray-400';
    }
};

const getStatusIcon = (status: ImportStatus) => {
    switch (status) {
        case 'ready': return '✓';
        case 'matched': return '◎';
        case 'ambiguous': return '?';
        case 'error': return '✗';
        case 'pending': return '○';
        case 'scanning': return '↻';
        default: return '○';
    }
};

export const ImportWorkbenchSidebar = forwardRef<HTMLDivElement, ImportWorkbenchSidebarProps>(({
    groupedGames,
    selectedId,
    onSelectGame,
    isScanning,
    gameProcessingStates,
    showIgnored,
    visibleGamesCount,
    onSkipGame,
    onIgnoreGame
}, ref) => {
    return (
        <div ref={ref} className="w-[300px] lg:w-[350px] border-r border-gray-800 bg-gray-900/50 overflow-y-auto">
            {Object.entries(groupedGames).map(([source, games]) => {
                if (!games || games.length === 0) return null;
                return (
                    <div key={source} className="border-b border-gray-800">
                        <div className="px-4 py-2 bg-gray-800/50 text-sm font-medium text-gray-300 sticky top-0 flex items-center gap-2">
                            {getSourceIcon(source)}
                            {SOURCE_LABELS[source as ImportSource] || source} ({games.length})
                        </div>
                        {games.map(game => (
                            <div
                                key={game.uuid}
                                onClick={() => onSelectGame(game.uuid)}
                                className={`px-4 py-3 flex items-center gap-3 cursor-pointer border-b border-gray-800/50 transition-colors ${selectedId === game.uuid ? 'bg-blue-900/30 border-l-2 border-l-blue-500' : 'hover:bg-gray-800/50'
                                    }`}
                            >
                                {/* Thumbnail */}
                                <div className="w-10 h-14 bg-gray-800 rounded overflow-hidden flex-shrink-0">
                                    {game.boxArtUrl ? (
                                        <img src={game.boxArtUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">?</div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">{game.title}</div>

                                    {/* Progress bar for currently processing games */}
                                    {isScanning && gameProcessingStates.has(game.title) && (
                                        <div className="mt-1 mb-1">
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-xs text-gray-400 truncate">
                                                    {gameProcessingStates.get(game.title)?.status}
                                                </span>
                                                {gameProcessingStates.get(game.title)?.progress && (
                                                    <span className="text-xs text-gray-500">
                                                        {gameProcessingStates.get(game.title)?.progress}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="w-full bg-gray-700 rounded-full h-1">
                                                <div
                                                    className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                                                    style={{
                                                        width: gameProcessingStates.get(game.title)?.progress || '0%'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-xs ${getStatusColor(game.status)}`}>
                                            {getStatusIcon(game.status)} {game.status === 'ambiguous' ? 'Attention Needed' : game.status}
                                        </span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1">
                                    {!showIgnored && (
                                        <>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onSkipGame(game); }}
                                                disabled={isScanning}
                                                className="text-gray-500 hover:text-gray-300 text-xs px-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Skip"
                                            >
                                                ↷
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); onIgnoreGame(game); }}
                                                disabled={isScanning}
                                                className="text-red-500 hover:text-red-300 text-xs px-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                                title="Ignore"
                                            >
                                                ×
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })}

            {visibleGamesCount === 0 && (
                <div className="px-4 py-8 text-center text-gray-400">
                    <p className="text-sm">
                        {showIgnored
                            ? 'No ignored games.'
                            : 'No games found. Click "Scan All" to start.'}
                    </p>
                </div>
            )}
        </div>
    );
});

ImportWorkbenchSidebar.displayName = 'ImportWorkbenchSidebar';
