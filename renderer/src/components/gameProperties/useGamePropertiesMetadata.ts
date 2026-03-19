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

interface MetadataMatchResult {
  id: string;
  source: string;
  steamAppId?: string;
  title?: string;
  name?: string;
  releaseDate?: number | string;
  year?: number;
  score?: number;
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
  const [isApplyingMetadata, setIsApplyingMetadata] = useState(false);
  const [metadataSearchResults, setMetadataSearchResults] = useState<MetadataMatchResult[]>([]);

  const getSteamAppId = () => {
    if (isStaged) {
      return (game as StagedGame).source === 'steam' ? (game as StagedGame).appId : undefined;
    }

    const appIdMatch = (game as Game).id.match(/^steam-(.+)$/);
    return appIdMatch ? appIdMatch[1] : undefined;
  };

  const resetMetadataState = () => {
    setShowFixMatch(false);
    setMetadataSearchResults([]);
    setCanUndo(false);
    setMetadataSearchQuery('');
    setIsSearchingMetadata(false);
    setIsApplyingMetadata(false);
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

  const applyMetadataToFields = async (
    metadata: any,
    fallbackTitle?: string,
  ) => {
    const newFields = {
      ...editedFields,
      title: metadata.title || fallbackTitle || editedFields.title,
      description: metadata.description || metadata.summary || editedFields.description,
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
      platform: metadata.platforms?.join(', ') || metadata.platform || editedFields.platform,
    };

    setEditedFields(newFields);
    setShowFixMatch(false);
    setMetadataSearchResults([]);
    setMetadataSearchQuery('');
    setCanUndo(true);

    const merged = isStaged
      ? mergeIntoStagedGame(game as StagedGame, newFields)
      : mergeIntoGame(game as Game, newFields);

    await onSave?.(merged);
    setSuccess(isStaged ? 'Match fixed & updated!' : 'Match fixed!');
  };

  const sortMetadataResults = (results: MetadataMatchResult[], query: string) => {
    const normalizedQuery = query.toLowerCase().trim();
    const currentSteamAppId = getSteamAppId();
    const steamResults = results.filter((result) => result.source === 'steam');
    const otherResults = results.filter((result) => result.source !== 'steam');

    const getFuzzyScore = (title: string): number => {
      const normalizedTitle = (title || '').toLowerCase().trim();
      if (normalizedTitle === normalizedQuery) return 100;
      if (normalizedTitle.startsWith(normalizedQuery)) return 90;
      if (normalizedQuery.startsWith(normalizedTitle)) return 85;
      if (normalizedTitle.includes(normalizedQuery)) return 70;
      if (normalizedQuery.includes(normalizedTitle)) return 65;

      const queryWords = normalizedQuery.split(/\s+/).filter((word) => word.length > 2);
      const titleWords = normalizedTitle.split(/\s+/).filter((word) => word.length > 2);
      const matchingWords = queryWords.filter((queryWord) =>
        titleWords.some((titleWord) => titleWord.includes(queryWord) || queryWord.includes(titleWord)));
      const overlapScore = (matchingWords.length / Math.max(queryWords.length, 1)) * 50;
      return Math.max(overlapScore, 10);
    };

    const getDate = (result: MetadataMatchResult): number => {
      if (result.releaseDate) {
        if (typeof result.releaseDate === 'number') {
          return result.releaseDate * 1000;
        }
        return new Date(result.releaseDate).getTime();
      }
      if (result.year) {
        return new Date(result.year, 0, 1).getTime();
      }
      return 0;
    };

    const sortedSteamResults = steamResults.sort((a, b) => {
      const aMatchesAppId = currentSteamAppId && a.steamAppId === currentSteamAppId;
      const bMatchesAppId = currentSteamAppId && b.steamAppId === currentSteamAppId;
      if (aMatchesAppId && !bMatchesAppId) return -1;
      if (!aMatchesAppId && bMatchesAppId) return 1;

      const aScore = getFuzzyScore(a.title || a.name || '');
      const bScore = getFuzzyScore(b.title || b.name || '');
      if (aScore !== bScore) return bScore - aScore;

      const aDate = getDate(a);
      const bDate = getDate(b);
      if (aDate !== bDate && aDate > 0 && bDate > 0) {
        return bDate - aDate;
      }

      return 0;
    });

    const sortedOtherResults = otherResults.sort((a, b) => {
      const aScore = getFuzzyScore(a.title || a.name || '');
      const bScore = getFuzzyScore(b.title || b.name || '');
      if (aScore !== bScore) return bScore - aScore;

      const sourcePriority: Record<string, number> = {
        igdb: 3,
        rawg: 2,
        steamgriddb: 1,
      };
      const aPriority = sourcePriority[a.source] || 0;
      const bPriority = sourcePriority[b.source] || 0;
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return 0;
    });

    return [...sortedSteamResults, ...sortedOtherResults];
  };

  const handleFixMatchSearch = async () => {
    const steamAppId = getSteamAppId();
    const query = metadataSearchQuery.trim() || editedFields.title.trim();

    if (steamAppId) {
      setIsSearchingMetadata(true);
      setError(null);
      setMetadataSearchResults([]);

      try {
        const metadata = await window.electronAPI.searchArtwork(editedFields.title, steamAppId);
        if (metadata) {
          previousStateRef.current = { ...editedFields };
          await applyMetadataToFields(metadata, editedFields.title);
          return;
        }
      } catch (error) {
        console.error('Error fetching metadata with Steam App ID:', error);
      } finally {
        setIsSearchingMetadata(false);
      }
    }

    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setIsSearchingMetadata(true);
    setMetadataSearchResults([]);
    setError(null);

    try {
      const response = await window.electronAPI.searchGames(query);
      const results = Array.isArray(response) ? response : (response.results || []);
      const sortedResults = sortMetadataResults(results, query);

      if (sortedResults.length > 0) {
        setMetadataSearchResults(sortedResults);
      } else {
        setError('No results found. Try a different search term or configure metadata providers in Settings > APIs.');
      }
    } catch {
      setError('Search failed');
    } finally {
      setIsSearchingMetadata(false);
    }
  };

  const handleApplyMatch = async (result: MetadataMatchResult) => {
    previousStateRef.current = { ...editedFields };
    setIsApplyingMetadata(true);
    setError(null);

    try {
      const gameTitle = result.title || result.name || editedFields.title;
      const steamAppId = result.steamAppId || (result.id.startsWith('steam-') ? result.id.replace('steam-', '') : undefined);
      const metadata = await window.electronAPI.searchArtwork(gameTitle, steamAppId);

      if (!metadata) return;
      await applyMetadataToFields(metadata, gameTitle);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to apply match');
      previousStateRef.current = null;
    } finally {
      setIsApplyingMetadata(false);
    }
  };

  const handleToggleFixMatch = async () => {
    const nextShowFixMatch = !showFixMatch;
    setShowFixMatch(nextShowFixMatch);

    if (!nextShowFixMatch) {
      setMetadataSearchResults([]);
      setMetadataSearchQuery('');
      setError(null);
      return;
    }

    const query = editedFields.title.trim();
    setMetadataSearchQuery(query);

    if (!query) {
      return;
    }

    await handleFixMatchSearch();
  };

  return {
    canUndo,
    handleApplyMatch,
    handleFixMatchSearch,
    handleToggleFixMatch,
    handleUndo,
    isApplyingMetadata,
    isSearchingMetadata,
    metadataSearchQuery,
    metadataSearchResults,
    resetMetadataState,
    setMetadataSearchQuery,
    showFixMatch,
  };
};
