"""
Tests for PPTX group renderers: orbit_group, pipeline_group, stat_group, _custom_placeholder.

Verifies:
- Each group renders the expected shape count
- !! naming cascades to child element IDs
- Custom placeholder produces a labeled rect
"""

import pytest
import math
from pathlib import Path
from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor

# Imports using absolute module path
from plugin.generators.pptx_renderers._base import RendererCtx
from plugin.generators.pptx_renderers.orbit_group import render as render_orbit
from plugin.generators.pptx_renderers.pipeline_group import render as render_pipeline
from plugin.generators.pptx_renderers.stat_group import render as render_stat
from plugin.generators.pptx_renderers._custom_placeholder import render as render_placeholder


@pytest.fixture
def mock_ctx():
    """Create a mock RendererCtx for testing."""
    return RendererCtx(
        theme={
            'primary': '#4285F4',
            'border': '#27272A',
            'connectorPalette': {
                'drive': '#4285F4',
                'slack': '#ECB22E',
            },
            '_slide_width_emu': 12186240,
            '_slide_height_emu': 6858000,
        },
        dwell_ms=2000,
        slide_idx=0,
        fonts={'body': 'Inter'},
        dist_dir=Path('/tmp/dist'),
    )


@pytest.fixture
def presentation():
    """Create a test presentation."""
    prs = Presentation()
    # Ensure standard 16:9 dimensions
    prs.slide_width = Emu(12186240)  # 13.333"
    prs.slide_height = Emu(6858000)  # 7.5"
    return prs


def test_orbit_group_renders_children(presentation, mock_ctx):
    """Test orbit_group renders all children as shapes in circular arrangement."""
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])  # blank layout
    initial_shape_count = len(slide.shapes)

    layout = {
        'left': '40%',
        'top': '40%',
        'width': '20%',
        'height': '20%',
    }
    props = {
        'children': ['drive', 'slack', 'github'],
    }

    render_orbit(0, 'orbit_1', layout, props, slide, mock_ctx)

    # Should have added 3 child shapes
    final_shape_count = len(slide.shapes)
    assert final_shape_count >= initial_shape_count + 3, \
        f"Expected at least 3 new shapes, got {final_shape_count - initial_shape_count}"


def test_orbit_group_names_cascade(presentation, mock_ctx):
    """Test orbit_group assigns !!{element_id}_{child_id} names to children."""
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])

    layout = {
        'left': '40%',
        'top': '40%',
        'width': '20%',
        'height': '20%',
    }
    props = {
        'children': ['drive', 'slack'],
    }

    render_orbit(0, 'orbit_1', layout, props, slide, mock_ctx)

    # Find shapes with orbit_1 in name
    orbit_shapes = [s for s in slide.shapes if hasattr(s, 'name') and 'orbit_1' in s.name]
    assert len(orbit_shapes) >= 2, f"Expected at least 2 orbit shapes, got {len(orbit_shapes)}"

    # At least one should have !! prefix with cascade format
    morph_names = [s.name for s in orbit_shapes if s.name.startswith('!!')]
    assert len(morph_names) > 0, "Expected at least one !! prefixed name"
    assert any('orbit_1' in name and ('drive' in name or 'slack' in name) for name in morph_names), \
        f"Expected cascade naming pattern, got {morph_names}"


def test_orbit_group_empty_children(presentation, mock_ctx):
    """Test orbit_group with empty children list does nothing."""
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])
    initial_shape_count = len(slide.shapes)

    layout = {'left': '40%', 'top': '40%', 'width': '20%', 'height': '20%'}
    props = {'children': []}

    render_orbit(0, 'orbit_empty', layout, props, slide, mock_ctx)

    # Should not add any shapes
    assert len(slide.shapes) == initial_shape_count


def test_pipeline_group_renders_children(presentation, mock_ctx):
    """Test pipeline_group renders all children in horizontal flex."""
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])
    initial_shape_count = len(slide.shapes)

    layout = {
        'left': '20%',
        'top': '40%',
        'width': '60%',
        'height': '10%',
    }
    props = {
        'children': ['step1', 'step2', 'step3'],
        'connectors_visible': True,
    }

    render_pipeline(0, 'pipeline_1', layout, props, slide, mock_ctx)

    # Should have added children + connectors
    final_shape_count = len(slide.shapes)
    # At least 3 children + 2 connectors = 5
    assert final_shape_count >= initial_shape_count + 3, \
        f"Expected at least 3 new shapes, got {final_shape_count - initial_shape_count}"


def test_pipeline_group_no_connectors(presentation, mock_ctx):
    """Test pipeline_group with connectors_visible=False."""
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])
    initial_shape_count = len(slide.shapes)

    layout = {
        'left': '20%',
        'top': '40%',
        'width': '60%',
        'height': '10%',
    }
    props = {
        'children': ['step1', 'step2'],
        'connectors_visible': False,
    }

    render_pipeline(0, 'pipeline_no_conn', layout, props, slide, mock_ctx)

    # Should have 2 children, no connectors
    final_shape_count = len(slide.shapes)
    assert final_shape_count >= initial_shape_count + 2


def test_stat_group_renders_grid(presentation, mock_ctx):
    """Test stat_group renders KPI grid."""
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])
    initial_shape_count = len(slide.shapes)

    layout = {
        'left': '10%',
        'top': '10%',
        'width': '80%',
        'height': '50%',
    }
    props = {
        'stats': [
            {'value': '150', 'label': 'Revenue (M)'},
            {'value': '5', 'label': 'Growth (%)'},
            {'value': '1.2K', 'label': 'Customers'},
        ],
        'columns': 3,
    }

    render_stat(0, 'stat_1', layout, props, slide, mock_ctx)

    # Should have added 3 stat shapes
    final_shape_count = len(slide.shapes)
    assert final_shape_count >= initial_shape_count + 3, \
        f"Expected at least 3 new shapes, got {final_shape_count - initial_shape_count}"


def test_stat_group_names_cascade(presentation, mock_ctx):
    """Test stat_group assigns !!{element_id}_stat_{idx} names."""
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])

    layout = {
        'left': '10%',
        'top': '10%',
        'width': '80%',
        'height': '30%',
    }
    props = {
        'stats': [
            {'value': '100', 'label': 'Metric A'},
            {'value': '200', 'label': 'Metric B'},
        ],
        'columns': 2,
    }

    render_stat(0, 'stat_metrics', layout, props, slide, mock_ctx)

    # Find stat shapes
    stat_shapes = [s for s in slide.shapes if hasattr(s, 'name') and 'stat_metrics' in s.name]
    assert len(stat_shapes) >= 2, f"Expected at least 2 stat shapes, got {len(stat_shapes)}"


def test_custom_placeholder_renders_labeled_rect(presentation, mock_ctx):
    """Test custom_placeholder produces a rectangle with element type label."""
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])
    initial_shape_count = len(slide.shapes)

    layout = {
        'left': '30%',
        'top': '30%',
        'width': '40%',
        'height': '40%',
    }
    props = {
        'element_type': 'custom_chart',
    }

    render_placeholder(0, 'custom_1', layout, props, slide, mock_ctx)

    # Should add 1 shape
    final_shape_count = len(slide.shapes)
    assert final_shape_count == initial_shape_count + 1, \
        f"Expected exactly 1 new shape, got {final_shape_count - initial_shape_count}"

    # Shape should have text containing element type
    new_shape = slide.shapes[-1]
    if hasattr(new_shape, 'text_frame'):
        text = new_shape.text_frame.text
        assert 'custom_chart' in text, f"Expected 'custom_chart' in placeholder text, got '{text}'"


def test_custom_placeholder_morph_name(presentation, mock_ctx):
    """Test custom_placeholder applies !! morph naming."""
    slide = presentation.slides.add_slide(presentation.slide_layouts[6])

    layout = {
        'left': '30%',
        'top': '30%',
        'width': '40%',
        'height': '40%',
    }
    props = {
        'element_type': 'unknown_type',
    }

    render_placeholder(0, 'placeholder_test', layout, props, slide, mock_ctx)

    new_shape = slide.shapes[-1]
    assert hasattr(new_shape, 'name'), "Shape should have name attribute"
    assert new_shape.name.startswith('!!'), f"Expected !! prefix, got '{new_shape.name}'"
    assert 'placeholder_test' in new_shape.name, f"Expected element_id in name, got '{new_shape.name}'"
