const { execFile } = require('child_process');

// Windows has no shell-native "set system mute to X" primitive without a
// native addon (Core Audio's ISimpleAudioVolume/IAudioEndpointVolume). To
// avoid requiring a compiled native module, we drive the same virtual-key
// the hardware mute key sends (VK_VOLUME_MUTE, 0xAD) via SendKeys, which
// toggles mute without touching the underlying volume level. Because it's
// a toggle, we track the state we last asked for ourselves so repeated
// calls with the same value are no-ops instead of flipping twice.
let lastKnownMuted = false;

function sendMuteKey() {
  return new Promise((resolve, reject) => {
    const script = "(New-Object -ComObject WScript.Shell).SendKeys([char]173)";
    execFile('powershell', ['-NoProfile', '-Command', script], (err, stdout, stderr) => {
      if (err) reject(err instanceof Error ? new Error(`${err.message}: ${stderr}`) : err);
      else resolve();
    });
  });
}

async function setMuted(muted) {
  if (muted === lastKnownMuted) return;
  await sendMuteKey();
  lastKnownMuted = muted;
}

async function isMuted() {
  return lastKnownMuted;
}

module.exports = { setMuted, isMuted };
