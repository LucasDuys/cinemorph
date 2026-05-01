"""
test_layout.py — Unit tests for layout.py (percent->EMU conversion, parsing, clamping).

Spec: spec-morph-deck-outputs.md R002.AC1, R002.AC2, R002.AC3, R002.AC5, R002.AC6
"""

import pytest
from ..layout import (
    pct_to_emu,
    parse_layout,
    apply_centering_for_hidden,
    clamp_to_slide_bounds,
    resolve_layout,
    SLIDE_W_EMU,
    SLIDE_H_EMU,
    EMU_PER_INCH,
    SLIDE_W_IN,
    SLIDE_H_IN,
)


class TestPctToEmu:
    """Test percent-to-EMU conversion."""

    def test_pct_to_emu_0_percent_x(self):
        """0% on x-axis should yield 0 EMU."""
        result = pct_to_emu("0%", "x")
        assert result == 0

    def test_pct_to_emu_0_percent_y(self):
        """0% on y-axis should yield 0 EMU."""
        result = pct_to_emu("0%", "y")
        assert result == 0

    def test_pct_to_emu_100_percent_x(self):
        """100% on x-axis should yield SLIDE_W_EMU."""
        result = pct_to_emu("100%", "x")
        assert result == SLIDE_W_EMU

    def test_pct_to_emu_100_percent_y(self):
        """100% on y-axis should yield SLIDE_H_EMU."""
        result = pct_to_emu("100%", "y")
        assert result == SLIDE_H_EMU

    def test_pct_to_emu_50_percent_x(self):
        """50% on x-axis should yield SLIDE_W_EMU / 2."""
        result = pct_to_emu("50%", "x")
        assert result == SLIDE_W_EMU // 2

    def test_pct_to_emu_50_percent_y(self):
        """50% on y-axis should yield SLIDE_H_EMU / 2."""
        result = pct_to_emu("50%", "y")
        assert result == SLIDE_H_EMU // 2

    def test_pct_to_emu_without_percent_sign(self):
        """Percent value without '%' suffix should still parse."""
        result = pct_to_emu("50", "x")
        assert result == SLIDE_W_EMU // 2

    def test_pct_to_emu_float_value(self):
        """Float percent values should parse correctly."""
        result = pct_to_emu("33.33%", "x")
        expected = int(SLIDE_W_EMU * (33.33 / 100.0))
        assert result == expected

    def test_pct_to_emu_invalid_axis(self):
        """Invalid axis should raise ValueError."""
        with pytest.raises(ValueError, match="axis must be"):
            pct_to_emu("50%", "z")

    def test_pct_to_emu_invalid_percent_string(self):
        """Non-numeric string should raise ValueError."""
        with pytest.raises(ValueError, match="cannot parse"):
            pct_to_emu("abc%", "x")

    def test_pct_to_emu_over_100_clamped(self):
        """Percent > 100 should be clamped to 100."""
        result = pct_to_emu("150%", "x")
        assert result == SLIDE_W_EMU  # clamped at 100%

    def test_pct_to_emu_negative_clamped(self):
        """Percent < 0 should be clamped to 0."""
        result = pct_to_emu("-50%", "x")
        assert result == 0  # clamped at 0%


class TestParseLayout:
    """Test layout dict parsing."""

    def test_parse_layout_empty(self):
        """Empty layout dict should default all to 0."""
        result = parse_layout({})
        assert result['left'] == 0
        assert result['top'] == 0
        assert result['width'] == 0
        assert result['height'] == 0

    def test_parse_layout_all_fields(self):
        """Layout with all fields should parse correctly."""
        result = parse_layout({
            'left': '10%',
            'top': '20%',
            'width': '30%',
            'height': '40%',
        })
        assert result['left'] == pct_to_emu('10%', 'x')
        assert result['top'] == pct_to_emu('20%', 'y')
        assert result['width'] == pct_to_emu('30%', 'x')
        assert result['height'] == pct_to_emu('40%', 'y')

    def test_parse_layout_partial_fields(self):
        """Layout with only some fields should fill in zeros."""
        result = parse_layout({'left': '50%', 'top': '50%'})
        assert result['left'] == SLIDE_W_EMU // 2
        assert result['top'] == SLIDE_H_EMU // 2
        assert result['width'] == 0
        assert result['height'] == 0

    def test_parse_layout_full_slide(self):
        """Layout spanning full slide."""
        result = parse_layout({
            'left': '0%',
            'top': '0%',
            'width': '100%',
            'height': '100%',
        })
        assert result['left'] == 0
        assert result['top'] == 0
        assert result['width'] == SLIDE_W_EMU
        assert result['height'] == SLIDE_H_EMU


class TestApplyCenteringForHidden:
    """Test hidden anchor centering logic."""

    def test_hidden_anchor_0x0(self):
        """Layout with width=0 and height=0 should be centered."""
        layout = {'left': 0, 'top': 0, 'width': 0, 'height': 0}
        result = apply_centering_for_hidden(layout)
        assert result['left'] == SLIDE_W_EMU // 2
        assert result['top'] == SLIDE_H_EMU // 2
        assert result['width'] == 1  # minimal size
        assert result['height'] == 1

    def test_hidden_anchor_non_zero_width(self):
        """Layout with non-zero width should not be centered."""
        layout = {'left': 100, 'top': 100, 'width': 50, 'height': 0}
        result = apply_centering_for_hidden(layout)
        assert result == layout  # unchanged

    def test_hidden_anchor_non_zero_height(self):
        """Layout with non-zero height should not be centered."""
        layout = {'left': 100, 'top': 100, 'width': 0, 'height': 50}
        result = apply_centering_for_hidden(layout)
        assert result == layout  # unchanged

    def test_hidden_anchor_both_nonzero(self):
        """Layout with both width and height non-zero should not be centered."""
        layout = {'left': 100, 'top': 100, 'width': 50, 'height': 50}
        result = apply_centering_for_hidden(layout)
        assert result == layout  # unchanged


class TestClampToSlideBounds:
    """Test slide bounds clamping."""

    def test_clamp_within_bounds(self):
        """Layout within bounds should be unchanged."""
        layout = {
            'left': SLIDE_W_EMU // 4,
            'top': SLIDE_H_EMU // 4,
            'width': SLIDE_W_EMU // 4,
            'height': SLIDE_H_EMU // 4,
        }
        result = clamp_to_slide_bounds(layout)
        assert result == layout

    def test_clamp_negative_left(self):
        """Negative left should be clamped to 0."""
        layout = {'left': -100, 'top': 100, 'width': 200, 'height': 200}
        result = clamp_to_slide_bounds(layout)
        assert result['left'] == 0

    def test_clamp_negative_top(self):
        """Negative top should be clamped to 0."""
        layout = {'left': 100, 'top': -50, 'width': 200, 'height': 200}
        result = clamp_to_slide_bounds(layout)
        assert result['top'] == 0

    def test_clamp_left_overflow(self):
        """Left position beyond slide width should be clamped."""
        layout = {
            'left': SLIDE_W_EMU + 1000,
            'top': 100,
            'width': 200,
            'height': 200,
        }
        result = clamp_to_slide_bounds(layout)
        assert result['left'] == SLIDE_W_EMU

    def test_clamp_width_overflow(self):
        """Width extending past right edge should be trimmed."""
        layout = {
            'left': SLIDE_W_EMU - 1000,
            'top': 100,
            'width': 2000,  # extends past edge
            'height': 200,
        }
        result = clamp_to_slide_bounds(layout)
        assert result['width'] <= SLIDE_W_EMU - result['left']

    def test_clamp_height_overflow(self):
        """Height extending past bottom edge should be trimmed."""
        layout = {
            'left': 100,
            'top': SLIDE_H_EMU - 1000,
            'width': 200,
            'height': 2000,  # extends past edge
        }
        result = clamp_to_slide_bounds(layout)
        assert result['height'] <= SLIDE_H_EMU - result['top']

    def test_clamp_all_zero(self):
        """Zero layout should clamp safely."""
        layout = {'left': 0, 'top': 0, 'width': 0, 'height': 0}
        result = clamp_to_slide_bounds(layout)
        assert result['left'] == 0
        assert result['top'] == 0
        assert result['width'] == 0
        assert result['height'] == 0


class TestResolveLayout:
    """Test full layout resolution pipeline."""

    def test_resolve_layout_default_no_transforms(self):
        """Basic layout with no transforms."""
        result = resolve_layout({'left': '50%', 'top': '50%'}, apply_hidden=False, clamp=False)
        assert result['left'] == SLIDE_W_EMU // 2
        assert result['top'] == SLIDE_H_EMU // 2

    def test_resolve_layout_with_hidden_transform(self):
        """Hidden anchor transform should apply when apply_hidden=True."""
        result = resolve_layout(
            {'left': '0%', 'top': '0%', 'width': '0%', 'height': '0%'},
            apply_hidden=True,
            clamp=False,
        )
        assert result['left'] == SLIDE_W_EMU // 2
        assert result['top'] == SLIDE_H_EMU // 2
        assert result['width'] == 1
        assert result['height'] == 1

    def test_resolve_layout_with_clamping(self):
        """Clamping should apply when clamp=True."""
        result = resolve_layout(
            {'left': '-100%', 'top': '150%', 'width': '200%', 'height': '200%'},
            apply_hidden=False,
            clamp=True,
        )
        assert result['left'] >= 0
        assert result['top'] >= 0
        assert result['width'] >= 0
        assert result['height'] >= 0

    def test_resolve_layout_full_pipeline(self):
        """Full pipeline with both transforms."""
        # Hidden layout that gets clamped
        result = resolve_layout(
            {'left': '50%', 'top': '50%', 'width': '0%', 'height': '0%'},
            apply_hidden=True,
            clamp=True,
        )
        # Should be centered at (SLIDE_W_EMU//2, SLIDE_H_EMU//2)
        assert result['left'] == SLIDE_W_EMU // 2
        assert result['top'] == SLIDE_H_EMU // 2


class TestConstants:
    """Test EMU constants."""

    def test_emu_per_inch_value(self):
        """EMU_PER_INCH should be 914400."""
        assert EMU_PER_INCH == 914400

    def test_slide_dimensions_inches(self):
        """Slide dimensions should match 16:9 widescreen."""
        assert SLIDE_W_IN == 13.333
        assert SLIDE_H_IN == 7.5

    def test_slide_dimensions_emu(self):
        """Calculated EMU dimensions should be correct."""
        assert SLIDE_W_EMU == int(13.333 * 914400)
        assert SLIDE_H_EMU == int(7.5 * 914400)

    def test_aspect_ratio(self):
        """EMU dimensions should maintain 16:9 ratio."""
        ratio = SLIDE_W_EMU / SLIDE_H_EMU
        expected_ratio = 16 / 9
        assert abs(ratio - expected_ratio) < 0.01  # allow small float error
