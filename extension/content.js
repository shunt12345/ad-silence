// Watches YouTube's player DOM for the classes it adds while an ad is
// playing (`ad-showing` / `ad-interrupting` on `.html5-video-player`) and
// reports {state, videoTitle, channel, thumbnailUrl} to the background
// service worker, which forwards it to the AD Silencer desktop widget.

const AD_CLASSES = ['ad-showing', 'ad-interrupting'];
let lastSentState = null;
let playerObserver = null;
let observedPlayer = null;

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

function reportState(player) {
  const state = isAdShowing(player) ? 'ad' : 'content';
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
