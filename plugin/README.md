# Cinemorph Plugin

> You're inside the installed plugin. For the full project README, demo videos, and GitHub Pages site, see the [repo root](../README.md).

This file documents the plugin from the **inside** — every command, flag, primitive, theme, and extension point you can reach with `/cinemorph` after the plugin is in `~/.claude/plugins/cinemorph/`.

---

## What it does

Cinemorph composes a Vite + React deck where persistent elements morph cleanly between stages via Framer Motion's shared-layout (`LayoutGroup` + `layoutId`) FLIP transitions. The composer takes a brief and emits a complete `stages.ts` + `data.ts`. The scaffold renders them. Three production targets fall out:

- **Live deck** — Vite dev server, hot reload, `?dev=1` timeline scrubber.
- **PPTX with native Morph** — editable PowerPoint with Microsoft Morph between slides.
- **MP4** — Playwright-recorded, ffmpeg-muxed cinematic video with audio bus, voiceover, SFX, smear cuts.

For 30-second cinematic launch films, `docs/cinematic-launch-video-lessons.md` is the canonical reference. Every rule there was earned by shipping a real video — read it before generating one.

---

## Install

```bash
git clone https://github.com/LucasDuys/cinemorph.git
cp -r cinemorph/plugin ~/.claude/plugins/cinemorph
```

Restart your Claude Code session. The `/cinemorph` command becomes available. `/morph-deck` is kept as a v1.0 alias.

**Auth.** The composer spawns the `claude` CLI on `PATH` and uses your Claude Code subscription. `ANTHROPIC_API_KEY` is not required and not consulted for compose / iterate / QA flows.

---

## Subcommands

### `new` — scaffold a fresh deck

```bash
/cinemorph new --from-example launch-cinematic-30s --out ./my-launch-video
/cinemorph new --theme stacklink-dark --prompt "Series A pitch: problem, solution, traction, team, ask"
/cinemorph new --reference ./brand.png --prompt "Q3 roadmap"
```

**Flags**

| Flag | Effect |
|---|---|
| `--from-example <name>` | Start from a bundled deck (see [Examples](#examples)) |
| `--theme <name>` | `stacklink-dark` \| `bunq-mint-light` \| `linear-light` \| `minimal-mono` \| `playful-poster` |
| `--tokens <path>` | Load `tokens.json` or `DESIGN.md` |
| `--reference <image>` | Extract a 5-color palette from a screenshot |
| `--prompt "<text>"` | Brief or style description |
| `--out <path>` | Output directory (default: `./<slug>`) |

Inputs apply in priority order — `--theme` < `--tokens` < `--reference` < `--prompt`. Later layers win on fields they provide. Missing fields trigger a clarifying question.

### `iterate` — refine the active deck

```bash
/cinemorph iterate "make slide 3 more cinematic, less text"
/cinemorph iterate --deck ./my-pitch "swap kpi tile order"
```

Modifies the last-touched deck in `cwd` unless `--deck` is given.

### `render` — start the dev server

```bash
/cinemorph render
/cinemorph render --deck ./my-pitch
```

Opens `http://localhost:5173`. Keyboard: `→` / `Space` next, `←` previous, `R` restart, `B` Q&A backup, `?` shortcut sheet. Append `?dev=1` to the URL for the cinematic timeline scrubber.

### `pptx` — export to PowerPoint

```bash
/cinemorph pptx --out ./my-pitch.pptx
```

Native Microsoft Morph transitions. Compatible with Office 2019+ and Microsoft 365.

### `video` — export to MP4

```bash
/cinemorph video --out ./my-launch-video.mp4
```

Playwright records the deck at 60 fps. ffmpeg muxes the audio bus (music bed + voiceover + SFX cues) using the `talkTrack` from each stage.

### `export --all` — every output

```bash
/cinemorph export --all
```

Runs `pptx` + `video` + writes `notes.md` with one section per stage (presenter rehearsal + PPTX speaker notes derived from the same source).

### `reference add` — register a style reference

```bash
/cinemorph reference add ./some-other-deck --name house-style
```

Subsequent `--reference house-style` resolves to that deck's tokens.

---

## Themes

| Theme | Mood | Background | Accent |
|---|---|---|---|
| `stacklink-dark` | EU-enterprise restraint | `#09090F` | violet + cyan |
| `bunq-mint-light` | Fintech, modern | `#FAFAFA` | mint |
| `linear-light` | Minimal, technical | `#F8F9FA` | slate + blue |
| `minimal-mono` | Editorial, typographic | `#FFFFFF` | grays |
| `playful-poster` | Creative, event-driven | varies | multi-color |

Custom token shape:

```jsonc
{
  "background": "#09090F",
  "foreground": "#FAFAFA",
  "mutedForeground": "#A1A1AA",
  "border": "#27272A",
  "surfaceBase": "#09090F",
  "surfaceSubtle": "#27272A",
  "surfaceRaised": "#1D1D21",
  "success": "#22C55E",
  "info": "#3B82F6",
  "warning": "#F59E0B",
  "destructive": "#EF4444",
  "fontDisplay": "Space Grotesk, Inter, sans-serif",
  "fontBody": "Inter, sans-serif",
  "fontMono": "JetBrains Mono, monospace"
}
```

---

## Sixteen built-in primitives

| Primitive | Purpose |
|---|---|
| `Wordmark` | Logo / product name header |
| `KPI` | Value + label pair |
| `Pillar` | Portrait card (name, role, image) |
| `Quote` | Pull quote with attribution |
| `ConnectorChip` | Logo badge: Slack, GitHub, Notion, Linear, Confluence, Jira, OneDrive, Teams, Salesforce, Drive |
| `Card` | Headline + body + optional image |
| `Logo` | Inline logo / brand asset |
| `Image` | Photo or diagram with fade-in |
| `Diagram` | SVG / PNG architecture diagram |
| `Icon` | Inline icon or symbol |
| `Chart` | Static data visualization |
| `MorphChart` | FLIP-tracked animated chart |
| `OrbitGroup` | Circular radial layout |
| `PipelineGroup` | Left-to-right flow diagram |
| `FooterStrip` | Persistent footer bar |
| `StatGroup` | Multi-stat grid (3–6 metrics) |

### Adding your own — convention-based

Drop a component into `src/deck/elements/custom/` of a generated deck. Filename `MyChart.tsx` derives the element id `myChart`:

```ts
elements: {
  myChart: { pos: { left: '10%', top: '10%', width: '60%', height: '40%' }, shape: 'chart' }
}
```

### Adding your own — explicit registry

```ts
// src/deck/elements/customRegistry.ts
import MyChart from './custom/MyChart';

export const CUSTOM_ELEMENTS: CustomElementEntry[] = [
  {
    id: 'myChart',
    component: MyChart,
    defaultLayout: { pos: { left: '10%', top: '10%', width: '60%', height: '40%' }, shape: 'chart' },
  },
];
```

See [`examples/custom-element/`](examples/custom-element/) for a complete, runnable example.

---

## Examples

| Example | Description |
|---|---|
| **`launch-cinematic-30s`** | Canonical 30-second cinematic launch film — RAF-clock driven, audio bus wired, dev scrubber, autoplay gate |
| **`stacklink-roundone-pitch`** | Real 5-slide investor pitch — bundled `stages.ts` + `data.ts` + `tokens.ts` |
| `pitch-5slide` | Generic investor deck (Problem, Solution, Traction, Team, Ask) |
| `feature-demo` | 4–6-slide feature walkthrough |
| `kpi-dashboard-tour` | Live-data dashboard with morphing kpi tiles |
| `case-study` | Customer success story format |
| `manifesto` | Vision / principles statement |
| `team-intro` | Team intro with morphing pillar cards |
| `release-notes` | Engineering release-notes deck |
| `roadmap` | Quarterly roadmap with morphing milestone tiles |
| `retro-storyboard` | Retrospective / post-mortem storyboard |
| `custom-element` | Reference for registering your own primitive |

Each example is a self-contained deck source — read its `README.md` and `brief.md` as documentation by example.

---

## How the composer works

1. **Input**: brief (plain text), merged design tokens (JSON), primitive manifest (list of available element shapes).
2. **Invocation**: spawns the `claude` CLI binary with `agents/morph-composer.md` as the system prompt. Authentication is the user's Claude Code subscription; no API key.
3. **Output**: a single JSON object with `stagesTs` and `dataTs` as strings.
4. **Constraints**: 8000 max output tokens, 60-second wall-clock. Decks with more than ~7 main slides or very long talk tracks may approach the token cap.
5. **Verification**: build + render check; phase-2 verifier compares generated output against a reference image and runs an auto-improve loop if quality scores miss thresholds.

For testing, set `MORPH_DECK_FAKE_CLAUDE=/path/to/stub` to swap in a stub binary.

Detailed wiring: [`docs/composer-live.md`](docs/composer-live.md).

---

## Pattern invariants the generator enforces

- `<LayoutGroup>` from `motion/react` wraps the persistent element layer in `Canvas.tsx`. Without it, `layoutId` tracking breaks across siblings.
- Every `motion.div` reads timing from `pace.ts` exports (`MORPH_TRANSITION`, `CAPTION_FADE`, `FRAME_FADE`). No inline durations.
- `HIDDEN` (a 0%×0% layout at canvas center, opacity 0) keeps the morph chain alive across appear / disappear cycles. Omitting an element from a stage's layout map is treated as `HIDDEN`.
- Primitives consume tokens via Tailwind classes derived from `tokens.ts` (`bg-background`, `text-foreground`). No hardcoded hex anywhere except inside theme JSON files.
- Default `MORPH_TRANSITION` is `{ duration: 0.7, ease: [0.32, 0.72, 0.34, 1] }`.

For cinematic-video output, see `docs/cinematic-launch-video-lessons.md` for SFX placement, audio-bus invariants, autoplay-gate pattern, and dev-scrubber requirement.

---

## Talk tracks

Each generated stage carries an optional `talkTrack: { script, dwellSeconds?, cues? }`. The plugin derives:

- `notes.md` — one section per stage, for presenter rehearsal
- PPTX speaker notes
- Auto-paced video dwell times (`words / 150 wpm + 1.5s`)

---

## Output layout

`/cinemorph new` produces a Vite + React 18 + Tailwind + `motion/react` project at `<deck>/` with the canonical six-file deck source under `src/deck/`:

```
src/deck/
├── Canvas.tsx          # <LayoutGroup> wrapper, primitive renderer
├── Caption.tsx         # On-canvas captions + scene title
├── Deck.tsx            # Stage state, keyboard nav, corner controls
├── StepIndicator.tsx   # Bottom-strip progress
├── stages.ts           # ← composer-generated
├── data.ts             # ← composer-generated
├── elements.tsx        # Primitive bindings
├── frames.tsx          # Frame variants
├── pace.ts             # Timing & easing
├── tokens.ts           # Theme tokens (Tailwind-mapped)
└── App.tsx             # Mount
```

For cinematic launch-video output, additional files emit:

```
src/deck/
├── lib.ts                    # Audio bus + master clock + phase helpers + aeBounce
└── ContinuousLaunch.tsx      # RAF-driven scene composer
public/
├── voiceover.mp3             # VO file slot
└── sfx/
    ├── music-bed.mp3         # Music bed slot
    └── ...                   # SFX library
```

Run `bun install && bun run dev` to view at `localhost:5173`. Append `?dev=1` for the cinematic timeline scrubber.

---

## Implementation entry points

If you want to read the actual command logic:

- [`commands/morph-deck.md`](commands/morph-deck.md) — slash command surface (parses args, routes to scripts)
- [`scripts/router.cjs`](scripts/router.cjs) — subcommand dispatcher
- [`scripts/composer.cjs`](scripts/composer.cjs) — Claude CLI sub-agent harness
- [`scripts/verify-loop.cjs`](scripts/verify-loop.cjs) — build + render verification chain
- [`scripts/token-merger.cjs`](scripts/token-merger.cjs) — design-input layered merger
- [`scripts/from-example.cjs`](scripts/from-example.cjs) — `--from-example` clone helper
- [`agents/morph-composer.md`](agents/morph-composer.md) — composer system prompt

---

## Phase 2 (planned, Q3 2026)

- **Vision QA** — LLM review of generated decks against brief (auto-catch misalignments).
- **3D transitions** — Perspective transforms and depth effects (WebGL layer).
- **Live speaker view** — Network-synced presenter display with notes + timer.

---

## See also

- [`docs/cinematic-launch-video-lessons.md`](docs/cinematic-launch-video-lessons.md) — required reading before generating any 30s launch video
- [`docs/composer-live.md`](docs/composer-live.md) — composer wiring and testing details
- [`../README.md`](../README.md) — top-level project README with demos and quick start
- [`../site/`](../site/) — GitHub Pages source (built site at `https://lucasduys.github.io/cinemorph`)
