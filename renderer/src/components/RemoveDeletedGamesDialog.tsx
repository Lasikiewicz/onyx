import React, { useState } from 'react';
import { MissingGame } from '../types/game';

interface RemoveDeletedGamesDialogProps {
    isOpen: boolean;
    missingGames: MissingGame[];
    isScanning: boolean;
    onRemove: (gameIds: string[]) => Promise<void>;
    onCancel: () => void;
}

export const RemoveDeletedGamesDialog: React.FC<RemoveDeletedGamesDialogProps> = ({
    isOpen,
    missingGames,
    isScanning,
    onRemove,
    onCancel,
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isRemoving, setIsRemoving] = useState(false);

    // Initialize selected IDs when missing games change
    React.useEffect(() => {
        if (isOpen && missingGames.length > 0) {
            setSelectedIds(new Set(missingGames.map(g => g.id)));
        }
    }, [isOpen, missingGames]);

    const toggleGameSelection = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const toggleAll = () => {
        if (selectedIds.size === missingGames.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(missingGames.map(g => g.id)));
        }
    };

    const handleRemove = async () => {
        if (selectedIds.size === 0) return;
        setIsRemoving(true);
        try {
            await onRemove(Array.from(selectedIds));
        } finally {
            setIsRemoving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-gradient-to-br from-gray-900 to-slate-950 rounded-2xl shadow-2xl border border-gray-700/50 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Remove Deleted Games</h2>
                            <p className="text-gray-400 text-sm mt-0.5">Games are removed from your library only — no files are deleted from disk</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="group p-2 hover:bg-gray-800 rounded-lg transition-colors flex-shrink-0"
                    >
                        <svg className="w-5 h-5 text-gray-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
                    {isScanning ? (
                        <div className="flex flex-col items-center justify-center py-20 space-y-6">
                            <div className="relative">
                                <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full"></div>
                                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                            </div>
                            <div className="text-center space-y-2">
                                <p className="text-white font-semibold text-lg">Scanning your system...</p>
                                <p className="text-gray-400 text-sm max-w-[280px]">Verifying Steam library and local file paths for all games</p>
                            </div>
                        </div>
                    ) : missingGames.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-6 text-center">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Library is healthy</h3>
                                <p className="text-gray-400 text-sm max-w-sm mx-auto">None of the games in your library are currently reported as missing or deleted from your system.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between px-1">
                                <p className="text-gray-400 text-sm font-medium">
                                    {missingGames.length} uninstalled game{missingGames.length !== 1 ? 's' : ''} found
                                </p>
                                <button
                                    onClick={toggleAll}
                                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 transition-colors"
                                >
                                    {selectedIds.size === missingGames.length ? 'Deselect all' : 'Select all'}
                                </button>
                            </div>

                            <div className="space-y-2">
                                {missingGames.map((game) => (
                                    <label
                                        key={game.id}
                                        className={`group flex items-start gap-4 p-4 rounded-xl transition-colors cursor-pointer border ${selectedIds.has(game.id)
                                            ? 'bg-blue-500/10 border-blue-500/30'
                                            : 'bg-gray-800/40 border-gray-700/30 hover:bg-gray-800/60'
                                            }`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.has(game.id)}
                                            onChange={() => toggleGameSelection(game.id)}
                                            className="sr-only"
                                        />
                                        <div className={`w-5 h-5 mt-0.5 rounded-md border flex-shrink-0 flex items-center justify-center transition-colors ${selectedIds.has(game.id)
                                            ? 'bg-blue-500 border-blue-500'
                                            : 'border-gray-600 bg-gray-900 group-hover:border-gray-500'
                                            }`}>
                                            {selectedIds.has(game.id) && (
                                                <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="font-semibold text-white truncate">{game.title}</div>
                                                <div className="px-2 py-0.5 rounded text-[10px] font-medium bg-gray-700 text-gray-300 uppercase tracking-wider flex-shrink-0">
                                                    {game.source || 'Manual'}
                                                </div>
                                            </div>
                                            <div
                                                className="text-xs text-gray-500 mt-1 font-mono break-all group-hover:text-gray-400 transition-colors"
                                                title={game.exePath || undefined}
                                            >
                                                {game.exePath || 'No path defined'}
                                            </div>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-800 flex items-center justify-between gap-4">
                    <div className="text-sm text-gray-400 min-w-0 truncate">
                        {missingGames.length > 0 && !isScanning && (
                            <span>{selectedIds.size} of {missingGames.length} selected</span>
                        )}
                    </div>
                    <div className="flex gap-3 flex-shrink-0">
                        <button
                            onClick={onCancel}
                            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors border border-gray-700"
                        >
                            {missingGames.length === 0 && !isScanning ? 'Close' : 'Cancel'}
                        </button>
                        {missingGames.length > 0 && (
                            <button
                                onClick={handleRemove}
                                disabled={selectedIds.size === 0 || isRemoving}
                                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg transition-colors border border-red-500/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-600 flex items-center gap-2"
                            >
                                {isRemoving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Removing...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>Remove{selectedIds.size > 0 ? ` ${selectedIds.size}` : ''}</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
