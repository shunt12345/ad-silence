(() => {
  const panel = document.getElementById('panel');
  const statusPill = document.getElementById('statusPill');
  const statusText = document.getElementById('statusText');
  const stateBlock = document.getElementById('stateBlock');
  const stateTag = document.getElementById('stateTag');
  const volLabel = document.getElementById('volLabel');
  const stateTitle = document.getElementById('stateTitle');
  const stateSub = document.getElementById('stateSub');
  const equalizer = document.getElementById('equalizer');
  const thumb = document.getElementById('thumb');
  const thumbIcon = document.getElementById('thumbIcon');
  const nowLabel = document.getElementById('nowLabel');
  const nowTitle = document.getElementById('nowTitle');
  const nowChannel = document.getElementById('nowChannel');
  const volumeFill = document.getElementById('volumeFill');
  const duckPicker = document.getElementById('duckPicker');
  const controlButton = document.getElementById('controlButton');
  const btnIcon = document.getElementById('btnIcon');
  const btnLabel = document.getElementById('btnLabel');
  const footnote = document.getElementById('footnote');

  const BAR_COUNT = 20;
  const bars = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    const bar = document.createElement('div');
    bar.className = 'eq-bar';
    bar.style.animationDuration = `${(0.7 + (i % 5) * 0.18).toFixed(2)}s`;
    bar.style.animationDelay = `${((i % 7) * 0.11).toFixed(2)}s`;
    equalizer.appendChild(bar);
    bars.push(bar);
  }

  duckPicker.querySelectorAll('.duck-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      window.widgetAPI.setDuckPercent(Number(btn.dataset.percent));
    });
  });

  function render(state) {
    const { detectionState, manualMute, reduced, duckPercent, nowPlaying } = state;
    const isAd = detectionState === 'ad';
    const isDisconnected = detectionState === 'disconnected';

    // Title bar status pill
    statusPill.classList.toggle('is-offline', isDisconnected);
    statusText.textContent = isDisconnected ? 'PAUSED' : 'ACTIVE';

    // Main state block
    stateBlock.classList.toggle('is-ad', isAd);

    if (isDisconnected) {
      stateTag.textContent = 'DETECTION OFFLINE';
      stateTitle.textContent = 'Waiting for the extension';
      stateSub.textContent = 'Connect the AD Silencer browser extension to start lowering ad volume.';
    } else if (isAd) {
      stateTag.textContent = 'AD DETECTED';
      stateTitle.textContent = 'Ad volume lowered';
      stateSub.textContent = `Volume dropped to ${duckPercent}% automatically. It'll return to normal the moment your video resumes.`;
    } else if (manualMute) {
      stateTag.textContent = 'MONITORING AUDIO';
      stateTitle.textContent = 'Muted by you';
      stateSub.textContent = 'Tap resume to bring the sound back.';
    } else {
      stateTag.textContent = 'MONITORING AUDIO';
      stateTitle.textContent = 'Your show is playing';
      stateSub.textContent = 'Watching for the next ad break — nothing to do.';
    }

    volLabel.textContent = isDisconnected ? '—' : isAd ? `${duckPercent}%` : manualMute ? 'MUTED' : '100%';
    volLabel.classList.toggle('is-muted', reduced);

    bars.forEach((bar) => bar.classList.toggle('is-muted', reduced || isDisconnected));

    // Now playing strip
    thumb.classList.toggle('is-ad', isAd);
    if (nowPlaying.thumbnailUrl) {
      thumb.style.backgroundImage = `url("${nowPlaying.thumbnailUrl}")`;
      thumbIcon.style.display = 'none';
    } else {
      thumb.style.backgroundImage = '';
      thumbIcon.style.display = '';
      thumbIcon.textContent = isAd ? '📢' : '🎬';
    }
    nowLabel.textContent = isAd ? 'Interrupting' : 'Now watching';
    nowTitle.textContent = nowPlaying.videoTitle || (isDisconnected ? 'Nothing playing' : 'Waiting for playback…');
    nowChannel.textContent = nowPlaying.channel || '—';

    // Volume bar reflects the real target percent (duck level, 0 for
    // manual mute, or 100 when audible) rather than a binary on/off.
    volumeFill.classList.toggle('is-muted', reduced);
    volumeFill.style.width = `${isAd ? duckPercent : manualMute ? 0 : 100}%`;

    // Duck-level picker
    duckPicker.querySelectorAll('.duck-option').forEach((btn) => {
      btn.classList.toggle('is-active', Number(btn.dataset.percent) === duckPercent);
    });

    // Control button
    controlButton.classList.toggle('is-manual-mute', manualMute && !isAd);
    controlButton.classList.toggle('is-ad-disabled', isAd);
    if (isAd) {
      btnIcon.textContent = '🔈';
      btnLabel.textContent = 'Auto-lowering ad';
    } else if (manualMute) {
      btnIcon.textContent = '🔈';
      btnLabel.textContent = 'Resume sound';
    } else {
      btnIcon.textContent = '🔊';
      btnLabel.textContent = 'Mute now';
    }

    footnote.textContent = isAd
      ? 'Detected via audio pattern + YouTube ad markers'
      : isDisconnected
      ? 'Waiting for the browser extension to connect'
      : 'Running quietly in the background';
  }

  controlButton.addEventListener('click', () => {
    window.widgetAPI.toggleManualMute();
  });

  window.widgetAPI.onState(render);
  window.widgetAPI.getState().then(render);

  const resizeObserver = new ResizeObserver(() => {
    window.widgetAPI.reportContentHeight(panel.offsetHeight);
  });
  resizeObserver.observe(panel);
})();
