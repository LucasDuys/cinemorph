"""Color utility functions for PPTX renderers."""

from pptx.dml.color import RGBColor


def hex_to_rgb(hex_color):
    """
    Convert hex color string to RGBColor.

    Args:
        hex_color: str (hex, e.g. '#FAFAFA') or RGBColor

    Returns:
        RGBColor instance
    """
    if isinstance(hex_color, RGBColor):
        return hex_color
    if isinstance(hex_color, str):
        hex_color = hex_color.lstrip('#')
        return RGBColor(int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16))
    return hex_color
