---
name: morph-deck
description: Generate launch-video-style React presentations with shared-layout (FLIP) morph transitions between stages. Outputs live React deck, PPTX with Morph transitions, or Playwright-recorded MP4. Use when the user asks for a pitch deck, launch video, demo storyboard, kpi dashboard tour, or any "cinematic" presentation where elements should morph into one another instead of slide-swiping.
---

# Morph-Deck

A presentation generator that turns a brief into a working React deck where persistent elements (wordmark, connector chips, search bar, answer card, kpi numbers) morph cleanly between stages via Framer Motion's shared-layout (`LayoutGroup` + `layoutId`) FLIP transitions.

The deck IS the live artifact. Run it in Chrome on the projector, click through with arrow keys. Optional outputs: PPTX with PowerPoint Morph transitions for editable handoff, or MP4 captured via headless Playwright recording.

## Subcommands

| Command | What it does |
|---|---|
| `/morph-deck new "<brief>" [flags]` | Generate a fresh deck from a brief. Asks clarifying questions when inputs are insufficient. |
| `/morph-deck iterate "<change>"` | Modify the active deck (last-touched in cwd or `--deck <path>`). |
| `/morph-deck render` | Open the live deck in browser via `bun run dev`. |
| `/morph-deck pptx` | Export the active deck to `dist/<name>.pptx` with Morph transitions. |
| `/morph-deck video` | Export the active deck to `dist/<name>.mp4` via Playwright recording. |
| `/morph-deck export --all` | Run pptx + video + notes.md in one shot. |

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

## Output

`/morph-deck new` produces a Vite + React 18 + Tailwind + `motion/react` project at `<deck>/` with the canonical six-file deck source layout under `src/deck/`:
`Canvas.tsx`, `Caption.tsx`, `Deck.tsx`, `StepIndicator.tsx`, `stages.ts`, `elements.tsx`, `frames.tsx`, `pace.ts`, `data.ts`, `tokens.ts`.

Run `bun install && bun run dev` to view at `localhost:5173`. ArrowRight/Space to advance, ArrowLeft to go back, R to restart, B to open Q&A backup picker.

## Implementation entry points

The actual command logic lives in:
- `commands/morph-deck.md` — slash command surface (parses args, routes to scripts)
- `scripts/router.cjs` — subcommand dispatcher
- `scripts/composer.cjs` — LLM sub-agent harness for `new`/`iterate`
- `scripts/verify-loop.cjs` — build + render verification chain
- `scripts/token-merger.cjs` — design-input layered merger
- `scripts/from-example.cjs` — `--from-example` clone helper
- `agents/morph-composer.md` — sub-agent system prompt (defines the deck file format, primitive manifest, stage schema)

## See also

- Spec: `spec-morph-deck-core.md` (engine, primitives, composer, themes)
- Spec: `spec-morph-deck-outputs.md` (PPTX, video, talk-track sync)
- Spec: `spec-morph-deck-verifier.md` (phase 2: vision QA, comparison-against-reference, r3f 3D primitives)
