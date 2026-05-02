"""
Element3D shape renderer for PPTX.

Renders 3D elements (from Element3D primitives) as static PNG fallbacks in PowerPoint.
WebGL 3D content degrades gracefully: a single frame is captured from the live preview
and embedded as an image at the element's bounding box.

Spec: spec-morph-deck-verifier.md R010
- AC1: Captures static PNG via stage_capture.capture_stage_png, embeds via add_picture
- AC2: Uses playwright.sync_api (same headless Chromium pipeline as outputs R002)
- AC3: Fade transition between 3D elements (not Morph — documented as known limitation)
- AC4: --3d-mode flag: static (default, embed PNG) or hidden (skip + slide note)

Known limitation:
    PowerPoint does not support true morphing of 3D objects. When transitioning
    between two Element3D elements in PPTX, a fade transition is applied as a
    fallback. This is less cinematic than the live morph in the web version.
"""

import io
import tempfile
from pathlib import Path
from typing import Optional

from pptx.util import Pt, Emu
from pptx.enum.dml import MSO_THEME_COLOR
from pptx.dml.color import RGBColor

from ._base import apply_morph_name, RendererCtx

try:
    from generators.lib.stage_capture import capture_stage_png
except ImportError:
    try:
        from ..lib.stage_capture import capture_stage_png
    except ImportError:
        capture_stage_png = None


def render(stage_idx, element_id, layout, props, slide, ctx) -> None:
    """
    Render a 3D element to PPTX.

    In static mode (default): captures a PNG of the 3D stage and embeds it as a picture.
    In hidden mode: skips rendering and adds a note to the slide.

    Args:
        stage_idx: int, 0-indexed stage number
        element_id: str, unique element ID (e.g. "element3d_1")
        layout: dict, position + size in percent:
            {'left': {'value': N, 'unit': '%'}, 'top': {...}, 'width': {...}, 'height': {...}}
        props: dict, element properties:
            - geometry: 'sphere' | 'box' | 'orbit-points' | 'lattice' | 'custom'
            - material: dict with color, opacity, metalness, roughness
            - layoutId: str, morph layout ID
            - 3d_mode: 'static' (default) | 'hidden' (optional, overrides global flag)
        slide: pptx.shapes.slide.Slide, target slide
        ctx: RendererCtx, renderer context (theme, fonts, dist_dir, etc.)
    """
    # Determine the 3D mode (per-element, fallback to context, then default)
    mode_3d = props.get('3d_mode') or ctx.theme.get('3d_mode', 'static')

    if mode_3d == 'hidden':
        # Skip rendering; add a note instead
        _add_omitted_note(slide, element_id)
        return

    # Static mode: capture and embed
    if capture_stage_png is None:
        # If stage_capture module is not available (playwright missing),
        # add a note and skip
        _add_omitted_note(slide, element_id, reason="playwright not installed")
        return

    # Parse layout to EMU coordinates
    try:
        parsed = _parse_layout_percent(layout)
    except Exception:
        # Invalid layout; add a note and skip
        _add_omitted_note(slide, element_id, reason="invalid layout")
        return

    left = parsed['left']
    top = parsed['top']
    width = parsed['width']
    height = parsed['height']

    # Capture the stage as PNG
    try:
        # Bounding box for capture (in pixels, assuming 1920x1080 viewport)
        # Convert from EMU to pixels
        # EMU = English Metric Units; PowerPoint slide is 12192000 x 6858000 EMU = 1920x1080 logical pixels
        slide_w_emu = ctx.theme.get('slide_width', 12192000)
        slide_h_emu = ctx.theme.get('slide_height', 6858000)
        viewport_w = 1920
        viewport_h = 1080

        # Convert EMU coords to pixel coords
        left_px = int(left * viewport_w / slide_w_emu)
        top_px = int(top * viewport_h / slide_h_emu)
        width_px = int(width * viewport_w / slide_w_emu)
        height_px = int(height * viewport_h / slide_h_emu)

        # Clamp to viewport bounds
        left_px = max(0, min(left_px, viewport_w - 1))
        top_px = max(0, min(top_px, viewport_h - 1))
        width_px = max(1, min(width_px, viewport_w - left_px))
        height_px = max(1, min(height_px, viewport_h - top_px))

        bounding_box = {
            'left': left_px,
            'top': top_px,
            'width': width_px,
            'height': height_px,
        }

        png_bytes = capture_stage_png(
            deck_path=ctx.dist_dir.parent.parent,  # Go up from dist/ to deck root
            stage_index=stage_idx,
            bounding_box=bounding_box,
        )

        # Embed the PNG in the slide
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
            tmp.write(png_bytes)
            tmp_path = tmp.name

        try:
            picture = slide.shapes.add_picture(tmp_path, left, top, width=width, height=height)
            apply_morph_name(picture, element_id)
        finally:
            # Clean up temp file
            Path(tmp_path).unlink(missing_ok=True)

    except Exception as e:
        # Capture failed; add a note instead
        _add_omitted_note(slide, element_id, reason=str(e))


def _parse_layout_percent(layout: dict) -> dict:
    """
    Parse a layout dict with percent values to EMU.

    Args:
        layout: dict with keys left, top, width, height
               each value is {'value': N, 'unit': '%'}

    Returns:
        dict with keys left, top, width, height (all in EMU)

    Raises:
        ValueError: If layout is invalid
    """
    # Standard PowerPoint slide dimensions in EMU
    SLIDE_W_EMU = 12192000
    SLIDE_H_EMU = 6858000

    parsed = {}

    for key in ['left', 'top']:
        spec = layout.get(key, {})
        if isinstance(spec, dict):
            value = spec.get('value', 0)
            unit = spec.get('unit', '%')
            if unit == '%':
                parsed[key] = int(value / 100.0 * SLIDE_W_EMU) if key == 'left' else int(value / 100.0 * SLIDE_H_EMU)
            else:
                parsed[key] = int(value)
        else:
            parsed[key] = 0

    for key in ['width', 'height']:
        spec = layout.get(key, {})
        if isinstance(spec, dict):
            value = spec.get('value', 10)
            unit = spec.get('unit', '%')
            if unit == '%':
                parsed[key] = int(value / 100.0 * SLIDE_W_EMU) if key == 'width' else int(value / 100.0 * SLIDE_H_EMU)
            else:
                parsed[key] = int(value)
        else:
            parsed[key] = int(SLIDE_W_EMU * 0.1) if key == 'width' else int(SLIDE_H_EMU * 0.1)

    return parsed


def _add_omitted_note(slide, element_id: str, reason: str = "") -> None:
    """
    Add a note to the slide indicating the 3D element was omitted.

    Args:
        slide: pptx.shapes.slide.Slide
        element_id: str, element ID for reference
        reason: str, optional reason for omission
    """
    note_text = f"3D element omitted: {element_id}"
    if reason:
        note_text += f" ({reason})"

    # Access the notes slide
    if hasattr(slide, 'notes_slide') and slide.notes_slide is not None:
        notes_frame = slide.notes_slide.notes_text_frame
        notes_frame.text = note_text


# Register the renderer
def _register():
    """Register this renderer in the global RENDERER_REGISTRY."""
    try:
        from . import __init__ as registry_module
        registry_module.RENDERER_REGISTRY['element3d'] = render
    except (ImportError, AttributeError):
        # Fallback: register directly via module-level registry (old pattern)
        pass


# Call registration on import
_register()

# Explicit export for backward-compatibility
RENDERER_REGISTRY = {'element3d': render}
