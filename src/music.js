export function setupMusic({ audio, toggle, volume, label, output, notify, schedule = setTimeout }) {
  let loading = false;
  let failed = false;
  let request = 0;
  audio.loop = true;
  audio.preload = 'metadata';
  audio.volume = Number(volume.value) / 100;
  toggle.removeAttribute('aria-disabled');
  volume.disabled = false;

  function update() {
    const playing = !audio.paused && !failed;
    label.textContent = failed ? 'Retry music' : loading ? 'Loading music' : playing ? (audio.volume === 0 ? 'Music muted' : 'Music on') : 'Music off';
    toggle.classList.toggle('playing', playing && !loading && audio.volume > 0);
    toggle.setAttribute('aria-label', failed ? 'Retry keyboard instrumental' : playing ? 'Pause keyboard instrumental' : 'Play keyboard instrumental');
    toggle.setAttribute('aria-pressed', String(playing));
    toggle.setAttribute('aria-busy', String(loading));
  }

  function play(showError = false) {
    const currentRequest = ++request;
    if (failed) { failed = false; audio.load(); }
    loading = audio.readyState < 3;
    update();
    // Call play synchronously inside the guest's click, with no HEAD request
    // or awaited download in front of it. Browsers can stream as it loads.
    return audio.play().then(() => {
      if (currentRequest !== request) return;
      loading = false;
      update();
    }).catch(error => {
      if (currentRequest !== request) return;
      loading = false;
      failed = error.name !== 'NotAllowedError' && error.name !== 'AbortError';
      update();
      if (showError) notify(failed ? 'Music could not load. Tap the music button to retry.' : 'Tap the music button again to start playback.');
    });
  }

  toggle.addEventListener('click', () => {
    if (!audio.paused && !failed) {
      request++;
      loading = false;
      audio.pause();
      update();
    } else { void play(true); }
  });
  volume.addEventListener('input', () => {
    audio.volume = Number(volume.value) / 100;
    volume.setAttribute('aria-valuetext', `${volume.value} percent`);
    output.textContent = `${volume.value}%`;
    update();
  });
  audio.addEventListener('playing', () => { loading = false; failed = false; update(); });
  audio.addEventListener('waiting', () => { if (!audio.paused) { loading = true; update(); } });
  audio.addEventListener('pause', () => { loading = false; update(); });
  audio.addEventListener('error', () => { failed = true; loading = false; update(); });
  audio.addEventListener('volumechange', update);
  update();
  function startAfter(delay) {
    // Unlock playback inside the envelope click, silently. Reveal the sound
    // at the same time as the page transition, starting from the beginning.
    audio.volume = 0;
    void play();
    schedule(() => {
      audio.currentTime = 0;
      audio.volume = Number(volume.value) / 100;
      update();
    }, delay);
  }
  return { play, startAfter };
}
