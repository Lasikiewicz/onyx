import { BrowserWindow } from 'electron';
import axios from 'axios';

export interface SteamAuthState {
  steamId?: string;
  username?: string;
  authenticated: boolean;
  lastAuthTime?: number;
}

interface SteamAuthSchema {
  auth: SteamAuthState;
}

export class SteamAuthService {
  private store: any = null;
  private storePromise: Promise<any>;
  private authWindow: BrowserWindow | null = null;

  constructor() {
    // Use dynamic import for ES module
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    this.storePromise = (new Function('return import("electron-store")')() as Promise<typeof import('electron-store')>).then((StoreModule) => {
      const Store = StoreModule.default;
      this.store = new Store<SteamAuthSchema>({
        name: 'steam-auth',
        defaults: {
          auth: {
            authenticated: false,
          },
        },
      });
      return this.store;
    });
  }

  private async ensureStore(): Promise<any> {
    if (this.store) {
      return this.store;
    }
    return this.storePromise;
  }

  /**
   * Get current Steam authentication state
   */
  async getAuthState(): Promise<SteamAuthState> {
    const store = await this.ensureStore();
    return store.get('auth', {
      authenticated: false,
    });
  }

  /**
   * Save Steam authentication state
   */
  async saveAuthState(authState: Partial<SteamAuthState>): Promise<void> {
    const store = await this.ensureStore();
    const current = store.get('auth', {
      authenticated: false,
    });
    store.set('auth', {
      ...current,
      ...authState,
      authenticated: authState.authenticated !== undefined ? authState.authenticated : current.authenticated,
    });
  }

  /**
   * Clear Steam authentication
   */
  async clearAuth(): Promise<void> {
    const store = await this.ensureStore();
    store.set('auth', {
      authenticated: false,
    });
  }

  /**
   * Authenticate with Steam using OpenID
   * Opens a BrowserWindow for web-based authentication
   */
  async authenticate(): Promise<{ success: boolean; steamId?: string; username?: string; error?: string }> {
    return new Promise(async (resolve) => {
      // Close any existing auth window
      if (this.authWindow) {
        this.authWindow.close();
        this.authWindow = null;
      }

      try {
        // Steam OpenID endpoint
        // We use a custom return URL that we'll intercept
        const returnUrl = 'https://onyx-launcher.app/auth/steam';
        const realm = 'https://onyx-launcher.app';
        
        const steamOpenIdUrl = new URL('https://steamcommunity.com/openid/login');
        steamOpenIdUrl.searchParams.set('openid.ns', 'http://specs.openid.net/auth/2.0');
        steamOpenIdUrl.searchParams.set('openid.mode', 'checkid_setup');
        steamOpenIdUrl.searchParams.set('openid.return_to', returnUrl);
        steamOpenIdUrl.searchParams.set('openid.realm', realm);
        steamOpenIdUrl.searchParams.set('openid.identity', 'http://specs.openid.net/auth/2.0/identifier_select');
        steamOpenIdUrl.searchParams.set('openid.claimed_id', 'http://specs.openid.net/auth/2.0/identifier_select');

        // Create browser window for authentication
        this.authWindow = new BrowserWindow({
          width: 900,
          height: 700,
          show: false,
          modal: true,
          parent: undefined, // Will be set if main window exists
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
          },
          title: 'Steam Login',
        });

        this.authWindow.once('ready-to-show', () => {
          if (this.authWindow) {
            this.authWindow.show();
          }
        });

        let authCompleted = false;

        // Listen for navigation to capture the authentication response
        this.authWindow.webContents.on('will-navigate', async (event, navigationUrl) => {
          if (authCompleted) return;
          
          // Check if this is our return URL
          if (navigationUrl.startsWith(returnUrl) || navigationUrl.includes('openid.mode=id_res')) {
            event.preventDefault();
            authCompleted = true;
            
            try {
              // Parse the URL to extract OpenID parameters
              const url = new URL(navigationUrl);
              const claimedId = url.searchParams.get('openid.claimed_id') || url.searchParams.get('openid.identity');
              
              if (claimedId) {
                // Steam ID is in the format: https://steamcommunity.com/openid/id/76561198000000000
                const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
                if (steamIdMatch) {
                  const steamId = steamIdMatch[1];
                  
                  // Try to get username from Steam profile (public API, no key needed for basic info)
                  let username = 'Steam User';
                  try {
                    // Use Steam's public profile API
                    const profileUrl = `https://steamcommunity.com/profiles/${steamId}/?xml=1`;
                    const response = await axios.get(profileUrl, { 
                      timeout: 5000,
                      headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                      }
                    });
                    
                    // Parse XML response to get username
                    const xmlMatch = response.data.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/);
                    if (xmlMatch) {
                      username = xmlMatch[1];
                    }
                  } catch (err) {
                    console.warn('Could not fetch Steam username, using default:', err);
                    // Username fetch failed, but we still have the Steam ID
                  }

                  await this.saveAuthState({
                    steamId,
                    username,
                    authenticated: true,
                    lastAuthTime: Date.now(),
                  });

                  if (this.authWindow) {
                    this.authWindow.close();
                    this.authWindow = null;
                  }

                  resolve({ success: true, steamId, username });
                  return;
                }
              }

              // If we get here, authentication failed
              await this.clearAuth();
              if (this.authWindow) {
                this.authWindow.close();
                this.authWindow = null;
              }
              resolve({ success: false, error: 'Failed to extract Steam ID from response' });
            } catch (err) {
              console.error('Error processing Steam authentication:', err);
              await this.clearAuth();
              if (this.authWindow) {
                this.authWindow.close();
                this.authWindow = null;
              }
              resolve({ success: false, error: err instanceof Error ? err.message : 'Authentication failed' });
            }
          }
        });

        // Also listen for did-navigate-in-page for single-page app redirects
        this.authWindow.webContents.on('did-navigate-in-page', async (event, navigationUrl, isMainFrame) => {
          if (authCompleted || !isMainFrame) return;
          
          if (navigationUrl.includes('openid.mode=id_res') || navigationUrl.includes('onyx-launcher.app/auth/steam')) {
            try {
              const url = new URL(navigationUrl);
              const claimedId = url.searchParams.get('openid.claimed_id') || url.searchParams.get('openid.identity');
              
              if (claimedId) {
                const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
                if (steamIdMatch) {
                  authCompleted = true;
                  const steamId = steamIdMatch[1];
                  
                  let username = 'Steam User';
                  try {
                    const profileUrl = `https://steamcommunity.com/profiles/${steamId}/?xml=1`;
                    const response = await axios.get(profileUrl, { 
                      timeout: 5000,
                      headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                      }
                    });
                    const xmlMatch = response.data.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/);
                    if (xmlMatch) {
                      username = xmlMatch[1];
                    }
                  } catch (err) {
                    console.warn('Could not fetch Steam username:', err);
                  }

                  await this.saveAuthState({
                    steamId,
                    username,
                    authenticated: true,
                    lastAuthTime: Date.now(),
                  });

                  if (this.authWindow) {
                    this.authWindow.close();
                    this.authWindow = null;
                  }

                  resolve({ success: true, steamId, username });
                }
              }
            } catch (err) {
              console.error('Error processing Steam authentication (in-page):', err);
            }
          }
        });

        // Check URL after page finishes loading (in case redirect happens after load)
        this.authWindow.webContents.on('did-finish-load', async () => {
          if (authCompleted) return;
          
          try {
            const currentUrl = this.authWindow?.webContents.getURL();
            if (currentUrl && (currentUrl.includes('openid.mode=id_res') || currentUrl.includes('onyx-launcher.app/auth/steam'))) {
              const url = new URL(currentUrl);
              const claimedId = url.searchParams.get('openid.claimed_id') || url.searchParams.get('openid.identity');
              
              if (claimedId) {
                const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
                if (steamIdMatch) {
                  authCompleted = true;
                  const steamId = steamIdMatch[1];
                  
                  let username = 'Steam User';
                  try {
                    const profileUrl = `https://steamcommunity.com/profiles/${steamId}/?xml=1`;
                    const response = await axios.get(profileUrl, { 
                      timeout: 5000,
                      headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                      }
                    });
                    const xmlMatch = response.data.match(/<steamID><!\[CDATA\[(.*?)\]\]><\/steamID>/);
                    if (xmlMatch) {
                      username = xmlMatch[1];
                    }
                  } catch (err) {
                    console.warn('Could not fetch Steam username:', err);
                  }

                  await this.saveAuthState({
                    steamId,
                    username,
                    authenticated: true,
                    lastAuthTime: Date.now(),
                  });

                  if (this.authWindow) {
                    this.authWindow.close();
                    this.authWindow = null;
                  }

                  resolve({ success: true, steamId, username });
                }
              }
            }
          } catch (err) {
            console.error('Error checking URL after page load:', err);
          }
        });

        // Handle window close
        this.authWindow.on('closed', () => {
          this.authWindow = null;
          if (!authCompleted) {
            resolve({ success: false, error: 'Authentication cancelled' });
          }
        });

        // Load Steam login page
        this.authWindow.loadURL(steamOpenIdUrl.toString());
      } catch (error) {
        console.error('Error starting Steam authentication:', error);
        if (this.authWindow) {
          this.authWindow.close();
          this.authWindow = null;
        }
        resolve({ success: false, error: error instanceof Error ? error.message : 'Failed to start authentication' });
      }
    });
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const state = await this.getAuthState();
    return state.authenticated && !!state.steamId;
  }
}
