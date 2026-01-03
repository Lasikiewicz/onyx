export interface APICredentials {
  igdbClientId?: string;
  igdbClientSecret?: string;
}

interface APICredentialsSchema {
  credentials: APICredentials;
}

export class APICredentialsService {
  private store: any = null;
  private storePromise: Promise<any>;

  constructor() {
    // Use dynamic import for ES module
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    this.storePromise = (new Function('return import("electron-store")')() as Promise<typeof import('electron-store')>).then((StoreModule) => {
      const Store = StoreModule.default;
      this.store = new Store<APICredentialsSchema>({
        name: 'api-credentials',
        defaults: {
          credentials: {
            igdbClientId: undefined,
            igdbClientSecret: undefined,
          },
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
   * Get API credentials
   */
  async getCredentials(): Promise<APICredentials> {
    const store = await this.ensureStore();
    return store.get('credentials', {
      igdbClientId: undefined,
      igdbClientSecret: undefined,
    });
  }

  /**
   * Save API credentials
   */
  async saveCredentials(credentials: Partial<APICredentials>): Promise<void> {
    const store = await this.ensureStore();
    const current = store.get('credentials', {
      igdbClientId: undefined,
      igdbClientSecret: undefined,
    });
    store.set('credentials', { ...current, ...credentials });
  }

  /**
   * Clear API credentials
   */
  async clearCredentials(): Promise<void> {
    const store = await this.ensureStore();
    store.set('credentials', {
      igdbClientId: undefined,
      igdbClientSecret: undefined,
    });
  }
}
