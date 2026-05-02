"""Morph transition XML injection for PPTX slides.

Spec: spec-morph-deck-outputs.md R003 (Morph transition injection).

Injects PowerPoint 2016+ Morph transitions into slides using mc:AlternateContent
with a fallback fade for older versions. Shapes carrying the !! prefix get
tracked by name across slides.

Reference proof: C:/dev/stacklink-pitch-roundone/build_pptx.py lines 167-195.
"""

from __future__ import annotations

from lxml import etree
from pptx.oxml.ns import qn

try:
    import lxml.etree as ET
    LXML_AVAILABLE = True
except ImportError:
    import xml.etree.ElementTree as ET
    LXML_AVAILABLE = False


# ─── Morph transition XML templates ────────────────────────────────────────
# These are OOXML fragments. Both use mc:AlternateContent so older PowerPoint
# viewers fall back to a fade. The Choice contains the Morph (PowerPoint 2016+).
#
# option="byObject" — tracks by shape index (default, stabler for most decks).
# option="byName" — tracks by shape name (requires !! prefix on persistent elements).
#
# Reference: C:/dev/stacklink-pitch-roundone/build_pptx.py MORPH_XML.
# For byName support, also reference the !! naming convention in _base.py:apply_morph_name.

MORPH_BY_OBJECT_XML = """\
<mc:AlternateContent
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">
  <mc:Choice
      xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main"
      Requires="p159">
    <p:transition xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                  spd="med">
      <p159:morph option="byObject"/>
    </p:transition>
  </mc:Choice>
  <mc:Fallback>
    <p:transition xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                  spd="med">
      <p:fade/>
    </p:transition>
  </mc:Fallback>
</mc:AlternateContent>
"""

MORPH_BY_NAME_XML = """\
<mc:AlternateContent
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006">
  <mc:Choice
      xmlns:p159="http://schemas.microsoft.com/office/powerpoint/2015/09/main"
      Requires="p159">
    <p:transition xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                  spd="med">
      <p159:morph option="byName"/>
    </p:transition>
  </mc:Choice>
  <mc:Fallback>
    <p:transition xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                  spd="med">
      <p:fade/>
    </p:transition>
  </mc:Fallback>
</mc:AlternateContent>
"""

# ─── Speed to duration mapping (milliseconds) ──────────────────────────────
SPEED_TO_DUR = {
    "fast": 400,
    "medium": 700,
    "med": 700,  # alias for medium
    "slow": 1200,
}


def inject_morph_transition(
    slide,
    *,
    mode: str = "byObject",
    speed: str = "medium",
) -> None:
    """Inject a Morph transition into a slide.

    Locates or creates a <p:transition> element in the slide XML and replaces
    it with an mc:AlternateContent block that contains the Morph transition
    with a fade fallback for older PowerPoint versions.

    Args:
        slide: python-pptx Slide object (slide.element = <p:sld>)
        mode: "byObject" (default) or "byName". Controls how Morph tracks shapes.
        speed: "fast", "medium" (or "med"), or "slow". Controls transition duration.
               If unrecognized, defaults to "medium".

    Raises:
        ValueError: if mode is not "byObject" or "byName"
        AttributeError: if slide.element doesn't have the expected structure
    """
    if mode not in ("byObject", "byName"):
        raise ValueError(
            f"mode must be 'byObject' or 'byName', got '{mode}'"
        )

    # Normalize speed alias and clamp to known values
    speed_normalized = speed.lower()
    if speed_normalized not in SPEED_TO_DUR:
        speed_normalized = "medium"
    dur_ms = SPEED_TO_DUR[speed_normalized]

    # Pick the template
    template = MORPH_BY_NAME_XML if mode == "byName" else MORPH_BY_OBJECT_XML

    # Parse the template into an Element
    transition_el = etree.fromstring(template.encode("utf-8"))

    # Set the dur attribute on both the Choice and Fallback transitions
    # to control the animation speed. PowerPoint uses dur="..." in milliseconds.
    for trans in transition_el.xpath(
        ".//p:transition",
        namespaces={
            "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
            "mc": "http://schemas.openxmlformats.org/markup-compatibility/2006",
        },
    ):
        trans.set("dur", str(dur_ms))

    # Get the slide element (<p:sld>)
    sld = slide.element

    # Find and remove any existing <p:transition> element
    existing_transition = sld.find(qn("p:transition"))
    if existing_transition is not None:
        sld.remove(existing_transition)

    # Insert the AlternateContent after <p:cSld> per OOXML schema order
    cSld = sld.find(qn("p:cSld"))
    if cSld is None:
        raise AttributeError(
            "slide.element does not contain <p:cSld> (invalid slide structure)"
        )
    cSld.addnext(transition_el)


def inject_morph_into_all_slides(
    prs,
    *,
    mode: str = "byObject",
    speed: str = "medium",
) -> None:
    """Inject Morph transitions into all slides in a presentation.

    Convenience function that calls inject_morph_transition on every slide.

    Args:
        prs: python-pptx Presentation object
        mode: "byObject" (default) or "byName"
        speed: "fast", "medium", or "slow"
    """
    for slide in prs.slides:
        inject_morph_transition(slide, mode=mode, speed=speed)
