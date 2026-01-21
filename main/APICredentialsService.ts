export interface APICredentials {
  igdbClientId?: string;
  igdbClientSecret?: string;
  steamGridDBApiKey?: string;
  rawgApiKey?: string;
}

// Built-in RAWG key removed. Users must provide their own key via the environment variable `RAWG_API_KEY`.
// NOTE: Previously a fallback RAWG key was present here but has been removed for security reasons.

interface APICredentialsSchema {
  credentials: APICredentials;
}

export class APICredentialsService {
  private store: any = null;
  private storePromise: Promise<any>;

  private getEnvDefaults(): APICredentials {
    const valueOrUndefined = (val?: string) => (val && val.trim().length > 0 ? val.trim() : undefined);
    const rawgEnv = valueOrUndefined(process.env.RAWG_API_KEY);
    return {
      igdbClientId: valueOrUndefined(process.env.IGDB_CLIENT_ID),
      igdbClientSecret: valueOrUndefined(process.env.IGDB_CLIENT_SECRET),
      steamGridDBApiKey: valueOrUndefined(process.env.STEAMGRIDDB_API_KEY),
      rawgApiKey: rawgEnv,
    };
  }

  constructor() {
    // Use dynamic import for ES module
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    this.storePromise = (new Function('return import("electron-store")')() as Promise<typeof import('electron-store')>).then((StoreModule) => {
      const Store = StoreModule.default;
      // Don't persist env defaults to disk - only use them as runtime fallbacks
      this.store = new Store<APICredentialsSchema>({
        name: 'api-credentials',
        defaults: {
          credentials: {},
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
    const envDefaults = this.getEnvDefaults();
    const storedCreds = store.get('credentials', {});

    // Merge: stored credentials override env defaults
    return {
      igdbClientId: storedCreds.igdbClientId || envDefaults.igdbClientId,
      igdbClientSecret: storedCreds.igdbClientSecret || envDefaults.igdbClientSecret,
      steamGridDBApiKey: storedCreds.steamGridDBApiKey || envDefaults.steamGridDBApiKey,
      rawgApiKey: storedCreds.rawgApiKey || envDefaults.rawgApiKey,
    };
  }

  /**
   * Save API credentials
   */
  async saveCredentials(credentials: Partial<APICredentials>): Promise<void> {
    const store = await this.ensureStore();
    const current = store.get('credentials', {});

    // Only save explicitly provided credentials, don't persist env defaults
    const toSave: APICredentials = { ...current };

    if (credentials.igdbClientId !== undefined) {
      toSave.igdbClientId = credentials.igdbClientId;
    }
    if (credentials.igdbClientSecret !== undefined) {
      toSave.igdbClientSecret = credentials.igdbClientSecret;
    }
    if (credentials.steamGridDBApiKey !== undefined) {
      toSave.steamGridDBApiKey = credentials.steamGridDBApiKey;
    }
    if (credentials.rawgApiKey !== undefined) {
      toSave.rawgApiKey = credentials.rawgApiKey;
    }

    store.set('credentials', toSave);
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
