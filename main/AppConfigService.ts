import { existsSync } from 'node:fs';
import path from 'node:path';

export interface AppConfig {
  id: string;
  name: string;
  enabled: boolean;
  path: string;
  autoAdd?: boolean; // Automatically add new games when found
  syncPlaytime?: boolean; // Automatically sync playtime from Steam
}

interface ManualFolderConfig {
  id: string;
  name: string;
  path: string;
  enabled: boolean;
  autoCategory?: string[]; // Auto-assign categories to games found in this folder
}

interface AppConfigsSchema {
  apps: Record<string, AppConfig>;
  backgroundScanEnabled: boolean;
  backgroundScanIntervalMinutes?: number; // Interval in minutes (default: 30)
  lastBackgroundScan?: number;
  manualFolders?: string[]; // Legacy format - kept for migration
  manualFolderConfigs?: Record<string, ManualFolderConfig>; // New format with custom names
}

export class AppConfigService {
  private store: any = null;
  private storePromise: Promise<any>;

  constructor() {
    // Use dynamic import for ES module
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    this.storePromise = (new Function('return import("electron-store")')() as Promise<typeof import('electron-store')>).then((StoreModule) => {
      const Store = StoreModule.default;
      this.store = new Store<AppConfigsSchema>({
        name: 'app-configs',
        defaults: {
          apps: {},
          backgroundScanEnabled: false,
          backgroundScanIntervalMinutes: 30, // Default: 30 minutes
          lastBackgroundScan: undefined,
          manualFolders: [],
          manualFolderConfigs: {},
        },
      });
      return this.store;
    });
  }

  private async ensureStore(): Promise<any> {
    if (this.store) {
      return this.store;
    }
    return this.storePromise;
  }

  /**
   * Get all app configurations
   */
  async getAppConfigs(): Promise<Record<string, AppConfig>> {
    const store = await this.ensureStore();
    return store.get('apps', {});
  }

  /**
   * Get a specific app configuration
   */
  async getAppConfig(appId: string): Promise<AppConfig | null> {
    const store = await this.ensureStore();
    const apps = store.get('apps', {});
    return apps[appId] || null;
  }

  /**
   * Save an app configuration
   */
  async saveAppConfig(config: AppConfig): Promise<void> {
    const store = await this.ensureStore();
    const apps = store.get('apps', {});
    apps[config.id] = config;
    store.set('apps', apps);
  }

  /**
   * Save multiple app configurations
   */
  async saveAppConfigs(configs: AppConfig[]): Promise<void> {
    const store = await this.ensureStore();
    const apps = store.get('apps', {});
    
    for (const config of configs) {
      apps[config.id] = config;
    }
    
    store.set('apps', apps);
  }

  /**
   * Delete an app configuration
   */
  async deleteAppConfig(appId: string): Promise<void> {
    const store = await this.ensureStore();
    const apps = store.get('apps', {});
    delete apps[appId];
    store.set('apps', apps);
  }

  /**
   * Clear all app configurations
   */
  async clearAppConfigs(): Promise<void> {
    const store = await this.ensureStore();
    store.delete('apps');
    store.delete('backgroundScanEnabled');
    store.delete('lastBackgroundScan');
    store.delete('manualFolders');
    store.delete('manualFolderConfigs');
  }

  /**
   * Get background scan enabled status
   */
  async getBackgroundScanEnabled(): Promise<boolean> {
    const store = await this.ensureStore();
    return store.get('backgroundScanEnabled', false);
  }

  /**
   * Set background scan enabled status
   */
  async setBackgroundScanEnabled(enabled: boolean): Promise<void> {
    const store = await this.ensureStore();
    store.set('backgroundScanEnabled', enabled);
  }

  /**
   * Get background scan interval in minutes
   */
  async getBackgroundScanIntervalMinutes(): Promise<number> {
    const store = await this.ensureStore();
    return store.get('backgroundScanIntervalMinutes', 30);
  }

  /**
   * Set background scan interval in minutes
   */
  async setBackgroundScanIntervalMinutes(minutes: number): Promise<void> {
    const store = await this.ensureStore();
    // Enforce minimum of 1 minute and maximum of 1440 minutes (24 hours)
    const clampedMinutes = Math.max(1, Math.min(1440, minutes));
    store.set('backgroundScanIntervalMinutes', clampedMinutes);
  }

  /**
   * Get last background scan timestamp
   */
  async getLastBackgroundScan(): Promise<number | undefined> {
    const store = await this.ensureStore();
    return store.get('lastBackgroundScan', undefined);
  }

  /**
   * Set last background scan timestamp
   */
  async setLastBackgroundScan(timestamp: number): Promise<void> {
    const store = await this.ensureStore();
    store.set('lastBackgroundScan', timestamp);
  }

  /**
   * Get manual folders to monitor (legacy - returns paths only)
   * Only returns enabled folders
   */
  async getManualFolders(): Promise<string[]> {
    const store = await this.ensureStore();
    const configs = await this.getManualFolderConfigs();
    // Return paths from enabled configs only
    return Object.values(configs)
      .filter(c => c.enabled !== false) // Only include enabled folders (default to enabled if not set)
      .map(c => c.path);
  }

  /**
   * Save manual folders to monitor (legacy - accepts paths only)
   */
  async saveManualFolders(folders: string[]): Promise<void> {
    const store = await this.ensureStore();
    // Migrate to new format if needed
    const existingConfigs = await this.getManualFolderConfigs();
    const existingPaths = new Set(Object.values(existingConfigs).map(c => c.path));
    
    // Add any new folders as configs
    for (const folderPath of folders) {
      if (!existingPaths.has(folderPath)) {
        const folderName = path.basename(folderPath) || 'Manual Folder';
        const folderId = `manual-${Buffer.from(folderPath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`;
        await this.saveManualFolderConfig({
          id: folderId,
          name: folderName,
          path: folderPath,
          enabled: true,
        });
      }
    }
    
    // Remove configs for folders that are no longer in the list
    for (const [id, config] of Object.entries(existingConfigs)) {
      if (!folders.includes(config.path)) {
        await this.deleteManualFolderConfig(id);
      }
    }
    
    // Also save legacy format for backward compatibility
    store.set('manualFolders', folders);
  }

  /**
   * Get manual folder configurations with custom names
   */
  async getManualFolderConfigs(): Promise<Record<string, ManualFolderConfig>> {
    const store = await this.ensureStore();
    const configs = store.get('manualFolderConfigs', {});
    
    // Migrate legacy format if needed
    const legacyFolders = store.get('manualFolders', []) as string[];
    if (legacyFolders.length > 0 && Object.keys(configs).length === 0) {
      const migratedConfigs: Record<string, ManualFolderConfig> = {};
      for (const folderPath of legacyFolders) {
        const folderName = path.basename(folderPath) || 'Manual Folder';
        const folderId = `manual-${Buffer.from(folderPath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 16)}`;
        migratedConfigs[folderId] = {
          id: folderId,
          name: folderName,
          path: folderPath,
          enabled: true,
        };
      }
      store.set('manualFolderConfigs', migratedConfigs);
      return migratedConfigs;
    }
    
    return configs;
  }

  /**
   * Save a manual folder configuration
   */
  async saveManualFolderConfig(config: ManualFolderConfig): Promise<void> {
    const store = await this.ensureStore();
    const configs = await this.getManualFolderConfigs();
    configs[config.id] = config;
    store.set('manualFolderConfigs', configs);
    
    // Update legacy format for backward compatibility
    const paths = Object.values(configs).filter(c => c.enabled).map(c => c.path);
    store.set('manualFolders', paths);
  }

  /**
   * Delete a manual folder configuration
   */
  async deleteManualFolderConfig(folderId: string): Promise<void> {
    const store = await this.ensureStore();
    const configs = await this.getManualFolderConfigs();
    delete configs[folderId];
    store.set('manualFolderConfigs', configs);
    
    // Update legacy format for backward compatibility
    const paths = Object.values(configs).filter(c => c.enabled).map(c => c.path);
    store.set('manualFolders', paths);
  }
}
