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
  clearLibrary: () => ipcRenderer.invoke('gameStore:clearLibrary'),
  clearAllImages: () => ipcRenderer.invoke('gameStore:clearAllImages'),
  clearAllLinks: () => ipcRenderer.invoke('gameStore:clearAllLinks'),
  migratePerGameViewSizeOverrides: () => ipcRenderer.invoke('gameStore:migratePerGameViewSizeOverrides'),
  saveGame: (game: any, oldGame?: any) => ipcRenderer.invoke('gameStore:saveGame', game, oldGame),
  deleteCachedImage: (gameId: string, imageType: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'hero' | 'icon') => ipcRenderer.invoke('imageCache:deleteImage', gameId, imageType),
  reorderGames: (games: any[]) => ipcRenderer.invoke('gameStore:reorderGames', games),
  addCustomGame: (gameData: { title: string; exePath: string }) => ipcRenderer.invoke('gameStore:addCustomGame', gameData),
  deleteGame: (gameId: string) => ipcRenderer.invoke('gameStore:deleteGame', gameId),
  removeWinGDKGames: () => ipcRenderer.invoke('gameStore:removeWinGDKGames'),
  removeMissingGames: (gameIds: string[]) => ipcRenderer.invoke('scan:removeMissingGames', gameIds),
  getMissingGames: () => ipcRenderer.invoke('scan:getMissingGames'),
  // Dialog methods
  showOpenDialog: () => ipcRenderer.invoke('dialog:showOpenDialog'),
  showFolderDialog: () => ipcRenderer.invoke('dialog:showFolderDialog'),
  showImageDialog: () => ipcRenderer.invoke('dialog:showImageDialog'),
  // Import methods
  scanFolderForExecutables: (folderPath: string) => ipcRenderer.invoke('import:scanFolderForExecutables', folderPath),
  // Metadata fetcher methods
  searchArtwork: (title: string, steamAppId?: string, bypassCache?: boolean) => ipcRenderer.invoke('metadata:searchArtwork', title, steamAppId, bypassCache),
  fetchGameDescription: (steamGameId: string) => ipcRenderer.invoke('metadata:fetchGameDescription', steamGameId),
  validateMetadataProviders: () => ipcRenderer.invoke('metadata:validateProviders'),

  fetchAndUpdateMetadata: (gameId: string, title: string) => ipcRenderer.invoke('metadata:fetchAndUpdate', gameId, title),

  // External
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  getAppProfile: () => ipcRenderer.invoke('app:getAppProfile') as Promise<'alpha' | 'production'>,
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
  launchModManager: (gameId: string) => ipcRenderer.invoke('launcher:launchModManager', gameId),
  openGameUninstaller: (gameId: string) => ipcRenderer.invoke('launcher:openGameUninstaller', gameId),
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
      'startup:newGamesFound',
      'scan:missing-games',
      'metadata:refreshProgress',
      'gameStore:libraryUpdated',
      'metadata:gameImagesFound',
      'metadata:fastSearchProgress',
      'app:update-status',
      'crash:dumpsAvailable',
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
  saveCustomDefaults: (settings: any, resolution?: string) => ipcRenderer.invoke('customDefaults:save', settings, resolution),
  restoreCustomDefaults: (options: { viewMode: string; scope: string; resolution?: string }) => ipcRenderer.invoke('customDefaults:restore', options),
  exportCustomDefaults: (options: { viewMode: string; scope: string; resolution?: string; overrideSettings?: any }) => ipcRenderer.invoke('customDefaults:export', options),
  importCustomDefaults: () => ipcRenderer.invoke('customDefaults:import'),
  getBaselineDefaults: () => ipcRenderer.invoke('customDefaults:getBaseline'),
  // New Custom Defaults Manager methods
  getPerGameSettingsCount: () => ipcRenderer.invoke('customDefaults:getPerGameCount'),
  getSavedDefaultsList: () => ipcRenderer.invoke('customDefaults:getSavedList'),
  deleteCustomDefault: (options: { resolution: string; viewMode: string }) => ipcRenderer.invoke('customDefaults:delete', options),
  validateImportFile: (data: any) => ipcRenderer.invoke('customDefaults:validate', data),
  exportCustomDefaultsSelective: (options: { resolutions: string[]; viewModes: string[]; includePerGameSettings: boolean; currentResolution: string }) => ipcRenderer.invoke('customDefaults:exportSelective', options),
  importCustomDefaultsSelective: (options: { data?: any; includePerGameSettings: boolean; mergeStrategy: 'overwrite' | 'keep' }) => ipcRenderer.invoke('customDefaults:importSelective', options),
  // App control methods
  requestExit: () => ipcRenderer.invoke('app:requestExit'),
  exit: () => ipcRenderer.invoke('app:exit'),
  // Unified optimization status methods
  optimization: {
    getStatus: () => ipcRenderer.invoke('optimization:getStatus'),
    clearStatus: () => ipcRenderer.invoke('optimization:clearStatus'),
    getDiagnostics: () => ipcRenderer.invoke('optimization:getDiagnostics'),
    onStatus: (callback: (status: any) => void) => {
      const handler = (_event: any, status: any) => callback(status);
      ipcRenderer.on('optimization:status', handler);
      return () => ipcRenderer.removeListener('optimization:status', handler);
    },
  },
  minimizeToTray: () => ipcRenderer.invoke('app:minimizeToTray'),
  applySystemTraySettings: (settings: { showSystemTrayIcon: boolean; minimizeToTray: boolean }) => ipcRenderer.invoke('app:applySystemTraySettings', settings),
  applyStartupSettings: (settings: { startWithComputer: boolean; startMinimized: boolean; startClosedToTray: boolean }) => ipcRenderer.invoke('app:applyStartupSettings', settings),

  // Process monitoring
  checkProcessExists: (pid: number) => ipcRenderer.invoke('process:checkExists', pid),
  // API credentials methods
  getAPICredentials: () => ipcRenderer.invoke('api:getCredentials'),
  saveAPICredentials: (credentials: { igdbClientId?: string; igdbClientSecret?: string; steamGridDBApiKey?: string; rawgApiKey?: string; giantBombApiKey?: string }) => ipcRenderer.invoke('api:saveCredentials', credentials),
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
  restoreWindow: () => ipcRenderer.invoke('app:restoreWindow'),
  // Refresh all metadata
  refreshAllMetadata: (options?: { allGames?: boolean; gameIds?: string[]; continueFromIndex?: number; linksOnly?: boolean }) => ipcRenderer.invoke('metadata:refreshAll', options),
  optimizeImageCache: (options?: { webpOnly?: boolean; forceProcessOverBytes?: number; forceAnimatedWebp?: boolean }) => ipcRenderer.invoke('imageCache:optimizeExisting', options),
  optimizeGames: (options?: { gameIds?: string[]; allGames?: boolean }) => ipcRenderer.invoke('imageQueue:optimizeGames', options),
  findLinks: (gameId: string) => ipcRenderer.invoke('metadata:findLinks', gameId),
  maximizeWindow: () => ipcRenderer.invoke('app:maximizeWindow'),
  closeWindow: () => ipcRenderer.invoke('app:closeWindow'),
  // App reset method
  resetApp: () => ipcRenderer.invoke('app:reset'),
  clearGameLibrary: () => ipcRenderer.invoke('app:clearGameLibrary'),
  // Import service methods
  cancelScanAllSources: () => ipcRenderer.invoke('import:cancelScan'),
  cancelStartupScan: () => ipcRenderer.invoke('startup:cancel-scan'),
  runStartupScan: () => ipcRenderer.invoke('startup:run-scan'),
  scanAllSources: () => ipcRenderer.invoke('import:scanAllSources'),
  // Crash dumps (after a previous run crashed)
  saveCrashDumps: () => ipcRenderer.invoke('crash:saveDumps'),
  openCrashDumpFolder: () => ipcRenderer.invoke('crash:openDumpFolder'),
  dismissCrashDumps: () => ipcRenderer.invoke('crash:dismissDumps'),
  scanFolder: (folderPath: string) => ipcRenderer.invoke('import:scanFolder', folderPath),
  // Image search methods
  searchImages: (query: string, imageType: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon', steamAppId?: string, includeAnimated?: boolean) => ipcRenderer.invoke('metadata:searchImages', query, imageType, steamAppId, includeAnimated),
  searchWebImages: (query: string, imageType: 'boxart' | 'banner' | 'alternativeBanner' | 'logo' | 'icon') => ipcRenderer.invoke('metadata:searchWebImages', query, imageType),
  fastImageSearch: (query: string, requestId?: number) => ipcRenderer.invoke('metadata:fastImageSearch', query, requestId),
  fetchGameImages: (gameName: string, steamAppId?: string, igdbId?: number, includeAnimated?: boolean, requestId?: number, gameId?: string) => ipcRenderer.invoke('metadata:fetchGameImages', gameName, steamAppId, igdbId, includeAnimated, requestId, gameId),
  // App version
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  getChangelog: (version?: string) => ipcRenderer.invoke('app:getChangelog', version),
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
  notifyAppReady: () => ipcRenderer.send('app:ready'),
  onUpdateFound: () => ipcRenderer.send('app:update-found'),
  onUpdateDismissed: () => ipcRenderer.send('app:update-dismissed'),
  // Open path/folder
  openPath: (pathOrType: string) => ipcRenderer.invoke('app:openPath', pathOrType),
  restartAsAdmin: () => ipcRenderer.invoke('app:restartAsAdmin'),
  // Suspend service methods
  suspend: {
    getRunningGames: () => ipcRenderer.invoke('suspend:getRunningGames'),
    suspendGame: (gameId: string) => ipcRenderer.invoke('suspend:suspendGame', gameId),
    resumeGame: (gameId: string) => ipcRenderer.invoke('suspend:resumeGame', gameId),
    getFeatureEnabled: () => ipcRenderer.invoke('suspend:getFeatureEnabled'),
    setFeatureEnabled: (enabled: boolean) => ipcRenderer.invoke('suspend:setFeatureEnabled', enabled),
    getShortcut: () => ipcRenderer.invoke('suspend:getShortcut'),
    setShortcut: (shortcut: string) => ipcRenderer.invoke('suspend:setShortcut', shortcut),
  },
  // Background scanning control
  scanning: {
    gameStarted: (gameId: string) => ipcRenderer.invoke('scanning:gameStarted', gameId),
    gameStopped: (gameId: string) => ipcRenderer.invoke('scanning:gameStopped', gameId),
  },
  // Fullscreen methods
  fullscreen: {
    toggle: () => ipcRenderer.invoke('app:toggleFullscreen'),
    enter: () => ipcRenderer.invoke('app:enterFullscreen'),
    exit: () => ipcRenderer.invoke('app:exitFullscreen'),
    getState: () => ipcRenderer.invoke('app:getFullscreenState'),
    isMinimized: () => ipcRenderer.invoke('app:isMinimized'),
    onChanged: (callback: (isFullscreen: boolean) => void) => {
      const handler = (_event: any, isFullscreen: boolean) => callback(isFullscreen);
      ipcRenderer.on('fullscreen-changed', handler);
      return () => ipcRenderer.removeListener('fullscreen-changed', handler);
    },
  },
  // Bug report methods
  generateBugReport: (userDescription: string) => ipcRenderer.invoke('bugReport:generate', userDescription),
  getBugReportLogsDirectory: () => ipcRenderer.invoke('bugReport:getLogsDirectory'),
});

// electronAPI is intentionally minimal and safe; do not log its exposure in production
