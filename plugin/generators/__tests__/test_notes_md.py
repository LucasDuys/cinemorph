"""Tests for notes_md.py — R011 (Talk-track standalone notes.md export).

Covers:
- Format: Markdown with required headings, per-stage sections
- BACKUP prefix on isBackup stages
- Dwell shown in seconds (rounded)
- Cues rendered as bullets
- File written to outPath with non-empty content
"""

import json
import sys
import tempfile
import unittest
from pathlib import Path

# Make the generators dir importable
_GEN_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_GEN_DIR))

from lib.notes_md import export_notes_md, build_notes_md  # noqa: E402


def _scaffold_deck(stages=None):
    """Create a minimal deck structure in a temp directory."""
    if stages is None:
        stages = []

    tmpdir = tempfile.mkdtemp(prefix="notes-md-test-")
    deck_path = Path(tmpdir) / "test-deck"
    src_deck = deck_path / "src" / "deck"
    src_deck.mkdir(parents=True)

    (deck_path / "package.json").write_text(
        json.dumps({"name": "test-deck"}), encoding="utf-8"
    )
    (src_deck / "stages.json").write_text(json.dumps(stages), encoding="utf-8")

    return tmpdir, str(deck_path)


class TestFormatAndOutput(unittest.TestCase):
    def test_export_emits_markdown_with_required_headings(self):
        tmpdir, deck_path = _scaffold_deck([
            {
                "id": 1,
                "name": "Opening",
                "caption": {"eyebrow": "Welcome", "headline": "Hello World"},
                "talkTrack": {"script": "This is the opening slide."},
                "elements": {},
            }
        ])

        try:
            result = export_notes_md(deck_path)
            self.assertIn("outPath", result)
            self.assertIn("stageCount", result)

            content = Path(result["outPath"]).read_text(encoding="utf-8")
            self.assertIn("# test-deck", content)
            self.assertIn("## Stage 1: Opening", content)
            self.assertIn("**Eyebrow:** Welcome", content)
            self.assertIn("**Headline:** Hello World", content)
        finally:
            import shutil
            shutil.rmtree(tmpdir)

    def test_export_backup_marker_on_isbackup_stages(self):
        tmpdir, deck_path = _scaffold_deck([
            {
                "id": 1,
                "name": "Main",
                "caption": {"eyebrow": "", "headline": "Main"},
                "talkTrack": {"script": "Main slide"},
                "elements": {},
            },
            {
                "id": 2,
                "name": "Backup",
                "caption": {"eyebrow": "", "headline": "Backup"},
                "talkTrack": {"script": "Backup slide"},
                "isBackup": True,
                "elements": {},
            },
        ])

        try:
            result = export_notes_md(deck_path)
            content = Path(result["outPath"]).read_text(encoding="utf-8")

            # Backup stage should have BACKUP marker
            self.assertIn("**[BACKUP]**", content)
            # Count should reflect one backup
            self.assertEqual(result["backupCount"], 1)
        finally:
            import shutil
            shutil.rmtree(tmpdir)

    def test_build_notes_dwell_rounded(self):
        stages = [
            {
                "id": 1,
                "name": "Slide",
                "caption": {"eyebrow": "", "headline": "Slide"},
                "talkTrack": {
                    "script": "Test",
                    "dwellSeconds": 2.7,
                },
                "elements": {},
            }
        ]

        md = build_notes_md("test-deck", stages)
        self.assertIn("~3s dwell", md)

    def test_build_notes_cues_as_bullets(self):
        stages = [
            {
                "id": 1,
                "name": "Cued",
                "caption": {"eyebrow": "", "headline": "Cued"},
                "talkTrack": {
                    "script": "Script with cues",
                    "cues": ["Look at the chart", "Emphasize growth"],
                },
                "elements": {},
            }
        ]

        md = build_notes_md("test-deck", stages)
        self.assertIn("**Cues:**", md)
        self.assertIn("- Look at the chart", md)
        self.assertIn("- Emphasize growth", md)

    def test_export_file_written_with_non_empty_content(self):
        tmpdir, deck_path = _scaffold_deck([
            {
                "id": 1,
                "name": "Test",
                "caption": {"eyebrow": "", "headline": "Test"},
                "talkTrack": {"script": "Test script"},
                "elements": {},
            }
        ])

        try:
            result = export_notes_md(deck_path)
            out_path = Path(result["outPath"])

            self.assertTrue(out_path.exists())
            content = out_path.read_text(encoding="utf-8")
            self.assertGreater(len(content), 0)
        finally:
            import shutil
            shutil.rmtree(tmpdir)


if __name__ == "__main__":
    unittest.main()
