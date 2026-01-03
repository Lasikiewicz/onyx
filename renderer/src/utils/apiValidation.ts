/**
 * Utility function to check if API credentials are configured
 */
export async function areAPIsConfigured(): Promise<boolean> {
  try {
    const credentials = await window.electronAPI.getAPICredentials();
    return !!(
      credentials.igdbClientId && 
      credentials.igdbClientSecret &&
      credentials.igdbClientId.trim() !== '' &&
      credentials.igdbClientSecret.trim() !== ''
    );
  } catch (error) {
    console.error('Error checking API credentials:', error);
    return false;
  }
}
