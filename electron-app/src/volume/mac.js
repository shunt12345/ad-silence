const { execFile } = require('child_process');

function run(script) {
  return new Promise((resolve, reject) => {
    execFile('osascript', ['-e', script], (err, stdout, stderr) => {
      if (err) reject(err instanceof Error ? new Error(`${err.message}: ${stderr}`) : err);
      else resolve(stdout.trim());
    });
  });
}

async function setMuted(muted) {
  await run(`set volume output muted ${muted ? 'true' : 'false'}`);
}

async function isMuted() {
  const out = await run('output muted of (get volume settings)');
  return out === 'true';
}

module.exports = { setMuted, isMuted };
