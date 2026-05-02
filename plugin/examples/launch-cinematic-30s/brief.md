# Launch cinematic 30s — canonical brief

A 30-second cinematic product launch teaser, RAF-clock driven, single composition. Reference implementation: Stacklink launch video at `C:/dev/stacklink-pitch-roundone/launch-app`.

## Output type

Cinematic launch video (NOT a click-through deck). The output is a Vite + React 18 + Tailwind project with:
- Master RAF clock writing `elapsedMs`
- `PHASES` table of non-overlapping windows
- Scene composer that renders different beats based on `elapsedMs`
- `useAudioBus` hook for music + voiceover + SFX
- `?dev=1` timeline scrubber
- Browser autoplay gate (transparent + 64px play icon)

Read `plugin/docs/cinematic-launch-video-lessons.md` before generating. The lessons capture every detail that was wrong-then-right across iteration cycles.

## Phase structure (default for 30s)

```ts
export const PHASES = {
  hook:       { startMs:     0, endMs:  2500 },  // logo + tagline (silent open)
  quote:      { startMs:  2500, endMs:  6500 },  // search hyper-zoom + typing
  today:      { startMs:  6500, endMs: 11500 },  // wide reveal + sources + cylinder
  onboarding: { startMs: 11500, endMs: 17000 },  // admin panel + agent log
  agents:     { startMs: 17000, endMs: 22500 },  // agent constellation bloom
  sovereign:  { startMs: 22500, endMs: 26000 },  // compliance pills wave
  manifesto:  { startMs: 26000, endMs: 30000 }   // outro logo + URL
};
```

Adjust the names per product but keep the rhythm: silent open → hook scene with main impact → middle proof scenes → vision/positioning → outro.

## Required scaffold files

Standard six-file deck PLUS:
- `src/continuous/lib.ts` — math helpers (`clamp01`, `easeOutCubic`, `easeInOutCubic`, `aeBounce`, `smearBlur`), `phaseClock`, `PHASES`, `TOTAL_MS`, `SMEAR_MS = 350`, `AudioConfig` type, `useAudioBus` hook with `stoppedSfxRef` fix, `STACKLINK_AUDIO`-style config export
- `src/continuous/ContinuousLaunch.tsx` — RAF clock, scene composer, autoplay gate, dev scrubber on `?dev=1`
- `public/sfx/` — pop, click, typing, whoosh-soft, whoosh-converge, blip, url-chime, music-bed
- `public/voiceover.mp3` — VO file slot

## SFX cue defaults (volume hierarchy from lessons)

```ts
sfx: [
  { atMs: 350,   src: POP,    volume: 0.75 },                       // hero logo pop
  { atMs: 2500,  src: WHOOSH, volume: 0.30 },                       // hero → search transition
  { atMs: 3450,  src: TYPING, volume: 0.95, stopAtMs: <type-end> }, // 200ms lead, stop on last char
  { atMs: 6300,  src: WHOOSH, volume: 0.35 },                       // search → wide reveal
  { atMs: 9700,  src: WHOOSH, volume: 0.35 },                       // sources → cylinder
  { atMs: 10100, src: POP,    volume: 0.75 },                       // cylinder lands
  { atMs: 14600, src: WHOOSH, volume: 0.35 },                       // substrate → onboarding
  { atMs: 15250, src: TYPING, volume: 0.85, stopAtMs: 16500 },      // admin types email
  { atMs: 16600, src: CLICK,  volume: 0.75 },                       // confirm button
  { atMs: 19400, src: WHOOSH, volume: 0.35 },                       // onboarding → agents
  { atMs: 19900, src: POP,    volume: 0.75 },                       // first agent tile
  { atMs: 20200, src: BLIP,   volume: 0.45 },                       // tile-bloom wave (taper)
  { atMs: 20330, src: BLIP,   volume: 0.42 },
  { atMs: 20460, src: BLIP,   volume: 0.40 },
  { atMs: 20590, src: BLIP,   volume: 0.38 },
  { atMs: 20720, src: BLIP,   volume: 0.35 },
  { atMs: 23300, src: WHOOSH, volume: 0.35 },                       // agents → sovereign
  { atMs: 25400, src: POP,    volume: 0.75 },                       // outro logo
  { atMs: 27200, src: CHIME,  volume: 0.55 }                        // URL reveal
]
```

Music: `{ src: '/sfx/music-bed.mp3', baseVolume: 0.22, loop: false }` ducked to 0.07 during `[2500, 27500]`.

VO: `{ src: '/voiceover.mp3', startAtMs: 2500, volume: 0.95 }`.

## Voiceover script template

55 words, 138 WPM, plain conversational, no motivational lift. Pronounce URLs letter by letter.

```
[2.5s]  Most companies have a thousand answers
        buried across a dozen apps.

[9.5s]  <Product> reads them all. <App>, <App>,
        <App>, <App>. One question, one answer,
        with sources.

[15.0s] Add someone to your team. Every account,
        every agent, set up in seconds.
        Not a week with a manager.

[23.0s] It's an operating system. For agents.

[27.5s] <product> dot <tld>.
```

## Run

```bash
bun install
bun run dev
# open localhost:5173
# append ?dev=1 for the timeline scrubber
```

## Generate from this example

```
/cinemorph new --from-example launch-cinematic-30s
```
