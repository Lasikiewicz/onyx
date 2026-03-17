import { useEffect, useState } from 'react';

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

const getDefaultPaths = (appId: string): string[] => {
  const paths: Record<string, string[]> = {
    steam: ['C:\\Program Files (x86)\\Steam', 'C:\\Program Files\\Steam'],
    epic: ['C:\\Program Files\\Epic Games', 'C:\\Program Files (x86)\\Epic Games'],
    ea: ['C:\\Program Files\\EA Games', 'C:\\Program Files (x86)\\EA Games', 'C:\\Program Files\\Electronic Arts'],
    gog: ['C:\\Program Files (x86)\\GOG Galaxy', 'C:\\Program Files\\GOG Galaxy'],
    ubisoft: ['C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher', 'C:\\Program Files\\Ubisoft\\Ubisoft Game Launcher'],
    battle: ['C:\\Program Files (x86)\\Battle.net', 'C:\\Program Files\\Battle.net'],
    xbox: ['C:\\XboxGames', 'C:\\Program Files\\WindowsApps'],
    humble: ['C:\\Program Files\\Humble App', 'C:\\Program Files (x86)\\Humble App', '%LOCALAPPDATA%\\Humble App'],
    itch: ['%LOCALAPPDATA%\\itch', 'C:\\Program Files\\itch', 'C:\\Program Files (x86)\\itch'],
    rockstar: ['C:\\Program Files\\Rockstar Games', 'C:\\Program Files (x86)\\Rockstar Games', '%USERPROFILE%\\Documents\\Rockstar Games'],
  };
  return paths[appId] || [];
};

const defaultApps: Omit<SettingsLibraryAppConfig, 'enabled' | 'path'>[] = [
  { id: 'steam', name: 'Steam', defaultPaths: getDefaultPaths('steam'), placeholder: 'C:\\Program Files (x86)\\Steam' },
  { id: 'epic', name: 'Epic Games', defaultPaths: getDefaultPaths('epic'), placeholder: 'C:\\Program Files\\Epic Games' },
  { id: 'ea', name: 'EA App / Origin', defaultPaths: getDefaultPaths('ea'), placeholder: 'C:\\Program Files\\EA Games' },
  { id: 'gog', name: 'GOG Galaxy', defaultPaths: getDefaultPaths('gog'), placeholder: 'C:\\Program Files (x86)\\GOG Galaxy' },
  { id: 'ubisoft', name: 'Ubisoft Connect', defaultPaths: getDefaultPaths('ubisoft'), placeholder: 'C:\\Program Files (x86)\\Ubisoft\\Ubisoft Game Launcher' },
  { id: 'battle', name: 'Battle.net', defaultPaths: getDefaultPaths('battle'), placeholder: 'C:\\Program Files (x86)\\Battle.net' },
  { id: 'xbox', name: 'Xbox Game Pass', defaultPaths: getDefaultPaths('xbox'), placeholder: 'C:\\XboxGames' },
  { id: 'humble', name: 'Humble', defaultPaths: getDefaultPaths('humble'), placeholder: 'C:\\Program Files\\Humble App' },
  { id: 'itch', name: 'itch.io', defaultPaths: getDefaultPaths('itch'), placeholder: '%LOCALAPPDATA%\\itch' },
  { id: 'rockstar', name: 'Rockstar Games', defaultPaths: getDefaultPaths('rockstar'), placeholder: 'C:\\Program Files\\Rockstar Games' },
];

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
