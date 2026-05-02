"""build_pptx.py — entry point for the PPTX exporter.

Spec: spec-morph-deck-outputs.md R001 (PPTX exporter invocation).

This is the SCAFFOLD task (outputs T002). It wires the CLI surface and the
deck-source read path. Actual slide building (layout math, shape placement,
Morph transition injection) lands in outputs T005-T010.

Reference proof: C:/dev/stacklink-pitch-roundone/build_pptx.py — a working
570-line manual port for the Stacklink deck. EMU constants and the
`add_morph_transition` helper here are forward-compatible with that port.
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path
from typing import Any

# ─── Module setup for relative imports ─────────────────────────────────────
# When run as a script, add plugin/ and generators/ to sys.path so that:
# - `from generators.lib import ...` works from outside
# - relative imports from lib.slide_builder work (..pptx_renderers)
_GENERATORS_DIR = Path(__file__).parent
_PLUGIN_DIR = _GENERATORS_DIR.parent
for _dir in [str(_PLUGIN_DIR), str(_GENERATORS_DIR)]:
    if _dir not in sys.path:
        sys.path.insert(0, _dir)

# ─── Hard imports for the eventual full build ──────────────────────────────
# Imported here so a missing dependency surfaces at scaffold time, not on the
# first real export.
from pptx import Presentation
from pptx.util import Emu

# ─── Project helpers ───────────────────────────────────────────────────────
# Imports from generators package so relative imports in lib/ and pptx_renderers/ work.
# `lib.dist_dir` ships from outputs T001. `lib.deck_source` is this task.
# T005+ supplies slide_builder (layout math, element dispatch).
# T006 supplies morph_xml (Morph transition injection).
# T013 supplies speaker_notes (talk-track assembly).
# oT005 supplies layout helpers (resolve_layout, LayoutDict).
from generators.lib.dist_dir import ensure_dist, artifact_path  # type: ignore
from generators.lib.deck_source import DeckSource, read_deck_source  # type: ignore
from generators.lib.slide_builder import build_all_slides  # type: ignore
from generators.lib.morph_xml import inject_morph_into_all_slides  # type: ignore
from generators.lib.speaker_notes import apply_notes_to_all  # type: ignore
from generators.pptx_renderers._base import RendererCtx  # type: ignore


# ─── Canvas dimensions (16:9 widescreen) ───────────────────────────────────
# Kept here so callers and tests can import them without pulling layout math.
# T005 will move these into lib/layout.py and import them back; for now they
# live module-level on build_pptx as the single source of truth.
#
# We use exact EMU values rather than float-derived (`int(13.333 * 914400)`
# truncates to 12,191,695). PowerPoint stores 16:9 widescreen as 12,192,000 ×
# 6,858,000 EMU (= 13.333… × 7.5 inches), so we hard-code the canonical values.
SLIDE_W = Emu(12192000)  # 13.333…" × 914,400 EMU/inch
SLIDE_H = Emu(6858000)   # 7.5"      × 914,400 EMU/inch
SLIDE_W_IN = 12192000 / 914400  # ≈ 13.333…
SLIDE_H_IN = 6858000 / 914400   # = 7.5


# ─── CLI ────────────────────────────────────────────────────────────────────
def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse CLI arguments for `build_pptx.py`.

    R001.AC1: positional <deck_path>; reads stages/data/tokens from there.
    R001.AC2: --out overrides the default output path.
    R001.AC3: --include-backup includes Q&A backup stages as hidden slides.
    R003.AC3: --speed slow|med|fast picks the Morph transition speed.
    R012/R014: --embed-fonts and --clean wired here for downstream tasks.
    """
    p = argparse.ArgumentParser(
        prog="build_pptx",
        description=(
            "Export a generated morph-deck deck to PowerPoint .pptx with "
            "Morph transitions."
        ),
        epilog=(
            "Examples:\n"
            "  python build_pptx.py ./decks/stacklink-pitch\n"
            "  python build_pptx.py ./decks/stacklink-pitch --out ~/Desktop/talk.pptx\n"
            "  python build_pptx.py ./decks/stacklink-pitch --include-backup --speed slow\n"
            "  python build_pptx.py ./decks/stacklink-pitch --clean --embed-fonts\n"
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument(
        "deck_path",
        type=Path,
        help="Path to a generated deck directory (contains src/deck/{stages,data,tokens}.{ts,json}).",
    )
    p.add_argument(
        "--out",
        type=Path,
        default=None,
        help="Override output path (default: <deck>/dist/<deck-name>.pptx).",
    )
    p.add_argument(
        "--include-backup",
        action="store_true",
        default=False,
        help=(
            "Include Q&A backup stages as hidden slides at the end of the deck "
            "(default: omitted; with this flag, included as hidden)."
        ),
    )
    p.add_argument(
        "--speed",
        choices=("slow", "med", "fast"),
        default="med",
        help="Morph transition speed (default: med).",
    )
    p.add_argument(
        "--embed-fonts",
        action="store_true",
        default=False,
        help="Embed referenced OTF/TTF font files in the .pptx (default: off).",
    )
    p.add_argument(
        "--clean",
        action="store_true",
        default=False,
        help="Clean <deck>/dist/ before export (default: off).",
    )
    p.add_argument(
        "--3d-mode",
        choices=("static", "hidden"),
        default="static",
        help="3D element rendering mode: static (embed PNG), hidden (skip). Default: static.",
    )
    return p.parse_args(argv)


# ─── Build pipeline ────────────────────────────────────────────────────────
def build_presentation(deck: DeckSource, args: argparse.Namespace) -> Presentation:
    """Build a python-pptx Presentation from a DeckSource.

    Wires the full pipeline:
    1. Create 16:9 Presentation.
    2. Call build_all_slides() to render all stages (dispatches to RENDERER_REGISTRY).
    3. Inject Morph transitions via inject_morph_into_all_slides().
    4. Apply speaker notes from talkTrack if present.
    5. Return populated Presentation ready to save.

    Spec: R001 (PPTX export), R002 (slide layout), R003 (Morph transitions),
    R005 (speaker notes).

    Args:
        deck: DeckSource with stages, data, tokens read from filesystem.
        args: argparse.Namespace with speed, include_backup flags.

    Returns:
        pptx.Presentation with all slides built, morphs injected, notes applied.
    """
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H

    # All stages produce slides. Backup stages are rendered regardless of the flag.
    # The --include-backup flag may be used for future visibility control if needed.
    stages = deck.stages

    # Build context for renderers
    dist_dir = artifact_path(deck.path, "").parent
    ctx = RendererCtx(
        theme=deck.tokens,  # brand tokens: colors, fonts, spacing
        dwell_ms=0,  # per-slide dwell set by speaker_notes if talkTrack present
        slide_idx=0,  # build_all_slides updates this per slide
        fonts={},  # fonts map will be populated by renderers as needed
        dist_dir=Path(dist_dir),
    )

    # Thread 3D mode through context so element3d renderer can access it
    ctx.theme['3d_mode'] = args.__dict__.get('3d_mode', 'static')

    # Build all slides (dispatches elements via RENDERER_REGISTRY)
    slides = build_all_slides(prs, stages, deck.data, ctx)

    # Inject Morph transitions into all slides (Spec R003.AC4)
    inject_morph_into_all_slides(prs, mode="byObject", speed=args.speed)

    # Apply speaker notes from talkTrack if stages have scripts (Spec R005)
    if slides and any(s.get("talkTrack", {}).get("script") for s in stages):
        apply_notes_to_all(slides, stages)

    return prs


def main(argv: list[str] | None = None) -> int:
    """Entry point. Returns process exit code (0 = success)."""
    args = parse_args(argv)

    deck_path = args.deck_path
    if not deck_path.exists():
        print(f"error: deck path does not exist: {deck_path}", file=sys.stderr)
        return 2
    if not deck_path.is_dir():
        print(f"error: deck path is not a directory: {deck_path}", file=sys.stderr)
        return 2

    try:
        deck = read_deck_source(deck_path)
    except FileNotFoundError as e:
        print(f"error: {e}", file=sys.stderr)
        return 2

    ensure_dist(deck.path, clean=args.clean)

    prs = build_presentation(deck, args)

    out = args.out if args.out is not None else artifact_path(deck.path, f"{deck.name}.pptx")
    out = Path(out)
    out.parent.mkdir(parents=True, exist_ok=True)
    prs.save(str(out))
    print(f"wrote {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
