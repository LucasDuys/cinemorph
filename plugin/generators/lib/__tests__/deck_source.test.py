"""Tests for deck_source.py — R001 (PPTX exporter — invocation, deck-source read).

Covers:
- JSON sidecar is preferred over .ts when both exist
- Falls back to .ts parse with a warning when only .ts is present
- Derives `name` from package.json
- Falls back to deck-dir basename when package.json missing
- Raises FileNotFoundError when stages source is missing
- Strips scope from "@scope/foo"-style package names
"""

import json
import sys
import unittest
import warnings
import tempfile
from pathlib import Path

# Make the lib importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from deck_source import DeckSource, read_deck_source


def _scaffold_deck(root: Path, *, with_pkg: bool = True, pkg_name: str | None = "demo-deck") -> Path:
    """Create a minimal deck dir under `root`. Returns the deck path."""
    deck = root / "demo-deck"
    (deck / "src" / "deck").mkdir(parents=True)
    if with_pkg:
        pkg = {"name": pkg_name} if pkg_name is not None else {}
        (deck / "package.json").write_text(json.dumps(pkg), encoding="utf-8")
    return deck


class TestJsonSidecarPath(unittest.TestCase):
    def test_prefers_json_over_ts(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = _scaffold_deck(Path(tmp))
            sd = deck / "src" / "deck"
            # JSON says one thing, TS says another — JSON wins.
            (sd / "stages.json").write_text(
                json.dumps([{"id": "from-json"}]), encoding="utf-8"
            )
            (sd / "stages.ts").write_text(
                "export const STAGES = [{ id: 'from-ts' }];", encoding="utf-8"
            )
            (sd / "data.json").write_text(json.dumps({"k": "v"}), encoding="utf-8")
            (sd / "tokens.json").write_text(
                json.dumps({"colors": {"bg": "#000"}}), encoding="utf-8"
            )

            ds = read_deck_source(deck)

            self.assertIsInstance(ds, DeckSource)
            self.assertEqual(ds.stages, [{"id": "from-json"}])
            self.assertEqual(ds.data, {"k": "v"})
            self.assertEqual(ds.tokens, {"colors": {"bg": "#000"}})

    def test_json_object_with_uppercase_key(self):
        # Some sidecar emitters wrap the array as { STAGES: [...] }.
        with tempfile.TemporaryDirectory() as tmp:
            deck = _scaffold_deck(Path(tmp))
            sd = deck / "src" / "deck"
            (sd / "stages.json").write_text(
                json.dumps({"STAGES": [{"id": "wrapped"}]}), encoding="utf-8"
            )
            ds = read_deck_source(deck)
            self.assertEqual(ds.stages, [{"id": "wrapped"}])


class TestTsFallbackPath(unittest.TestCase):
    def test_ts_parse_simple_array(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = _scaffold_deck(Path(tmp))
            sd = deck / "src" / "deck"
            (sd / "stages.ts").write_text(
                "export const STAGES = [\n"
                "  { id: 'hook', dwellSeconds: 6 },\n"
                "  { id: 'problem', dwellSeconds: 12 },\n"
                "];\n",
                encoding="utf-8",
            )
            ds = read_deck_source(deck)
            self.assertEqual(len(ds.stages), 2)
            self.assertEqual(ds.stages[0]["id"], "hook")
            self.assertEqual(ds.stages[1]["dwellSeconds"], 12)

    def test_ts_parse_strips_comments_and_trailing_commas(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = _scaffold_deck(Path(tmp))
            sd = deck / "src" / "deck"
            (sd / "stages.ts").write_text(
                "// header comment\n"
                "/* block\n   comment */\n"
                "export const STAGES = [\n"
                "  { id: 'hook' }, // line comment\n"
                "  { id: 'last', },\n"  # trailing comma inside object
                "];\n",
                encoding="utf-8",
            )
            ds = read_deck_source(deck)
            self.assertEqual([s["id"] for s in ds.stages], ["hook", "last"])

    def test_ts_unparseable_warns_and_returns_empty(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = _scaffold_deck(Path(tmp))
            sd = deck / "src" / "deck"
            # No matching `const STAGES = [...]` literal.
            (sd / "stages.ts").write_text(
                "export const SOMETHING_ELSE = 42;\n", encoding="utf-8"
            )
            with warnings.catch_warnings(record=True) as w:
                warnings.simplefilter("always")
                ds = read_deck_source(deck)
                # At least one warning was emitted from the parse path
                self.assertTrue(any("stages.ts" in str(x.message) for x in w))
            self.assertEqual(ds.stages, [])


class TestDeckName(unittest.TestCase):
    def test_name_from_package_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = _scaffold_deck(Path(tmp), pkg_name="stacklink-pitch")
            (deck / "src" / "deck" / "stages.json").write_text("[]", encoding="utf-8")
            ds = read_deck_source(deck)
            self.assertEqual(ds.name, "stacklink-pitch")

    def test_strips_scope_prefix(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = _scaffold_deck(Path(tmp), pkg_name="@morph/stacklink-pitch")
            (deck / "src" / "deck" / "stages.json").write_text("[]", encoding="utf-8")
            ds = read_deck_source(deck)
            self.assertEqual(ds.name, "stacklink-pitch")

    def test_falls_back_to_dir_basename(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = _scaffold_deck(Path(tmp), with_pkg=False)
            (deck / "src" / "deck" / "stages.json").write_text("[]", encoding="utf-8")
            ds = read_deck_source(deck)
            self.assertEqual(ds.name, "demo-deck")

    def test_falls_back_when_pkg_missing_name(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = _scaffold_deck(Path(tmp), pkg_name=None)  # writes empty {} pkg
            (deck / "src" / "deck" / "stages.json").write_text("[]", encoding="utf-8")
            ds = read_deck_source(deck)
            self.assertEqual(ds.name, "demo-deck")


class TestErrors(unittest.TestCase):
    def test_raises_when_stages_missing(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = _scaffold_deck(Path(tmp))
            # No stages.{ts,json} in src/deck/
            with self.assertRaises(FileNotFoundError):
                read_deck_source(deck)

    def test_raises_when_path_not_a_dir(self):
        with tempfile.TemporaryDirectory() as tmp:
            f = Path(tmp) / "not-a-dir"
            f.write_text("hi", encoding="utf-8")
            with self.assertRaises(NotADirectoryError):
                read_deck_source(f)


class TestEmptyData(unittest.TestCase):
    def test_only_stages_present_data_and_tokens_default_empty(self):
        with tempfile.TemporaryDirectory() as tmp:
            deck = _scaffold_deck(Path(tmp))
            sd = deck / "src" / "deck"
            (sd / "stages.json").write_text(json.dumps([]), encoding="utf-8")
            ds = read_deck_source(deck)
            self.assertEqual(ds.stages, [])
            self.assertEqual(ds.data, {})
            self.assertEqual(ds.tokens, {})


if __name__ == "__main__":
    unittest.main()
