import { useEffect, useState } from 'react';
import { Game } from '../types/game';

// Helper function to add cache buster to URLs
function addCacheBuster(url: string, timestamp?: number): string {
  if (!url) return url;
  // Add timestamp as cache buster (only for local/http URLs, not for data URLs)
  if (url.startsWith('onyx-local://') || url.startsWith('http://') || url.startsWith('https://')) {
    // Remove any existing timestamp parameters to avoid stacking them
    const cleanUrl = url.replace(/[?&]t=\d+(&|$)/g, (_match, ampersand) => ampersand === '&' ? '&' : '');
    const separator = cleanUrl.includes('?') ? '&' : '?';
    return `${cleanUrl}${separator}t=${timestamp || Date.now()}`;
  }
  return url;
}

// Helper function to convert file:// URLs to onyx-local:// protocol
function convertFileUrlToLocalProtocol(url: string): string {
  if (!url) return url;
  // If it's already using onyx-local://, check if it needs conversion
  if (url.startsWith('onyx-local://')) {
    // If it's the old URL-encoded format (contains %), convert to new base64 format
    // This handles old URLs in the database
    if (url.includes('%')) {
      try {
        // Extract the encoded path
        let encodedPath = url.replace('onyx-local://', '').replace('onyx-local:///', '');
        // Remove trailing slash
        if (encodedPath.endsWith('/')) {
          encodedPath = encodedPath.substring(0, encodedPath.length - 1);
        }
        // Already URL-encoded, return as-is (no conversion needed)
        return url;
      } catch (e) {
        // If conversion fails, return as-is
        console.warn('Failed to convert old onyx-local URL format:', url);
        return url;
      }
    }
    // Already in new format, return as-is
    return url;
  }
  // If it's a file:// URL, convert it to URL-encoded onyx-local:// URL
  if (url.startsWith('file:///')) {
    const filePath = url.replace('file:///', '');
    // Use URL encoding (case-insensitive, works even if Electron lowercases)
    const encodedPath = encodeURIComponent(filePath);
    return `onyx-local://${encodedPath}`;
  }
  // If it's a file:// URL without the third slash (Unix style)
  if (url.startsWith('file://')) {
    const filePath = url.replace('file://', '');
    // Remove leading slash on Windows
    const normalizedPath = process.platform === 'win32' && filePath.startsWith('/')
      ? filePath.substring(1)
      : filePath;
    // Use URL encoding (case-insensitive, works even if Electron lowercases)
    const encodedPath = encodeURIComponent(normalizedPath);
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
      let prefs = await window.electronAPI.getPreferences();

      if (!prefs.perGameViewSizeOverridesMigrated) {
        const migrationResult = await window.electronAPI.migratePerGameViewSizeOverrides();
        if (migrationResult?.success) {
          const mergedOverrides = {
            ...(prefs.perGameViewSizeOverrides || {}),
            ...(migrationResult.overrides || {}),
          };
          const libraryForNames = await window.electronAPI.getLibrary();
          const nameById = new Map(libraryForNames.map((game) => [game.id, game.title]));
          const perViewCustomByView: any = { grid: {}, list: {}, logo: {}, carousel: {}, coverflow: {} };
          Object.entries(mergedOverrides).forEach(([gameId, viewMap]) => {
            const gameName = nameById.get(gameId);
            Object.entries(viewMap || {}).forEach(([viewKey, value]) => {
              if (typeof value === 'number' && perViewCustomByView[viewKey]) {
                perViewCustomByView[viewKey][gameId] = { gameName, size: value };
              }
            });
          });
          await window.electronAPI.savePreferences({
            perGameViewSizeOverrides: mergedOverrides,
            perGameViewCustomByView: perViewCustomByView,
            perGameViewSizeOverridesMigrated: true,
          });
          prefs = {
            ...prefs,
            perGameViewSizeOverrides: mergedOverrides,
            perGameViewCustomByView: perViewCustomByView,
            perGameViewSizeOverridesMigrated: true,
          };
        }
      }

      const library = await window.electronAPI.getLibrary();
      const perGameOverrides = prefs.perGameViewSizeOverrides || {};
      // Convert file:// URLs to onyx-local:// when loading (for backward compatibility)
      // Add cache-busting timestamp to force fresh image loads
      const timestamp = Date.now();
      const convertedGames = library.map(game => ({
        ...game,
        logoSizePerViewMode: {
          ...(game.logoSizePerViewMode || {}),
          ...(perGameOverrides[game.id] || {}),
        },
        useAlternativeBackground: game.useAlternativeBackground ?? true,
        boxArtUrl: addCacheBuster(convertFileUrlToLocalProtocol(game.boxArtUrl), timestamp),
        bannerUrl: addCacheBuster(convertFileUrlToLocalProtocol(game.bannerUrl), timestamp),
        alternativeBannerUrl: game.alternativeBannerUrl ? addCacheBuster(convertFileUrlToLocalProtocol(game.alternativeBannerUrl), timestamp) : game.alternativeBannerUrl,
        logoUrl: game.logoUrl ? addCacheBuster(convertFileUrlToLocalProtocol(game.logoUrl), timestamp) : game.logoUrl,
        heroUrl: game.heroUrl ? addCacheBuster(convertFileUrlToLocalProtocol(game.heroUrl), timestamp) : game.heroUrl,
        iconUrl: game.iconUrl ? addCacheBuster(convertFileUrlToLocalProtocol(game.iconUrl), timestamp) : game.iconUrl,
      }));
      setGames(convertedGames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load game library');
      console.error('Error loading game library:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateGameInState = (updatedGame: Game) => {
    // Update the game in local state without reloading
    // DO NOT add cache busters here - that causes image reloads on every state update
    // Images already have cache busters from initial load, keep URLs stable during edits
    const gameWithConvertedUrls = {
      ...updatedGame,
      boxArtUrl: updatedGame.boxArtUrl ? convertFileUrlToLocalProtocol(updatedGame.boxArtUrl) : updatedGame.boxArtUrl,
      bannerUrl: updatedGame.bannerUrl ? convertFileUrlToLocalProtocol(updatedGame.bannerUrl) : updatedGame.bannerUrl,
      alternativeBannerUrl: updatedGame.alternativeBannerUrl ? convertFileUrlToLocalProtocol(updatedGame.alternativeBannerUrl) : updatedGame.alternativeBannerUrl,
      logoUrl: updatedGame.logoUrl ? convertFileUrlToLocalProtocol(updatedGame.logoUrl) : updatedGame.logoUrl,
      heroUrl: updatedGame.heroUrl ? convertFileUrlToLocalProtocol(updatedGame.heroUrl) : updatedGame.heroUrl,
      iconUrl: updatedGame.iconUrl ? convertFileUrlToLocalProtocol(updatedGame.iconUrl) : updatedGame.iconUrl,
    };
    setGames(prevGames =>
      prevGames.map(g => g.id === updatedGame.id ? gameWithConvertedUrls : g)
    );
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

  // Listen for library updates from main process (e.g., when games are removed)
  useEffect(() => {
    const handleLibraryUpdate = (_event: any) => {
      console.log('[useGameLibrary] Library updated, reloading...');
      loadLibrary();
    };

    const removeLibraryUpdate = window.electronAPI?.on && window.electronAPI.on('gameStore:libraryUpdated', handleLibraryUpdate);

    return () => {
      if (typeof removeLibraryUpdate === 'function') removeLibraryUpdate();
    };
  }, []);

  return {
    games,
    loading,
    error,
    loadLibrary,
    saveGame,
    updateGameInState,
    reorderGames,
    addCustomGame,
    deleteGame,
  };
}
