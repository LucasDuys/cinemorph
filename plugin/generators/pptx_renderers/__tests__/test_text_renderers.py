"""
Tests for PPTX text renderers: wordmark, caption, kpi, pillar, quote.

Tests cover:
  - Shape creation and naming with !! prefix
  - Text content and formatting
  - Multi-paragraph layouts
  - Opacity application
  - Layout resolution from percent to EMU
"""

import unittest
from pathlib import Path
from unittest.mock import Mock, MagicMock, patch
from lxml import etree

from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.dml.color import RGBColor

# Import renderers and registry
from generators.pptx_renderers import RENDERER_REGISTRY
from generators.pptx_renderers._base import RendererCtx
from generators.pptx_renderers import wordmark, caption, kpi, pillar, quote


class TestWordmarkRenderer(unittest.TestCase):
    """Test wordmark text renderer."""

    def setUp(self):
        """Create a fresh presentation and slide."""
        self.prs = Presentation()
        self.slide = self.prs.slides.add_slide(self.prs.slide_layouts[6])
        self.ctx = RendererCtx(
            theme={'foreground': RGBColor(250, 250, 250), 'muted_foreground': RGBColor(161, 161, 170)},
            dwell_ms=1000,
            slide_idx=0,
            fonts={},
            dist_dir=Path('/tmp')
        )

    def test_wordmark_registered(self):
        """Test wordmark is registered in RENDERER_REGISTRY."""
        self.assertIn('wordmark', RENDERER_REGISTRY)

    def test_wordmark_renders_shape(self):
        """Test wordmark creates a textbox on slide."""
        layout = {'left': '20%', 'top': '30%', 'width': '60%', 'height': '20%'}
        props = {'text': 'TestMark'}
        initial_count = len(self.slide.shapes)

        wordmark.render(0, 'wordmark_test', layout, props, self.slide, self.ctx)

        self.assertEqual(len(self.slide.shapes), initial_count + 1)
        shape = self.slide.shapes[-1]
        self.assertTrue(shape.name.startswith('!!'))
        self.assertIn('wordmark_test', shape.name)

    def test_wordmark_text_content(self):
        """Test wordmark renders correct text."""
        layout = {'left': '10%', 'top': '10%', 'width': '80%', 'height': '10%'}
        props = {'text': 'Stacklink'}

        wordmark.render(0, 'wordmark_1', layout, props, self.slide, self.ctx)

        shape = self.slide.shapes[-1]
        self.assertEqual(shape.text_frame.paragraphs[0].runs[0].text, 'Stacklink')

    def test_wordmark_large_height_gets_big_font(self):
        """Test wordmark with height > 15% gets 96pt font."""
        layout = {'left': '10%', 'top': '20%', 'width': '80%', 'height': '25%'}
        props = {'text': 'Hero'}

        wordmark.render(0, 'wordmark_hero', layout, props, self.slide, self.ctx)

        shape = self.slide.shapes[-1]
        font_size = shape.text_frame.paragraphs[0].runs[0].font.size
        self.assertEqual(font_size, Pt(96))

    def test_wordmark_small_height_gets_small_font(self):
        """Test wordmark with height <= 15% gets 16pt font."""
        layout = {'left': '10%', 'top': '10%', 'width': '80%', 'height': '5%'}
        props = {'text': 'Small'}

        wordmark.render(0, 'wordmark_small', layout, props, self.slide, self.ctx)

        shape = self.slide.shapes[-1]
        font_size = shape.text_frame.paragraphs[0].runs[0].font.size
        self.assertEqual(font_size, Pt(16))

    def test_wordmark_with_opacity(self):
        """Test wordmark accepts opacity parameter (opacity applied to shape fill, not textbox)."""
        layout = {'left': '10%', 'top': '10%', 'width': '80%', 'height': '10%', 'opacity': 0.5}
        props = {'text': 'Faded'}

        # Textboxes don't have fills by default, so opacity param is accepted but won't render
        # This test verifies the render function doesn't crash with opacity param
        wordmark.render(0, 'wordmark_faded', layout, props, self.slide, self.ctx)

        shape = self.slide.shapes[-1]
        # Textbox should still be created
        self.assertIsNotNone(shape)
        self.assertEqual(shape.text_frame.paragraphs[0].runs[0].text, 'Faded')


class TestCaptionRenderer(unittest.TestCase):
    """Test caption text renderer."""

    def setUp(self):
        """Create a fresh presentation and slide."""
        self.prs = Presentation()
        self.slide = self.prs.slides.add_slide(self.prs.slide_layouts[6])
        self.ctx = RendererCtx(
            theme={'foreground': RGBColor(250, 250, 250), 'muted_foreground': RGBColor(161, 161, 170)},
            dwell_ms=1000,
            slide_idx=0,
            fonts={},
            dist_dir=Path('/tmp')
        )

    def test_caption_registered(self):
        """Test caption is registered in RENDERER_REGISTRY."""
        self.assertIn('caption', RENDERER_REGISTRY)

    def test_caption_renders_shape(self):
        """Test caption creates a textbox on slide."""
        layout = {'left': '10%', 'top': '5%', 'width': '80%', 'height': '15%'}
        props = {'eyebrow': 'The Problem', 'headline': 'Big issue'}
        initial_count = len(self.slide.shapes)

        caption.render(0, 'caption_1', layout, props, self.slide, self.ctx)

        self.assertEqual(len(self.slide.shapes), initial_count + 1)
        shape = self.slide.shapes[-1]
        self.assertTrue(shape.name.startswith('!!'))

    def test_caption_two_paragraphs(self):
        """Test caption creates eyebrow + headline paragraphs."""
        layout = {'left': '10%', 'top': '5%', 'width': '80%', 'height': '15%'}
        props = {'eyebrow': 'THE PROBLEM', 'headline': 'Nobody can find knowledge'}

        caption.render(0, 'caption_test', layout, props, self.slide, self.ctx)

        shape = self.slide.shapes[-1]
        tf = shape.text_frame
        self.assertGreaterEqual(len(tf.paragraphs), 2)
        self.assertEqual(tf.paragraphs[0].runs[0].text, 'THE PROBLEM')
        self.assertEqual(tf.paragraphs[1].runs[0].text, 'Nobody can find knowledge')

    def test_caption_eyebrow_uppercase(self):
        """Test caption converts eyebrow to uppercase."""
        layout = {'left': '10%', 'top': '5%', 'width': '80%', 'height': '15%'}
        props = {'eyebrow': 'the solution', 'headline': 'X'}

        caption.render(0, 'caption_case', layout, props, self.slide, self.ctx)

        shape = self.slide.shapes[-1]
        self.assertEqual(shape.text_frame.paragraphs[0].runs[0].text, 'THE SOLUTION')

    def test_caption_headline_bold(self):
        """Test caption headline is bold."""
        layout = {'left': '10%', 'top': '5%', 'width': '80%', 'height': '15%'}
        props = {'eyebrow': 'Eye', 'headline': 'Bold Title'}

        caption.render(0, 'caption_bold', layout, props, self.slide, self.ctx)

        shape = self.slide.shapes[-1]
        headline_run = shape.text_frame.paragraphs[1].runs[0]
        self.assertTrue(headline_run.font.bold)


class TestKPIRenderer(unittest.TestCase):
    """Test KPI text renderer."""

    def setUp(self):
        """Create a fresh presentation and slide."""
        self.prs = Presentation()
        self.slide = self.prs.slides.add_slide(self.prs.slide_layouts[6])
        self.ctx = RendererCtx(
            theme={'foreground': RGBColor(250, 250, 250), 'muted_foreground': RGBColor(161, 161, 170)},
            dwell_ms=1000,
            slide_idx=0,
            fonts={},
            dist_dir=Path('/tmp')
        )

    def test_kpi_registered(self):
        """Test KPI is registered in RENDERER_REGISTRY."""
        self.assertIn('kpi', RENDERER_REGISTRY)

    def test_kpi_renders_shape(self):
        """Test KPI creates a textbox on slide."""
        layout = {'left': '20%', 'top': '30%', 'width': '20%', 'height': '10%'}
        props = {'value': '1.8h', 'label': 'Lost per worker'}
        initial_count = len(self.slide.shapes)

        kpi.render(0, 'kpi_1', layout, props, self.slide, self.ctx)

        self.assertEqual(len(self.slide.shapes), initial_count + 1)

    def test_kpi_value_and_label(self):
        """Test KPI renders value and label."""
        layout = {'left': '20%', 'top': '30%', 'width': '20%', 'height': '10%'}
        props = {'value': '€19k', 'label': 'Cost per employee'}

        kpi.render(0, 'kpi_cost', layout, props, self.slide, self.ctx)

        shape = self.slide.shapes[-1]
        tf = shape.text_frame
        self.assertEqual(tf.paragraphs[0].runs[0].text, '€19k')
        self.assertEqual(tf.paragraphs[1].runs[0].text, 'COST PER EMPLOYEE')

    def test_kpi_value_bold(self):
        """Test KPI value is bold."""
        layout = {'left': '20%', 'top': '30%', 'width': '20%', 'height': '10%'}
        props = {'value': '5+', 'label': 'Tools'}

        kpi.render(0, 'kpi_tools', layout, props, self.slide, self.ctx)

        shape = self.slide.shapes[-1]
        value_run = shape.text_frame.paragraphs[0].runs[0]
        self.assertTrue(value_run.font.bold)


class TestPillarRenderer(unittest.TestCase):
    """Test pillar text renderer."""

    def setUp(self):
        """Create a fresh presentation and slide."""
        self.prs = Presentation()
        self.slide = self.prs.slides.add_slide(self.prs.slide_layouts[6])
        self.ctx = RendererCtx(
            theme={'foreground': RGBColor(250, 250, 250), 'muted_foreground': RGBColor(161, 161, 170)},
            dwell_ms=1000,
            slide_idx=0,
            fonts={},
            dist_dir=Path('/tmp')
        )

    def test_pillar_registered(self):
        """Test pillar is registered in RENDERER_REGISTRY."""
        self.assertIn('pillar', RENDERER_REGISTRY)

    def test_pillar_renders_shape(self):
        """Test pillar creates a textbox on slide."""
        layout = {'left': '50%', 'top': '34%', 'width': '45%', 'height': '15%'}
        props = {
            'title': 'Sovereign-by-default',
            'body': ['On-prem or VPC.', 'NIS2 + DORA compliant.']
        }
        initial_count = len(self.slide.shapes)

        pillar.render(0, 'pillar_1', layout, props, self.slide, self.ctx)

        self.assertEqual(len(self.slide.shapes), initial_count + 1)

    def test_pillar_title_and_body(self):
        """Test pillar renders title + body paragraphs."""
        layout = {'left': '50%', 'top': '34%', 'width': '45%', 'height': '15%'}
        props = {
            'title': 'Already shipped',
            'body': ['9 of 11 phases.', 'Five connectors.']
        }

        pillar.render(0, 'pillar_shipped', layout, props, self.slide, self.ctx)

        shape = self.slide.shapes[-1]
        tf = shape.text_frame
        self.assertEqual(tf.paragraphs[0].runs[0].text, 'Already shipped')
        self.assertGreaterEqual(len(tf.paragraphs), 3)  # title + 2 body lines

    def test_pillar_title_bold(self):
        """Test pillar title is bold."""
        layout = {'left': '50%', 'top': '34%', 'width': '45%', 'height': '15%'}
        props = {'title': 'Feature', 'body': ['Detail.']}

        pillar.render(0, 'pillar_bold', layout, props, self.slide, self.ctx)

        shape = self.slide.shapes[-1]
        title_run = shape.text_frame.paragraphs[0].runs[0]
        self.assertTrue(title_run.font.bold)


class TestQuoteRenderer(unittest.TestCase):
    """Test quote text renderer."""

    def setUp(self):
        """Create a fresh presentation and slide."""
        self.prs = Presentation()
        self.slide = self.prs.slides.add_slide(self.prs.slide_layouts[6])
        self.ctx = RendererCtx(
            theme={'foreground': RGBColor(250, 250, 250), 'muted_foreground': RGBColor(161, 161, 170)},
            dwell_ms=1000,
            slide_idx=0,
            fonts={},
            dist_dir=Path('/tmp')
        )

    def test_quote_registered(self):
        """Test quote is registered in RENDERER_REGISTRY."""
        self.assertIn('quote', RENDERER_REGISTRY)

    def test_quote_renders_shape(self):
        """Test quote creates a textbox on slide."""
        layout = {'left': '10%', 'top': '20%', 'width': '80%', 'height': '30%'}
        props = {'text': 'Great insight', 'attribution': '— CEO'}
        initial_count = len(self.slide.shapes)

        quote.render(0, 'quote_1', layout, props, self.slide, self.ctx)

        self.assertEqual(len(self.slide.shapes), initial_count + 1)

    def test_quote_text_and_attribution(self):
        """Test quote renders text + attribution."""
        layout = {'left': '10%', 'top': '20%', 'width': '80%', 'height': '30%'}
        props = {'text': 'This is important', 'attribution': 'Founder'}

        quote.render(0, 'quote_founder', layout, props, self.slide, self.ctx)

        shape = self.slide.shapes[-1]
        tf = shape.text_frame
        # First paragraph should have quoted text
        first_text = tf.paragraphs[0].runs[0].text
        self.assertIn('This is important', first_text)
        self.assertTrue(first_text.startswith('"'))
        self.assertTrue(first_text.endswith('"'))
        # Second paragraph should have attribution
        self.assertEqual(tf.paragraphs[1].runs[0].text, 'Founder')

    def test_quote_text_italic(self):
        """Test quote text is italic."""
        layout = {'left': '10%', 'top': '20%', 'width': '80%', 'height': '30%'}
        props = {'text': 'Famous quote', 'attribution': 'Author'}

        quote.render(0, 'quote_italic', layout, props, self.slide, self.ctx)

        shape = self.slide.shapes[-1]
        text_run = shape.text_frame.paragraphs[0].runs[0]
        self.assertTrue(text_run.font.italic)


if __name__ == '__main__':
    unittest.main()
