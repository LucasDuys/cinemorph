"""
Image shape renderer for PPTX.

Renders actual images from disk (if path is absolute and exists), or a
placeholder rounded rectangle with alt text if image is missing.

Spec: morph-deck-outputs R004.AC1 (shape renderers)
"""

from pathlib import Path
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
    Render an image or placeholder.

    Args:
        stage_idx: int, 0-indexed stage number
        element_id: str, unique element ID (e.g. "image_1")
        layout: dict, position + size in percent (left, top, width, height)
        props: dict, element properties:
            - src: str, absolute path or relative path to image file
            - alt: str, alt text for placeholder if image not found
        slide: pptx.shapes.slide.Slide, target slide
        ctx: RendererCtx, renderer context (theme, fonts, etc.)
    """
    # Parse layout to EMU coordinates
    parsed = parse_layout(layout)
    left = parsed['left']
    top = parsed['top']
    width = parsed['width']
    height = parsed['height']

    src = props.get('src', '')
    alt_text = props.get('alt', 'Image')

    # Try to load image from absolute path
    image_loaded = False
    if src:
        image_path = Path(src)
        if image_path.is_absolute() and image_path.exists():
            try:
                picture = slide.shapes.add_picture(str(image_path), left, top, width=width, height=height)
                apply_morph_name(picture, element_id)
                image_loaded = True
            except Exception:
                # Image loading failed; fall through to placeholder
                pass

    if not image_loaded:
        # Create placeholder rounded rectangle with alt text
        placeholder = slide.shapes.add_shape(
            MSO_SHAPE.ROUNDED_RECTANGLE,
            left, top, width, height
        )

        # Apply morph name
        apply_morph_name(placeholder, element_id)

        # Set placeholder background (muted surface)
        placeholder.fill.solid()
        muted_bg = ctx.theme.get('muted_foreground', RGBColor(0xA1, 0xA1, 0xAA))
        if isinstance(muted_bg, str):
            hex_color = muted_bg.lstrip('#')
            muted_bg = RGBColor(
                int(hex_color[0:2], 16),
                int(hex_color[2:4], 16),
                int(hex_color[4:6], 16)
            )
        placeholder.fill.fore_color.rgb = muted_bg

        # Set subtle border
        border_color = ctx.theme.get('border', RGBColor(0x27, 0x27, 0x2A))
        if isinstance(border_color, str):
            border_hex = border_color.lstrip('#')
            border_color = RGBColor(
                int(border_hex[0:2], 16),
                int(border_hex[2:4], 16),
                int(border_hex[4:6], 16)
            )
        placeholder.line.color.rgb = border_color
        placeholder.line.width = Pt(1)

        # Set corner radius
        placeholder.adjustments[0] = 0.10

        # Remove shadow
        placeholder.shadow.inherit = False

        # Add alt text to placeholder
        tf = placeholder.text_frame
        tf.word_wrap = True
        tf.margin_left = 120000
        tf.margin_right = 120000
        tf.margin_top = 60000
        tf.margin_bottom = 60000
        tf.vertical_anchor = MSO_ANCHOR.MIDDLE

        p = tf.paragraphs[0]
        p.alignment = PP_ALIGN.CENTER
        p.text = ""

        run = p.add_run()
        run.text = alt_text
        run.font.size = Pt(12)
        run.font.italic = True
        run.font.color.rgb = RGBColor(0x5A, 0x5A, 0x5A)
        run.font.name = ctx.fonts.get('body', 'Inter')

        # Apply opacity if present
        if 'opacity' in props:
            try:
                apply_opacity(placeholder, float(props['opacity']))
            except (ValueError, TypeError):
                pass  # Ignore invalid opacity


RENDERER_REGISTRY = {}
RENDERER_REGISTRY['image'] = render
