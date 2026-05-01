---
name: morph-deck
description: Generate launch-video-style React presentations with shared-layout (FLIP) morph transitions. Subcommands: new, iterate, render, pptx, video, export. Use when the user asks for a pitch deck, launch video, demo storyboard, or any cinematic presentation.
---

# Morph-Deck

Run `node ${PLUGIN_DIR}/scripts/router.cjs $ARGUMENTS` to dispatch the subcommand. The router parses the first positional argument as the subcommand name and forwards the rest. Print `--help` per-subcommand with examples. The router currently delegates each subcommand to a stub handler that prints a "not yet implemented -- see spec-X.md" message; these are wired in by later tasks (T015 new, T017 iterate, T020 render, outputs spec for pptx/video).

## Subcommands

- `new` -- scaffold a fresh deck (T015)
- `iterate` -- regenerate or refine slides in an existing deck (T017)
- `render` -- start the dev server / live preview for a deck (T020)
- `pptx` -- export to PowerPoint (.pptx) -- spec-morph-deck-outputs.md R001-R006
- `video` -- export to MP4 / launch-video format -- spec-morph-deck-outputs.md R007-R010
- `export` -- bundle a deck for sharing -- spec-morph-deck-outputs.md R013

Use `morph-deck <subcommand> --help` for per-subcommand usage and examples.

## Common flags

- `--theme <name>` -- pick a token theme (e.g. `stacklink-dark`, `pitchr-light`)
- `--tokens <path>` -- override theme with a token JSON file
- `--reference <image>` -- visual reference image to anchor the look
- `--prompt "<text>"` -- the brief / story text driving slide generation
- `--out <path>` -- output directory or file path
- `--deck <path>` -- existing deck directory (for `iterate`, `render`, `pptx`, `video`, `export`)
- `--from-example <name>` -- start from a bundled example deck
