import { useEffect, useRef, useState } from 'react';

export type SettingsModalTab =
  | 'general'
  | 'scanning'
  | 'library'
  | 'launchers'
  | 'integrations'
  | 'links'
  | 'appearance'
  | 'animations'
  | 'advanced'
  | 'suspend'
  | 'about';

export interface SettingsModalApiCredentials {
  igdbClientId: string;
  igdbClientSecret: string;
  rawgApiKey: string;
  steamGridDBApiKey: string;
  giantBombApiKey: string;
}

type InitialTab =
  | 'general'
  | 'apis'
  | 'apps'
  | 'reset'
  | 'about'
  | 'appearance'
  | 'integrations'
  | 'launchers'
  | 'library'
  | 'links'
  | 'advanced'
  | 'suspend'
  | 'animations';

const sanitizeUpdateErrorForDisplay = (error?: string | null): string | null => {
  if (!error) return null;
  const trimmed = error.trim();
  if (!trimmed) return null;

  if (/<!doctype html|<html|<head|<body|<style|<script|<div|<span/i.test(trimmed)) {
    return 'Update check failed due to an unexpected server response. Please try again.';
  }

  const singleLine = trimmed.replace(/\s+/g, ' ');
  return singleLine.length > 220 ? `${singleLine.slice(0, 217)}...` : singleLine;
};

const resolveTab = (initialTab: InitialTab): SettingsModalTab => {
  if (initialTab === 'apps') return 'launchers';
  if (initialTab === 'apis') return 'integrations';
  if ((initialTab as string) === 'folders') return 'library';
  if (initialTab === 'reset') return 'advanced';
  return initialTab as SettingsModalTab;
};

interface UseOnyxSettingsModalShellStateOptions {
  initialTab: InitialTab;
  isOpen: boolean;
  onClose: () => void;
  setSettings: React.Dispatch<React.SetStateAction<any>>;
}

export const useOnyxSettingsModalShellState = ({
  initialTab,
  isOpen,
  onClose,
  setSettings,
}: UseOnyxSettingsModalShellStateOptions) => {
  const [activeTab, setActiveTab] = useState<SettingsModalTab>(() => resolveTab(initialTab));
  const [apiCredentials, setApiCredentials] = useState<SettingsModalApiCredentials>({
    igdbClientId: '',
    igdbClientSecret: '',
    rawgApiKey: '',
    steamGridDBApiKey: '',
    giantBombApiKey: '',
  });
  const [activeAPITab, setActiveAPITab] = useState<'igdb' | 'rawg' | 'steamgriddb' | 'giantbomb'>('steamgriddb');
  const [apiStatus, setApiStatus] = useState({
    igdbConfigured: false,
    rawgConfigured: false,
    steamGridDBConfigured: false,
    giantBombConfigured: false,
    allRequiredConfigured: false,
  });
  const [appVersion, setAppVersion] = useState('0.0.0');
  const [isPackagedApp, setIsPackagedApp] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error'>('idle');
  const [updateVersion, setUpdateVersion] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isCapturingSuspendShortcut, setIsCapturingSuspendShortcut] = useState(false);
  const [suspendShortcutCaptureError, setSuspendShortcutCaptureError] = useState<string | null>(null);
  const updateCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(resolveTab(initialTab));
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const loadShellState = async () => {
      try {
        setAppVersion(await window.electronAPI.getVersion());
      } catch (error) {
        console.error('Error loading app version:', error);
      }

      try {
        setIsPackagedApp(Boolean(await window.electronAPI.isPackaged?.()));
      } catch (error) {
        console.error('Error loading packaged state:', error);
        setIsPackagedApp(false);
      }

      try {
        const creds = await window.electronAPI.getAPICredentials();
        const nextCredentials = {
          igdbClientId: creds.igdbClientId || '',
          igdbClientSecret: creds.igdbClientSecret || '',
          rawgApiKey: creds.rawgApiKey || '',
          steamGridDBApiKey: creds.steamGridDBApiKey || '',
          giantBombApiKey: creds.giantBombApiKey || '',
        };
        setApiCredentials(nextCredentials);
        const igdbConfigured = !!(nextCredentials.igdbClientId.trim() && nextCredentials.igdbClientSecret.trim());
        const rawgConfigured = !!nextCredentials.rawgApiKey.trim();
        const steamGridDBConfigured = !!nextCredentials.steamGridDBApiKey.trim();
        const giantBombConfigured = !!nextCredentials.giantBombApiKey.trim();
        setApiStatus({
          igdbConfigured,
          rawgConfigured,
          steamGridDBConfigured,
          giantBombConfigured,
          allRequiredConfigured: igdbConfigured,
        });
      } catch (error) {
        console.error('Error loading API credentials:', error);
      }
    };

    void loadShellState();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !window.electronAPI.onUpdateStatus) return;

    const unsubscribe = window.electronAPI.onUpdateStatus((payload) => {
      if (updateCheckTimeoutRef.current) {
        clearTimeout(updateCheckTimeoutRef.current);
        updateCheckTimeoutRef.current = null;
      }
      setUpdateStatus(payload.status as any);
      setUpdateVersion(payload.version ?? null);
      setUpdateError(sanitizeUpdateErrorForDisplay(payload.error ?? null));
    });

    return () => {
      if (updateCheckTimeoutRef.current) {
        clearTimeout(updateCheckTimeoutRef.current);
        updateCheckTimeoutRef.current = null;
      }
      unsubscribe();
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isCapturingSuspendShortcut) return;

    const onKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === 'Escape') {
        setIsCapturingSuspendShortcut(false);
        setSuspendShortcutCaptureError(null);
        return;
      }

      const disallowedKeys = ['Control', 'Shift', 'Alt', 'Meta'];
      if (disallowedKeys.includes(event.key)) {
        setSuspendShortcutCaptureError('Press a non-modifier key with optional modifiers (Ctrl, Alt, Shift).');
        return;
      }

      const modifiers: string[] = [];
      if (event.ctrlKey) modifiers.push('Ctrl');
      if (event.altKey) modifiers.push('Alt');
      if (event.shiftKey) modifiers.push('Shift');
      if (event.metaKey) modifiers.push('Super');

      let key = event.key;
      if (key.length === 1) {
        key = key.toUpperCase();
      } else {
        const keyAliases: Record<string, string> = {
          ' ': 'Space',
          ArrowUp: 'Up',
          ArrowDown: 'Down',
          ArrowLeft: 'Left',
          ArrowRight: 'Right',
          Escape: 'Esc',
        };
        key = keyAliases[key] || key;
      }

      setSettings((prev: any) => ({ ...prev, suspendShortcut: [...modifiers, key].join('+') }));
      setSuspendShortcutCaptureError(null);
      setIsCapturingSuspendShortcut(false);
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [isCapturingSuspendShortcut, setSettings]);

  const handleAPIInputChange = (key: keyof SettingsModalApiCredentials, value: string) => {
    setApiCredentials((prev) => {
      const updated = { ...prev, [key]: value };
      const igdbConfigured = !!(updated.igdbClientId.trim() && updated.igdbClientSecret.trim());
      const rawgConfigured = !!updated.rawgApiKey.trim();
      const steamGridDBConfigured = !!updated.steamGridDBApiKey.trim();
      const giantBombConfigured = !!updated.giantBombApiKey.trim();
      setApiStatus({
        igdbConfigured,
        rawgConfigured,
        steamGridDBConfigured,
        giantBombConfigured,
        allRequiredConfigured: igdbConfigured,
      });
      return updated;
    });
  };

  const handleCheckForUpdates = async () => {
    setUpdateError(null);
    if (!isPackagedApp) {
      setUpdateStatus('error');
      setUpdateError('Updater is only available in installed builds.');
      return;
    }

    if (updateCheckTimeoutRef.current) {
      clearTimeout(updateCheckTimeoutRef.current);
      updateCheckTimeoutRef.current = null;
    }

    setUpdateStatus('checking');
    await window.electronAPI.checkForUpdates?.();
    updateCheckTimeoutRef.current = setTimeout(() => {
      setUpdateStatus((prev) => {
        if (prev !== 'checking') return prev;
        setUpdateError('Update check timed out. Please try again.');
        return 'error';
      });
      updateCheckTimeoutRef.current = null;
    }, 15000);
  };

  const handleDownloadUpdate = async () => {
    setUpdateStatus('downloading');
    const result = await window.electronAPI.downloadUpdate?.();
    if (result?.success) {
      setUpdateStatus('downloaded');
      return;
    }
    setUpdateError(result?.error ?? 'Download failed');
  };

  const handleOpenBugReportFromAbout = () => {
    onClose();
  };

  return {
    activeAPITab,
    activeTab,
    apiCredentials,
    apiStatus,
    appVersion,
    handleAPIInputChange,
    handleCheckForUpdates,
    handleDownloadUpdate,
    handleOpenBugReportFromAbout,
    isCapturingSuspendShortcut,
    isPackagedApp,
    setActiveAPITab,
    setActiveTab,
    setIsCapturingSuspendShortcut,
    setSuspendShortcutCaptureError,
    suspendShortcutCaptureError,
    updateError,
    updateStatus,
    updateVersion,
  };
};
