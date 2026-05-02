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

## Performance

### WebGL and 3D Element Recording

When a deck includes 3D elements (e.g., via `Element3D` component with `element3d: true` flag on a stage), the recorder automatically detects this and adjusts its Chromium launch options to capture WebGL canvas content correctly.

**Key settings for 3D decks:**
- **GPU enabled**: The `--disable-gpu` flag is removed, allowing the WebGL renderer to accelerate 3D geometry.
- **Headed off-screen mode**: Chromium is launched with `headless: false` and `--window-position=-32000,-32000` to run off-screen. This pattern allows Playwright's video recorder to capture the compositor output including the WebGL canvas.
- **Frame rate monitoring**: During recording, an on-page requestAnimationFrame counter samples actual frame delivery every 500ms. If the frame rate drops below 24 fps for two consecutive samples, a warning is logged to stderr with suggestions to reduce 3D complexity.

**Performance targets:**
- **Target frame rate**: 30+ fps at 1920x1080 resolution.
- **3D scene complexity**: Up to 1000 points or cubes on a typical laptop without degrading below 24 fps. Scenes with higher vertex counts or complex materials may require optimization.
- **Hardware dependence**: Actual frame rate depends on GPU capabilities. Intel integrated graphics, NVIDIA/AMD discrete GPUs, and mobile processors all exhibit different performance characteristics.

**Optimization suggestions if fps drops below 24:**
- Reduce the number of points/cubes in `Element3D` via the `count` or grid dimensions props.
- Lower rotation speed for animated 3D objects (reduce `rotationSpeed` prop).
- Simplify material properties (e.g., disable metalness/roughness if not essential).
- Consider switching to `--3d-mode static` during export to the PPTX format, which embeds a static image instead of live 3D.

### Non-3D Decks

For decks without 3D elements, the recorder uses standard headless Chromium with `--disable-gpu` for maximum stability on a wide range of systems. 2D morphs and Framer Motion animations are lightweight and typically record at 60+ fps without issues.
