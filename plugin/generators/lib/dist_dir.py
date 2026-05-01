"""dist_dir.py — manage the <deck>/dist/ output directory for the PPTX exporter.
Spec: R012 (output dir hygiene)."""

from pathlib import Path
import shutil

def ensure_dist(deck_path: Path, clean: bool = False) -> Path:
    """Ensure <deck>/dist/ exists. If clean=True, remove it first.
    Returns the absolute Path to the dist dir."""
    dist = Path(deck_path) / "dist"
    if clean and dist.exists():
        shutil.rmtree(dist)
    dist.mkdir(parents=True, exist_ok=True)
    return dist

def ensure_gitignore(deck_path: Path) -> None:
    """Append `dist/` to <deck>/.gitignore if missing. Idempotent."""
    gi = Path(deck_path) / ".gitignore"
    needed = "dist/"
    if gi.exists():
        existing = gi.read_text(encoding="utf-8")
        if needed in existing.splitlines():
            return
        gi.write_text(existing + ("\n" if not existing.endswith("\n") else "") + needed + "\n", encoding="utf-8")
    else:
        gi.write_text(needed + "\n", encoding="utf-8")

def artifact_path(deck_path: Path, name: str) -> Path:
    """Compute deterministic artifact path within <deck>/dist/."""
    return ensure_dist(deck_path) / name
