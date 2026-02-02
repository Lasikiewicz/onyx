import { useMemo } from 'react';

interface FoundGamesModalProps {
    foundGames: Array<{
        id?: string;
        title: string;
        exePath?: string;
        installPath?: string;
        platform?: string;
        source?: string;
        appId?: string;
    }>;
    onOpenImporter: (gamesToImport: any[]) => void;
    onCancel: () => void;
}

export function FoundGamesModal({ foundGames, onOpenImporter, onCancel }: FoundGamesModalProps) {
    // Sort games alphabetically
    const sortedFoundGames = useMemo(() => {
        return [...foundGames].sort((a, b) => a.title.localeCompare(b.title));
    }, [foundGames]);

    const handleOpenImporter = () => {
        // Pass all games to the importer
        onOpenImporter(foundGames);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100]">
            <div className="bg-gradient-to-br from-gray-900 to-slate-950 border border-gray-700/50 rounded-2xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center border border-green-500/20">
                        <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">New Games Found</h2>
                        <p className="text-gray-400 text-sm mt-1">
                            The following new games were detected. You can import them directly or review them in the Importer.
                        </p>
                    </div>
                </div>

                <div className="flex items-center mb-4 px-1">
                    <span className="text-sm font-medium text-gray-400">
                        {foundGames.length} {foundGames.length === 1 ? 'game' : 'games'} found
                    </span>
                </div>

                <div className="flex-1 overflow-y-auto mb-6 pr-2 -mr-2 space-y-2">
                    {sortedFoundGames.map((game, index) => (
                        <div
                            key={game.id || `game-${index}`}
                            className="flex items-start gap-4 p-4 bg-gray-800/40 border border-gray-700/30 rounded-xl hover:bg-gray-800/60 transition-colors group"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="font-semibold text-white truncate">{game.title}</div>
                                    {(game.platform || game.source) && (
                                        <div className="px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300 uppercase tracking-wider text-[10px]">
                                            {game.platform || game.source}
                                        </div>
                                    )}
                                </div>
                                {(game.exePath || game.installPath) && (
                                    <div className="text-xs text-gray-500 mt-1 font-mono break-all group-hover:text-gray-400 transition-colors">
                                        {game.exePath || game.installPath}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-800">
                    <button
                        onClick={onCancel}
                        className="flex-1 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors border border-gray-700"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleOpenImporter}
                        className="flex-1 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-colors border border-gray-600"
                    >
                        Review in Importer
                    </button>
                </div>
            </div>
        </div>
    );
}
