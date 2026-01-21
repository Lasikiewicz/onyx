const fs = require('fs');
const path = require('path');

(async () => {
  try {
    let keytar;
    try {
      keytar = require('keytar');
    } catch (err) {
      console.log('Keytar not available; skipping credentials migration test (install keytar locally to run this test).');
      process.exit(0);
    }

    const Store = require('electron-store');

    // Setup legacy store with plaintext credentials
    const store = new Store({ name: 'api-credentials' });
    await store.set('credentials', {
      igdbClientId: 'leaked-client-id-test',
      igdbClientSecret: 'leaked-client-secret-test',
    });

    // Ensure values are present in legacy store
    const before = store.get('credentials');
    if (!before || !before.igdbClientId || !before.igdbClientSecret) {
      console.error('Failed to set credentials in legacy store for test');
      process.exit(1);
    }
    console.log('Legacy credentials written to electron-store');

    // Build the project to ensure dist-electron is up-to-date
    const { execSync } = require('child_process');
    console.log('Building project to ensure latest compiled code...');
    execSync('npm run build', { stdio: 'inherit' });

    // Require the compiled service
    const { APICredentialsService } = require(path.join(__dirname, '..', 'dist-electron', 'APICredentialsService'));
    const svc = new APICredentialsService();

    // Wait briefly for migration to occur (constructor performs migration asynchronously)
    await new Promise((res) => setTimeout(res, 1500));

    // Check that legacy store no longer contains credentials
    const after = store.get('credentials');
    if (after && Object.keys(after).length > 0) {
      console.error('Migration failed: legacy store still contains credentials:', after);
      process.exit(2);
    }
    console.log('Legacy store credentials removed (good)');

    // Verify keytar contains migrated values
    const id = await keytar.getPassword('onyx-api-credentials', 'igdbClientId');
    const secret = await keytar.getPassword('onyx-api-credentials', 'igdbClientSecret');

    if (id !== 'leaked-client-id-test' || secret !== 'leaked-client-secret-test') {
      console.error('Migration failed: keytar does not contain migrated values', { id, secret });
      process.exit(3);
    }

    console.log('Credentials successfully migrated to keytar. Test passed.');

    // Cleanup
    await keytar.deletePassword('onyx-api-credentials', 'igdbClientId');
    await keytar.deletePassword('onyx-api-credentials', 'igdbClientSecret');
    store.delete('credentials');

    process.exit(0);
  } catch (err) {
    console.error('Error during credentials migration test:', err);
    process.exit(1);
  }
})();