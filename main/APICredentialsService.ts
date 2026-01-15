export interface APICredentials {
  igdbClientId?: string;
  igdbClientSecret?: string;
  steamGridDBApiKey?: string;
  rawgApiKey?: string;
}

// Built-in RAWG key used as a fallback so users don't need to provide one.
// Do not log or expose this key in UI.
const RAWG_FALLBACK_API_KEY = '57d7898a324341fab44e301e0e7be3d9';

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
            steamGridDBApiKey: undefined,
            rawgApiKey: RAWG_FALLBACK_API_KEY,
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
    const creds = store.get('credentials', {
      igdbClientId: undefined,
      igdbClientSecret: undefined,
      steamGridDBApiKey: undefined,
      rawgApiKey: RAWG_FALLBACK_API_KEY,
    });
    // Always provide fallback RAWG key if missing
    if (!creds.rawgApiKey || creds.rawgApiKey.trim() === '') {
      creds.rawgApiKey = RAWG_FALLBACK_API_KEY;
    }
    return creds;
  }

  /**
   * Save API credentials
   */
  async saveCredentials(credentials: Partial<APICredentials>): Promise<void> {
    const store = await this.ensureStore();
    const current = store.get('credentials', {
      igdbClientId: undefined,
      igdbClientSecret: undefined,
      steamGridDBApiKey: undefined,
      rawgApiKey: RAWG_FALLBACK_API_KEY,
    });
    store.set('credentials', { ...current, ...credentials, rawgApiKey: credentials.rawgApiKey ?? RAWG_FALLBACK_API_KEY });
  }

  /**
   * Clear API credentials
   */
  async clearCredentials(): Promise<void> {
    const store = await this.ensureStore();
    // Use delete() to properly remove the credentials key
    store.delete('credentials');
  }
}
