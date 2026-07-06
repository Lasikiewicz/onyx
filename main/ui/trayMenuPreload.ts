import { contextBridge, ipcRenderer } from 'electron';

// Minimal bridge for the custom tray menu popup. The popup renders
// library-derived content (labels, icon URLs), so it must run fully
// isolated: no Node access, only these two capabilities.
const trayMenuAPI = {
  sendAction: (actionId: string) => {
    if (typeof actionId === 'string') {
      ipcRenderer.send('tray-menu:action', actionId);
    }
  },
  close: () => ipcRenderer.send('tray-menu:close'),
};

export type TrayMenuAPI = typeof trayMenuAPI;

contextBridge.exposeInMainWorld('trayMenu', trayMenuAPI);
