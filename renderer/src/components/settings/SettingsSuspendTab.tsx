import React from 'react';
import { SettingsInput, SettingsSection, SettingsToggle } from './SettingsComponents';

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
  return (
    <div className="space-y-6 p-6">
      <SettingsSection
        title="Suspend/Resume (Experimental)"
        description="Windows-only process suspend controls adapted for Nyrna-style workflows. May require running Onyx as Administrator for some games."
      >
        <SettingsToggle
          label="Enable Suspend/Resume Feature"
          description="Allows pausing and resuming tracked running games from Onyx."
          checked={enableSuspendFeature}
          onChange={onSetEnableSuspendFeature}
        />
        <SettingsInput
          label="Suspend Toggle Shortcut"
          description="Global shortcut used to toggle between suspend/resume for tracked games."
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
