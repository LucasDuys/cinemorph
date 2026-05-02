"""
Orbit group renderer for PPTX.

Renders children as ConnectorChips arranged in a circle around the layout center.
Each child becomes a small ConnectorChip with its own !!{element_id}_{child_id} name.

Spec: morph-deck-outputs R004.AC1 (group renderers), R004.AC5
"""

import math
from pptx.util import Emu

from ._base import apply_morph_name, apply_opacity, RendererCtx
from ..lib.layout import parse_layout


def render(stage_idx, element_id, layout, props, slide, ctx) -> None:
    """
    Render an orbit group — children arranged in a circle.

    Args:
        stage_idx: int, 0-indexed stage number
        element_id: str, unique element ID (e.g. "orbit_1")
        layout: dict, position + size in percent (left, top, width, height)
            The center and radius are derived from this bounding box.
        props: dict, element properties:
            - children: list[str], list of child element IDs to place
        slide: pptx.shapes.slide.Slide, target slide
        ctx: RendererCtx, renderer context
    """
    # Parse layout to EMU coordinates
    parsed = parse_layout(layout)
    left = parsed['left']
    top = parsed['top']
    width = parsed['width']
    height = parsed['height']

    # Compute center and radius
    center_x = left + width // 2
    center_y = top + height // 2
    radius = min(width, height) // 2

    # Get children list from props
    children = props.get('children', [])
    if not children:
        return

    total = len(children)

    # Render each child as a small ConnectorChip in orbit
    for i, child_id in enumerate(children):
        # Compute angle: start at top (-pi/2), then rotate clockwise
        angle = (i / total) * (2 * math.pi) - math.pi / 2

        # Compute position on circle
        child_x = int(center_x + radius * math.cos(angle))
        child_y = int(center_y + radius * math.sin(angle))

        # Child chip size: small square (assume 5% of slide width, derived from reference)
        # From build_pptx.py: orbit chips are 5x5% of slide
        # We'll use a proportional size: chip width = radius * 0.3 (empirical)
        chip_size = max(Emu(100000), radius // 3)

        # Position the chip center at (child_x, child_y), so offset by half-width
        chip_left = child_x - chip_size // 2
        chip_top = child_y - chip_size // 2

        # Create child element ID with morph name prefix
        child_element_id = f"{element_id}_{child_id}"

        # Delegate to connector_chip renderer if available, else inline a simple rect
        try:
            from .connector_chip import render as render_chip
            child_layout = {
                'left': int(chip_left / ctx.theme.get('_slide_width_emu', 12186240)) * 100 / 100.0,
                'top': int(chip_top / ctx.theme.get('_slide_height_emu', 6858000)) * 100 / 100.0,
                'width': int(chip_size / ctx.theme.get('_slide_width_emu', 12186240)) * 100 / 100.0,
                'height': int(chip_size / ctx.theme.get('_slide_height_emu', 6858000)) * 100 / 100.0,
            }
            child_props = {
                'id': child_id,
                'label': child_id,
            }
            render_chip(stage_idx, child_element_id, child_layout, child_props, slide, ctx)
        except (ImportError, Exception):
            # Fallback: inline a tiny rect with text
            from pptx.enum.shapes import MSO_SHAPE
            from pptx.dml.color import RGBColor
            from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
            from pptx.util import Pt

            shape = slide.shapes.add_shape(
                MSO_SHAPE.ROUNDED_RECTANGLE,
                chip_left, chip_top, chip_size, chip_size
            )
            apply_morph_name(shape, child_element_id)
            shape.fill.solid()
            shape.fill.fore_color.rgb = RGBColor(0x42, 0x85, 0xF4)  # default blue
            shape.line.width = Pt(0.5)
            shape.adjustments[0] = 0.15

            # Add label text
            tf = shape.text_frame
            tf.vertical_anchor = MSO_ANCHOR.MIDDLE
            p = tf.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER
            p.text = child_id[:1].upper()
            run = p.add_run()
            run.font.size = Pt(8)
            run.font.bold = True
            run.font.color.rgb = RGBColor(0xFA, 0xFA, 0xFA)

    # Apply opacity if present
    if 'opacity' in props:
        try:
            # Note: opacity on group is notional; individual children carry theirs
            pass
        except (ValueError, TypeError):
            pass


RENDERER_REGISTRY = {}
RENDERER_REGISTRY['orbit_group'] = render
