# /morph-deck video

Records a pitch deck to WebM (Playwright recordVideo).

## Synopsis

```
/morph-deck video [--deck <path>] [--dev]
```

## Description

Launches Chromium at 1920×1080, navigates the deck at `<path>`, and records video as you step through each stage via ArrowRight presses. Dwell times per stage are read from `<deck>/src/deck/stages.json` (or extracted from `stages.ts` as fallback).

## Options

- `--deck <path>` — Deck directory. Defaults to current working directory.
- `--dev` — Run `bun run dev` instead of assuming `dist/` is already built.

## Output

WebM file path printed to stdout. Stored at `<deck>/dist/recordings/<timestamp>.webm`.

## Requirements

- Playwright must be installed (`npm install -D playwright`).
- Deck must have a valid `src/deck/` structure with `stages.json` or `stages.ts`.
- Vite must be configured with a preview script (`bun run preview`).

## Example

```bash
/morph-deck video --deck /path/to/deck --dev
```

Records the deck with live dev server build, stepping through all stages with calculated dwell times.
