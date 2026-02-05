import { contextBridge, ipcRenderer } from 'electron';
import type { UserPreferences } from './UserPreferencesService';

// Note: Removed debug logging in preload for production safety

// --------- Expose a minimal, safe API to the Renderer process ---------
// Note: We DO NOT expose the raw ipcRenderer object to the renderer to reduce attack surface.
// All renderer interactions must go through the documented and permissioned `electronAPI` below.

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Steam service methods
  scanSteamGames: () => ipcRenderer.invoke('steam:scanGames'),
  getSteamPath: () => ipcRenderer.invoke('steam:getSteamPath'),
  setSteamPath: (path: string) => ipcRenderer.invoke('steam:setSteamPath', path),
  scanGamesWithPath: (path?: string, autoMerge?: boolean) => ipcRenderer.invoke('steam:scanGamesWithPath', path, autoMerge),
  // Steam authentication methods
  authenticateSteam: () => ipcRenderer.invoke('steam:authenticate'),
  getSteamAuthState: () => ipcRenderer.invoke('steam:getAuthState'),
  clearSteamAuth: () => ipcRenderer.invoke('steam:clearAuth'),
  // Steam import methods
  importAllSteamGames: (path?: string) => ipcRenderer.invoke('steam:importAllGames', path),
  // Steam playtime sync
  syncSteamPlaytime: () => ipcRenderer.invoke('steam:syncPlaytime'),
  // GameStore methods
  getLibrary: () => ipcRenderer.invoke('gameStore:getLibrary'),
  saveGame: (game: any, oldGame?: any) => ipcRenderer.invoke('gameStore:saveGame', game, oldGame),
  deleteCachedImage: (gameId: string, imageType: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'hero' | 'icon') => ipcRenderer.invoke('imageCache:deleteImage', gameId, imageType),
  reorderGames: (games: any[]) => ipcRenderer.invoke('gameStore:reorderGames', games),
  addCustomGame: (gameData: { title: string; exePath: string }) => ipcRenderer.invoke('gameStore:addCustomGame', gameData),
  deleteGame: (gameId: string) => ipcRenderer.invoke('gameStore:deleteGame', gameId),
  removeWinGDKGames: () => ipcRenderer.invoke('gameStore:removeWinGDKGames'),
  removeMissingGames: (gameIds: string[]) => ipcRenderer.invoke('scan:removeMissingGames', gameIds),
  // Dialog methods
  showOpenDialog: () => ipcRenderer.invoke('dialog:showOpenDialog'),
  showFolderDialog: () => ipcRenderer.invoke('dialog:showFolderDialog'),
  showImageDialog: () => ipcRenderer.invoke('dialog:showImageDialog'),
  // Import methods
  scanFolderForExecutables: (folderPath: string) => ipcRenderer.invoke('import:scanFolderForExecutables', folderPath),
  // Metadata fetcher methods
  searchArtwork: (title: string, steamAppId?: string, bypassCache?: boolean) => ipcRenderer.invoke('metadata:searchArtwork', title, steamAppId, bypassCache),
  fetchGameDescription: (steamGameId: string) => ipcRenderer.invoke('metadata:fetchGameDescription', steamGameId),

  fetchAndUpdateMetadata: (gameId: string, title: string) => ipcRenderer.invoke('metadata:fetchAndUpdate', gameId, title),

  // External
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  setIGDBConfig: (config: { clientId: string; accessToken: string }) => ipcRenderer.invoke('metadata:setIGDBConfig', config),
  setMockMode: (enabled: boolean) => ipcRenderer.invoke('metadata:setMockMode', enabled),
  searchMetadata: (gameTitle: string) => ipcRenderer.invoke('metadata:searchMetadata', gameTitle),
  searchGames: (gameTitle: string) => ipcRenderer.invoke('metadata:searchGames', gameTitle),
  searchAndMatch: (scannedGame: any, searchQuery?: string) => ipcRenderer.invoke('metadata:searchAndMatch', scannedGame, searchQuery),
  fixMatch: (query: string, scannedGame?: any) => ipcRenderer.invoke('metadata:fixMatch', query, scannedGame),
  fetchAndUpdateByProviderId: (gameId: string, providerId: string, providerSource: string) => ipcRenderer.invoke('metadata:fetchAndUpdateByProviderId', gameId, providerId, providerSource),
  fetchMetadataOnlyByProviderId: (gameId: string, providerId: string, providerSource: string) => ipcRenderer.invoke('metadata:fetchMetadataOnlyByProviderId', gameId, providerId, providerSource),
  // Launcher methods
  launchGame: (gameId: string) => ipcRenderer.invoke('launcher:launchGame', gameId),
  // App config methods
  getAppConfigs: () => ipcRenderer.invoke('appConfig:getAll'),
  getAppConfig: (appId: string) => ipcRenderer.invoke('appConfig:get', appId),
  saveAppConfig: (config: { id: string; name: string; enabled: boolean; path: string; autoAdd?: boolean }) => ipcRenderer.invoke('appConfig:save', config),
  saveAppConfigs: (configs: Array<{ id: string; name: string; enabled: boolean; path: string; autoAdd?: boolean }>) => ipcRenderer.invoke('appConfig:saveAll', configs),
  // Manual folders methods
  getManualFolders: () => ipcRenderer.invoke('manualFolders:get'),
  saveManualFolders: (folders: string[]) => ipcRenderer.invoke('manualFolders:save', folders),
  getManualFolderConfigs: () => ipcRenderer.invoke('manualFolders:getConfigs'),
  saveManualFolderConfig: (config: { id: string; name: string; path: string; enabled: boolean; autoCategory?: string[] }) => ipcRenderer.invoke('manualFolders:saveConfig', config),
  deleteManualFolderConfig: (folderId: string) => ipcRenderer.invoke('manualFolders:deleteConfig', folderId),
  // Xbox service methods
  scanXboxGames: (path: string, autoMerge?: boolean) => ipcRenderer.invoke('xbox:scanGames', path, autoMerge),
  // Menu event listeners
  onMenuEvent: (channel: string, callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on(channel, handler);
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  },
  // Generic event subscription for renderer (SAFE and WHITELISTED)
  // Returns a remover function to unregister the listener.
  on: (channel: string, callback: (...args: any[]) => void) => {
    const allowedChannels = new Set([
      'steam:newGamesFound',
      'background:newGamesFound',
      'startup:progress',
      'scan:missing-games',
      'metadata:refreshProgress',
      'gameStore:libraryUpdated',
      'metadata:gameImagesFound',
      'metadata:fastSearchProgress',
      'app:update-status',
    ]);
    if (!allowedChannels.has(channel)) {
      console.warn(`Attempt to register to unauthorized IPC channel: ${channel}`);
      return () => { };
    }
    const handler = (event: any, ...args: any[]) => {
      // Call the callback with event and args
      // This matches the expected signature: (event, data) => void
      callback(event, ...args);
    };
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback as any);
  },
  // User preferences methods
  getPreferences: () => ipcRenderer.invoke('preferences:get'),
  savePreferences: (preferences: Partial<UserPreferences>) => ipcRenderer.invoke('preferences:save', preferences),
  // Custom defaults methods
  hasCustomDefaults: () => ipcRenderer.invoke('customDefaults:has'),
  saveCustomDefaults: (settings: any) => ipcRenderer.invoke('customDefaults:save', settings),
  restoreCustomDefaults: (options: { viewMode: string; scope: string }) => ipcRenderer.invoke('customDefaults:restore', options),
  exportCustomDefaults: (options: { viewMode: string; scope: string; resolution?: string; overrideSettings?: any }) => ipcRenderer.invoke('customDefaults:export', options),
  importCustomDefaults: () => ipcRenderer.invoke('customDefaults:import'),
  getBaselineDefaults: () => ipcRenderer.invoke('customDefaults:getBaseline'),
  // App control methods
  requestExit: () => ipcRenderer.invoke('app:requestExit'),
  exit: () => ipcRenderer.invoke('app:exit'),
  minimizeToTray: () => ipcRenderer.invoke('app:minimizeToTray'),
  applySystemTraySettings: (settings: { showSystemTrayIcon: boolean; minimizeToTray: boolean }) => ipcRenderer.invoke('app:applySystemTraySettings', settings),
  applyStartupSettings: (settings: { startWithComputer: boolean; startClosedToTray: boolean }) => ipcRenderer.invoke('app:applyStartupSettings', settings),

  // Process monitoring
  checkProcessExists: (pid: number) => ipcRenderer.invoke('process:checkExists', pid),
  // API credentials methods
  getAPICredentials: () => ipcRenderer.invoke('api:getCredentials'),
  saveAPICredentials: (credentials: { igdbClientId?: string; igdbClientSecret?: string; steamGridDBApiKey?: string }) => ipcRenderer.invoke('api:saveCredentials', credentials),
  // Launcher detection methods
  detectLaunchers: () => ipcRenderer.invoke('launcher:detectAll'),
  detectLauncher: (launcherId: string) => ipcRenderer.invoke('launcher:detect', launcherId),
  // Background scan methods
  getBackgroundScanEnabled: () => ipcRenderer.invoke('appConfig:getBackgroundScanEnabled'),
  setBackgroundScanEnabled: (enabled: boolean) => ipcRenderer.invoke('appConfig:setBackgroundScanEnabled', enabled),
  getBackgroundScanIntervalMinutes: () => ipcRenderer.invoke('appConfig:getBackgroundScanIntervalMinutes'),
  setBackgroundScanIntervalMinutes: (minutes: number) => ipcRenderer.invoke('appConfig:setBackgroundScanIntervalMinutes', minutes),
  pauseBackgroundScan: () => ipcRenderer.invoke('appConfig:pauseBackgroundScan'),
  resumeBackgroundScan: () => ipcRenderer.invoke('appConfig:resumeBackgroundScan'),
  getLastBackgroundScan: () => ipcRenderer.invoke('appConfig:getLastBackgroundScan'),
  // DevTools toggle (development only)
  toggleDevTools: () => ipcRenderer.invoke('app:toggleDevTools'),
  // Window control methods
  minimizeWindow: () => ipcRenderer.invoke('app:minimizeWindow'),
  // Refresh all metadata
  refreshAllMetadata: (options?: { allGames?: boolean; gameIds?: string[] }) => ipcRenderer.invoke('metadata:refreshAll', options),
  maximizeWindow: () => ipcRenderer.invoke('app:maximizeWindow'),
  closeWindow: () => ipcRenderer.invoke('app:closeWindow'),
  // App reset method
  resetApp: () => ipcRenderer.invoke('app:reset'),
  clearGameLibrary: () => ipcRenderer.invoke('app:clearGameLibrary'),
  // Import service methods
  scanAllSources: () => ipcRenderer.invoke('import:scanAllSources'),
  scanFolder: (folderPath: string) => ipcRenderer.invoke('import:scanFolder', folderPath),
  // Image search methods
  searchImages: (query: string, imageType: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon', steamAppId?: string, includeAnimated?: boolean) => ipcRenderer.invoke('metadata:searchImages', query, imageType, steamAppId, includeAnimated),
  searchWebImages: (query: string, imageType: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => ipcRenderer.invoke('metadata:searchWebImages', query, imageType),
  fastImageSearch: (query: string) => ipcRenderer.invoke('metadata:fastImageSearch', query),
  fetchGameImages: (gameName: string, steamAppId?: string, igdbId?: number, includeAnimated?: boolean) => ipcRenderer.invoke('metadata:fetchGameImages', gameName, steamAppId, igdbId, includeAnimated),
  // App version
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  // App name (for detecting Alpha builds)
  getName: () => ipcRenderer.invoke('app:getName'),
  // Auto-update (only active when packaged)
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  downloadUpdate: () => ipcRenderer.invoke('app:downloadUpdate'),
  quitAndInstall: () => ipcRenderer.invoke('app:quitAndInstall'),
  onUpdateStatus: (callback: (payload: { status: string; version?: string; error?: string }) => void) => {
    const handler = (_e: Electron.IpcRendererEvent, payload: { status: string; version?: string; error?: string }) => callback(payload);
    ipcRenderer.on('app:update-status', handler);
    return () => ipcRenderer.removeListener('app:update-status', handler);
  },
  onUpdateFound: () => ipcRenderer.send('app:update-found'),
  onUpdateDismissed: () => ipcRenderer.send('app:update-dismissed'),
  // Open path/folder
  openPath: (pathOrType: string) => ipcRenderer.invoke('app:openPath', pathOrType),
  // Suspend service methods - FEATURE DISABLED
  // These methods intentionally return a disabled response to keep the feature inert.
  suspend: {
    getRunningGames: async () => ({ success: false, enabled: false, error: 'Suspend feature is disabled' }),
    suspendGame: async () => ({ success: false, enabled: false, error: 'Suspend feature is disabled' }),
    resumeGame: async () => ({ success: false, enabled: false, error: 'Suspend feature is disabled' }),
    getFeatureEnabled: async () => ({ enabled: false }),
    setFeatureEnabled: async () => ({ success: false, error: 'Feature is disabled' }),
    getShortcut: async () => ({ success: false, error: 'Feature is disabled' }),
    setShortcut: async () => ({ success: false, error: 'Feature is disabled' }),
  },
  // Fullscreen methods
  fullscreen: {
    toggle: () => ipcRenderer.invoke('app:toggleFullscreen'),
    enter: () => ipcRenderer.invoke('app:enterFullscreen'),
    exit: () => ipcRenderer.invoke('app:exitFullscreen'),
    getState: () => ipcRenderer.invoke('app:getFullscreenState'),
    onChanged: (callback: (isFullscreen: boolean) => void) => {
      const handler = (_event: any, isFullscreen: boolean) => callback(isFullscreen);
      ipcRenderer.on('fullscreen-changed', handler);
      return () => ipcRenderer.removeListener('fullscreen-changed', handler);
    },
  },
  // Gamepad methods
  gamepad: {
    getPreferences: () => ipcRenderer.invoke('gamepad:getPreferences'),
    setEnabled: (enabled: boolean) => ipcRenderer.invoke('gamepad:setEnabled', enabled),
    setNavigationSpeed: (speed: number) => ipcRenderer.invoke('gamepad:setNavigationSpeed', speed),
    setButtonLayout: (layout: 'xbox' | 'playstation') => ipcRenderer.invoke('gamepad:setButtonLayout', layout),
  },
  // Bug report methods
  generateBugReport: (userDescription: string) => ipcRenderer.invoke('bugReport:generate', userDescription),
  getBugReportLogsDirectory: () => ipcRenderer.invoke('bugReport:getLogsDirectory'),
});

// electronAPI is intentionally minimal and safe; do not log its exposure in production
