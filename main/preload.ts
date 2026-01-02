import { contextBridge, ipcRenderer } from 'electron';

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
  // GameStore methods
  getLibrary: () => ipcRenderer.invoke('gameStore:getLibrary'),
  saveGame: (game: any) => ipcRenderer.invoke('gameStore:saveGame', game),
  reorderGames: (games: any[]) => ipcRenderer.invoke('gameStore:reorderGames', games),
  addCustomGame: (gameData: { title: string; exePath: string }) => ipcRenderer.invoke('gameStore:addCustomGame', gameData),
  deleteGame: (gameId: string) => ipcRenderer.invoke('gameStore:deleteGame', gameId),
  // Dialog methods
      showOpenDialog: () => ipcRenderer.invoke('dialog:showOpenDialog'),
      showFolderDialog: () => ipcRenderer.invoke('dialog:showFolderDialog'),
      showImageDialog: () => ipcRenderer.invoke('dialog:showImageDialog'),
  // Import methods
  scanFolderForExecutables: (folderPath: string) => ipcRenderer.invoke('import:scanFolderForExecutables', folderPath),
  // Metadata fetcher methods
      searchArtwork: (title: string, steamAppId?: string) => ipcRenderer.invoke('metadata:searchArtwork', title, steamAppId),
  fetchAndUpdateMetadata: (gameId: string, title: string) => ipcRenderer.invoke('metadata:fetchAndUpdate', gameId, title),
  setIGDBConfig: (config: { clientId: string; accessToken: string }) => ipcRenderer.invoke('metadata:setIGDBConfig', config),
  setMockMode: (enabled: boolean) => ipcRenderer.invoke('metadata:setMockMode', enabled),
  searchMetadata: (gameTitle: string) => ipcRenderer.invoke('metadata:searchMetadata', gameTitle),
  // Launcher methods
  launchGame: (gameId: string) => ipcRenderer.invoke('launcher:launchGame', gameId),
  // App config methods
  getAppConfigs: () => ipcRenderer.invoke('appConfig:getAll'),
  getAppConfig: (appId: string) => ipcRenderer.invoke('appConfig:get', appId),
  saveAppConfig: (config: { id: string; name: string; enabled: boolean; path: string }) => ipcRenderer.invoke('appConfig:save', config),
  saveAppConfigs: (configs: Array<{ id: string; name: string; enabled: boolean; path: string }>) => ipcRenderer.invoke('appConfig:saveAll', configs),
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
  savePreferences: (preferences: { gridSize?: number; panelWidth?: number; fanartHeight?: number; descriptionHeight?: number; pinnedCategories?: string[]; minimizeToTray?: boolean; showSystemTrayIcon?: boolean; startWithComputer?: boolean; startClosedToTray?: boolean; updateLibrariesOnStartup?: boolean; activeGameId?: string | null }) => ipcRenderer.invoke('preferences:save', preferences),
  // App control methods
  requestExit: () => ipcRenderer.invoke('app:requestExit'),
  exit: () => ipcRenderer.invoke('app:exit'),
  minimizeToTray: () => ipcRenderer.invoke('app:minimizeToTray'),
  applySystemTraySettings: (settings: { showSystemTrayIcon: boolean; minimizeToTray: boolean }) => ipcRenderer.invoke('app:applySystemTraySettings', settings),
  applyStartupSettings: (settings: { startWithComputer: boolean; startClosedToTray: boolean }) => ipcRenderer.invoke('app:applyStartupSettings', settings),
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  // API credentials methods
  getAPICredentials: () => ipcRenderer.invoke('api:getCredentials'),
  saveAPICredentials: (credentials: { igdbClientId?: string; igdbClientSecret?: string }) => ipcRenderer.invoke('api:saveCredentials', credentials),
});

// Debug: Log that electronAPI was exposed
console.log('electronAPI exposed to window');
