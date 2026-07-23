const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const { ALLOWED_DUCK_PERCENTS } = require('./state-machine');

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
    if (ALLOWED_DUCK_PERCENTS.includes(raw.duckPercent)) {
      return { duckPercent: raw.duckPercent };
    }
  } catch {
    // No settings file yet, or it's invalid - fall through to defaults.
  }
  return { duckPercent: 10 };
}

function save(settings) {
  try {
    fs.mkdirSync(path.dirname(settingsPath()), { recursive: true });
    fs.writeFileSync(settingsPath(), JSON.stringify(settings, null, 2));
  } catch (err) {
    console.error('[ad-silencer] failed to save settings:', err.message);
  }
}

module.exports = { load, save };
