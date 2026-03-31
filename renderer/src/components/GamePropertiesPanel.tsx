import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Game } from '../types/game';
import { StagedGame } from '../types/importer';
import {
  EditableGameFields,
  toEditableFields,
  mergeIntoGame,
  mergeIntoStagedGame,
} from '../types/EditableGame';
import { getLauncherDisplayName, normalizeLauncherId } from '../utils/launcherIcons';
import { useGamePropertiesMetadata } from './gameProperties/useGamePropertiesMetadata';
import { useGamePropertiesImages } from './gameProperties/useGamePropertiesImages';
import { GameManagerImagesTab } from './gameManager/GameManagerImagesTab';
import { GameManagerLinksTab } from './gameManager/GameManagerLinksTab';
import { GameManagerMetadataTab } from './gameManager/GameManagerMetadataTab';
import { GameManagerModManagerTab } from './gameManager/GameManagerModManagerTab';
import { LinkIconPickerDialog } from './gameManager/LinkIconPickerDialog';

type ImageType = 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon';

interface FoundLink {
  name: string;
  url: string;
}

export interface GamePropertiesPanelHandle {
  saveToParent: () => Promise<Game | StagedGame | undefined>;
}

interface GamePropertiesPanelProps {
  game: Game | StagedGame;
  onSave: (game: Game | StagedGame) => Promise<void> | void;
  onCancel?: () => void;
  onDelete?: () => void;
  allCategories?: string[];
  isStaged?: boolean;
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
  editingDisabledReason,
}, ref) => {
  const [activeTab, setActiveTab] = useState<'metadata' | 'images' | 'links' | 'modManager'>('metadata');
  const [editedFields, setEditedFields] = useState<EditableGameFields>(() => toEditableFields(game));
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newCategoryInput, setNewCategoryInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshingLinks, setIsRefreshingLinks] = useState(false);
  const [foundLinks, setFoundLinks] = useState<FoundLink[] | null>(null);
  const [linkIconPopupIndex, setLinkIconPopupIndex] = useState<number | null>(null);

  const {
    handleApplyMatch,
    handleFixMatchSearch,
    handleToggleFixMatch,
    isApplyingMetadata,
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
    fastSearchResults,
    getImageCountForActiveProvider,
    getRenderableImageUrl,
    getVisibleImageResultCountForTab,
    handleBrowseImage,
    handleFastSearch,
    handleImageLoadError,
    handleImageSearchTabChange,
    handleOpenGoogleImageSearch,
    handleSearchImages,
    handleSelectFastGame,
    hasRawImageResults,
    hasVisibleImageResults,
    imageSearchQuery,
    isFastSearching,
    isSearchingImages,
    matchesActiveProviderFilter,
    orderedResultsByType,
    openImageSearch,
    providerFilter,
    providerProgress,
    resetImageState,
    selectedFastGameId,
    setFastSearchResults,
    setImageSearchQuery,
    setProviderFilter,
    showImageSearch,
  } = useGamePropertiesImages({
    editedFields,
    game,
    isStaged,
    onSave,
    setActiveTab,
    setEditedFields,
    setError,
    setSuccess,
  });

  useEffect(() => {
    setEditedFields(toEditableFields(game));
    setError(null);
    setSuccess(null);
    setFoundLinks(null);
    setLinkIconPopupIndex(null);
    resetMetadataState();
    resetImageState();
  }, [game, resetImageState, resetMetadataState]);

  const updateField = <K extends keyof EditableGameFields>(field: K, value: EditableGameFields[K]) => {
    setEditedFields((prev) => ({ ...prev, [field]: value }));
  };

  const buildMergedGame = () => (
    isStaged
      ? mergeIntoStagedGame(game as StagedGame, editedFields)
      : mergeIntoGame(game as Game, editedFields)
  );

  const buildTabGame = (): Game => {
    const merged = buildMergedGame();
    const source = (merged as Game).source || (merged as StagedGame).source || editedFields.platform || 'other';
    const installPath = (merged as StagedGame).installPath || (merged as Game).installationDirectory || '';

    return {
      id: (merged as Game).id || `staged-${(merged as StagedGame).uuid}`,
      title: merged.title,
      platform: (merged as Game).platform || editedFields.platform || source,
      exePath: merged.exePath || '',
      launchArgs: merged.launchArgs,
      boxArtUrl: merged.boxArtUrl,
      bannerUrl: merged.bannerUrl,
      alternativeBannerUrl: merged.alternativeBannerUrl,
      useAlternativeBackground: merged.useAlternativeBackground,
      logoUrl: merged.logoUrl,
      heroUrl: merged.heroUrl,
      iconUrl: merged.iconUrl,
      description: merged.description,
      genres: merged.genres,
      developers: merged.developers,
      publishers: merged.publishers,
      categories: merged.categories,
      releaseDate: merged.releaseDate,
      ageRating: merged.ageRating,
      source,
      installationDirectory: installPath,
      modManagerUrl: (merged as any).modManagerUrl,
      links: merged.links,
      screenshots: merged.screenshots,
      lockedFields: merged.lockedFields,
    };
  };

  const syncEditedFieldsFromTabGame = (updatedGame: Game) => {
    setEditedFields((prev) => ({
      ...prev,
      title: updatedGame.title,
      description: updatedGame.description,
      releaseDate: updatedGame.releaseDate,
      genres: updatedGame.genres,
      developers: updatedGame.developers,
      publishers: updatedGame.publishers,
      categories: updatedGame.categories,
      ageRating: updatedGame.ageRating,
      boxArtUrl: updatedGame.boxArtUrl,
      bannerUrl: updatedGame.bannerUrl,
      alternativeBannerUrl: updatedGame.alternativeBannerUrl,
      useAlternativeBackground: updatedGame.useAlternativeBackground,
      logoUrl: updatedGame.logoUrl,
      heroUrl: updatedGame.heroUrl,
      iconUrl: updatedGame.iconUrl,
      screenshots: updatedGame.screenshots,
      platform: updatedGame.platform,
      exePath: updatedGame.exePath,
      launchArgs: updatedGame.launchArgs,
      installPath: updatedGame.installationDirectory ?? prev.installPath,
      modManagerUrl: updatedGame.modManagerUrl,
      links: updatedGame.links,
      lockedFields: updatedGame.lockedFields ?? prev.lockedFields,
    }));
  };

  useImperativeHandle(ref, () => ({
    saveToParent: async () => {
      const merged = buildMergedGame();
      await onSave(merged);
      return merged;
    },
  }), [editedFields, game, isStaged, onSave]);

  const selectedTabGame = (() => {
    const source = (game as Game).source || (game as StagedGame).source || editedFields.platform || 'other';
    const installPath = (game as StagedGame).installPath || (game as Game).installationDirectory || '';

    return {
      id: (game as Game).id || `staged-${(game as StagedGame).uuid}`,
      title: game.title,
      platform: (game as Game).platform || editedFields.platform || source,
      exePath: game.exePath || '',
      launchArgs: game.launchArgs,
      boxArtUrl: game.boxArtUrl,
      bannerUrl: game.bannerUrl,
      alternativeBannerUrl: game.alternativeBannerUrl,
      useAlternativeBackground: game.useAlternativeBackground,
      logoUrl: game.logoUrl,
      heroUrl: game.heroUrl,
      iconUrl: game.iconUrl,
      description: game.description,
      genres: game.genres,
      developers: game.developers,
      publishers: game.publishers,
      categories: game.categories,
      releaseDate: game.releaseDate,
      ageRating: game.ageRating,
      source,
      installationDirectory: installPath,
      modManagerUrl: (game as any).modManagerUrl,
      links: game.links,
      screenshots: game.screenshots,
      lockedFields: game.lockedFields,
    } satisfies Game;
  })();
  const editedTabGame = buildTabGame();

  const handleSaveToParent = async () => {
    if (!editedFields.title.trim()) {
      setError('Game title is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const merged = buildMergedGame();
      await onSave(merged);
      setSuccess('Game saved successfully');
      setTimeout(() => setSuccess(null), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save game');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEditing = () => {
    setEditedFields(toEditableFields(game));
    setFoundLinks(null);
    setLinkIconPopupIndex(null);
    resetMetadataState();
    resetImageState();
    setError(null);
    setSuccess(null);
    onCancel?.();
  };

  const handleRefreshLinks = async () => {
    setIsRefreshingLinks(true);
    setFoundLinks(null);
    setError(null);

    try {
      if (!isStaged && 'id' in game) {
        const result = await window.electronAPI.findLinks((game as Game).id);
        if (result.success) {
          setFoundLinks(result.links);
        } else {
          setError(result.error || 'Failed to find links');
        }
      } else {
        const steamAppId = (game as StagedGame).source === 'steam' ? (game as StagedGame).appId : undefined;
        const metadata = await window.electronAPI.searchArtwork(editedFields.title, steamAppId, true);
        setFoundLinks(metadata?.links || []);
      }
    } catch (err) {
      console.error('Failed to refresh links:', err);
      setError('An unexpected error occurred while searching for links');
    } finally {
      setIsRefreshingLinks(false);
    }
  };

  const handleBrowseModManager = async () => {
    const path = await window.electronAPI.showOpenDialog();
    if (path) {
      updateField('modManagerUrl', path);
    }
  };

  const handleLaunchModManager = async () => {
    const modManagerUrl = editedFields.modManagerUrl?.trim();
    if (!modManagerUrl) {
      return;
    }

    try {
      if (!isStaged && 'id' in game && (game as Game).id) {
        const result = await window.electronAPI.launchModManager((game as Game).id);
        if (!result.success && result.error) {
          setError(result.error);
        }
        return;
      }

      const isUrl = /^https?:\/\//i.test(modManagerUrl);
      const result = isUrl
        ? await window.electronAPI.openExternal(modManagerUrl)
        : await window.electronAPI.launchModManagerTarget(modManagerUrl);

      if (!result?.success && result?.error) {
        setError(result.error);
      }
    } catch (err) {
      console.error('Error launching mod manager:', err);
      setError(err instanceof Error ? err.message : 'Failed to launch mod manager');
    }
  };

  const handleRemoveCustomLinkIcon = () => {
    if (linkIconPopupIndex === null || !editedFields.links?.[linkIconPopupIndex]) {
      return;
    }

    const nextLinks = [...editedFields.links];
    nextLinks[linkIconPopupIndex] = { ...nextLinks[linkIconPopupIndex], iconUrl: undefined };
    updateField('links', nextLinks);
    setLinkIconPopupIndex(null);
  };

  const handleUploadCustomLinkIcon = (dataUrl: string) => {
    if (linkIconPopupIndex === null || !editedFields.links?.[linkIconPopupIndex]) {
      return;
    }

    const nextLinks = [...editedFields.links];
    nextLinks[linkIconPopupIndex] = { ...nextLinks[linkIconPopupIndex], iconUrl: dataUrl };
    updateField('links', nextLinks);
    setLinkIconPopupIndex(null);
  };

  const getSourceDisplayName = (source: string) => {
    const normalized = normalizeLauncherId(source);
    return normalized !== 'other' ? getLauncherDisplayName(source) : source;
  };

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-lg border border-gray-800 bg-gray-900 text-white shadow-xl">
      <div className="flex shrink-0 border-b border-gray-800">
        <button onClick={() => setActiveTab('metadata')} className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'metadata' ? 'border-b-2 border-blue-500 bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'}`}>Metadata</button>
        <button onClick={() => setActiveTab('images')} className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'images' ? 'border-b-2 border-blue-500 bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'}`}>Images</button>
        <button onClick={() => setActiveTab('links')} className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'links' ? 'border-b-2 border-blue-500 bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'}`}>Links</button>
        <button onClick={() => setActiveTab('modManager')} className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'modManager' ? 'border-b-2 border-blue-500 bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'}`}>Mod Manager</button>
      </div>

      {editingDisabled && (
        <div className="flex shrink-0 items-center gap-2 border-b border-amber-500/30 bg-amber-500/20 px-4 py-3 text-sm text-amber-200">
          <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/50 font-bold text-amber-900" title="Scan in progress">!</span>
          <span>{editingDisabledReason ?? 'Editing is disabled. Please wait for the current operation to finish.'}</span>
        </div>
      )}

      <div className={`custom-scrollbar flex-1 overflow-y-auto p-4 ${editingDisabled ? 'pointer-events-none opacity-70' : ''}`}>
        {activeTab === 'metadata' && (
          <GameManagerMetadataTab
            editedGame={editedTabGame}
            selectedGame={selectedTabGame}
            showFixMatch={showFixMatch}
            metadataSearchQuery={metadataSearchQuery}
            metadataSearchResults={metadataSearchResults}
            isSearchingMetadata={isSearchingMetadata}
            isApplyingMetadata={isApplyingMetadata}
            isSaving={isSaving}
            isDeleting={false}
            newCategoryInput={newCategoryInput}
            canDelete={false}
            onOpenImageSearch={(type: ImageType) => {
              setActiveTab('images');
              if (editingDisabled) {
                return;
              }
              void openImageSearch(type, editedFields.title);
            }}
            onEditedGameChange={syncEditedFieldsFromTabGame}
            onMetadataSearchQueryChange={setMetadataSearchQuery}
            onFixMatchSearch={handleFixMatchSearch}
            onToggleFixMatch={handleToggleFixMatch}
            onSelectMetadataMatch={handleApplyMatch}
            onNewCategoryInputChange={setNewCategoryInput}
            onSave={() => {
              if (!editingDisabled) {
                void handleSaveToParent();
              }
            }}
            onCancel={handleCancelEditing}
            onDelete={() => undefined}
            getSourceDisplayName={getSourceDisplayName}
          />
        )}

        {activeTab === 'images' && (
          <GameManagerImagesTab
            editedGame={editedTabGame}
            selectedGame={selectedTabGame}
            showImageSearch={showImageSearch}
            imageSearchQuery={imageSearchQuery}
            isSearchingImages={isSearchingImages}
            isFastSearching={isFastSearching}
            providerProgress={providerProgress}
            providerFilter={providerFilter}
            fastSearchResults={fastSearchResults}
            selectedFastGameId={selectedFastGameId}
            activeImageSearchTab={activeImageSearchTab}
            orderedResultsByType={orderedResultsByType}
            hasRawImageResults={hasRawImageResults}
            hasVisibleImageResults={hasVisibleImageResults}
            onOpenImageSearch={(type) => {
              if (editingDisabled) return;
              void openImageSearch(type, editedFields.title);
            }}
            onOpenArtworkContextMenu={(_event, type) => {
              if (editingDisabled) return;
              void handleBrowseImage(type);
            }}
            onImageSearchQueryChange={setImageSearchQuery}
            onSubmitImageSearch={handleSearchImages}
            onFastSearch={handleFastSearch}
            onBrowseImage={handleBrowseImage}
            onClearResults={() => {
              setFastSearchResults([]);
              clearImageResults();
            }}
            onProviderFilterChange={setProviderFilter}
            getImageCountForProvider={getImageCountForActiveProvider}
            onSelectFastGame={handleSelectFastGame}
            onImageLoadError={(url) => handleImageLoadError(url)}
            onImageSearchTabChange={handleImageSearchTabChange}
            getImageResultCountForTab={getVisibleImageResultCountForTab}
            getRenderableImageUrl={getRenderableImageUrl}
            onSelectImage={(imageUrl, type) => applyImage(type, imageUrl)}
            matchesProviderFilter={matchesActiveProviderFilter}
            onUploadCustomImageClick={() => {
              const uploadType = showImageSearch?.type || (activeImageSearchTab === 'all' ? 'boxart' : activeImageSearchTab);
              if (editingDisabled) return;
              void handleBrowseImage(uploadType);
            }}
            onUploadWebmClick={() => {
              const uploadType = showImageSearch?.type || (activeImageSearchTab === 'all' ? 'banner' : activeImageSearchTab);
              if (editingDisabled) return;
              void handleBrowseImage(uploadType);
            }}
            onOpenGoogleImageSearch={handleOpenGoogleImageSearch}
          />
        )}

        {activeTab === 'links' && (
          <GameManagerLinksTab
            editedGame={editedTabGame}
            isRefreshingLinks={isRefreshingLinks}
            foundLinks={foundLinks}
            isSaving={isSaving}
            isDeleting={false}
            canDelete={false}
            onRefreshLinks={() => {
              if (!editingDisabled) {
                void handleRefreshLinks();
              }
            }}
            onEditedGameChange={syncEditedFieldsFromTabGame}
            onSetFoundLinks={setFoundLinks}
            onSetLinkIconPopupIndex={setLinkIconPopupIndex}
            onSave={() => {
              if (!editingDisabled) {
                void handleSaveToParent();
              }
            }}
            onCancel={handleCancelEditing}
            onDelete={() => undefined}
          />
        )}

        {activeTab === 'modManager' && (
          <GameManagerModManagerTab
            editedGame={editedTabGame}
            isSaving={isSaving}
            onEditedGameChange={syncEditedFieldsFromTabGame}
            onBrowse={() => {
              if (!editingDisabled) {
                void handleBrowseModManager();
              }
            }}
            onLaunch={() => {
              if (!editingDisabled) {
                void handleLaunchModManager();
              }
            }}
            onSave={() => {
              if (!editingDisabled) {
                void handleSaveToParent();
              }
            }}
            onCancel={handleCancelEditing}
          />
        )}
      </div>

      {activeTab === 'images' && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-gray-800 bg-gray-800/30 p-4">
          <div>
            {error && <span className="text-xs text-red-400">{error}</span>}
            {success && <span className="text-xs text-green-400">{success}</span>}
          </div>
          <div className="flex gap-2">
            {onCancel && <button onClick={onCancel} disabled={editingDisabled} className="rounded bg-gray-600 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50">Cancel</button>}
            {onDelete && !isStaged && (
              <button onClick={onDelete} disabled={editingDisabled} className="flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab !== 'images' && (error || success) && (
        <div className="pointer-events-none absolute bottom-6 left-1/2 z-50 flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2">
          {error && <div className="pointer-events-auto rounded-lg border border-red-500 bg-red-900/95 px-4 py-3 text-sm font-medium text-red-100 shadow-xl backdrop-blur-sm">{error}</div>}
          {success && <div className="pointer-events-auto rounded-lg border border-green-500 bg-green-900/95 px-4 py-3 text-sm font-medium text-green-100 shadow-xl backdrop-blur-sm">{success}</div>}
        </div>
      )}

      {linkIconPopupIndex !== null && editedFields.links?.[linkIconPopupIndex] && (
        <LinkIconPickerDialog
          linkName={editedFields.links[linkIconPopupIndex].name || 'Link'}
          hasCustomIcon={Boolean(editedFields.links[linkIconPopupIndex].iconUrl)}
          onUploadIcon={handleUploadCustomLinkIcon}
          onRemoveCustomIcon={handleRemoveCustomLinkIcon}
          onClose={() => setLinkIconPopupIndex(null)}
        />
      )}
    </div>
  );
});

GamePropertiesPanel.displayName = 'GamePropertiesPanel';
