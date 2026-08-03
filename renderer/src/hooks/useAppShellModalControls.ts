import { useCallback } from 'react';
import type { Game } from '../types/game';
import type { OnyxSettingsModalProps } from '../components/OnyxSettingsModal';
import type { GameManagerProps } from '../components/GameManager';
import type { ImportWorkbenchProps } from '../components/importer/ImportWorkbench';
import type { UpdateLibraryModalProps } from '../components/UpdateLibraryModal';

interface UseAppShellModalControlsOptions {
  autoStartScan: boolean;
  closeGameManager: () => void;
  closeImportWorkbench: () => void;
  closeOnyxSettings: () => void;
  gameManagerInitialGameId: string | null;
  gameManagerInitialTab: 'metadata' | 'images' | 'links' | 'modManager';
  games: Game[];
  handleDeleteGameFromManager: (gameId: string) => Promise<void>;
  handleImport: (games: Game[], onProgress?: (current: number, total: number, phase: string, detail?: string) => void) => Promise<void>;
  handleOpenImporterWithMode: (mode: 'nuclear' | 'images' | 'links') => void;
  handleRequestOptimizer: () => void;
  handleSaveGameFromManager: (game: Game, oldGame?: Game) => Promise<void>;
  importWorkbenchInitialMode: 'nuclear' | 'images' | 'links' | null;
  isGameManagerOpen: boolean;
  isImportWorkbenchOpen: boolean;
  isOnyxSettingsOpen: boolean;
  isUpdateLibraryOpen: boolean;
  loadLibrary: () => Promise<void>;
  onyxSettingsInitialTab: OnyxSettingsModalProps['initialTab'];
  openApiSettings: () => void;
  openImportWorkbenchWithGames: (games: Array<any>, options?: { autoStartScan?: boolean }) => void;
  preScannedGames: Array<{
    uuid?: string;
    source?: 'steam' | 'epic' | 'gog' | 'xbox' | 'ubisoft' | 'rockstar' | 'ea' | 'battle' | 'manual_file' | 'manual_folder';
    originalName?: string;
    installPath?: string;
    exePath?: string;
    appId?: string;
    title?: string;
    name?: string;
  }>;
  refreshAfterSettingsSave: () => Promise<void>;
  setIsUpdateLibraryOpen: (open: boolean) => void;
}

export function useAppShellModalControls({
  autoStartScan,
  closeGameManager,
  closeImportWorkbench,
  closeOnyxSettings,
  gameManagerInitialGameId,
  gameManagerInitialTab,
  games,
  handleDeleteGameFromManager,
  handleImport,
  handleOpenImporterWithMode,
  handleRequestOptimizer,
  handleSaveGameFromManager,
  importWorkbenchInitialMode,
  isGameManagerOpen,
  isImportWorkbenchOpen,
  isOnyxSettingsOpen,
  isUpdateLibraryOpen,
  loadLibrary,
  onyxSettingsInitialTab,
  openApiSettings,
  openImportWorkbenchWithGames,
  preScannedGames,
  refreshAfterSettingsSave,
  setIsUpdateLibraryOpen,
}: UseAppShellModalControlsOptions) {
  const handleShowImportModal = useCallback((gamesToImport: Array<any>, appType?: 'steam' | 'xbox' | 'other') => {
    openImportWorkbenchWithGames(gamesToImport, { autoStartScan: appType === 'steam' });
  }, [openImportWorkbenchWithGames]);

  const onyxSettingsModalProps: OnyxSettingsModalProps = {
    initialTab: onyxSettingsInitialTab,
    isOpen: isOnyxSettingsOpen,
    onClose: closeOnyxSettings,
    onSave: refreshAfterSettingsSave,
    onShowImportModal: handleShowImportModal,
  };

  const importWorkbenchProps: ImportWorkbenchProps = {
    autoStartScan,
    existingLibrary: games,
    initialMode: importWorkbenchInitialMode,
    isOpen: isImportWorkbenchOpen,
    onClose: closeImportWorkbench,
    onImport: handleImport,
    onOpenApiSettings: openApiSettings,
    onRefreshComplete: loadLibrary,
    preScannedGames: preScannedGames.length > 0 ? preScannedGames : undefined,
  };

  const gameManagerProps: GameManagerProps = {
    games,
    initialGameId: gameManagerInitialGameId,
    initialTab: gameManagerInitialTab,
    isOpen: isGameManagerOpen,
    onClose: closeGameManager,
    onDeleteGame: handleDeleteGameFromManager,
    onOpenImporterWithMode: handleOpenImporterWithMode,
    onReloadLibrary: loadLibrary,
    onRequestOptimizer: handleRequestOptimizer,
    onSaveGame: handleSaveGameFromManager,
  };

  const updateLibraryModalProps: UpdateLibraryModalProps = {
    isOpen: isUpdateLibraryOpen,
    onClose: () => setIsUpdateLibraryOpen(false),
    onShowImportModal: handleShowImportModal,
    onUpdate: loadLibrary,
  };

  return {
    gameManagerProps,
    importWorkbenchProps,
    onyxSettingsModalProps,
    updateLibraryModalProps,
  };
}


