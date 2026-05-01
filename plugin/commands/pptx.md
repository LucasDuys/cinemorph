---
name: pptx
description: Export the active morph-deck deck to PowerPoint .pptx with Morph transitions.
---

Run: `python ${PLUGIN_DIR}/generators/build_pptx.py $DECK_PATH $ARGUMENTS`

Flags:
- `--out <path>` — override default output path (`<deck>/dist/<deck-name>.pptx`)
- `--include-backup` — include Q&A backup stages as hidden slides at the end
- `--speed slow|med|fast` — Morph transition speed (default: med)
- `--embed-fonts` — embed OTF/TTF fonts referenced by the theme
- `--clean` — clean `<deck>/dist/` before export

See `spec-morph-deck-outputs.md` R001-R006 for full behavior.
