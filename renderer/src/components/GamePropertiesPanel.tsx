import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Game } from '../types/game';
import { StagedGame } from '../types/importer';
import {
    EditableGameFields,
    toEditableFields,
    mergeIntoGame,
    mergeIntoStagedGame
} from '../types/EditableGame';
import { LinkIcon, inferLinkKey } from './GameLinks';

export interface GamePropertiesPanelHandle {
    /** Flush current edits to parent and return the merged game (e.g. before Import). */
    saveToParent: () => Promise<Game | StagedGame | undefined>;
}

interface GamePropertiesPanelProps {
    game: Game | StagedGame;
    onSave: (game: Game | StagedGame) => Promise<void> | void;
    onCancel?: () => void;
    onDelete?: () => void;
    allCategories?: string[];
    isStaged?: boolean;
    /** When true, all editing is disabled and a reason notice is shown (e.g. during scan). */
    editingDisabled?: boolean;
    editingDisabledReason?: string;
}

export const GamePropertiesPanel = forwardRef<GamePropertiesPanelHandle, GamePropertiesPanelProps>(({
    game,
    onSave,
    onCancel,
    onDelete,
    allCategories: _allCategories = [],
    isStaged = false,
    editingDisabled = false,
    editingDisabledReason
}, ref) => {
    const [activeTab, setActiveTab] = useState<'metadata' | 'images' | 'links' | 'modManager'>('metadata');
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
    const [activeImageSearchTab, setActiveImageSearchTab] = useState<'all' | 'boxart' | 'banner' | 'logo' | 'icon' | 'alternativeBanner'>('all');
    const [steamGridDBResults, setSteamGridDBResults] = useState<{
        boxart: any[];
        banner: any[];
        alternativeBanner: any[];
        logo: any[];
        icon: any[];
    }>({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });

    // Fast Search State
    const [isFastSearching, setIsFastSearching] = useState(false);
    const [fastSearchResults, setFastSearchResults] = useState<any[]>([]);

    const [showAnimatedImages, setShowAnimatedImages] = useState(false);
    const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(new Set());

    const fastSearchRunIdRef = useRef(0);
    const imageSearchRunIdRef = useRef(0);
    const fastSearchActiveRunIdRef = useRef(0);

    // General State
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [newCategoryInput, setNewCategoryInput] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        setEditedFields(toEditableFields(game));
        setFailedImageUrls(new Set());
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
            // searchGames returns an array directly, not a {success, results} wrapper
            const response = await window.electronAPI.searchGames(metadataSearchQuery);
            if (Array.isArray(response) && response.length > 0) {
                setMetadataSearchResults(response);
            } else {
                setError('No results found');
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
    const handleSearchImages = async (type: 'boxart' | 'banner' | 'logo' | 'icon' | 'alternativeBanner') => {
        const query = imageSearchQuery || editedFields.title;
        if (!query) return;

        const runId = ++imageSearchRunIdRef.current;

        setIsSearchingImages(true);
        setSteamGridDBResults(prev => ({ ...prev, [type]: [] }));

        console.log('[ImporterImageSearch] start', {
            runId,
            type,
            query,
            gameId: (game as any).id,
            steamAppId: (game as any).appId || (game as any).steamAppId,
            showAnimatedImages,
            timestamp: new Date().toISOString()
        });

        try {
            const steamAppId = (game as any).appId || (game as any).steamAppId;
            // For alternativeBanner, search using 'banner' type since both use the same source
            const searchType = type === 'alternativeBanner' ? 'banner' : type;
            const response = await window.electronAPI.searchImages(query, searchType, steamAppId);
            if (response.success && response.images) {
                const flattened = response.images.flatMap(r => r.images || []);
                setSteamGridDBResults(prev => ({ ...prev, [type]: flattened }));
            }
        } catch (err) {
            console.error('[ImporterImageSearch] error', { runId, query, err });
        } finally {
            setIsSearchingImages(false);
            console.log('[ImporterImageSearch] end', { runId, query, timestamp: new Date().toISOString() });
        }
    };

    const applyImage = (type: 'boxart' | 'banner' | 'logo' | 'icon' | 'alternativeBanner', url: string) => {
        const fieldMap = {
            boxart: 'boxArtUrl',
            banner: 'bannerUrl',
            alternativeBanner: 'alternativeBannerUrl',
            logo: 'logoUrl',
            icon: 'iconUrl'
        } as const;
        updateField(fieldMap[type], url);
        setSuccess(`Applied ${type === 'alternativeBanner' ? 'Alt Banner' : type}`);
        setTimeout(() => setSuccess(null), 2000);
    };

    // Fast Search Handler - Aggregated instant search
    const handleFastSearch = async () => {
        const query = imageSearchQuery || editedFields.title;
        if (!query) {
            setError('Please enter a game title to search');
            return;
        }

        const runId = ++fastSearchRunIdRef.current;
        fastSearchActiveRunIdRef.current = runId;
        setIsFastSearching(true);
        setError(null);
        setFastSearchResults([]);

        const removeProgressListener = window.electronAPI?.on
            ? window.electronAPI.on('metadata:fastSearchProgress', (_event: any, data: any) => {
                const results = Array.isArray(data) ? data : (data.results || []);
                const responseRequestId = Array.isArray(data) ? undefined : data.requestId;

                if (responseRequestId && responseRequestId !== fastSearchActiveRunIdRef.current) {
                    console.log('[ImporterFastSearch] discard progress (requestId mismatch)', {
                        runId,
                        responseRequestId,
                        expectedRequestId: fastSearchActiveRunIdRef.current
                    });
                    return;
                }

                console.log('[ImporterFastSearch] progress', {
                    runId,
                    query,
                    resultsCount: results.length,
                    timestamp: new Date().toISOString()
                });
                setFastSearchResults(prev => {
                    const currentIds = new Set(prev.map(p => `${p.source}:${p.id}`));
                    const newItems = results.filter((r: any) => !currentIds.has(`${r.source}:${r.id}`));
                    return [...prev, ...newItems];
                });
            })
            : () => { };

        try {
            console.log(`[FastSearch] Searching for "${query}"...`);
            const startTime = Date.now();

            const response = await (window.electronAPI as any).fastImageSearch(query, runId);

            console.log(`[FastSearch] Completed in ${Date.now() - startTime}ms`);

            if (response && (response.boxArtUrl || response.bannerUrl || response.logoUrl || response.heroUrl)) {
                const syntheticResult = {
                    id: Date.now(),
                    name: query,
                    coverUrl: response.boxArtUrl || '',
                    bannerUrl: response.bannerUrl || response.heroUrl || '',
                    logoUrl: response.logoUrl || '',
                    screenshotUrls: response.screenshots || [],
                    source: 'Best Match'
                };

                setFastSearchResults(prev => (prev.length === 0 ? [syntheticResult] : prev));
                handleSelectFastGame(syntheticResult);
                setSuccess(`Found metadata in ${Date.now() - startTime}ms`);
                setTimeout(() => setSuccess(null), 3000);
            } else if (response.success && response.games && response.games.length > 0) {
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
            console.error('[ImporterFastSearch] error', { runId, query, err });
        } finally {
            if (typeof removeProgressListener === 'function') {
                removeProgressListener();
            }
            setIsFastSearching(false);
            console.log('[ImporterFastSearch] end', { runId, query, timestamp: new Date().toISOString() });
        }
    };

    const handleSelectFastGame = async (gameResult: any) => {

        console.log('[ImporterFastSearch] select result', {
            resultId: gameResult.id,
            resultName: gameResult.name,
            resultSource: gameResult.source,
            gameId: (game as any).id,
            showAnimatedImages,
            timestamp: new Date().toISOString()
        });

        setFastSearchResults([]);
        setIsSearchingImages(true);
        setError(null);

        try {
            const steamAppId = (game as any).appId || (game as any).steamAppId;
            const igdbIdParam = (() => {
                if (gameResult.source !== 'igdb') return undefined;
                if (typeof gameResult.id === 'number' && Number.isFinite(gameResult.id)) return gameResult.id;
                if (typeof gameResult.id === 'string' && gameResult.id.startsWith('igdb-')) {
                    const parsed = Number(gameResult.id.replace('igdb-', ''));
                    return Number.isFinite(parsed) ? parsed : undefined;
                }
                return undefined;
            })();

            const response = await (window.electronAPI as any).fetchGameImages(
                gameResult.name,
                steamAppId,
                igdbIdParam,
                showAnimatedImages,
                fastSearchActiveRunIdRef.current
            );

            if (response.success && response.images) {
                const categorized = { boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] } as any;
                const seenUrls = new Set<string>();

                response.images.forEach((img: any) => {
                    const dedupeKey = `${img.url}|${img.source}|${img.type}`;
                    if (!img.url || seenUrls.has(dedupeKey)) return;
                    seenUrls.add(dedupeKey);

                    const normalizedType = img.type === 'hero' || img.type === 'screenshot' ? 'banner' : img.type;
                    if (normalizedType === 'alternativeBanner') {
                        categorized.alternativeBanner.push(img);
                    } else if (categorized[normalizedType]) {
                        categorized[normalizedType].push(img);
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

    // Expose save so parent can flush edits before Import
    useImperativeHandle(ref, () => ({
        saveToParent: async () => {
            const merged = isStaged
                ? mergeIntoStagedGame(game as StagedGame, editedFields)
                : mergeIntoGame(game as Game, editedFields);
            if (onSave) await onSave(merged);
            return merged;
        },
    }), [game, isStaged, editedFields, onSave]);

    // Render Image Strip (compact for metadata tab, full for images tab - matches Game Manager)
    const renderImageStrip = (compact?: boolean) => {
        const sizeClasses = compact
            ? {
                boxart: 'h-24 w-auto aspect-[2/3]',
                logo: 'h-24 w-36',
                banner: 'h-24 flex-1',
                alternativeBanner: 'h-24 flex-1',
                icon: 'h-24 w-24',
            }
            : {
                boxart: 'h-36 w-auto aspect-[2/3]',
                logo: 'h-36 w-56',
                banner: 'h-36 flex-1',
                alternativeBanner: 'h-36 flex-1',
                icon: 'h-36 w-36',
            };
        return (
            <div className={`flex gap-2 ${compact ? 'mb-6 p-3 bg-gray-900/50 rounded-lg border border-gray-800' : 'mb-4 items-start p-2 bg-gray-900/95 rounded-lg border border-gray-800'}`}>
                {(['boxart', 'logo', 'banner', 'alternativeBanner', 'icon'] as const).map(type => {
                    const fieldMap = { boxart: 'boxArtUrl', logo: 'logoUrl', banner: 'bannerUrl', alternativeBanner: 'alternativeBannerUrl', icon: 'iconUrl' } as const;
                    const val = editedFields[fieldMap[type]];
                    const label = type === 'alternativeBanner' ? 'Alt Banner' : type.charAt(0).toUpperCase() + type.slice(1);
                    const sizeClass = sizeClasses[type];

                    return (
                        <div
                            key={type}
                            onClick={() => {
                                setActiveTab('images');
                                setActiveImageSearchTab(type);
                                if (!editingDisabled) {
                                    setImageSearchQuery(editedFields.title);
                                    handleSearchImages(type);
                                }
                            }}
                            className={`${sizeClass} relative group cursor-pointer border border-gray-700 rounded-lg overflow-hidden bg-gray-800 hover:border-green-500 transition-colors flex-shrink-0`}
                        >
                            {val && !failedImageUrls.has(val) ? (
                                type === 'boxart' || type === 'banner' || type === 'alternativeBanner' ? (
                                    <img src={val} className="w-full h-full object-cover" alt={label} onError={() => { if (!editingDisabled) { setFailedImageUrls(prev => new Set(prev).add(val)); updateField(fieldMap[type], ''); } }} />
                                ) : (
                                    <div className="w-full h-full p-2 flex items-center justify-center">
                                        <img src={val} className="max-w-full max-h-full object-contain" alt={label} onError={() => { if (!editingDisabled) { setFailedImageUrls(prev => new Set(prev).add(val)); updateField(fieldMap[type], ''); } }} />
                                    </div>
                                )
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <span className={`text-gray-600 text-center p-1 ${type === 'icon' ? 'text-[10px]' : 'text-[8px]'}`}>
                                        {type === 'boxart' ? 'Boxart' : type === 'icon' ? 'Icon' : type === 'alternativeBanner' ? 'Alt Banner' : type === 'logo' ? 'Logo' : 'Banner'}
                                    </span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="text-[10px] text-white font-medium">{editingDisabled ? 'View' : 'Edit'}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-900 text-white rounded-lg shadow-xl overflow-hidden border border-gray-800">
            {/* Tabs - same style as Game Manager */}
            <div className="flex border-b border-gray-800 flex-shrink-0">
                <button onClick={() => setActiveTab('metadata')} className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'metadata' ? 'bg-gray-800 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'}`}>Metadata</button>
                <button onClick={() => setActiveTab('images')} className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'images' ? 'bg-gray-800 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'}`}>Images</button>
                <button onClick={() => setActiveTab('links')} className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'links' ? 'bg-gray-800 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'}`}>Links</button>
                <button onClick={() => setActiveTab('modManager')} className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'modManager' ? 'bg-gray-800 text-white border-b-2 border-blue-500' : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'}`}>Mod Manager</button>
            </div>

            {editingDisabled && (
                <div className="px-4 py-3 bg-amber-500/20 border-b border-amber-500/30 text-amber-200 text-sm flex items-center gap-2 shrink-0">
                    <span className="inline-block w-5 h-5 rounded-full bg-amber-500/50 flex items-center justify-center text-amber-900 font-bold" title="Scan in progress">!</span>
                    <span>{editingDisabledReason ?? 'Editing is disabled. Please wait for the current operation to finish.'}</span>
                </div>
            )}

            {/* Content */}
            <div className={`flex-1 overflow-y-auto p-4 custom-scrollbar`}>
                {activeTab === 'metadata' && (
                    <div className="space-y-4">
                        {/* Compact image strip - same as Game Manager */}
                        {renderImageStrip(true)}

                        {/* Title row with Fix Match - compact */}
                        <div>
                            <label className="block text-xs font-medium text-gray-400 mb-1">Title</label>
                            <div className="flex gap-2">
                                {canUndo && (
                                    <button onClick={handleUndo} disabled={editingDisabled} className="px-2 py-1.5 text-xs text-yellow-400 hover:text-yellow-300 bg-gray-700 rounded disabled:opacity-50">
                                        Undo
                                    </button>
                                )}
                                <input
                                    type="text"
                                    value={!showFixMatch ? editedFields.title : metadataSearchQuery}
                                    onChange={(e) => showFixMatch ? setMetadataSearchQuery(e.target.value) : updateField('title', e.target.value)}
                                    onKeyDown={(e) => showFixMatch && e.key === 'Enter' && handleFixMatchSearch()}
                                    placeholder={showFixMatch ? 'Enter game title to search...' : ''}
                                    className="flex-1 px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                    disabled={editingDisabled || (showFixMatch && isSearchingMetadata)}
                                />
                                {showFixMatch && (
                                    <button onClick={handleFixMatchSearch} disabled={editingDisabled || isSearchingMetadata} className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2">
                                        {isSearchingMetadata ? (
                                            <><span className="animate-pulse">Searching...</span></>
                                        ) : (
                                            'Search'
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={() => { setShowFixMatch(!showFixMatch); if (!showFixMatch) setMetadataSearchQuery(editedFields.title); }}
                                    disabled={editingDisabled}
                                    className="px-3 py-1.5 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                >
                                    {showFixMatch ? 'Hide' : 'Fix Match'}
                                </button>
                            </div>
                        </div>

                        {/* Fix Match results */}
                        {showFixMatch && metadataSearchResults.length > 0 && (
                            <div className="max-h-48 overflow-y-auto bg-gray-800 rounded border border-gray-700">
                                {metadataSearchResults.map((r) => (
                                    <div key={r.id} onClick={() => !editingDisabled && handleApplyMatch(r)} className={`p-2 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-0 ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                        <div className="font-medium text-sm text-white">{r.title || r.name}</div>
                                        <div className="text-xs text-gray-400">{r.year} • {r.platform || r.source}</div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Description + Categories row - compact like Game Manager */}
                        <div className="flex flex-col lg:flex-row gap-4">
                            <div className="flex-1">
                                <label className="block text-xs font-medium text-gray-400 mb-1">Description</label>
                                <textarea
                                    value={editedFields.description || ''}
                                    onChange={(e) => updateField('description', e.target.value)}
                                    className="w-full px-3 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                    disabled={editingDisabled}
                                    rows={4}
                                />
                            </div>
                            <div className="w-full lg:w-[35%] flex flex-col">
                                <label className="block text-xs font-medium text-gray-400 mb-1">Categories</label>
                                <div className="p-2 bg-gray-800/50 rounded border border-gray-700 flex flex-col gap-2 max-h-[104px] overflow-y-auto">
                                    <div className="flex flex-wrap gap-1">
                                        {editedFields.categories?.map(cat => (
                                            <span key={cat} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium bg-blue-900/30 text-blue-200 border border-blue-700/30 rounded-full">
                                                {cat}
                                                <button onClick={() => !editingDisabled && updateField('categories', (editedFields.categories || []).filter(c => c !== cat))} disabled={editingDisabled} className="ml-0.5 text-blue-400 hover:text-white disabled:opacity-50">×</button>
                                            </span>
                                        ))}
                                    </div>
                                    <input
                                        value={newCategoryInput}
                                        onChange={(e) => setNewCategoryInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && newCategoryInput.trim()) {
                                                e.preventDefault();
                                                const cat = newCategoryInput.trim();
                                                if (!(editedFields.categories || []).includes(cat)) {
                                                    updateField('categories', [...(editedFields.categories || []), cat]);
                                                    setNewCategoryInput('');
                                                }
                                            }
                                        }}
                                        placeholder="Add category..."
                                        disabled={editingDisabled}
                                        className="w-full bg-transparent border-none text-xs text-white focus:outline-none placeholder-gray-500 disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Metadata grid - 5 columns, compact uppercase labels (Game Manager style) */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Release Date</label>
                                <input
                                    type="text"
                                    value={editedFields.releaseDate || ''}
                                    onChange={(e) => updateField('releaseDate', e.target.value)}
                                    placeholder="YYYY-MM-DD"
                                    disabled={editingDisabled}
                                    className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Age Rating</label>
                                <input
                                    type="text"
                                    value={editedFields.ageRating || ''}
                                    onChange={(e) => updateField('ageRating', e.target.value)}
                                    disabled={editingDisabled}
                                    className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Genres</label>
                                <input
                                    type="text"
                                    value={editedFields.genres?.join(', ') || ''}
                                    onChange={(e) => updateField('genres', e.target.value.split(',').map(g => g.trim()).filter(Boolean))}
                                    disabled={editingDisabled}
                                    className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Developers</label>
                                <input
                                    type="text"
                                    value={editedFields.developers?.join(', ') || ''}
                                    onChange={(e) => updateField('developers', e.target.value.split(',').map(d => d.trim()).filter(Boolean))}
                                    disabled={editingDisabled}
                                    className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Publishers</label>
                                <input
                                    type="text"
                                    value={editedFields.publishers?.join(', ') || ''}
                                    onChange={(e) => updateField('publishers', e.target.value.split(',').map(p => p.trim()).filter(Boolean))}
                                    disabled={editingDisabled}
                                    className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                />
                            </div>
                            {isStaged && (game as StagedGame).source !== undefined && (
                                <div>
                                    <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Source</label>
                                    <input
                                        type="text"
                                        value={(game as StagedGame).source ?? ''}
                                        readOnly
                                        className="w-full px-2 py-1 text-xs bg-gray-800/50 border border-gray-600 rounded text-gray-400"
                                    />
                                </div>
                            )}
                            {isStaged && (
                                <>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Install Directory</label>
                                        <input
                                            type="text"
                                            value={editedFields.installPath ?? (game as StagedGame).installPath ?? ''}
                                            onChange={(e) => updateField('installPath', e.target.value)}
                                            disabled={editingDisabled}
                                            className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-[10px] uppercase tracking-wider font-semibold text-gray-500 mb-0.5">Executable Path</label>
                                        <input
                                            type="text"
                                            value={editedFields.exePath ?? (game as StagedGame).exePath ?? ''}
                                            onChange={(e) => updateField('exePath', e.target.value)}
                                            disabled={editingDisabled}
                                            className="w-full px-2 py-1 text-xs bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'images' && (
                    <div>
                        {/* Image strip - full size, same as Game Manager Images tab */}
                        {renderImageStrip(false)}

                        {/* Search Input */}
                        <div className="flex gap-2 mb-4 sticky top-0 bg-gray-900 z-10 py-2">
                            <input
                                type="text"
                                value={imageSearchQuery}
                                onChange={(e) => setImageSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && (activeImageSearchTab === 'all' ? handleFastSearch() : handleSearchImages(activeImageSearchTab))}
                                placeholder="Enter game title..."
                                className="flex-1 bg-gray-800 border border-gray-700 rounded p-2 text-sm"
                            />
                            {/* Quick All Button */}
                            <button
                                onClick={handleFastSearch}
                                disabled={editingDisabled || isFastSearching || isSearchingImages}
                                className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold rounded transition-all shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                title="Quick search all image types at once"
                            >
                                {isFastSearching ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>Fast...</span>
                                    </>
                                ) : (
                                    <>
                                        <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        <span>Quick All</span>
                                    </>
                                )}
                            </button>
                            <button
                                onClick={() => activeImageSearchTab === 'all' ? handleFastSearch() : handleSearchImages(activeImageSearchTab)}
                                disabled={editingDisabled || isSearchingImages}
                                className="bg-purple-600 px-4 rounded text-sm hover:bg-purple-700 disabled:opacity-50"
                            >
                                Search
                            </button>
                            <button
                                onClick={() => {
                                    setSteamGridDBResults({ boxart: [], banner: [], alternativeBanner: [], logo: [], icon: [] });
                                    setFastSearchResults([]);
                                }}
                                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded transition-colors disabled:opacity-50"
                                disabled={editingDisabled || isSearchingImages}
                            >
                                Clear
                            </button>
                            <button
                                onClick={() => setShowAnimatedImages(!showAnimatedImages)}
                                disabled={editingDisabled}
                                className={`px-3 py-2 rounded border transition-colors flex items-center gap-2 ${showAnimatedImages
                                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                    : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                                    } disabled:opacity-50`}
                                title="Include animated images (GIF/WebP) in search results"
                            >
                                <svg className="w-4 h-4 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                                            onClick={() => !editingDisabled && handleSelectFastGame(result)}
                                            className={`flex items-center gap-2 p-2 bg-gray-800 rounded border border-gray-700 hover:border-green-500 cursor-pointer transition-colors ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                        <div className="flex gap-1 mb-4 border-b border-gray-800 overflow-x-auto">
                            {(['all', 'boxart', 'logo', 'banner', 'alternativeBanner', 'icon'] as const).map(type => {
                                let count = 0;
                                if (type === 'all') {
                                    count = steamGridDBResults.boxart.length + steamGridDBResults.logo.length + steamGridDBResults.banner.length + steamGridDBResults.alternativeBanner.length + steamGridDBResults.icon.length;
                                } else {
                                    count = steamGridDBResults[type]?.length || 0;
                                }

                                return (
                                    <button
                                        key={type}
                                        onClick={() => setActiveImageSearchTab(type)}
                                        className={`px-3 py-2 text-xs font-medium uppercase border-b-2 transition-colors whitespace-nowrap ${activeImageSearchTab === type ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                                    >
                                        {type === 'alternativeBanner' ? 'Alt Banner' : type} <span className="ml-1 opacity-70">({count})</span>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Results Grid - Different layouts per type */}
                        {activeImageSearchTab === 'all' && (
                            <div className="space-y-8 pb-8">
                                {Object.values(steamGridDBResults).every(arr => arr.length === 0) && !isSearchingImages && (
                                    <div className="text-center text-gray-500 py-12 flex flex-col items-center">
                                        <svg className="w-12 h-12 mb-4 opacity-20 group- hover:animate-edit-image group-hover:animate-edit-image" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <p>No images found. Click "Quick All" to search everywhere.</p>
                                    </div>
                                )}

                                {/* Boxart Section */}
                                {steamGridDBResults.boxart.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-800 pb-1 flex justify-between">
                                            Boxart <span className="bg-gray-800 px-2 rounded text-gray-400">{steamGridDBResults.boxart.length}</span>
                                        </h4>
                                        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
                                            {steamGridDBResults.boxart.map((result: any, idx: number) => {
                                                const url = result.url || result.boxArtUrl || result.coverUrl;
                                                if (!url) return null;
                                                return (
                                                    <div
                                                        key={`all-boxart-${idx}`}
                                                        onClick={() => !editingDisabled && applyImage('boxart', url)}
                                                        className={`group cursor-pointer ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                                                <p className="text-[10px] text-white truncate text-center">{result.source || 'SteamGridDB'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Logo Section */}
                                {steamGridDBResults.logo.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-800 pb-1 flex justify-between">
                                            Logo <span className="bg-gray-800 px-2 rounded text-gray-400">{steamGridDBResults.logo.length}</span>
                                        </h4>
                                        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                                            {steamGridDBResults.logo.map((result: any, idx: number) => {
                                                const url = result.url || result.logoUrl;
                                                if (!url) return null;
                                                return (
                                                    <div
                                                        key={`all-logo-${idx}`}
                                                        onClick={() => !editingDisabled && applyImage('logo', url)}
                                                        className={`group cursor-pointer flex items-center justify-center p-3 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all aspect-video ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <img src={url} alt="Logo" className="max-w-full max-h-full object-contain" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Banner Section */}
                                {steamGridDBResults.banner.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-800 pb-1 flex justify-between">
                                            Banner <span className="bg-gray-800 px-2 rounded text-gray-400">{steamGridDBResults.banner.length}</span>
                                        </h4>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                            {steamGridDBResults.banner.map((result: any, idx: number) => {
                                                const url = result.url || result.bannerUrl;
                                                if (!url) return null;
                                                return (
                                                    <div
                                                        key={`all-banner-${idx}`}
                                                        onClick={() => !editingDisabled && applyImage('banner', url)}
                                                        className={`group cursor-pointer ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                                                <p className="text-[10px] text-white truncate text-center">{result.source || 'SteamGridDB'}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Icon Section */}
                                {steamGridDBResults.icon.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 border-b border-gray-800 pb-1 flex justify-between">
                                            Icon <span className="bg-gray-800 px-2 rounded text-gray-400">{steamGridDBResults.icon.length}</span>
                                        </h4>
                                        <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-3 bg-gray-900/50 p-4 rounded-lg border border-gray-800">
                                            {steamGridDBResults.icon.map((result: any, idx: number) => {
                                                const url = result.url || result.iconUrl;
                                                if (!url) return null;
                                                return (
                                                    <div
                                                        key={`all-icon-${idx}`}
                                                        onClick={() => !editingDisabled && applyImage('icon', url)}
                                                        className={`group cursor-pointer flex items-center justify-center p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all aspect-square ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <img src={url} alt="Icon" className="w-full h-full object-contain" />
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeImageSearchTab === 'boxart' && (
                            <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-3">
                                {steamGridDBResults.boxart.map((result: any, idx: number) => {
                                    const url = result.url || result.boxArtUrl || result.coverUrl;
                                    if (!url) return null;
                                    return (
                                        <div
                                            key={`boxart-${idx}`}
                                            onClick={() => !editingDisabled && applyImage('boxart', url)}
                                            className={`group cursor-pointer ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                                    <p className="text-[10px] text-white truncate text-center">{result.source || 'SteamGridDB'}</p>
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
                                            onClick={() => !editingDisabled && applyImage('logo', url)}
                                            className={`group cursor-pointer flex items-center justify-center p-3 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all aspect-video ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                            onClick={() => !editingDisabled && applyImage('banner', url)}
                                            className={`group cursor-pointer ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                                    <p className="text-[10px] text-white truncate text-center">{result.source || 'SteamGridDB'}</p>
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

                        {activeImageSearchTab === 'alternativeBanner' && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {steamGridDBResults.alternativeBanner.map((result: any, idx: number) => {
                                    const url = result.url || result.bannerUrl;
                                    if (!url) return null;
                                    return (
                                        <div
                                            key={`alt-banner-${idx}`}
                                            onClick={() => !editingDisabled && applyImage('alternativeBanner', url)}
                                            className={`group cursor-pointer ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                                                    <p className="text-[10px] text-white truncate text-center">{result.source || 'SteamGridDB'}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {steamGridDBResults.alternativeBanner.length === 0 && !isSearchingImages && (
                                    <div className="col-span-full text-center text-gray-500 py-8">No alt banners found</div>
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
                                            onClick={() => !editingDisabled && applyImage('icon', url)}
                                            className={`group cursor-pointer flex items-center justify-center p-2 rounded bg-gray-800/50 border border-gray-700 hover:border-green-500 hover:bg-gray-800 transition-all aspect-square ${editingDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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

                {activeTab === 'links' && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">Links</label>
                            <button
                                type="button"
                                onClick={() => updateField('links', [...(editedFields.links || []), { name: '', url: '' }])}
                                disabled={editingDisabled}
                                className="text-xs text-blue-400 hover:text-blue-300 font-medium px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                + Add Link
                            </button>
                        </div>
                        {!editedFields.links || editedFields.links.length === 0 ? (
                            <p className="text-sm text-gray-500 italic py-4">No links. Add links manually or they may be filled when you fix metadata match.</p>
                        ) : (
                            <div className="space-y-2">
                                {(editedFields.links || []).map((link, idx) => (
                                    <div key={idx} className="flex gap-2 items-center">
                                        <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded border border-gray-600 bg-gray-800">
                                            <LinkIcon iconKey={inferLinkKey(link.url, link.name)} className="w-[70%] h-[70%]" customIconUrl={link.iconUrl} />
                                        </div>
                                        <input
                                            type="text"
                                            value={link.name}
                                            onChange={(e) => {
                                                const next = [...(editedFields.links || [])];
                                                next[idx] = { ...next[idx], name: e.target.value };
                                                updateField('links', next);
                                            }}
                                            placeholder="Label (e.g. Steam)"
                                            disabled={editingDisabled}
                                            className="w-28 px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                        />
                                        <input
                                            type="text"
                                            value={link.url}
                                            onChange={(e) => {
                                                const next = [...(editedFields.links || [])];
                                                next[idx] = { ...next[idx], url: e.target.value };
                                                updateField('links', next);
                                            }}
                                            placeholder="URL"
                                            disabled={editingDisabled}
                                            className="flex-1 px-2 py-1.5 text-sm bg-gray-800 border border-gray-600 rounded text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => updateField('links', (editedFields.links || []).filter((_, i) => i !== idx))}
                                            disabled={editingDisabled}
                                            className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded shrink-0 disabled:opacity-50"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'modManager' && (
                    <div className="space-y-4">
                        {isStaged ? (
                            <p className="text-sm text-gray-400 py-4">Mod manager can be configured after importing this game (in Game Manager → Mod Manager tab).</p>
                        ) : (
                            <>
                                <div>
                                    <label className="text-xs font-medium text-gray-400 mb-1 block">Mod Manager Link</label>
                                    <input
                                        type="text"
                                        value={(game as Game).modManagerUrl || ''}
                                        readOnly
                                        className="w-full bg-gray-800 border border-gray-700 rounded p-2 text-sm text-gray-400"
                                        placeholder="Configure in Game Manager"
                                    />
                                    <p className="text-xs text-gray-500 mt-2">Edit the mod manager URL in Game Manager.</p>
                                </div>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Footer - same order and style as Game Manager */}
            <div className={`p-4 border-t border-gray-800 bg-gray-800/30 flex justify-between items-center gap-2 shrink-0`}>
                <div>
                    {error && <span className="text-red-400 text-xs">{error}</span>}
                    {success && <span className="text-green-400 text-xs">{success}</span>}
                </div>
                <div className="flex gap-2">
                    <button onClick={handleSave} disabled={isSaving || editingDisabled} className="flex-1 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                    {onCancel && <button onClick={onCancel} disabled={editingDisabled} className="px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Cancel</button>}
                    {onDelete && !isStaged && (
                        <button onClick={onDelete} disabled={editingDisabled} className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Delete
                        </button>
                    )}
                </div>
            </div>
        </div >
    );
});
GamePropertiesPanel.displayName = 'GamePropertiesPanel';
