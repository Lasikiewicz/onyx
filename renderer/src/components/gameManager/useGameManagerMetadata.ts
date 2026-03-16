import { useCallback, useState } from 'react';
import type React from 'react';
import type { Game } from '../../types/game';

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

interface UseGameManagerMetadataArgs {
  editedGame: Game | null;
  selectedGame: Game | null;
  expandedGame: Game | null;
  onSaveGame: (game: Game, oldGame?: Game) => Promise<void>;
  onReloadLibrary?: () => Promise<void>;
  setEditedGame: React.Dispatch<React.SetStateAction<Game | null>>;
  setExpandedGameId: React.Dispatch<React.SetStateAction<string | null>>;
  setSelectedGameId: React.Dispatch<React.SetStateAction<string | null>>;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  setSuccess: React.Dispatch<React.SetStateAction<string | null>>;
}

export function useGameManagerMetadata({
  editedGame,
  selectedGame,
  expandedGame,
  onSaveGame,
  onReloadLibrary,
  setEditedGame,
  setExpandedGameId,
  setSelectedGameId,
  setError,
  setSuccess,
}: UseGameManagerMetadataArgs) {
  const [isSaving, setIsSaving] = useState(false);
  const [showFixMatch, setShowFixMatch] = useState(false);
  const [metadataSearchQuery, setMetadataSearchQuery] = useState('');
  const [metadataSearchResults, setMetadataSearchResults] = useState<MetadataMatchResult[]>([]);
  const [isSearchingMetadata, setIsSearchingMetadata] = useState(false);
  const [isApplyingMetadata, setIsApplyingMetadata] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const resetMetadataWorkflow = useCallback(() => {
    setShowFixMatch(false);
    setMetadataSearchResults([]);
    setMetadataSearchQuery('');
    setIsSearchingMetadata(false);
    setIsApplyingMetadata(false);
    setNewCategoryInput('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!editedGame || !editedGame.title.trim()) {
      setError('Game title is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSaveGame(editedGame);
      setSuccess('Game saved successfully');
      setTimeout(() => {
        setSuccess(null);
        setExpandedGameId(null);
        setEditedGame(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save game');
      console.error('Error saving game:', err);
    } finally {
      setIsSaving(false);
    }
  }, [editedGame, onSaveGame, setEditedGame, setError, setExpandedGameId, setSuccess]);

  const handleFixMatchSearch = useCallback(async () => {
    if (!expandedGame) return;

    const getSteamAppId = (): string | undefined => {
      const appIdMatch = editedGame?.id.match(/^steam-(.+)$/);
      return appIdMatch ? appIdMatch[1] : undefined;
    };

    const steamAppId = getSteamAppId();
    const query = metadataSearchQuery.trim() || expandedGame.title.trim();

    if (steamAppId) {
      setIsSearchingMetadata(true);
      setError(null);
      setMetadataSearchResults([]);

      try {
        const metadata = await window.electronAPI.searchArtwork(expandedGame.title, steamAppId);
        if (metadata) {
          setEditedGame({
            ...editedGame!,
            title: expandedGame.title,
            description: metadata.description || metadata.summary || editedGame?.description,
            genres: metadata.genres || editedGame?.genres,
            releaseDate: metadata.releaseDate || editedGame?.releaseDate,
            developers: metadata.developers || editedGame?.developers,
            publishers: metadata.publishers || editedGame?.publishers,
            ageRating: metadata.ageRating || editedGame?.ageRating,
            userScore: metadata.rating ? Math.round(metadata.rating) : editedGame?.userScore,
            platform: metadata.platforms?.join(', ') || metadata.platform || 'steam',
            boxArtUrl: metadata.boxArtUrl || editedGame?.boxArtUrl || '',
            bannerUrl: metadata.bannerUrl || editedGame?.bannerUrl || '',
            alternativeBannerUrl: metadata.alternativeBannerUrl || editedGame?.alternativeBannerUrl || '',
            useAlternativeBackground: true,
            logoUrl: metadata.logoUrl || editedGame?.logoUrl,
            heroUrl: metadata.heroUrl || editedGame?.heroUrl,
            iconUrl: metadata.iconUrl || editedGame?.iconUrl,
          });
          setSuccess('Metadata updated from Steam Store API');
          setShowFixMatch(false);
          setMetadataSearchResults([]);
          setMetadataSearchQuery('');
          return;
        }
      } catch (err) {
        console.error('Error fetching metadata with Steam App ID:', err);
      }
    }

    if (!query) {
      setError('Please enter a game title to search');
      return;
    }

    setIsSearchingMetadata(true);
    setError(null);
    setMetadataSearchResults([]);

    try {
      const response = await window.electronAPI.searchGames(query);
      const results = Array.isArray(response) ? response : (response.results || []);

      if (results.length > 0) {
        const currentSteamAppId = expandedGame.id.startsWith('steam-') ? expandedGame.id.replace('steam-', '') : undefined;
        const steamResults = results.filter((result: MetadataMatchResult) => result.source === 'steam');
        const otherResults = results.filter((result: MetadataMatchResult) => result.source !== 'steam');
        const normalizedQuery = query.toLowerCase().trim();

        const getFuzzyScore = (title: string): number => {
          const normalizedTitle = (title || '').toLowerCase().trim();
          if (normalizedTitle === normalizedQuery) return 100;
          if (normalizedTitle.startsWith(normalizedQuery)) return 90;
          if (normalizedQuery.startsWith(normalizedTitle)) return 85;
          if (normalizedTitle.includes(normalizedQuery)) return 70;
          if (normalizedQuery.includes(normalizedTitle)) return 65;

          const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 2);
          const titleWords = normalizedTitle.split(/\s+/).filter(word => word.length > 2);
          const matchingWords = queryWords.filter(queryWord =>
            titleWords.some(titleWord => titleWord.includes(queryWord) || queryWord.includes(titleWord))
          );
          const overlapScore = (matchingWords.length / Math.max(queryWords.length, 1)) * 50;
          return Math.max(overlapScore, 10);
        };

        const sortedSteamResults = steamResults.sort((a: MetadataMatchResult, b: MetadataMatchResult) => {
          const aMatchesAppId = currentSteamAppId && a.steamAppId === currentSteamAppId;
          const bMatchesAppId = currentSteamAppId && b.steamAppId === currentSteamAppId;
          if (aMatchesAppId && !bMatchesAppId) return -1;
          if (!aMatchesAppId && bMatchesAppId) return 1;

          const aScore = getFuzzyScore(a.title || a.name || '');
          const bScore = getFuzzyScore(b.title || b.name || '');
          if (aScore !== bScore) return bScore - aScore;

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

          const aDate = getDate(a);
          const bDate = getDate(b);
          if (aDate !== bDate && aDate > 0 && bDate > 0) {
            return bDate - aDate;
          }

          return 0;
        });

        const sortedOtherResults = otherResults.sort((a: MetadataMatchResult, b: MetadataMatchResult) => {
          const aName = a.title || a.name || '';
          const bName = b.title || b.name || '';
          const aScore = getFuzzyScore(aName);
          const bScore = getFuzzyScore(bName);
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

        const allResults = [...sortedSteamResults, ...sortedOtherResults];

        if (allResults.length === 0) {
          setError('No matching results found. Try a different search term or check if the game is available in the metadata databases.');
          setMetadataSearchResults([]);
          return;
        }

        console.log(`[GameManager] Found ${allResults.length} search result(s) for "${query}" (${steamResults.length} Steam, ${sortedOtherResults.length} other)`);
        setMetadataSearchResults(allResults);
      } else {
        setError('No results found. Try a different search term or configure metadata providers in Settings > APIs.');
      }
    } catch (err) {
      setError('Failed to search for games');
      console.error('Error searching games:', err);
    } finally {
      setIsSearchingMetadata(false);
    }
  }, [editedGame, expandedGame, metadataSearchQuery, setEditedGame, setError, setSuccess]);

  const handleSelectMetadataMatch = useCallback(async (result: { id: string; source: string; steamAppId?: string; title?: string }) => {
    if (!expandedGame || !editedGame) return;

    setIsApplyingMetadata(true);
    setError(null);

    try {
      const gameTitle = result.title || expandedGame.title;
      const steamAppId = result.steamAppId || (result.id.startsWith('steam-') ? result.id.replace('steam-', '') : undefined);

      let newGameId = expandedGame.id;
      if (steamAppId) {
        newGameId = `steam-${steamAppId}`;
      } else if (result.source === 'igdb' && result.id.startsWith('igdb-')) {
        newGameId = result.id;
      } else if (result.source === 'rawg' && result.id.startsWith('rawg-')) {
        newGameId = result.id;
      }

      console.log(`[GameManager] Fetching metadata for "${gameTitle}" with Steam App ID: ${steamAppId || 'none'}`);

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Metadata fetch timeout')), 15000)
      );

      const metadata = await Promise.race([
        window.electronAPI.searchArtwork(gameTitle, steamAppId),
        timeoutPromise,
      ]).catch(err => {
        console.warn('[GameManager] Metadata fetch failed or timed out:', err);
        setError('Failed to fetch metadata - request timed out. Please try again.');
        return null;
      });

      if (metadata) {
        let finalDescription = (metadata.description || metadata.summary || '').trim();
        let finalReleaseDate = metadata.releaseDate || '';
        let finalGenres = metadata.genres || [];
        let finalDevelopers = metadata.developers || [];
        let finalPublishers = metadata.publishers || [];
        let finalAgeRating = metadata.ageRating || '';
        let finalRating = metadata.rating || 0;
        let finalPlatform = metadata.platforms?.join(', ') || metadata.platform || expandedGame.platform;

        if (!finalDescription && steamAppId) {
          try {
            console.log(`[GameManager] Description empty, fetching from Steam Store API for App ID: ${steamAppId}`);
            const steamGameId = `steam-${steamAppId}`;
            const descriptionResult = await window.electronAPI.fetchGameDescription(steamGameId);
            if (descriptionResult && descriptionResult.success) {
              finalDescription = (descriptionResult.description || descriptionResult.summary || '').trim();
              finalReleaseDate = descriptionResult.releaseDate || finalReleaseDate;
              finalGenres = descriptionResult.genres || finalGenres;
              finalDevelopers = descriptionResult.developers || finalDevelopers;
              finalPublishers = descriptionResult.publishers || finalPublishers;
              finalAgeRating = descriptionResult.ageRating || finalAgeRating;
              finalRating = descriptionResult.rating || finalRating;
              finalPlatform = descriptionResult.platforms?.join(', ') || finalPlatform;
              console.log(`[GameManager] Successfully fetched description from Steam Store API, length: ${finalDescription.length}`);
            }
          } catch (descErr) {
            console.warn('[GameManager] Error fetching description from Steam Store API:', descErr);
          }
        }

        const updatedGame: Game = {
          ...editedGame,
          id: newGameId,
          platform: finalPlatform,
          title: gameTitle,
          description: finalDescription || editedGame.description,
          genres: finalGenres.length > 0 ? finalGenres : editedGame.genres,
          releaseDate: finalReleaseDate || editedGame.releaseDate,
          developers: finalDevelopers.length > 0 ? finalDevelopers : editedGame.developers,
          publishers: finalPublishers.length > 0 ? finalPublishers : editedGame.publishers,
          ageRating: finalAgeRating || editedGame.ageRating,
          userScore: finalRating ? Math.round(finalRating) : editedGame.userScore,
          boxArtUrl: metadata.boxArtUrl || editedGame.boxArtUrl || '',
          bannerUrl: metadata.bannerUrl || editedGame.bannerUrl || '',
          alternativeBannerUrl: metadata.alternativeBannerUrl || editedGame.alternativeBannerUrl || '',
          useAlternativeBackground: true,
          logoUrl: metadata.logoUrl || editedGame.logoUrl,
          heroUrl: metadata.heroUrl || editedGame.heroUrl,
          iconUrl: metadata.iconUrl || editedGame.iconUrl,
          screenshots: metadata.screenshots || editedGame.screenshots || [],
          links: metadata.links || editedGame.links || [],
        };

        setEditedGame(updatedGame);
        await onSaveGame(updatedGame, expandedGame);
        setShowFixMatch(false);
        setMetadataSearchResults([]);
        setMetadataSearchQuery('');

        if (onReloadLibrary) {
          await onReloadLibrary();
        }
      } else {
        setError('Failed to fetch metadata. Please try again.');
      }
    } catch (err) {
      setError('Failed to update metadata');
      console.error('Error updating metadata:', err);
    } finally {
      setIsApplyingMetadata(false);
    }
  }, [editedGame, expandedGame, onReloadLibrary, onSaveGame, setEditedGame, setError]);

  const handleToggleFixMatch = useCallback(async () => {
    if (!editedGame || !selectedGame) {
      return;
    }

    const wasHidden = !showFixMatch;
    setShowFixMatch(!showFixMatch);

    if (wasHidden) {
      const query = editedGame.title || selectedGame.title;
      setMetadataSearchQuery(query);

      if (!query) {
        return;
      }

      setIsSearchingMetadata(true);
      setMetadataSearchResults([]);
      setError(null);

      try {
        const response = await window.electronAPI.searchGames(query);
        const results = Array.isArray(response) ? response : (response.results || []);

        if (results.length === 0) {
          setError('No matches found. Try a different search term.');
          setMetadataSearchResults([]);
          return;
        }

        const normalizedQuery = query.toLowerCase().trim();
        const sortedResults = results.sort((a: MetadataMatchResult, b: MetadataMatchResult) => {
          const scoreA = a.score || 0;
          const scoreB = b.score || 0;
          if (scoreA !== scoreB) return scoreB - scoreA;

          const getDate = (result: MetadataMatchResult) => {
            if (result.releaseDate) return typeof result.releaseDate === 'number' ? result.releaseDate * 1000 : new Date(result.releaseDate).getTime();
            if (result.year) return new Date(result.year, 0, 1).getTime();
            return 0;
          };

          const dateA = getDate(a);
          const dateB = getDate(b);
          if (dateA !== dateB && dateA > 0 && dateB > 0) return dateB - dateA;

          const nameA = (a.title || a.name || '').toLowerCase().trim();
          const nameB = (b.title || b.name || '').toLowerCase().trim();
          if (nameA === normalizedQuery && nameB !== normalizedQuery) return -1;
          if (nameA !== normalizedQuery && nameB === normalizedQuery) return 1;

          return 0;
        });

        setMetadataSearchResults(sortedResults);
      } catch (err) {
        console.error('Error searching metadata:', err);
        setError('Failed to search for games. Please try again.');
      } finally {
        setIsSearchingMetadata(false);
      }

      return;
    }

    setMetadataSearchResults([]);
    setMetadataSearchQuery('');
    setError(null);
  }, [editedGame, selectedGame, setError, showFixMatch]);

  const handleCancelEditing = useCallback(() => {
    setExpandedGameId(null);
    setEditedGame(null);
    resetMetadataWorkflow();
    setSelectedGameId(null);
    setError(null);
  }, [resetMetadataWorkflow, setEditedGame, setError, setExpandedGameId, setSelectedGameId]);

  return {
    isSaving,
    showFixMatch,
    metadataSearchQuery,
    metadataSearchResults,
    isSearchingMetadata,
    isApplyingMetadata,
    newCategoryInput,
    setMetadataSearchQuery,
    setNewCategoryInput,
    resetMetadataWorkflow,
    handleSave,
    handleFixMatchSearch,
    handleSelectMetadataMatch,
    handleToggleFixMatch,
    handleCancelEditing,
  };
}
