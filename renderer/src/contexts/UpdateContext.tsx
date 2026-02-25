import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface UpdateNotification {
  version: string;
  status: 'available' | 'downloading' | 'downloaded' | 'error';
  error?: string;
}

export interface UpdateContextType {
  updateNotification: UpdateNotification | null;
  setUpdateNotification: (notification: UpdateNotification | null | ((prev: UpdateNotification | null) => UpdateNotification | null)) => void;
  currentVersion: string | null;
  setCurrentVersion: (version: string | null) => void;
  changelogSource: string | null;
  setChangelogSource: (source: string | null) => void;
  changelogLoading: boolean;
  setChangelogLoading: (loading: boolean) => void;
  changelogError: string | null;
  setChangelogError: (error: string | null) => void;
  isUpdateModalTest: boolean;
  setIsUpdateModalTest: (isTest: boolean) => void;
  fetchChangelog: (targetVersion?: string) => Promise<void>;
}

const UpdateContext = createContext<UpdateContextType | undefined>(undefined);

export const UpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [updateNotification, setUpdateNotification] = useState<UpdateNotification | null>(null);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [changelogSource, setChangelogSource] = useState<string | null>(null);
  const [changelogLoading, setChangelogLoading] = useState(false);
  const [changelogError, setChangelogError] = useState<string | null>(null);
  const [isUpdateModalTest, setIsUpdateModalTest] = useState(false);

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

  const fetchChangelog = useCallback(async (targetVersion?: string) => {
    if (!window.electronAPI.getChangelog) return;
    setChangelogLoading(true);
    setChangelogError(null);
    setChangelogSource(null);

    try {
      const result = await window.electronAPI.getChangelog(targetVersion);
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
    if (!updateNotification?.version) return;
    fetchChangelog(updateNotification.version);
  }, [updateNotification?.version, fetchChangelog]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    fetchChangelog();
  }, [fetchChangelog]);

  const value = {
    updateNotification,
    setUpdateNotification,
    currentVersion,
    setCurrentVersion,
    changelogSource,
    setChangelogSource,
    changelogLoading,
    setChangelogLoading,
    changelogError,
    setChangelogError,
    isUpdateModalTest,
    setIsUpdateModalTest,
    fetchChangelog,
  };

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
};

export const useUpdate = () => {
  const context = useContext(UpdateContext);
  if (context === undefined) {
    throw new Error('useUpdate must be used within a UpdateProvider');
  }
  return context;
};
