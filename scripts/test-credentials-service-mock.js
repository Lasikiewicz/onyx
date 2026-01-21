const path = require('path');
const assert = require('assert');
const { execSync } = require('child_process');

(async () => {
  try {
    // Compile main TS to make sure dist-electron is up-to-date
    execSync('npx tsc -p main/tsconfig.json', { stdio: 'inherit' });

    const { APICredentialsService } = require(path.join(__dirname, '..', 'dist-electron', 'APICredentialsService'));

    // Create a temporary electron-store instance for test isolation (seed legacy plaintext creds)
    const StoreModule = require('electron-store');
    const Store = StoreModule.default || StoreModule;
    // Seed the legacy store that APICredentialsService will read (name 'api-credentials')
    const store = new Store({ name: 'api-credentials', projectName: 'onyx' });
    await store.set('credentials', { igdbClientId: 'ID1', igdbClientSecret: 'SECRET1', steamGridDBApiKey: 'SG1' });

    // Fake keytar (in-memory)
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

    // Create service with injected fakeKeytar
    const svc = new APICredentialsService(fakeKeytar);

    // Wait briefly to allow constructor migration to complete (it runs async)
    await new Promise((res) => setTimeout(res, 500));

    // Getting credentials should read from fakeKeytar via service
    const creds = await svc.getCredentials();
    assert.strictEqual(creds.igdbClientId, 'ID1');
    assert.strictEqual(creds.igdbClientSecret, 'SECRET1');
    assert.strictEqual(creds.steamGridDBApiKey, 'SG1');

    // Clear credentials
    await svc.clearCredentials();
    const credsAfterClear = await svc.getCredentials();
    // After clear, nothing in keytar and no stored creds => fall back to env (undefined)
    assert.strictEqual(credsAfterClear.igdbClientId, undefined);

    // Cleanup store
    store.clear();

    console.log('✓ APICredentialsService mock tests passed');
    process.exit(0);
  } catch (err) {
    console.error('APICredentialsService mock test failed:', err);
    process.exit(1);
  }
})();