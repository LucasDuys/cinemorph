"""
Base classes and helpers for PPTX primitive renderers.

Defines RendererCtx (context dataclass), RendererFn (type alias),
BaseRenderer (abstract base), and helper functions for morph naming + opacity.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Callable, ClassVar, Dict
from abc import ABC, abstractmethod

from lxml import etree
from pptx.oxml.ns import qn
from pptx.shapes.shapetree import Shape


@dataclass
class RendererCtx:
    """Context passed to every renderer function.

    Attributes:
        theme: dict, brand tokens (colors, fonts, spacing)
        dwell_ms: int, stage dwell time in milliseconds
        slide_idx: int, 0-indexed slide number
        fonts: dict, font name -> font file path mappings
        dist_dir: Path, output directory for dist artifacts
    """
    theme: dict
    dwell_ms: int
    slide_idx: int
    fonts: dict
    dist_dir: Path


# Type alias for renderer functions
RendererFn = Callable[
    [int, str, dict, dict, "pptx.shapes.shape.Shape", RendererCtx],
    None
]


class BaseRenderer(ABC):
    """
    Abstract base class for PPTX primitive renderers.

    Subclasses must define element_type and implement render().
    """

    element_type: ClassVar[str] = None

    @abstractmethod
    def render(self, stage_idx: int, element_id: str, layout: dict, props: dict,
               slide: "pptx.shapes.shape.Shape", ctx: RendererCtx) -> None:
        """
        Render a primitive element onto a slide.

        Args:
            stage_idx: int, 0-indexed stage number
            element_id: str, unique element ID (e.g. "wordmark_1")
            layout: dict, position + size in percent (left, top, width, height)
            props: dict, element-specific properties (text, color, etc.)
            slide: pptx.shapes.shape.Slide, the slide to render onto
            ctx: RendererCtx, shared context (theme, fonts, dwell, dist)
        """
        pass


def apply_morph_name(shape: Shape, element_id: str) -> None:
    """
    Set shape name for PowerPoint Morph tracking.

    Morph tracks shapes by name across slides. This helper prefixes with "!!"
    to signal PowerPoint's morph engine to track by name.

    Args:
        shape: pptx.shapes.shape.Shape, the shape to name
        element_id: str, the element ID (e.g. "wordmark_1")
    """
    shape.name = f"!!{element_id}"


def apply_opacity(shape: Shape, opacity_value: float) -> None:
    """
    Apply opacity (alpha) to a shape's solid fill via lxml.

    Injects <a:alpha val="..."/> into the shape's sRgbClr element.
    Opacity value should be 0.0-1.0; internally scaled to 100000-based PowerPoint units.

    Args:
        shape: pptx.shapes.shape.Shape with a solid fill
        opacity_value: float, 0.0 (transparent) to 1.0 (opaque)
    """
    if not (0.0 <= opacity_value <= 1.0):
        raise ValueError(f"opacity must be 0.0-1.0, got {opacity_value}")

    # Access the shape's fill XML element
    try:
        sp = shape.fill.fore_color._xFill
    except AttributeError:
        # Shape may not have a solid fill yet; ensure it does
        shape.fill.solid()
        sp = shape.fill.fore_color._xFill

    # Find the sRgbClr element (solid RGB color)
    srgb = sp.find(qn("a:srgbClr"))
    if srgb is None:
        return  # No color element to apply opacity to

    # Remove any existing alpha element
    existing_alpha = srgb.find(qn("a:alpha"))
    if existing_alpha is not None:
        srgb.remove(existing_alpha)

    # Create and insert new alpha element
    # PowerPoint alpha scale: 0 = transparent, 100000 = fully opaque
    alpha_val = int(opacity_value * 100000)
    alpha_elem = etree.SubElement(srgb, qn("a:alpha"))
    alpha_elem.set("val", str(alpha_val))
