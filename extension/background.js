// Bridges YouTube ad-state events from content scripts to the AD Silencer
// desktop widget's local WebSocket server, and mutes/unmutes the sending
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

chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.type !== 'state') return;

  send({
    state: message.state,
    videoTitle: message.videoTitle,
    channel: message.channel,
    thumbnailUrl: message.thumbnailUrl,
  });

  if (sender.tab && typeof sender.tab.id === 'number') {
    chrome.tabs.update(sender.tab.id, { muted: message.state === 'ad' }).catch(() => {});
  }
});

// Service workers can be killed when idle; a keep-alive alarm nudges this
// worker awake periodically so the socket reconnects promptly rather than
// waiting for the next YouTube DOM mutation.
chrome.alarms.create('ad-silencer-keepalive', { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'ad-silencer-keepalive') connect();
});

connect();
