import { useEffect, useState } from 'react';
import { getLibrarySourceDefinitions, resolveHostPlatform } from '../utils/librarySourceDefaults';

export interface SettingsLibraryAppConfig {
  id: string;
  name: string;
  enabled: boolean;
  path: string;
  defaultPaths: string[];
  placeholder: string;
  autoAdd?: boolean;
  syncPlaytime?: boolean;
  autoCategory?: string[];
}

export interface SettingsManualFolderConfig {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  autoCategory?: string[];
  icon?: string;
}

interface UseOnyxSettingsLibrarySourcesOptions {
  isOpen: boolean;
  onShowImportModal?: (games: Array<any>, appType?: 'steam' | 'xbox' | 'other') => void;
}

const findExistingPath = async (defaultPaths: string[]): Promise<string> => {
  return defaultPaths[0] || '';
};

export const useOnyxSettingsLibrarySources = ({
  isOpen,
  onShowImportModal,
}: UseOnyxSettingsLibrarySourcesOptions) => {
  const [apps, setApps] = useState<SettingsLibraryAppConfig[]>([]);
  const [isLoadingApps, setIsLoadingApps] = useState(false);
  const [scanningAppId, setScanningAppId] = useState<string | null>(null);
  const [manualFolders, setManualFolders] = useState<string[]>([]);
  const [manualFolderConfigs, setManualFolderConfigs] = useState<Record<string, SettingsManualFolderConfig>>({});
  const [editingAppId, setEditingAppId] = useState<string | null>(null);
  const [editingManualFolderId, setEditingManualFolderId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const loadAppConfigs = async () => {
      setIsLoadingApps(true);
      try {
        // The available sources differ per platform, so the list is resolved at load time rather
        // than being a module-level constant.
        const defaultApps = getLibrarySourceDefinitions(await resolveHostPlatform());
        const savedConfigs = await window.electronAPI.getAppConfigs();

        try {
          const folders = await window.electronAPI.getManualFolders();
          setManualFolders(folders || []);
          if (window.electronAPI.getManualFolderConfigs) {
            const configs = await window.electronAPI.getManualFolderConfigs();
            setManualFolderConfigs(configs || {});
          }
        } catch (error) {
          console.error('Error loading manual folders:', error);
          setManualFolders([]);
          setManualFolderConfigs({});
        }

        let steamPath = '';
        try {
          const path = await window.electronAPI.getSteamPath();
          if (path) steamPath = path;
        } catch {
          // Ignore Steam path lookup failures.
        }

        const initializedApps: SettingsLibraryAppConfig[] = await Promise.all(
          defaultApps.map(async (app) => {
            const savedConfig = savedConfigs[app.id];

            if (savedConfig) {
              return {
                ...app,
                enabled: savedConfig.enabled,
                path: savedConfig.path || app.defaultPaths[0] || '',
                autoAdd: savedConfig.autoAdd || false,
                syncPlaytime: savedConfig.syncPlaytime || false,
              };
            }

            let path = '';
            let enabled = true;

            if (app.id === 'steam' && steamPath) {
              path = steamPath;
            } else {
              const existingPath = await findExistingPath(app.defaultPaths);
              path = existingPath || app.defaultPaths[0] || '';
            }

            return {
              ...app,
              enabled,
              path,
            };
          }),
        );

        setApps(initializedApps);
      } catch (error) {
        console.error('Error loading app configs:', error);
      } finally {
        setIsLoadingApps(false);
      }
    };

    void loadAppConfigs();
  }, [isOpen]);

  const notifyManualFolderIconsUpdated = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('onyx:manual-folder-icons-updated'));
    }
  };

  const handleToggleAppEnabled = (appId: string) => {
    setApps((prev) => prev.map((app) => (app.id === appId ? { ...app, enabled: !app.enabled } : app)));
  };

  const handleAppPathChange = (appId: string, path: string) => {
    setApps((prev) => prev.map((app) => (app.id === appId ? { ...app, path } : app)));
  };

  const handleUpdateAppCategory = (appId: string, categories: string[]) => {
    setApps((prev) => prev.map((app) => (app.id === appId ? { ...app, autoCategory: categories } : app)));
  };

  const handleBrowseApp = async (appId: string) => {
    try {
      const path = await window.electronAPI.showFolderDialog();
      if (path) {
        handleAppPathChange(appId, path);
      }
    } catch (error) {
      console.error(`Error browsing for ${appId} path:`, error);
    }
  };

  const handleAddManualFolder = async () => {
    try {
      const path = await window.electronAPI.showFolderDialog();
      if (!path) return;

      const existingConfig = Object.values(manualFolderConfigs).find((config) => config.path === path);
      if (existingConfig) {
        alert('This folder is already in the list.');
        return;
      }

      const folderName = path.split(/[/\\]/).pop() || 'Manual Folder';
      const pathHash = btoa(path).replace(/[^a-zA-Z0-9]/g, '').substring(0, 16);
      const folderId = `manual-${pathHash}`;
      const newConfig = {
        id: folderId,
        name: folderName,
        path,
        enabled: true,
      };

      if (window.electronAPI.saveManualFolderConfig) {
        const result = await window.electronAPI.saveManualFolderConfig(newConfig);
        if (result && result.success) {
          setManualFolderConfigs((prev) => ({ ...prev, [folderId]: newConfig }));
          setManualFolders((prev) => [...prev, path]);
        } else {
          alert('Failed to save manual folder. Please try again.');
        }
        return;
      }

      const updated = [...manualFolders, path];
      setManualFolders(updated);
      const result = await window.electronAPI.saveManualFolders(updated);
      if (!result || !result.success) {
        alert('Failed to save manual folder. Please try again.');
        setManualFolders(manualFolders);
      }
    } catch (error) {
      console.error('Error adding manual folder:', error);
      alert(`Failed to add manual folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleRemoveManualFolder = async (folderPath: string) => {
    const config = Object.values(manualFolderConfigs).find((folderConfig) => folderConfig.path === folderPath);
    if (config && window.electronAPI.deleteManualFolderConfig) {
      const result = await window.electronAPI.deleteManualFolderConfig(config.id);
      if (result && result.success) {
        setManualFolderConfigs((prev) => {
          const updatedConfigs = { ...prev };
          delete updatedConfigs[config.id];
          return updatedConfigs;
        });
        setManualFolders((prev) => prev.filter((folder) => folder !== folderPath));
      }
      return;
    }

    const updated = manualFolders.filter((folder) => folder !== folderPath);
    setManualFolders(updated);
    try {
      await window.electronAPI.saveManualFolders(updated);
    } catch (error) {
      console.error('Error removing manual folder:', error);
    }
  };

  const handleUpdateManualFolderName = async (folderId: string, newName: string) => {
    const config = manualFolderConfigs[folderId];
    if (config && window.electronAPI.saveManualFolderConfig) {
      const updatedConfig = { ...config, name: newName };
      const result = await window.electronAPI.saveManualFolderConfig(updatedConfig);
      if (result && result.success) {
        setManualFolderConfigs((prev) => ({ ...prev, [folderId]: updatedConfig }));
        notifyManualFolderIconsUpdated();
      }
    }
  };

  const handleScanApp = async (appId: string) => {
    const app = apps.find((candidate) => candidate.id === appId);
    if (!app || !app.enabled || !app.path) return;

    setScanningAppId(appId);
    try {
      if (appId === 'steam') {
        const result = await window.electronAPI.scanGamesWithPath(app.path, false);
        if (result.success && result.games && result.games.length > 0) {
          onShowImportModal?.(result.games, 'steam');
        }
      } else if (appId === 'xbox') {
        const result = await window.electronAPI.scanXboxGames(app.path, false);
        if (result.success && result.games && result.games.length > 0) {
          onShowImportModal?.(result.games, 'xbox');
        }
      }
    } catch (error) {
      console.error('Error scanning app:', error);
    } finally {
      setScanningAppId(null);
    }
  };

  return {
    apps,
    editingAppId,
    editingManualFolderId,
    handleAddManualFolder,
    handleBrowseApp,
    handleRemoveManualFolder,
    handleScanApp,
    handleToggleAppEnabled,
    handleUpdateAppCategory,
    handleUpdateManualFolderName,
    isLoadingApps,
    manualFolderConfigs,
    manualFolders,
    notifyManualFolderIconsUpdated,
    scanningAppId,
    setApps,
    setEditingAppId,
    setEditingManualFolderId,
    setManualFolderConfigs,
  };
};
