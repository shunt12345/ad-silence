const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const volume = require('./src/volume');
const { DetectorBridge, PORT } = require('./src/ws-server');
const { WidgetStateMachine } = require('./src/state-machine');
const settings = require('./src/settings');

const DEBOUNCE_MS = 400;
const WIDGET_WIDTH = 320;

let win;
let bridge;

const initialSettings = settings.load();

const machine = new WidgetStateMachine({
  debounceMs: DEBOUNCE_MS,
  duckPercent: initialSettings.duckPercent,
  onGetVolume: async () => {
    try {
      return await volume.getVolume();
    } catch (err) {
      console.error('[ad-silencer] volume control failed:', err.message);
      return 100;
    }
  },
  onSetVolume: async (percent) => {
    try {
      await volume.setVolume(percent);
    } catch (err) {
      console.error('[ad-silencer] volume control failed:', err.message);
    }
  },
  onStateChange: (state) => {
    if (win && !win.isDestroyed()) {
      win.webContents.send('widget:state', state);
    }
  },
});

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();

  win = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: 420,
    x: workArea.x + workArea.width - WIDGET_WIDTH - 24,
    y: workArea.y + 24,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    hasShadow: false,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.setAlwaysOnTop(true, 'floating');
  win.loadFile(path.join(__dirname, 'src', 'renderer', 'index.html'));

  win.once('ready-to-show', () => {
    win.show();
    win.webContents.send('widget:state', machine.getState());
  });
}

ipcMain.handle('widget:get-state', () => machine.getState());
ipcMain.handle('widget:toggle-manual-mute', () => machine.toggleManualMute());

ipcMain.handle('widget:set-duck-percent', async (_evt, percent) => {
  const state = await machine.setDuckPercent(percent);
  settings.save({ duckPercent: state.duckPercent });
  return state;
});

ipcMain.handle('widget:resize-content', (_evt, { height }) => {
  if (win && !win.isDestroyed() && typeof height === 'number') {
    win.setContentSize(WIDGET_WIDTH, Math.ceil(height));
  }
});

app.whenReady().then(() => {
  createWindow();

  bridge = new DetectorBridge();
  bridge.on('state', (evt) => machine.handleDetectorEvent(evt));
  bridge.on('connected', () => machine.handleConnected());
  bridge.on('disconnected', () => machine.handleDisconnected());

  console.log(`[ad-silencer] detector bridge listening on ws://127.0.0.1:${PORT}`);
});

app.on('window-all-closed', () => {
  if (bridge) bridge.close();
  app.quit();
});
