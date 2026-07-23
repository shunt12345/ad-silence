// The widget's state machine, kept free of Electron/DOM dependencies so it
// can be driven and tested headlessly (see test/state-machine.test.js).
// mirrors the "State Management" section of the design handoff:
//   detectionState: 'content' | 'ad' | 'disconnected'
//   manualMute: boolean, only settable outside 'ad'
//   duckPercent: 5 | 10 | 15 - how quiet (not silent) ads get ducked to
//
// Ads duck the volume to `duckPercent` (quieter, still audible) rather
// than fully muting; a manual mute still goes to 0. Either way the exact
// volume level from just before the reduction is remembered and restored
// once back to normal - not hardcoded to 100 - since the user's own level
// might not have been full volume to start with.

const ALLOWED_DUCK_PERCENTS = [5, 10, 15];

class WidgetStateMachine {
  constructor({ debounceMs = 400, duckPercent = 10, onGetVolume, onSetVolume, onStateChange } = {}) {
    this.debounceMs = debounceMs;
    this.onGetVolume = onGetVolume || (async () => 100);
    this.onSetVolume = onSetVolume || (async () => {});
    this.onStateChange = onStateChange || (() => {});
    this.state = {
      detectionState: 'disconnected',
      manualMute: false,
      duckPercent: ALLOWED_DUCK_PERCENTS.includes(duckPercent) ? duckPercent : 10,
      savedVolume: null,
      nowPlaying: { videoTitle: '', channel: '', thumbnailUrl: '' },
    };
    this._debounceTimer = null;
    this._lastAppliedTarget = null;
  }

  get reduced() {
    return this.state.detectionState === 'ad' || this.state.manualMute;
  }

  get targetPercent() {
    if (this.state.detectionState === 'ad') return this.state.duckPercent;
    if (this.state.manualMute) return 0;
    return this.state.savedVolume;
  }

  // Kept for compatibility with UI/tests that just want "is the volume
  // reduced right now" without caring by how much.
  get muted() {
    return this.reduced;
  }

  getState() {
    return { ...this.state, reduced: this.reduced, muted: this.muted, targetPercent: this.targetPercent };
  }

  _emit() {
    this.onStateChange(this.getState());
  }

  async _setVolumeIfChanged(target) {
    if (target === this._lastAppliedTarget) return;
    await this.onSetVolume(target);
    this._lastAppliedTarget = target;
  }

  async _applyVolume() {
    if (this.reduced) {
      if (this.state.savedVolume === null) {
        this.state.savedVolume = await this.onGetVolume();
      }
      const target = this.state.detectionState === 'ad' ? this.state.duckPercent : 0;
      await this._setVolumeIfChanged(target);
    } else if (this.state.savedVolume !== null) {
      await this._setVolumeIfChanged(this.state.savedVolume);
      this.state.savedVolume = null;
    }
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
        await this._applyVolume();
        this._emit();
        resolve(this.getState());
      }, this.debounceMs);
    });
  }

  async toggleManualMute() {
    if (this.state.detectionState === 'ad') return this.getState(); // inert during ads
    this.state.manualMute = !this.state.manualMute;
    await this._applyVolume();
    this._emit();
    return this.getState();
  }

  // Changing the duck level while an ad is already playing re-applies it
  // immediately, so the picker feels live rather than "next ad only".
  async setDuckPercent(percent) {
    if (!ALLOWED_DUCK_PERCENTS.includes(percent)) return this.getState();
    this.state.duckPercent = percent;
    if (this.state.detectionState === 'ad') {
      await this._setVolumeIfChanged(percent);
    }
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
    await this._applyVolume();
    this._emit();
    return this.getState();
  }
}

module.exports = { WidgetStateMachine, ALLOWED_DUCK_PERCENTS };
