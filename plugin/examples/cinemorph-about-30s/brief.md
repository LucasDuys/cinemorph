# Cinemorph about 30s — canonical brief

A 30-second cinematic where **Cinemorph itself is the subject**. Mirrors the live CSS-driven version at https://lucasduys.github.io/cinemorph (which is the same artefact rendered with hand-rolled CSS so it can serve from a static GitHub Pages site).

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
  hook:       { startMs:     0, endMs:  4000 },  // your stack knows everything (chips orbit wordmark)
  brief:      { startMs:  4000, endMs:  8000 },  // give it a brief (typed prompt appears)
  composer:   { startMs:  8000, endMs: 12000 },  // composer writes the deck (stages.ts code card)
  morph:      { startMs: 12000, endMs: 16000 },  // elements morph between stages (chip dance)
  outputs:    { startMs: 16000, endMs: 20000 },  // three outputs (live / MP4 / PPTX)
  examples:   { startMs: 20000, endMs: 24000 },  // twelve starters
  outro:      { startMs: 24000, endMs: 30000 }   // wordmark + install + URL
};
```

7 scenes × ~4s each, with 350 ms cross-fade smear cuts at boundaries.

## Voiceover script

42 words, 138 WPM, plain conversational, paper-and-typewriter feel. Pronounce slash commands letter-by-letter ("slash cinemorph new").

```
[0.5s]  Your stack already knows everything.

[4.5s]  Give Cinemorph a brief.

[8.5s]  The composer writes the deck.
        Stages, elements, talk track.

[13.0s] Elements morph between stages —
        no keyframes, no per-property animate.

[17.0s] Three outputs.
        Live deck. MP4. PowerPoint with native Morph.

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
  { atMs: 12100, src: BLIP,   volume: 0.45 },                       // chip-dance taper
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

### S1 · Hook (0–4 s) — "your stack knows everything."
Wordmark "Cinemorph" sits center-frame in big Fraunces with a vermillion-gradient on the right side. Five connector chips (Slack, GitHub, Notion, Linear, Drive) orbit at 18%–82% positions. Caption fades in: *your stack already knows everything.* Hold for breath, then whoosh out.

### S2 · Brief (4–8 s) — "give it a brief."
Wordmark shrinks and rises to the top. A monospace prompt card appears mid-frame and types itself: `/cinemorph new --prompt  Series A pitch: problem, solution, traction, team, ask`. Chips drift to a quiet row at 76 % top, opacity 0.55. Caption: *give it a brief.*

### S3 · Composer (8–12 s) — "the composer writes the deck."
Brief evaporates. A dark code card slides in at 56 % top showing a 5-line `stages.ts` snippet (composer-generated, syntax-highlighted in chrome yellow + emerald + sky-blue). Caption: *the composer writes the deck.*

### S4 · Morph (12–16 s) — "elements morph between stages."
Code card fades. The five chips return — but rather than orbit, they line up across the middle of the frame at 56 % top, evenly spaced. Each lands with `aeBounce` and a tapered BLIP (45 → 35 % volume). Caption: *elements morph between stages.*

### S5 · Outputs (16–20 s) — "three outputs. one source of truth."
Chips fade. Three output cards bloom at 19 / 50 / 81 % left, 56 % top:
- **LIVE DECK** · Vite + React · *localhost:5173 · hot reload · ?dev=1 scrubber*
- **MP4** · Playwright + ffmpeg · *30 s film · audio bus · smear cuts · aeBounce*
- **PPTX** · Native Microsoft Morph · *editable handoff · Office 2019+ · 365*

Caption: *three outputs. one source of truth.*

### S6 · Examples (20–24 s) — "twelve starters. yours next."
Eight tiles arrive in a 3 × 3 grid (with two centered on the bottom row): launch-cinematic-30s, stacklink-roundone-pitch, pitch-5slide, feature-demo, kpi-dashboard-tour, case-study, manifesto, team-intro. The first tile is highlighted in vermillion. Caption: *twelve starters. yours next.*

### S7 · Outro (24–30 s) — "Cinemorph. a Claude Code plugin."
Wordmark returns to 32 % top in big Fraunces. The vermillion gradient sweeps from left to right (background-position 0 → 100 %). A dark install card lands at 64 % top showing `cp -r plugin ~/.claude/plugins/cinemorph` with `lucasduys.github.io/cinemorph` underneath in chrome yellow. CHIME on URL reveal. Caption: ***Cinemorph.*** *a Claude Code plugin.*

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
