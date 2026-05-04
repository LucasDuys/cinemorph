/**
 * 30-second cinematic state machine.
 * Mirrors cinemorph's RAF-clock pattern:
 *   - one master clock writes elapsedMs
 *   - phases are non-overlapping 4-second windows
 *   - the canvas's data-scene attribute drives layouts via CSS
 *   - scrubber reflects elapsedMs / TOTAL_MS
 *
 * The film auto-plays on load, pauses when off-screen, and supports
 * play/pause + per-scene jumping (mirrors the dev scrubber buttons).
 */

(() => {
  const frame = document.getElementById('filmFrame');
  if (!frame) return;

  const playBtn  = document.getElementById('filmPlay');
  const progress = document.getElementById('filmProgress')?.querySelector('span');
  const clock    = document.getElementById('filmClock');
  const scenesBar = document.getElementById('filmScenes');

  const SCENE_DUR_MS = 4000;
  const SCENE_COUNT  = 7;
  const TOTAL_MS     = SCENE_DUR_MS * SCENE_COUNT;

  let elapsedMs = 0;
  let lastTickMs = null;
  let raf = null;
  let playing = true;
  let inView = true;

  // build scene buttons (S0 … S6)
  const sceneButtons = [];
  if (scenesBar) {
    for (let i = 0; i < SCENE_COUNT; i++) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'S' + String(i + 1).padStart(2, '0');
      btn.setAttribute('aria-label', `Jump to scene ${i + 1}`);
      btn.addEventListener('click', () => seekToScene(i));
      scenesBar.appendChild(btn);
      sceneButtons.push(btn);
    }
  }

  const fmt = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const applyClock = () => {
    const sceneIdx = Math.min(SCENE_COUNT - 1, Math.floor(elapsedMs / SCENE_DUR_MS));
    if (frame.dataset.scene !== String(sceneIdx)) {
      frame.dataset.scene = String(sceneIdx);
      sceneButtons.forEach((b, i) => b.setAttribute('aria-current', i === sceneIdx ? 'true' : 'false'));
    }
    if (progress) progress.style.width = (Math.min(1, elapsedMs / TOTAL_MS) * 100).toFixed(2) + '%';
    if (clock) clock.textContent = fmt(elapsedMs);
  };

  const tick = (ts) => {
    if (lastTickMs == null) lastTickMs = ts;
    const dt = ts - lastTickMs;
    lastTickMs = ts;
    if (playing && inView) {
      elapsedMs += dt;
      if (elapsedMs >= TOTAL_MS) elapsedMs = 0; // loop
      applyClock();
    }
    raf = requestAnimationFrame(tick);
  };

  const setPlaying = (next) => {
    playing = next;
    if (playBtn) playBtn.dataset.playing = String(playing);
    if (playing) lastTickMs = null;
  };

  const seekToScene = (i) => {
    elapsedMs = i * SCENE_DUR_MS;
    applyClock();
  };

  // play/pause
  playBtn?.addEventListener('click', () => setPlaying(!playing));

  // pause when scrolled off screen
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) inView = entry.isIntersecting;
    }, { threshold: 0.25 });
    io.observe(frame);
  }

  // pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) inView = false;
    else inView = true;
  });

  // keyboard nav (arrows / space)
  document.addEventListener('keydown', (e) => {
    const within = frame.matches(':hover') || frame.contains(document.activeElement);
    if (!within && e.target !== document.body) return;
    if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowRight') {
      const cur = Math.floor(elapsedMs / SCENE_DUR_MS);
      seekToScene(Math.min(SCENE_COUNT - 1, cur + 1));
    } else if (e.key === 'ArrowLeft') {
      const cur = Math.floor(elapsedMs / SCENE_DUR_MS);
      seekToScene(Math.max(0, cur - 1));
    } else if (e.key === 'r' || e.key === 'R') {
      seekToScene(0);
    }
  });

  // start
  setPlaying(true);
  applyClock();
  raf = requestAnimationFrame(tick);
})();
