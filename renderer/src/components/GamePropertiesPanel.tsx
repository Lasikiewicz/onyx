import { useState, useEffect, forwardRef, useImperativeHandle, type KeyboardEvent } from 'react';
import { Game } from '../types/game';
import { StagedGame } from '../types/importer';
import {
    EditableGameFields,
    toEditableFields,
    mergeIntoGame,
    mergeIntoStagedGame
} from '../types/EditableGame';
import { GamePropertiesImageStrip } from './gameProperties/GamePropertiesImageStrip';
import { GamePropertiesImagesTab } from './gameProperties/GamePropertiesImagesTab';
import { GamePropertiesLinksTab } from './gameProperties/GamePropertiesLinksTab';
import { GamePropertiesMetadataTab } from './gameProperties/GamePropertiesMetadataTab';
import { GamePropertiesModManagerTab } from './gameProperties/GamePropertiesModManagerTab';
import { useGamePropertiesMetadata } from './gameProperties/useGamePropertiesMetadata';
import { useGamePropertiesImages } from './gameProperties/useGamePropertiesImages';

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

    // General State
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [newCategoryInput, setNewCategoryInput] = useState('');
    const {
        canUndo,
        handleApplyMatch,
        handleFixMatchSearch,
        handleToggleFixMatch,
        handleUndo,
        isSearchingMetadata,
        metadataSearchQuery,
        metadataSearchResults,
        resetMetadataState,
        setMetadataSearchQuery,
        showFixMatch,
    } = useGamePropertiesMetadata({
        editedFields,
        game,
        isStaged,
        onSave,
        setEditedFields,
        setError,
        setSuccess,
    });
    const {
        activeImageSearchTab,
        applyImage,
        clearImageResults,
        failedImageUrls,
        fastSearchResults,
        handleBrowseImage,
        handleFastSearch,
        handleSearchImages,
        handleSelectFastGame,
        imageSearchQuery,
        isFastSearching,
        isSearchingImages,
        openImageSearch,
        resetImageState,
        setActiveImageSearchTab,
        setFailedImageUrls,
        setFastSearchResults,
        setImageSearchQuery,
        steamGridDBResults,
    } = useGamePropertiesImages({
        editedFields,
        game,
        isStaged,
        setActiveTab,
        setEditedFields,
        setError,
        setSuccess,
    });

    useEffect(() => {
        setEditedFields(toEditableFields(game));
        setError(null);
        resetMetadataState();
        resetImageState();
    }, [game]);

    const updateField = <K extends keyof EditableGameFields>(field: K, value: EditableGameFields[K]) => {
        setEditedFields(prev => ({ ...prev, [field]: value }));
    };

    const addCategory = (category: string) => {
        if (!(editedFields.categories || []).includes(category)) {
            updateField('categories', [...(editedFields.categories || []), category]);
        }
    };

    const handleCategoryInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && newCategoryInput.trim()) {
            event.preventDefault();
            addCategory(newCategoryInput.trim());
            setNewCategoryInput('');
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

    const renderImageStrip = (compact?: boolean) => (
        <GamePropertiesImageStrip
            compact={compact}
            editedFields={editedFields}
            editingDisabled={editingDisabled}
            failedImageUrls={failedImageUrls}
            onActivateImageType={(type) => {
                setActiveTab('images');
                setActiveImageSearchTab(type);
                if (!editingDisabled) {
                    void openImageSearch(type, editedFields.title);
                }
            }}
            onClearFailedImage={(type, value) => {
                setFailedImageUrls((prev) => new Set(prev).add(value));
                const fieldMap = { boxart: 'boxArtUrl', logo: 'logoUrl', banner: 'bannerUrl', alternativeBanner: 'alternativeBannerUrl', icon: 'iconUrl' } as const;
                updateField(fieldMap[type], '');
            }}
        />
    );

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
                    <GamePropertiesMetadataTab
                        allCategories={_allCategories}
                        canUndo={canUndo}
                        editedFields={editedFields}
                        editingDisabled={editingDisabled}
                        game={game}
                        isSearchingMetadata={isSearchingMetadata}
                        isStaged={isStaged}
                        metadataSearchQuery={metadataSearchQuery}
                        metadataSearchResults={metadataSearchResults}
                        newCategoryInput={newCategoryInput}
                        onAddCategory={addCategory}
                        onApplyMatch={handleApplyMatch}
                        onCategoryInputChange={setNewCategoryInput}
                        onCategoryInputKeyDown={handleCategoryInputKeyDown}
                        onFixMatchSearch={handleFixMatchSearch}
                        onToggleFixMatch={handleToggleFixMatch}
                        onUndo={handleUndo}
                        renderImageStrip={() => renderImageStrip(true)}
                        setMetadataSearchQuery={setMetadataSearchQuery}
                        showFixMatch={showFixMatch}
                        updateField={updateField}
                    />
                )}


                {activeTab === 'images' && (
                    <GamePropertiesImagesTab
                        activeImageSearchTab={activeImageSearchTab}
                        editingDisabled={editingDisabled}
                        fastSearchResults={fastSearchResults}
                        imageSearchQuery={imageSearchQuery}
                        isFastSearching={isFastSearching}
                        isSearchingImages={isSearchingImages}
                        onBrowseImage={handleBrowseImage}
                        onClearFastSearchResults={() => setFastSearchResults([])}
                        onClearImageResults={clearImageResults}
                        onFastSearch={handleFastSearch}
                        onImageSearchQueryChange={setImageSearchQuery}
                        onImageSearchTabChange={setActiveImageSearchTab}
                        onSearchImages={handleSearchImages}
                        onSelectFastGame={handleSelectFastGame}
                        onSelectImage={applyImage}
                        renderImageStrip={() => renderImageStrip(false)}
                        steamGridDBResults={steamGridDBResults}
                    />
                )}


                {activeTab === 'links' && (
                    <GamePropertiesLinksTab
                        editedFields={editedFields}
                        editingDisabled={editingDisabled}
                        updateField={updateField}
                    />
                )}

                {activeTab === 'modManager' && (
                    <GamePropertiesModManagerTab
                        game={game as Game}
                        isStaged={isStaged}
                    />
                )}
            </div>

            {/* Footer - same order and style as Game Manager */}
            <div className={`p-4 border-t border-gray-800 bg-gray-800/30 flex justify-between items-center gap-2 shrink-0`}>
                <div>
                    {error && <span className="text-red-400 text-xs">{error}</span>}
                    {success && <span className="text-green-400 text-xs">{success}</span>}
                </div>
                <div className="flex gap-2">
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
