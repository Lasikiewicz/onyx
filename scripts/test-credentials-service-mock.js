const path = require('path');
const fs = require('fs');
const os = require('os');
const assert = require('assert');
const { execSync } = require('child_process');

(async () => {
  // Path where our electronStoreShim resolves in non-Electron (test) environments
  const legacyStorePath = path.join(os.tmpdir(), 'api-credentials.json');

  try {
    // Compile main TS to make sure dist-electron is up-to-date
    execSync('npx tsc -p main/tsconfig.json', { stdio: 'inherit' });

    const { APICredentialsService } = require(path.join(__dirname, '..', 'dist-electron', 'APICredentialsService'));

    // Seed the legacy plaintext store that APICredentialsService's shim will read.
    // In a non-Electron environment the shim resolves to os.tmpdir(), so we write there directly.
    fs.writeFileSync(
      legacyStorePath,
      JSON.stringify({ credentials: { igdbClientId: 'ID1', igdbClientSecret: 'SECRET1', steamGridDBApiKey: 'SG1' } }, null, 2),
      'utf8'
    );

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

    console.log('✓ APICredentialsService mock tests passed');
    process.exit(0);
  } catch (err) {
    console.error('APICredentialsService mock test failed:', err);
    process.exit(1);
  } finally {
    // Cleanup: remove legacy store file written during test
    try { fs.unlinkSync(legacyStorePath); } catch { /* ignore */ }
  }
})();