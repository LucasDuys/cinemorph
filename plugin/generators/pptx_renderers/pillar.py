"""
Pillar text renderer for PPTX.

Renders a title + body lines (list of bullet points) stacked vertically.
Used for differentiation cards like "01 Sovereign-by-default".
"""

from pptx.util import Pt, Emu
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

from pptx_renderers._base import apply_morph_name, apply_opacity
from pptx_renderers._colors import hex_to_rgb
from lib.layout import resolve_layout
from pptx_renderers import register_renderer


@register_renderer('pillar')
def render(stage_idx, element_id, layout, props, slide, ctx) -> None:
    """
    Render a pillar with title + body lines.

    Args:
        stage_idx: int, 0-indexed stage
        element_id: str, element ID (e.g. "pillar_1")
        layout: dict, position + size in percent {left, top, width, height}
        props: dict, element properties with 'title' and 'body' (list) keys
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
    tf.margin_left = Emu(220000)
    tf.margin_right = Emu(220000)
    tf.margin_top = Emu(160000)
    tf.margin_bottom = Emu(160000)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE

    # Get colors from theme
    fg = hex_to_rgb(ctx.theme.get('foreground', '#FFF'))
    muted_fg = hex_to_rgb(ctx.theme.get('muted_foreground', '#999'))

    # Paragraph 1: title (bold)
    p1 = tf.paragraphs[0]
    p1.alignment = PP_ALIGN.LEFT
    run1 = p1.add_run()
    run1.text = props.get('title', '')
    run1.font.size = Pt(20)
    run1.font.bold = True
    run1.font.color.rgb = fg
    run1.font.name = props.get('title_font_name', 'Inter')

    # Paragraphs 2+: body lines
    body_lines = props.get('body', [])
    for line in body_lines:
        p = tf.add_paragraph()
        p.space_before = Pt(6)
        p.alignment = PP_ALIGN.LEFT
        run = p.add_run()
        run.text = line
        run.font.size = Pt(12)
        run.font.color.rgb = muted_fg
        run.font.name = props.get('body_font_name', 'Inter')

    # Apply opacity if < 1.0 (only works for shapes with fill, not textboxes)
    opacity = layout.get('opacity', 1.0)
    if opacity < 1.0:
        try:
            apply_opacity(tb, opacity)
        except (TypeError, AttributeError):
            # Textboxes don't have fills; opacity is silently ignored
            pass


