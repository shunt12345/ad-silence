// Headless test of the widget's real state machine — no Electron/GUI
// needed. Run with: node --test test/state-machine.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { WidgetStateMachine } = require('../src/state-machine');

function makeMachine(opts = {}) {
  const setVolumeCalls = [];
  let currentVolume = opts.startingVolume ?? 100;
  const machine = new WidgetStateMachine({
    debounceMs: 15,
    duckPercent: opts.duckPercent ?? 10,
    onGetVolume: async () => currentVolume,
    onSetVolume: async (percent) => {
      setVolumeCalls.push(percent);
      currentVolume = percent;
    },
    onStateChange: () => {},
  });
  return { machine, setVolumeCalls, getCurrentVolume: () => currentVolume };
}

test('starts disconnected and unmuted', () => {
  const { machine } = makeMachine();
  const state = machine.getState();
  assert.equal(state.detectionState, 'disconnected');
  assert.equal(state.reduced, false);
});

test('connecting moves to content, still audible, no volume call', async () => {
  const { machine, setVolumeCalls } = makeMachine();
  const state = await machine.handleConnected();
  assert.equal(state.detectionState, 'content');
  assert.equal(state.reduced, false);
  assert.deepEqual(setVolumeCalls, []);
});

test('an ad event ducks (not mutes) the volume to duckPercent, remembering the prior level', async () => {
  const { machine, setVolumeCalls } = makeMachine({ startingVolume: 63, duckPercent: 10 });
  await machine.handleConnected();

  const state = await machine.handleDetectorEvent({
    state: 'ad',
    videoTitle: 'Sponsored advertisement',
    channel: 'Skippable in a few seconds',
  });

  assert.equal(state.detectionState, 'ad');
  assert.equal(state.reduced, true, 'ad state must reduce volume');
  assert.equal(state.targetPercent, 10, 'volume must duck to duckPercent, not to zero');
  assert.deepEqual(setVolumeCalls, [10]);
  assert.equal(state.savedVolume, 63, 'the pre-ad level must be remembered exactly, not assumed to be 100');
  assert.equal(state.nowPlaying.videoTitle, 'Sponsored advertisement');
});

test('returning to content restores the exact remembered volume, not a hardcoded 100', async () => {
  const { machine, setVolumeCalls } = makeMachine({ startingVolume: 47 });
  await machine.handleConnected();
  await machine.handleDetectorEvent({ state: 'ad' });
  setVolumeCalls.length = 0;

  const state = await machine.handleDetectorEvent({
    state: 'content',
    videoTitle: 'The Deep Field — Episode 7',
    channel: 'Meridian Studios',
  });

  assert.equal(state.detectionState, 'content');
  assert.equal(state.reduced, false, 'volume must be restored once content resumes');
  assert.deepEqual(setVolumeCalls, [47]);
});

test('rapid flicker near an ad boundary only commits the final state once (debounce)', async () => {
  const { machine, setVolumeCalls } = makeMachine({ duckPercent: 15 });
  await machine.handleConnected();

  // Fire ad -> content -> ad within the debounce window; only the last
  // one should ever reach the volume controller.
  machine.handleDetectorEvent({ state: 'ad' });
  machine.handleDetectorEvent({ state: 'content' });
  const finalState = await machine.handleDetectorEvent({ state: 'ad' });

  assert.equal(finalState.detectionState, 'ad');
  assert.equal(finalState.targetPercent, 15);
  assert.deepEqual(setVolumeCalls, [15], 'debounce must collapse flicker into a single volume call');
});

test('manual mute goes to 0 (unlike ads) and restores the remembered level on resume', async () => {
  const { machine, setVolumeCalls } = makeMachine({ startingVolume: 80 });
  await machine.handleConnected();

  const muted = await machine.toggleManualMute();
  assert.equal(muted.manualMute, true);
  assert.equal(muted.reduced, true);
  assert.equal(muted.targetPercent, 0);

  const resumed = await machine.toggleManualMute();
  assert.equal(resumed.manualMute, false);
  assert.equal(resumed.reduced, false);

  assert.deepEqual(setVolumeCalls, [0, 80]);
});

test('manual mute button is inert during an ad', async () => {
  const { machine, setVolumeCalls } = makeMachine();
  await machine.handleConnected();
  await machine.handleDetectorEvent({ state: 'ad' });
  setVolumeCalls.length = 0;

  const state = await machine.toggleManualMute();

  assert.equal(state.manualMute, false, 'manual mute must not engage during an ad');
  assert.equal(state.reduced, true, 'still reduced, but because of the ad, not a manual toggle');
  assert.deepEqual(setVolumeCalls, [], 'toggling during an ad must not touch the volume controller');
});

test('disconnecting from the detector restores audio and never reduces blindly afterward', async () => {
  const { machine, setVolumeCalls } = makeMachine({ startingVolume: 55 });
  await machine.handleConnected();
  await machine.handleDetectorEvent({ state: 'ad' });
  setVolumeCalls.length = 0;

  const state = await machine.handleDisconnected();

  assert.equal(state.detectionState, 'disconnected');
  assert.equal(state.reduced, false);
  assert.deepEqual(setVolumeCalls, [55]);
});

test('a manual mute survives a disconnect (still reflected as reduced)', async () => {
  const { machine, setVolumeCalls } = makeMachine({ startingVolume: 90 });
  await machine.handleConnected();
  await machine.toggleManualMute();
  setVolumeCalls.length = 0;

  const state = await machine.handleDisconnected();

  assert.equal(state.detectionState, 'disconnected');
  assert.equal(state.manualMute, true);
  assert.equal(state.reduced, true, 'manual mute is independent of detection connectivity');
  assert.deepEqual(setVolumeCalls, []);
});

test('setDuckPercent rejects invalid values and ignores them', async () => {
  const { machine } = makeMachine({ duckPercent: 10 });
  const state = await machine.setDuckPercent(42);
  assert.equal(state.duckPercent, 10, 'an unsupported percent must be ignored');
});

test('changing the duck level mid-ad applies immediately, not just on the next ad', async () => {
  const { machine, setVolumeCalls } = makeMachine({ startingVolume: 70, duckPercent: 10 });
  await machine.handleConnected();
  await machine.handleDetectorEvent({ state: 'ad' });
  setVolumeCalls.length = 0;

  const state = await machine.setDuckPercent(5);

  assert.equal(state.duckPercent, 5);
  assert.equal(state.targetPercent, 5);
  assert.deepEqual(setVolumeCalls, [5], 'the new duck level must be applied live during the current ad');
});

test('changing the duck level outside an ad just updates the setting without touching volume', async () => {
  const { machine, setVolumeCalls } = makeMachine({ duckPercent: 10 });
  await machine.handleConnected();

  const state = await machine.setDuckPercent(15);

  assert.equal(state.duckPercent, 15);
  assert.deepEqual(setVolumeCalls, [], 'no ad is playing, so there is nothing to duck yet');
});
