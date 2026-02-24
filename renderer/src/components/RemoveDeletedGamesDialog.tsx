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
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-[#1a1f2e] rounded-2xl shadow-2xl border border-white/5 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shadow-lg shadow-red-500/5">
                            <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white tracking-tight">Remove Deleted Games</h2>
                            <p className="text-slate-400 text-sm">Clean up your library from uninstalled games</p>
                        </div>
                    </div>
                    <button
                        onClick={onCancel}
                        className="group p-2 hover:bg-white/5 rounded-xl transition-all"
                    >
                        <svg className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                <p className="text-slate-400 text-sm max-w-[280px]">Verifying Steam library and local file paths for all games</p>
                            </div>
                        </div>
                    ) : missingGames.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-6 text-center">
                            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/5">
                                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-white">Library is Healthy</h3>
                                <p className="text-slate-400 max-w-sm mx-auto">None of the games in your library are currently reported as missing or deleted from your system.</p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            <div className="flex items-center justify-between">
                                <p className="text-slate-400 text-sm font-medium">
                                    Found <span className="text-white font-bold">{missingGames.length}</span> uninstalled game{missingGames.length !== 1 ? 's' : ''}
                                </p>
                                <button
                                    onClick={toggleAll}
                                    className="text-blue-400 hover:text-blue-300 text-sm font-bold transition-colors"
                                >
                                    {selectedIds.size === missingGames.length ? 'Deselect All' : 'Select All'}
                                </button>
                            </div>

                            <div className="space-y-2">
                                {missingGames.map((game) => (
                                    <div
                                        key={game.id}
                                        className={`group flex items-center gap-4 p-4 rounded-xl transition-all cursor-pointer border ${selectedIds.has(game.id)
                                                ? 'bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/5'
                                                : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                                            }`}
                                        onClick={() => toggleGameSelection(game.id)}
                                    >
                                        <div className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${selectedIds.has(game.id)
                                                ? 'bg-blue-500 border-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)]'
                                                : 'border-white/10 bg-slate-900 group-hover:border-white/20'
                                            }`}>
                                            {selectedIds.has(game.id) && (
                                                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-bold text-slate-100 truncate group-hover:text-white transition-colors">{game.title}</div>
                                            <div className="text-xs text-slate-400 truncate flex items-center gap-2 mt-0.5">
                                                <span className="capitalize px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-bold border border-white/5 text-slate-300 tracking-wider">
                                                    {game.source || 'Manual'}
                                                </span>
                                                <span className="truncate opacity-70 italic">{game.exePath || 'No path defined'}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="text-sm font-medium">
                        {missingGames.length > 0 && !isScanning && (
                            <span className="text-slate-400">
                                <span className="text-blue-400 font-bold">{selectedIds.size}</span> selected for removal
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onCancel}
                            className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-all border border-white/5 active:scale-95"
                        >
                            {missingGames.length === 0 && !isScanning ? 'Close' : 'Cancel'}
                        </button>
                        {missingGames.length > 0 && (
                            <button
                                onClick={handleRemove}
                                disabled={selectedIds.size === 0 || isRemoving}
                                className="group px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-bold rounded-xl transition-all shadow-xl shadow-red-950/40 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 flex items-center gap-2 active:scale-95"
                            >
                                {isRemoving ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        <span>Removing...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                        <span>Remove Selected</span>
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
