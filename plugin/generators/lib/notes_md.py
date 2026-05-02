"""Talk-track standalone notes.md export.

Spec: spec-morph-deck-outputs.md R011 (Talk-track standalone notes.md export).

Functions:
  - export_notes_md(deck_path: str, out_path: str = None) -> dict: read deck, write notes.md.
  - build_notes_md(deck_name: str, stages: list) -> str: assemble markdown from stages.

Format per stage:
  ## Stage N: <name> (~Xs dwell)
  **[BACKUP]** (if isBackup)
  **Eyebrow:** ...
  **Headline:** ...

  <talkTrack.script>

  **Cues:**
  - cue 1
  - cue 2
"""

from pathlib import Path
from typing import Dict, List, Any, Optional

from .deck_source import read_deck_source
from .dist_dir import ensure_dist, artifact_path


def export_notes_md(
    deck_path: str, out_path: Optional[str] = None
) -> Dict[str, Any]:
    """Export talk-track notes to standalone Markdown.

    Args:
        deck_path: path to deck directory
        out_path: output file path (default: <deck>/dist/notes.md)

    Returns:
        dict with keys: outPath, stageCount, backupCount

    Raises:
        ValueError: if stages list is empty
    """
    deck_source = read_deck_source(deck_path)

    if not deck_source.stages or len(deck_source.stages) == 0:
        raise ValueError("stages list is empty")

    # Resolve output path
    resolved_out_path = out_path or artifact_path(deck_path, "notes.md")

    # Ensure dist dir exists
    ensure_dist(deck_path)

    # Build markdown
    md = build_notes_md(deck_source.name, deck_source.stages)

    # Write file
    Path(resolved_out_path).write_text(md, encoding="utf-8")

    # Count backups
    backup_count = sum(1 for s in deck_source.stages if s.get("isBackup"))

    return {
        "outPath": resolved_out_path,
        "stageCount": len(deck_source.stages),
        "backupCount": backup_count,
    }


def build_notes_md(deck_name: str, stages: List[Dict[str, Any]]) -> str:
    """Build markdown content from deck name and stages.

    Args:
        deck_name: name of the deck
        stages: list of stage dicts

    Returns:
        markdown string
    """
    lines = []

    # Title
    lines.append(f"# {deck_name}")
    lines.append("")

    # Per-stage section
    for i, stage in enumerate(stages):
        stage_num = i + 1

        # Stage heading: "## Stage N: <name> (~Xs dwell)"
        talk_track = stage.get("talkTrack")
        dwell_str = ""
        if talk_track and talk_track.get("dwellSeconds") is not None:
            dwell_seconds = int(round(talk_track["dwellSeconds"]))
            dwell_str = f" (~{dwell_seconds}s dwell)"

        lines.append(f"## Stage {stage_num}: {stage.get('name', '')}{dwell_str}")

        # BACKUP marker
        if stage.get("isBackup"):
            lines.append("**[BACKUP]**")

        # Caption fields
        caption = stage.get("caption")
        if caption:
            if caption.get("eyebrow"):
                lines.append(f"**Eyebrow:** {caption['eyebrow']}")
            if caption.get("headline"):
                lines.append(f"**Headline:** {caption['headline']}")

        # Script
        if talk_track and talk_track.get("script"):
            lines.append("")
            lines.append(talk_track["script"])

        # Cues
        if talk_track and talk_track.get("cues"):
            cues = talk_track["cues"]
            if isinstance(cues, list) and len(cues) > 0:
                lines.append("")
                lines.append("**Cues:**")
                for cue in cues:
                    lines.append(f"- {cue}")

        lines.append("")

    return "\n".join(lines)
