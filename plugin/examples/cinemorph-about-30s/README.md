# Cinemorph about 30s — example

A 30-second cinematic where **Cinemorph tells its own story**. Seven scenes, one canvas, no cuts.

> The same artefact powers the GitHub Pages site at https://lucasduys.github.io/cinemorph — that page is the deck rendered live in CSS, the example below is the deck rendered through the full Vite + React + audio-bus engine so it can also export to MP4 and PPTX.

## Generate

```bash
/cinemorph new --from-example cinemorph-about-30s --out my-cinemorph-film
cd my-cinemorph-film
bun install && bun run dev   # → http://localhost:5173
#                              ?dev=1 for the timeline scrubber
```

## Render to MP4

```bash
/cinemorph video --out cinemorph-about.mp4
```

## What's bundled

- `brief.md` — full creative brief, scene-by-scene
- `stages.ts` — per-scene element layouts (the FLIP-tracked persistent layer)
- `data.ts` — copy and code samples shown on screen
- `tokens.ts` — the **Aperture** theme: warm cream paper, deep ink, vermillion + chrome-yellow accents

## Theme: Aperture

Aperture is the cinema-flavoured counterpart to `stacklink-dark`: a near-paper background instead of near-black, vermillion and chrome-yellow accents instead of violet and cyan. Inspired by Letterboxd, A24, and Kodak film leader.
