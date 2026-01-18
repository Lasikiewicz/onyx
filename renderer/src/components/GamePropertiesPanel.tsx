import React, { useState, useEffect, useRef } from 'react';
import { Game } from '../types/game';
import { StagedGame } from '../types/importer';
import {
    EditableGameFields,
    toEditableFields,
    mergeIntoGame,
    mergeIntoStagedGame
} from '../types/EditableGame';

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
    allCategories: _allCategories = [],
    isStaged = false
}) => {
    const [activeTab, setActiveTab] = useState<'metadata' | 'images' | 'modManager'>('metadata');
    const [editedFields, setEditedFields] = useState<EditableGameFields>(() => toEditableFields(game));

    // Undo state: store previous state before Fix Match
    const previousStateRef = useRef<EditableGameFields | null>(null);
    const [canUndo, setCanUndo] = useState(false);

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
        setEditedFields(toEditableFields(game));
        // Reset transient states
        setShowFixMatch(false);
        setMetadataSearchResults([]);
        setError(null);
        setImageSearchQuery('');
        setCanUndo(false);
        previousStateRef.current = null;
    }, [game]);

    const updateField = <K extends keyof EditableGameFields>(field: K, value: EditableGameFields[K]) => {
        setEditedFields(prev => ({ ...prev, [field]: value }));
    };

    // --- Undo ---
    const handleUndo = () => {
        if (previousStateRef.current) {
            setEditedFields(previousStateRef.current);
            previousStateRef.current = null;
            setCanUndo(false);
            setSuccess('Reverted to previous state');
            setTimeout(() => setSuccess(null), 2000);
        }
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
        // Store current state for undo
        previousStateRef.current = { ...editedFields };

        try {
            if (!isStaged && 'id' in game) {
                // Use existing API for real games
                await window.electronAPI.fetchAndUpdateByProviderId((game as Game).id, result.id, result.source);
                setSuccess("Match fixed!");
                setShowFixMatch(false);
                setCanUndo(true);
                // Trigger parent reload
                const merged = mergeIntoGame(game as Game, editedFields);
                if (onSave) onSave(merged);
            } else {
                // For Staged / Import: Fetch Metadata and Apply to Local State
                const metadata = await window.electronAPI.searchArtwork(result.title, result.steamAppId);
                if (metadata) {
                    setEditedFields(prev => ({
                        ...prev,
                        title: metadata.title || prev.title,
                        description: metadata.description || prev.description,
                        releaseDate: metadata.releaseDate || prev.releaseDate,
                        genres: metadata.genres || prev.genres,
                        developers: metadata.developers || prev.developers,
                        publishers: metadata.publishers || prev.publishers,
                        categories: metadata.categories || prev.categories,
                        boxArtUrl: metadata.boxArtUrl || prev.boxArtUrl,
                        bannerUrl: metadata.bannerUrl || prev.bannerUrl,
                        logoUrl: metadata.logoUrl || prev.logoUrl,
                        heroUrl: metadata.heroUrl || prev.heroUrl,
                        iconUrl: metadata.iconUrl || prev.iconUrl,
                    }));
                    setShowFixMatch(false);
                    setCanUndo(true);
                    setSuccess("Metadata applied!");
                }
            }
        } catch (err) {
            setError("Failed to apply match");
            previousStateRef.current = null;
        }
    };

    // --- Image Search ---
    const handleSearchImages = async (type: 'boxart' | 'banner' | 'logo' | 'icon') => {
        const query = imageSearchQuery || editedFields.title;
        if (!query) return;

        setIsSearchingImages(true);
        setSteamGridDBResults(prev => ({ ...prev, [type]: [] }));

        try {
            const steamAppId = (game as any).appId || (game as any).steamAppId;
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

    const applyImage = (type: 'boxart' | 'banner' | 'logo' | 'icon', url: string) => {
        const fieldMap = {
            boxart: 'boxArtUrl',
            banner: 'bannerUrl',
            logo: 'logoUrl',
            icon: 'iconUrl'
        } as const;
        updateField(fieldMap[type], url);
        setSuccess(`Applied ${type}`);
        setTimeout(() => setSuccess(null), 2000);
    };

    // Save Handler
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const merged = isStaged
                ? mergeIntoStagedGame(game as StagedGame, editedFields)
                : mergeIntoGame(game as Game, editedFields);
            await onSave(merged);
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
                const fieldMap = { boxart: 'boxArtUrl', logo: 'logoUrl', banner: 'bannerUrl', icon: 'iconUrl' } as const;
                const val = editedFields[fieldMap[type]];
                const label = type.charAt(0).toUpperCase() + type.slice(1);

                return (
                    <div
                        key={type}
                        onClick={() => {
                            setActiveTab('images');
                            setActiveImageSearchTab(type);
                            setImageSearchQuery(editedFields.title);
                            handleSearchImages(type);
                        }}
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
                                <div className="flex gap-2">
                                    {canUndo && (
                                        <button onClick={handleUndo} className="text-xs text-yellow-400 hover:text-yellow-300">
                                            Undo
                                        </button>
                                    )}
                                    <button onClick={() => {
                                        setShowFixMatch(!showFixMatch);
                                        if (!showFixMatch) setMetadataSearchQuery(editedFields.title);
                                    }} className="text-xs text-blue-400 hover:text-blue-300">
                                        {showFixMatch ? 'Cancel Fix' : 'Fix Match'}
                                    </button>
                                </div>
                            </div>
                            {!showFixMatch ? (
                                <input
                                    type="text"
                                    value={editedFields.title}
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
                                value={editedFields.description || ''}
                                onChange={(e) => updateField('description', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm min-h-[100px]"
                            />
                        </div>

                        {/* Categories */}
                        <div>
                            <label className="text-xs font-medium text-gray-400 mb-1 block">Categories</label>
                            <div className="flex flex-wrap gap-2 p-2 bg-gray-800 rounded border border-gray-700">
                                {editedFields.categories?.map(cat => (
                                    <span key={cat} className="bg-blue-900/50 text-blue-200 px-2 py-0.5 rounded text-xs flex items-center gap-1 border border-blue-800">
                                        {cat}
                                        <button onClick={() => updateField('categories', (editedFields.categories || []).filter(c => c !== cat))} className="hover:text-white">×</button>
                                    </span>
                                ))}
                                <input
                                    value={newCategoryInput}
                                    onChange={(e) => setNewCategoryInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newCategoryInput.trim()) {
                                            e.preventDefault();
                                            const cat = newCategoryInput.trim();
                                            if (!(editedFields.categories || []).includes(cat)) {
                                                updateField('categories', [...(editedFields.categories || []), cat]);
                                            }
                                            setNewCategoryInput('');
                                        }
                                    }}
                                    className="bg-transparent outline-none text-sm min-w-[50px] flex-1 text-white"
                                    placeholder="Add..."
                                />
                            </div>
                        </div>

                        {/* Genres */}
                        <div>
                            <label className="text-xs font-medium text-gray-400 mb-1 block">Genres</label>
                            <div className="text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded p-2">
                                {editedFields.genres?.join(', ') || <span className="text-gray-500 italic">None</span>}
                            </div>
                        </div>

                        {/* Grid Fields */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-400 mb-1 block">Release Date</label>
                                <input
                                    type="text"
                                    value={editedFields.releaseDate || ''}
                                    onChange={(e) => updateField('releaseDate', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                                    placeholder="YYYY-MM-DD"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-400 mb-1 block">Age Rating</label>
                                <input
                                    type="text"
                                    value={editedFields.ageRating || ''}
                                    onChange={(e) => updateField('ageRating', e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                                />
                            </div>
                        </div>

                        {/* Developers / Publishers */}
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs font-medium text-gray-400 mb-1 block">Developers</label>
                                <div className="text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded p-2 truncate">
                                    {editedFields.developers?.join(', ') || <span className="text-gray-500 italic">Unknown</span>}
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-400 mb-1 block">Publishers</label>
                                <div className="text-sm text-gray-300 bg-gray-800 border border-gray-700 rounded p-2 truncate">
                                    {editedFields.publishers?.join(', ') || <span className="text-gray-500 italic">Unknown</span>}
                                </div>
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
                                    <img src={img.url} className="w-full h-full object-contain p-1" alt="" />
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
                                value={(game as Game).modManagerUrl || ''}
                                onChange={() => {
                                    // Mod manager is on the original game, not editable fields
                                    // This would need special handling if we want to edit it
                                }}
                                className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                                placeholder="https://..."
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
                    {onDelete && !isStaged && (
                        <button onClick={onDelete} className="px-3 py-1.5 bg-red-900/50 hover:bg-red-800 text-red-300 text-sm rounded border border-red-800">
                            Delete
                        </button>
                    )}
                    {onCancel && <button onClick={onCancel} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded">Cancel</button>}
                    <button onClick={handleSave} disabled={isSaving} className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded shadow-lg transition-all disabled:opacity-50">
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};
