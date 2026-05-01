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

# ─── Hard imports for the eventual full build ──────────────────────────────
# Imported here so a missing dependency surfaces at scaffold time, not on the
# first real export. Kept deliberately minimal — actual usage lives in T005+.
from pptx import Presentation
from pptx.util import Emu

# ─── Project helpers ───────────────────────────────────────────────────────
# `lib.dist_dir` ships from outputs T001. `lib.deck_source` is this task.
from lib.dist_dir import ensure_dist, artifact_path  # type: ignore
from lib.deck_source import DeckSource, read_deck_source  # type: ignore


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
    return p.parse_args(argv)


# ─── Build pipeline (stubs filled in by T005-T014) ─────────────────────────
def build_presentation(deck: DeckSource, args: argparse.Namespace) -> Presentation:
    """Build a python-pptx Presentation from a DeckSource.

    SCAFFOLD: returns an empty 16:9 presentation. T005 fills in slide layout
    math, T006 wires Morph transitions, T008-T010 plug per-primitive renderers.
    The signature is stable so downstream tasks plug in without rewiring.
    """
    prs = Presentation()
    prs.slide_width = SLIDE_W
    prs.slide_height = SLIDE_H
    # NOTE: slide builders + Morph injection land in outputs T005, T006.
    # We deliberately leave the deck empty here so the scaffold remains
    # importable and `--help` works without depending on unfinished pieces.
    _ = deck  # silence unused-arg warnings until T005
    _ = args
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
