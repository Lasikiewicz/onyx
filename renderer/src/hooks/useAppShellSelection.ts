import { useCallback, useEffect, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { Game } from '../types/game';

interface UseAppShellSelectionOptions {
  activeGameId: string | null;
  filteredGames: Game[];
  games: Game[];
  loading: boolean;
  setActiveGameId: Dispatch<SetStateAction<string | null>>;
}

export function useAppShellSelection({
  activeGameId,
  filteredGames,
  games,
  loading,
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

  useEffect(() => {
    if (loading || filteredGames.length === 0) {
      return;
    }

    const hasVisibleSelection = activeGameId
      ? filteredGames.some((game) => game.id === activeGameId)
      : false;

    if (!hasVisibleSelection) {
      setActiveGameId(filteredGames[0].id);
    }
  }, [activeGameId, filteredGames, loading, setActiveGameId]);

  const handleGameClick = useCallback((game: Game) => {
    setActiveGameId(game.id);
  }, [setActiveGameId]);

  return {
    activeGame,
    handleGameClick,
  };
}
