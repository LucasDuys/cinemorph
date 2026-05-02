"""
Wordmark text renderer for PPTX.

Renders a single large bold text element (e.g., "Stacklink") centered in layout.
Font size auto-scales by height: hero (>15% of canvas height) gets 96pt;
smaller instances get 16pt. Applies morph name (!!prefix) for Morph tracking.
Opacity applied if < 1.0.
"""

from pptx.util import Pt, Emu
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

from ._base import apply_morph_name, apply_opacity
from ._colors import hex_to_rgb
from ..lib.layout import resolve_layout
from . import register_renderer


@register_renderer('wordmark')
def render(stage_idx, element_id, layout, props, slide, ctx) -> None:
    """
    Render a wordmark shape.

    Args:
        stage_idx: int, 0-indexed stage
        element_id: str, element ID (e.g. "wordmark_1")
        layout: dict, position + size in percent {left, top, width, height}
        props: dict, element properties including 'text'
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
    tf.word_wrap = False
    tf.margin_left = tf.margin_right = Emu(0)
    tf.margin_top = tf.margin_bottom = Emu(0)
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE

    # Add paragraph and run
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    run.text = props.get('text', 'Wordmark')
    run.font.bold = True
    run.font.color.rgb = hex_to_rgb(ctx.theme.get('foreground', '#FFF'))
    run.font.name = props.get('font_name', 'Space Grotesk')

    # Auto-scale font by height ratio
    # Height as percent of canvas (resolved is in EMU, but layout height was in percent)
    height_pct = float(layout.get('height', 0).rstrip('%')) if isinstance(layout.get('height'), str) else 0
    if height_pct > 15:
        run.font.size = Pt(96)
        letter_spacing = -300
    else:
        run.font.size = Pt(16)
        letter_spacing = -50

    # Apply letter spacing via XML
    if letter_spacing:
        run.font._rPr.set("spc", str(letter_spacing))

    # Apply opacity if < 1.0 (only works for shapes with fill, not textboxes)
    opacity = layout.get('opacity', 1.0)
    if opacity < 1.0:
        try:
            apply_opacity(tb, opacity)
        except (TypeError, AttributeError):
            # Textboxes don't have fills; opacity is silently ignored
            pass


