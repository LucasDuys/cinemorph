"""PPTX speaker notes from talk-track.

Spec: spec-morph-deck-outputs.md R005 (PPTX speaker notes from talkTrack).

Functions:
  - format_notes(stage: dict) -> str: assemble notes from script, cues, dwell.
  - apply_notes_to_slide(slide, stage): write formatted notes to slide.notes_slide.
  - apply_notes_to_all(slides, stages): apply notes to all slides in pair.
"""

from typing import List, Dict, Any, Optional


def format_notes(stage: Dict[str, Any]) -> str:
    """Assemble speaker notes from a stage dict.

    Requires stage dict with:
      - talkTrack (optional): dict with script, cues, dwellSeconds
      - isBackup (optional): bool flag for backup stages (R025)

    Format:
      [~Ns dwell] {script}

      Cues:
        - {cue1}
        - {cue2}

    Returns empty string if no script present.
    """
    talk_track = stage.get("talkTrack")
    if not talk_track:
        return ""

    script = talk_track.get("script", "").strip()
    if not script:
        return ""

    # Build notes
    lines = []

    # Prefix with [BACKUP] if stage.isBackup
    is_backup = stage.get("isBackup", False)
    backup_prefix = "[BACKUP] " if is_backup else ""

    # Dwell line if dwellSeconds present
    dwell_seconds = talk_track.get("dwellSeconds")
    if dwell_seconds is not None:
        lines.append(f"{backup_prefix}[~{int(dwell_seconds)}s dwell]")
        backup_prefix = ""  # Already added above
    elif is_backup:
        lines.append(backup_prefix.rstrip())
        backup_prefix = ""

    # Script
    lines.append(script)

    # Cues as bulleted list
    cues = talk_track.get("cues")
    if cues and isinstance(cues, list) and len(cues) > 0:
        lines.append("")
        lines.append("Cues:")
        for cue in cues:
            lines.append(f"  - {cue}")

    return "\n".join(lines)


def apply_notes_to_slide(slide: Any, stage: Dict[str, Any]) -> None:
    """Write formatted notes to slide.notes_slide.notes_text_frame.

    Uses python-pptx API:
      slide.notes_slide.notes_text_frame.text = notes_string

    Skips if format_notes returns empty string (no script).
    """
    notes_text = format_notes(stage)
    if notes_text:
        slide.notes_slide.notes_text_frame.text = notes_text


def apply_notes_to_all(
    slides: List[Any], stages: List[Dict[str, Any]]
) -> None:
    """Apply notes to paired list of slides and stages.

    Raises ValueError if lengths don't match.
    Skips slides whose corresponding stage has no script.
    """
    if len(slides) != len(stages):
        raise ValueError(
            f"slides and stages must have same length: {len(slides)} vs {len(stages)}"
        )

    for slide, stage in zip(slides, stages):
        apply_notes_to_slide(slide, stage)
