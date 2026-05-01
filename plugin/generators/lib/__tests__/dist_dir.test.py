"""Tests for dist_dir.py — R012 output dir hygiene."""

import sys
import unittest
import tempfile
from pathlib import Path

# Make the lib importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from dist_dir import ensure_dist, ensure_gitignore, artifact_path


class TestEnsureDist(unittest.TestCase):
    def test_creates_dist_dir(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = Path(tmp)
            dist = ensure_dist(deck)
            self.assertTrue(dist.exists())
            self.assertTrue(dist.is_dir())
            self.assertEqual(dist, deck / "dist")

    def test_idempotent(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = Path(tmp)
            d1 = ensure_dist(deck)
            (d1 / "marker.txt").write_text("keep me", encoding="utf-8")
            d2 = ensure_dist(deck)
            self.assertEqual(d1, d2)
            self.assertTrue((d2 / "marker.txt").exists())

    def test_clean_wipes_existing(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = Path(tmp)
            dist = ensure_dist(deck)
            (dist / "stale.txt").write_text("old", encoding="utf-8")
            self.assertTrue((dist / "stale.txt").exists())
            dist2 = ensure_dist(deck, clean=True)
            self.assertTrue(dist2.exists())
            self.assertFalse((dist2 / "stale.txt").exists())


class TestEnsureGitignore(unittest.TestCase):
    def test_creates_when_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = Path(tmp)
            ensure_gitignore(deck)
            gi = deck / ".gitignore"
            self.assertTrue(gi.exists())
            self.assertIn("dist/", gi.read_text(encoding="utf-8").splitlines())

    def test_appends_when_missing_entry(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = Path(tmp)
            gi = deck / ".gitignore"
            gi.write_text("node_modules/\n.env\n", encoding="utf-8")
            ensure_gitignore(deck)
            lines = gi.read_text(encoding="utf-8").splitlines()
            self.assertIn("dist/", lines)
            self.assertIn("node_modules/", lines)
            self.assertIn(".env", lines)

    def test_idempotent_when_already_present(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = Path(tmp)
            gi = deck / ".gitignore"
            gi.write_text("dist/\n", encoding="utf-8")
            ensure_gitignore(deck)
            ensure_gitignore(deck)
            content = gi.read_text(encoding="utf-8")
            # only one occurrence of dist/
            self.assertEqual(content.count("dist/"), 1)

    def test_handles_no_trailing_newline(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = Path(tmp)
            gi = deck / ".gitignore"
            gi.write_text("node_modules/", encoding="utf-8")  # no trailing newline
            ensure_gitignore(deck)
            lines = gi.read_text(encoding="utf-8").splitlines()
            self.assertIn("dist/", lines)
            self.assertIn("node_modules/", lines)


class TestArtifactPath(unittest.TestCase):
    def test_returns_deterministic_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = Path(tmp)
            p1 = artifact_path(deck, "deck.pptx")
            p2 = artifact_path(deck, "deck.pptx")
            self.assertEqual(p1, p2)
            self.assertEqual(p1, deck / "dist" / "deck.pptx")

    def test_creates_dist_as_side_effect(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = Path(tmp)
            self.assertFalse((deck / "dist").exists())
            p = artifact_path(deck, "video.mp4")
            self.assertTrue((deck / "dist").exists())
            self.assertEqual(p.parent, deck / "dist")


if __name__ == "__main__":
    unittest.main()
