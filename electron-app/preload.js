const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('widgetAPI', {
  getState: () => ipcRenderer.invoke('widget:get-state'),
  toggleManualMute: () => ipcRenderer.invoke('widget:toggle-manual-mute'),
  reportContentHeight: (height) => ipcRenderer.invoke('widget:resize-content', { height }),
  onState: (callback) => {
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('widget:state', listener);
    return () => ipcRenderer.removeListener('widget:state', listener);
  },
});
