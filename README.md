# AD Silencer

An always-on-top desktop widget that watches what's playing on YouTube and
automatically mutes the moment an ad starts, then restores volume the
instant your video resumes. It also offers a manual mute/resume override.

This repo implements the real product described in
[`design/design_handoff_ad_silencer_widget/README.md`](design/design_handoff_ad_silencer_widget/README.md)
(the original design handoff). The `.dc.html` file in that folder is a
static design reference only — it's not shippable code and isn't used by
the app. The two things it deliberately doesn't do — real ad detection and
real volume control — are implemented here.

## How it works

Two components, talking over a local WebSocket:

```
┌─────────────────────────┐        ws://127.0.0.1:8934        ┌───────────────────────────┐
│  extension/              │ ───────────────────────────────▶ │  electron-app/             │
│  Chrome content script    │  { state, videoTitle, channel,   │  Electron widget            │
│  watches the YouTube      │    thumbnailUrl }                │  - owns the UI              │
│  player DOM for ad state  │                                  │  - debounces transitions    │
│  + mutes/unmutes its tab  │                                  │  - drives system volume     │
└─────────────────────────┘                                    └───────────────────────────┘
```

- **`extension/`** — a Manifest V3 Chrome extension. A content script on
  `youtube.com` observes the player element for the `ad-showing` /
  `ad-interrupting` classes YouTube's own player adds (see
  `extension/content.js`). On every change it reports state plus the
  current video title/channel/thumbnail to a background service worker,
  which forwards it to the widget over a local WebSocket and also mutes/
  unmutes just that browser tab directly (`chrome.tabs.update`) for
  immediate feedback.
- **`electron-app/`** — a frameless, transparent, always-on-top widget
  window that recreates the design's UI pixel-for-pixel (colors,
  typography, spacing, equalizer, sweep animation, etc. — see
  `electron-app/src/renderer/`). Its main process runs the WebSocket
  server, debounces incoming ad/content transitions (~400ms) so state
  doesn't flicker at ad boundaries, tracks manual-mute overrides, and
  drives real OS-level system volume/mute (`electron-app/src/volume/`).

Muting is done via each OS's native "mute" primitive (not by zeroing and
guessing a volume level), so the user's actual volume level is always
preserved and restored automatically:
- **macOS:** `osascript -e 'set volume output muted …'`
- **Linux:** `pactl set-sink-mute @DEFAULT_SINK@ …` (PulseAudio/PipeWire)
- **Windows:** toggles the hardware mute virtual key via PowerShell
  `SendKeys`, tracked internally so repeat calls are idempotent. (There's
  no mute/unmute shell primitive on Windows without a native Core Audio
  addon; this avoids requiring a compiled dependency.)

If the extension isn't connected, the widget shows a "PAUSED"/offline
state and does **not** auto-mute — matching the handoff's requirement not
to mute blindly without a live detector.

## Running it

### 1. Widget app

```
cd electron-app
npm install
npm start
```

This opens the widget, pinned top-right, and starts listening for the
extension on `ws://127.0.0.1:8934`. Until the extension connects, it shows
the offline state.

### 2. Browser extension

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select the `extension/` folder.
3. Open a YouTube video. The widget should flip to "ACTIVE" and start
   reflecting whatever's playing, muting automatically whenever an ad
   plays.

## Project layout

```
electron-app/
  main.js                   window creation, IPC, state machine, debounce
  preload.js                contextBridge API exposed to the renderer
  src/ws-server.js          local WebSocket server (the detector bridge)
  src/volume/               per-OS mute/unmute (mac.js, linux.js, windows.js)
  src/renderer/             the widget UI (index.html, styles.css, renderer.js)
extension/
  manifest.json
  content.js                YouTube player DOM watcher
  background.js             WebSocket client + tab mute
  popup.html                minimal status popup
design/                     original design handoff (reference only)
```

## Notes / follow-ups

- Manifest V3 service workers are ephemeral; `background.js` reconnects on
  every incoming content-script message and on a 1-minute keep-alive
  alarm, so brief worker naps don't lose the connection for long, but a
  fully native-messaging-host bridge would be more robust than a raw
  WebSocket if this ships broadly.
- Windows volume control uses a mute-key toggle rather than the Core Audio
  API; swapping in a native `ISimpleAudioVolume` addon would remove the
  PowerShell dependency and make state queryable instead of assumed.
- System audio fingerprinting (the doc's fallback detection strategy) is
  not implemented — the extension-based detector is the only path, per the
  handoff's own recommendation.
