import React from 'react';
import { StagedGame } from '../../types/importer';

interface ImportGameFormProps {
    selectedGame: StagedGame | null;
    onUpdateGame: (id: string, updates: Partial<StagedGame>) => void;
    onSearchImages: (type: 'boxart' | 'banner' | 'logo' | 'icon') => void;
    onFixMatch: () => void;
    onIgnore: (game: StagedGame) => void;
    onUnignore: (game: StagedGame) => void;
}

export const ImportGameForm: React.FC<ImportGameFormProps> = ({
    selectedGame,
    onUpdateGame,
    onSearchImages,
    onFixMatch,
    onIgnore,
    onUnignore
}) => {
    if (!selectedGame) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-400 bg-gray-900/30">
                <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p>Select a game from the sidebar to view details</p>
                </div>
            </div>
        );
    }

    const handleAddCategory = (category: string) => {
        if (!selectedGame.categories?.includes(category)) {
            onUpdateGame(selectedGame.uuid, {
                categories: [...(selectedGame.categories || []), category]
            });
        }
    };

    const handleRemoveCategory = (category: string) => {
        onUpdateGame(selectedGame.uuid, {
            categories: selectedGame.categories?.filter(c => c !== category) || []
        });
    };

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-900/30">
            <div className="max-w-4xl mx-auto p-6 space-y-8">
                {/* Header Actions */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold text-white truncate max-w-lg">{selectedGame.title}</h2>
                        {selectedGame.isIgnored && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 text-xs rounded border border-red-500/30">Ignored</span>}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onFixMatch}
                            className="px-3 py-1.5 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 border border-blue-500/30 rounded text-sm transition-colors"
                        >
                            Fix Match
                        </button>
                        {selectedGame.isIgnored ? (
                            <button
                                onClick={() => onUnignore(selectedGame)}
                                className="px-3 py-1.5 bg-gray-700 text-white hover:bg-gray-600 rounded text-sm transition-colors"
                            >
                                Unignore
                            </button>
                        ) : (
                            <button
                                onClick={() => onIgnore(selectedGame)}
                                className="px-3 py-1.5 bg-red-600/20 text-red-400 hover:bg-red-600/30 border border-red-500/30 rounded text-sm transition-colors"
                            >
                                Ignore
                            </button>
                        )}
                    </div>
                </div>

                {/* Images Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Box Art */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Box Art</label>
                        <div
                            onClick={() => onSearchImages('boxart')}
                            className="aspect-[2/3] bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-500 cursor-pointer overflow-hidden relative group transition-all"
                        >
                            {selectedGame.boxArtUrl ? (
                                <>
                                    <img src={selectedGame.boxArtUrl} className="w-full h-full object-cover" alt="Box Art" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <span className="text-xs font-bold text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">Change</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-600 group-hover:text-gray-400">
                                    <span className="text-4xl mb-2">+</span>
                                    <span className="text-xs">Add Image</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Banner */}
                    <div className="space-y-2 lg:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Hero Banner</label>
                        <div
                            onClick={() => onSearchImages('banner')}
                            className="aspect-video bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-500 cursor-pointer overflow-hidden relative group transition-all"
                        >
                            {selectedGame.bannerUrl ? (
                                <>
                                    <img src={selectedGame.bannerUrl} className="w-full h-full object-cover" alt="Banner" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <span className="text-xs font-bold text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">Change</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-600 group-hover:text-gray-400">
                                    <span className="text-4xl mb-2">+</span>
                                    <span className="text-xs">Add Image</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Logo */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">Logo</label>
                        <div
                            onClick={() => onSearchImages('logo')}
                            className="aspect-video bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 hover:border-gray-500 cursor-pointer overflow-hidden relative group transition-all flex items-center justify-center"
                        >
                            {selectedGame.logoUrl ? (
                                <>
                                    <img src={selectedGame.logoUrl} className="max-w-full max-h-full object-contain p-2" alt="Logo" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <span className="text-xs font-bold text-white bg-black/50 px-3 py-1 rounded-full backdrop-blur-sm">Change</span>
                                    </div>
                                </>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-full text-gray-600 group-hover:text-gray-400">
                                    <span className="text-4xl mb-2">+</span>
                                    <span className="text-xs">Add Image</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Metadata Form */}
                <div className="space-y-4 bg-gray-800/20 p-6 rounded-xl border border-gray-800">
                    <h3 className="text-lg font-bold text-white border-b border-gray-700 pb-2">Game Details</h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                            <input
                                type="text"
                                value={selectedGame.title}
                                onChange={e => onUpdateGame(selectedGame.uuid, { title: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Developer</label>
                            <input
                                type="text"
                                value={selectedGame.developers?.join(', ') || ''}
                                onChange={e => onUpdateGame(selectedGame.uuid, { developers: e.target.value.split(',').map(s => s.trim()) })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Developer 1, Developer 2"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Publisher</label>
                            <input
                                type="text"
                                value={selectedGame.publishers?.join(', ') || ''}
                                onChange={e => onUpdateGame(selectedGame.uuid, { publishers: e.target.value.split(',').map(s => s.trim()) })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 transition-colors"
                                placeholder="Publisher 1, Publisher 2"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">Executable Path</label>
                            <input
                                type="text"
                                value={selectedGame.exePath || ''}
                                onChange={e => onUpdateGame(selectedGame.uuid, { exePath: e.target.value })}
                                className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 transition-colors font-mono"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                        <textarea
                            value={selectedGame.description || ''}
                            onChange={e => onUpdateGame(selectedGame.uuid, { description: e.target.value })}
                            rows={4}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500 transition-colors custom-scrollbar"
                        />
                    </div>

                    {/* Categories */}
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-2">Categories</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                            {selectedGame.categories?.map(cat => (
                                <span key={cat} className="px-2 py-1 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded text-xs flex items-center gap-1">
                                    {cat}
                                    <button onClick={() => handleRemoveCategory(cat)} className="hover:text-white ml-1">×</button>
                                </span>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            {['Games', 'Apps', 'VR', 'Favorites'].map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => handleAddCategory(cat)}
                                    className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-xs transition-colors"
                                >
                                    + {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
