import React, { useState } from 'react';

interface WelcomeScreenProps {
    onScanGames: () => void;
    onAddFolder: (path: string, categories: string[]) => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onScanGames, onAddFolder }) => {
    const [pendingPath, setPendingPath] = useState<string | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<string[]>(['Games']);

    const handlePickFolder = async () => {
        try {
            const path = await window.electronAPI.showFolderDialog();
            if (path) {
                setPendingPath(path);
            }
        } catch (err) {
            console.error('Error picking folder:', err);
        }
    };

    const handleFinish = () => {
        if (pendingPath) {
            onAddFolder(pendingPath, selectedCategories);
            setPendingPath(null);
        }
    };

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    if (pendingPath) {
        return (
            <div className="flex flex-col items-center justify-center h-full px-6 py-12 text-center animate-in fade-in zoom-in duration-500">
                <div className="max-w-xl w-full bg-gray-900/60 border border-gray-700/50 rounded-3xl p-10 backdrop-blur-xl shadow-2xl">
                    <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-8 mx-auto">
                        <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                    </div>

                    <h2 className="text-3xl font-bold text-white mb-2">Configure Folder</h2>
                    <p className="text-gray-400 mb-8 truncate px-4" title={pendingPath}>
                        {pendingPath}
                    </p>

                    <div className="text-left mb-8">
                        <label className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4 px-1">
                            Auto-Assign Categories
                        </label>
                        <div className="flex flex-wrap gap-3">
                            {(['Games', 'Apps', 'VR'] as const).map(cat => {
                                const isSelected = selectedCategories.includes(cat);
                                return (
                                    <button
                                        key={cat}
                                        onClick={() => toggleCategory(cat)}
                                        className={`px-6 py-3 rounded-xl border transition-all duration-200 flex items-center gap-2 font-medium ${isSelected
                                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                                            : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-500'
                                            }`}
                                    >
                                        <span>{isSelected ? '✓' : '+'}</span>
                                        {cat}
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-xs text-gray-500 mt-4 leading-relaxed px-1">
                            Games found in this folder will automatically be placed into these categories. You can change this later in Settings.
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <button
                            onClick={() => setPendingPath(null)}
                            className="flex-1 px-6 py-4 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-2xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleFinish}
                            className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-600/20"
                        >
                            Add Folder
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 py-12 text-center animate-in fade-in zoom-in duration-700">
            <div className="max-w-3xl w-full">
                {/* Welcome Header */}
                <div className="mb-12">
                    <h1 className="text-5xl font-bold text-white mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
                        Welcome to Onyx
                    </h1>
                    <p className="text-xl text-gray-400">
                        Your premium, all-in-one gaming library. Let's get your collection organized.
                    </p>
                </div>

                {/* Action Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    <button
                        onClick={onScanGames}
                        className="group relative flex flex-col items-center p-8 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 hover:border-blue-500/50 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-500/10"
                    >
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-semibold text-white mb-2">Scan for Games</h3>
                        <p className="text-gray-400 text-sm">Automagically find and import games from Steam, Xbox, and other launchers.</p>
                    </button>

                    <button
                        onClick={handlePickFolder}
                        className="group relative flex flex-col items-center p-8 bg-gray-800/40 hover:bg-gray-800/60 border border-gray-700/50 hover:border-gray-600 rounded-2xl transition-all duration-300 transform hover:-translate-y-1 hover:shadow-2xl"
                    >
                        <div className="w-16 h-16 bg-gray-700/30 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                            </svg>
                        </div>
                        <h3 className="text-2xl font-semibold text-white mb-2">Add Folder</h3>
                        <p className="text-gray-400 text-sm">Monitor a custom location for games with automatic categorization.</p>
                    </button>
                </div>

                {/* Tips & Pro-tips */}
                <div className="bg-gray-900/40 border border-gray-800/50 rounded-2xl p-8 text-left">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-6 flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Quick Tips & Advice
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <p className="text-white font-medium text-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                                Right-Click Everything
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Most features—like changing box art, modifying metadata, or pinning games—are available via the right-click menu.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-white font-medium text-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                                Middle-Click to Launch
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                Instantly launch any game without opening the details panel by clicking your middle mouse button (scroll wheel).
                            </p>
                        </div>

                        <div className="space-y-2">
                            <p className="text-white font-medium text-sm flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                Drag & Drop
                            </p>
                            <p className="text-gray-400 text-xs leading-relaxed">
                                You can drag any `.exe` or folder directly onto the library window to quickly start the import process.
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-800/50">
                        <p className="text-xs text-gray-500 flex items-center justify-center gap-2 italic">
                            <svg className="w-3.5 h-3.5 text-yellow-500/50" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM14.243 14.243a1 1 0 101.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707z" />
                            </svg>
                            Did you know? You can customize the entire UI by right-clicking on empty library space and using the Appearance settings.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
