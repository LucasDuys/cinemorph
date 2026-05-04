/**
 * Cinemorph hero — sixteen-cell, eight-stage morph cinematic.
 *
 * One canvas. Sixteen persistent cells. Each cell carries the same id all
 * the way through. JS computes per-stage style for every cell; CSS handles
 * only the transition curves. There is no per-element animation defined.
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

  const N = 16;                  // cells
  const STAGE_COUNT = 8;
  const STAGE_MS = 3750;         // 3.75s × 8 = 30s
  const SMEAR_MS = 320;          // brief blur at boundary
  const TOTAL_MS = STAGE_MS * STAGE_COUNT;

  // ---------------------------------------------------------- build cells
  const cells = [];
  for (let i = 0; i < N; i++) {
    const el = document.createElement('div');
    el.className = 'm';
    el.dataset.id = String(i + 1).padStart(2, '0');
    el.style.transitionDelay = `${(i % 6) * 0.025}s`;   // gentle stagger across the 16
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    lbl.textContent = el.dataset.id;
    el.appendChild(lbl);
    canvas.appendChild(el);
    cells.push(el);
  }

  // ---------------------------------------------------------- helpers
  const COLORS = {
    inkSoft:   { bg: '#FAF7EE', bd: '#DCD3BD', tx: '#6B655C' },
    paperDeep: { bg: '#ECE4CF', bd: '#DCD3BD', tx: '#6B655C' },
    vermillion:{ bg: 'rgba(255,77,46,0.10)', bd: '#FF4D2E', tx: '#D03012' },
    vermSolid: { bg: '#FF4D2E', bd: '#D03012', tx: '#FFFFFF' },
    chrome:    { bg: 'rgba(255,201,60,0.18)', bd: '#FFC93C', tx: '#7A5C00' },
    chromeSolid:{bg: '#FFC93C', bd: '#E5B226', tx: '#3A2A00' },
    teal:      { bg: 'rgba(15,76,129,0.08)', bd: '#0F4C81', tx: '#0F4C81' },
    tealSolid: { bg: '#0F4C81', bd: '#0F3D6A', tx: '#FFFFFF' },
    inkSolid:  { bg: '#14110D', bd: '#14110D', tx: '#FAF7EE' },
    glassDark: { bg: 'rgba(20,17,13,0.85)', bd: 'rgba(255,255,255,0.10)', tx: '#FAF7EE' }
  };

  // Shared utility — apply a per-cell spec by writing CSS variables.
  const apply = (el, s) => {
    el.style.setProperty('--cx', `${s.x}%`);
    el.style.setProperty('--cy', `${s.y}%`);
    el.style.setProperty('--cw', s.w);
    el.style.setProperty('--ch', s.h);
    el.style.setProperty('--cr', `${s.rot || 0}deg`);
    el.style.setProperty('--cs', String(s.scale || 1));
    el.style.setProperty('--cbg', s.bg);
    el.style.setProperty('--cbd', s.bd);
    el.style.setProperty('--ctx', s.tx);
    el.style.setProperty('--crd', s.rd);
    el.style.setProperty('--co', String(s.op != null ? s.op : 1));
    el.style.setProperty('--cf', s.font || 'clamp(7px, 0.7vw, 10px)');
    el.style.setProperty('--clo', String(s.labelOpacity != null ? s.labelOpacity : 0));
    if (s.shadow) el.style.setProperty('--csh', s.shadow);
    else el.style.removeProperty('--csh');
    if (s.label) el.querySelector('.lbl').textContent = s.label;
  };

  // ---------------------------------------------------------- stages
  // Each stage is a function (i) → spec for cell i.
  // Plus per-stage caption + wordmark spec.

  const STAGES = [
    // ============================================================ S0 SEED
    {
      name: 'seed',
      caption: 'one source.',
      ws: { x: 50, y: 50, opacity: 0, textSize: 'clamp(1rem, 2vw, 1.6rem)', scale: 0.8 },
      cell: (i) => ({
        x: 50 + Math.cos(i / N * Math.PI * 2) * 0.8,
        y: 50 + Math.sin(i / N * Math.PI * 2) * 0.6,
        w: '6px', h: '6px',
        rd: '50%',
        bg: COLORS.inkSolid.bg, bd: COLORS.inkSolid.bd, tx: COLORS.inkSolid.tx,
        op: 0.5,
        labelOpacity: 0
      })
    },

    // ============================================================ S1 DIASPORA
    {
      name: 'diaspora',
      caption: 'sixteen primitives.',
      ws: { x: 50, y: 50, opacity: 0, textSize: 'clamp(1rem, 2vw, 1.6rem)', scale: 0.8 },
      cell: (i) => {
        // golden-angle scatter for organic distribution
        const ang = (i * 137.508) * Math.PI / 180;
        const r   = 12 + (i % 4) * 7;
        const palette = [COLORS.vermillion, COLORS.teal, COLORS.chrome, COLORS.paperDeep];
        const c = palette[i % 4];
        const sizeBase = 14 + (i % 5) * 4;
        return {
          x: 50 + Math.cos(ang) * r,
          y: 50 + Math.sin(ang) * r * 0.7,
          w: `${sizeBase}px`, h: `${sizeBase}px`,
          rd: i % 3 === 0 ? '50%' : `${4 + (i % 4) * 2}px`,
          bg: c.bg, bd: c.bd, tx: c.tx,
          rot: (i * 23) % 90 - 45,
          op: 1,
          labelOpacity: 0
        };
      }
    },

    // ============================================================ S2 ORBIT
    {
      name: 'orbit',
      caption: 'stage 01 · hook.',
      ws: { x: 50, y: 50, opacity: 1, textSize: 'clamp(2rem, 5.5vw, 4rem)', scale: 1 },
      cell: (i) => {
        // 3 concentric rings: 5 / 6 / 5
        let ring, idx, count;
        if (i < 5)       { ring = 0; idx = i;        count = 5; }
        else if (i < 11) { ring = 1; idx = i - 5;    count = 6; }
        else             { ring = 2; idx = i - 11;   count = 5; }
        const radius = [16, 28, 38][ring];
        const angOff = ring * 0.45;
        const ang    = idx / count * Math.PI * 2 + angOff - Math.PI / 2;
        const palette = [COLORS.vermillion, COLORS.chrome, COLORS.teal];
        const c = palette[ring];
        const sz = [22, 18, 14][ring];
        return {
          x: 50 + Math.cos(ang) * radius,
          y: 50 + Math.sin(ang) * radius * 0.55,   // squashed to suggest perspective
          w: `${sz}px`, h: `${sz}px`,
          rd: '50%',
          bg: c.bg, bd: c.bd, tx: c.tx,
          rot: 0,
          op: 1,
          labelOpacity: 0
        };
      }
    },

    // ============================================================ S3 PIPELINE
    {
      name: 'pipeline',
      caption: 'stage 02 · pipeline.',
      ws: { x: 14, y: 14, opacity: 1, textSize: 'clamp(0.85rem, 1.6vw, 1.15rem)', scale: 1 },
      cell: (i) => {
        const pct = i / (N - 1);
        const x = 6 + pct * 88;
        // First and last cells are "anchor" rectangles; middle 14 are slim capsules.
        const isAnchor = i === 0 || i === N - 1;
        return {
          x,
          y: 56,
          w: isAnchor ? '5%' : '3.5%',
          h: isAnchor ? '24%' : '14%',
          rd: isAnchor ? '8px' : '999px',
          bg: isAnchor ? COLORS.vermSolid.bg : COLORS.inkSolid.bg,
          bd: isAnchor ? COLORS.vermSolid.bd : COLORS.inkSolid.bd,
          tx: COLORS.inkSolid.tx,
          rot: 0,
          op: 1,
          labelOpacity: 0
        };
      }
    },

    // ============================================================ S4 GRID
    {
      name: 'grid',
      caption: 'stage 03 · kpi grid.',
      ws: { x: 14, y: 14, opacity: 1, textSize: 'clamp(0.85rem, 1.6vw, 1.15rem)', scale: 1 },
      cell: (i) => {
        const col = i % 4;
        const row = Math.floor(i / 4);
        // 4×4 grid filling about 70% of canvas, lower 60%
        const x = 16 + col * (68 / 3);
        const y = 32 + row * 16;
        // give a few cells the accent treatment so the grid isn't flat
        const accent = (row + col) % 3 === 0;
        const c = accent ? COLORS.vermillion : COLORS.inkSoft;
        return {
          x, y,
          w: '17%', h: '11%',
          rd: '8px',
          bg: c.bg, bd: c.bd, tx: c.tx,
          rot: 0,
          op: 1,
          font: 'clamp(0.75rem, 1.4vw, 1.1rem)',
          shadow: accent ? '0 6px 18px -10px rgba(255,77,46,0.40)' : '0 1px 0 rgba(20,17,13,0.04), 0 1px 2px rgba(20,17,13,0.06)',
          // Each cell shows a "kpi value" — ascending so the grid reads as a dashboard
          label: `${(i + 1) * 7}%`,
          labelOpacity: 1
        };
      }
    },

    // ============================================================ S5 CARDS
    {
      name: 'cards',
      caption: 'stage 04 · pitch deck.',
      ws: { x: 14, y: 14, opacity: 1, textSize: 'clamp(0.85rem, 1.6vw, 1.15rem)', scale: 1 },
      cell: (i) => {
        // 4 overlapping cards. Each card = 4 cells stacked with subtle offset
        // so the FLIP morph reads as "many → few" without ever destroying ids.
        const cardIdx = Math.floor(i / 4);   // 0..3
        const inCard  = i % 4;               // 0..3
        const cardX   = 19 + cardIdx * 21;
        const cardY   = 56;
        const offset  = (inCard - 1.5);
        const palette = [COLORS.vermSolid, COLORS.chrome, COLORS.teal, COLORS.inkSolid];
        const c = inCard === 0 ? palette[cardIdx] : COLORS.inkSoft;
        return {
          x: cardX + offset * 0.6,
          y: cardY + offset * 0.8,
          w: '17%', h: '36%',
          rd: '14px',
          bg: c.bg, bd: c.bd, tx: c.tx,
          rot: cardIdx * 4 - 6 + offset * 1.2,
          op: inCard === 0 ? 1 : 0.4 - inCard * 0.05,
          shadow: inCard === 0 ? '0 14px 30px -14px rgba(20,17,13,0.30)' : 'none',
          font: 'clamp(0.7rem, 1.2vw, 0.95rem)',
          label: inCard === 0 ? ['HOOK', 'PROBLEM', 'SOLUTION', 'ASK'][cardIdx] : '',
          labelOpacity: inCard === 0 ? 1 : 0
        };
      }
    },

    // ============================================================ S6 CONSTELLATION
    // Five "+ logo" cells form the Cinemorph mark. The other 11 fade
    // into a starfield so the brand mark is the figure and they're
    // the ground.
    {
      name: 'constellation',
      caption: 'same engine. one source.',
      ws: { x: 50, y: 78, opacity: 1, textSize: 'clamp(1.2rem, 3vw, 2.2rem)', scale: 1 },
      cell: (i) => {
        // logo grid: top, mid-left, mid, mid-right, bottom
        const PLUS = [
          { x: 50, y: 30 },  // top
          { x: 36, y: 44 },  // mid-left
          { x: 50, y: 44 },  // mid
          { x: 64, y: 44 },  // mid-right
          { x: 50, y: 58 }   // bottom
        ];
        if (i < 5) {
          const p = PLUS[i];
          return {
            x: p.x, y: p.y,
            w: '10%', h: '12%',
            rd: '8px',
            bg: COLORS.vermSolid.bg, bd: COLORS.vermSolid.bd, tx: COLORS.vermSolid.tx,
            rot: 0,
            op: 1,
            shadow: '0 0 40px rgba(255,77,46,0.45)',
            labelOpacity: 0
          };
        }
        // remaining 11: starfield around the logo
        const j = i - 5;       // 0..10
        const ang = j * 0.55;
        const r = 28 + (j % 3) * 6;
        return {
          x: 50 + Math.cos(ang) * r * 1.3,
          y: 44 + Math.sin(ang) * r * 0.55,
          w: '6px', h: '6px',
          rd: '50%',
          bg: 'rgba(255,255,255,0.4)',
          bd: 'rgba(255,255,255,0.15)',
          tx: 'transparent',
          op: 0.55,
          shadow: '0 0 8px rgba(255,255,255,0.25)',
          labelOpacity: 0
        };
      }
    },

    // ============================================================ S7 OUTRO
    {
      name: 'outro',
      caption: '<strong>Cinemorph.</strong> a Claude Code plugin.',
      ws: { x: 50, y: 44, opacity: 1, textSize: 'clamp(2rem, 6vw, 4.4rem)', scale: 1 },
      cell: (i) => {
        // collapse all cells into a small puff under the wordmark
        const ang = (i * 137.508) * Math.PI / 180;
        const r = 5 + (i % 3) * 2;
        return {
          x: 50 + Math.cos(ang) * r,
          y: 70 + Math.sin(ang) * r * 0.4,
          w: '5px', h: '5px',
          rd: '50%',
          bg: COLORS.vermSolid.bg, bd: COLORS.vermSolid.bd, tx: 'transparent',
          op: 0.65,
          labelOpacity: 0
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
    if (stageNum) stageNum.textContent = String(idx + 1).padStart(2, '0');
    if (stageName) stageName.textContent = stage.name;
    stageButtons.forEach((b, i) =>
      b.setAttribute('aria-current', i === idx ? 'true' : 'false')
    );

    // smear cut: brief blur on every cell at boundary
    canvas.classList.add('--smearing');
    if (smearTimeout) clearTimeout(smearTimeout);
    smearTimeout = setTimeout(() => canvas.classList.remove('--smearing'), SMEAR_MS);

    // apply per-cell style
    cells.forEach((el, i) => apply(el, stage.cell(i)));

    // wordmark
    const w = stage.ws;
    wsEl.style.setProperty('--wx', `${w.x}%`);
    wsEl.style.setProperty('--wy', `${w.y}%`);
    wsEl.style.setProperty('--wo', String(w.opacity));
    wsEl.style.setProperty('--ws-text', w.textSize);
    wsEl.style.setProperty('--ws-scale', String(w.scale || 1));

    // caption (use innerHTML to allow the <strong> in the outro)
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
    applyClock();
  };

  // controls
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
    if (e.key === ' ')           { e.preventDefault(); setPlaying(!playing); }
    else if (e.key === 'ArrowRight') seekToStage(Math.floor(elapsedMs / STAGE_MS) + 1);
    else if (e.key === 'ArrowLeft')  seekToStage(Math.floor(elapsedMs / STAGE_MS) - 1);
    else if (e.key === 'r' || e.key === 'R') seekToStage(0);
  });

  // start
  setPlaying(true);
  applyStage(0);
  applyClock();
  raf = requestAnimationFrame(tick);

  // total clock label
  const totalEl = document.querySelector('.film-clock em');
  if (totalEl) totalEl.textContent = ' / ' + fmt(TOTAL_MS);
})();
