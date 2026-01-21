module.exports = {
  async isSteamSyncEnabled(appConfigService) {
    try {
      const cfg = await appConfigService.getAppConfig('steam');
      return !!(cfg && cfg.syncPlaytime === true);
    } catch (err) {
      return false; // Fail-safe: disabled
    }
  },
};