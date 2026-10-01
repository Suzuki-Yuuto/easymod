const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bridgeAPI', {
  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (cfg) => ipcRenderer.invoke('save-config', cfg),
  getDefaults: () => ipcRenderer.invoke('get-defaults'),

  // Scanning & Path Validation
  scanAll: () => ipcRenderer.invoke('scan-all'),
  validatePaths: (paths) => ipcRenderer.invoke('validate-paths', paths),
  selectDirectory: (defaultPath) => ipcRenderer.invoke('select-directory', defaultPath),

  // Synchronization
  syncModpack: (options) => ipcRenderer.invoke('sync-modpack', options),
  cancelSync: () => ipcRenderer.invoke('cancel-sync'),
  onSyncProgress: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('sync-progress', handler);
    return () => ipcRenderer.removeListener('sync-progress', handler);
  },

  // OS / Shell operations
  openPath: (targetPath) => ipcRenderer.invoke('open-path', targetPath),
  openLegacyLauncher: () => ipcRenderer.invoke('open-legacy-launcher'),
  launchModpack: (versionName) => ipcRenderer.invoke('launch-modpack', versionName),
  selectFile: (options) => ipcRenderer.invoke('select-file', options),

  // Window Controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close')
});
