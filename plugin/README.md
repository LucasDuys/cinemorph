# Morph-Deck Plugin

## What It Is

Morph-Deck generates launch-video-style React presentations with shared-layout (FLIP) morph transitions between stages. Given a brief and design tokens, the composer emits a complete, production-ready Vite + React deck. Outputs: live React deck (dev server + hot reload), PPTX with native Morph transitions, MP4 video (30s–5m cinematic export), and speaker notes with presenter cues.

## Install

Copy the `plugin/` directory into `~/.claude/plugins/morph-deck/`:

```bash
cp -r plugin ~/.claude/plugins/morph-deck
```

After installation, restart your Claude session to activate the plugin. You can then invoke the plugin via the `/morph-deck` command.

## Quick Start

### New Deck from Scratch

Generate a deck from a brief text:

```bash
/morph-deck new --theme stacklink-dark --prompt "Series A pitch for Stacklink: problem, solution, traction, team, ask"
```

Output: a new deck directory with `src/deck/stages.ts`, `src/deck/data.ts`, and a live dev server ready at `localhost:5173`.

### New Deck from Example

Start from a bundled template and customize it:

```bash
/morph-deck new --from-example pitch-5slide --out ./my-pitch
```

Available example decks:
- `pitch-5slide` — Investor pitch (Problem, Solution, Traction, Team, Ask)
- `launch-cinematic-30s` — Product launch video storyboard (30-second cinematic)
- `feature-demo` — Feature walkthrough with 4–6 slides
- `kpi-dashboard-tour` — Metrics dashboard presentation
- `case-study` — Customer case study (problem, implementation, results)
- `manifesto` — Brand mission / values statement
- `release-notes` — Launch notes (what's new, highlights)
- `roadmap` — Engineering / product roadmap
- `retro-storyboard` — Retrospective or lessons learned
- `team-intro` — Team member bios and roles

### Iterate & Refine

Regenerate slides in an existing deck:

```bash
/morph-deck iterate --deck ./my-pitch --prompt "make slide 3 more cinematic, less text"
```

### Render (Dev Server)

Start the live development server for a deck:

```bash
/morph-deck render --deck ./my-pitch
```

Opens `http://localhost:5173` with hot reload. Press `?` in the deck for keyboard shortcuts (arrow keys to advance, B for backup slides, K for speaker view).

### Export to PowerPoint

Convert a deck to .pptx with native Morph transitions:

```bash
/morph-deck pptx --deck ./my-pitch --out ./my-pitch.pptx
```

Opens in PowerPoint with smooth Morph animations between slides (compatible with Office 2019 and later).

### Export to Video

Render a deck as MP4 (cinematic or standard speed):

```bash
/morph-deck video --deck ./my-pitch --out ./my-pitch.mp4
```

Records the deck at 60 FPS with audio narration (reads `talkTrack.script` from each stage).

### Bundle for Sharing

Create a self-contained .zip for email or web sharing:

```bash
/morph-deck export --deck ./my-pitch --out ./my-pitch.zip
```

Includes the deck, a static HTML render, and speaker notes.

## Subcommands Reference

- **new** — Scaffold a fresh deck from a prompt or example
- **iterate** — Regenerate or refine slides in an existing deck
- **render** — Start the dev server and live preview
- **pptx** — Export to PowerPoint (.pptx) with Morph transitions
- **video** — Export to MP4 video (30s–5m cinematic)
- **export** — Bundle a deck as a shareable .zip

## Themes

Five built-in themes with complete color palettes, typography, and spacing:

- **stacklink-dark** — Deep blue + cyan; enterprise, data-forward
- **bunq-mint-light** — Mint green + white; fintech, modern
- **linear-light** — Slate + blue; minimal, technical
- **minimal-mono** — Black + white + grays; typographic, editorial
- **playful-poster** — Vibrant multi-color; creative, event-driven

Override any theme with your own token file:

```bash
/morph-deck new --tokens ./my-tokens.json --prompt "Company all-hands"
```

Token JSON shape:

```json
{
  "background": "#ffffff",
  "foreground": "#1a1a1a",
  "mutedForeground": "#666666",
  "border": "#e5e5e5",
  "surfaceBase": "#f5f5f5",
  "surfaceSubtle": "#efefef",
  "surfaceRaised": "#ffffff",
  "success": "#10b981",
  "info": "#3b82f6",
  "warning": "#f59e0b",
  "destructive": "#ef4444",
  "fontDisplay": "'Inter', sans-serif",
  "fontBody": "'Inter', sans-serif",
  "fontMono": "'Fira Code', monospace"
}
```

Or use a visual reference image to auto-extract a palette:

```bash
/morph-deck new --reference ./brand-screenshot.png --prompt "Q1 roadmap"
```

## Primitives

Fourteen composable elements for deck composition:

- **Wordmark** — Logo / product name header
- **Caption** — Eyebrow + headline + sub (always-visible title bar)
- **KPI** — Key performance indicator (value + label pair)
- **Pillar** — Portrait card (name, role, background image)
- **Quote** — Pull quote with attribution
- **ConnectorChip** — Logo badge for integrations (Slack, GitHub, Notion, Linear, Confluence, Jira, OneDrive, Teams, Salesforce, Drive)
- **Card** — Full-width content card (headline, body, optional image)
- **Logo** — Inline logo / brand asset
- **Image** — Photo or diagram with fade-in
- **Diagram** — SVG or PNG architecture diagram
- **OrbitGroup** — Circular arrangement of elements (radial layout)
- **PipelineGroup** — Linear flow diagram (left-to-right process)
- **FooterStrip** — Persistent footer bar (often for slide number or branding)
- **StatGroup** — Multi-stat grid (3–6 metrics in rows)

## Custom Elements

Extend the primitive library with your own components. Two registration paths:

### Convention-Based (Auto-Discovery)

Drop a component into `src/deck/elements/custom/`:

```
your-deck/
  src/deck/
    elements/
      custom/
        MyChart.tsx
```

Filename `MyChart.tsx` auto-derives the element id `myChart`. Use in stages:

```typescript
elements: {
  myChart: { pos: { left: '10%', top: '10%', width: '60%', height: '40%' }, shape: 'chart' }
}
```

### Explicit Registry

Add an entry to `src/deck/elements/customRegistry.ts`:

```typescript
import MyChart from './custom/MyChart';

export const CUSTOM_ELEMENTS: CustomElementEntry[] = [
  {
    id: 'myChart',
    component: MyChart,
    defaultLayout: { pos: { ... }, shape: 'chart' }
  }
];
```

See `plugin/examples/custom-element/` for a complete example.

## Composer (Live API)

The composer is an agentic Claude invocation that takes a brief, tokens, and primitive manifest and produces a complete `stages.ts` + `data.ts`.

How it works:

1. **Input**: brief (plain text), design tokens (JSON), primitive manifest (list of available elements)
2. **Invocation**: spawns the `claude` CLI binary with system prompt (`agents/morph-composer.md`)
3. **Output**: a single JSON object containing `stagesTs` and `dataTs` as strings
4. **Constraints**: 8000 max output tokens, 60-second wall time

The Claude CLI reads your `ANTHROPIC_API_KEY` environment variable. For testing, set `MORPH_DECK_FAKE_CLAUDE=/path/to/stub` to use a stub binary instead.

See `plugin/docs/composer-live.md` for detailed wiring documentation and examples.

## Repository Layout

```
morph-deck-skill/
├── plugin/                      # The installed Claude plugin
│   ├── plugin.json              # Metadata (name, version, entry command)
│   ├── README.md                # This file
│   ├── commands/                # Command definitions
│   │   ├── morph-deck.md        # Router and subcommand help
│   │   ├── new.md
│   │   ├── iterate.md
│   │   ├── render.md
│   │   ├── pptx.md
│   │   ├── video.md
│   │   └── export.md
│   ├── agents/                  # Claude agent prompts
│   │   ├── morph-composer.md    # Composer system prompt
│   │   └── [other agents]
│   ├── scripts/                 # Node.js orchestration scripts
│   │   ├── router.cjs           # Subcommand dispatcher
│   │   ├── composer.cjs         # Claude CLI wrapper
│   │   ├── from-example.cjs     # Example deck copier
│   │   ├── iterate.cjs          # Refinement orchestrator
│   │   ├── token-merger.cjs     # Theme + override merging
│   │   ├── primitive-manifest.cjs # Primitive registry builder
│   │   └── [other scripts]
│   ├── themes/                  # Token JSON files (5 built-in themes)
│   │   ├── stacklink-dark.json
│   │   ├── bunq-mint-light.json
│   │   ├── linear-light.json
│   │   ├── minimal-mono.json
│   │   └── playful-poster.json
│   ├── primitives/              # React components (14 built-in)
│   │   ├── Wordmark.tsx
│   │   ├── Caption.tsx
│   │   ├── KPI.tsx
│   │   ├── Pillar.tsx
│   │   ├── Quote.tsx
│   │   ├── ConnectorChip.tsx
│   │   ├── Card.tsx
│   │   ├── Logo.tsx
│   │   ├── Image.tsx
│   │   ├── Diagram.tsx
│   │   ├── OrbitGroup.tsx
│   │   ├── PipelineGroup.tsx
│   │   ├── FooterStrip.tsx
│   │   ├── StatGroup.tsx
│   │   ├── index.ts
│   │   └── connectors/          # Connector logos
│   ├── examples/                # 10 example decks (templates)
│   │   ├── pitch-5slide/
│   │   ├── launch-cinematic-30s/
│   │   ├── feature-demo/
│   │   ├── kpi-dashboard-tour/
│   │   ├── case-study/
│   │   ├── manifesto/
│   │   ├── release-notes/
│   │   ├── roadmap/
│   │   ├── retro-storyboard/
│   │   ├── team-intro/
│   │   └── custom-element/      # Custom element guide + example
│   ├── generators/              # Output pipeline (pptx, video, etc.)
│   ├── skills/                  # Embedded skills
│   └── __tests__/               # Plugin-level tests
└── scaffold-template/           # Vite + React template for new decks
    ├── src/
    │   ├── deck/
    │   │   ├── stages.ts        # (generated by composer)
    │   │   ├── data.ts          # (generated by composer)
    │   │   ├── elements/        # Primitive renderers
    │   │   ├── pace.ts          # Timing & easing config
    │   │   ├── theme.ts         # Tailwind token mapping
    │   │   └── App.tsx          # Main deck component
    │   └── index.tsx
    ├── vite.config.ts
    ├── tsconfig.json
    └── package.json
```

## Phase 2 (Future)

Deferred features planned for Q3 2026:

- **Vision QA** — LLM review of generated decks against brief (auto-catch misalignments)
- **3D transitions** — Perspective transforms and depth effects (WebGL layer)
- **Live speaker view** — Network-synced presenter display with notes + timer

## Notes

- Decks use **Framer Motion** for FLIP-tracked morphing; elements share `layoutId` across stages for smooth transitions.
- **Tailwind CSS** handles theming; all colors map to token classes (no hex hardcoding).
- **Vite dev server** provides instant HMR; changes to `stages.ts` or `data.ts` reload instantly.
- Composer budget: 8000 output tokens, 60-second wall clock. Decks with >7 main slides or very long talk tracks may approach this limit.
- The video export uses **Playwright** to record the deck at 60 FPS and **FFmpeg** to encode MP4 with audio.
