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
- **Windows:** drives the real Core Audio `IAudioEndpointVolume` interface
  (`GetMute`/`SetMute`) via a small C# shim compiled on the fly with
  PowerShell's `Add-Type` — no compiled native addon or extra module
  required, and state is queried rather than assumed. Falls back to
  toggling the hardware mute virtual key (tracked internally) if the COM
  interop fails for any reason.

If the extension isn't connected, the widget shows a "PAUSED"/offline
state and does **not** auto-mute — matching the handoff's requirement not
to mute blindly without a live detector.

If more than one YouTube tab is open, each tab's audio is muted
independently the instant its own ad starts, but the widget's UI always
reflects whichever tab is currently active/focused — the extension tracks
per-tab state and switches what it reports to the widget on tab/window
focus changes.

## Testing the mute/restore behavior

The ad→mute→content→restore state machine (`electron-app/src/state-machine.js`)
is Electron-free on purpose, so it can be exercised headlessly without a GUI
or a real YouTube tab:

```
cd electron-app
npm install
npm test
```

`test/state-machine.test.js` drives it directly — simulated ad-start/
content-resume/disconnect events — and asserts on the resulting mute calls:
ads mute, content resuming restores audio, rapid flicker near an ad
boundary only commits once (the debounce), manual mute is inert during an
ad, and disconnecting from the detector always restores audio rather than
leaving it muted. This is the same logic `main.js` wires up to the real
window and OS volume calls; the test just swaps those two for spies.

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

## Building an installable app

```
cd electron-app
npm install
npm run dist:mac    # or dist:win / dist:linux / dist (host platform)
```

Uses [electron-builder](https://www.electron.build/) with the config in
`electron-app/package.json`, producing a `.dmg` (mac), NSIS installer
(Windows), or `.AppImage` (Linux) in `electron-app/dist/`, using
`electron-app/build/icon.png` as the source app icon.

## CI

`.github/workflows/ci.yml` runs on every push/PR: syntax-checks all JS in
`electron-app/` and `extension/`, validates the JSON manifests, installs
dependencies, and does an unpacked `electron-builder` smoke build to catch
packaging regressions.

## Project layout

```
electron-app/
  main.js                   window creation, IPC, state machine, debounce
  preload.js                contextBridge API exposed to the renderer
  build/icon.png             source app icon for electron-builder
  src/ws-server.js          local WebSocket server (the detector bridge)
  src/volume/               per-OS mute/unmute (mac.js, linux.js, windows.js)
  src/renderer/             the widget UI (index.html, styles.css, renderer.js)
extension/
  manifest.json
  content.js                YouTube player DOM watcher
  background.js             WebSocket client + per-tab state + tab mute
  popup.html                minimal status popup
design/                     original design handoff (reference only)
.github/workflows/ci.yml    syntax/manifest checks + packaging smoke test
```

## Notes / follow-ups

- Manifest V3 service workers are ephemeral; `background.js` reconnects on
  every incoming content-script message and on a 1-minute keep-alive
  alarm, so brief worker naps don't lose the connection for long, but a
  fully native-messaging-host bridge would be more robust than a raw
  WebSocket if this ships broadly.
- The Windows Core Audio interop is implemented per the standard
  `IMMDeviceEnumerator` → `IMMDevice` → `IAudioEndpointVolume` COM pattern
  but hasn't been exercised on real Windows hardware in this environment;
  it has an automatic fallback if `Add-Type`/COM activation fails for any
  reason (locked-down execution policy, missing .NET, etc.).
- Per-tab state in `background.js` lives in memory, so an idle service
  worker restart forgets it until each tab's content script next reports —
  usually within moments of the tab regaining focus.
- System audio fingerprinting (the doc's fallback detection strategy) is
  not implemented — the extension-based detector is the only path, per the
  handoff's own recommendation.
