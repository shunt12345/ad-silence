const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const volume = require('./src/volume');
const { DetectorBridge, PORT } = require('./src/ws-server');

const DEBOUNCE_MS = 400;
const WIDGET_WIDTH = 320;

let win;
let bridge;
let debounceTimer = null;

// Single source of truth for widget state, mirrors README's "State Management".
const state = {
  detectionState: 'disconnected', // 'content' | 'ad' | 'disconnected'
  manualMute: false,
  nowPlaying: { videoTitle: '', channel: '', thumbnailUrl: '' },
};

function muted() {
  return state.detectionState === 'ad' || state.manualMute;
}

async function applySystemMute() {
  try {
    await volume.setMuted(muted());
  } catch (err) {
    console.error('[ad-silencer] volume control failed:', err.message);
  }
}

function pushState() {
  if (win && !win.isDestroyed()) {
    win.webContents.send('widget:state', { ...state, muted: muted() });
  }
}

function handleDetectorEvent(evt) {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(async () => {
    state.detectionState = evt.state;
    if (evt.state === 'ad') {
      // Ad takes over; a prior manual mute is superseded and resumed after.
      state.nowPlaying = {
        videoTitle: evt.videoTitle || 'Sponsored advertisement',
        channel: evt.channel || 'Skippable in a few seconds',
        thumbnailUrl: evt.thumbnailUrl || '',
      };
    } else {
      state.nowPlaying = {
        videoTitle: evt.videoTitle || '',
        channel: evt.channel || '',
        thumbnailUrl: evt.thumbnailUrl || '',
      };
    }
    await applySystemMute();
    pushState();
  }, DEBOUNCE_MS);
}

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
    pushState();
  });
}

ipcMain.handle('widget:get-state', () => ({ ...state, muted: muted() }));

ipcMain.handle('widget:toggle-manual-mute', async () => {
  if (state.detectionState === 'ad') return { ...state, muted: muted() }; // inert during ads
  state.manualMute = !state.manualMute;
  await applySystemMute();
  pushState();
  return { ...state, muted: muted() };
});

ipcMain.handle('widget:resize-content', (_evt, { height }) => {
  if (win && !win.isDestroyed() && typeof height === 'number') {
    win.setContentSize(WIDGET_WIDTH, Math.ceil(height));
  }
});

app.whenReady().then(() => {
  createWindow();

  bridge = new DetectorBridge();
  bridge.on('state', handleDetectorEvent);

  bridge.on('connected', () => {
    state.detectionState = 'content';
    pushState();
  });

  bridge.on('disconnected', async () => {
    clearTimeout(debounceTimer);
    state.detectionState = 'disconnected';
    await applySystemMute();
    pushState();
  });

  console.log(`[ad-silencer] detector bridge listening on ws://127.0.0.1:${PORT}`);
});

app.on('window-all-closed', () => {
  if (bridge) bridge.close();
  app.quit();
});
