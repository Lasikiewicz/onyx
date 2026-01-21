export interface APICredentials {
  igdbClientId?: string;
  igdbClientSecret?: string;
  steamGridDBApiKey?: string;
  rawgApiKey?: string;
}

interface APICredentialsSchema {
  credentials: APICredentials;
}

const SERVICE_NAME = 'onyx-api-credentials';
const ACCOUNT_KEYS = {
  IGDB_CLIENT_ID: 'igdbClientId',
  IGDB_CLIENT_SECRET: 'igdbClientSecret',
  STEAMGRID_KEY: 'steamGridDBApiKey',
  RAWG_KEY: 'rawgApiKey',
};

export class APICredentialsService {
  private store: any = null;
  private storePromise: Promise<any>;
  private keytar: any = null;

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

  // Accept an optional injectedKeytar for testability (pass fake keytar in unit tests)
  constructor(injectedKeytar?: any) {
    // Attempt to use injected keytar first
    if (injectedKeytar) {
      this.keytar = injectedKeytar;
    } else {
      // Attempt to load keytar for secure OS credential storage. If unavailable, we fall back to electron-store.
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        this.keytar = require('keytar');
      } catch (err) {
        this.keytar = null;
      }
    }

    // Use dynamic import for ES module
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    this.storePromise = (new Function('return import("electron-store")')() as Promise<typeof import('electron-store')>).then((StoreModule) => {
      const Store = StoreModule.default;
      // Don't persist env defaults to disk - only use them as runtime fallbacks
      this.store = new Store<APICredentialsSchema>({
        name: 'api-credentials',
        projectName: 'onyx',
        defaults: {
          credentials: {},
        },
      });

      // Attempt to migrate any existing plain-text credentials into the secure store
      // Use a testable helper so this logic can be unit tested without native keytar
      (async () => {
        try {
          // Import helper lazily so tests can mock behavior easily
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const { migrateCredentials } = require('./credentialsMigrator');
          await migrateCredentials(this.store, this.keytar, SERVICE_NAME, ACCOUNT_KEYS);
        } catch (err) {
          // Migration failure should not break the app; log and continue
          // eslint-disable-next-line no-console
          console.error('Credential migration failed:', err);
        }
      })();

      return this.store;
    });
  }

  private async ensureStore(): Promise<any> {
    if (this.store) {
      return this.store;
    }
    return this.storePromise;
  }

  private async readFromKeytar(): Promise<APICredentials | null> {
    if (!this.keytar) return null;
    try {
      const [igdbClientId, igdbClientSecret, steamGridDBApiKey, rawgApiKey] = await Promise.all([
        this.keytar.getPassword(SERVICE_NAME, ACCOUNT_KEYS.IGDB_CLIENT_ID),
        this.keytar.getPassword(SERVICE_NAME, ACCOUNT_KEYS.IGDB_CLIENT_SECRET),
        this.keytar.getPassword(SERVICE_NAME, ACCOUNT_KEYS.STEAMGRID_KEY),
        this.keytar.getPassword(SERVICE_NAME, ACCOUNT_KEYS.RAWG_KEY),
      ]);
      return {
        igdbClientId: igdbClientId || undefined,
        igdbClientSecret: igdbClientSecret || undefined,
        steamGridDBApiKey: steamGridDBApiKey || undefined,
        rawgApiKey: rawgApiKey || undefined,
      };
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Error reading credentials from keytar:', err);
      return null;
    }
  }

  /**
   * Get API credentials
   */
  async getCredentials(): Promise<APICredentials> {
    const store = await this.ensureStore();
    const envDefaults = this.getEnvDefaults();

    // Prefer secure keytar storage if available
    if (this.keytar) {
      const secure = await this.readFromKeytar();
      if (secure) {
        return {
          igdbClientId: secure.igdbClientId || envDefaults.igdbClientId,
          igdbClientSecret: secure.igdbClientSecret || envDefaults.igdbClientSecret,
          steamGridDBApiKey: secure.steamGridDBApiKey || envDefaults.steamGridDBApiKey,
          rawgApiKey: secure.rawgApiKey || envDefaults.rawgApiKey,
        };
      }
    }

    // Fallback to stored credentials in electron-store (legacy)
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

    // If keytar available, store credentials securely
    if (this.keytar) {
      if (credentials.igdbClientId !== undefined) await this.keytar.setPassword(SERVICE_NAME, ACCOUNT_KEYS.IGDB_CLIENT_ID, credentials.igdbClientId);
      if (credentials.igdbClientSecret !== undefined) await this.keytar.setPassword(SERVICE_NAME, ACCOUNT_KEYS.IGDB_CLIENT_SECRET, credentials.igdbClientSecret);
      if (credentials.steamGridDBApiKey !== undefined) await this.keytar.setPassword(SERVICE_NAME, ACCOUNT_KEYS.STEAMGRID_KEY, credentials.steamGridDBApiKey);
      if (credentials.rawgApiKey !== undefined) await this.keytar.setPassword(SERVICE_NAME, ACCOUNT_KEYS.RAWG_KEY, credentials.rawgApiKey);

      // Ensure legacy store does not keep plaintext credentials
      store.delete('credentials');
      return;
    }

    // Legacy path: persist in electron-store (only used when keytar not available)
    const current = store.get('credentials', {});
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

    if (this.keytar) {
      try {
        await Promise.all([
          this.keytar.deletePassword(SERVICE_NAME, ACCOUNT_KEYS.IGDB_CLIENT_ID),
          this.keytar.deletePassword(SERVICE_NAME, ACCOUNT_KEYS.IGDB_CLIENT_SECRET),
          this.keytar.deletePassword(SERVICE_NAME, ACCOUNT_KEYS.STEAMGRID_KEY),
          this.keytar.deletePassword(SERVICE_NAME, ACCOUNT_KEYS.RAWG_KEY),
        ]);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Error clearing credentials from keytar:', err);
      }
    }

    // Remove any legacy store values
    store.delete('credentials');
  }
}

