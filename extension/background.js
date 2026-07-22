// Bridges YouTube ad-state events from content scripts to the AD Silencer
// desktop widget's local WebSocket server, and mutes/unmutes each YouTube
// tab directly (the "mute only the YouTube tab" preference from the
// handoff doc) for immediate feedback even before the widget reacts.

const SOCKET_URL = 'ws://127.0.0.1:8934';
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 15000;

let socket = null;
let reconnectDelay = RECONNECT_BASE_MS;
let reconnectTimer = null;

function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  socket = new WebSocket(SOCKET_URL);

  socket.addEventListener('open', () => {
    reconnectDelay = RECONNECT_BASE_MS;
  });

  socket.addEventListener('close', scheduleReconnect);
  socket.addEventListener('error', () => socket && socket.close());
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(() => {
    reconnectDelay = Math.min(reconnectDelay * 1.6, RECONNECT_MAX_MS);
    connect();
  }, reconnectDelay);
}

function send(payload) {
  connect();
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(payload));
    return true;
  }
  return false;
}

// The widget shows one status; if several YouTube tabs are open at once we
// only want the one the user is actually looking at to drive it. Each
// tab's own state is still tracked (and each tab's audio still gets muted
// independently the moment its own ad starts) but only the active tab's
// state is forwarded to the widget.
const tabStates = new Map(); // tabId -> { state, videoTitle, channel, thumbnailUrl }
let activeTabId = null;

const NEUTRAL_STATE = { state: 'content', videoTitle: '', channel: '', thumbnailUrl: '' };

function forwardActiveState() {
  send(tabStates.get(activeTabId) || NEUTRAL_STATE);
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.type !== 'state' || !sender.tab || typeof sender.tab.id !== 'number') return;

  const tabId = sender.tab.id;
  tabStates.set(tabId, {
    state: message.state,
    videoTitle: message.videoTitle,
    channel: message.channel,
    thumbnailUrl: message.thumbnailUrl,
  });

  chrome.tabs.update(tabId, { muted: message.state === 'ad' }).catch(() => {});

  if (tabId === activeTabId) forwardActiveState();
});

function forgetTab(tabId) {
  if (!tabStates.has(tabId)) return;
  tabStates.delete(tabId);
  if (tabId === activeTabId) forwardActiveState();
}

chrome.tabs.onRemoved.addListener((tabId) => forgetTab(tabId));

// A page navigation/reload invalidates whatever ad/content state we had
// for that tab until the content script reports fresh state.
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') forgetTab(tabId);
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  activeTabId = tabId;
  forwardActiveState();
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) return;
  chrome.tabs.query({ active: true, windowId }, (tabs) => {
    if (tabs[0]) {
      activeTabId = tabs[0].id;
      forwardActiveState();
    }
  });
});

chrome.tabs.query({ active: true, lastFocusedWindow: true }, (tabs) => {
  if (tabs[0]) activeTabId = tabs[0].id;
});

// Service workers can be killed when idle; a keep-alive alarm nudges this
// worker awake periodically so the socket reconnects promptly rather than
// waiting for the next YouTube DOM mutation.
chrome.alarms.create('ad-silencer-keepalive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'ad-silencer-keepalive') connect();
});

connect();
