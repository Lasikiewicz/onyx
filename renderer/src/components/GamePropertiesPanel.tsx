import React, { useState, useEffect } from 'react';
import { Game } from '../types/game';
import { StagedGame } from '../types/importer';

interface GamePropertiesPanelProps {
    game: Game | StagedGame;
    onSave: (game: Game | StagedGame) => Promise<void> | void;
    onCancel?: () => void;
    onDelete?: () => void;
    allCategories?: string[];
    isStaged?: boolean;
}

export const GamePropertiesPanel: React.FC<GamePropertiesPanelProps> = ({
    game,
    onSave,
    onCancel,
    onDelete,
    allCategories = [],
    isStaged = false
}) => {
    const [activeTab, setActiveTab] = useState<'metadata' | 'images' | 'modManager'>('metadata');
    const [editedGame, setEditedGame] = useState<Game | StagedGame>(game);

    // Metadata Search State
    const [showFixMatch, setShowFixMatch] = useState(false);
    const [metadataSearchQuery, setMetadataSearchQuery] = useState('');
    const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
    const [metadataSearchResults, setMetadataSearchResults] = useState<any[]>([]);

    // Image Search State
    const [imageSearchQuery, setImageSearchQuery] = useState('');
    const [isSearchingImages, setIsSearchingImages] = useState(false);
    const [activeImageSearchTab, setActiveImageSearchTab] = useState<'boxart' | 'banner' | 'logo' | 'icon'>('boxart');
    const [steamGridDBResults, setSteamGridDBResults] = useState<{
        boxart: any[];
        banner: any[];
        logo: any[];
        icon: any[];
    }>({ boxart: [], banner: [], logo: [], icon: [] });

    // General State
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [newCategoryInput, setNewCategoryInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setEditedGame(game);
        // Reset transient states
        setShowFixMatch(false);
        setMetadataSearchResults([]);
        setError(null);
        setImageSearchQuery('');
    }, [game]);

    const updateField = (field: string, value: any) => {
        setEditedGame(prev => ({ ...prev, [field]: value }));
    };

    // --- Metadata Search ---
    const handleFixMatchSearch = async () => {
        if (!metadataSearchQuery.trim()) return;
        setIsSearchingMetadata(true);
        setMetadataSearchResults([]);
        setError(null);

        try {
            const response = await window.electronAPI.searchGames(metadataSearchQuery);
            if (response.success && response.results) {
                setMetadataSearchResults(response.results);
            } else {
                setError(response.error || 'No results found');
            }
        } catch (err) {
            setError('Search failed');
        } finally {
            setIsSearchingMetadata(false);
        }
    };

    const handleApplyMatch = async (result: any) => {
        // For StagedGame, we just want the metadata values
        // For Game, GameManager usually updates DB directly via fetchAndUpdateByProviderId

        try {
            if (!isStaged && 'id' in editedGame) {
                // Use existing API for real games
                await window.electronAPI.fetchAndUpdateByProviderId(editedGame.id, result.id, result.source);
                // We should probably reload the game prop or notify parent?
                // The parent likely will reload the library and pass new game prop.
                setSuccess("Match fixed!");
                setShowFixMatch(false);
                if (onSave) onSave(editedGame); // Trigger reload-ish behavior
            } else {
                // For Staged / Import: Fetch Metadata and Apply to Local State
                const metadata = await window.electronAPI.searchArtwork(result.title, result.steamAppId);
                if (metadata) {
                    setEditedGame(prev => ({
                        ...prev,
                        title: metadata.title || prev.title,
                        description: metadata.description || prev.description,
                        releaseDate: metadata.releaseDate || prev.releaseDate,
                        genres: metadata.genres || prev.genres,
                        developers: metadata.developers || prev.developers,
                        publishers: metadata.publishers || prev.publishers,
                        boxArtUrl: metadata.boxArtUrl || prev.boxArtUrl,
                        bannerUrl: metadata.bannerUrl || prev.bannerUrl,
                        logoUrl: metadata.logoUrl || prev.logoUrl,
                        heroUrl: metadata.heroUrl || prev.heroUrl,
                        rating: metadata.rating || prev.rating,
                        platform: metadata.platform || (prev as any).platform
                    }));
                    setShowFixMatch(false);
                    setSuccess("Metadata applied!");
                }
            }
        } catch (err) {
            setError("Failed to apply match");
        }
    };

    // --- Image Search ---
    const handleSearchImages = async (type: 'boxart' | 'banner' | 'logo' | 'icon') => {
        const query = imageSearchQuery || editedGame.title;
        if (!query) return;

        setIsSearchingImages(true);
        setSteamGridDBResults(prev => ({ ...prev, [type]: [] }));

        try {
            // Use searchImages which handles SGDB
            const steamAppId = (editedGame as any).appId || (editedGame as any).steamAppId;
            const response = await window.electronAPI.searchImages(query, type, steamAppId);
            if (response.success && response.images) {
                const flattened = response.images.flatMap(r => r.images || []);
                setSteamGridDBResults(prev => ({ ...prev, [type]: flattened }));
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSearchingImages(false);
        }
    };

    const applyImage = (type: string, url: string) => {
        if (type === 'boxart') updateField('boxArtUrl', url);
        if (type === 'banner') updateField('bannerUrl', url);
        if (type === 'logo') updateField('logoUrl', url);
        if (type === 'icon') updateField('iconUrl', url);
        setSuccess(`Applied ${type}`);
        setTimeout(() => setSuccess(null), 2000);
    };

    // Save Handler
    const handleSave = async () => {
        setIsSaving(true);
        try {
            await onSave(editedGame);
            setSuccess("Saved successfully");
            setTimeout(() => setSuccess(null), 2000);
        } catch (err) {
            setError("Failed to save");
        } finally {
            setIsSaving(false);
        }
    };

    // Render Image Strip (Mini)
    const renderImageStrip = () => (
        <div className="flex gap-2 mb-6 items-start p-3 bg-gray-900/50 rounded-lg border border-gray-800 overflow-x-auto">
            {(['boxart', 'logo', 'banner', 'icon'] as const).map(type => {
                const field = type === 'boxart' ? 'boxArtUrl' : type === 'logo' ? 'logoUrl' : type === 'banner' ? 'bannerUrl' : 'iconUrl';
                const val = (editedGame as any)[field];
                const label = type.charAt(0).toUpperCase() + type.slice(1);

                return (
                    <div
                        key={type}
                        onClick={() => { setActiveTab('images'); setActiveImageSearchTab(type); setImageSearchQuery(editedGame.title); handleSearchImages(type); }}
                        className={`relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0 ${type === 'banner' ? 'h-24 flex-1 min-w-[150px]' : type === 'logo' ? 'h-24 w-36' : 'h-24 w-auto aspect-[2/3]'}`}
                    >
                        {val ? (
                            <img src={val} className="w-full h-full object-contain p-1" alt={label} />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-600">{label}</div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className="text-[10px] text-white font-medium">Edit</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white rounded-lg shadow-xl overflow-hidden border border-gray-800">
            {/* Tabs */}
            <div className="flex items-center px-4 border-b border-gray-700 bg-gray-800/50">
                <button onClick={() => setActiveTab('metadata')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'metadata' ? 'border-primary-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>Metadata</button>
                <button onClick={() => setActiveTab('images')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'images' ? 'border-primary-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>Images</button>
                {!isStaged && <button onClick={() => setActiveTab('modManager')} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'modManager' ? 'border-primary-500 text-white' : 'border-transparent text-gray-400 hover:text-gray-200'}`}>Mod Manager</button>}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                {activeTab === 'metadata' && (
                    <div className="space-y-4">
                        {renderImageStrip()}

                        {/* Title / Fix Match */}
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-medium text-gray-400">Title</label>
                                <button onClick={() => {
                                    setShowFixMatch(!showFixMatch);
                                    if (!showFixMatch) setMetadataSearchQuery(editedGame.title);
                                }} className="text-xs text-blue-400 hover:text-blue-300">
                                    {showFixMatch ? 'Cancel Fix' : 'Fix Match'}
                                </button>
                            </div>
                            {!showFixMatch ? (
                                <input
                                    type="text"
                                    value={editedGame.title}
                                    onChange={(e) => updateField('title', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm focus:border-blue-500 focus:outline-none"
                                />
                            ) : (
                                <div className="space-y-2 animate-in fade-in zoom-in-95 duration-200">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={metadataSearchQuery}
                                            onChange={(e) => setMetadataSearchQuery(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleFixMatchSearch()}
                                            className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                                            placeholder="Search..."
                                            autoFocus
                                        />
                                        <button onClick={handleFixMatchSearch} className="bg-blue-600 px-3 rounded text-sm disabled:opacity-50" disabled={isSearchingMetadata}>Search</button>
                                    </div>
                                    {metadataSearchResults.length > 0 && (
                                        <div className="max-h-48 overflow-y-auto bg-gray-800 rounded border border-gray-700">
                                            {metadataSearchResults.map((r) => (
                                                <div key={r.id} onClick={() => handleApplyMatch(r)} className="p-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0">
                                                    <div className="font-medium text-sm text-white">{r.title || r.name}</div>
                                                    <div className="text-xs text-gray-400">{r.year} • {r.platform || r.source}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Description */}
                        <div>
                            <label className="text-xs font-medium text-gray-400 mb-1 block">Description</label>
                            <textarea
                                value={editedGame.description || ''}
                                onChange={(e) => updateField('description', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm min-h-[100px]"
                            />
                        </div>

                        {/* Categories */}
                        <div>
                            <label className="text-xs font-medium text-gray-400 mb-1 block">Categories</label>
                            <div className="flex flex-wrap gap-2 p-2 bg-gray-800 rounded border border-gray-700">
                                {editedGame.categories?.map(cat => (
                                    <span key={cat} className="bg-blue-900/50 text-blue-200 px-2 py-0.5 rounded text-xs flex items-center gap-1 border border-blue-800">
                                        {cat}
                                        <button onClick={() => updateField('categories', (editedGame.categories || []).filter(c => c !== cat))} className="hover:text-white">×</button>
                                    </span>
                                ))}
                                <input
                                    value={newCategoryInput}
                                    onChange={(e) => setNewCategoryInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newCategoryInput.trim()) {
                                            e.preventDefault();
                                            const cat = newCategoryInput.trim();
                                            if (!(editedGame.categories || []).includes(cat)) {
                                                updateField('categories', [...(editedGame.categories || []), cat]);
                                            }
                                            setNewCategoryInput('');
                                        }
                                    }}
                                    className="bg-transparent outline-none text-sm min-w-[50px] flex-1 text-white"
                                    placeholder="Add..."
                                />
                            </div>
                        </div>

                        {/* Grid Fields */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-400 mb-1 block">Release Date</label>
                                <input
                                    type="text"
                                    value={editedGame.releaseDate || ''}
                                    onChange={(e) => updateField('releaseDate', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                                    placeholder="YYYY-MM-DD"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-400 mb-1 block">Age Rating</label>
                                <input
                                    type="text"
                                    value={editedGame.ageRating || ''}
                                    onChange={(e) => updateField('ageRating', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'images' && (
                    <div>
                        <div className="flex gap-2 mb-4 sticky top-0 bg-gray-900 z-10 py-2">
                            <input
                                type="text"
                                value={imageSearchQuery}
                                onChange={(e) => setImageSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchImages(activeImageSearchTab)}
                                placeholder={`Search ${activeImageSearchTab}...`}
                                className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                            />
                            <button onClick={() => handleSearchImages(activeImageSearchTab)} disabled={isSearchingImages} className="bg-purple-600 px-4 rounded text-sm hover:bg-purple-700 disabled:opacity-50">Search</button>
                        </div>
                        <div className="flex gap-1 mb-4 border-b border-gray-800">
                            {(['boxart', 'banner', 'logo', 'icon'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => setActiveImageSearchTab(type)}
                                    className={`px-3 py-2 text-xs font-medium uppercase border-b-2 transition-colors ${activeImageSearchTab === type ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500'}`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            {steamGridDBResults[activeImageSearchTab]?.map((img, idx) => (
                                <div key={idx} onClick={() => applyImage(activeImageSearchTab, img.url)} className="aspect-square relative group bg-gray-800 rounded border border-gray-700 cursor-pointer overflow-hidden">
                                    <img src={img.url} className="w-full h-full object-contain p-1" />
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                        <span className="text-white text-xs font-bold bg-black/50 px-2 py-1 rounded">Apply</span>
                                    </div>
                                </div>
                            ))}
                            {steamGridDBResults[activeImageSearchTab]?.length === 0 && !isSearchingImages && (
                                <div className="col-span-3 text-center text-gray-500 py-8">No images found</div>
                            )}
                            {isSearchingImages && <div className="col-span-3 text-center text-gray-500 py-8 animate-pulse">Searching...</div>}
                        </div>
                    </div>
                )}

                {activeTab === 'modManager' && !isStaged && (
                    <div className="space-y-4">
                        <div>
                            <label className="text-xs font-medium text-gray-400 mb-1 block">Mod Manager URL</label>
                            <input
                                type="text"
                                value={(editedGame as Game).modManagerUrl || ''}
                                onChange={(e) => updateField('modManagerUrl', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-800 bg-gray-800/30 flex justify-between items-center gap-2">
                <div>
                    {error && <span className="text-red-400 text-xs">{error}</span>}
                    {success && <span className="text-green-400 text-xs">{success}</span>}
                </div>
                <div className="flex gap-2">
                    {onCancel && <button onClick={onCancel} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded">Cancel</button>}
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded shadow-lg transition-all disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};
