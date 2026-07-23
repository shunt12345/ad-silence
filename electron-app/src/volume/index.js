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
      async getVolume() {
        return 100;
      },
      async setVolume() {
        throw new Error(`System volume control is not supported on platform "${process.platform}"`);
      },
    };
}

module.exports = impl;
