# Cinemorph about 30s — canonical brief

A 30-second cinematic where **Cinemorph itself is the subject**. Mirrors the live CSS-driven version at https://lucasduys.github.io/cinemorph (which is the same artefact rendered with hand-rolled CSS so it can serve from a static GitHub Pages site).

The film is about the *engine* — what it composes, how it morphs, what it outputs. It does not connect to any third-party service or knowledge layer. Every visible artefact is a Cinemorph primitive or a Cinemorph output.

## Output type

Cinematic launch video (NOT a click-through deck). Single composition, one master RAF clock, FLIP morphs between scenes. Read [`plugin/docs/cinematic-launch-video-lessons.md`](../../docs/cinematic-launch-video-lessons.md) before generating.

## Theme

`Aperture` (bundled in `tokens.ts`):
- Background: `#F4EFE3` (warm cream paper)
- Foreground: `#14110D` (deep ink)
- Vermillion: `#FF4D2E` (signature accent)
- Chrome yellow: `#FFC93C` (callouts)
- Display: `Fraunces` (serif, expressive — like film titles)
- Body: `Inter`
- Mono: `JetBrains Mono`

## Phase structure

```ts
export const PHASES = {
  hook:     { startMs:     0, endMs:  4000 },  // decks that morph (primitives orbit wordmark)
  brief:    { startMs:  4000, endMs:  8000 },  // it starts with a brief (typed prompt)
  composer: { startMs:  8000, endMs: 12000 },  // composer writes stages.ts + data.ts
  morph:    { startMs: 12000, endMs: 16000 },  // FLIP morphs (primitives reposition)
  outputs:  { startMs: 16000, endMs: 20000 },  // live deck / MP4 / PPTX
  examples: { startMs: 20000, endMs: 24000 },  // twelve starters
  outro:    { startMs: 24000, endMs: 30000 }   // wordmark + install + URL
};
```

7 scenes × ~4 s each, with 350 ms cross-fade smear cuts at boundaries.

## Voiceover script

40 words, ~135 WPM, plain conversational. Pronounce slash commands letter-by-letter ("slash cinemorph new"). Pronounce `stages.ts` as "stages dot t-s".

```
[0.5s]  Cinemorph composes Vite and React decks
        where elements morph between stages.

[4.5s]  It starts with a brief.

[8.5s]  The composer writes stages.ts and data.ts.

[13.0s] FLIP morphs. No keyframes,
        no per-property animate.

[17.0s] Live deck. MP4. PowerPoint Morph.

[21.0s] Twelve bundled starters.
        Yours next.

[26.0s] Cinemorph. A Claude Code plugin.
        lucas-duys dot github dot io slash cinemorph.
```

## SFX cue defaults

Volumes follow the lessons-doc hierarchy (music 0.22, whoosh 0.30–0.35, POP 0.75, BLIP 0.35–0.45, VO 0.95).

```ts
sfx: [
  { atMs: 350,   src: POP,    volume: 0.75 },                       // wordmark logo pop
  { atMs: 3700,  src: WHOOSH, volume: 0.30 },                       // hook → brief
  { atMs: 4200,  src: TYPING, volume: 0.85, stopAtMs: 7600 },       // brief types itself
  { atMs: 7700,  src: WHOOSH, volume: 0.30 },                       // brief → composer
  { atMs: 11700, src: WHOOSH, volume: 0.32 },                       // composer → morph
  { atMs: 12100, src: BLIP,   volume: 0.45 },                       // primitive-line taper
  { atMs: 12230, src: BLIP,   volume: 0.42 },
  { atMs: 12360, src: BLIP,   volume: 0.40 },
  { atMs: 12490, src: BLIP,   volume: 0.38 },
  { atMs: 12620, src: BLIP,   volume: 0.35 },
  { atMs: 15700, src: WHOOSH, volume: 0.32 },                       // morph → outputs
  { atMs: 16100, src: POP,    volume: 0.70 },                       // first output card lands
  { atMs: 19700, src: WHOOSH, volume: 0.32 },                       // outputs → examples
  { atMs: 23700, src: WHOOSH, volume: 0.35 },                       // examples → outro
  { atMs: 24400, src: POP,    volume: 0.78 },                       // outro wordmark settles
  { atMs: 27800, src: CHIME,  volume: 0.55 }                        // URL reveal
]
```

Music: `{ src: '/sfx/music-bed.mp3', baseVolume: 0.22, loop: false }` ducked to 0.07 during VO `[500, 28500]`.

## Scene-by-scene

### S1 · Hook (0–4 s) — "decks that morph."
Wordmark "Cinemorph" sits center-frame in big Fraunces with a vermillion-gradient sweep on the right side. Five labeled chips orbit at 18–82 % positions: **wordmark**, **kpi**, **orbit**, **pipeline**, **card**. These are real primitives the engine ships with (see `plugin/primitives/`). The first chip — wordmark — is set in vermillion-deep to draw the eye. Caption fades in: *decks that morph.* Hold for breath, then whoosh out.

> Why these chips? Because the film is about Cinemorph's composer arranging Cinemorph's own primitives. The chips are not third-party services or integrations — they are the pieces the engine knows how to morph between stages.

### S2 · Brief (4–8 s) — "it starts with a brief."
Wordmark shrinks and rises to the top. A monospace prompt card appears mid-frame and types itself: `/cinemorph new --prompt  30-second cinematic launch film for our new product`. The five primitive chips drift to a quiet row at 76 % top, opacity 0.55 — they're waiting for the composer to place them. Caption: *it starts with a brief.*

### S3 · Composer (8–12 s) — "the composer writes stages.ts and data.ts."
Brief evaporates. A dark code card slides in at 56 % top showing a 5-line `stages.ts` snippet (composer-generated, syntax-highlighted in chrome yellow + emerald + sky-blue). Three stages, one wordmark id, three positions. That's the entire morph engine in a screenful. Caption: *the composer writes <code>stages.ts</code> and <code>data.ts</code>.*

### S4 · Morph (12–16 s) — "FLIP morphs. no keyframes."
Code card fades. The five primitive chips return — but rather than orbit, they line up across the middle of the frame at 56 % top, evenly spaced. Each lands with `aeBounce` and a tapered BLIP (45 → 35 % volume). The same chip ids travelled from corner-orbit (S1) → bottom row (S2) → centre line (S4) — three different stages, zero keyframes per element. Caption: *FLIP morphs. no keyframes.*

### S5 · Outputs (16–20 s) — "live deck · MP4 · PowerPoint Morph."
Chips fade. Three output cards bloom at 19 / 50 / 81 % left, 56 % top:
- **LIVE DECK** · Vite + React · *localhost:5173 · hot reload · ?dev=1 scrubber*
- **MP4** · Playwright + ffmpeg · *30 s film · audio bus · smear cuts · aeBounce*
- **PPTX** · Native Microsoft Morph · *editable handoff · Office 2019+ · 365*

Caption: *live deck · MP4 · PowerPoint Morph.*

### S6 · Examples (20–24 s) — "twelve starters. yours next."
Eight tiles arrive in a 3 × 3 grid (with two centred on the bottom row): launch-cinematic-30s, stacklink-roundone-pitch, pitch-5slide, feature-demo, kpi-dashboard-tour, case-study, manifesto, team-intro. The first tile is highlighted in vermillion. Caption: *twelve starters. yours next.*

### S7 · Outro (24–30 s) — "Cinemorph. a Claude Code plugin."
Wordmark returns to 32 % top in big Fraunces. The vermillion gradient sweeps from left to right. A dark install card lands at 64 % top showing `cp -r plugin ~/.claude/plugins/cinemorph` with `lucasduys.github.io/cinemorph` underneath in chrome yellow. CHIME on URL reveal. Caption: ***Cinemorph.*** *a Claude Code plugin.*

## Run

```bash
bun install
bun run dev
# open localhost:5173
# append ?dev=1 for the timeline scrubber
```

## Generate from this example

```
/cinemorph new --from-example cinemorph-about-30s --out my-cinemorph-film
```
