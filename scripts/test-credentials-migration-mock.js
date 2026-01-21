const StoreModule = require('electron-store');
const Store = StoreModule.default || StoreModule;
const assert = require('assert');
const path = require('path');

(async () => {
  try {
    // Create a temporary store (use a unique name to avoid clashing with real data)
    const store = new Store({ name: 'api-credentials-test-mock', projectName: 'onyx-test' });

    // Seed legacy plaintext credentials
    await store.set('credentials', {
      igdbClientId: 'TEST_IGDB_CLIENT_ID_VALUE',
      igdbClientSecret: 'TEST_IGDB_CLIENT_SECRET_VALUE',
      steamGridDBApiKey: 'TEST_STEAMGRID_KEY',
    });

    // Create a fake keytar implementation (in-memory)
    const fakeKeytar = {
      db: new Map(),
      async setPassword(service, account, password) {
        this.db.set(`${service}:${account}`, password);
        return true;
      },
      async getPassword(service, account) {
        return this.db.get(`${service}:${account}`) || null;
      },
      async deletePassword(service, account) {
        return this.db.delete(`${service}:${account}`);
      },
    };

    // Compile main TypeScript if needed (produces dist-electron/)
    const { execSync } = require('child_process');
    execSync('npx tsc -p main/tsconfig.json', { stdio: 'inherit' });

    // Require the compiled migrator
    const { migrateCredentials } = require(path.join(__dirname, '..', 'dist-electron', 'credentialsMigrator'));
    const SERVICE_NAME = 'onyx-api-credentials';
    const ACCOUNT_KEYS = {
      IGDB_CLIENT_ID: 'igdbClientId',
      IGDB_CLIENT_SECRET: 'igdbClientSecret',
      STEAMGRID_KEY: 'steamGridDBApiKey',
      RAWG_KEY: 'rawgApiKey',
    };

    const result = await migrateCredentials(store, fakeKeytar, SERVICE_NAME, ACCOUNT_KEYS);

    assert.strictEqual(result.migrated, true, 'Expected migration to report migrated:true');

    // Legacy store should be cleared
    const after = store.get('credentials');
    assert.ok(!after || Object.keys(after).length === 0, 'Legacy store should be cleared');

    // Verify fake keytar now has values
    const id = await fakeKeytar.getPassword(SERVICE_NAME, ACCOUNT_KEYS.IGDB_CLIENT_ID);
    const secret = await fakeKeytar.getPassword(SERVICE_NAME, ACCOUNT_KEYS.IGDB_CLIENT_SECRET);
    const steam = await fakeKeytar.getPassword(SERVICE_NAME, ACCOUNT_KEYS.STEAMGRID_KEY);

    assert.strictEqual(id, 'TEST_IGDB_CLIENT_ID_VALUE');
    assert.strictEqual(secret, 'TEST_IGDB_CLIENT_SECRET_VALUE');
    assert.strictEqual(steam, 'TEST_STEAMGRID_KEY');

    // Cleanup
    store.clear();

    console.log('✓ Mock migration test passed');
    process.exit(0);
  } catch (err) {
    console.error('Mock migration test failed:', err);
    process.exit(1);
  }
})();