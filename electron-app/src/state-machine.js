// The widget's state machine, kept free of Electron/DOM dependencies so it
// can be driven and tested headlessly (see test/state-machine.test.js).
// mirrors the "State Management" section of the design handoff:
//   detectionState: 'content' | 'ad' | 'disconnected'
//   manualMute: boolean, only settable outside 'ad'
//   muted (derived): detectionState === 'ad' || manualMute

class WidgetStateMachine {
  constructor({ debounceMs = 400, onMuteChange, onStateChange } = {}) {
    this.debounceMs = debounceMs;
    this.onMuteChange = onMuteChange || (() => {});
    this.onStateChange = onStateChange || (() => {});
    this.state = {
      detectionState: 'disconnected',
      manualMute: false,
      nowPlaying: { videoTitle: '', channel: '', thumbnailUrl: '' },
    };
    this._debounceTimer = null;
  }

  get muted() {
    return this.state.detectionState === 'ad' || this.state.manualMute;
  }

  getState() {
    return { ...this.state, muted: this.muted };
  }

  _emit() {
    this.onStateChange(this.getState());
  }

  async _applyMute() {
    await this.onMuteChange(this.muted);
  }

  // Debounced: ads can flicker state near boundaries, so we only commit
  // after `debounceMs` of stability. Returns a promise that resolves once
  // the (possibly superseded) commit has run, for test convenience.
  handleDetectorEvent(evt) {
    clearTimeout(this._debounceTimer);
    return new Promise((resolve) => {
      this._debounceTimer = setTimeout(async () => {
        this.state.detectionState = evt.state;
        this.state.nowPlaying =
          evt.state === 'ad'
            ? {
                videoTitle: evt.videoTitle || 'Sponsored advertisement',
                channel: evt.channel || 'Skippable in a few seconds',
                thumbnailUrl: evt.thumbnailUrl || '',
              }
            : {
                videoTitle: evt.videoTitle || '',
                channel: evt.channel || '',
                thumbnailUrl: evt.thumbnailUrl || '',
              };
        await this._applyMute();
        this._emit();
        resolve(this.getState());
      }, this.debounceMs);
    });
  }

  async toggleManualMute() {
    if (this.state.detectionState === 'ad') return this.getState(); // inert during ads
    this.state.manualMute = !this.state.manualMute;
    await this._applyMute();
    this._emit();
    return this.getState();
  }

  async handleConnected() {
    this.state.detectionState = 'content';
    this._emit();
    return this.getState();
  }

  async handleDisconnected() {
    clearTimeout(this._debounceTimer);
    this.state.detectionState = 'disconnected';
    await this._applyMute();
    this._emit();
    return this.getState();
  }
}

module.exports = { WidgetStateMachine };
