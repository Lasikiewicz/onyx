import { useCallback, useState } from 'react';
import type { ImportProgressCallback } from '../components/importer/ImportWorkbench';
import type { ImportSource } from '../types/importer';
import { Game } from '../types/game';
import { areAPIsConfigured } from '../utils/apiValidation';

type OnyxSettingsInitialTab = 'general' | 'appearance' | 'apis' | 'apps' | 'about';
type ImportWorkbenchMode = 'nuclear' | 'images' | 'links' | null;

interface FoundGameCandidate {
  uuid?: string;
  source?: ImportSource;
  originalName?: string;
  installPath?: string;
  exePath?: string;
  appId?: string;
  title?: string;
  name?: string;
}

interface ImporterHandoffGameCandidate {
  uuid?: string;
  source?: string;
  originalName?: string;
  installPath?: string;
  exePath?: string;
  appId?: string;
  title?: string;
  name?: string;
}

interface StartupProgressState {
  message: string;
}

interface UseImporterWorkbenchOptions {
  loadLibrary: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  setIsOnyxSettingsOpen: (open: boolean) => void;
  setOnyxSettingsInitialTab: (tab: OnyxSettingsInitialTab) => void;
  setStartupProgress: (value: StartupProgressState | null | ((current: StartupProgressState | null) => StartupProgressState | null)) => void;
  setFoundGames: (value: ImporterHandoffGameCandidate[] | null | ((current: ImporterHandoffGameCandidate[] | null) => ImporterHandoffGameCandidate[] | null)) => void;
  setShowLibraryTutorial: (open: boolean) => void;
}

async function enrichImportedArtwork(games: Game[]) {
  const gamesNeedingArtwork = games.filter(
    (game) => !game.bannerUrl || !game.iconUrl || !game.alternativeBannerUrl,
  );

  if (gamesNeedingArtwork.length === 0) {
    return;
  }

  const batchSize = 5;

  for (let i = 0; i < gamesNeedingArtwork.length; i += batchSize) {
    const batch = gamesNeedingArtwork.slice(i, i + batchSize);
    console.log(`[Import] [Background] Processing artwork batch ${i / batchSize + 1} (${batch.length} games)`);

    await Promise.all(batch.map(async (game) => {
      try {
        console.log(`[Import] [Background] Fetching banners for: ${game.title}`);
        const metadata = await window.electronAPI.searchArtwork(game.title, (game as any).appId);

        if (!metadata) {
          return;
        }

        let updatedGame = { ...game };
        let updated = false;

        if (metadata.bannerUrl && !game.bannerUrl) {
          updatedGame.bannerUrl = metadata.bannerUrl;
          updated = true;
        }
        if (metadata.alternativeBannerUrl && !game.alternativeBannerUrl) {
          updatedGame.alternativeBannerUrl = metadata.alternativeBannerUrl;
          updated = true;
        }
        if (metadata.iconUrl && !game.iconUrl) {
          updatedGame.iconUrl = metadata.iconUrl;
          updated = true;
        }

        try {
          const steamAppId = (game as any).appId;
          const bannerSearch = await window.electronAPI.searchImages(game.title, 'banner', steamAppId);

          if (bannerSearch?.success && bannerSearch.images) {
            const allBannerUrls: string[] = [];

            if (Array.isArray(bannerSearch.images)) {
              bannerSearch.images.forEach((item: any) => {
                if (item.images && Array.isArray(item.images)) {
                  item.images.forEach((img: any) => {
                    const url = img.url || img.bannerUrl;
                    if (url && !allBannerUrls.includes(url)) allBannerUrls.push(url);
                  });
                } else if (item.url || item.bannerUrl) {
                  const url = item.url || item.bannerUrl;
                  if (url && !allBannerUrls.includes(url)) allBannerUrls.push(url);
                }
              });
            }

            if (!updatedGame.bannerUrl && allBannerUrls.length > 0) {
              updatedGame.bannerUrl = allBannerUrls[0];
              updated = true;
            }

            if (allBannerUrls.length > 1) {
              const altUrl = allBannerUrls.find((url) => url !== updatedGame.bannerUrl) || allBannerUrls[1];
              if (altUrl && altUrl !== updatedGame.bannerUrl) {
                updatedGame.alternativeBannerUrl = altUrl;
                updated = true;
              }
            }
          }
        } catch (searchErr) {
          console.error(`[Import] [Background] Banner search error for ${game.title}:`, searchErr);
        }

        if (updated) {
          await window.electronAPI.saveGame(updatedGame);
        }
      } catch (err) {
        console.error(`[Import] [Background] Failed to fetch metadata for ${game.title}:`, err);
      }
    }));
  }
}

function normalizeImportSource(source?: string): ImportSource {
  switch (source) {
    case 'steam':
    case 'epic':
    case 'gog':
    case 'xbox':
    case 'ubisoft':
    case 'rockstar':
    case 'ea':
    case 'battle':
    case 'manual_file':
    case 'manual_folder':
      return source;
    default:
      return 'manual_file';
  }
}

export function useImporterWorkbench({
  loadLibrary,
  showToast,
  setIsOnyxSettingsOpen,
  setOnyxSettingsInitialTab,
  setStartupProgress,
  setFoundGames,
  setShowLibraryTutorial,
}: UseImporterWorkbenchOptions) {
  const [isImportWorkbenchOpen, setIsImportWorkbenchOpen] = useState(false);
  const [importWorkbenchInitialMode, setImportWorkbenchInitialMode] = useState<ImportWorkbenchMode>(null);
  const [autoStartScan, setAutoStartScan] = useState(false);
  const [preScannedGames, setPreScannedGames] = useState<FoundGameCandidate[]>([]);

  const resetImportWorkbench = useCallback(() => {
    setIsImportWorkbenchOpen(false);
    setImportWorkbenchInitialMode(null);
    setAutoStartScan(false);
    setPreScannedGames([]);
  }, []);

  const openImportWorkbench = useCallback((options?: { autoStartScan?: boolean; initialMode?: ImportWorkbenchMode }) => {
    setImportWorkbenchInitialMode(options?.initialMode ?? null);
    setAutoStartScan(options?.autoStartScan ?? false);
    setPreScannedGames([]);
    setIsImportWorkbenchOpen(true);
  }, []);

  const openImportWorkbenchWithGames = useCallback((foundGames: ImporterHandoffGameCandidate[], options?: { autoStartScan?: boolean }) => {
    window.electronAPI.showWindow?.();
    setStartupProgress(null);
    window.electronAPI.cancelStartupScan?.();
    setFoundGames(null);
    setPreScannedGames(foundGames.map((game) => ({
      ...game,
      source: normalizeImportSource(game.source),
    })));
    setImportWorkbenchInitialMode(null);
    setAutoStartScan(options?.autoStartScan ?? true);
    setIsImportWorkbenchOpen(true);
  }, [setFoundGames, setStartupProgress]);

  const requireConfiguredApis = useCallback(async () => {
    const apisConfigured = await areAPIsConfigured();
    if (apisConfigured) {
      return true;
    }

    showToast('API credentials must be configured before adding games. Please configure them in Settings.', 'error');
    setIsOnyxSettingsOpen(true);
    setOnyxSettingsInitialTab('apis');
    return false;
  }, [setIsOnyxSettingsOpen, setOnyxSettingsInitialTab, showToast]);

  const openApiSettings = useCallback(() => {
    setIsOnyxSettingsOpen(true);
    setOnyxSettingsInitialTab('apis');
  }, [setIsOnyxSettingsOpen, setOnyxSettingsInitialTab]);

  const handleUpdateSteamLibrary = useCallback(async () => {
    const apisConfigured = await requireConfiguredApis();
    if (!apisConfigured) {
      return;
    }

    window.electronAPI.showWindow?.();
    window.electronAPI.cancelStartupScan?.();
    openImportWorkbench();
  }, [openImportWorkbench, requireConfiguredApis]);

  const handleScanFolder = useCallback(async () => {
    const apisConfigured = await requireConfiguredApis();
    if (!apisConfigured) {
      return;
    }

    try {
      const folderPath = await window.electronAPI.showFolderDialog();
      if (!folderPath) {
        return;
      }

      openImportWorkbench();
    } catch (err) {
      console.error('Error selecting folder:', err);
      showToast('Failed to select folder', 'error');
    }
  }, [openImportWorkbench, requireConfiguredApis, showToast]);

  const handleImport = useCallback(async (importGames: Game[], onProgress?: ImportProgressCallback) => {
    try {
      for (let i = 0; i < importGames.length; i++) {
        const game = importGames[i];
        onProgress?.(i + 1, importGames.length, 'Saving games', `Saving ${game.title}...`);
        await window.electronAPI.saveGame(game);
      }

      enrichImportedArtwork(importGames).catch((err) => console.error('[Import] Background artwork task failed:', err));

      onProgress?.(importGames.length, importGames.length, 'Finishing', 'Reloading library...');
      await loadLibrary();
      showToast(`Successfully imported ${importGames.length} ${importGames.length === 1 ? 'game' : 'games'}`, 'success');
      resetImportWorkbench();

      const prefs = await window.electronAPI.getPreferences();
      if (!prefs.hasSeenPostImportTutorial) {
        setShowLibraryTutorial(true);
        await window.electronAPI.savePreferences({ hasSeenPostImportTutorial: true });
      }
    } catch (err) {
      console.error('Error importing games:', err);
      showToast('Failed to import games', 'error');
    }
  }, [loadLibrary, resetImportWorkbench, setShowLibraryTutorial, showToast]);

  return {
    autoStartScan,
    closeImportWorkbench: resetImportWorkbench,
    handleImport,
    handleOpenImporterWithGames: openImportWorkbenchWithGames,
    handleScanFolder,
    handleUpdateSteamLibrary,
    importWorkbenchInitialMode,
    isImportWorkbenchOpen,
    openApiSettings,
    openImportWorkbench,
    openImportWorkbenchWithGames,
    preScannedGames,
  };
}

