import React, { useState, useEffect } from 'react';

interface ImageSearchModalProps {
    initialQuery: string;
    type: 'boxart' | 'banner' | 'logo' | 'icon' | 'alternativeBanner';
    onImageSelected: (url: string) => void;
    onClose: () => void;
}

export const ImageSearchModal: React.FC<ImageSearchModalProps> = ({
    initialQuery,
    type,
    onImageSelected,
    onClose
}) => {
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<any[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [activeTab] = useState<'steam' | 'igdb' | 'steamgriddb'>('steamgriddb');

    // Auto-search on mount
    useEffect(() => {
        handleSearch();
    }, []);

    const handleSearch = async () => {
        setIsSearching(true);
        setResults([]);
        try {
            // Use the general searchArtwork method for now, or specific ones if available
            if (window.electronAPI.fastImageSearch && activeTab === 'steamgriddb') {
                handleFastSearch();
                return;
            }

            // In a real refactor, we should probably have more granular API methods
            if (activeTab === 'steamgriddb') {
                const res = await window.electronAPI.searchArtwork(query); // Simplification, assuming this returns a mix
                // Filter roughly based on expectation or just dump results
                // For this "dumb" refactor, we stick to what the API likely returns or maps
                if (res) {
                    // Map the flat result to an array for display
                    setResults([res]);
                }
            } else {
                const res = await window.electronAPI.searchGames(query);
                setResults(res.results || []);
            }
        } catch (err) {
            console.error("Search failed", err);
        } finally {
            setIsSearching(false);
        }
    };

    // Dedicated "Fast" search using the newer IPC if available
    const handleFastSearch = async () => {
        if (window.electronAPI.fastImageSearch) {
            setIsSearching(true);
            try {
                const res = await window.electronAPI.fastImageSearch(query);
                setResults(res || []);
            } catch (e) {
                console.error(e);
            } finally {
                setIsSearching(false);
            }
        }
    };


    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-8">
            <div className="bg-gray-900 border border-gray-700 w-full max-w-5xl h-[80vh] rounded-xl flex flex-col shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex items-center gap-4">
                    <h3 className="text-xl font-bold text-white capitalize">Select {type}</h3>
                    <div className="flex-1 flex gap-2">
                        <input
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                            placeholder="Search..."
                        />
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium disabled:opacity-50"
                        >
                            {isSearching ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white text-2xl">×</button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    {results.length === 0 && !isSearching ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <p>No results found.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {results.map((item, idx) => {
                                // Attempt to resolve URL based on mixed result types
                                // This is a rough heuristic based on common API shapes
                                const url = item.url || item.coverUrl || item.logoUrl || item.bannerUrl || (item.images && item.images[type]);

                                if (!url) return null;

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => onImageSelected(url)}
                                        className="aspect-[16/9] bg-gray-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 ring-blue-500 relative group"
                                    >
                                        <img src={url} className="w-full h-full object-contain bg-black/50" alt="" />
                                        <div className="absolute inset-x-0 bottom-0 bg-black/70 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <p className="text-xs text-white truncate">{item.title || 'Image'}</p>
                                            <p className="text-[10px] text-gray-400">{item.source || 'Unknown'}</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
