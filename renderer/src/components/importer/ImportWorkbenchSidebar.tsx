import React from 'react';
import { ImportStatus, ImportSource, StagedGame } from '../../types/importer';

type GameProcessingState = {
    status: string;
    progress?: string;
};

export interface ImportWorkbenchSidebarProps {
    showSidebar: boolean;
    sidebarRef: React.RefObject<HTMLDivElement>;
    groupedGames: Record<string, StagedGame[]>;
    visibleGames: StagedGame[];
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;
    isScanning: boolean;
    gameProcessingStates: Map<string, GameProcessingState>;
    onSkipGame: (game: StagedGame) => void;
    onIgnoreGame: (game: StagedGame) => void;
    getStatusColor: (status: ImportStatus) => string;
    getStatusIcon: (status: ImportStatus) => string;
    gameRowRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
    getSourceIcon: (source: string) => React.ReactNode;
    sourceLabels: Record<ImportSource, string>;
    showIgnored: boolean;
}

export const ImportWorkbenchSidebar: React.FC<ImportWorkbenchSidebarProps> = ({
    showSidebar,
    sidebarRef,
    groupedGames,
    visibleGames,
    selectedId,
    setSelectedId,
    isScanning,
    gameProcessingStates,
    onSkipGame,
    onIgnoreGame,
    getStatusColor,
    getStatusIcon,
    gameRowRefs,
    getSourceIcon,
    sourceLabels,
    showIgnored,
}) => {
    return (
        <div
            ref={sidebarRef}
            className={`border-r border-gray-800 bg-gray-900/50 overflow-hidden transition-[width,opacity,transform] duration-500 ease-out ${
                showSidebar
                    ? 'w-[300px] lg:w-[350px] opacity-100 translate-x-0'
                    : 'w-0 opacity-0 -translate-x-6 border-r-0'
            }`}
        >
            <div className="h-full overflow-y-auto">
                        {Object.entries(groupedGames).map(([source, games]) => {
                            if (!games || games.length === 0) return null;
                            return (
                                <div key={source} className="border-b border-gray-800">
                                    <div className="px-4 py-2 bg-gray-800/50 text-sm font-medium text-gray-300 sticky top-0 flex items-center gap-2">
                                        {getSourceIcon(source)}
                                        {sourceLabels[source as ImportSource] || source} ({games.length})
                                    </div>
                                    {games.map(game => (
                                        <div
                                            key={game.uuid}
                                            ref={el => {
                                                if (!el) return;
                                                // Use title as key since currentlyProcessingGame is title-based
                                                gameRowRefs.current[game.title] = el;
                                            }}
                                            onClick={() => setSelectedId(game.uuid)}
                                            className={`px-4 py-3 flex items-center gap-3 cursor-pointer border-b border-gray-800/50 transition-colors ${
                                                selectedId === game.uuid
                                                    ? 'bg-blue-900/30 border-l-2 border-l-blue-500'
                                                    : 'hover:bg-gray-800/50'
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
                                                                    width: gameProcessingStates.get(game.title)?.progress || '0%',
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-xs ${getStatusColor(game.status)}`}>
                                                        {getStatusIcon(game.status)}{' '}
                                                        {game.status === 'ambiguous' ? 'Attention Needed' : game.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-1">
                                                {!showIgnored && (
                                                    <>
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                onSkipGame(game);
                                                            }}
                                                            disabled={isScanning}
                                                            className="text-gray-500 hover:text-gray-300 text-xs px-1 disabled:opacity-30 disabled:cursor-not-allowed"
                                                            title="Skip"
                                                        >
                                                            ↷
                                                        </button>
                                                        <button
                                                            onClick={e => {
                                                                e.stopPropagation();
                                                                onIgnoreGame(game);
                                                            }}
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

                        {visibleGames.length === 0 && (
                            <div className="px-4 py-8 text-center text-gray-400">
                                <p className="text-sm">
                                    {showIgnored
                                        ? 'No ignored games.'
                                        : 'No games found. Click "Scan All" to start.'}
                                </p>
                            </div>
                        )}
            </div>
        </div>
    );
};

