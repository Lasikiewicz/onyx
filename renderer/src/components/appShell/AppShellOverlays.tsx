import { CrashDumpModal } from '../CrashDumpModal';
import { LibraryTutorialModal } from '../LibraryTutorialModal';
import { MissingGamesModal } from '../MissingGamesModal';
import { UpdateNotificationModal } from '../UpdateNotificationModal';
import { StartupScanOverlay } from './StartupScanOverlay';

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface UpdateNotificationState {
  version: string;
  status: 'available' | 'downloading' | 'downloaded' | 'error';
  error?: string;
}

interface FoundGame {
  id?: string;
  title: string;
  exePath?: string;
  installPath?: string;
  platform?: string;
  source?: string;
  appId?: string;
  isDownloading?: boolean;
}

interface MissingGame {
  id: string;
  title: string;
  exePath?: string;
  platform?: string;
  source?: string;
}

interface AppShellOverlaysProps {
  updateNotification: UpdateNotificationState | null;
  currentVersion: string | null;
  changelogSource: string | null;
  changelogLoading: boolean;
  changelogError: string | null;
  isUpdateModalTest: boolean;
  onUpdateNow: () => Promise<void>;
  onDismissUpdate: () => void;
  onInstallUpdate: () => void;
  crashDumpPaths: string[] | null;
  onSaveCrashDumps: () => Promise<void>;
  onOpenCrashDumpFolder: () => Promise<void>;
  onDismissCrashDumps: () => Promise<void>;
  showLibraryTutorial: boolean;
  onCloseLibraryTutorial: () => void;
  onOpenSettings: () => void;
  onOpenUpdateLibrary: () => void;
  toast: ToastState | null;
  onDismissToast: () => void;
  missingGames: MissingGame[] | null;
  onRemoveMissingGames: (gameIds: string[]) => void | Promise<void>;
  onCancelMissingGames: () => void;
  startupProgress: { message: string } | null;
  foundGames: FoundGame[] | null;
  onCancelFoundGames: () => void;
  onReviewFoundGames: (games: FoundGame[]) => void;
}

export function AppShellOverlays({
  updateNotification,
  currentVersion,
  changelogSource,
  changelogLoading,
  changelogError,
  isUpdateModalTest,
  onUpdateNow,
  onDismissUpdate,
  onInstallUpdate,
  crashDumpPaths,
  onSaveCrashDumps,
  onOpenCrashDumpFolder,
  onDismissCrashDumps,
  showLibraryTutorial,
  onCloseLibraryTutorial,
  onOpenSettings,
  onOpenUpdateLibrary,
  toast,
  onDismissToast,
  missingGames,
  onRemoveMissingGames,
  onCancelMissingGames,
  startupProgress,
  foundGames,
  onCancelFoundGames,
  onReviewFoundGames,
}: AppShellOverlaysProps) {
  return (
    <>
      {updateNotification && (
        <UpdateNotificationModal
          isOpen={true}
          version={updateNotification.version}
          status={updateNotification.status}
          error={updateNotification.error}
          currentVersion={currentVersion}
          changelogSource={changelogSource}
          changelogLoading={changelogLoading}
          changelogError={changelogError}
          isTestMode={isUpdateModalTest}
          onUpdateNow={onUpdateNow}
          onDismiss={onDismissUpdate}
          onInstall={onInstallUpdate}
        />
      )}

      <CrashDumpModal
        isOpen={crashDumpPaths !== null && crashDumpPaths.length > 0}
        dumpCount={crashDumpPaths?.length ?? 0}
        onSave={onSaveCrashDumps}
        onOpenFolder={onOpenCrashDumpFolder}
        onDismiss={onDismissCrashDumps}
      />

      <LibraryTutorialModal
        isOpen={showLibraryTutorial}
        onClose={onCloseLibraryTutorial}
        onOpenSettings={onOpenSettings}
        onOpenUpdateLibrary={onOpenUpdateLibrary}
      />

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 toast-slide-up">
          <div
            className={`px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-xl border max-w-[90vw] ${
              toast.type === 'success'
                ? 'bg-slate-900/95 border-cyan-500/40 text-slate-100'
                : 'bg-slate-900/95 border-red-500/40 text-slate-100'
            }`}
          >
            <div className="flex-1 text-sm">{toast.message}</div>
            <button
              onClick={onDismissToast}
              className="text-slate-400 hover:text-slate-100 transition-colors p-0.5 rounded"
            >
              <svg className="w-5 h-5 group- hover:animate-wobble group-hover:animate-wobble" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {missingGames && missingGames.length > 0 && (
        <MissingGamesModal
          missingGames={missingGames}
          onRemove={onRemoveMissingGames}
          onCancel={onCancelMissingGames}
        />
      )}

      <StartupScanOverlay
        startupProgress={startupProgress}
        foundGames={foundGames}
        onCancelFoundGames={onCancelFoundGames}
        onReviewFoundGames={onReviewFoundGames}
      />
    </>
  );
}
