/**
 * Utility function to check if both required APIs are configured
 * Returns true only if BOTH IGDB (Client ID + Secret) AND SteamGridDB API key are configured
 */
export async function areAPIsConfigured(): Promise<boolean> {
  try {
    const credentials = await window.electronAPI.getAPICredentials();
    
    // Check if IGDB is configured (both Client ID and Secret required)
    const igdbConfigured = !!(
      credentials.igdbClientId && 
      credentials.igdbClientSecret &&
      credentials.igdbClientId.trim() !== '' &&
      credentials.igdbClientSecret.trim() !== ''
    );
    
    // Check if SteamGridDB is configured
    const steamGridDBConfigured = !!(
      credentials.steamGridDBApiKey &&
      credentials.steamGridDBApiKey.trim() !== ''
    );
    
    // Return true only if BOTH required APIs are configured
    return igdbConfigured && steamGridDBConfigured;
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
  steamGridDBConfigured: boolean;
  rawgConfigured: boolean;
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
    
    const steamGridDBConfigured = !!(
      credentials.steamGridDBApiKey &&
      credentials.steamGridDBApiKey.trim() !== ''
    );
    
    const rawgConfigured = !!(
      credentials.rawgApiKey &&
      credentials.rawgApiKey.trim() !== ''
    );
    
    return {
      igdbConfigured,
      steamGridDBConfigured,
      rawgConfigured,
      allRequiredConfigured: igdbConfigured && steamGridDBConfigured,
    };
  } catch (error) {
    console.error('Error checking API credentials:', error);
    return {
      igdbConfigured: false,
      steamGridDBConfigured: false,
      rawgConfigured: false,
      allRequiredConfigured: false,
    };
  }
}
