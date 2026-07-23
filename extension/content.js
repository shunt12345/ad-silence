// Watches YouTube's player DOM for the classes it adds while an ad is
// playing (`ad-showing` / `ad-interrupting` on `.html5-video-player`).
//
// Two things happen on every ad/content transition:
//  1. The extension ducks the actual <video> element's volume itself,
//     right here in the tab - no companion app required. This is the
//     standalone path: install just the extension and ads get quieter.
//  2. It also reports {state, videoTitle, channel, thumbnailUrl} to the
//     background service worker, which forwards it to the optional AD
//     Silencer desktop widget for people who also want the visual status
//     panel and system-wide (not just this-tab) volume control.

const AD_CLASSES = ['ad-showing', 'ad-interrupting'];
const DEFAULT_DUCK_PERCENT = 10;

let lastSentState = null;
let playerObserver = null;
let observedPlayer = null;

let duckPercent = DEFAULT_DUCK_PERCENT;
let isDucked = false;
let savedVideoVolume = null;

chrome.storage.sync.get({ duckPercent: DEFAULT_DUCK_PERCENT }, (items) => {
  duckPercent = items.duckPercent;
  if (isDucked) applyDuckVolume();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.duckPercent) {
    duckPercent = changes.duckPercent.newValue;
    if (isDucked) applyDuckVolume(); // live-apply, matching the desktop widget's behavior
  }
});

function getVideoId() {
  try {
    const url = new URL(location.href);
    return url.searchParams.get('v') || '';
  } catch {
    return '';
  }
}

function getVideoTitle() {
  const inPlayer = document.querySelector('.ytp-title-link');
  if (inPlayer && inPlayer.textContent.trim()) return inPlayer.textContent.trim();
  const watchTitle = document.querySelector('#title h1 yt-formatted-string, #title h1');
  if (watchTitle && watchTitle.textContent.trim()) return watchTitle.textContent.trim();
  return document.title.replace(/\s*-\s*YouTube$/, '').trim();
}

function getChannelName() {
  const owner = document.querySelector(
    '#owner ytd-channel-name #text, #upload-info ytd-channel-name #text, #channel-name a'
  );
  if (owner && owner.textContent.trim()) return owner.textContent.trim();
  return '';
}

function getThumbnailUrl() {
  const id = getVideoId();
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '';
}

function isAdShowing(player) {
  return AD_CLASSES.some((cls) => player.classList.contains(cls));
}

function applyDuckVolume() {
  const video = observedPlayer && observedPlayer.querySelector('video');
  if (video) video.volume = Math.max(0, Math.min(100, duckPercent)) / 100;
}

function restoreVolume() {
  const video = observedPlayer && observedPlayer.querySelector('video');
  if (video && savedVideoVolume !== null) video.volume = savedVideoVolume;
  savedVideoVolume = null;
}

function applyLocalDuck(isAd) {
  const video = observedPlayer && observedPlayer.querySelector('video');
  if (!video) return;

  if (isAd && !isDucked) {
    savedVideoVolume = video.volume;
    isDucked = true;
    applyDuckVolume();
  } else if (!isAd && isDucked) {
    isDucked = false;
    restoreVolume();
  }
}

function reportState(player) {
  const isAd = isAdShowing(player);
  applyLocalDuck(isAd);

  const state = isAd ? 'ad' : 'content';
  const payload = {
    type: 'state',
    state,
    videoTitle: getVideoTitle(),
    channel: getChannelName(),
    thumbnailUrl: getThumbnailUrl(),
  };
  const signature = `${state}|${payload.videoTitle}`;
  if (signature === lastSentState) return;
  lastSentState = signature;
  chrome.runtime.sendMessage(payload).catch(() => {});
}

function attachToPlayer(player) {
  if (observedPlayer === player) return;
  if (playerObserver) playerObserver.disconnect();
  observedPlayer = player;
  isDucked = false;
  savedVideoVolume = null;

  playerObserver = new MutationObserver(() => reportState(player));
  playerObserver.observe(player, { attributes: true, attributeFilter: ['class'] });
  reportState(player);
}

function findPlayerAndAttach() {
  const player = document.querySelector('.html5-video-player');
  if (player) attachToPlayer(player);
  return player;
}

// YouTube is a SPA; the player element can be replaced on navigation.
const bodyObserver = new MutationObserver(() => {
  findPlayerAndAttach();
});
bodyObserver.observe(document.documentElement, { childList: true, subtree: true });

document.addEventListener('yt-navigate-finish', () => {
  lastSentState = null;
  setTimeout(findPlayerAndAttach, 300);
});

findPlayerAndAttach();
