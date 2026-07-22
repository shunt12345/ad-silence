# Handoff: AD Silencer — YouTube Ad Auto-Mute Desktop Widget

## Overview
A small always-on-top **desktop widget** that watches what's playing on YouTube and automatically mutes the system (or the browser tab) the moment an ad starts, then restores the volume the instant the real video resumes. It also offers a manual mute/resume override for normal playback.

## About the Design Files
The file in this bundle — `AD Silencer.dc.html` — is a **design reference created in HTML**. It is a prototype that demonstrates the intended look, layout, states, and micro-interactions of the widget. **It is not production code and it does not actually detect ads or control your computer's volume** — the ad/show cycle in the prototype is a simulated timeline on a loop so you can see how each state looks.

Your task is to **recreate this design in a real desktop application** and wire up the actual functionality described below. There is no existing codebase yet, so you'll choose the framework (recommendation in the Architecture section). Do not ship the HTML as-is.

## Screenshots
Reference renders of the two primary states (in `screenshots/`):
- `state-content-playing.png` — normal monitoring state (green, 100%, "Your show is playing").
- `state-ad-muted.png` — ad detected state (red, MUTED, "Ad silenced", equalizer frozen).

## Fidelity
**High-fidelity (hifi).** The prototype has final colors, typography, spacing, and interaction states. Recreate the UI to match it closely, then implement the real detection + volume logic.

---

## Architecture & Real-World Implementation

The prototype fakes two things that are the actual hard part of this product. Here's how to build them for real.

### Recommended stack
- **Electron** (Chromium + Node) for the always-on-top frameless widget window. Cross-platform, gives you a real HTML/CSS/JS UI (so the prototype markup transfers almost directly), plus Node access for system-level volume control.
  - Window config: `frame: false`, `alwaysOnTop: true`, `transparent: true` (for the rounded frosted corners), `resizable: false`, `skipTaskbar: true`. Make the title bar draggable with `-webkit-app-region: drag` and mark buttons `no-drag`.
- Alternatives: **Tauri** (Rust core, smaller footprint) or a native menu-bar/tray app (SwiftUI on macOS, WinUI on Windows) if you want it truly OS-native. The UI recreation would differ but the two subsystems below are the same.

### Subsystem 1 — Ad detection (the critical piece)
There is **no public YouTube API that says "an ad is playing."** Choose one of these detection strategies:

1. **Browser extension bridge (most reliable).** Ship a companion browser extension (Chrome/Firefox) that runs a content script on `youtube.com`. YouTube's player DOM exposes ad state directly:
   - The player element gets the class `ad-showing` / `ad-interrupting` on `.html5-video-player` while an ad plays.
   - `.ytp-ad-player-overlay`, `.ad-showing`, and the "Skip" button (`.ytp-skip-ad-button`) appear during ads.
   - The content script watches these via a `MutationObserver` and sends `{state: "ad" | "content"}` messages to the desktop widget over a local WebSocket / native-messaging host.
   - This is the recommended path — it's accurate and event-driven.

2. **System audio fingerprinting (no extension).** Capture the system/loopback audio and detect ad boundaries heuristically (sudden loudness jumps, known jingle fingerprints, silence gaps). Far less reliable and higher effort; treat as a fallback only.

3. **Accessibility / screen reading.** Read the YouTube UI via OS accessibility APIs to spot the ad badge. Brittle across layouts; not recommended.

**Go with strategy 1.** The desktop widget is the UI + volume controller; the extension is the detector.

### Subsystem 2 — Volume control
On an ad event, mute; on a content event (or manual resume), restore to the previous level.
- **macOS:** shell out to `osascript -e 'set volume ...'`, or use a native module. Remember and restore the prior volume rather than hardcoding 100%.
- **Windows:** control the app/system volume via the Core Audio API (`ISimpleAudioVolume` / `IAudioEndpointVolume`), e.g. through a small native addon or a helper like `nircmd`.
- **Linux:** `pactl set-sink-mute` / `set-sink-volume` (PulseAudio/PipeWire).
- **Preferred nuance:** if using the extension path, you can mute *only the YouTube tab* (`chrome.tabs.update({muted:true})`) instead of the whole system — cleaner UX. Offer both.

### Debounce / hysteresis
Ads can fl/ flicker state near boundaries. Debounce transitions (~300–500ms) so volume doesn't stutter, and always restore to the user's remembered pre-mute level.

---

## Screens / Views

There is **one view** — the widget itself — that changes appearance based on state.

### Widget window
- **Purpose:** Show current status at a glance and let the user manually mute/resume.
- **Layout:** A single vertical panel, **width 320px**, auto height. Stacked sections top-to-bottom:
  1. Title bar (draggable)
  2. Main state block (colored background, changes with state)
  3. Now-playing strip
  4. Volume bar
  5. Control button + footnote
- **Container:** `background: rgba(20,24,32,0.72)`, `backdrop-filter: blur(24px)`, `border-radius: 20px`, `border: 1px solid rgba(255,255,255,0.12)`, `box-shadow: 0 30px 70px -20px rgba(0,0,0,0.6)`, `overflow: hidden`. The prototype floats it on a wallpaper with a faux dock — **that background/dock is only stage dressing; do not build it.** The real deliverable is the panel, sitting transparently on the user's actual desktop.

#### Components

**1. Title bar** — `padding: 11px 14px`, bottom border `1px solid rgba(255,255,255,0.07)`, `cursor: grab` (make it the OS drag region).
- Logo mark: 22×22px, `border-radius: 6px`, `background: #ff2d2d`, containing a white play triangle.
- App name: "AD Silencer", `font-weight: 700`, `font-size: 12.5px`, color `#ffffff`.
- Status pill: `background: rgba(255,255,255,0.09)`, `border-radius: 999px`, `padding: 2px 7px`; a 6px green (`#22c55e`) dot that pulses (opacity 1↔0.35, 1.6s) + text "ACTIVE" in mono, 9.5px, `rgba(255,255,255,0.75)`. When detection is disconnected, show a red/grey dot and "PAUSED".
- Three 5px grey dots (`rgba(255,255,255,0.28)`) top-right as a menu affordance.

**2. Main state block** — `padding: 16px`. Background transitions over 600ms.
- **Content/normal state:** background `#12161e`.
- **Ad state:** background `#c81e1e`, plus a diagonal light "sweep" overlay animating across (`linear-gradient(100deg, transparent, rgba(255,255,255,0.14), transparent)`, translateX -100%→100%, 2.4s linear loop). Sweep only visible during ad.
- Top row: left = state tag (mono, 10px, `letter-spacing: 1.3px`) — "MONITORING AUDIO" normally / "AD DETECTED" during ad, colored `#8affc1` (normal) or `rgba(255,255,255,0.8)` (ad). Right = volume label (mono, 12px, 700) — "100%" or "MUTED", colored `#22c55e` (audible) / `#c81e1e` (muted).
- Title: 21px, 700, `#ffffff`, `letter-spacing: -0.5px`.
  - Normal: "Your show is playing"; if manually muted: "Muted by you".
  - Ad: "Ad silenced".
- Subtitle: 12px, `rgba(255,255,255,0.6)`, `line-height: 1.4`.
  - Normal: "Watching for the next ad break — nothing to do."
  - Manual mute: "Tap resume to bring the sound back."
  - Ad: "Volume dropped automatically. It'll restore the moment your video resumes."
- **Equalizer:** row of 20 bars, `height: 32px`, `gap: 3px`, `border-radius: 2px`, each `transform-origin: bottom`, animating `scaleY(0.25)↔1` (keyframe `eq`) with per-bar duration 0.70–1.42s and staggered delays. Bar color `#8affc1` when audible, `rgba(255,255,255,0.28)` when muted. **Animation is paused (`animation-play-state: paused`) whenever muted** (ad OR manual) — the frozen bars read as "no sound."

**3. Now-playing strip** — `padding: 12px 14px`, top border `1px solid rgba(255,255,255,0.07)`, flex row, `gap: 11px`.
- Thumbnail: 40×40px, `border-radius: 9px`, background `#e6f4ff` (content) / `#f3d3d3` (ad); contains an emoji placeholder (🎬 content / 📢 ad) — **replace with the real video thumbnail** pulled from the extension when available.
- Text block: label (9.5px uppercase, `rgba(255,255,255,0.45)`) "Now watching" / "Interrupting"; title (13px, 600, white, truncated) — real video title / "Sponsored advertisement"; channel line (11px, `rgba(255,255,255,0.5)`) — channel name / "Skippable in a few seconds".

**4. Volume bar** — `padding: 0 14px 12px`. Track: `height: 6px`, `background: rgba(255,255,255,0.1)`, `border-radius: 999px`. Fill: width = volume % (0% muted, 100% audible), color `#22c55e` audible / `#c81e1e` muted, transition `width 500ms, background 400ms`.

**5. Control button** — full width, `padding: 11px`, `border-radius: 12px`, 13px 600. Row of icon + label, `gap: 7px`.
- Normal (audible): background `#0d0f14`, white text, 🔊 "Mute now".
- Manual mute active: background `#22c55e`, white text, 🔈 "Resume sound".
- During ad: background `#f0e2e2`, text `#9a3838`, 🔈 "Auto-muting ad" — **disabled/non-interactive during ads** (the app owns volume then).
- Footnote below, centered, 10px, `rgba(255,255,255,0.4)`: normal "Running quietly in the background" / ad "Detected via audio pattern + YouTube ad markers".

> Note: emoji icons (🔊🔈🎬📢) are placeholders. Swap for a real icon set (e.g. Lucide/SF Symbols) in production.

---

## Interactions & Behavior
- **Automatic (core):** ad-start event → debounce → remember current volume → mute + switch UI to ad state. content-resume event → restore remembered volume + switch UI to normal state.
- **Manual mute button:** only interactive in the normal (non-ad) state. Toggles a user mute; label/color/volume reflect it. During an ad the button is inert.
- **Drag:** title bar moves the window (OS-level drag region).
- **Transitions:** state-block background 600ms ease; volume fill width 500ms ease; button/thumb background ~200–400ms. Status dot pulse 1.6s. Ad sweep 2.4s linear. Equalizer bars: keyframe `eq`, per-bar duration 0.7–1.42s, freeze when muted.
- **Loading/disconnected state:** if the detector (extension) isn't connected, show the status pill as "PAUSED" and a subtitle explaining detection is offline — do not auto-mute blindly.

## State Management
- `detectionState`: `"content" | "ad" | "disconnected"` — driven by the detector.
- `manualMute`: boolean — user override, only settable in content state.
- `savedVolume`: number — the level to restore to after an ad/manual mute.
- `muted` (derived): `detectionState === "ad" || manualMute`.
- Data source: WebSocket/native-messaging feed from the browser extension emitting `{state, videoTitle, channel, thumbnailUrl}`.

## Design Tokens
**Colors**
- Panel bg: `rgba(20,24,32,0.72)` (with `backdrop-filter: blur(24px)`)
- Panel border: `rgba(255,255,255,0.12)`; inner dividers `rgba(255,255,255,0.07)`
- State block normal: `#12161e` · ad: `#c81e1e`
- Accent green (audible / active): `#22c55e`; equalizer green `#8affc1`
- Red brand / muted: `#ff2d2d` (logo), `#c81e1e` (muted state)
- Button dark: `#0d0f14`; button ad bg `#f0e2e2` / text `#9a3838`
- Thumb bg: `#e6f4ff` (content) / `#f3d3d3` (ad)
- Text on dark: `#ffffff`, `rgba(255,255,255,0.6)`, `rgba(255,255,255,0.5)`, `rgba(255,255,255,0.45)`, `rgba(255,255,255,0.4)`

**Typography**
- UI: **Inter Tight** (400/500/600/700)
- Numeric / labels / tags: **IBM Plex Mono** (400/500/600)
- Sizes: title 21px · state tag 10px · body/subtitle 12px · now-title 13px · button 13px · volume label 12px · footnote 10px

**Radius:** panel 20px · state thumb 9px · logo 6px · button 12px · pills/bars 999px · eq bars 2px
**Shadow:** panel `0 30px 70px -20px rgba(0,0,0,0.6)`
**Widget width:** 320px

## Animations (keyframes)
- `eq`: `0%,100% { scaleY(0.25) } 50% { scaleY(1) }`
- `pulse`: `0%,100% { opacity:1 } 50% { opacity:0.35 }`
- `sweep`: `0% { translateX(-100%) } 100% { translateX(100%) }`

## Assets
No image assets — the logo is CSS (red rounded square + white play triangle), icons are emoji placeholders (replace with a real icon set). Video thumbnails should be fetched live from YouTube via the detector.

## Files
- `AD Silencer.dc.html` — the hifi HTML prototype of the widget (open in a browser to see all states cycle on a ~20s loop). This is a design reference, not shippable code.
