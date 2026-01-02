import { existsSync } from 'node:fs';

export interface AppConfig {
  id: string;
  name: string;
  enabled: boolean;
  path: string;
}

interface AppConfigsSchema {
  apps: Record<string, AppConfig>;
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
}
