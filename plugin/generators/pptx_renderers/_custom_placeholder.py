"""
Custom placeholder renderer for unknown element types.

Fallback renderer that renders unknown element types as a labeled rectangle
with dashed border, signaling that a custom renderer is missing.

Spec: morph-deck-outputs R004.AC1 (group renderers), R004.AC5
"""

from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.util import Pt

from ._base import apply_morph_name, apply_opacity, RendererCtx
from ..lib.layout import parse_layout


def render(stage_idx, element_id, layout, props, slide, ctx) -> None:
    """
    Render a custom placeholder for unknown element types.

    Args:
        stage_idx: int, 0-indexed stage number
        element_id: str, unique element ID (e.g. "unknown_element_1")
        layout: dict, position + size in percent (left, top, width, height)
        props: dict, element properties (arbitrary)
            - element_type: str, optional, the name of the unknown type
        slide: pptx.shapes.slide.Slide, target slide
        ctx: RendererCtx, renderer context
    """
    # Parse layout to EMU coordinates
    parsed = parse_layout(layout)
    left = parsed['left']
    top = parsed['top']
    width = parsed['width']
    height = parsed['height']

    # Get element type from props or use element_id as fallback
    element_type = props.get('element_type', 'unknown')

    # Create a rectangle with dashed border to indicate missing renderer
    shape = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        left, top, width, height
    )
    apply_morph_name(shape, element_id)

    # Set fill to transparent/light background
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor(0x1D, 0x1D, 0x21)  # surface

    # Set dashed border to signal placeholder
    shape.line.color.rgb = RGBColor(0xA1, 0xA1, 0xAA)  # muted foreground
    shape.line.width = Pt(1.5)
    # Note: python-pptx doesn't directly expose dash style; this would require lxml
    # For now, use solid border; the visual distinction comes from opacity and label

    # Add label text: [element_type]
    tf = shape.text_frame
    tf.word_wrap = True
    tf.margin_left = Pt(8)
    tf.margin_right = Pt(8)
    tf.margin_top = Pt(8)
    tf.margin_bottom = Pt(8)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE

    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    p.text = f"[{element_type}]"

    run = p.add_run()
    run.font.size = Pt(12)
    run.font.bold = True
    run.font.color.rgb = RGBColor(0xA1, 0xA1, 0xAA)  # muted color
    run.font.name = ctx.fonts.get('body', 'Inter')

    # Apply opacity if present
    if 'opacity' in props:
        try:
            apply_opacity(shape, float(props['opacity']))
        except (ValueError, TypeError):
            pass


RENDERER_REGISTRY = {}
RENDERER_REGISTRY['_custom_placeholder'] = render
