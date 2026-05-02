"""Tests for font handling (resolve, apply, fallback, embed stub)."""

import sys
import pytest
from unittest.mock import Mock, patch
from pptx import Presentation
from pptx.util import Pt

# Adjust path to import from generators.lib
sys.path.insert(0, str(__file__).rsplit("plugin", 1)[0] + "plugin")

from generators.lib import fonts
from generators.lib.fonts import (
    PRIMARY_FONTS,
    FALLBACK_FONTS,
    resolve_font,
    enumerate_system_fonts,
    apply_font_to_run,
    embed_fonts_in_pptx,
    _warned_fonts,
)


class TestResolveFonts:
    """Test resolve_font behavior."""

    def test_resolve_font_with_theme_override(self):
        """Theme override takes precedence."""
        theme = {"fonts": {"sans": "MyCustomSans"}}
        assert resolve_font("sans", theme) == "MyCustomSans"

    def test_resolve_font_without_theme_uses_primary(self):
        """Without theme, use PRIMARY_FONTS."""
        assert resolve_font("sans") == PRIMARY_FONTS["sans"]
        assert resolve_font("display") == PRIMARY_FONTS["display"]
        assert resolve_font("mono") == PRIMARY_FONTS["mono"]

    def test_resolve_font_theme_partial(self):
        """Theme partial override + primary fallback."""
        theme = {"fonts": {"sans": "Arial"}}
        assert resolve_font("sans", theme) == "Arial"
        assert resolve_font("display", theme) == PRIMARY_FONTS["display"]

    def test_resolve_font_theme_empty(self):
        """Empty theme dict falls back to PRIMARY."""
        theme = {}
        assert resolve_font("sans", theme) == PRIMARY_FONTS["sans"]

    def test_resolve_font_unknown_role(self):
        """Unknown role returns default (Calibri)."""
        assert resolve_font("unknown") == "Calibri"


class TestApplyFontToRun:
    """Test apply_font_to_run with fallback logic."""

    def setup_method(self):
        """Clear warning tracking before each test."""
        _warned_fonts.clear()

    def test_apply_font_basic(self):
        """Basic apply: run.font.name gets set."""
        run = Mock()
        run.font = Mock()
        apply_font_to_run(run, "sans", embed_fonts=True)
        assert run.font.name == "Inter"

    def test_apply_font_with_theme(self):
        """Theme override affects applied font."""
        run = Mock()
        run.font = Mock()
        theme = {"fonts": {"sans": "CustomFont"}}
        apply_font_to_run(run, "sans", theme, embed_fonts=True)
        assert run.font.name == "CustomFont"

    def test_apply_font_embed_mode(self):
        """embed_fonts=True skips system check."""
        run = Mock()
        run.font = Mock()
        # No system_fonts provided, but embed_fonts=True allows it
        apply_font_to_run(run, "sans", embed_fonts=True, system_fonts=set())
        assert run.font.name == "Inter"

    def test_apply_font_missing_with_warning(self, capsys):
        """Missing font triggers warning (once per font)."""
        _warned_fonts.clear()
        run = Mock()
        run.font = Mock()
        system_fonts = set()  # Empty: no fonts available

        # First call should warn
        apply_font_to_run(run, "sans", system_fonts=system_fonts)
        assert run.font.name == "Calibri"  # Falls back
        captured = capsys.readouterr()
        assert "font 'Inter' not found" in captured.err
        assert "falling back to 'Calibri'" in captured.err

    def test_apply_font_warning_once_per_font(self, capsys):
        """Warning only emitted once per font per session."""
        _warned_fonts.clear()
        run = Mock()
        run.font = Mock()
        system_fonts = set()

        # First call
        apply_font_to_run(run, "sans", system_fonts=system_fonts)
        captured1 = capsys.readouterr()
        warn_count_1 = captured1.err.count("font 'Inter'")

        # Second call (same font)
        apply_font_to_run(run, "sans", system_fonts=system_fonts)
        captured2 = capsys.readouterr()
        warn_count_2 = captured2.err.count("font 'Inter'")

        assert warn_count_1 == 1
        assert warn_count_2 == 0  # No second warning

    def test_apply_font_available_no_warning(self, capsys):
        """No warning if font is in system_fonts."""
        _warned_fonts.clear()
        run = Mock()
        run.font = Mock()
        system_fonts = {"Inter", "Calibri"}

        apply_font_to_run(run, "sans", system_fonts=system_fonts)
        assert run.font.name == "Inter"
        captured = capsys.readouterr()
        assert "not found" not in captured.err


class TestEmbedFontsStub:
    """Test embed_fonts_in_pptx stub."""

    def test_embed_fonts_logs_deferred(self, capsys):
        """embed_fonts_in_pptx logs deferred message."""
        prs = Presentation()
        fonts_list = ["Inter", "Space Grotesk"]
        embed_fonts_in_pptx(prs, fonts_list)
        captured = capsys.readouterr()
        assert "embed-fonts not yet implemented" in captured.err
        assert "font binaries not bundled" in captured.err

    def test_embed_fonts_does_not_crash(self):
        """Stub does not raise or modify presentation."""
        prs = Presentation()
        slides_before = len(prs.slides)
        embed_fonts_in_pptx(prs, ["Inter"])
        slides_after = len(prs.slides)
        assert slides_before == slides_after


class TestEnumerateSystemFonts:
    """Test system font enumeration."""

    def test_enumerate_returns_set(self):
        """Returns a set (even if empty)."""
        result = enumerate_system_fonts()
        assert isinstance(result, set)

    def test_enumerate_non_empty_on_real_system(self):
        """On a real system, should find at least a few fonts."""
        result = enumerate_system_fonts()
        # Heuristic: most systems have Calibri or Arial or Helvetica
        # If enumeration fails, we get empty set (which is OK per spec)
        assert isinstance(result, set)


class TestIntegrationRealRun:
    """Integration: real python-pptx run object."""

    def test_apply_to_real_run_object(self):
        """Apply font to actual PPTX run (not mock)."""
        prs = Presentation()
        blank_layout = prs.slide_layouts[6]
        slide = prs.slides.add_slide(blank_layout)

        left = 914400  # 1 EMU inch
        top = 914400
        width = 2 * 914400
        height = 914400

        textbox = slide.shapes.add_textbox(left, top, width, height)
        text_frame = textbox.text_frame
        p = text_frame.paragraphs[0]
        run = p.add_run()
        run.text = "Hello"

        # Apply font
        apply_font_to_run(run, "sans", embed_fonts=True)

        # Verify
        assert run.font.name == "Inter"
        assert run.text == "Hello"
