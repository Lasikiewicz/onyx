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
                <div className="flex items-start gap-4 mb-6">
                    {/* Onyx Logo */}
                    <div className="w-16 h-16 flex-shrink-0">
                        <svg width="100%" height="100%" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="onyxGrad2" x1="256" y1="20" x2="256" y2="492" gradientUnits="userSpaceOnUse">
                                    <stop offset="0" stopColor="#334155" />
                                    <stop offset="1" stopColor="#020617" />
                                </linearGradient>
                                <filter id="glow2" x="-50%" y="-50%" width="200%" height="200%">
                                    <feGaussianBlur stdDeviation="8" result="blur" />
                                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                </filter>
                            </defs>

                            <path d="M256 30 L465 150 V362 L256 482 L47 362 V150 L256 30Z"
                                fill="url(#onyxGrad2)"
                                stroke="#0ea5e9"
                                strokeWidth="8"
                                filter="url(#glow2)" />

                            <path d="M256 256 L256 482 M256 256 L47 150 M256 256 L465 150"
                                stroke="#1e293b"
                                strokeWidth="4" />

                            <g transform="translate(256, 143) scale(1, 0.58)">
                                <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" fill="none" />
                                <circle r="55" stroke="#e0f2fe" strokeWidth="8" fill="none" />
                            </g>

                            <g transform="translate(151, 325) rotate(60) scale(1, 0.58)">
                                <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" fill="none" />
                                <circle r="55" stroke="#e0f2fe" strokeWidth="8" fill="none" />
                            </g>

                            <g transform="translate(361, 325) rotate(-60) scale(1, 0.58)">
                                <circle r="55" stroke="#0ea5e9" strokeWidth="20" strokeOpacity="0.6" fill="none" />
                                <circle r="55" stroke="#e0f2fe" strokeWidth="8" fill="none" />
                            </g>

                            <path d="M256 30 L465 150 L256 256 L47 150 L256 30Z"
                                fill="white"
                                fillOpacity="0.1" />
                        </svg>
                    </div>

                    <div className="flex-1">
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
