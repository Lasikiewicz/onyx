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

    // Fast Search State
    const [isFastSearching, setIsFastSearching] = useState(false);
    const [fastSearchResults, setFastSearchResults] = useState<any[]>([]);

    const [showAnimatedImages, setShowAnimatedImages] = useState(false);

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
                    const newFields = {
                        ...editedFields,
                        title: metadata.title || editedFields.title,
                        description: metadata.description || editedFields.description,
                        releaseDate: metadata.releaseDate || editedFields.releaseDate,
                        genres: metadata.genres || editedFields.genres,
                        developers: metadata.developers || editedFields.developers,
                        publishers: metadata.publishers || editedFields.publishers,
                        categories: metadata.categories || editedFields.categories,
                        boxArtUrl: metadata.boxArtUrl || editedFields.boxArtUrl,
                        bannerUrl: metadata.bannerUrl || editedFields.bannerUrl,
                        logoUrl: metadata.logoUrl || editedFields.logoUrl,
                        heroUrl: metadata.heroUrl || editedFields.heroUrl,
                        iconUrl: metadata.iconUrl || editedFields.iconUrl,
                    };
                    setEditedFields(newFields);
                    setShowFixMatch(false);
                    setCanUndo(true);

                    // Auto-save/update parent for Staged games to simulate "re-import"
                    if (isStaged) {
                        const merged = mergeIntoStagedGame(game as StagedGame, newFields);
                        if (onSave) await onSave(merged);
                        setSuccess("Match fixed & Updated!");
                    } else {
                        setSuccess("Metadata applied!");
                    }
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

    // Fast Search Handler - Playnite-style instant search
    const handleFastSearch = async () => {
        const query = imageSearchQuery || editedFields.title;
        if (!query) {
            setError('Please enter a game title to search');
            return;
        }

        setIsFastSearching(true);
        setError(null);
        setFastSearchResults([]);


        try {
            console.log(`[FastSearch] Searching for "${query}"...`);
            const startTime = Date.now();

            const response = await (window.electronAPI as any).fastImageSearch(query);

            console.log(`[FastSearch] Completed in ${Date.now() - startTime}ms`);

            if (response.success && response.games && response.games.length > 0) {
                setFastSearchResults(response.games);
                setSuccess(`Found ${response.games.length} game(s) in ${Date.now() - startTime}ms`);
                setTimeout(() => setSuccess(null), 3000);
            } else if (response.error) {
                setError(response.error);
            } else {
                setError(`No results found for "${query}". Try a different search term.`);
            }
        } catch (err) {
            setError('Failed to search. Check your internet connection and API credentials.');
            console.error('[FastSearch] Error:', err);
        } finally {
            setIsFastSearching(false);
        }
    };

    const handleSelectFastGame = async (gameResult: any) => {

        setFastSearchResults([]);
        setIsSearchingImages(true);
        setError(null);

        try {
            const steamAppId = (game as any).appId || (game as any).steamAppId;
            const response = await (window.electronAPI as any).fetchGameImages(
                gameResult.name,
                steamAppId,
                Number(gameResult.id),
                showAnimatedImages
            );

            if (response.success && response.images) {
                const categorized = { boxart: [], banner: [], logo: [], icon: [] } as any;
                const seenUrls = new Set<string>();

                response.images.forEach((img: any) => {
                    if (!img.url || seenUrls.has(img.url)) return;
                    seenUrls.add(img.url);
                    if (categorized[img.type]) {
                        categorized[img.type].push(img);
                    }
                });

                setSteamGridDBResults(categorized);
                setSuccess(`Showing images for "${gameResult.name}"`);
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(response.error || 'Failed to fetch images');
            }
        } catch (err) {
            console.error('Error fetching game images:', err);
            setError('Failed to fetch images from sources');
        } finally {
            setIsSearchingImages(false);
        }
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

    // Render Image Strip (matching GameManager dimensions)
    const renderImageStrip = () => (
        <div className="flex gap-2 mb-4 items-start p-2 bg-gray-900/95 rounded-lg border border-gray-800">
            {(['boxart', 'logo', 'banner', 'icon'] as const).map(type => {
                const fieldMap = { boxart: 'boxArtUrl', logo: 'logoUrl', banner: 'bannerUrl', icon: 'iconUrl' } as const;
                const val = editedFields[fieldMap[type]];
                const label = type.charAt(0).toUpperCase() + type.slice(1);

                // Match GameManager dimensions exactly
                const sizeClasses =
                    type === 'boxart' ? 'h-36 w-auto aspect-[2/3]' :
                        type === 'logo' ? 'h-36 w-56' :
                            type === 'banner' ? 'h-36 flex-1' :
                                'h-36 w-36'; // icon

                return (
                    <div
                        key={type}
                        onClick={() => {
                            setActiveTab('images');
                            setActiveImageSearchTab(type);
                            setImageSearchQuery(editedFields.title);
                            handleSearchImages(type);
                        }}
                        className={`${sizeClasses} relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0`}
                    >
                        {val ? (
                            type === 'boxart' || type === 'banner' ? (
                                <img src={val} className="w-full h-full object-cover" alt={label} />
                            ) : (
                                <div className="w-full h-full p-2 flex items-center justify-center">
                                    <img src={val} className="max-w-full max-h-full object-contain" alt={label} />
                                </div>
                            )
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <span className={`text-gray-600 text-center p-1 ${type === 'icon' ? 'text-[10px]' : 'text-xs'}`}>
                                    {type === 'boxart' ? 'Boxart' : type === 'icon' ? 'Click to search for icon' : `Click to search for ${type}`}
                                </span>
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <span className={`text-white font-medium ${type === 'icon' ? 'text-[10px]' : 'text-xs'}`}>
                                {type === 'icon' ? 'Edit Icon' : type === 'logo' ? 'Edit Logo' : type === 'banner' ? 'Edit Banner' : 'Edit'}
                            </span>
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
                        {/* Image Preview Strip - Same as GameManager */}
                        <div className="p-2 space-y-2 flex-shrink-0 bg-gray-900/95 border-b border-gray-800 mb-4">
                            <div className="flex gap-2 mb-1 items-start">
                                {(['boxart', 'logo', 'banner', 'icon'] as const).map(type => {
                                    const fieldMap = { boxart: 'boxArtUrl', logo: 'logoUrl', banner: 'bannerUrl', icon: 'iconUrl' } as const;
                                    const val = editedFields[fieldMap[type]];

                                    const sizeClasses =
                                        type === 'boxart' ? 'h-36 w-auto aspect-[2/3]' :
                                            type === 'logo' ? 'h-36 w-56' :
                                                type === 'banner' ? 'h-36 flex-1' :
                                                    'h-36 w-36';

                                    return (
                                        <div
                                            key={type}
                                            onClick={() => {
                                                setActiveImageSearchTab(type);
                                                setImageSearchQuery(editedFields.title);
                                                handleSearchImages(type);
                                            }}
                                            className={`${sizeClasses} relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0`}
                                        >
                                            {val ? (
                                                type === 'boxart' || type === 'banner' ? (
                                                    <img src={val} className="w-full h-full object-cover" alt={type} />
                                                ) : (
                                                    <div className="w-full h-full p-2 flex items-center justify-center">
                                                        <img src={val} className="max-w-full max-h-full object-contain" alt={type} />
                                                    </div>
                                                )
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className={`text-gray-600 text-center p-1 ${type === 'icon' ? 'text-[10px]' : type === 'boxart' ? 'text-[8px]' : 'text-xs'}`}>
                                                        {type === 'boxart' ? 'Boxart' : type === 'icon' ? 'Click to search for icon' : `Click to search for ${type}`}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <span className={`text-white font-medium ${type === 'icon' ? 'text-[10px]' : type === 'boxart' ? 'text-[10px]' : 'text-xs'}`}>
                                                    {type === 'icon' ? 'Edit Icon' : type === 'logo' ? 'Edit Logo' : type === 'banner' ? 'Edit Banner' : 'Edit'}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Search Input */}
                        <div className="flex gap-2 mb-4 sticky top-0 bg-gray-900 z-10 py-2">
                            <input
                                type="text"
                                value={imageSearchQuery}
                                onChange={(e) => setImageSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearchImages(activeImageSearchTab)}
                                placeholder="Enter game title..."
                                className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                            />
                            {/* Quick All Button */}
                            <button
                                onClick={handleFastSearch}
                                disabled={isFastSearching || isSearchingImages}
                                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                title="Quick search all image types at once"
                            >
                                {isFastSearching ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>Fast...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span>Quick All</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => handleSearchImages(activeImageSearchTab)}
                                disabled={isSearchingImages}
                                className="bg-purple-600 px-4 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                            >
                                Search
                            </button>
                            <button
                                onClick={() => {
                                    setSteamGridDBResults({ boxart: [], banner: [], logo: [], icon: [] });
                                    setFastSearchResults([]);

                                }}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors"
                                disabled={isSearchingImages}
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => setShowAnimatedImages(!showAnimatedImages)}
                                className={`px-3 py-2 rounded border transition-colors flex items-center gap-2 ${showAnimatedImages
                                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                    : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                                    }`}
                                title="Include animated images (GIF/WebP) in search results"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {showAnimatedImages ? 'Animated' : 'Static'}
                            </button>
                        </div>

                        {/* Fast Search Results */}
                        {fastSearchResults.length > 0 && (
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-sm font-medium text-gray-300">
                                        <span className="text-green-400">⚡</span> Quick Results - Click to see images:
                                    </h4>
                                    <button
                                        onClick={() => {
                                            setFastSearchResults([]);
                                            // setSelectedFastGame(null);
                                        }}
                                        className="text-xs text-gray-400 hover:text-white"
                                    >
                                        Clear
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                                    {fastSearchResults.map((result: any) => (
                                        <div
                                            key={result.id}
                                            onClick={() => handleSelectFastGame(result)}
                                            className="flex items-center gap-2 p-2 bg-gray-800 rounded border border-gray-700 hover:border-green-500 cursor-pointer transition-colors"
                                        >
                                            {result.coverUrl && (
                                                <img src={result.coverUrl} alt="" className="w-10 h-14 object-cover rounded" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="text-sm font-medium text-white truncate">{result.name}</div>
                                                <div className="text-xs text-gray-400">{result.releaseDate ? new Date(result.releaseDate * 1000).getFullYear() : ''}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Tabs */}
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

                        {/* Results Grid - Different layouts per type */}
                        {activeImageSearchTab === 'boxart' && (
                            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
                                {steamGridDBResults.boxart.map((result: any, idx: number) => {
                                    const url = result.url || result.boxArtUrl || result.coverUrl;
                                    if (!url) return null;
                                    return (
                                        <div
                                            key={`boxart-${idx}`}
                                            onClick={() => applyImage('boxart', url)}
                                            className="group cursor-pointer"
                                        >
                                            <div className="aspect-[2/3] rounded overflow-hidden border border-gray-700 bg-gray-800 group-hover:border-green-500 transition-all relative">
                                                <img
                                                    src={url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                        (e.target as HTMLImageElement).parentElement?.parentElement?.remove();
                                                    }}
                                                />
                                                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                                                    <p className="text-[10px] text-white truncate text-center">SteamGridDB</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {steamGridDBResults.boxart.length === 0 && !isSearchingImages && (
                                    <div className="col-span-full text-center text-gray-500 py-8">No box art found</div>
                                )}
                            </div>
                        )}

                        {activeImageSearchTab === 'logo' && (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                                {steamGridDBResults.logo.map((result: any, idx: number) => {
                                    const url = result.url || result.logoUrl;
                                    if (!url) return null;
                                    return (
                                        <div
                                            key={`logo-${idx}`}
                                            onClick={() => applyImage('logo', url)}
                                            className="group cursor-pointer flex items-center justify-center p-3 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all aspect-video"
                                        >
                                            <img src={url} alt="Logo" className="max-w-full max-h-full object-contain" />
                                        </div>
                                    );
                                })}
                                {steamGridDBResults.logo.length === 0 && !isSearchingImages && (
                                    <div className="col-span-full text-center text-gray-500 py-8">No logos found</div>
                                )}
                            </div>
                        )}

                        {activeImageSearchTab === 'banner' && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {steamGridDBResults.banner.map((result: any, idx: number) => {
                                    const url = result.url || result.bannerUrl;
                                    if (!url) return null;
                                    return (
                                        <div
                                            key={`banner-${idx}`}
                                            onClick={() => applyImage('banner', url)}
                                            className="group cursor-pointer"
                                        >
                                            <div className="aspect-video rounded overflow-hidden border border-gray-700 bg-gray-800 group-hover:border-green-500 transition-all relative">
                                                <img
                                                    src={url}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                        (e.target as HTMLImageElement).parentElement?.parentElement?.remove();
                                                    }}
                                                />
                                                <div className="absolute inset-x-0 bottom-0 bg-black/60 p-1 translate-y-full group-hover:translate-y-0 transition-transform">
                                                    <p className="text-[10px] text-white truncate text-center">SteamGridDB</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {steamGridDBResults.banner.length === 0 && !isSearchingImages && (
                                    <div className="col-span-full text-center text-gray-500 py-8">No banners found</div>
                                )}
                            </div>
                        )}

                        {activeImageSearchTab === 'icon' && (
                            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                                {steamGridDBResults.icon.map((result: any, idx: number) => {
                                    const url = result.url || result.iconUrl;
                                    if (!url) return null;
                                    return (
                                        <div
                                            key={`icon-${idx}`}
                                            onClick={() => applyImage('icon', url)}
                                            className="group cursor-pointer flex items-center justify-center p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all aspect-square"
                                        >
                                            <img src={url} alt="Icon" className="w-full h-full object-contain" />
                                        </div>
                                    );
                                })}
                                {steamGridDBResults.icon.length === 0 && !isSearchingImages && (
                                    <div className="col-span-full text-center text-gray-500 py-8">No icons found</div>
                                )}
                            </div>
                        )}

                        {isSearchingImages && <div className="text-center text-gray-500 py-8 animate-pulse">Searching...</div>}
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
        </div >
    );
};
