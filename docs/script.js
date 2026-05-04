/**
 * Cinemorph hero — sixteen-cell, eight-stage morph cinematic.
 *
 * One canvas. Sixteen persistent cells. Each cell carries the same id all
 * the way through. JS computes per-stage style for every cell; CSS handles
 * only the transition curves. There is no per-element animation defined.
 *
 * GPU-accelerated layout: cells use a fixed 1cqw × 1cqh base size and
 * position+size purely through `transform: translate3d(x cqw, y cqh, 0)
 * scale(sx, sy)`. Animation runs on the compositor thread — left/top/
 * width/height never animate, so 60fps holds even on integrated GPUs.
 *
 * Stages:
 *   0  seed         — all cells stack at centre, tiny
 *   1  diaspora     — cells scatter, varied colours and shapes
 *   2  orbit        — three concentric rings around the wordmark
 *   3  pipeline     — single horizontal row, capsule-shaped
 *   4  grid         — 4×4 KPI grid
 *   5  cards        — four overlapping pitch cards (4 cells each)
 *   6  constellation — Cinemorph + logo formed from 5 cells, others scatter
 *   7  outro        — collapse to wordmark
 */

(() => {
  const canvas    = document.getElementById('canvas');
  const wsEl      = document.getElementById('ws');
  const capEl     = document.getElementById('cap');
  const stageNum  = document.getElementById('stageNum');
  const stageName = document.getElementById('stageName');
  const playBtn   = document.getElementById('filmPlay');
  const progress  = document.getElementById('filmProgress')?.querySelector('span');
  const clock     = document.getElementById('filmClock');
  const stagesBar = document.getElementById('filmStages');

  if (!canvas) return;

  const N = 16;
  const STAGE_COUNT = 8;
  const STAGE_MS = 3750;
  const SMEAR_MS = 320;
  const TOTAL_MS = STAGE_MS * STAGE_COUNT;

  // The canvas is 16:9. cqw and cqh refer to canvas-width-percent and
  // canvas-height-percent respectively. To make a cell visually square
  // when its base is 1cqw × 1cqh (which is NOT square — it's 16:9),
  // scaleY must be scaleX × (canvas-width / canvas-height) = scaleX × 16/9.
  const ASPECT = 16 / 9;

  // ---------------------------------------------------------- build cells
  const cells = [];
  for (let i = 0; i < N; i++) {
    const el = document.createElement('div');
    el.className = 'm';
    el.dataset.id = String(i + 1).padStart(2, '0');
    el.style.transitionDelay = `${(i % 6) * 0.025}s`;
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    lbl.textContent = el.dataset.id;
    el.appendChild(lbl);
    canvas.appendChild(el);
    cells.push(el);
  }

  // ---------------------------------------------------------- palette
  const COLORS = {
    inkSoft:    { bg: '#FAF7EE', bd: '#DCD3BD', tx: '#6B655C' },
    paperDeep:  { bg: '#ECE4CF', bd: '#DCD3BD', tx: '#6B655C' },
    vermillion: { bg: 'rgba(255,77,46,0.10)', bd: '#FF4D2E', tx: '#D03012' },
    vermSolid:  { bg: '#FF4D2E', bd: '#D03012', tx: '#FFFFFF' },
    chrome:     { bg: 'rgba(255,201,60,0.18)', bd: '#FFC93C', tx: '#7A5C00' },
    chromeSolid:{ bg: '#FFC93C', bd: '#E5B226', tx: '#3A2A00' },
    teal:       { bg: 'rgba(15,76,129,0.08)', bd: '#0F4C81', tx: '#0F4C81' },
    tealSolid:  { bg: '#0F4C81', bd: '#0F3D6A', tx: '#FFFFFF' },
    inkSolid:   { bg: '#14110D', bd: '#14110D', tx: '#FAF7EE' },
    glassDark:  { bg: 'rgba(20,17,13,0.85)', bd: 'rgba(255,255,255,0.10)', tx: '#FAF7EE' }
  };

  // Build a square-aspect scale pair (visually square cell of widthPct% canvas width).
  const sq = (widthPct) => ({ sx: widthPct, sy: widthPct * ASPECT });

  // Apply a per-cell spec by setting CSS variables. Only `--cx`/`--cy`/
  // `--csx`/`--csy`/`--cr` are transitioned — colours and shadow update
  // alongside but their cost is negligible.
  const apply = (el, s) => {
    el.style.setProperty('--cx',  `${s.x}cqw`);
    el.style.setProperty('--cy',  `${s.y}cqh`);
    el.style.setProperty('--csx', String(s.sx));
    el.style.setProperty('--csy', String(s.sy));
    el.style.setProperty('--cr',  `${s.rot || 0}deg`);
    el.style.setProperty('--cbg', s.bg);
    el.style.setProperty('--cbd', s.bd);
    el.style.setProperty('--ctx', s.tx);
    el.style.setProperty('--crd', s.rd);
    el.style.setProperty('--co',  String(s.op != null ? s.op : 1));
    el.style.setProperty('--clo', String(s.lo != null ? s.lo : 0));
    if (s.shadow) el.style.setProperty('--csh', s.shadow);
    else el.style.removeProperty('--csh');
    if (s.label != null) el.querySelector('.lbl').textContent = s.label;
  };

  // ---------------------------------------------------------- stages
  const STAGES = [
    // ============================================================ S0 SEED
    {
      name: 'seed',
      caption: 'one source.',
      ws: { x: 50, y: 50, opacity: 0, textSize: 'clamp(1rem, 2vw, 1.6rem)', scale: 0.8 },
      cell: (i) => {
        const ring = sq(0.55);
        return {
          x: 50 + Math.cos(i / N * Math.PI * 2) * 0.8,
          y: 50 + Math.sin(i / N * Math.PI * 2) * 1.4,
          ...ring,
          rd: '50%',
          bg: COLORS.inkSolid.bg, bd: COLORS.inkSolid.bd, tx: COLORS.inkSolid.tx,
          op: 0.5, lo: 0
        };
      }
    },

    // ============================================================ S1 DIASPORA
    {
      name: 'diaspora',
      caption: 'sixteen primitives.',
      ws: { x: 50, y: 50, opacity: 0, textSize: 'clamp(1rem, 2vw, 1.6rem)', scale: 0.8 },
      cell: (i) => {
        const ang = (i * 137.508) * Math.PI / 180;
        const r   = 12 + (i % 4) * 7;
        const palette = [COLORS.vermillion, COLORS.teal, COLORS.chrome, COLORS.paperDeep];
        const c = palette[i % 4];
        const widthPct = 1.3 + (i % 5) * 0.35;   // 1.3 → 2.7
        return {
          x: 50 + Math.cos(ang) * r,
          y: 50 + Math.sin(ang) * r * 1.3,
          ...sq(widthPct),
          // Radius is in pre-scale px so it scales with the cell. Keep
          // values small so the rendered roundness stays subtle.
          rd: i % 3 === 0 ? '50%' : `${1 + (i % 4) * 0.4}px`,
          bg: c.bg, bd: c.bd, tx: c.tx,
          rot: (i * 23) % 90 - 45,
          op: 1, lo: 0
        };
      }
    },

    // ============================================================ S2 ORBIT
    {
      name: 'orbit',
      caption: 'stage 01 · hook.',
      ws: { x: 50, y: 50, opacity: 1, textSize: 'clamp(2rem, 5.5vw, 4rem)', scale: 1 },
      cell: (i) => {
        let ring, idx, count;
        if (i < 5)       { ring = 0; idx = i;        count = 5; }
        else if (i < 11) { ring = 1; idx = i - 5;    count = 6; }
        else             { ring = 2; idx = i - 11;   count = 5; }
        const radius = [16, 28, 38][ring];
        const angOff = ring * 0.45;
        const ang    = idx / count * Math.PI * 2 + angOff - Math.PI / 2;
        const palette = [COLORS.vermillion, COLORS.chrome, COLORS.teal];
        const c = palette[ring];
        const widthPct = [2.0, 1.65, 1.3][ring];   // 22 / 18 / 14 px on 1100 canvas
        return {
          x: 50 + Math.cos(ang) * radius,
          y: 50 + Math.sin(ang) * radius * 1.0,    // y in cqh (already canvas-height-relative)
          ...sq(widthPct),
          rd: '50%',
          bg: c.bg, bd: c.bd, tx: c.tx,
          rot: 0, op: 1, lo: 0
        };
      }
    },

    // ============================================================ S3 PIPELINE
    {
      name: 'pipeline',
      caption: 'stage 02 · pipeline.',
      ws: { x: 14, y: 22, opacity: 1, textSize: 'clamp(0.85rem, 1.6vw, 1.15rem)', scale: 1 },
      cell: (i) => {
        const pct = i / (N - 1);
        const x = 6 + pct * 88;
        const isAnchor = i === 0 || i === N - 1;
        return {
          x, y: 56,
          sx: isAnchor ? 5    : 3.5,
          sy: isAnchor ? 24   : 14,
          // Anchor: pre-scale 1px → final ~5×24 px radius (subtle rounding).
          // Capsule: 999px stays huge after scale → reads as a pill (intent).
          rd: isAnchor ? '1px' : '999px',
          bg: isAnchor ? COLORS.vermSolid.bg : COLORS.inkSolid.bg,
          bd: isAnchor ? COLORS.vermSolid.bd : COLORS.inkSolid.bd,
          tx: COLORS.inkSolid.tx,
          rot: 0, op: 1, lo: 0
        };
      }
    },

    // ============================================================ S4 GRID
    {
      name: 'grid',
      caption: 'stage 03 · kpi grid.',
      ws: { x: 14, y: 22, opacity: 1, textSize: 'clamp(0.85rem, 1.6vw, 1.15rem)', scale: 1 },
      cell: (i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 16 + col * (68 / 3);
        const y = 32 + row * 16;
        const accent = (row + col) % 3 === 0;
        const c = accent ? COLORS.vermillion : COLORS.inkSoft;
        return {
          x, y,
          sx: 17, sy: 11,
          // Pre-scale 0.6px × scale = ~10×7 final px radius. Soft rect.
          rd: '0.6px',
          bg: c.bg, bd: c.bd, tx: c.tx,
          rot: 0, op: 1,
          shadow: accent ? '0 6px 18px -10px rgba(255,77,46,0.40)' : 'none',
          label: `${(i + 1) * 7}%`,
          lo: 1
        };
      }
    },

    // ============================================================ S5 CARDS
    {
      name: 'cards',
      caption: 'stage 04 · pitch deck.',
      ws: { x: 14, y: 22, opacity: 1, textSize: 'clamp(0.85rem, 1.6vw, 1.15rem)', scale: 1 },
      cell: (i) => {
        const cardIdx = Math.floor(i / 4);
        const inCard  = i % 4;
        const cardX   = 19 + cardIdx * 21;
        const cardY   = 56;
        const offset  = (inCard - 1.5);
        const palette = [COLORS.vermSolid, COLORS.chromeSolid, COLORS.tealSolid, COLORS.inkSolid];
        const c = inCard === 0 ? palette[cardIdx] : COLORS.inkSoft;
        return {
          x: cardX + offset * 0.6,
          y: cardY + offset * 1.5,
          sx: 17,
          sy: 36,
          // 0.7px pre-scale → ~12×25 final px. Reads as a card corner.
          rd: '0.7px',
          bg: c.bg, bd: c.bd, tx: c.tx,
          rot: cardIdx * 4 - 6 + offset * 1.2,
          op: inCard === 0 ? 1 : 0.4 - inCard * 0.05,
          shadow: inCard === 0 ? '0 14px 30px -14px rgba(20,17,13,0.30)' : 'none',
          label: inCard === 0 ? ['HOOK', 'PROBLEM', 'SOLUTION', 'ASK'][cardIdx] : '',
          lo: inCard === 0 ? 1 : 0
        };
      }
    },

    // ============================================================ S6 CONSTELLATION
    {
      name: 'constellation',
      caption: 'same engine. one source.',
      ws: { x: 50, y: 78, opacity: 1, textSize: 'clamp(1.2rem, 3vw, 2.2rem)', scale: 1 },
      cell: (i) => {
        const PLUS = [
          { x: 50, y: 30 },
          { x: 36, y: 44 },
          { x: 50, y: 44 },
          { x: 64, y: 44 },
          { x: 50, y: 58 }
        ];
        if (i < 5) {
          const p = PLUS[i];
          return {
            x: p.x, y: p.y,
            sx: 10, sy: 12,
            // 0.8px pre-scale → 8×10 final px. Square logo cell with
            // subtle rounding — reads cleanly as a + symbol element.
            rd: '0.8px',
            bg: COLORS.vermSolid.bg, bd: COLORS.vermSolid.bd, tx: COLORS.vermSolid.tx,
            rot: 0, op: 1,
            shadow: '0 0 40px rgba(255,77,46,0.45)',
            lo: 0
          };
        }
        const j = i - 5;
        const ang = j * 0.55;
        const r = 28 + (j % 3) * 6;
        return {
          x: 50 + Math.cos(ang) * r * 1.3,
          y: 44 + Math.sin(ang) * r,
          ...sq(0.55),
          rd: '50%',
          bg: 'rgba(255,255,255,0.4)',
          bd: 'rgba(255,255,255,0.15)',
          tx: 'transparent',
          op: 0.55,
          shadow: '0 0 8px rgba(255,255,255,0.25)',
          lo: 0
        };
      }
    },

    // ============================================================ S7 OUTRO
    {
      name: 'outro',
      caption: '<strong>Cinemorph.</strong> a Claude Code plugin.',
      ws: { x: 50, y: 44, opacity: 1, textSize: 'clamp(2rem, 6vw, 4.4rem)', scale: 1 },
      cell: (i) => {
        const ang = (i * 137.508) * Math.PI / 180;
        const r = 5 + (i % 3) * 2;
        return {
          x: 50 + Math.cos(ang) * r,
          y: 70 + Math.sin(ang) * r * 0.8,
          ...sq(0.45),
          rd: '50%',
          bg: COLORS.vermSolid.bg, bd: COLORS.vermSolid.bd, tx: 'transparent',
          op: 0.65,
          rot: 0, lo: 0
        };
      }
    }
  ];

  // ---------------------------------------------------------- stage buttons
  const stageButtons = [];
  if (stagesBar) {
    STAGES.forEach((s, idx) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = s.name;
      btn.setAttribute('aria-label', `Jump to stage ${idx + 1}: ${s.name}`);
      btn.addEventListener('click', () => seekToStage(idx));
      stagesBar.appendChild(btn);
      stageButtons.push(btn);
    });
  }

  // ---------------------------------------------------------- render
  const fmt = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    const m = String(Math.floor(total / 60)).padStart(2, '0');
    const s = String(total % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  let lastStageIdx = -1;
  let smearTimeout = null;

  const applyStage = (idx) => {
    const stage = STAGES[idx];
    if (!stage) return;

    canvas.dataset.stage = String(idx);
    if (stageNum)  stageNum.textContent  = String(idx + 1).padStart(2, '0');
    if (stageName) stageName.textContent = stage.name;
    stageButtons.forEach((b, i) =>
      b.setAttribute('aria-current', i === idx ? 'true' : 'false')
    );

    // Smear cut on the wordmark — single element, GPU-cheap.
    canvas.classList.add('--smearing');
    if (smearTimeout) clearTimeout(smearTimeout);
    smearTimeout = setTimeout(() => canvas.classList.remove('--smearing'), SMEAR_MS);

    cells.forEach((el, i) => apply(el, stage.cell(i)));

    const w = stage.ws;
    wsEl.style.setProperty('--wx', `${w.x}%`);
    wsEl.style.setProperty('--wy', `${w.y}%`);
    wsEl.style.setProperty('--wo', String(w.opacity));
    wsEl.style.setProperty('--ws-text', w.textSize);
    wsEl.style.setProperty('--ws-scale', String(w.scale || 1));

    if (capEl) capEl.innerHTML = stage.caption;
  };

  // ---------------------------------------------------------- clock
  let elapsedMs = 0;
  let lastTickMs = null;
  let raf = null;
  let playing = true;
  let inView = true;

  const applyClock = () => {
    const idx = Math.min(STAGE_COUNT - 1, Math.floor(elapsedMs / STAGE_MS));
    if (idx !== lastStageIdx) {
      applyStage(idx);
      lastStageIdx = idx;
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
      if (elapsedMs >= TOTAL_MS) elapsedMs = 0;
      applyClock();
    }
    raf = requestAnimationFrame(tick);
  };

  const setPlaying = (next) => {
    playing = next;
    if (playBtn) playBtn.dataset.playing = String(playing);
    if (playing) lastTickMs = null;
  };

  const seekToStage = (i) => {
    elapsedMs = ((i % STAGE_COUNT) + STAGE_COUNT) % STAGE_COUNT * STAGE_MS;
    lastStageIdx = -1;     // force re-apply on next tick
    applyClock();
  };

  playBtn?.addEventListener('click', () => setPlaying(!playing));
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) inView = entry.isIntersecting;
    }, { threshold: 0.2 });
    io.observe(canvas);
  }
  document.addEventListener('visibilitychange', () => { inView = !document.hidden; });
  document.addEventListener('keydown', (e) => {
    const within = canvas.matches(':hover') || canvas.contains(document.activeElement);
    if (!within && e.target !== document.body) return;
    if (e.key === ' ')               { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowRight') seekToStage(Math.floor(elapsedMs / STAGE_MS) + 1);
    else if (e.key === 'ArrowLeft')  seekToStage(Math.floor(elapsedMs / STAGE_MS) - 1);
    else if (e.key === 'r' || e.key === 'R') seekToStage(0);
  });

  setPlaying(true);
  applyStage(0);
  applyClock();
  raf = requestAnimationFrame(tick);

  const totalEl = document.querySelector('.film-clock em');
  if (totalEl) totalEl.textContent = ' / ' + fmt(TOTAL_MS);
})();
