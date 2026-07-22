let impl;

switch (process.platform) {
  case 'darwin':
    impl = require('./mac');
    break;
  case 'linux':
    impl = require('./linux');
    break;
  case 'win32':
    impl = require('./windows');
    break;
  default:
    impl = {
      async setMuted() {
        throw new Error(`System volume control is not supported on platform "${process.platform}"`);
      },
      async isMuted() {
        return false;
      },
    };
}

module.exports = impl;
