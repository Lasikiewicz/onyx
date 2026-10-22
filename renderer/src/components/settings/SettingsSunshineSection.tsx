import React, { useCallback, useEffect, useState } from 'react';
import type { SunshineDetectResult, SunshineInstallReport, SunshineWriteResult } from '../../types/bigScreen';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { SettingsSection } from './SettingsComponents';

type PendingChange = 'add' | 'remove' | null;

export const SettingsSunshineSection: React.FC = () => {
  const [report, setReport] = useState<SunshineDetectResult | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingChange>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    if (!window.electronAPI.sunshine?.detect) {
      setReport(null);
      return;
    }
    setBusy(true);
    try {
      const next = await window.electronAPI.sunshine.detect() as SunshineDetectResult;
      setReport(next);
      setSelected(next.installs.map((install) => install.appsJson));
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not look for Sunshine or Apollo.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const toggle = (appsJson: string) => {
    setSelected((current) => (
      current.includes(appsJson) ? current.filter((entry) => entry !== appsJson) : [...current, appsJson]
    ));
  };

  const apply = async () => {
    const action = pending;
    setPending(null);
    if (!action || selected.length === 0) return;
    setBusy(true);
    setStatus(null);
    try {
      const result = (action === 'add'
        ? await window.electronAPI.sunshine.add(selected)
        : await window.electronAPI.sunshine.remove(selected)) as SunshineWriteResult;
      if (result.success) {
        const backups = result.results
          .map((entry) => entry.backupPath)
          .filter((entry): entry is string => Boolean(entry));
        setStatus(backups.length > 0
          ? `Updated. A backup was saved at ${backups.join(', ')}.`
          : 'Updated.');
      } else {
        const details = result.results
          .filter((entry) => !entry.success)
          .map((entry) => `${entry.appsJson}: ${entry.error || 'not updated'}`)
          .join(' ');
        setStatus(result.error || details || 'The Sunshine/Apollo file was not changed.');
      }
      await refresh();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'The Sunshine/Apollo file was not changed.');
    } finally {
      setBusy(false);
    }
  };

  const installs = report?.installs ?? [];
  const example = report?.commandPreview ?? '"C:\\Program Files\\Onyx\\Onyx.exe" --big-screen';

  return (
    <SettingsSection
      title="Moonlight, Sunshine, and Apollo"
      description="Add Onyx Big Screen to the host app list. Nothing is written until you confirm."
    >
      <div className="space-y-3 text-sm text-gray-300">
        <p>
          The entry runs <span className="font-mono text-gray-100">{example}</span> and keeps the stream attached to Onyx.
          Global Sunshine prep commands still run. No resolution prep command is added.
        </p>
        {!report?.packaged && (
          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-amber-100">
            This copy of Onyx is not an installed build. Adding an entry would point Sunshine at the development Electron binary, so the buttons stay disabled. Install Onyx, then add the entry from Settings, or paste the command above into apps.json yourself.
          </p>
        )}
        {installs.length === 0 && (
          <p>No Sunshine or Apollo apps.json was found in the usual install folders. Run Sunshine or Apollo once so it creates that file, then check again.</p>
        )}
        <ul className="space-y-2">
          {installs.map((install: SunshineInstallReport) => (
            <li key={install.appsJson} className="rounded-lg border border-gray-700 bg-gray-900/60 px-3 py-2">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={selected.includes(install.appsJson)}
                  onChange={() => toggle(install.appsJson)}
                />
                <span>
                  <span className="block font-medium text-white">{install.host === 'apollo' ? 'Apollo' : 'Sunshine'}</span>
                  <span className="block break-all font-mono text-xs text-gray-400">{install.appsJson}</span>
                  <span className="block text-xs text-gray-400">
                    {install.hasOnyxEntry ? 'Onyx Big Screen entry is already present.' : 'No Onyx Big Screen entry yet.'}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={busy}
            className="rounded-lg bg-gray-700 px-3 py-2 text-white disabled:opacity-50"
          >
            Check again
          </button>
          <button
            type="button"
            onClick={() => setPending('add')}
            disabled={busy || !report?.packaged || selected.length === 0}
            className="rounded-lg bg-sky-600 px-3 py-2 text-white disabled:opacity-50"
          >
            Add Onyx Big Screen
          </button>
          <button
            type="button"
            onClick={() => setPending('remove')}
            disabled={busy || selected.length === 0}
            className="rounded-lg bg-gray-700 px-3 py-2 text-white disabled:opacity-50"
          >
            Remove Onyx Big Screen
          </button>
        </div>
        {status && <p className="text-gray-200">{status}</p>}
      </div>
      <ConfirmationDialog
        isOpen={pending !== null}
        title={pending === 'remove' ? 'Remove Onyx Big Screen?' : 'Add Onyx Big Screen?'}
        message={pending === 'remove'
          ? 'This removes only an app named Onyx Big Screen whose command contains --big-screen. A copy of apps.json is saved beside it first.'
          : `This writes an Onyx Big Screen app that runs ${example}. A copy of apps.json is saved beside it first. An existing app with that exact name is replaced.`}
        confirmText={pending === 'remove' ? 'Remove' : 'Add'}
        cancelText="Cancel"
        variant={pending === 'remove' ? 'danger' : 'default'}
        onConfirm={() => void apply()}
        onCancel={() => setPending(null)}
      />
    </SettingsSection>
  );
};
