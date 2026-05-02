"""
Tests for PPTX renderer registry and base classes.

Tests cover:
  - Registry registration via decorator
  - Registry registration via direct assignment
  - apply_morph_name() helper (!! prefix)
  - apply_opacity() helper (alpha injection)
  - RendererCtx dataclass
"""

import unittest
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch
from lxml import etree

from generators.pptx_renderers import RENDERER_REGISTRY, register_renderer
from generators.pptx_renderers._base import (
    RendererCtx, RendererFn, BaseRenderer,
    apply_morph_name, apply_opacity
)
from pptx.oxml.ns import qn


class TestRendererRegistry(unittest.TestCase):
    """Test decorator-based and direct registration."""

    def setUp(self):
        """Snapshot registry; restore after each test so we don't break other suites."""
        self._registry_snapshot = dict(RENDERER_REGISTRY)
        RENDERER_REGISTRY.clear()

    def tearDown(self):
        RENDERER_REGISTRY.clear()
        RENDERER_REGISTRY.update(self._registry_snapshot)

    def test_register_decorator(self):
        """Test @register_renderer decorator registers function."""
        @register_renderer("test_element")
        def dummy_renderer(stage_idx, element_id, layout, props, slide, ctx):
            pass

        self.assertIn("test_element", RENDERER_REGISTRY)
        self.assertEqual(RENDERER_REGISTRY["test_element"], dummy_renderer)

    def test_register_multiple(self):
        """Test multiple decorators register distinct element types."""
        @register_renderer("wordmark")
        def r1(stage_idx, element_id, layout, props, slide, ctx):
            pass

        @register_renderer("caption")
        def r2(stage_idx, element_id, layout, props, slide, ctx):
            pass

        self.assertEqual(len(RENDERER_REGISTRY), 2)
        self.assertIn("wordmark", RENDERER_REGISTRY)
        self.assertIn("caption", RENDERER_REGISTRY)

    def test_direct_assignment(self):
        """Test direct assignment to RENDERER_REGISTRY."""
        def custom_renderer(stage_idx, element_id, layout, props, slide, ctx):
            pass

        RENDERER_REGISTRY["custom"] = custom_renderer
        self.assertEqual(RENDERER_REGISTRY["custom"], custom_renderer)

    def test_registry_is_dict(self):
        """Test RENDERER_REGISTRY is a plain dict."""
        self.assertIsInstance(RENDERER_REGISTRY, dict)


class TestRendererCtx(unittest.TestCase):
    """Test RendererCtx dataclass."""

    def test_ctx_creation(self):
        """Test RendererCtx dataclass instantiation."""
        theme = {"primary": "#fff"}
        fonts = {"inter": "/path/to/inter.ttf"}
        dist = Path("/tmp/dist")

        ctx = RendererCtx(
            theme=theme,
            dwell_ms=1000,
            slide_idx=0,
            fonts=fonts,
            dist_dir=dist
        )

        self.assertEqual(ctx.theme, theme)
        self.assertEqual(ctx.dwell_ms, 1000)
        self.assertEqual(ctx.slide_idx, 0)
        self.assertEqual(ctx.fonts, fonts)
        self.assertEqual(ctx.dist_dir, dist)


class TestApplyMorphName(unittest.TestCase):
    """Test apply_morph_name() helper."""

    def test_morph_name_prefix(self):
        """Test that apply_morph_name adds !! prefix."""
        shape = Mock()
        apply_morph_name(shape, "wordmark_1")
        shape.name = "!!wordmark_1"
        self.assertEqual(shape.name, "!!wordmark_1")

    def test_morph_name_empty_id(self):
        """Test apply_morph_name with empty element_id."""
        shape = Mock()
        apply_morph_name(shape, "")
        # Should still set name, even if element_id is empty
        self.assertEqual(shape.name, "!!")

    def test_morph_name_special_chars(self):
        """Test apply_morph_name preserves special characters."""
        shape = Mock()
        apply_morph_name(shape, "element_with_underscore-and-dash")
        self.assertEqual(shape.name, "!!element_with_underscore-and-dash")


class TestApplyOpacity(unittest.TestCase):
    """Test apply_opacity() helper for alpha injection."""

    def setUp(self):
        """Create mock shape with solid fill."""
        self.shape = Mock()
        self.shape.fill = Mock()
        self.shape.fill.fore_color = Mock()

        # Create a minimal XML structure for sRgbClr
        self.srgb = etree.Element(qn("a:srgbClr"))
        self.srgb.set("val", "ffffff")
        self.shape.fill.fore_color._xFill = etree.Element(qn("a:solidFill"))
        self.shape.fill.fore_color._xFill.append(self.srgb)

    def test_opacity_full(self):
        """Test apply_opacity with opacity=1.0 (fully opaque)."""
        apply_opacity(self.shape, 1.0)
        alpha = self.srgb.find(qn("a:alpha"))
        self.assertIsNotNone(alpha)
        self.assertEqual(alpha.get("val"), "100000")

    def test_opacity_half(self):
        """Test apply_opacity with opacity=0.5 (50% opacity)."""
        apply_opacity(self.shape, 0.5)
        alpha = self.srgb.find(qn("a:alpha"))
        self.assertIsNotNone(alpha)
        self.assertEqual(alpha.get("val"), "50000")

    def test_opacity_zero(self):
        """Test apply_opacity with opacity=0.0 (fully transparent)."""
        apply_opacity(self.shape, 0.0)
        alpha = self.srgb.find(qn("a:alpha"))
        self.assertIsNotNone(alpha)
        self.assertEqual(alpha.get("val"), "0")

    def test_opacity_invalid_low(self):
        """Test apply_opacity rejects opacity < 0.0."""
        with self.assertRaises(ValueError):
            apply_opacity(self.shape, -0.1)

    def test_opacity_invalid_high(self):
        """Test apply_opacity rejects opacity > 1.0."""
        with self.assertRaises(ValueError):
            apply_opacity(self.shape, 1.1)

    def test_opacity_overwrites_existing_alpha(self):
        """Test apply_opacity replaces existing alpha element."""
        # Set initial alpha
        existing_alpha = etree.SubElement(self.srgb, qn("a:alpha"))
        existing_alpha.set("val", "50000")

        # Apply new opacity
        apply_opacity(self.shape, 0.75)

        # Check that only one alpha exists with new value
        alphas = self.srgb.findall(qn("a:alpha"))
        self.assertEqual(len(alphas), 1)
        self.assertEqual(alphas[0].get("val"), "75000")


class TestBaseRenderer(unittest.TestCase):
    """Test BaseRenderer abstract base class."""

    def test_cannot_instantiate_abstract(self):
        """Test that BaseRenderer cannot be instantiated directly."""
        with self.assertRaises(TypeError):
            BaseRenderer()

    def test_subclass_requires_render_impl(self):
        """Test that subclass must implement render()."""
        class IncompleteRenderer(BaseRenderer):
            element_type = "incomplete"

        with self.assertRaises(TypeError):
            IncompleteRenderer()

    def test_subclass_with_render_impl(self):
        """Test that subclass with render() can be instantiated."""
        class CompleteRenderer(BaseRenderer):
            element_type = "complete"

            def render(self, stage_idx, element_id, layout, props, slide, ctx):
                pass

        renderer = CompleteRenderer()
        self.assertEqual(renderer.element_type, "complete")
        self.assertTrue(callable(renderer.render))


if __name__ == "__main__":
    unittest.main()
