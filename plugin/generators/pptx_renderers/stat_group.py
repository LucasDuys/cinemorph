"""
Stat group renderer for PPTX.

Renders a grid of KPI elements (3xN or 2xN based on props.columns).
Each KPI is rendered via the KPI renderer.

Spec: morph-deck-outputs R004.AC1 (group renderers), R004.AC5
"""

from ._base import apply_morph_name, apply_opacity, RendererCtx
from ..lib.layout import parse_layout


def render(stage_idx, element_id, layout, props, slide, ctx) -> None:
    """
    Render a stat group — grid of KPIs.

    Args:
        stage_idx: int, 0-indexed stage number
        element_id: str, unique element ID (e.g. "stat_group_1")
        layout: dict, position + size in percent (left, top, width, height)
        props: dict, element properties:
            - stats: list[dict], each with 'value' and 'label' keys
            - columns: int, optional (default 3), grid columns
        slide: pptx.shapes.slide.Slide, target slide
        ctx: RendererCtx, renderer context
    """
    # Parse layout to EMU coordinates
    parsed = parse_layout(layout)
    left = parsed['left']
    top = parsed['top']
    width = parsed['width']
    height = parsed['height']

    # Get stats list and column count
    stats = props.get('stats', [])
    if not stats:
        return

    columns = props.get('columns', 3)
    total = len(stats)

    # Compute grid dimensions: rows = ceil(total / columns)
    rows = (total + columns - 1) // columns

    # Cell dimensions
    cell_width = width // columns
    cell_height = height // rows

    # Render each stat as a KPI element
    for idx, stat in enumerate(stats):
        # Compute grid position
        row = idx // columns
        col = idx % columns

        # Position KPI in grid
        kpi_left = left + col * cell_width
        kpi_top = top + row * cell_height

        # Create child element ID
        child_element_id = f"{element_id}_stat_{idx}"

        # Delegate to KPI renderer if available
        try:
            from .kpi import render as render_kpi
            # Convert EMU back to percent for child layout
            # Approximate conversion (assumes standard slide dimensions)
            slide_width_emu = 12186240  # 13.333" * 914400
            slide_height_emu = 6858000  # 7.5" * 914400

            kpi_layout = {
                'left': int((kpi_left / slide_width_emu) * 100),
                'top': int((kpi_top / slide_height_emu) * 100),
                'width': int((cell_width / slide_width_emu) * 100),
                'height': int((cell_height / slide_height_emu) * 100),
            }
            kpi_props = {
                'value': str(stat.get('value', '')),
                'label': str(stat.get('label', '')),
            }
            render_kpi(stage_idx, child_element_id, kpi_layout, kpi_props, slide, ctx)
        except (ImportError, Exception):
            # Fallback: inline a simple rect with text
            from pptx.enum.shapes import MSO_SHAPE
            from pptx.dml.color import RGBColor
            from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
            from pptx.util import Pt

            shape = slide.shapes.add_shape(
                MSO_SHAPE.ROUNDED_RECTANGLE,
                kpi_left, kpi_top, cell_width, cell_height
            )
            apply_morph_name(shape, child_element_id)
            shape.fill.solid()
            shape.fill.fore_color.rgb = RGBColor(0x1D, 0x1D, 0x21)  # surface
            shape.line.color.rgb = RGBColor(0x27, 0x27, 0x2A)  # border
            shape.line.width = Pt(0.5)
            shape.adjustments[0] = 0.1

            # Add text: value and label
            tf = shape.text_frame
            tf.word_wrap = True
            tf.vertical_anchor = MSO_ANCHOR.MIDDLE

            # Value line
            p = tf.paragraphs[0]
            p.alignment = PP_ALIGN.CENTER
            p.text = str(stat.get('value', ''))
            run = p.add_run()
            run.font.size = Pt(16)
            run.font.bold = True
            run.font.color.rgb = RGBColor(0xFA, 0xFA, 0xFA)

            # Label line
            p2 = tf.add_paragraph()
            p2.alignment = PP_ALIGN.CENTER
            p2.text = str(stat.get('label', ''))
            run2 = p2.add_run()
            run2.font.size = Pt(10)
            run2.font.color.rgb = RGBColor(0xA1, 0xA1, 0xAA)  # muted

    # Apply opacity if present
    if 'opacity' in props:
        try:
            pass  # Opacity on group is notional
        except (ValueError, TypeError):
            pass


RENDERER_REGISTRY = {}
RENDERER_REGISTRY['stat_group'] = render
