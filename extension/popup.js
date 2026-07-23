const DEFAULT_DUCK_PERCENT = 10;

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const picker = document.getElementById('picker');
const buttons = Array.from(picker.querySelectorAll('button'));

function renderDuckPercent(percent) {
  buttons.forEach((btn) => {
    btn.classList.toggle('is-active', Number(btn.dataset.percent) === percent);
  });
}

function renderStatus(state) {
  const isAd = state && state.state === 'ad';
  statusDot.classList.toggle('is-ad', isAd);
  if (!state || (!state.videoTitle && !isAd)) {
    statusText.textContent = 'Not watching YouTube';
  } else if (isAd) {
    statusText.textContent = 'Ad playing — volume lowered';
  } else {
    statusText.textContent = state.videoTitle || 'Watching — volume normal';
  }
}

buttons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const percent = Number(btn.dataset.percent);
    chrome.storage.sync.set({ duckPercent: percent });
    renderDuckPercent(percent);
  });
});

chrome.storage.sync.get({ duckPercent: DEFAULT_DUCK_PERCENT }, (items) => {
  renderDuckPercent(items.duckPercent);
});

chrome.runtime.sendMessage({ type: 'popup:get-active-state' }, (state) => {
  renderStatus(state);
});
