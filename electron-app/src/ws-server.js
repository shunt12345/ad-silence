const { WebSocketServer } = require('ws');
const { EventEmitter } = require('events');

const PORT = 8934;

// Local-only bridge between the browser extension (detector) and the
// widget (controller + UI). Emits:
//   'state'       -> { state: 'content'|'ad', videoTitle, channel, thumbnailUrl }
//   'connected'   -> extension attached
//   'disconnected'-> extension detached (or never connected)
class DetectorBridge extends EventEmitter {
  constructor() {
    super();
    this.sockets = new Set();
    this.wss = new WebSocketServer({ host: '127.0.0.1', port: PORT });

    this.wss.on('connection', (socket) => {
      this.sockets.add(socket);
      this.emit('connected');

      socket.on('message', (raw) => {
        let msg;
        try {
          msg = JSON.parse(raw.toString());
        } catch {
          return;
        }
        if (msg && (msg.state === 'ad' || msg.state === 'content')) {
          this.emit('state', {
            state: msg.state,
            videoTitle: typeof msg.videoTitle === 'string' ? msg.videoTitle : '',
            channel: typeof msg.channel === 'string' ? msg.channel : '',
            thumbnailUrl: typeof msg.thumbnailUrl === 'string' ? msg.thumbnailUrl : '',
          });
        }
      });

      socket.on('close', () => {
        this.sockets.delete(socket);
        if (this.sockets.size === 0) this.emit('disconnected');
      });

      socket.on('error', () => {
        this.sockets.delete(socket);
        if (this.sockets.size === 0) this.emit('disconnected');
      });
    });
  }

  get isConnected() {
    return this.sockets.size > 0;
  }

  close() {
    this.wss.close();
  }
}

module.exports = { DetectorBridge, PORT };
