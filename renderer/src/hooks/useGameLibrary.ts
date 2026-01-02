import { useEffect, useState } from 'react';
import { Game } from '../types/game';

// Helper function to convert file:// URLs to onyx-local:// protocol
function convertFileUrlToLocalProtocol(url: string): string {
  if (!url) return url;
  // If it's already using onyx-local://, return as is
  if (url.startsWith('onyx-local://')) return url;
  // If it's a file:// URL, convert it
  if (url.startsWith('file:///')) {
    const filePath = url.replace('file:///', '');
    const encodedPath = encodeURIComponent(filePath);
    return `onyx-local://${encodedPath}`;
  }
  // If it's a file:// URL without the third slash (Unix style)
  if (url.startsWith('file://')) {
    const filePath = url.replace('file://', '');
    const encodedPath = encodeURIComponent(filePath);
    return `onyx-local://${encodedPath}`;
  }
  // Otherwise, return as is (https, data, etc.)
  return url;
}

export function useGameLibrary() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLibrary = async () => {
    try {
      setLoading(true);
      setError(null);
      const library = await window.electronAPI.getLibrary();
      // Convert file:// URLs to onyx-local:// when loading
      const convertedGames = library.map(game => ({
        ...game,
        boxArtUrl: convertFileUrlToLocalProtocol(game.boxArtUrl),
        bannerUrl: convertFileUrlToLocalProtocol(game.bannerUrl),
      }));
      setGames(convertedGames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game library');
      console.error('Error loading game library:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveGame = async (game: Game) => {
    try {
      const success = await window.electronAPI.saveGame(game);
      if (success) {
        // Reload library to get updated data
        await loadLibrary();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error saving game:', err);
      return false;
    }
  };

  const reorderGames = async (reorderedGames: Game[]) => {
    try {
      const success = await window.electronAPI.reorderGames(reorderedGames);
      if (success) {
        // Update local state immediately for better UX
        setGames(reorderedGames);
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error reordering games:', err);
      return false;
    }
  };

  const addCustomGame = async (_game: Game) => {
    try {
      // The game is already saved by the IPC handler, just reload the library
      await loadLibrary();
      return true;
    } catch (err) {
      console.error('Error adding custom game:', err);
      return false;
    }
  };

  const deleteGame = async (gameId: string) => {
    try {
      const success = await window.electronAPI.deleteGame(gameId);
      if (success) {
        // Reload library to get updated data
        await loadLibrary();
        return true;
      }
      return false;
    } catch (err) {
      console.error('Error deleting game:', err);
      return false;
    }
  };

  // Load library when component mounts
  useEffect(() => {
    loadLibrary();
  }, []);

  return {
    games,
    loading,
    error,
    loadLibrary,
    saveGame,
    reorderGames,
    addCustomGame,
    deleteGame,
  };
}
