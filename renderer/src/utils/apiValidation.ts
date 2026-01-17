/**
 * Utility function to check if APIs are configured.
 * IGDB is now MANDATORY.
 */
export async function areAPIsConfigured(): Promise<boolean> {
  try {
    const status = await getAPIConfigurationStatus();
    return status.allRequiredConfigured;
  } catch (error) {
    console.error('Error checking API credentials:', error);
    return false;
  }
}

/**
 * Get detailed API configuration status
 */
export async function getAPIConfigurationStatus(): Promise<{
  igdbConfigured: boolean;
  rawgConfigured: boolean;
  steamGridDBConfigured: boolean;
  allRequiredConfigured: boolean;
}> {
  try {
    const credentials = await window.electronAPI.getAPICredentials();

    const igdbConfigured = !!(
      credentials.igdbClientId &&
      credentials.igdbClientSecret &&
      credentials.igdbClientId.trim() !== '' &&
      credentials.igdbClientSecret.trim() !== ''
    );

    const rawgConfigured = !!(
      credentials.rawgApiKey &&
      credentials.rawgApiKey.trim() !== ''
    );

    const steamGridDBConfigured = !!(
      credentials.steamGridDBApiKey &&
      credentials.steamGridDBApiKey.trim() !== ''
    );

    return {
      igdbConfigured,
      rawgConfigured,
      steamGridDBConfigured,
      allRequiredConfigured: igdbConfigured, // IGDB is mandatory
    };
  } catch (error) {
    console.error('Error checking API credentials:', error);
    return {
      igdbConfigured: false,
      rawgConfigured: false,
      steamGridDBConfigured: false,
      allRequiredConfigured: false,
    };
  }
}
