// Headless test of the widget's real state machine — no Electron/GUI
// needed. Run with: node --test test/state-machine.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { WidgetStateMachine } = require('../src/state-machine');

function makeMachine() {
  const muteCalls = [];
  const stateChanges = [];
  const machine = new WidgetStateMachine({
    debounceMs: 15,
    onMuteChange: (muted) => {
      muteCalls.push(muted);
    },
    onStateChange: (state) => {
      stateChanges.push(state);
    },
  });
  return { machine, muteCalls, stateChanges };
}

test('starts disconnected and unmuted', () => {
  const { machine } = makeMachine();
  const state = machine.getState();
  assert.equal(state.detectionState, 'disconnected');
  assert.equal(state.muted, false);
});

test('connecting moves to content, still audible, no mute call', async () => {
  const { machine, muteCalls } = makeMachine();
  const state = await machine.handleConnected();
  assert.equal(state.detectionState, 'content');
  assert.equal(state.muted, false);
  assert.deepEqual(muteCalls, []);
});

test('an ad event mutes the system after the debounce and records now-playing', async () => {
  const { machine, muteCalls } = makeMachine();
  await machine.handleConnected();

  const state = await machine.handleDetectorEvent({
    state: 'ad',
    videoTitle: 'Sponsored advertisement',
    channel: 'Skippable in a few seconds',
  });

  assert.equal(state.detectionState, 'ad');
  assert.equal(state.muted, true, 'ad state must mute (this is the silent-mute behavior)');
  assert.deepEqual(muteCalls, [true]);
  assert.equal(state.nowPlaying.videoTitle, 'Sponsored advertisement');
});

test('returning to content restores audio (unmute)', async () => {
  const { machine, muteCalls } = makeMachine();
  await machine.handleConnected();
  await machine.handleDetectorEvent({ state: 'ad' });
  muteCalls.length = 0;

  const state = await machine.handleDetectorEvent({
    state: 'content',
    videoTitle: 'The Deep Field — Episode 7',
    channel: 'Meridian Studios',
  });

  assert.equal(state.detectionState, 'content');
  assert.equal(state.muted, false, 'volume must be restored once content resumes');
  assert.deepEqual(muteCalls, [false]);
});

test('rapid flicker near an ad boundary only commits the final state once (debounce)', async () => {
  const { machine, muteCalls } = makeMachine();
  await machine.handleConnected();

  // Fire ad -> content -> ad within the debounce window; only the last
  // one should ever reach the volume controller.
  machine.handleDetectorEvent({ state: 'ad' });
  machine.handleDetectorEvent({ state: 'content' });
  const finalState = await machine.handleDetectorEvent({ state: 'ad' });

  assert.equal(finalState.detectionState, 'ad');
  assert.equal(finalState.muted, true);
  assert.deepEqual(muteCalls, [true], 'debounce must collapse flicker into a single mute call');
});

test('manual mute toggles audio in content state and is idempotent to volume calls', async () => {
  const { machine, muteCalls } = makeMachine();
  await machine.handleConnected();

  const muted = await machine.toggleManualMute();
  assert.equal(muted.manualMute, true);
  assert.equal(muted.muted, true);

  const resumed = await machine.toggleManualMute();
  assert.equal(resumed.manualMute, false);
  assert.equal(resumed.muted, false);

  assert.deepEqual(muteCalls, [true, false]);
});

test('manual mute button is inert during an ad', async () => {
  const { machine, muteCalls } = makeMachine();
  await machine.handleConnected();
  await machine.handleDetectorEvent({ state: 'ad' });
  muteCalls.length = 0;

  const state = await machine.toggleManualMute();

  assert.equal(state.manualMute, false, 'manual mute must not engage during an ad');
  assert.equal(state.muted, true, 'still muted, but because of the ad, not a manual toggle');
  assert.deepEqual(muteCalls, [], 'toggling during an ad must not touch the volume controller');
});

test('disconnecting from the detector restores audio and never mutes blindly afterward', async () => {
  const { machine, muteCalls } = makeMachine();
  await machine.handleConnected();
  await machine.handleDetectorEvent({ state: 'ad' });
  muteCalls.length = 0;

  const state = await machine.handleDisconnected();

  assert.equal(state.detectionState, 'disconnected');
  assert.equal(state.muted, false);
  assert.deepEqual(muteCalls, [false]);
});

test('a manual mute survives a disconnect (still reflected as muted)', async () => {
  const { machine, muteCalls } = makeMachine();
  await machine.handleConnected();
  await machine.toggleManualMute();
  muteCalls.length = 0;

  const state = await machine.handleDisconnected();

  assert.equal(state.detectionState, 'disconnected');
  assert.equal(state.manualMute, true);
  assert.equal(state.muted, true, 'manual mute is independent of detection connectivity');
  assert.deepEqual(muteCalls, [true]);
});
