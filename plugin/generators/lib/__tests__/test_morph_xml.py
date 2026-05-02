"""Tests for Morph transition XML injection.

Spec: spec-morph-deck-outputs.md R003 (Morph transition injection).

Tests cover:
- XML structure validation (namespaces, required elements)
- Speed override (dur attribute mapping)
- Mode selection (byObject vs byName)
- Fallback fade presence
- Mock slide injection (minimal python-pptx integration)
"""

import sys
from pathlib import Path

import pytest
from lxml import etree

# Add lib dir to path so we can import morph_xml
sys.path.insert(0, str(Path(__file__).parent.parent))

from morph_xml import (
    MORPH_BY_OBJECT_XML,
    MORPH_BY_NAME_XML,
    SPEED_TO_DUR,
    inject_morph_transition,
)


class TestMorphXMLTemplates:
    """Validate the raw Morph transition XML templates."""

    def test_morph_by_object_contains_required_namespaces(self):
        """MORPH_BY_OBJECT_XML must have mc: and p159: namespaces."""
        root = etree.fromstring(MORPH_BY_OBJECT_XML.encode("utf-8"))

        # Check for namespace declarations
        nsmap = root.nsmap
        assert "mc" in nsmap, "missing mc: namespace"
        assert nsmap["mc"] == "http://schemas.openxmlformats.org/markup-compatibility/2006"
        assert "p159" in root[0].nsmap, "missing p159: namespace in Choice element"

    def test_morph_by_object_has_byobject_option(self):
        """MORPH_BY_OBJECT_XML must contain <p159:morph option="byObject"/>."""
        root = etree.fromstring(MORPH_BY_OBJECT_XML.encode("utf-8"))

        # Find the morph element via XPath
        morph_elements = root.xpath(
            ".//p159:morph[@option='byObject']",
            namespaces={
                "p159": "http://schemas.microsoft.com/office/powerpoint/2015/09/main",
            },
        )
        assert len(morph_elements) == 1, "expected exactly one <p159:morph option='byObject'/>"

    def test_morph_by_name_has_byname_option(self):
        """MORPH_BY_NAME_XML must contain <p159:morph option="byName"/>."""
        root = etree.fromstring(MORPH_BY_NAME_XML.encode("utf-8"))

        morph_elements = root.xpath(
            ".//p159:morph[@option='byName']",
            namespaces={
                "p159": "http://schemas.microsoft.com/office/powerpoint/2015/09/main",
            },
        )
        assert len(morph_elements) == 1, "expected exactly one <p159:morph option='byName'/>"

    def test_fallback_contains_fade(self):
        """Fallback block must contain <p:fade/> for older PowerPoint versions."""
        root = etree.fromstring(MORPH_BY_OBJECT_XML.encode("utf-8"))

        fade_elements = root.xpath(
            ".//mc:Fallback//p:fade",
            namespaces={
                "mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
                "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
            },
        )
        assert len(fade_elements) == 1, "expected exactly one <p:fade/> in Fallback"

    def test_choice_and_fallback_both_have_transitions(self):
        """Both Choice and Fallback must have <p:transition> elements."""
        root = etree.fromstring(MORPH_BY_OBJECT_XML.encode("utf-8"))

        transitions = root.xpath(
            ".//p:transition",
            namespaces={
                "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
            },
        )
        assert len(transitions) == 2, "expected exactly two <p:transition> elements (Choice + Fallback)"


class TestSpeedToDuration:
    """Validate speed-to-duration mapping."""

    def test_speed_to_dur_values(self):
        """Speed mapping must have fast, medium, slow."""
        assert SPEED_TO_DUR["fast"] == 400
        assert SPEED_TO_DUR["medium"] == 700
        assert SPEED_TO_DUR["med"] == 700  # alias
        assert SPEED_TO_DUR["slow"] == 1200


class TestInjectMorphTransition:
    """Test the injection function with mock slide XML."""

    def _make_mock_slide(self):
        """Create a minimal mock slide XML structure.

        Returns:
            (Element, Element) — (slide_element, cSld_element) so tests can
            verify injection location.
        """
        # Minimal valid slide XML structure
        sld_xml = """\
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg/>
    <p:spTree/>
  </p:cSld>
</p:sld>
"""
        sld = etree.fromstring(sld_xml.encode("utf-8"))
        cSld = sld.find("{http://schemas.openxmlformats.org/presentationml/2006/main}cSld")
        return sld, cSld

    def test_inject_raises_on_invalid_mode(self):
        """inject_morph_transition must reject mode outside of byObject/byName."""
        sld, _ = self._make_mock_slide()

        # Create a minimal mock slide object
        class MockSlide:
            def __init__(self, elem):
                self.element = elem

        mock_slide = MockSlide(sld)

        with pytest.raises(ValueError, match="mode must be"):
            inject_morph_transition(mock_slide, mode="invalid")

    def test_inject_adds_alternate_content_after_cSld(self):
        """Injected AlternateContent must appear after <p:cSld>."""
        sld, cSld = self._make_mock_slide()

        class MockSlide:
            def __init__(self, elem):
                self.element = elem

        mock_slide = MockSlide(sld)
        inject_morph_transition(mock_slide, mode="byObject", speed="medium")

        # Verify AlternateContent is a direct child of <p:sld> and after <p:cSld>
        children = list(sld)
        assert len(children) >= 2, "expected at least cSld + AlternateContent"

        cSld_idx = children.index(cSld)
        # Check if next sibling is AlternateContent
        next_sibling = children[cSld_idx + 1]
        assert (
            "AlternateContent" in next_sibling.tag
        ), f"expected AlternateContent after cSld, got {next_sibling.tag}"

    def test_inject_sets_dur_attribute_by_speed(self):
        """Injected transitions must have dur attribute set per speed param."""
        sld, _ = self._make_mock_slide()

        class MockSlide:
            def __init__(self, elem):
                self.element = elem

        mock_slide = MockSlide(sld)
        inject_morph_transition(mock_slide, mode="byObject", speed="fast")

        # Find the transitions in the injected AlternateContent
        transitions = sld.xpath(
            ".//p:transition",
            namespaces={
                "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
            },
        )
        assert len(transitions) == 2, "expected Choice + Fallback transitions"

        # Both should have dur="400" (fast = 400ms)
        for trans in transitions:
            dur = trans.get("dur")
            assert dur == "400", f"expected dur='400' for fast, got dur='{dur}'"

    def test_inject_mode_byobject_vs_byname(self):
        """Injecting with mode='byName' should set option='byName' in morph element."""
        sld, _ = self._make_mock_slide()

        class MockSlide:
            def __init__(self, elem):
                self.element = elem

        mock_slide = MockSlide(sld)
        inject_morph_transition(mock_slide, mode="byName", speed="medium")

        # Verify the morph element has option="byName"
        morphs = sld.xpath(
            ".//p159:morph",
            namespaces={
                "p159": "http://schemas.microsoft.com/office/powerpoint/2015/09/main",
            },
        )
        assert len(morphs) == 1, "expected exactly one morph element"
        assert morphs[0].get("option") == "byName", "expected option='byName'"

    def test_inject_removes_existing_transition(self):
        """If slide already has a <p:transition>, inject should replace it."""
        sld_with_old_transition = """\
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg/>
  </p:cSld>
  <p:transition/>
</p:sld>
"""
        sld = etree.fromstring(sld_with_old_transition.encode("utf-8"))

        class MockSlide:
            def __init__(self, elem):
                self.element = elem

        mock_slide = MockSlide(sld)

        # Count transitions before injection
        transitions_before = sld.xpath(
            ".//p:transition",
            namespaces={"p": "http://schemas.openxmlformats.org/presentationml/2006/main"},
        )
        assert len(transitions_before) == 1, "expected 1 transition before injection"

        # Inject
        inject_morph_transition(mock_slide, mode="byObject", speed="medium")

        # Count transitions after — should still be 2 (the new AlternateContent has 2)
        # but the old bare <p:transition> should be gone
        transitions_after = sld.xpath(
            ".//p:transition",
            namespaces={"p": "http://schemas.openxmlformats.org/presentationml/2006/main"},
        )
        assert len(transitions_after) == 2, "expected 2 transitions after injection (Choice + Fallback)"

        # Verify the old bare transition is gone by checking direct children
        bare_transitions = [
            child for child in sld if "transition" in child.tag and child not in transitions_after
        ]
        assert len(bare_transitions) == 0, "old bare transition should have been removed"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
