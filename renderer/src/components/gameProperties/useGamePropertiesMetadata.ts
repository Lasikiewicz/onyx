import { useRef, useState } from 'react';
import type { Game } from '../../types/game';
import type { StagedGame } from '../../types/importer';
import type { EditableGameFields } from '../../types/EditableGame';
import {
  mergeIntoGame,
  mergeIntoStagedGame,
} from '../../types/EditableGame';

interface UseGamePropertiesMetadataOptions {
  editedFields: EditableGameFields;
  game: Game | StagedGame;
  isStaged: boolean;
  onSave: (game: Game | StagedGame) => Promise<void> | void;
  setEditedFields: React.Dispatch<React.SetStateAction<EditableGameFields>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setSuccess: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useGamePropertiesMetadata = ({
  editedFields,
  game,
  isStaged,
  onSave,
  setEditedFields,
  setError,
  setSuccess,
}: UseGamePropertiesMetadataOptions) => {
  const previousStateRef = useRef<EditableGameFields | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [showFixMatch, setShowFixMatch] = useState(false);
  const [metadataSearchQuery, setMetadataSearchQuery] = useState('');
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const [metadataSearchResults, setMetadataSearchResults] = useState<any[]>([]);

  const resetMetadataState = () => {
    setShowFixMatch(false);
    setMetadataSearchResults([]);
    setCanUndo(false);
    previousStateRef.current = null;
  };

  const handleUndo = () => {
    if (!previousStateRef.current) return;

    setEditedFields(previousStateRef.current);
    previousStateRef.current = null;
    setCanUndo(false);
    setSuccess('Reverted to previous state');
    setTimeout(() => setSuccess(null), 2000);
  };

  const handleFixMatchSearch = async () => {
    if (!metadataSearchQuery.trim()) return;

    setIsSearchingMetadata(true);
    setMetadataSearchResults([]);
    setError(null);

    try {
      const response = await window.electronAPI.searchGames(metadataSearchQuery);
      if (Array.isArray(response) && response.length > 0) {
        setMetadataSearchResults(response);
      } else {
        setError('No results found');
      }
    } catch {
      setError('Search failed');
    } finally {
      setIsSearchingMetadata(false);
    }
  };

  const handleApplyMatch = async (result: any) => {
    previousStateRef.current = { ...editedFields };

    try {
      let metadata: any = null;

      if (!isStaged && 'id' in game) {
        const response = await window.electronAPI.fetchAndUpdateByProviderId((game as Game).id, result.id, result.source);
        if (response.success) {
          metadata = response.metadata;
        } else {
          throw new Error(response.error || 'Failed to fetch metadata');
        }
      } else {
        metadata = await window.electronAPI.searchArtwork(result.title, result.steamAppId);
      }

      if (!metadata) return;

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
        alternativeBannerUrl: metadata.alternativeBannerUrl || editedFields.alternativeBannerUrl,
        logoUrl: metadata.logoUrl || editedFields.logoUrl,
        heroUrl: metadata.heroUrl || editedFields.heroUrl,
        iconUrl: metadata.iconUrl || editedFields.iconUrl,
        links: metadata.links || editedFields.links,
        screenshots: metadata.screenshots || editedFields.screenshots,
        ageRating: metadata.ageRating || editedFields.ageRating,
      };

      setEditedFields(newFields);
      setShowFixMatch(false);
      setCanUndo(true);

      if (!isStaged && 'id' in game) {
        const merged = mergeIntoGame(game as Game, newFields);
        await onSave?.(merged);
        setSuccess('Match fixed!');
      } else if (isStaged) {
        const merged = mergeIntoStagedGame(game as StagedGame, newFields);
        await onSave?.(merged);
        setSuccess('Match fixed & Updated!');
      } else {
        setSuccess('Metadata applied!');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to apply match');
      previousStateRef.current = null;
    }
  };

  const handleToggleFixMatch = () => {
    setShowFixMatch((current) => {
      const next = !current;
      if (next) {
        setMetadataSearchQuery(editedFields.title);
      }
      return next;
    });
  };

  return {
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
  };
};
