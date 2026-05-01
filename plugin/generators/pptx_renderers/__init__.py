"""
PPTX primitive renderer registry and dispatch interface.

Exposes RENDERER_REGISTRY dict and register_renderer decorator.
Renderers register themselves on import via decorator or direct dict assignment.
"""

from typing import Callable, Dict
from ._base import RendererCtx, RendererFn

# Global registry: element_type -> RendererFn
RENDERER_REGISTRY: Dict[str, RendererFn] = {}


def register_renderer(element_type: str):
    """
    Decorator to register a renderer function for an element type.

    Usage:
        @register_renderer("wordmark")
        def render_wordmark(stage_idx, element_id, layout, props, slide, ctx):
            ...

    Args:
        element_type: str, the element type key (e.g. "wordmark", "caption", "kpi")

    Returns:
        Decorator function that registers fn in RENDERER_REGISTRY[element_type]
    """
    def decorator(fn: RendererFn) -> RendererFn:
        RENDERER_REGISTRY[element_type] = fn
        return fn
    return decorator


__all__ = [
    "RENDERER_REGISTRY",
    "register_renderer",
    "RendererCtx",
    "RendererFn",
]

# Import renderers to trigger self-registration
# Use try-except to handle missing modules gracefully
try:
    from . import wordmark
except ImportError:
    pass
try:
    from . import caption
except ImportError:
    pass
try:
    from . import kpi
except ImportError:
    pass
try:
    from . import pillar
except ImportError:
    pass
try:
    from . import quote
except ImportError:
    pass
try:
    from . import connector_chip
except ImportError:
    pass
try:
    from . import card
except ImportError:
    pass
try:
    from . import logo
except ImportError:
    pass
try:
    from . import image
except ImportError:
    pass
try:
    from . import footer_strip
except ImportError:
    pass
try:
    from . import orbit_group
except ImportError:
    pass
try:
    from . import pipeline_group
except ImportError:
    pass
try:
    from . import stat_group
except ImportError:
    pass
try:
    from . import _custom_placeholder
except ImportError:
    pass

# Merge registries from renderer modules (for backward compatibility with old-style local registries)
import sys
for module_name in ['connector_chip', 'card', 'logo', 'image', 'footer_strip', 'orbit_group', 'pipeline_group', 'stat_group', '_custom_placeholder']:
    module = sys.modules.get(f'{__name__}.{module_name}')
    if module and hasattr(module, 'RENDERER_REGISTRY'):
        RENDERER_REGISTRY.update(module.RENDERER_REGISTRY)
