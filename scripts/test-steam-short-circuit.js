const { isSteamSyncEnabled } = require('../main/handlers/steamPlaytimeShortCircuit');

async function run() {
  // Fake appConfigService returning syncPlaytime false
  const fake = {
    async getAppConfig(appId) {
      if (appId === 'steam') return { id: 'steam', name: 'Steam', enabled: true, path: '', syncPlaytime: false };
      return null;
    },
  };

  const result = await isSteamSyncEnabled(fake);
  if (result === false) {
    console.log('✓ Short-circuit test passed (disabled)');
    process.exit(0);
  }
  console.error('✗ Short-circuit test failed');
  process.exit(1);
}

run();