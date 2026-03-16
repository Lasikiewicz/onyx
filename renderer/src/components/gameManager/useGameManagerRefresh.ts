import { useCallback, useEffect, useState } from 'react';
import type { Game } from '../../types/game';

interface RefreshProgressState {
  current: number;
  total: number;
  message: string;
  gameTitle?: string;
  links?: Array<{ name: string; url: string }>;
  images?: string[];
  mode?: 'all' | 'missing' | 'links';
}

interface UseGameManagerRefreshOptions {
  games: Game[];
  localGames: Game[];
  onReloadLibrary?: () => Promise<void>;
  onSaveGame: (game: Game, oldGame?: Game) => Promise<void>;
  onOpenImporterWithMode?: (mode: 'nuclear' | 'images' | 'links') => void;
  onOptimizeAllImages: () => Promise<void>;
  setError: (value: string | null) => void;
  setSuccess: (value: string | null) => void;
}

export function useGameManagerRefresh({
  games,
  localGames,
  onReloadLibrary,
  onSaveGame,
  onOpenImporterWithMode,
  onOptimizeAllImages,
  setError,
  setSuccess,
}: UseGameManagerRefreshOptions) {
  const [showRefreshDialog, setShowRefreshDialog] = useState(false);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const [refreshMode, setRefreshMode] = useState<'nuclear' | 'images' | 'links' | 'optimizer' | null>(null);
  const [refreshProgress, setRefreshProgress] = useState<RefreshProgressState | null>(null);
  const [isCancellingRefresh, setIsCancellingRefresh] = useState(false);
  const [showMatchFix, setShowMatchFix] = useState(false);
  const [unmatchedGames, setUnmatchedGames] = useState<Array<{ gameId: string; title: string; searchResults: any[] }>>([]);
  const [showBoxartFix, setShowBoxartFix] = useState(false);
  const [missingBoxartGames, setMissingBoxartGames] = useState<Array<{ gameId: string; title: string; steamAppId?: string }>>([]);
  const [shouldSelectFirstGameAfterRefresh, setShouldSelectFirstGameAfterRefresh] = useState(false);

  const handleRefreshMetadata = useCallback(async (mode: 'all' | 'missing' | 'links', continueFromIndex: number = 0) => {
    try {
      setIsCancellingRefresh(false);
      const result = await window.electronAPI.refreshAllMetadata({
        allGames: mode === 'all',
        linksOnly: mode === 'links',
        continueFromIndex,
      });

      if (result.success) {
        if (result.canceled) {
          setSuccess('Metadata refresh cancelled.');
          setRefreshProgress(null);
          return;
        }

        if (result.unmatchedGames && result.unmatchedGames.length > 0) {
          setUnmatchedGames(result.unmatchedGames);
          setShowMatchFix(true);
          setRefreshProgress(null);
          if (result.missingBoxartGames && result.missingBoxartGames.length > 0) {
            setMissingBoxartGames(result.missingBoxartGames);
          }
        } else {
          if (result.missingBoxartGames && result.missingBoxartGames.length > 0) {
            console.log(`[GameManager] ${result.missingBoxartGames.length} game(s) still missing boxart after auto-search`);
            setMissingBoxartGames(result.missingBoxartGames);
            setShowBoxartFix(true);
            setRefreshProgress(null);
            setError(`Refresh completed but ${result.missingBoxartGames.length} game(s) are missing boxart. Please select boxart for these games.`);
            return;
          }

          if (result.count === 0) {
            setTimeout(() => {
              setRefreshProgress(null);
            }, 2000);
          } else {
            if (!result.success) {
              setError(`Refresh completed but ${result.missingBoxartGames?.length || 0} game(s) are missing boxart. Please select boxart for these games.`);
            }

            if (onReloadLibrary) {
              setRefreshProgress({
                current: result.count,
                total: result.count,
                message: 'Refresh completed! Reloading library...',
              });
              await new Promise(resolve => setTimeout(resolve, 800));
              try {
                await onReloadLibrary();
                setRefreshProgress(null);
                setShouldSelectFirstGameAfterRefresh(true);
              } catch (reloadError) {
                console.error('Error reloading library:', reloadError);
                setError('Failed to reload library after refresh');
                setRefreshProgress(null);
              }
            } else {
              setTimeout(() => {
                setRefreshProgress(null);
                setShouldSelectFirstGameAfterRefresh(true);
              }, 2000);
            }
          }
        }
      } else {
        setError(result.error || 'Failed to refresh metadata');
        setTimeout(() => {
          setRefreshProgress(null);
        }, 2000);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh metadata');
      setTimeout(() => {
        setRefreshProgress(null);
      }, 2000);
    } finally {
      setIsCancellingRefresh(false);
    }
  }, [onReloadLibrary, setError, setSuccess]);

  const handleCancelMetadataRefresh = useCallback(async () => {
    if (isCancellingRefresh) return;
    setIsCancellingRefresh(true);
    setRefreshProgress(prev => (prev ? { ...prev, message: 'Cancelling refresh...' } : prev));
    try {
      await window.electronAPI.cancelMetadataRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel metadata refresh');
      setIsCancellingRefresh(false);
    }
  }, [isCancellingRefresh, setError]);

  const handleConfirmRefreshAction = useCallback(async () => {
    setShowRefreshConfirm(false);
    const mode = refreshMode;
    setRefreshMode(null);
    if (!mode) return;

    try {
      setError(null);
      setSuccess(null);
      if (mode === 'optimizer') {
        await onOptimizeAllImages();
      } else if (mode === 'images') {
        setRefreshProgress({ current: 0, total: localGames.length, message: 'Searching for missing images...', mode: 'missing' });
        await handleRefreshMetadata('missing');
      } else if (mode === 'links') {
        const credentials = await window.electronAPI.getAPICredentials?.();
        const hasIGDB = !!(credentials?.igdbClientId?.trim() && credentials?.igdbClientSecret?.trim());
        if (!hasIGDB) {
          setError('Links refresh requires IGDB credentials. Go to Settings -> APIs and add IGDB client ID + secret.');
          return;
        }
        setRefreshProgress({ current: 0, total: localGames.length, message: 'Refreshing links...', mode: 'links' });
        await handleRefreshMetadata('links');
      } else if (mode === 'nuclear') {
        onOpenImporterWithMode?.(mode);
      } else {
        onOpenImporterWithMode?.('nuclear');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    }
  }, [handleRefreshMetadata, localGames.length, onOpenImporterWithMode, onOptimizeAllImages, refreshMode, setError, setSuccess]);

  const handleMatchFix = useCallback(async (fixes: Map<string, { providerId: string; providerSource: string }>, ignoredGames: Set<string>) => {
    setShowMatchFix(false);
    setRefreshProgress({ current: 0, total: fixes.size, message: 'Applying fixes...' });

    try {
      const gameIdsToRefresh = Array.from(fixes.keys());
      let fixedCount = 0;

      for (const [gameId, fix] of fixes.entries()) {
        const game = games.find(candidate => candidate.id === gameId);
        if (!game) continue;

        setRefreshProgress({
          current: fixedCount + 1,
          total: gameIdsToRefresh.length,
          message: `Fetching metadata for ${game.title}...`,
          gameTitle: game.title,
        });
        await window.electronAPI.fetchAndUpdateByProviderId(gameId, fix.providerId, fix.providerSource);
        fixedCount++;
      }

      setSuccess(`Successfully fixed ${fixedCount} game${fixedCount !== 1 ? 's' : ''}${ignoredGames.size > 0 ? `, ${ignoredGames.size} ignored` : ''}`);
      if (onReloadLibrary) {
        await onReloadLibrary();
      }

      if (missingBoxartGames.length > 0) {
        setShowBoxartFix(true);
        setRefreshProgress(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply fixes');
      setTimeout(() => {
        setRefreshProgress(null);
      }, 2000);
    } finally {
      if (missingBoxartGames.length === 0) {
        setTimeout(() => {
          setRefreshProgress(null);
        }, 2000);
      }
    }
  }, [games, missingBoxartGames.length, onReloadLibrary, setError, setSuccess]);

  const handleCancelMatchFix = useCallback(async () => {
    setShowMatchFix(false);
    setUnmatchedGames([]);
    if (missingBoxartGames.length > 0) {
      setShowBoxartFix(true);
      setRefreshProgress(null);
    } else {
      setRefreshProgress(null);
    }
  }, [missingBoxartGames.length]);

  const handleBoxartFix = useCallback(async (fixes: Map<string, string>) => {
    setShowBoxartFix(false);
    setRefreshProgress({ current: 0, total: fixes.size, message: 'Applying boxart...' });

    try {
      let fixedCount = 0;

      for (const [gameId, boxArtUrl] of fixes.entries()) {
        const game = localGames.find(candidate => candidate.id === gameId);
        if (!game) continue;

        setRefreshProgress({
          current: fixedCount + 1,
          total: fixes.size,
          message: `Caching and applying boxart for ${game.title}...`,
          gameTitle: game.title,
        });

        const updatedGame = { ...game, boxArtUrl };
        await onSaveGame(updatedGame);
        fixedCount++;
      }

      setSuccess(`Successfully applied boxart for ${fixedCount} game${fixedCount !== 1 ? 's' : ''}`);

      if (onReloadLibrary) {
        await onReloadLibrary();
      }
      setTimeout(() => {
        setRefreshProgress(null);
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply boxart');
      setTimeout(() => {
        setRefreshProgress(null);
      }, 2000);
    }
  }, [localGames, onReloadLibrary, onSaveGame, setError, setSuccess]);

  const handleCancelBoxartFix = useCallback(() => {
    setShowBoxartFix(false);
    setRefreshProgress(null);
  }, []);

  useEffect(() => {
    const handleProgress = (_event: any, progress: { current: number; total: number; message: string; gameTitle?: string; links?: any[]; images?: string[] }) => {
      setRefreshProgress(prev => ({
        ...progress,
        mode: prev?.mode || (progress.message?.toLowerCase().includes('links') ? 'links' : 'all'),
        links: progress.links,
        images: progress.images,
      }));
    };

    const removeMetadataProgress = window.electronAPI?.on && window.electronAPI.on('metadata:refreshProgress', handleProgress);
    return () => {
      if (typeof removeMetadataProgress === 'function') removeMetadataProgress();
    };
  }, []);

  return {
    showRefreshDialog,
    setShowRefreshDialog,
    showRefreshConfirm,
    setShowRefreshConfirm,
    refreshMode,
    setRefreshMode,
    refreshProgress,
    setRefreshProgress,
    isCancellingRefresh,
    showMatchFix,
    unmatchedGames,
    showBoxartFix,
    missingBoxartGames,
    shouldSelectFirstGameAfterRefresh,
    setShouldSelectFirstGameAfterRefresh,
    handleConfirmRefreshAction,
    handleCancelMetadataRefresh,
    handleMatchFix,
    handleCancelMatchFix,
    handleBoxartFix,
    handleCancelBoxartFix,
  };
}
