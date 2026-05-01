r"""
layout.py — PPTX slide layout math: percent to EMU conversion, position parsing,
hidden anchor placement, bounds clamping.

Mirrors C:\dev\stacklink-pitch-roundone\build_pptx.py layout logic.
Provides reusable primitives for per-stage slide building.

Spec: spec-morph-deck-outputs.md R002 (PPTX slide layout fidelity).
"""

from typing import Literal, TypedDict, Optional
from pptx.util import Emu

# ─── Canvas constants (16:9 widescreen) ────────────────────────────────────
EMU_PER_INCH = 914400

SLIDE_W_IN = 13.333  # inches
SLIDE_H_IN = 7.5     # inches

SLIDE_W_EMU = int(SLIDE_W_IN * EMU_PER_INCH)
SLIDE_H_EMU = int(SLIDE_H_IN * EMU_PER_INCH)


# ─── Type definitions ──────────────────────────────────────────────────────
class LayoutDict(TypedDict, total=False):
    """Position and size dict, all fields optional percentages or EMU values."""
    left: Optional[str]      # e.g. "50%"
    top: Optional[str]       # e.g. "50%"
    width: Optional[str]     # e.g. "20%"
    height: Optional[str]    # e.g. "10%"


class ParsedLayout(TypedDict):
    """Parsed layout with all values in EMU."""
    left: int
    top: int
    width: int
    height: int


# ─── Conversion helpers ────────────────────────────────────────────────────
def pct_to_emu(pct_str: str, axis: Literal['x', 'y']) -> int:
    """
    Convert a percentage string to EMU units.

    Args:
        pct_str: str, percentage as "50%" or raw float/int "50"
        axis: 'x' or 'y', determines slide dimension to use

    Returns:
        int, EMU units

    Raises:
        ValueError: if pct_str cannot be parsed as a float
    """
    # Remove '%' if present and parse
    if isinstance(pct_str, str) and pct_str.endswith('%'):
        pct_str = pct_str[:-1]

    try:
        pct = float(pct_str)
    except (ValueError, TypeError):
        raise ValueError(f"cannot parse percentage: {pct_str}")

    # Clamp to 0-100 (allow slight overage for bounds-checking downstream)
    pct = max(0.0, min(pct, 100.0))

    # Convert based on axis
    if axis == 'x':
        return int(SLIDE_W_EMU * (pct / 100.0))
    elif axis == 'y':
        return int(SLIDE_H_EMU * (pct / 100.0))
    else:
        raise ValueError(f"axis must be 'x' or 'y', got {axis}")


def parse_layout(layout: LayoutDict) -> ParsedLayout:
    """
    Parse a layout dict with percentage strings to EMU coordinates.

    All fields (left, top, width, height) are assumed to be percentages
    (with or without '%' suffix). Missing fields default to 0.

    Args:
        layout: dict with optional 'left', 'top', 'width', 'height' keys

    Returns:
        ParsedLayout with all values in EMU

    Raises:
        ValueError: if any field cannot be parsed
    """
    return ParsedLayout(
        left=pct_to_emu(layout.get('left', 0), 'x'),
        top=pct_to_emu(layout.get('top', 0), 'y'),
        width=pct_to_emu(layout.get('width', 0), 'x'),
        height=pct_to_emu(layout.get('height', 0), 'y'),
    )


def apply_centering_for_hidden(layout: ParsedLayout) -> ParsedLayout:
    """
    Apply hidden anchor transformation: if width==0 and height==0,
    position at slide center and keep size at 0.

    This creates the invisible Morph target mentioned in build_pptx.py's
    add_hidden_anchor() pattern. Shape will be 1x1 EMU at center.

    Args:
        layout: ParsedLayout dict

    Returns:
        Modified ParsedLayout with center position if hidden, else unchanged
    """
    if layout['width'] == 0 and layout['height'] == 0:
        # Hidden anchor: place at center, use minimal size for safety
        return ParsedLayout(
            left=SLIDE_W_EMU // 2,
            top=SLIDE_H_EMU // 2,
            width=1,
            height=1,
        )
    return layout


def clamp_to_slide_bounds(layout: ParsedLayout) -> ParsedLayout:
    """
    Guard against off-slide elements by clamping to slide boundaries.

    Does NOT clip; merely ensures left/top >= 0 and
    left+width <= SLIDE_W_EMU, top+height <= SLIDE_H_EMU.

    Args:
        layout: ParsedLayout dict

    Returns:
        Clamped ParsedLayout
    """
    left = max(0, min(layout['left'], SLIDE_W_EMU))
    top = max(0, min(layout['top'], SLIDE_H_EMU))

    # Clamp width so left + width doesn't exceed slide
    width = min(layout['width'], SLIDE_W_EMU - left)
    width = max(0, width)

    # Clamp height so top + height doesn't exceed slide
    height = min(layout['height'], SLIDE_H_EMU - top)
    height = max(0, height)

    return ParsedLayout(left=left, top=top, width=width, height=height)


# ─── Combined pipeline ─────────────────────────────────────────────────────
def resolve_layout(
    layout: LayoutDict,
    apply_hidden: bool = False,
    clamp: bool = True,
) -> ParsedLayout:
    """
    Full layout resolution pipeline: parse -> optionally apply hidden anchor
    centering -> optionally clamp to bounds.

    Args:
        layout: dict with percent strings
        apply_hidden: bool, apply centering for hidden anchors (default False)
        clamp: bool, clamp to slide bounds (default True)

    Returns:
        ParsedLayout in EMU with all transforms applied
    """
    parsed = parse_layout(layout)
    if apply_hidden:
        parsed = apply_centering_for_hidden(parsed)
    if clamp:
        parsed = clamp_to_slide_bounds(parsed)
    return parsed
