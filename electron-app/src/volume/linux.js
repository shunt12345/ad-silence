const { execFile } = require('child_process');

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (err) reject(err instanceof Error ? new Error(`${err.message}: ${stderr}`) : err);
      else resolve(stdout.trim());
    });
  });
}

// Volume is a real 0-100 level (not a mute flag) so we can duck to a
// specific quiet percentage during ads, not just silence entirely.
async function getVolume() {
  const out = await run('pactl', ['get-sink-volume', '@DEFAULT_SINK@']);
  const match = out.match(/(\d+)%/);
  return match ? Number(match[1]) : 100;
}

async function setVolume(percent) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  await run('pactl', ['set-sink-volume', '@DEFAULT_SINK@', `${clamped}%`]);
}

module.exports = { getVolume, setVolume };
