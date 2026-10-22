import React, { useCallback, useEffect, useState } from 'react';
import { SettingsInput, SettingsSection, SettingsToggle } from './SettingsComponents';

interface TrackedSuspendGame {
  gameId: string;
  title: string;
  status: 'running' | 'suspended';
}

interface SettingsSuspendTabProps {
  enableSuspendFeature: boolean;
  suspendShortcut: string;
  isCapturingSuspendShortcut: boolean;
  suspendShortcutCaptureError: string | null;
  onSetEnableSuspendFeature: (checked: boolean) => void;
  onSetSuspendShortcut: (value: string) => void;
  onBeginShortcutCapture: () => void;
}

export const SettingsSuspendTab: React.FC<SettingsSuspendTabProps> = ({
  enableSuspendFeature,
  suspendShortcut,
  isCapturingSuspendShortcut,
  suspendShortcutCaptureError,
  onSetEnableSuspendFeature,
  onSetSuspendShortcut,
  onBeginShortcutCapture,
}) => {
  const [trackedGames, setTrackedGames] = useState<TrackedSuspendGame[]>([]);
  const [trackedGamesError, setTrackedGamesError] = useState<string | null>(null);
  const [pendingGameId, setPendingGameId] = useState<string | null>(null);

  const refreshTrackedGames = useCallback(async () => {
    if (!enableSuspendFeature || !window.electronAPI?.suspend?.getRunningGames) {
      setTrackedGames([]);
      return;
    }
    try {
      const games = await window.electronAPI.suspend.getRunningGames();
      setTrackedGames(Array.isArray(games) ? games as TrackedSuspendGame[] : []);
      setTrackedGamesError(null);
    } catch (error) {
      setTrackedGamesError(error instanceof Error ? error.message : 'Could not list tracked games');
    }
  }, [enableSuspendFeature]);

  useEffect(() => {
    if (!enableSuspendFeature) {
      setTrackedGames([]);
      return;
    }
    void refreshTrackedGames();
    const interval = setInterval(() => {
      void refreshTrackedGames();
    }, 3000);
    return () => clearInterval(interval);
  }, [enableSuspendFeature, refreshTrackedGames]);

  const toggleTrackedGame = async (game: TrackedSuspendGame) => {
    if (pendingGameId) return;
    setPendingGameId(game.gameId);
    setTrackedGamesError(null);
    try {
      const result = game.status === 'suspended'
        ? await window.electronAPI.suspend.resumeGame(game.gameId)
        : await window.electronAPI.suspend.suspendGame(game.gameId);
      if (!result.success) {
        setTrackedGamesError(result.error || 'Suspend/resume failed');
      }
      await refreshTrackedGames();
    } catch (error) {
      setTrackedGamesError(error instanceof Error ? error.message : 'Suspend/resume failed');
    } finally {
      setPendingGameId(null);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <SettingsSection
        title="Suspend/Resume (Experimental)"
        description="Windows-only, using the same approach as Nyrna: the shortcut freezes the foreground window and every process it started, then resumes it on the next press. Quitting Onyx resumes paused games, including after a crash on the next launch. Some games need Onyx to run as Administrator."
      >
        <SettingsToggle
          label="Enable Suspend/Resume Feature"
          description="Allows pausing and resuming tracked running games from Onyx."
          checked={enableSuspendFeature}
          onChange={onSetEnableSuspendFeature}
        />
        <SettingsInput
          label="Suspend Toggle Shortcut"
          description="Global shortcut. It suspends the foreground window, or resumes it if Onyx already suspended it."
          value={suspendShortcut}
          onChange={onSetSuspendShortcut}
          placeholder="Ctrl+Shift+S"
          disabled={true}
        />

        <div className={`bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 ${!enableSuspendFeature ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-gray-200 text-sm font-medium">Shortcut Capture</p>
              <p className="text-gray-400 text-xs mt-0.5">
                {isCapturingSuspendShortcut
                  ? 'Press your preferred key combination now (Esc to cancel).'
                  : `Current: ${suspendShortcut}`}
              </p>
            </div>
            <button
              type="button"
              onClick={onBeginShortcutCapture}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
            >
              {isCapturingSuspendShortcut ? 'Listening…' : 'Set Shortcut'}
            </button>
          </div>
          {suspendShortcutCaptureError && (
            <p className="text-xs text-red-400 mt-2">{suspendShortcutCaptureError}</p>
          )}
        </div>

        <div className={`bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 ${!enableSuspendFeature ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-gray-200 text-sm font-medium">Administrator Access</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Some games require elevation for process suspend/resume to work.
              </p>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  if (!window.electronAPI.restartAsAdmin) {
                    alert('Restart-as-admin is not available in this build.');
                    return;
                  }

                  const result = await window.electronAPI.restartAsAdmin();
                  if (!result.success) {
                    alert(result.error || 'Failed to restart as administrator.');
                  }
                } catch (error) {
                  alert(`Failed to restart as administrator: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
              }}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded transition-colors"
            >
              Restart as Administrator
            </button>
          </div>
        </div>

        <div className={`bg-gray-800/40 border border-gray-700/50 rounded-lg p-3 ${!enableSuspendFeature ? 'opacity-50 pointer-events-none' : ''}`}>
          <p className="text-gray-200 text-sm font-medium">Tracked games</p>
          <p className="text-gray-400 text-xs mt-0.5">
            These are games Onyx tracked at launch. The shortcut uses the foreground window instead, which is the process that actually owns the game window.
          </p>
          {trackedGames.length === 0 ? (
            <p className="text-gray-500 text-xs mt-3">No tracked games are running.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {trackedGames.map((game) => (
                <li key={game.gameId} className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-gray-200 text-sm">{game.title}</p>
                    <p className="text-gray-500 text-xs">{game.status === 'suspended' ? 'Suspended' : 'Running'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { void toggleTrackedGame(game); }}
                    disabled={pendingGameId !== null}
                    className="px-3 py-1.5 bg-slate-600 hover:bg-slate-500 disabled:opacity-50 text-white text-xs rounded transition-colors"
                  >
                    {pendingGameId === game.gameId ? 'Working…' : game.status === 'suspended' ? 'Resume' : 'Suspend'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {trackedGamesError && (
            <p className="text-xs text-red-400 mt-2">{trackedGamesError}</p>
          )}
        </div>

        <p className="pt-3 border-t border-gray-700/50 text-xs text-gray-400">
          Suspend/Resume integration thanks to{' '}
          <a
            href="https://nyrna.merritt.codes/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={async (event) => {
              event.preventDefault();
              try {
                if (window.electronAPI?.openExternal) {
                  await window.electronAPI.openExternal('https://nyrna.merritt.codes/');
                } else {
                  window.open('https://nyrna.merritt.codes/', '_blank', 'noopener,noreferrer');
                }
              } catch (error) {
                console.error('Failed to open Nyrna link:', error);
              }
            }}
            className="text-gray-300 font-medium hover:text-sky-400 transition-colors"
          >
            Nyrna
          </a>
        </p>
      </SettingsSection>
    </div>
  );
};
