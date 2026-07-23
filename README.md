# AD Silencer

A Chrome extension that watches what's playing on YouTube and
automatically **lowers the volume** the moment an ad starts — to a quiet
5%/10%/15% you choose, not silence — then restores your exact prior volume
the instant your video resumes. **The extension works entirely on its own**
— install it and that's the whole product. An optional always-on-top
desktop widget is also included for people who want a visual status panel
and system-wide (not just this-tab) volume control, plus a manual
full-mute/resume override, but it's not required.

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

The extension is fully self-contained; the desktop widget is an optional
add-on that talks to it over a local WebSocket:

```
┌─────────────────────────┐                                   ┌───────────────────────────┐
│  extension/              │        ws://127.0.0.1:8934        │  electron-app/ (optional)   │
│  content script watches   │ ───────────────────────────────▶ │  Electron widget            │
│  the YouTube player DOM   │  { state, videoTitle, channel,   │  - visual status panel      │
│  for ad state + directly  │    thumbnailUrl }                │  - system-wide volume       │
│  ducks the <video>        │                                  │  - manual full mute         │
│  element's own volume     │ ◀─── chrome.storage.sync ──────▶ │  (nothing above needs this) │
└─────────────────────────┘        (duckPercent setting)       └───────────────────────────┘
```

- **`extension/`** — a Manifest V3 Chrome extension, and the whole product
  on its own. A content script on `youtube.com` observes the player
  element for the `ad-showing`/`ad-interrupting` classes YouTube's own
  player adds (see `extension/content.js`), and on every ad/content
  transition it **directly sets the `<video>` element's `.volume`** to
  the chosen duck percentage (remembering and restoring the exact prior
  level) — right there in the tab, no companion app involved. The duck
  percentage (5/10/15%) is picked from the extension's popup and stored
  in `chrome.storage.sync`, so it's remembered across browser restarts
  and even syncs across your signed-in Chrome instances.

  The content script also reports state plus the current video
  title/channel/thumbnail to a background service worker, which mutes
  that tab directly (`chrome.tabs.update`) for an extra immediate cue,
  and forwards state over a local WebSocket to the optional desktop
  widget if one happens to be running.
- **`electron-app/` (optional)** — a frameless, transparent, always-on-top
  widget window that recreates the design's UI pixel-for-pixel (colors,
  typography, spacing, equalizer, sweep animation, etc. — see
  `electron-app/src/renderer/`), plus its own 5%/10%/15% "Ad volume"
  picker and a manual full-mute override. Its main process runs the
  WebSocket server, debounces incoming ad/content transitions (~400ms)
  so state doesn't flicker at ad boundaries, and drives real OS-level
  **system** volume (`electron-app/src/volume/`) — useful if you want
  ads ducked even when they're not the focused tab's own audio, or want
  the visual panel. Nothing the extension does on its own depends on
  this being installed or running.

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

### 1. Browser extension (this alone is the whole standalone product)

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select the `extension/` folder.
3. Open a YouTube video. Click the extension's toolbar icon to pick a
   duck level (5/10/15%) and see the current tab's status. Let an ad
   play — its volume should duck to your chosen level and restore the
   instant your video resumes. No desktop app needed for any of this.

### 2. Widget app (optional)

```
cd electron-app
npm install
npm start
```

This opens the widget, pinned top-right, and starts listening for the
extension on `ws://127.0.0.1:8934`. Until the extension connects, it shows
the offline state. Once it connects, it mirrors whichever YouTube tab is
active and additionally lets you duck the *system* volume and manually
full-mute, on top of what the extension already does on its own.

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
  content.js                YouTube player DOM watcher + standalone video-volume ducking
  background.js             per-tab state, tab mute, optional WebSocket bridge, popup queries
  popup.html / popup.js     duck-percent picker (5/10/15%) + current tab status
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
- The extension's local duck sets `video.volume` directly; if a user also
  rides YouTube's own volume slider mid-ad, the two can step on each
  other (last write wins). This mirrors the desktop widget's existing
  limitation of not locking out YouTube's own controls during an ad.
- `chrome.storage.sync` requires the user to be signed into Chrome to
  actually sync across devices; if not signed in, it just behaves like
  local storage on that one browser install.
