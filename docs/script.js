/**
 * Cinemorph hero demo: prompt → animation.
 *
 * Three prompt cycles. Each cycle is a 10-second beat:
 *   0.0 –  3.0 s  TYPING     terminal types the prompt char-by-char
 *   3.0 –  3.6 s  COMPOSING  the composer arrow flashes vermillion
 *   3.6 –  9.6 s  PLAYING    the canvas's matching output animates in
 *   9.6 – 10.0 s  HOLD       small pause before the next cycle
 *
 * The CSS reads two attributes off #demoShell: data-cycle and data-phase.
 * Per-cycle output animations key off these so each cycle's choreography
 * triggers automatically on phase change.
 */

(() => {
  const shell  = document.getElementById('demoShell');
  if (!shell) return;

  const promptEl = document.getElementById('terminalPrompt');
  const status   = document.getElementById('terminalStatus');
  const playBtn  = document.getElementById('filmPlay');
  const progress = document.getElementById('filmProgress')?.querySelector('span');
  const clock    = document.getElementById('filmClock');
  const cyclesBar = document.getElementById('filmCycles');

  // ---------------------------------------------------------- prompts
  // Token tags ({cmd}/{flag}/{str}) get colourised in the terminal.
  const PROMPTS = [
    [
      ['cmd', '/cinemorph new'],
      ['flag', ' --theme aperture --prompt'],
      ['str', '\n  "30 s cinematic launch film for our new product"']
    ],
    [
      ['cmd', '/cinemorph new'],
      ['flag', ' --from-example roadmap --prompt'],
      ['str', '\n  "Q1–Q4 product roadmap, four milestone tiles"']
    ],
    [
      ['cmd', '/cinemorph new'],
      ['flag', ' --theme stacklink-dark --prompt'],
      ['str', '\n  "5-slide investor pitch: hook, problem, solution, traction, ask"']
    ]
  ];

  // ---------------------------------------------------------- timing
  const TYPING_MS    = 3000;
  const COMPOSING_MS = 600;
  const PLAYING_MS   = 6000;
  const HOLD_MS      = 400;
  const CYCLE_MS     = TYPING_MS + COMPOSING_MS + PLAYING_MS + HOLD_MS; // 10000

  const TOTAL_MS = CYCLE_MS * PROMPTS.length;

  // ---------------------------------------------------------- state
  let elapsedMs = 0;
  let lastTickMs = null;
  let raf = null;
  let playing = true;
  let inView = true;
  let lastCycleIdx = -1;
  let lastPhase = null;

  // ---------------------------------------------------------- cycle buttons
  const cycleButtons = cyclesBar
    ? Array.from(cyclesBar.querySelectorAll('button'))
    : [];
  cycleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.cycle, 10);
      seekToCycle(idx);
    });
  });

  // ---------------------------------------------------------- render
  const fmt = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  // Render the typed-prompt fraction. tokens is the prompt array.
  // fraction is 0..1 across the typing window.
  const renderPrompt = (tokens, fraction) => {
    const flat = tokens.map(t => t[1]).join('');
    const total = flat.length;
    const visible = Math.round(total * fraction);
    let remaining = visible;
    const html = tokens.map(([kind, text]) => {
      if (remaining <= 0) return '';
      if (text.length <= remaining) {
        remaining -= text.length;
        return `<span class="tk-${kind}">${escape(text)}</span>`;
      }
      const slice = text.slice(0, remaining);
      remaining = 0;
      return `<span class="tk-${kind}">${escape(slice)}</span>`;
    }).join('');
    return html;
  };

  const escape = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Restart the per-output CSS animations by toggling .output—running.
  // We rely on changing data-phase to retrigger; here we ensure that going
  // from typing → playing actually re-runs the keyframes. The trick is to
  // briefly remove the data-phase attribute on the relevant output so the
  // next assignment retriggers animation. But a simpler approach: change
  // a key on the output container itself. We use a CSS variable instead:
  // bumping --run on the canvas is enough because animations key off the
  // ancestor selector containing data-phase.
  const restartAnimations = (cycleIdx) => {
    // find the relevant output and force a reflow trick to retrigger
    const tag = ['A', 'B', 'C'][cycleIdx];
    const output = shell.querySelector(`.output[data-output="${tag}"]`);
    if (!output) return;
    // toggle a class that has no rules so the animations re-trigger via
    // the change in data-phase. The reflow is the key part.
    output.classList.remove('--running');
    void output.offsetWidth; // force reflow
    output.classList.add('--running');
  };

  const setPhase = (cycleIdx, phase) => {
    if (lastCycleIdx !== cycleIdx) {
      shell.dataset.cycle = String(cycleIdx);
      cycleButtons.forEach((b, i) =>
        b.setAttribute('aria-current', i === cycleIdx ? 'true' : 'false')
      );
      lastCycleIdx = cycleIdx;
    }
    if (lastPhase !== phase) {
      shell.dataset.phase = phase;
      if (status) {
        status.textContent =
          phase === 'typing'    ? 'writing…' :
          phase === 'composing' ? 'composing →' :
          phase === 'playing'   ? 'rendering ▸' :
                                  'idle';
      }
      // when entering "playing", retrigger the output's CSS keyframes
      if (phase === 'playing') restartAnimations(cycleIdx);
      lastPhase = phase;
    }
  };

  const applyClock = () => {
    const cycleIdx = Math.floor(elapsedMs / CYCLE_MS) % PROMPTS.length;
    const within   = elapsedMs - cycleIdx * CYCLE_MS;

    let phase, fraction;
    if (within < TYPING_MS) {
      phase    = 'typing';
      fraction = within / TYPING_MS;
    } else if (within < TYPING_MS + COMPOSING_MS) {
      phase    = 'composing';
      fraction = 1;
    } else if (within < TYPING_MS + COMPOSING_MS + PLAYING_MS) {
      phase    = 'playing';
      fraction = 1;
    } else {
      phase    = 'hold';
      fraction = 1;
    }

    setPhase(cycleIdx, phase === 'hold' ? 'playing' : phase);
    if (promptEl) promptEl.innerHTML = renderPrompt(PROMPTS[cycleIdx], fraction);
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

  const seekToCycle = (i) => {
    const idx = ((i % PROMPTS.length) + PROMPTS.length) % PROMPTS.length;
    elapsedMs = idx * CYCLE_MS;
    // force phase recompute on next tick
    lastPhase = null;
    applyClock();
  };

  // play/pause
  playBtn?.addEventListener('click', () => setPlaying(!playing));

  // pause when scrolled off screen
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) inView = entry.isIntersecting;
    }, { threshold: 0.2 });
    io.observe(shell);
  }

  // pause when tab hidden
  document.addEventListener('visibilitychange', () => {
    inView = !document.hidden;
  });

  // keyboard nav
  document.addEventListener('keydown', (e) => {
    const within = shell.matches(':hover') || shell.contains(document.activeElement);
    if (!within && e.target !== document.body) return;
    if (e.key === ' ') { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowRight') {
      const cur = Math.floor(elapsedMs / CYCLE_MS);
      seekToCycle(cur + 1);
    } else if (e.key === 'ArrowLeft') {
      const cur = Math.floor(elapsedMs / CYCLE_MS);
      seekToCycle(cur - 1);
    } else if (e.key === 'r' || e.key === 'R') {
      seekToCycle(0);
    }
  });

  // start
  setPlaying(true);
  applyClock();
  raf = requestAnimationFrame(tick);

  // also update total clock text once
  const totalEl = document.querySelector('.film-clock em');
  if (totalEl) totalEl.textContent = ' / ' + fmt(TOTAL_MS).replace(':', ':');
})();
