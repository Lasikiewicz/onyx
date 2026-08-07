import { lazy, Suspense, useEffect, type ReactNode } from 'react';
import type { Game } from '../../types/game';
import { AddGameModal } from '../AddGameModal';
import { BoxartFixDialog } from '../BoxartFixDialog';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { CrashDumpModal } from '../CrashDumpModal';
import { FileSelectionModal } from '../FileSelectionModal';
import { FoundGamesModal } from '../FoundGamesModal';
import { ImageSearchModal } from '../ImageSearchModal';
import { LibraryTutorialModal } from '../LibraryTutorialModal';
import { MatchFixDialog } from '../MatchFixDialog';
import { MissingGamesModal } from '../MissingGamesModal';
import { RefreshMetadataDialog } from '../RefreshMetadataDialog';
import { RemoveDeletedGamesDialog } from '../RemoveDeletedGamesDialog';
import { SteamConfigModal } from '../SteamConfigModal';
import { UpdateNotificationModal } from '../UpdateNotificationModal';
import { StartupScanOverlay } from '../appShell/StartupScanOverlay';
import { GameManagerRefreshConfirmDialog } from '../gameManager/GameManagerRefreshConfirmDialog';
import { GameManagerRefreshProgressDialog } from '../gameManager/GameManagerRefreshProgressDialog';
import { LinkIconPickerDialog } from '../gameManager/LinkIconPickerDialog';

// App.tsx code-splits these two. Importing them statically here would pull them back into the main
// chunk, so the preview loads them the same lazy way.
const BugReportModal = lazy(() =>
  import('../BugReportModal').then((module) => ({ default: module.BugReportModal })),
);
const MetadataSearchModal = lazy(() =>
  import('../MetadataSearchModal').then((module) => ({ default: module.MetadataSearchModal })),
);

/**
 * Dev-only dialog gallery.
 *
 * Every entry mounts a real dialog component with fabricated props so its layout and states can be
 * inspected without reproducing the condition that normally triggers it (deleting a game, a failed
 * metadata match, a crash dump on disk, ...). Nothing here touches persisted state: all callbacks
 * log and close.
 */

export interface DevDialogEntry {
  id: string;
  label: string;
}

/**
 * Sorted by label at module load, so new entries can be appended anywhere below and still land in
 * the right place in the menu.
 */
export const DEV_DIALOG_ENTRIES: DevDialogEntry[] = ([
  { id: 'remove-deleted', label: 'Remove Deleted Games' },
  { id: 'remove-deleted-scanning', label: 'Remove Deleted Games — scanning' },
  { id: 'remove-deleted-empty', label: 'Remove Deleted Games — none found' },
  { id: 'missing-games', label: 'Missing Games' },
  { id: 'found-games', label: 'Found Games' },
  { id: 'startup-scan', label: 'Startup Scan Overlay' },
  { id: 'refresh-metadata', label: 'Refresh Metadata' },
  { id: 'refresh-confirm', label: 'Refresh Confirm (nuclear)' },
  { id: 'refresh-progress', label: 'Refresh Progress' },
  { id: 'match-fix', label: 'Fix Unmatched Games' },
  { id: 'boxart-fix', label: 'Fix Missing Boxart' },
  { id: 'image-search', label: 'Image Search' },
  { id: 'metadata-search', label: 'Metadata Search' },
  { id: 'confirm-default', label: 'Confirmation — default' },
  { id: 'confirm-danger', label: 'Confirmation — danger' },
  { id: 'confirm-two-option', label: 'Confirmation — two options' },
  { id: 'update-available', label: 'Update — available' },
  { id: 'update-downloading', label: 'Update — downloading' },
  { id: 'update-downloaded', label: 'Update — downloaded' },
  { id: 'update-error', label: 'Update — error' },
  { id: 'crash-dump', label: 'Crash Dumps Found' },
  { id: 'add-game', label: 'Add Game' },
  { id: 'file-selection', label: 'File Selection' },
  { id: 'link-icon-picker', label: 'Link Icon Picker' },
  { id: 'library-tutorial', label: 'Library Tutorial' },
  { id: 'steam-config', label: 'Steam Configuration' },
  { id: 'bug-report', label: 'Report a Bug' },
] as DevDialogEntry[]).sort((a, b) => a.label.localeCompare(b.label));

const MOCK_MISSING_GAMES = [
  {
    id: 'custom-1700000000000-abc123',
    title: "Tom Clancy's Ghost Recon Wildlands",
    exePath: 'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher\\games\\Tom Clancy\'s Ghost Recon Wildlands\\GRW.exe',
    platform: 'other',
    source: 'Ubisoft',
  },
  {
    id: 'steam-292030',
    title: 'The Witcher 3: Wild Hunt',
    exePath: 'D:\\SteamLibrary\\steamapps\\common\\The Witcher 3\\bin\\x64\\witcher3.exe',
    platform: 'steam',
    source: 'Steam',
  },
  {
    id: 'custom-1700000000001-def456',
    title: 'A Game With No Recorded Path At All',
    platform: 'other',
    source: 'Manual',
  },
];

const MOCK_FOUND_GAMES = [
  {
    id: 'steam-1091500',
    title: 'Cyberpunk 2077',
    exePath: 'D:\\SteamLibrary\\steamapps\\common\\Cyberpunk 2077\\bin\\x64\\Cyberpunk2077.exe',
    platform: 'steam',
    source: 'Steam',
  },
  {
    id: 'epic-fortnite',
    title: 'Hades II',
    installPath: 'C:\\Program Files\\Epic Games\\HadesII',
    source: 'Epic',
    isDownloading: true,
  },
];

const MOCK_GAME: Game = {
  id: 'custom-1700000000000-abc123',
  title: "Tom Clancy's Ghost Recon Wildlands",
  platform: 'other',
  exePath: 'C:\\Games\\GRW\\GRW.exe',
  boxArtUrl: '',
  bannerUrl: '',
  source: 'Ubisoft',
};

interface DevDialogPreviewProps {
  dialogId: string | null;
  onClose: () => void;
}

export function DevDialogPreview({ dialogId, onClose }: DevDialogPreviewProps) {
  // Not every dialog offers a cancel path (the refresh progress dialog only closes when the run
  // finishes), so Escape always backs out of a preview.
  useEffect(() => {
    if (!dialogId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialogId, onClose]);

  if (!dialogId) return null;

  const log = (action: string) => (...args: unknown[]) => {
    console.log(`[dev-preview:${dialogId}] ${action}`, ...args);
  };

  const close = (action: string) => (...args: unknown[]) => {
    log(action)(...args);
    onClose();
  };

  const closeAsync = (action: string) => async (...args: unknown[]) => {
    close(action)(...args);
  };

  const renderDialog = (): ReactNode => {
    switch (dialogId) {
    case 'remove-deleted':
    case 'remove-deleted-scanning':
    case 'remove-deleted-empty':
      return (
        <RemoveDeletedGamesDialog
          isOpen
          missingGames={dialogId === 'remove-deleted' ? MOCK_MISSING_GAMES : []}
          isScanning={dialogId === 'remove-deleted-scanning'}
          onRemove={closeAsync('remove')}
          onCancel={close('cancel')}
        />
      );

    case 'missing-games':
      return (
        <MissingGamesModal
          missingGames={MOCK_MISSING_GAMES}
          onRemove={close('remove')}
          onCancel={close('cancel')}
        />
      );

    case 'found-games':
      return (
        <FoundGamesModal
          foundGames={MOCK_FOUND_GAMES}
          onOpenImporter={close('openImporter')}
          onCancel={close('cancel')}
        />
      );

    case 'startup-scan':
      return (
        <StartupScanOverlay
          startupProgress={{ message: 'Scanning Steam library (3 of 7 folders)...' }}
          foundGames={null}
          onCancelFoundGames={close('cancel')}
          onReviewFoundGames={close('review')}
        />
      );

    case 'refresh-metadata':
      return (
        <RefreshMetadataDialog
          isOpen
          onSelectAll={close('selectAll')}
          onSelectMissing={close('selectMissing')}
          onSelectLinksOnly={close('selectLinksOnly')}
          onSelectOptimizeAllImages={close('selectOptimizeAllImages')}
          onCancel={close('cancel')}
        />
      );

    case 'refresh-confirm':
      return (
        <GameManagerRefreshConfirmDialog
          isOpen
          refreshMode="nuclear"
          onConfirm={close('confirm')}
          onCancel={close('cancel')}
        />
      );

    case 'refresh-progress':
      return (
        <GameManagerRefreshProgressDialog
          refreshProgress={{
            current: 12,
            total: 47,
            message: 'Fetching artwork from SteamGridDB...',
            gameTitle: 'The Witcher 3: Wild Hunt',
            mode: 'all',
            links: [
              { name: 'Steam Store', url: 'https://store.steampowered.com/app/292030' },
              { name: 'PCGamingWiki', url: 'https://www.pcgamingwiki.com/wiki/The_Witcher_3' },
            ],
          }}
          isCancellingRefresh={false}
          onCancelRefresh={log('cancelRefresh')}
          onClose={close('close')}
        />
      );

    case 'match-fix':
      return (
        <MatchFixDialog
          isOpen
          unmatchedGames={[
            {
              gameId: 'custom-1700000000000-abc123',
              title: 'GRW',
              searchResults: [
                { id: '1', title: "Tom Clancy's Ghost Recon Wildlands", source: 'IGDB', externalId: '18292' },
                { id: '2', title: "Tom Clancy's Ghost Recon Breakpoint", source: 'IGDB', externalId: '103302' },
                { id: '3', title: 'Ghost Recon', source: 'RAWG', externalId: '4521' },
              ],
            },
            {
              gameId: 'custom-1700000000001-def456',
              title: 'setup_x64',
              searchResults: [],
            },
          ]}
          onFix={closeAsync('fix')}
          onCancel={close('cancel')}
        />
      );

    case 'boxart-fix':
      return (
        <BoxartFixDialog
          isOpen
          missingBoxartGames={[
            { gameId: 'steam-292030', title: 'The Witcher 3: Wild Hunt', steamAppId: '292030' },
            { gameId: 'custom-1700000000000-abc123', title: "Tom Clancy's Ghost Recon Wildlands" },
          ]}
          onFix={closeAsync('fix')}
          onCancel={close('cancel')}
        />
      );

    case 'image-search':
      return (
        <ImageSearchModal
          isOpen
          onClose={close('close')}
          gameTitle="The Witcher 3: Wild Hunt"
          imageType="boxart"
          onSelectImage={closeAsync('selectImage')}
        />
      );

    case 'metadata-search':
      return (
        <MetadataSearchModal
          isOpen
          onClose={close('close')}
          game={MOCK_GAME}
          onSelect={closeAsync('select')}
        />
      );

    case 'confirm-default':
      return (
        <ConfirmationDialog
          isOpen
          title="Update Steam Library"
          message="This will re-scan your Steam libraries and add any games that aren't in Onyx yet."
          note="Existing games and their artwork are left untouched."
          confirmText="Update"
          cancelText="Cancel"
          onConfirm={close('confirm')}
          onCancel={close('cancel')}
        />
      );

    case 'confirm-danger':
      return (
        <ConfirmationDialog
          isOpen
          title="Delete Game"
          message={`Are you sure you want to delete "${MOCK_GAME.title}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="danger"
          onConfirm={close('confirm')}
          onCancel={close('cancel')}
        />
      );

    case 'confirm-two-option':
      return (
        <ConfirmationDialog
          isOpen
          title="Game Already Exists"
          message="A game with this executable is already in your library. What would you like to do?"
          note="Replacing keeps your existing artwork and play history."
          primaryActionText="Replace Existing"
          secondaryActionText="Add as New"
          onPrimaryAction={close('primary')}
          onSecondaryAction={close('secondary')}
          onConfirm={close('confirm')}
          onCancel={close('cancel')}
        />
      );

    case 'update-available':
    case 'update-downloading':
    case 'update-downloaded':
    case 'update-error': {
      const status = dialogId.replace('update-', '') as 'available' | 'downloading' | 'downloaded' | 'error';
      return (
        <UpdateNotificationModal
          isOpen
          version="0.17.0"
          currentVersion="0.16.0"
          status={status}
          error={status === 'error' ? 'ENOENT: latest.yml not found on the update feed' : undefined}
          progressPercent={status === 'downloading' ? 42 : undefined}
          changelogSource={'## 0.17.0\n\n- Preview dialogs from the Develop menu\n- Tidied up the Remove Deleted Games dialog'}
          isTestMode
          onUpdateNow={closeAsync('updateNow')}
          onDismiss={close('dismiss')}
          onInstall={close('install')}
        />
      );
    }

    case 'crash-dump':
      return (
        <CrashDumpModal
          isOpen
          dumpCount={3}
          onSave={closeAsync('save')}
          onOpenFolder={closeAsync('openFolder')}
          onDismiss={closeAsync('dismiss')}
        />
      );

    case 'add-game':
      return <AddGameModal isOpen onClose={close('close')} onAdd={closeAsync('add')} />;

    case 'file-selection':
      return (
        <FileSelectionModal
          isOpen
          onClose={close('close')}
          folderPath="D:\\Games\\Some Repack"
          executables={[
            { fileName: 'Game.exe', fullPath: 'D:\\Games\\Some Repack\\Game.exe' },
            { fileName: 'Launcher.exe', fullPath: 'D:\\Games\\Some Repack\\Launcher.exe' },
            { fileName: 'unins000.exe', fullPath: 'D:\\Games\\Some Repack\\unins000.exe' },
          ]}
          onSelect={close('select')}
          onAPIConfigRequired={log('apiConfigRequired')}
        />
      );

    case 'link-icon-picker':
      return (
        <LinkIconPickerDialog
          linkName="PCGamingWiki"
          hasCustomIcon={false}
          onUploadIcon={close('uploadIcon')}
          onRemoveCustomIcon={close('removeCustomIcon')}
          onClose={close('close')}
        />
      );

    case 'library-tutorial':
      return (
        <LibraryTutorialModal
          isOpen
          onClose={close('close')}
          onOpenSettings={close('openSettings')}
          onOpenUpdateLibrary={close('openUpdateLibrary')}
        />
      );

    case 'steam-config':
      return <SteamConfigModal isOpen onClose={close('close')} onScan={closeAsync('scan')} />;

    case 'bug-report':
      return <BugReportModal isOpen onClose={close('close')} />;

    default:
      return null;
    }
  };

  const label = DEV_DIALOG_ENTRIES.find((entry) => entry.id === dialogId)?.label ?? dialogId;

  return (
    <>
      <Suspense fallback={null}>{renderDialog()}</Suspense>
      {/* Sits above every dialog (they top out at z-[1000]) so a preview is always escapable. */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[2000] flex items-center gap-3 px-4 py-2 rounded-full bg-gray-900 border border-amber-500/40 shadow-2xl">
        <span className="text-xs text-amber-400 font-bold uppercase tracking-wider">Preview</span>
        <span className="text-xs text-gray-300">{label}</span>
        <button
          onClick={onClose}
          className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
        >
          Close (Esc)
        </button>
      </div>
    </>
  );
}
