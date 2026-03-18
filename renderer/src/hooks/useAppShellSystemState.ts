import { useCallback, useEffect, useMemo, useState } from 'react';

interface UpdateNotificationState {
  version: string;
  status: 'available' | 'downloading' | 'downloaded' | 'error';
  error?: string;
  progressPercent?: number;
}

export function useAppShellSystemState() {
  const [updateNotification, setUpdateNotification] = useState<UpdateNotificationState | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [changelogSource, setChangelogSource] = useState<string | null>(null);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [changelogError, setChangelogError] = useState<string | null>(null);
  const [isUpdateModalTest, setIsUpdateModalTest] = useState(false);
  const [crashDumpPaths, setCrashDumpPaths] = useState<string[] | null>(null);

  const latestChangelogVersion = useMemo(() => {
    if (!changelogSource) return null;
    const match = changelogSource.match(/^##\s+\[([^\]]+)\]/m);
    if (!match?.[1]) return null;
    const parsed = match[1].replace(/^v/i, '').trim();
    return parsed.toLowerCase() === 'unreleased' ? null : parsed;
  }, [changelogSource]);

  const fetchChangelog = useCallback(async (targetVersion?: string, options?: { preferLocal?: boolean }) => {
    if (!window.electronAPI.getChangelog) return;
    setChangelogLoading(true);
    setChangelogError(null);
    setChangelogSource(null);

    try {
      const result = await window.electronAPI.getChangelog({
        version: targetVersion,
        preferLocal: options?.preferLocal ?? false,
      });
      if (result?.success && result.content) {
        setChangelogSource(result.content);
      } else {
        setChangelogSource(null);
        setChangelogError(result?.error ?? 'Unable to load changelog.');
      }
    } catch (error) {
      setChangelogSource(null);
      setChangelogError(error instanceof Error ? error.message : String(error));
    } finally {
      setChangelogLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadAppInfo = async () => {
      try {
        const version = await window.electronAPI.getVersion();
        if (!cancelled) setCurrentVersion(version);
      } catch (error) {
        console.error('Error loading app version:', error);
      }
    };

    loadAppInfo();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!updateNotification?.version) return;
    fetchChangelog(updateNotification.version, { preferLocal: isUpdateModalTest || import.meta.env.DEV });
  }, [fetchChangelog, isUpdateModalTest, updateNotification?.version]);

  useEffect(() => {
    let cancelled = false;

    const syncBackgroundScanState = async () => {
      try {
        if (updateNotification) {
          await window.electronAPI.pauseBackgroundScan?.();
          return;
        }

        await window.electronAPI.resumeBackgroundScan?.();
      } catch (error) {
        if (!cancelled) {
          console.error('[UpdateModal] Failed to sync background scan state:', error);
        }
      }
    };

    syncBackgroundScanState();

    return () => {
      cancelled = true;
    };
  }, [updateNotification]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    fetchChangelog(undefined, { preferLocal: true });
  }, [fetchChangelog]);

  const handleUpdateNow = useCallback(async () => {
    const result = await window.electronAPI.downloadUpdate?.();
    if (!result?.success) {
      setUpdateNotification((prev) => (prev ? { ...prev, status: 'error', error: result?.error ?? 'Download failed' } : null));
    }
  }, []);

  const handleDismissUpdateNotification = useCallback(() => {
    setUpdateNotification(null);
    setIsUpdateModalTest(false);
    if (!isUpdateModalTest) {
      window.electronAPI.onUpdateDismissed?.();
    }
  }, [isUpdateModalTest]);

  const handleSaveCrashDumps = useCallback(async () => {
    await window.electronAPI.saveCrashDumps?.();
    setCrashDumpPaths(null);
  }, []);

  const handleOpenCrashDumpFolder = useCallback(async () => {
    await window.electronAPI.openCrashDumpFolder?.();
    setCrashDumpPaths(null);
  }, []);

  const handleDismissCrashDumps = useCallback(async () => {
    await window.electronAPI.dismissCrashDumps?.();
    setCrashDumpPaths(null);
  }, []);

  const openSimulatedUpdateModal = useCallback(() => {
    const normalized = (currentVersion ?? '0.0.0').replace(/^v/i, '').trim();
    const parts = normalized.split('-')[0].split('.').map((part) => Number(part) || 0);
    const [major, minor, patch] = [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
    const simulatedVersion = latestChangelogVersion ?? `${major}.${minor}.${patch + 1}`;

    setIsUpdateModalTest(true);
    setUpdateNotification({
      version: simulatedVersion,
      status: 'available',
      progressPercent: undefined,
    });
  }, [currentVersion, latestChangelogVersion]);

  return {
    changelogError,
    changelogLoading,
    changelogSource,
    crashDumpPaths,
    currentVersion,
    handleDismissCrashDumps,
    handleDismissUpdateNotification,
    handleOpenCrashDumpFolder,
    handleSaveCrashDumps,
    handleUpdateNow,
    isUpdateModalTest,
    latestChangelogVersion,
    openSimulatedUpdateModal,
    setCrashDumpPaths,
    setIsUpdateModalTest,
    setUpdateNotification,
    updateNotification,
  };
}
