export interface APICredentials {
  igdbClientId?: string;
  igdbClientSecret?: string;
  steamGridDBApiKey?: string;
  rawgApiKey?: string;
  giantBombApiKey?: string;
}

interface APICredentialsSchema {
  credentials: APICredentials;
}

import Store from './electronStoreShim.js';

const LEGACY_SERVICE_NAME = 'onyx-api-credentials';
const ACCOUNT_KEYS = {
  IGDB_CLIENT_ID: 'igdbClientId',
  IGDB_CLIENT_SECRET: 'igdbClientSecret',
  STEAMGRID_KEY: 'steamGridDBApiKey',
  RAWG_KEY: 'rawgApiKey',
  GIANTBOMB_KEY: 'giantBombApiKey',
};

export class APICredentialsService {
  private store: Store<APICredentialsSchema>;
  private storePromise: Promise<Store<APICredentialsSchema>>;
  private keytar: any = null;
  private serviceName: string;
  private readonly legacyServiceNames: string[];

  private resolveDefaultServiceName(): string {
    const execLower = (process.execPath || '').toLowerCase();
    const isAlpha = execLower.includes('onyxalpha') || process.env.BUILD_PROFILE === 'alpha';
    const isDev = process.env.NODE_ENV !== 'production' && !execLower.includes('onyx.exe') && !execLower.includes('onyxalpha.exe');

    if (isAlpha && isDev) return 'onyx-alpha-dev-api-credentials';
    if (isAlpha) return 'onyx-alpha-api-credentials';
    if (isDev) return 'onyx-dev-api-credentials';
    return LEGACY_SERVICE_NAME;
  }

  private getEnvDefaults(): APICredentials {
    const valueOrUndefined = (val?: string) => (val && val.trim().length > 0 ? val.trim() : undefined);
    const rawgEnv = valueOrUndefined(process.env.RAWG_API_KEY);
    return {
      igdbClientId: valueOrUndefined(process.env.IGDB_CLIENT_ID),
      igdbClientSecret: valueOrUndefined(process.env.IGDB_CLIENT_SECRET),
      steamGridDBApiKey: valueOrUndefined(process.env.STEAMGRIDDB_API_KEY),
      rawgApiKey: rawgEnv,
      giantBombApiKey: valueOrUndefined(process.env.GIANTBOMB_API_KEY),
    };
  }

  // Accept an optional injectedKeytar for testability (pass fake keytar in unit tests)
  constructor(injectedKeytar?: any, serviceNameOverride?: string) {
    const resolvedServiceName = serviceNameOverride || this.resolveDefaultServiceName();
    this.serviceName = resolvedServiceName;
    this.legacyServiceNames = resolvedServiceName === LEGACY_SERVICE_NAME ? [] : [LEGACY_SERVICE_NAME];
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

    const baseStore = new Store<APICredentialsSchema>({
      name: 'api-credentials',
      defaults: {
        credentials: {},
      },
    });

    this.store = baseStore;

    this.storePromise = (async () => {
      // Attempt to migrate any existing plain-text credentials into the secure store
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { migrateCredentials } = require('./credentialsMigrator');
        await migrateCredentials(baseStore, this.keytar, resolvedServiceName, ACCOUNT_KEYS);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const isKnownCredentialStoreIssue = /Not enough memory resources|The parameter is incorrect|Element not found|The specified logon session does not exist/i.test(message);
        if (isKnownCredentialStoreIssue) {
          this.keytar = null;
          // eslint-disable-next-line no-console
          console.warn('Credential migration skipped due to OS credential store availability; using electron-store fallback.');
        } else {
          // eslint-disable-next-line no-console
          console.error('Credential migration failed:', err);
        }
      }
      return baseStore;
    })();
  }

  private async ensureStore(): Promise<any> {
    if (this.store) {
      return this.store;
    }
    return this.storePromise;
  }

  private async readFromKeytar(serviceName: string): Promise<APICredentials | null> {
    if (!this.keytar) return null;
    try {
      const [igdbClientId, igdbClientSecret, steamGridDBApiKey, rawgApiKey, giantBombApiKey] = await Promise.all([
        this.keytar.getPassword(serviceName, ACCOUNT_KEYS.IGDB_CLIENT_ID),
        this.keytar.getPassword(serviceName, ACCOUNT_KEYS.IGDB_CLIENT_SECRET),
        this.keytar.getPassword(serviceName, ACCOUNT_KEYS.STEAMGRID_KEY),
        this.keytar.getPassword(serviceName, ACCOUNT_KEYS.RAWG_KEY),
        this.keytar.getPassword(serviceName, ACCOUNT_KEYS.GIANTBOMB_KEY),
      ]);
      return {
        igdbClientId: igdbClientId || undefined,
        igdbClientSecret: igdbClientSecret || undefined,
        steamGridDBApiKey: steamGridDBApiKey || undefined,
        rawgApiKey: rawgApiKey || undefined,
        giantBombApiKey: giantBombApiKey || undefined,
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
    const storedCreds = store.get('credentials', {});

    // Prefer secure keytar storage if available
    if (this.keytar) {
      let secure = await this.readFromKeytar(this.serviceName);

      if (
        (!secure || (!secure.igdbClientId && !secure.igdbClientSecret && !secure.steamGridDBApiKey && !secure.rawgApiKey && !secure.giantBombApiKey)) &&
        this.legacyServiceNames.length > 0
      ) {
        for (const legacyName of this.legacyServiceNames) {
          const legacySecure = await this.readFromKeytar(legacyName);
          if (legacySecure && (legacySecure.igdbClientId || legacySecure.igdbClientSecret || legacySecure.steamGridDBApiKey || legacySecure.rawgApiKey || legacySecure.giantBombApiKey)) {
            secure = legacySecure;
            break;
          }
        }
      }

      if (secure) {
        const rawgApiKey = secure.rawgApiKey || storedCreds.rawgApiKey || envDefaults.rawgApiKey;
        if (rawgApiKey) {
          const rawgSource = secure.rawgApiKey ? 'keytar' : (storedCreds.rawgApiKey ? 'electron-store' : 'env');
          console.log('[APICredentials] RAWG source:', rawgSource);
        }
        return {
          igdbClientId: secure.igdbClientId || storedCreds.igdbClientId || envDefaults.igdbClientId,
          igdbClientSecret: secure.igdbClientSecret || storedCreds.igdbClientSecret || envDefaults.igdbClientSecret,
          steamGridDBApiKey: secure.steamGridDBApiKey || storedCreds.steamGridDBApiKey || envDefaults.steamGridDBApiKey,
          rawgApiKey,
          giantBombApiKey: secure.giantBombApiKey || storedCreds.giantBombApiKey || envDefaults.giantBombApiKey,
        };
      }
    }

    // Fallback to stored credentials in electron-store (legacy)
    // Merge: stored credentials override env defaults
    const rawgApiKey = storedCreds.rawgApiKey || envDefaults.rawgApiKey;
    if (rawgApiKey) {
      const rawgSource = storedCreds.rawgApiKey ? 'electron-store' : 'env';
      console.log('[APICredentials] RAWG source:', rawgSource);
    }
    return {
      igdbClientId: storedCreds.igdbClientId || envDefaults.igdbClientId,
      igdbClientSecret: storedCreds.igdbClientSecret || envDefaults.igdbClientSecret,
      steamGridDBApiKey: storedCreds.steamGridDBApiKey || envDefaults.steamGridDBApiKey,
      rawgApiKey,
      giantBombApiKey: storedCreds.giantBombApiKey || envDefaults.giantBombApiKey,
    };
  }

  /**
   * Save API credentials
   */
  async saveCredentials(credentials: Partial<APICredentials>): Promise<void> {
    const store = await this.ensureStore();

    const updateLegacyStore = (values: Partial<APICredentials>) => {
      const current = store.get('credentials', {});
      const toSave: APICredentials = { ...current };
      const applyValue = (key: keyof APICredentials, value?: string) => {
        if (value === '') {
          delete toSave[key];
        } else if (value !== undefined) {
          toSave[key] = value;
        }
      };

      applyValue('igdbClientId', values.igdbClientId);
      applyValue('igdbClientSecret', values.igdbClientSecret);
      applyValue('steamGridDBApiKey', values.steamGridDBApiKey);
      applyValue('rawgApiKey', values.rawgApiKey);
      applyValue('giantBombApiKey', values.giantBombApiKey);

      store.set('credentials', toSave);
    };

    // If keytar available, store credentials securely
    if (this.keytar) {
      let hadKeytarError = false;
      // Helper to save or delete based on value presence
      const saveOrDelete = async (account: string, value?: string) => {
        try {
          if (value && value.trim().length > 0) {
            await this.keytar.setPassword(this.serviceName, account, value.trim());
          } else if (value === '') {
            // Only delete if specifically set to empty string (user cleared it)
            await this.keytar.deletePassword(this.serviceName, account);
          }
        } catch (err) {
          hadKeytarError = true;
          // eslint-disable-next-line no-console
          console.error(`Error saving credential to keytar for ${account}:`, err);
        }
      };

      if (credentials.igdbClientId !== undefined) await saveOrDelete(ACCOUNT_KEYS.IGDB_CLIENT_ID, credentials.igdbClientId);
      if (credentials.igdbClientSecret !== undefined) await saveOrDelete(ACCOUNT_KEYS.IGDB_CLIENT_SECRET, credentials.igdbClientSecret);
      if (credentials.steamGridDBApiKey !== undefined) await saveOrDelete(ACCOUNT_KEYS.STEAMGRID_KEY, credentials.steamGridDBApiKey);
      if (credentials.rawgApiKey !== undefined) await saveOrDelete(ACCOUNT_KEYS.RAWG_KEY, credentials.rawgApiKey);
      if (credentials.giantBombApiKey !== undefined) await saveOrDelete(ACCOUNT_KEYS.GIANTBOMB_KEY, credentials.giantBombApiKey);

      if (hadKeytarError) {
        updateLegacyStore(credentials);
        return;
      }

      // Ensure legacy store does not keep plaintext credentials
      store.delete('credentials');
      return;
    }

    // Legacy path: persist in electron-store (only used when keytar not available)
    updateLegacyStore(credentials);
  }

  /**
   * Clear API credentials
   */
  async clearCredentials(): Promise<void> {
    const store = await this.ensureStore();

    if (this.keytar) {
      try {
        await Promise.all([
          this.keytar.deletePassword(this.serviceName, ACCOUNT_KEYS.IGDB_CLIENT_ID),
          this.keytar.deletePassword(this.serviceName, ACCOUNT_KEYS.IGDB_CLIENT_SECRET),
          this.keytar.deletePassword(this.serviceName, ACCOUNT_KEYS.STEAMGRID_KEY),
          this.keytar.deletePassword(this.serviceName, ACCOUNT_KEYS.RAWG_KEY),
          this.keytar.deletePassword(this.serviceName, ACCOUNT_KEYS.GIANTBOMB_KEY),
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

