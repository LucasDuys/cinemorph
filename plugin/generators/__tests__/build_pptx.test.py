"""Tests for build_pptx.py — R001 (PPTX exporter — invocation, CLI).

Covers:
- --help prints usage with all flags + at least one example
- Bad/missing deck path -> exit code 2 with stderr message
- parse_args defaults match the spec (med speed, --include-backup off, etc.)
- main() succeeds against a minimal deck and writes a .pptx to dist/
- --out overrides default output path
"""

import io
import json
import sys
import unittest
import tempfile
from contextlib import redirect_stdout, redirect_stderr
from pathlib import Path

# Make the generators dir importable so `import build_pptx` and the
# `from lib.X import Y` re-exports inside it both resolve.
_GEN_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(_GEN_DIR))

import build_pptx  # noqa: E402


def _scaffold_minimal_deck(root: Path, name: str = "demo-deck") -> Path:
    deck = root / name
    (deck / "src" / "deck").mkdir(parents=True)
    (deck / "package.json").write_text(json.dumps({"name": name}), encoding="utf-8")
    (deck / "src" / "deck" / "stages.json").write_text("[]", encoding="utf-8")
    return deck


class TestHelp(unittest.TestCase):
    def test_help_prints_usage_and_exits_zero(self):
        buf = io.StringIO()
        with redirect_stdout(buf):
            with self.assertRaises(SystemExit) as cm:
                build_pptx.parse_args(["--help"])
        self.assertEqual(cm.exception.code, 0)
        out = buf.getvalue()
        # Usage banner present
        self.assertIn("build_pptx", out)
        self.assertIn("deck_path", out)
        # All flags advertised
        for flag in ("--out", "--include-backup", "--speed", "--embed-fonts", "--clean"):
            self.assertIn(flag, out, f"flag {flag} missing from --help")
        # At least one example
        self.assertIn("Examples:", out)
        # speed choices listed
        for choice in ("slow", "med", "fast"):
            self.assertIn(choice, out)


class TestDefaults(unittest.TestCase):
    def test_defaults_match_spec(self):
        ns = build_pptx.parse_args(["./some-deck"])
        self.assertEqual(ns.deck_path, Path("./some-deck"))
        self.assertIsNone(ns.out)
        self.assertFalse(ns.include_backup)
        self.assertEqual(ns.speed, "med")
        self.assertFalse(ns.embed_fonts)
        self.assertFalse(ns.clean)

    def test_speed_rejects_invalid(self):
        err = io.StringIO()
        with redirect_stderr(err):
            with self.assertRaises(SystemExit) as cm:
                build_pptx.parse_args(["./d", "--speed", "warp"])
        # argparse exits 2 on bad choices
        self.assertEqual(cm.exception.code, 2)

    def test_flags_flip_when_given(self):
        ns = build_pptx.parse_args([
            "./d",
            "--include-backup",
            "--embed-fonts",
            "--clean",
            "--speed", "slow",
            "--out", "out.pptx",
        ])
        self.assertTrue(ns.include_backup)
        self.assertTrue(ns.embed_fonts)
        self.assertTrue(ns.clean)
        self.assertEqual(ns.speed, "slow")
        self.assertEqual(ns.out, Path("out.pptx"))


class TestBadDeckPath(unittest.TestCase):
    def test_missing_path_exits_2(self):
        err = io.StringIO()
        with redirect_stderr(err):
            code = build_pptx.main(["/no/such/deck/xyzzy"])
        self.assertEqual(code, 2)
        self.assertIn("does not exist", err.getvalue())

    def test_path_is_a_file_exits_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp) / "deck.txt"
            f.write_text("hi", encoding="utf-8")
            err = io.StringIO()
            with redirect_stderr(err):
                code = build_pptx.main([str(f)])
            self.assertEqual(code, 2)
            self.assertIn("not a directory", err.getvalue())

    def test_dir_without_stages_exits_2(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = Path(tmp) / "empty-deck"
            (deck / "src" / "deck").mkdir(parents=True)
            err = io.StringIO()
            with redirect_stderr(err):
                code = build_pptx.main([str(deck)])
            self.assertEqual(code, 2)
            self.assertIn("missing stages source", err.getvalue())


class TestMainHappyPath(unittest.TestCase):
    def test_writes_default_path(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = _scaffold_minimal_deck(Path(tmp))
            buf = io.StringIO()
            with redirect_stdout(buf):
                code = build_pptx.main([str(deck)])
            self.assertEqual(code, 0)
            expected = deck / "dist" / "demo-deck.pptx"
            self.assertTrue(expected.exists(), f"expected {expected} to exist")
            self.assertIn("wrote", buf.getvalue())

    def test_out_override(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = _scaffold_minimal_deck(Path(tmp))
            out = Path(tmp) / "alt" / "custom.pptx"
            buf = io.StringIO()
            with redirect_stdout(buf):
                code = build_pptx.main([str(deck), "--out", str(out)])
            self.assertEqual(code, 0)
            self.assertTrue(out.exists(), f"expected {out} to exist")
            # Default path NOT created (we wrote to override)
            self.assertFalse((deck / "dist" / "demo-deck.pptx").exists())


class TestSlideDimensions(unittest.TestCase):
    def test_emu_constants_match_16_9(self):
        # Sanity: 13.333 * 914400 ≈ 12_192_000; 7.5 * 914400 = 6_858_000
        self.assertEqual(int(build_pptx.SLIDE_W), 12192000)
        self.assertEqual(int(build_pptx.SLIDE_H), 6858000)


if __name__ == "__main__":
    unittest.main()
