"""
KPI text renderer for PPTX.

Renders a big number (value) + small label stacked vertically.
Used for stat callouts like "1.8h lost per worker / day".
"""

from pptx.util import Pt, Emu
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

from pptx_renderers._base import apply_morph_name, apply_opacity
from pptx_renderers._colors import hex_to_rgb
from lib.layout import resolve_layout
from pptx_renderers import register_renderer


@register_renderer('kpi')
def render(stage_idx, element_id, layout, props, slide, ctx) -> None:
    """
    Render a KPI (big number + small label).

    Args:
        stage_idx: int, 0-indexed stage
        element_id: str, element ID (e.g. "kpi_1")
        layout: dict, position + size in percent {left, top, width, height}
        props: dict, element properties with 'value' and 'label' keys
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
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE

    # Get colors from theme
    fg = hex_to_rgb(ctx.theme.get('foreground', '#FFF'))
    muted_fg = hex_to_rgb(ctx.theme.get('muted_foreground', '#999'))

    # Paragraph 1: big number (value)
    p1 = tf.paragraphs[0]
    p1.alignment = PP_ALIGN.CENTER
    run1 = p1.add_run()
    run1.text = props.get('value', '0')
    run1.font.size = Pt(44)
    run1.font.bold = True
    run1.font.color.rgb = fg
    run1.font.name = props.get('value_font_name', 'Inter')
    p1.line_spacing = 1.0

    # Paragraph 2: small label
    p2 = tf.add_paragraph()
    p2.alignment = PP_ALIGN.CENTER
    run2 = p2.add_run()
    run2.text = props.get('label', '').upper()
    run2.font.size = Pt(10)
    run2.font.color.rgb = muted_fg
    run2.font.name = props.get('label_font_name', 'JetBrains Mono')
    run2.font._rPr.set("spc", "300")  # letter spacing

    # Apply opacity if < 1.0 (only works for shapes with fill, not textboxes)
    opacity = layout.get('opacity', 1.0)
    if opacity < 1.0:
        try:
            apply_opacity(tb, opacity)
        except (TypeError, AttributeError):
            # Textboxes don't have fills; opacity is silently ignored
            pass


