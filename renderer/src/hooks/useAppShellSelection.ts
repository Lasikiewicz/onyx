import { useCallback, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Game } from '../types/game';

interface UseAppShellSelectionOptions {
  activeGameId: string | null;
  filteredGames: Game[];
  games: Game[];
  loading: boolean;
  preferencesLoading: boolean;
  setActiveGameId: Dispatch<SetStateAction<string | null>>;
}

export function useAppShellSelection({
  activeGameId,
  filteredGames,
  games,
  loading,
  preferencesLoading,
  setActiveGameId,
}: UseAppShellSelectionOptions) {
  const activeGame = useMemo(() => {
    if (!activeGameId) {
      return null;
    }

    return (
      filteredGames.find((game) => game.id === activeGameId) ??
      games.find((game) => game.id === activeGameId) ??
      null
    );
  }, [activeGameId, filteredGames, games]);

  // Seed a selection when there is none, but never *reassign* one the user made.
  //
  // Previously any search or filter change that hid the active game silently moved the
  // selection to filteredGames[0]. Because the game still exists in the full library, the
  // details panel can keep showing it; clearing the filter then restores it rather than
  // leaving the user on a game they never picked. Only a game that has left the library
  // entirely justifies moving the selection.
  useEffect(() => {
    if (loading || preferencesLoading || filteredGames.length === 0) {
      return;
    }

    const hasSelection = activeGameId
      ? games.some((game) => game.id === activeGameId)
      : false;

    if (!hasSelection) {
      setActiveGameId(filteredGames[0].id);
    }
  }, [activeGameId, filteredGames, games, loading, preferencesLoading, setActiveGameId]);

  const handleGameClick = useCallback((game: Game) => {
    setActiveGameId(game.id);
    window.electronAPI.savePreferences({ activeGameId: game.id }).catch((error) => {
      console.error('Error saving active game ID:', error);
    });
  }, [setActiveGameId]);

  return {
    activeGame,
    handleGameClick,
  };
}
