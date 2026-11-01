// The renderer's only door to the main process (contextIsolation): status, actions, insights, settings.
const { contextBridge, ipcRenderer } = require('electron');

const subscribe = (channel) => (callback) => {
  const listener = (_event, value) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('archv3d', {
  getStatus: () => ipcRenderer.invoke('status:get'),
  refreshStatus: () => ipcRenderer.invoke('status:refresh'),
  runAction: (name) => ipcRenderer.invoke('action:run', name),
  getInsights: (days) => ipcRenderer.invoke('insights:get', days),
  getCosts: (fresh) => ipcRenderer.invoke('costs:get', fresh),
  deleteLead: (id) => ipcRenderer.invoke('leads:delete', id),
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (changes) => ipcRenderer.invoke('settings:save', changes),
  generateToken: () => ipcRenderer.invoke('settings:generateToken'),
  openExternal: (url) => ipcRenderer.invoke('open:external', url),
  onStatus: subscribe('status'),
  onAction: subscribe('action'),
  onNavigate: subscribe('navigate')
});
