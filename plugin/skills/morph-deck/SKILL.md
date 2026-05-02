---
name: cinemorph
description: Generate cinematic launch-video-style React presentations with shared-layout (FLIP) morph transitions between stages. Outputs live React deck, PPTX with Morph transitions, or Playwright-recorded MP4. Use when the user asks for a pitch deck, launch video, demo storyboard, kpi dashboard tour, or any cinematic presentation where elements should morph into one another instead of slide-swiping.
---

# Cinemorph

A presentation generator that turns a brief into a working React deck where persistent elements (wordmark, connector chips, search bar, answer card, kpi numbers) morph cleanly between stages via Framer Motion's shared-layout (`LayoutGroup` + `layoutId`) FLIP transitions.

The deck IS the live artifact. Run it in Chrome on the projector, click through with arrow keys. Optional outputs: PPTX with PowerPoint Morph transitions for editable handoff, or MP4 captured via headless Playwright recording.

## Subcommands

| Command | What it does |
|---|---|
| `/cinemorph new "<brief>" [flags]` | Generate a fresh deck from a brief. Asks clarifying questions when inputs are insufficient. |
| `/cinemorph iterate "<change>"` | Modify the active deck (last-touched in cwd or `--deck <path>`). |
| `/cinemorph render` | Open the live deck in browser via `bun run dev`. |
| `/cinemorph pptx` | Export the active deck to `dist/<name>.pptx` with Morph transitions. |
| `/cinemorph video` | Export the active deck to `dist/<name>.mp4` via Playwright recording. |
| `/cinemorph export --all` | Run pptx + video + notes.md in one shot. |

For backwards compatibility, `/morph-deck` continues to work as an alias.

## Cinematic-video lessons baked in

For launch-video output specifically (30s cinematic teasers with audio), the composer enforces principles documented in **`docs/cinematic-launch-video-lessons.md`**. These were extracted from shipping a real 30-second video and are designed to get visual + audio right the first time.

Highlights:

- **Master RAF clock** drives one `elapsedMs` value. All scenes read from it. Phases are non-overlapping windows; `SMEAR_MS = 350` cross-fades at boundaries.
- **`aeBounce` easing** for any element that lands with weight (logo pop, cylinder land, tile bloom). Dan Ebberts' AE bounce ported to TS.
- **Whooshes go on real scene transitions ONLY**, never on internal animation events (a single tile bouncing in is a POP, not a whoosh). Whooshes lead the visual by 300–500ms.
- **Audio-bus race-condition fix is mandatory** for the SFX engine. Tracking `stoppedSfxRef` so each cue's `stopAtMs` runs exactly once. Without this, only the first cue per audio file plays.
- **Browser autoplay gate** — minimal transparent click area + 64px play icon. Pre-warm the SFX pool on first interaction (`pointermove`/`click`/`keydown`/`touchstart`).
- **ffmpeg seek-mode trap** — `-ss BEFORE -i` for input-seek when trimming with `afade`. Output-seek can produce silent files that pass duration checks.
- **Multi-stutter whoosh files** are common in free SFX libraries. Always silence-detect before use; trim to a single clean swoosh.
- **Volume hierarchy** — music 0.20–0.25 baseline, ducks to 0.05–0.08 under VO; whooshes 0.30–0.40; POPs 0.70–0.80; BLIPs 0.30–0.45 tapered; VO 0.85–0.95.
- **Dev scrubber** on `?dev=1` so the user can reference exact timestamps when iterating.

Read the full doc before generating any cinematic launch video.

## Design-input layering

Inputs apply in priority order; later layers overwrite earlier ones for fields they provide. Missing fields after all layers trigger a clarifying question (the skill asks instead of guessing).

1. `--theme <name>` — pick from `stacklink-dark`, `bunq-mint-light`, `linear-light`, `minimal-mono`, `playful-poster`
2. `--tokens <path>` — load a `tokens.json` or `DESIGN.md`
3. `--reference <image>` — extract a 5-color palette from a screenshot (palette → tokens)
4. `--prompt "<style description>"` — free-form fallback ("dark, sans-serif, EU-enterprise, restrained")

## Talk-track

Each generated stage carries an optional `talkTrack: { script, dwellSeconds?, cues? }`. The skill derives:
- `notes.md` (one section per stage) for presenter rehearsal
- PPTX speaker notes
- Auto-paced video dwell times (`words / 150 wpm + 1.5s`)

## Pattern invariants the generator enforces

- `LayoutGroup` from `motion/react` wraps the persistent element layer in `Canvas.tsx`. Without it, layoutId tracking breaks across siblings.
- Every `motion.div` reads timing from `pace.ts` exports (`MORPH_TRANSITION`, `CAPTION_FADE`, `FRAME_FADE`). No inline duration/ease.
- `HIDDEN` (a 0%×0% layout at canvas center, opacity 0) keeps the morph chain alive across appear/disappear cycles. Omitting an element from a stage's layout map is treated as `HIDDEN`.
- Primitives consume tokens via Tailwind classes derived from `tokens.ts` (`bg-background`, `text-foreground`). No hardcoded hex anywhere except inside theme JSON files.
- Default `MORPH_TRANSITION` is `{ duration: 0.7, ease: [0.32, 0.72, 0.34, 1] }`.
- For cinematic-video output: see lessons doc for SFX placement, audio-bus invariants, autoplay-gate pattern, and dev-scrubber requirement.

## Output

`/cinemorph new` produces a Vite + React 18 + Tailwind + `motion/react` project at `<deck>/` with the canonical six-file deck source layout under `src/deck/`:
`Canvas.tsx`, `Caption.tsx`, `Deck.tsx`, `StepIndicator.tsx`, `stages.ts`, `elements.tsx`, `frames.tsx`, `pace.ts`, `data.ts`, `tokens.ts`.

For cinematic launch-video output, additional files are emitted:
`lib.ts` (audio bus + master clock + phase helpers + `aeBounce`), `ContinuousLaunch.tsx` (RAF-driven scene composer), `public/sfx/` (SFX library), `public/voiceover.mp3` (VO file slot), `public/sfx/music-bed.mp3` (music bed slot).

Run `bun install && bun run dev` to view at `localhost:5173`. ArrowRight/Space to advance, ArrowLeft to go back, R to restart, B to open Q&A backup picker. Append `?dev=1` for the cinematic launch-video timeline scrubber.

## Implementation entry points

The actual command logic lives in:
- `commands/morph-deck.md` — slash command surface (parses args, routes to scripts). Aliased as `/cinemorph`.
- `scripts/router.cjs` — subcommand dispatcher
- `scripts/composer.cjs` — LLM sub-agent harness for `new`/`iterate`
- `scripts/verify-loop.cjs` — build + render verification chain
- `scripts/token-merger.cjs` — design-input layered merger
- `scripts/from-example.cjs` — `--from-example` clone helper
- `agents/morph-composer.md` — sub-agent system prompt (defines the deck file format, primitive manifest, stage schema, cinematic-launch-video lessons)

## See also

- **`docs/cinematic-launch-video-lessons.md`** — the canonical reference for any 30s launch-video output. READ BEFORE GENERATING.
- Spec: `spec-morph-deck-core.md` (engine, primitives, composer, themes)
- Spec: `spec-morph-deck-outputs.md` (PPTX, video, talk-track sync)
- Spec: `spec-morph-deck-verifier.md` (phase 2: vision QA, comparison-against-reference, r3f 3D primitives)
- Example: `examples/launch-cinematic-30s/` — canonical brief with all the lessons applied.
