"""
Caption text renderer for PPTX.

Renders a two-line caption: eyebrow (small, uppercase, wide tracking) + headline (large bold).
Both lines stack vertically within a single textbox.
"""

from pptx.util import Pt, Emu
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

from ._base import apply_morph_name, apply_opacity
from ._colors import hex_to_rgb
from ..lib.layout import resolve_layout
from . import register_renderer


@register_renderer('caption')
def render(stage_idx, element_id, layout, props, slide, ctx) -> None:
    """
    Render a caption with eyebrow + headline.

    Args:
        stage_idx: int, 0-indexed stage
        element_id: str, element ID (e.g. "caption_1")
        layout: dict, position + size in percent {left, top, width, height}
        props: dict, element properties with 'eyebrow' and 'headline' keys
        slide: pptx.shapes.shape.Slide, target slide
        ctx: RendererCtx, shared context
    """
    # Resolve layout to EMU
    resolved = resolve_layout(layout)
    left = Emu(resolved['left'])
    top = Emu(resolved['top'])
    width = Emu(resolved['width'])
    height = Emu(resolved['height'])

    # Create textbox
    tb = slide.shapes.add_textbox(left, top, width, height)
    apply_morph_name(tb, element_id)

    # Configure text frame
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = Emu(0)
    tf.margin_top = tf.margin_bottom = Emu(0)
    tf.vertical_anchor = MSO_ANCHOR.TOP

    # Get colors from theme
    muted_fg = hex_to_rgb(ctx.theme.get('muted_foreground', '#999'))
    fg = hex_to_rgb(ctx.theme.get('foreground', '#FFF'))

    # Paragraph 1: eyebrow (small, uppercase, wide tracking)
    p1 = tf.paragraphs[0]
    p1.alignment = PP_ALIGN.LEFT
    run1 = p1.add_run()
    run1.text = props.get('eyebrow', '').upper()
    run1.font.size = Pt(10)
    run1.font.color.rgb = muted_fg
    run1.font.name = props.get('eyebrow_font_name', 'JetBrains Mono')
    run1.font._rPr.set("spc", "400")  # wide tracking

    # Paragraph 2: headline (large bold)
    p2 = tf.add_paragraph()
    p2.space_before = Pt(8)
    p2.alignment = PP_ALIGN.LEFT
    run2 = p2.add_run()
    run2.text = props.get('headline', '')
    run2.font.size = Pt(44)
    run2.font.bold = True
    run2.font.color.rgb = fg
    run2.font.name = props.get('headline_font_name', 'Inter')
    run2.font._rPr.set("spc", "-50")  # slightly tight tracking
    p2.line_spacing = 1.05

    # Apply opacity if < 1.0 (only works for shapes with fill, not textboxes)
    opacity = layout.get('opacity', 1.0)
    if opacity < 1.0:
        try:
            apply_opacity(tb, opacity)
        except (TypeError, AttributeError):
            # Textboxes don't have fills; opacity is silently ignored
            pass


