"""
slide_builder.py — Orchestrator for per-stage PPTX slide building.

Per stage, adds a blank slide, iterates elements, dispatches via RENDERER_REGISTRY.
Falls back to _custom_placeholder for unknown element types.

Spec: spec-morph-deck-outputs.md R002 (PPTX slide layout fidelity).
Consumes: generators/lib/layout.py, generators/pptx_renderers/__init__.py (RENDERER_REGISTRY)
Provides: build_slide(), build_all_slides()
"""

from typing import Any, Optional
from pathlib import Path
from pptx import Presentation
from pptx.util import Pt, Emu
from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor

from ..pptx_renderers import RENDERER_REGISTRY
from ..pptx_renderers._base import RendererCtx
from .layout import resolve_layout, LayoutDict


def _custom_placeholder(
    stage_idx: int,
    element_id: str,
    layout: dict,
    props: dict,
    slide: Any,
    ctx: RendererCtx,
) -> None:
    """
    Fallback renderer for unknown element types.

    Emits a TextBox with element_id as placeholder text. Renders at the
    layout position with a simple border and neutral fill.

    Called by build_slide() when element.type is not in RENDERER_REGISTRY.

    Args:
        stage_idx: int, 0-indexed slide number
        element_id: str, unique element identifier
        layout: dict, position + size in percent
        props: dict, element-specific properties (unused here)
        slide: pptx.shapes.shape.Slide, target slide
        ctx: RendererCtx, shared context
    """
    # Parse layout
    parsed = resolve_layout(layout, apply_hidden=False, clamp=True)
    left = Emu(parsed['left'])
    top = Emu(parsed['top'])
    width = Emu(parsed['width'])
    height = Emu(parsed['height'])

    # Create a light-colored rounded rect as placeholder background
    shape = slide.shapes.add_shape(
        MSO_SHAPE.ROUNDED_RECTANGLE,
        left, top, width, height,
    )
    shape.name = f"!!{element_id}"
    shape.adjustments[0] = 0.1  # slight corner radius

    # Neutral fill + border
    shape.fill.solid()
    shape.fill.fore_color.rgb = RGBColor(0x2A, 0x2A, 0x2A)  # dark gray
    shape.line.color.rgb = RGBColor(0x4A, 0x4A, 0x4A)  # lighter border
    shape.line.width = Pt(1)

    # Add text label (element_id) so user knows what's missing
    tf = shape.text_frame
    tf.word_wrap = True
    tf.margin_left = Emu(80000)
    tf.margin_right = Emu(80000)
    tf.margin_top = Emu(60000)
    tf.margin_bottom = Emu(60000)
    p = tf.paragraphs[0]
    run = p.add_run()
    run.text = f"[{element_id}]"
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(0xAA, 0xAA, 0xAA)  # muted label
    run.font.name = "Inter"


def build_slide(
    prs: Presentation,
    stage: dict,
    data: dict,
    ctx: RendererCtx,
) -> Any:
    """
    Build a single slide for a stage.

    Adds a blank slide to the presentation, iterates elements in stage,
    and dispatches each to RENDERER_REGISTRY[element.type] or falls back
    to _custom_placeholder.

    Args:
        prs: pptx.Presentation, the presentation to add slide to
        stage: dict, stage definition with keys:
            - elements: list[dict], each with 'id', 'type', 'layout', 'props'
            - (other fields may be present, ignored here)
        data: dict, global deck data (passed to renderer context)
        ctx: RendererCtx, shared context (theme, fonts, dwell, etc.)

    Returns:
        pptx.shapes.shape.Slide, the newly created slide

    Raises:
        ValueError: if stage.elements is missing or malformed
    """
    # Add a blank slide
    blank_layout = prs.slide_layouts[6]  # 6 = blank
    slide = prs.slides.add_slide(blank_layout)

    # Extract elements list
    elements = stage.get('elements', [])
    if not isinstance(elements, list):
        raise ValueError(f"stage.elements must be a list, got {type(elements)}")

    # Render each element
    for element in elements:
        element_id = element.get('id', 'unknown')
        element_type = element.get('type', 'unknown')
        layout = element.get('layout', {})
        props = element.get('props', {})

        # Dispatch to renderer or fallback
        if element_type in RENDERER_REGISTRY:
            renderer_fn = RENDERER_REGISTRY[element_type]
            renderer_fn(
                stage_idx=ctx.slide_idx,
                element_id=element_id,
                layout=layout,
                props=props,
                slide=slide,
                ctx=ctx,
            )
        else:
            # Unknown type -> placeholder
            _custom_placeholder(
                stage_idx=ctx.slide_idx,
                element_id=element_id,
                layout=layout,
                props=props,
                slide=slide,
                ctx=ctx,
            )

    return slide


def build_all_slides(
    prs: Presentation,
    stages: list[dict],
    data: dict,
    ctx_base: RendererCtx,
) -> list[Any]:
    """
    Build all slides for a deck.

    Iterates stages, updating ctx.slide_idx for each, and calls build_slide().

    Args:
        prs: pptx.Presentation, the presentation to add slides to
        stages: list[dict], all stages from the deck source
        data: dict, global deck data
        ctx_base: RendererCtx, base context (will be updated per slide)

    Returns:
        list of pptx.shapes.shape.Slide objects (same as prs.slides)

    Raises:
        ValueError: if stages is not a list
    """
    if not isinstance(stages, list):
        raise ValueError(f"stages must be a list, got {type(stages)}")

    slides = []
    for idx, stage in enumerate(stages):
        # Update context for this slide
        ctx = RendererCtx(
            theme=ctx_base.theme,
            dwell_ms=ctx_base.dwell_ms,
            slide_idx=idx,
            fonts=ctx_base.fonts,
            dist_dir=ctx_base.dist_dir,
        )

        slide = build_slide(prs, stage, data, ctx)
        slides.append(slide)

    return slides
