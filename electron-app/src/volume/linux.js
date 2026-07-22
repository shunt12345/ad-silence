const { execFile } = require('child_process');

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    execFile(cmd, args, (err, stdout, stderr) => {
      if (err) reject(err instanceof Error ? new Error(`${err.message}: ${stderr}`) : err);
      else resolve(stdout.trim());
    });
  });
}

async function setMuted(muted) {
  await run('pactl', ['set-sink-mute', '@DEFAULT_SINK@', muted ? '1' : '0']);
}

async function isMuted() {
  const out = await run('pactl', ['get-sink-mute', '@DEFAULT_SINK@']);
  return /yes/i.test(out);
}

module.exports = { setMuted, isMuted };
