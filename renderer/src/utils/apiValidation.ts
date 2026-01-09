/**
 * Utility function to check if at least one API is configured
 * Returns true if either IGDB (Client ID + Secret) OR SteamGridDB API key is configured
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
    
    // Return true if at least one API is configured
    return igdbConfigured || steamGridDBConfigured;
  } catch (error) {
    console.error('Error checking API credentials:', error);
    return false;
  }
}
