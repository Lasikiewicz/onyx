import { useEffect } from 'react';
import { areAPIsConfigured } from '../utils/apiValidation';

type ToastType = 'success' | 'error';

interface FoundGame {
  id?: string;
  title: string;
  exePath?: string;
  installPath?: string;
  platform?: string;
  source?: string;
}

interface StartupProgressState {
  message: string;
}

interface UpdateNotificationState {
  version: string;
  status: 'available' | 'downloading' | 'downloaded' | 'error';
  error?: string;
}

interface UseAppShellEventsOptions {
  showToast: (message: string, type?: ToastType) => void;
  handleScanFolder: () => void;
  handleUpdateSteamLibrary: () => void;
  handleOpenImporterWithGames: (games: FoundGame[]) => void;
  setIsOnyxSettingsOpen: (open: boolean) => void;
  setOnyxSettingsInitialTab: (tab: 'general' | 'appearance' | 'apis' | 'apps' | 'about') => void;
  setIsModalOpen: (open: boolean) => void;
  setIsSteamConfigOpen: (open: boolean) => void;
  setFoundGames: React.Dispatch<React.SetStateAction<FoundGame[] | null>>;
  setStartupProgress: React.Dispatch<React.SetStateAction<StartupProgressState | null>>;
  setMissingGames: React.Dispatch<React.SetStateAction<Array<{ id: string; title: string; exePath?: string; platform?: string; source?: string }> | null>>;
  setIsUpdateModalTest: (value: boolean) => void;
  setUpdateNotification: React.Dispatch<React.SetStateAction<UpdateNotificationState | null>>;
  setCrashDumpPaths: (paths: string[] | null) => void;
}

export function useAppShellEvents({
  showToast,
  handleScanFolder,
  handleUpdateSteamLibrary,
  handleOpenImporterWithGames,
  setIsOnyxSettingsOpen,
  setOnyxSettingsInitialTab,
  setIsModalOpen,
  setIsSteamConfigOpen,
  setFoundGames,
  setStartupProgress,
  setMissingGames,
  setIsUpdateModalTest,
  setUpdateNotification,
  setCrashDumpPaths,
}: UseAppShellEventsOptions) {
  useEffect(() => {
    window.electronAPI.notifyAppReady?.();

    const cleanup1 = window.electronAPI.onMenuEvent('menu:addGame', async () => {
      const apisConfigured = await areAPIsConfigured();
      if (!apisConfigured) {
        showToast('Both IGDB (Client ID + Secret) and SteamGridDB (API Key) are required before adding games. Please configure them in Settings > APIs.', 'error');
        setIsOnyxSettingsOpen(true);
        setOnyxSettingsInitialTab('apis');
        return;
      }
      setIsModalOpen(true);
    });
    const cleanup2 = window.electronAPI.onMenuEvent('menu:scanFolder', () => {
      handleScanFolder();
    });
    const cleanup3 = window.electronAPI.onMenuEvent('menu:updateSteamLibrary', () => {
      handleUpdateSteamLibrary();
    });
    const cleanup4 = window.electronAPI.onMenuEvent('menu:configureSteam', () => {
      setIsSteamConfigOpen(true);
    });
    const cleanup5 = window.electronAPI.onMenuEvent('menu:checkForUpdates', () => {
      window.electronAPI.checkForUpdates?.();
    });

    const newGamesHandler = (_event: unknown, data: { count: number; games: FoundGame[] }) => {
      if (data.games && data.games.length > 0) {
        handleOpenImporterWithGames(data.games);
      }
    };

    const backgroundNewGamesHandler = (_event: unknown, data: { count: number; games: FoundGame[]; bySource?: Record<string, FoundGame[]> }) => {
      console.log('[App] Background scan found new games:', data);
      if (Array.isArray(data.games) && data.games.length > 0) {
        handleOpenImporterWithGames(data.games);
      }
    };

    const startupNewGamesHandler = (_event: unknown, data: { count?: number; games?: FoundGame[] }) => {
      if (Array.isArray(data.games) && data.games.length > 0) {
        setFoundGames(data.games);
      }
    };

    const startupProgressHandler = (_event: unknown, data: StartupProgressState) => {
      if (!data || typeof data !== 'object') {
        console.warn('[App] Received malformed startup:progress data:', data);
        return;
      }

      setStartupProgress(data);

      if (data.message && (data.message.includes('Scan complete') || data.message.includes('Error'))) {
        setTimeout(() => {
          setFoundGames((currentFoundGames) => {
            if (currentFoundGames && currentFoundGames.length > 0) {
              return currentFoundGames;
            }

            setStartupProgress(null);
            return currentFoundGames;
          });
        }, 500);
      }
    };

    const missingGamesHandler = (
      _event: unknown,
      data: { games: Array<{ id: string; title: string; exePath?: string; platform?: string; source?: string }> },
    ) => {
      console.log('[App] Missing games detected:', data);
      if (data.games && data.games.length > 0) {
        setMissingGames(data.games);
      }
    };

    const removeSteamNewGames = window.electronAPI?.on && window.electronAPI.on('steam:newGamesFound', newGamesHandler);
    const removeBackgroundNewGames = window.electronAPI?.on && window.electronAPI.on('background:newGamesFound', backgroundNewGamesHandler);
    const removeStartupNewGames = window.electronAPI?.on && window.electronAPI.on('startup:newGamesFound', startupNewGamesHandler);
    const removeStartupProgress = window.electronAPI?.on && window.electronAPI.on('startup:progress', startupProgressHandler);
    const removeMissingGames = window.electronAPI?.on && window.electronAPI.on('scan:missing-games', missingGamesHandler);

    const updateStatusHandler = (_event: unknown, payload: { status: string; version?: string; error?: string }) => {
      if (payload.status === 'available' && payload.version) {
        setIsUpdateModalTest(false);
        setUpdateNotification({
          version: payload.version,
          status: 'available',
        });
        window.electronAPI.onUpdateFound?.();
      } else if (payload.status === 'downloading') {
        setIsUpdateModalTest(false);
        setUpdateNotification((prev) => (prev ? { ...prev, status: 'downloading' } : null));
      } else if (payload.status === 'downloaded') {
        setIsUpdateModalTest(false);
        setUpdateNotification((prev) => (prev ? { ...prev, status: 'downloaded' } : null));
      } else if (payload.status === 'error' && payload.error) {
        setIsUpdateModalTest(false);
        setUpdateNotification((prev) => (prev ? { ...prev, status: 'error', error: payload.error } : null));
      }
    };

    const removeUpdateStatus = window.electronAPI?.on && window.electronAPI.on('app:update-status', updateStatusHandler);
    const removeCrashDumps = window.electronAPI?.on && window.electronAPI.on(
      'crash:dumpsAvailable',
      (_event: unknown, payload: { paths: string[] }) => {
        if (payload?.paths?.length) {
          setCrashDumpPaths(payload.paths);
        }
      },
    );

    return () => {
      cleanup1();
      cleanup2();
      cleanup3();
      cleanup4();
      cleanup5();
      if (typeof removeSteamNewGames === 'function') removeSteamNewGames();
      if (typeof removeBackgroundNewGames === 'function') removeBackgroundNewGames();
      if (typeof removeStartupNewGames === 'function') removeStartupNewGames();
      if (typeof removeStartupProgress === 'function') removeStartupProgress();
      if (typeof removeMissingGames === 'function') removeMissingGames();
      if (typeof removeUpdateStatus === 'function') removeUpdateStatus();
      if (typeof removeCrashDumps === 'function') removeCrashDumps();
    };
  }, [
    handleOpenImporterWithGames,
    handleScanFolder,
    handleUpdateSteamLibrary,
    setCrashDumpPaths,
    setFoundGames,
    setIsModalOpen,
    setIsOnyxSettingsOpen,
    setIsSteamConfigOpen,
    setIsUpdateModalTest,
    setMissingGames,
    setOnyxSettingsInitialTab,
    setStartupProgress,
    setUpdateNotification,
    showToast,
  ]);
}
