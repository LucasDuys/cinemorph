"""
Footer strip shape renderer for PPTX.

Renders a thin horizontal bar at the bottom of the layout area, typically used
for slide footers or bottom navigation elements. Fills with theme surface color.

Spec: morph-deck-outputs R004.AC1 (shape renderers)
"""

from pptx.util import Pt
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor

from ._base import apply_morph_name, apply_opacity, RendererCtx
try:
    from lib.layout import parse_layout
except ImportError:
    from ..lib.layout import parse_layout


def render(stage_idx, element_id, layout, props, slide, ctx) -> None:
    """
    Render a footer strip shape.

    Args:
        stage_idx: int, 0-indexed stage number
        element_id: str, unique element ID (e.g. "footer_strip_1")
        layout: dict, position + size in percent (left, top, width, height)
        props: dict, element properties:
            - text: str, optional footer text
            - bg_color: str (hex), optional background; defaults to theme surface
        slide: pptx.shapes.slide.Slide, target slide
        ctx: RendererCtx, renderer context (theme, fonts, etc.)
    """
    # Parse layout to EMU coordinates
    parsed = parse_layout(layout)
    left = parsed['left']
    top = parsed['top']
    width = parsed['width']
    height = parsed['height']

    # Determine background color
    bg_color = None
    if 'bg_color' in props and props['bg_color']:
        hex_color = props['bg_color'].lstrip('#')
        try:
            bg_color = RGBColor(
                int(hex_color[0:2], 16),
                int(hex_color[2:4], 16),
                int(hex_color[4:6], 16)
            )
        except (ValueError, IndexError):
            bg_color = None

    if bg_color is None:
        # Use theme surface color
        surface = ctx.theme.get('surface', RGBColor(0x1D, 0x1D, 0x21))
        if isinstance(surface, str):
            hex_color = surface.lstrip('#')
            bg_color = RGBColor(
                int(hex_color[0:2], 16),
                int(hex_color[2:4], 16),
                int(hex_color[4:6], 16)
            )
        else:
            bg_color = surface

    # Add rectangle shape (thin bar, typically no border)
    footer = slide.shapes.add_shape(
        MSO_SHAPE.RECTANGLE,
        left, top, width, height
    )

    # Apply morph name for tracking
    apply_morph_name(footer, element_id)

    # Set solid fill
    footer.fill.solid()
    footer.fill.fore_color.rgb = bg_color

    # Remove border (footer strip is typically borderless)
    footer.line.fill.background()

    # Remove shadow
    footer.shadow.inherit = False

    # Add optional text
    if 'text' in props and props['text']:
        tf = footer.text_frame
        tf.word_wrap = False
        tf.margin_left = 120000
        tf.margin_right = 120000
        tf.margin_top = 30000
        tf.margin_bottom = 30000
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE

        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.LEFT
        p.text = ""

        run = p.add_run()
        run.text = props['text']
        run.font.size = Pt(9)
        muted_color = ctx.theme.get('muted_foreground', RGBColor(0xA1, 0xA1, 0xAA))
        if isinstance(muted_color, str):
            hex_color = muted_color.lstrip('#')
            muted_color = RGBColor(
                int(hex_color[0:2], 16),
                int(hex_color[2:4], 16),
                int(hex_color[4:6], 16)
            )
        run.font.color.rgb = muted_color
        run.font.name = ctx.fonts.get('body', 'Inter')

    # Apply opacity if present
    if 'opacity' in props:
        try:
            apply_opacity(footer, float(props['opacity']))
        except (ValueError, TypeError):
            pass  # Ignore invalid opacity


RENDERER_REGISTRY = {}
RENDERER_REGISTRY['footer_strip'] = render
