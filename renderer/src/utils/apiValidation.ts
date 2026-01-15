/**
 * Utility function to check if APIs are configured.
 * With built-in RAWG fallback, we consider APIs available by default to avoid blocking users.
 */
export async function areAPIsConfigured(): Promise<boolean> {
  try {
    await window.electronAPI.getAPICredentials();
    return true; // Fallback RAWG key ensures availability
  } catch (error) {
    console.error('Error checking API credentials:', error);
    return true; // Fail-open to avoid blocking scans
  }
}

/**
 * Get detailed API configuration status
 */
export async function getAPIConfigurationStatus(): Promise<{
  igdbConfigured: boolean;
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

    const rawgConfigured = true; // Provided by built-in fallback key

    return {
      igdbConfigured,
      rawgConfigured,
      allRequiredConfigured: true, // do not block flows
    };
  } catch (error) {
    console.error('Error checking API credentials:', error);
    return {
      igdbConfigured: false,
      rawgConfigured: true,
      allRequiredConfigured: true,
    };
  }
}
