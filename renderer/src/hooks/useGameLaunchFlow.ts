import { useCallback, useRef, useState } from 'react';
import type { Game } from '../types/game';

interface UseGameLaunchFlowOptions {
  confirmGameLaunch: boolean;
}

export function useGameLaunchFlow({ confirmGameLaunch }: UseGameLaunchFlowOptions) {
  const [launchingGameId, setLaunchingGameId] = useState<string | null>(null);
  const [runningGames, setRunningGames] = useState<Set<string>>(new Set());
  const [launchConfirmation, setLaunchConfirmation] = useState<{ game: Game } | null>(null);
  const minimizedForTrackedLaunchesRef = useRef<Set<string>>(new Set());

  const restoreWindowAfterLaunchIfNeeded = useCallback(async (gameId: string) => {
    const prefs = await window.electronAPI.getPreferences();
    const shouldRestore = minimizedForTrackedLaunchesRef.current.has(gameId);
    minimizedForTrackedLaunchesRef.current.delete(gameId);

    if (prefs.restoreAfterLaunch && shouldRestore) {
      await window.electronAPI.restoreWindow();
    }
  }, []);

  const checkProcessRunning = useCallback(async (pid: number): Promise<boolean> => {
    try {
      const result = await window.electronAPI.checkProcessExists(pid);
      return result ?? false;
    } catch {
      return false;
    }
  }, []);

  const monitorGameProcess = useCallback(async (gameId: string, pid: number) => {
    const checkInterval = setInterval(async () => {
      try {
        const isRunning = await checkProcessRunning(pid);
        if (!isRunning) {
          clearInterval(checkInterval);
          setRunningGames((prev) => {
            const next = new Set(prev);
            next.delete(gameId);
            return next;
          });
          await window.electronAPI.scanning?.gameStopped?.(gameId);
          await restoreWindowAfterLaunchIfNeeded(gameId);
        }
      } catch (error) {
        console.error('Error checking process:', error);
        clearInterval(checkInterval);
        minimizedForTrackedLaunchesRef.current.delete(gameId);
      }
    }, 2000);
  }, [checkProcessRunning, restoreWindowAfterLaunchIfNeeded]);

  const pollForGameProcess = useCallback(async (gameId: string) => {
    let pollCount = 0;
    const maxPolls = 30;

    const checkInterval = setInterval(async () => {
      pollCount += 1;
      if (pollCount > maxPolls) {
        clearInterval(checkInterval);
        minimizedForTrackedLaunchesRef.current.delete(gameId);
        setRunningGames((prev) => {
          const next = new Set(prev);
          next.delete(gameId);
          return next;
        });
        await window.electronAPI.scanning?.gameStopped?.(gameId);
      }
    }, 2000);
  }, []);

  const launchGame = useCallback(async (game: Game) => {
    setLaunchingGameId(game.id);
    try {
      try {
        const suspendEnabled = await window.electronAPI.suspend.getFeatureEnabled();
        if (suspendEnabled) {
          const trackedGames = await window.electronAPI.suspend.getRunningGames();
          const trackedGame = trackedGames.find((entry: { gameId: string }) => entry.gameId === game.id);

          if (trackedGame?.status === 'suspended') {
            const resumeResult = await window.electronAPI.suspend.resumeGame(game.id);
            setLaunchingGameId(null);

            if (!resumeResult.success) {
              alert(`Failed to resume game: ${resumeResult.error || 'Unknown error'}`);
              return;
            }

            setRunningGames((prev) => new Set(prev).add(game.id));
            return;
          }

          if (trackedGame?.status === 'running') {
            setLaunchingGameId(null);
            return;
          }
        }
      } catch (suspendLookupError) {
        console.warn('Suspend state lookup failed before launch, continuing with normal launch flow:', suspendLookupError);
      }

      const result = await window.electronAPI.launchGame(game.id);
      if (!result.success) {
        console.error('Failed to launch game:', result.error);
        alert(`Failed to launch game: ${result.error || 'Unknown error'}`);
        setLaunchingGameId(null);
        return;
      }

      const prefs = await window.electronAPI.getPreferences();
      if (prefs.minimizeOnGameLaunch) {
        await window.electronAPI.minimizeWindow();
      }

      await window.electronAPI.scanning?.gameStarted?.(game.id);

      setTimeout(() => {
        setLaunchingGameId(null);
        setRunningGames((prev) => new Set(prev).add(game.id));

        if (result.pid) {
          if (prefs.minimizeOnGameLaunch) {
            minimizedForTrackedLaunchesRef.current.add(game.id);
          }
          void monitorGameProcess(game.id, result.pid);
        } else {
          minimizedForTrackedLaunchesRef.current.delete(game.id);
          void pollForGameProcess(game.id);
        }
      }, 1000);
    } catch (error) {
      console.error('Error launching game:', error);
      alert(`Error launching game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setLaunchingGameId(null);
    }
  }, [monitorGameProcess, pollForGameProcess]);

  const handlePlay = useCallback(async (game: Game) => {
    if (confirmGameLaunch) {
      setLaunchConfirmation({ game });
      return;
    }

    await launchGame(game);
  }, [confirmGameLaunch, launchGame]);

  const confirmLaunch = useCallback(async () => {
    if (!launchConfirmation) return;
    const game = launchConfirmation.game;
    setLaunchConfirmation(null);
    await launchGame(game);
  }, [launchConfirmation, launchGame]);

  const cancelLaunchConfirmation = useCallback(() => {
    setLaunchConfirmation(null);
  }, []);

  return {
    handlePlay,
    launchingGameId,
    runningGames,
    launchConfirmation,
    confirmLaunch,
    cancelLaunchConfirmation,
  };
}
