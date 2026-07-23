const { execFile } = require('child_process');

function run(script) {
  return new Promise((resolve, reject) => {
    execFile('osascript', ['-e', script], (err, stdout, stderr) => {
      if (err) reject(err instanceof Error ? new Error(`${err.message}: ${stderr}`) : err);
      else resolve(stdout.trim());
    });
  });
}

// Volume is a real 0-100 level (not a mute flag) so we can duck to a
// specific quiet percentage during ads, not just silence entirely.
async function getVolume() {
  const out = await run('output volume of (get volume settings)');
  return Number(out);
}

async function setVolume(percent) {
  const clamped = Math.max(0, Math.min(100, Math.round(percent)));
  await run(`set volume output volume ${clamped}`);
}

module.exports = { getVolume, setVolume };
