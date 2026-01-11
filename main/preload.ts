import { contextBridge, ipcRenderer } from 'electron';
import type { UserPreferences } from './UserPreferencesService';

// Debug: Log that preload is loading
console.log('Preload script loading...');

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args;
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args));
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args;
    return ipcRenderer.off(channel, ...omit);
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args;
    return ipcRenderer.send(channel, ...omit);
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args;
    return ipcRenderer.invoke(channel, ...omit);
  },
});

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
  deleteCachedImage: (gameId: string, imageType: 'boxart' | 'banner' | 'logo' | 'hero') => ipcRenderer.invoke('imageCache:deleteImage', gameId, imageType),
  reorderGames: (games: any[]) => ipcRenderer.invoke('gameStore:reorderGames', games),
  addCustomGame: (gameData: { title: string; exePath: string }) => ipcRenderer.invoke('gameStore:addCustomGame', gameData),
  deleteGame: (gameId: string) => ipcRenderer.invoke('gameStore:deleteGame', gameId),
  removeWinGDKGames: () => ipcRenderer.invoke('gameStore:removeWinGDKGames'),
  // Dialog methods
      showOpenDialog: () => ipcRenderer.invoke('dialog:showOpenDialog'),
      showFolderDialog: () => ipcRenderer.invoke('dialog:showFolderDialog'),
      showImageDialog: () => ipcRenderer.invoke('dialog:showImageDialog'),
  // Import methods
  scanFolderForExecutables: (folderPath: string) => ipcRenderer.invoke('import:scanFolderForExecutables', folderPath),
  // Metadata fetcher methods
      searchArtwork: (title: string, steamAppId?: string) => ipcRenderer.invoke('metadata:searchArtwork', title, steamAppId),
  fetchGameDescription: (steamGameId: string) => ipcRenderer.invoke('metadata:fetchGameDescription', steamGameId),
  fetchAndUpdateMetadata: (gameId: string, title: string) => ipcRenderer.invoke('metadata:fetchAndUpdate', gameId, title),
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
  // User preferences methods
  getPreferences: () => ipcRenderer.invoke('preferences:get'),
  savePreferences: (preferences: Partial<UserPreferences>) => ipcRenderer.invoke('preferences:save', preferences),
  // App control methods
  requestExit: () => ipcRenderer.invoke('app:requestExit'),
  exit: () => ipcRenderer.invoke('app:exit'),
  minimizeToTray: () => ipcRenderer.invoke('app:minimizeToTray'),
  applySystemTraySettings: (settings: { showSystemTrayIcon: boolean; minimizeToTray: boolean }) => ipcRenderer.invoke('app:applySystemTraySettings', settings),
  applyStartupSettings: (settings: { startWithComputer: boolean; startClosedToTray: boolean }) => ipcRenderer.invoke('app:applyStartupSettings', settings),
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
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
  // Import service methods
  scanAllSources: () => ipcRenderer.invoke('import:scanAllSources'),
  scanFolder: (folderPath: string) => ipcRenderer.invoke('import:scanFolder', folderPath),
  // Image search methods
  searchImages: (query: string, imageType: 'boxart' | 'banner' | 'logo', steamAppId?: string) => ipcRenderer.invoke('metadata:searchImages', query, imageType, steamAppId),
  // App version
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  // App name (for detecting Alpha builds)
  getName: () => ipcRenderer.invoke('app:getName'),
  // Open path/folder
  openPath: (pathOrType: string) => ipcRenderer.invoke('app:openPath', pathOrType),
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
  // Bug report methods
  generateBugReport: (userDescription: string) => ipcRenderer.invoke('bugReport:generate', userDescription),
  getBugReportLogsDirectory: () => ipcRenderer.invoke('bugReport:getLogsDirectory'),
});

// Debug: Log that electronAPI was exposed
console.log('electronAPI exposed to window');
