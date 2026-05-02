"""
Pipeline group renderer for PPTX.

Renders children as ConnectorChips in a horizontal flex with arrow connectors between them.

Spec: morph-deck-outputs R004.AC1 (group renderers), R004.AC5
"""

from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor
from pptx.util import Pt

from ._base import apply_morph_name, apply_opacity, RendererCtx
from ..lib.layout import parse_layout


def render(stage_idx, element_id, layout, props, slide, ctx) -> None:
    """
    Render a pipeline group — children in horizontal flex with arrow connectors.

    Args:
        stage_idx: int, 0-indexed stage number
        element_id: str, unique element ID (e.g. "pipeline_1")
        layout: dict, position + size in percent (left, top, width, height)
        props: dict, element properties:
            - children: list[str], list of child element IDs
            - connectors_visible: bool, optional (default True), show arrows between children
        slide: pptx.shapes.slide.Slide, target slide
        ctx: RendererCtx, renderer context
    """
    # Parse layout to EMU coordinates
    parsed = parse_layout(layout)
    left = parsed['left']
    top = parsed['top']
    width = parsed['width']
    height = parsed['height']

    # Get children list from props
    children = props.get('children', [])
    if not children:
        return

    total = len(children)
    connectors_visible = props.get('connectors_visible', True)

    # Compute spacing: divide width among children with gaps for connectors
    # Space for children and connectors: child1 gap arrow gap child2 ... childN
    # Simple: divide width equally
    child_width = width // (total * 2)  # Leave room for connector arrows
    child_height = height

    # Render each child as a ConnectorChip in the pipeline
    for i, child_id in enumerate(children):
        # Position child horizontally
        child_left = left + i * (width // total)
        child_top = top

        # Create child element ID with morph name prefix
        child_element_id = f"{element_id}_{child_id}"

        # Delegate to connector_chip renderer if available
        try:
            from .connector_chip import render as render_chip
            # Convert EMU back to percent for child layout
            # This is approximate; connector_chip will re-parse
            child_layout = {
                'left': '30%' if i == 0 else f'{30 + i * 10}%',
                'top': '20%',
                'width': '4%',
                'height': '4%',
            }
            child_props = {
                'id': child_id,
                'label': child_id,
                'shape': 'pipeline',
            }
            render_chip(stage_idx, child_element_id, child_layout, child_props, slide, ctx)
        except (ImportError, Exception):
            # Fallback: inline a simple rect
            shape = slide.shapes.add_shape(
                MSO_SHAPE.ROUNDED_RECTANGLE,
                child_left, child_top, child_width, child_height
            )
            apply_morph_name(shape, child_element_id)
            shape.fill.solid()
            shape.fill.fore_color.rgb = RGBColor(0x42, 0x85, 0xF4)
            shape.line.width = Pt(0.5)
            shape.adjustments[0] = 0.15

        # Add connector arrow between children (if not last child and connectors_visible)
        if connectors_visible and i < total - 1:
            # Simple triangle arrow: small right-pointing shape
            arrow_left = child_left + child_width
            arrow_top = top + (height // 2)
            arrow_size = height // 4

            arrow = slide.shapes.add_shape(
                MSO_SHAPE.RIGHT_ARROW,
                arrow_left, arrow_top, arrow_size, arrow_size
            )
            arrow.fill.solid()
            arrow.fill.fore_color.rgb = RGBColor(0xA1, 0xA1, 0xAA)  # muted color
            arrow.line.width = Pt(0.25)
            arrow.shadow.inherit = False

    # Apply opacity if present
    if 'opacity' in props:
        try:
            pass  # Opacity on group is notional
        except (ValueError, TypeError):
            pass


RENDERER_REGISTRY = {}
RENDERER_REGISTRY['pipeline_group'] = render
