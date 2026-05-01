"""deck_source.py — read a generated deck's source (stages, data, tokens).

Spec: spec-morph-deck-outputs.md R001 (PPTX exporter invocation), consumed by
T005's slide builder.

Strategy
--------
The composer (core T015) emits TypeScript files (`stages.ts`, `data.ts`,
`tokens.ts`) for the React deck. The PPTX exporter is Python. We use a
JSON-sidecar-preferred read path:

1. Prefer `<deck>/src/deck/<name>.json` if present (composer-emitted alongside
   the .ts file). Fast, deterministic, no parser needed.
2. Fallback to a regex extraction of the literal exported from the .ts file.
   This is best-effort and may return an empty list with a warning if the .ts
   file is too dynamic to parse without a real TS parser.

The composer is expected (per the project plan) to also emit JSON sidecars at
compose time. This reader prefers those; the TS-parse path exists for
hand-edited decks and as a transitional fallback.
"""

from __future__ import annotations

import json
import re
import warnings
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class DeckSource:
    """In-memory representation of a deck's source files."""
    path: Path
    name: str
    stages: list[dict] = field(default_factory=list)
    data: dict = field(default_factory=dict)
    tokens: dict = field(default_factory=dict)


# Filenames we look for under <deck>/src/deck/. JSON sidecars are preferred.
_SOURCES = ("stages", "data", "tokens")


def read_deck_source(deck_path: Path) -> DeckSource:
    """Read a deck's source files from <deck>/src/deck/.

    Args:
        deck_path: path to the deck directory (the dir containing src/, dist/,
            package.json, etc.)

    Returns:
        DeckSource with stages, data, tokens populated.

    Raises:
        FileNotFoundError: if <deck>/src/deck/stages.{ts,json} does not exist.
        NotADirectoryError: if deck_path is not a directory.
    """
    deck_path = Path(deck_path).resolve()
    if not deck_path.is_dir():
        raise NotADirectoryError(f"deck path is not a directory: {deck_path}")

    src_deck = deck_path / "src" / "deck"
    if not _has_source(src_deck, "stages"):
        raise FileNotFoundError(
            f"missing stages source: expected {src_deck / 'stages.json'} or "
            f"{src_deck / 'stages.ts'}"
        )

    name = _derive_deck_name(deck_path)
    stages = _read_array(src_deck, "stages")
    data = _read_object(src_deck, "data")
    tokens = _read_object(src_deck, "tokens")

    return DeckSource(
        path=deck_path,
        name=name,
        stages=stages,
        data=data,
        tokens=tokens,
    )


# ─── Internal helpers ───────────────────────────────────────────────────────


def _has_source(src_deck: Path, name: str) -> bool:
    return (src_deck / f"{name}.json").exists() or (src_deck / f"{name}.ts").exists()


def _read_array(src_deck: Path, name: str) -> list[dict]:
    """Read a deck source that is expected to be a top-level array (stages)."""
    json_path = src_deck / f"{name}.json"
    ts_path = src_deck / f"{name}.ts"

    if json_path.exists():
        parsed = _load_json(json_path)
        if isinstance(parsed, list):
            return parsed
        if isinstance(parsed, dict) and name.upper() in parsed and isinstance(parsed[name.upper()], list):
            return parsed[name.upper()]
        warnings.warn(
            f"{json_path}: expected JSON array (or {{'{name.upper()}': [...]}}), "
            f"got {type(parsed).__name__}"
        )
        return []

    if ts_path.exists():
        return _ts_extract_array(ts_path, name.upper()) or []

    return []


def _read_object(src_deck: Path, name: str) -> dict:
    """Read a deck source that is expected to be an object (data, tokens)."""
    json_path = src_deck / f"{name}.json"
    ts_path = src_deck / f"{name}.ts"

    if json_path.exists():
        parsed = _load_json(json_path)
        if isinstance(parsed, dict):
            return parsed
        warnings.warn(
            f"{json_path}: expected JSON object, got {type(parsed).__name__}"
        )
        return {}

    if ts_path.exists():
        return _ts_extract_object(ts_path) or {}

    return {}


def _load_json(p: Path) -> Any:
    return json.loads(p.read_text(encoding="utf-8"))


def _ts_extract_array(ts_path: Path, var_name: str) -> list[dict] | None:
    """Best-effort extract `export const <VAR_NAME> = [...]` from a .ts file.

    This is intentionally conservative. Returns None (and warns) when the
    literal cannot be parsed without a real TS parser.
    """
    text = ts_path.read_text(encoding="utf-8")
    text = _strip_ts_noise(text)

    # Match the start of the array literal
    pattern = re.compile(
        rf"(?:export\s+)?const\s+{re.escape(var_name)}\s*(?::\s*[^=]+?)?=\s*\[",
        re.MULTILINE,
    )
    m = pattern.search(text)
    if not m:
        warnings.warn(
            f"{ts_path}: could not locate `const {var_name} = [...]`; "
            f"emit a {ts_path.with_suffix('.json').name} sidecar at compose time."
        )
        return None

    start = m.end() - 1  # position of '['
    body = _balance_brackets(text, start, "[", "]")
    if body is None:
        warnings.warn(
            f"{ts_path}: failed to balance brackets for `{var_name}`; "
            f"emit a JSON sidecar instead."
        )
        return None

    try:
        parsed = _ts_literal_to_json(body)
        if isinstance(parsed, list):
            return parsed
    except Exception as e:
        warnings.warn(f"{ts_path}: TS parse fallback failed ({e}); returning empty.")

    return None


def _ts_extract_object(ts_path: Path) -> dict | None:
    """Best-effort extract the first `export const X = { ... }` object literal."""
    text = ts_path.read_text(encoding="utf-8")
    text = _strip_ts_noise(text)

    pattern = re.compile(
        r"(?:export\s+)?const\s+\w+\s*(?::\s*[^=]+?)?=\s*\{",
        re.MULTILINE,
    )
    m = pattern.search(text)
    if not m:
        warnings.warn(
            f"{ts_path}: no `const X = {{...}}` literal found; "
            f"emit a JSON sidecar at compose time."
        )
        return None

    start = m.end() - 1  # position of '{'
    body = _balance_brackets(text, start, "{", "}")
    if body is None:
        warnings.warn(f"{ts_path}: failed to balance braces.")
        return None

    try:
        parsed = _ts_literal_to_json(body)
        if isinstance(parsed, dict):
            return parsed
    except Exception as e:
        warnings.warn(f"{ts_path}: TS parse fallback failed ({e}); returning empty.")

    return None


def _strip_ts_noise(text: str) -> str:
    """Remove // line comments and /* block comments */ from TS source.
    Naive — does not understand strings — but adequate for typical deck files.
    """
    # block comments
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    # line comments (anything from // to end of line, but not inside http://)
    text = re.sub(r"(^|[^:])//[^\n]*", r"\1", text)
    return text


def _balance_brackets(text: str, start: int, open_ch: str, close_ch: str) -> str | None:
    """Return the substring from `start` through the matching closing bracket,
    inclusive. Returns None if no match is found. Skips brackets inside strings.
    """
    if start >= len(text) or text[start] != open_ch:
        return None
    depth = 0
    in_str = None  # quote char if inside a string
    escape = False
    i = start
    while i < len(text):
        ch = text[i]
        if in_str:
            if escape:
                escape = False
            elif ch == "\\":
                escape = True
            elif ch == in_str:
                in_str = None
        else:
            if ch in ('"', "'", "`"):
                in_str = ch
            elif ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    return text[start : i + 1]
        i += 1
    return None


def _ts_literal_to_json(body: str) -> Any:
    """Convert a TS object/array literal string to a JSON-parsed value.

    Handles: trailing commas, single-quoted strings, unquoted keys.
    Does NOT handle: function values, references to imports, template literals
    with interpolation. Such files should ship a JSON sidecar.
    """
    s = body
    # Replace single-quoted strings with double-quoted (carefully)
    s = _convert_single_quoted(s)
    # Unquoted keys: { foo: 1 } -> { "foo": 1 }
    s = re.sub(r"([\{\,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*):", r'\1"\2"\3:', s)
    # Trailing commas: ", }" -> " }" and ", ]" -> " ]"
    s = re.sub(r",(\s*[\}\]])", r"\1", s)
    return json.loads(s)


def _convert_single_quoted(s: str) -> str:
    """Replace single-quoted string literals with double-quoted equivalents,
    escaping any embedded double quotes. Skips content inside double-quoted
    strings or template literals.
    """
    out = []
    i = 0
    in_dq = False
    in_bt = False
    escape = False
    while i < len(s):
        ch = s[i]
        if escape:
            out.append(ch)
            escape = False
            i += 1
            continue
        if ch == "\\":
            out.append(ch)
            escape = True
            i += 1
            continue
        if in_dq:
            out.append(ch)
            if ch == '"':
                in_dq = False
            i += 1
            continue
        if in_bt:
            out.append(ch)
            if ch == "`":
                in_bt = False
            i += 1
            continue
        if ch == '"':
            in_dq = True
            out.append(ch)
            i += 1
            continue
        if ch == "`":
            in_bt = True
            out.append(ch)
            i += 1
            continue
        if ch == "'":
            # consume single-quoted string up to next un-escaped '
            j = i + 1
            buf = []
            while j < len(s):
                cj = s[j]
                if cj == "\\" and j + 1 < len(s):
                    buf.append(cj)
                    buf.append(s[j + 1])
                    j += 2
                    continue
                if cj == "'":
                    break
                buf.append(cj)
                j += 1
            inner = "".join(buf).replace('"', '\\"')
            out.append('"' + inner + '"')
            i = j + 1
            continue
        out.append(ch)
        i += 1
    return "".join(out)


def _derive_deck_name(deck_path: Path) -> str:
    """Read package.json `name` field; fallback to deck-dir basename."""
    pkg = deck_path / "package.json"
    if pkg.exists():
        try:
            data = json.loads(pkg.read_text(encoding="utf-8"))
            n = data.get("name")
            if isinstance(n, str) and n.strip():
                # Strip scope prefix like "@scope/foo" → "foo" for filenames
                return n.split("/")[-1]
        except (json.JSONDecodeError, OSError):
            pass
    return deck_path.name
