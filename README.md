# AD Silencer

An always-on-top desktop widget that watches what's playing on YouTube and
automatically **lowers the volume** the moment an ad starts — to a quiet
5%/10%/15% you choose, not silence — then restores your exact prior volume
the instant your video resumes. It also offers a manual full-mute/resume
override for normal playback.

This is intentionally a *reduction*, not a block: the ad still plays,
still loads, still counts as a real impression — the only thing that
changes is how loud it is while it's on screen. That's a smaller, more
honest intervention than an ad blocker, and it's meant to read that way.

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
  `electron-app/src/renderer/`), plus a 5%/10%/15% "Ad volume" picker.
  Its main process runs the WebSocket server, debounces incoming
  ad/content transitions (~400ms) so state doesn't flicker at ad
  boundaries, tracks manual-mute overrides, and drives real OS-level
  system volume (`electron-app/src/volume/`).

Volume is controlled as a real 0–100 level on every platform (not just a
mute flag), so an ad ducks to your chosen quiet percentage and a manual
mute goes fully to 0 — either way, the exact level from just before the
reduction is remembered and restored, never hardcoded to 100:
- **macOS:** `osascript -e 'set volume output volume N'`
- **Linux:** `pactl set-sink-volume @DEFAULT_SINK@ N%` (PulseAudio/PipeWire)
- **Windows:** drives the real Core Audio `IAudioEndpointVolume` interface
  (`Get`/`SetMasterVolumeLevelScalar`) via a small C# shim compiled on the
  fly with PowerShell's `Add-Type` — no compiled native addon or extra
  module required, and the level is queried rather than assumed. Falls
  back to the hardware mute virtual key (which can only approximate duck
  as fully muted/unmuted, not a precise percentage) if the COM interop
  fails for any reason.

The duck percentage is changeable live from the widget and persists
across restarts (`electron-app/src/settings.js`, a small JSON file in the
app's user-data directory).

If the extension isn't connected, the widget shows a "PAUSED"/offline
state and does **not** auto-duck — matching the handoff's requirement not
to touch volume blindly without a live detector.

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
content-resume/disconnect events, duck-level changes — and asserts on the
resulting volume calls: ads duck to the chosen percent (not to zero) while
remembering the exact prior level, content resuming restores that exact
level, rapid flicker near an ad boundary only commits once (the
debounce), manual mute is inert during an ad, changing the duck level
mid-ad applies live, and disconnecting from the detector always restores
audio rather than leaving it reduced. This is the same logic `main.js`
wires up to the real window and OS volume calls; the test just swaps
those two for spies.

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
  src/settings.js           persists the chosen duck percentage
  src/volume/               per-OS 0-100 volume level control (mac.js, linux.js, windows.js)
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
  reason (locked-down execution policy, missing .NET, etc.) — though the
  fallback can only approximate duck as fully muted/unmuted, since the
  hardware mute key has no concept of a specific percentage.
- Per-tab state in `background.js` lives in memory, so an idle service
  worker restart forgets it until each tab's content script next reports —
  usually within moments of the tab regaining focus.
- System audio fingerprinting (the doc's fallback detection strategy) is
  not implemented — the extension-based detector is the only path, per the
  handoff's own recommendation.
