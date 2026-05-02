"""Font handling for PPTX export.

Provides font resolution, fallback logic, and embedding stubs.
Follows python-pptx conventions for run.font.name assignment.
"""

import sys
import subprocess
from pathlib import Path
from typing import Optional

# ─── Primary fonts (required in system or --embed-fonts) ──────────────────
PRIMARY_FONTS = {
    "sans": "Inter",
    "display": "Space Grotesk",
    "mono": "JetBrains Mono",
}

# ─── Fallback fonts (available on Windows/macOS/Linux by default) ──────────
FALLBACK_FONTS = {
    "sans": "Calibri",
    "display": "Calibri",
    "mono": "Consolas",
}

# ─── Warning tracking (warn only once per font per session) ───────────────
_warned_fonts = set()


def resolve_font(role: str, theme: Optional[dict] = None) -> str:
    """Resolve font name for a given role.

    Args:
        role: One of 'sans', 'display', 'mono'
        theme: Optional theme dict. If theme.get('fonts', {}).get(role)
               is present, use it; otherwise use PRIMARY_FONTS[role].

    Returns:
        The resolved font name (string).
    """
    if theme is not None:
        theme_fonts = theme.get("fonts", {})
        if role in theme_fonts:
            return theme_fonts[role]
    return PRIMARY_FONTS.get(role, "Calibri")


def enumerate_system_fonts() -> set[str]:
    """Enumerate system fonts available on the machine.

    Tries matplotlib.font_manager first (cross-platform).
    Falls back to OS-specific font directories.
    Returns empty set if enumeration fails (assume fonts present).

    Returns:
        Set of font names (case-sensitive, e.g., {'Inter', 'Calibri'}).
    """
    fonts = set()

    # Try matplotlib.font_manager (most reliable)
    try:
        import matplotlib.font_manager as fm

        fm_fonts = fm.findSystemFonts()
        for font_path in fm_fonts:
            # Extract name from filename (heuristic)
            name = Path(font_path).stem
            if name:
                fonts.add(name)
        if fonts:
            return fonts
    except (ImportError, Exception):
        pass

    # Fall back to OS-specific directory walks
    font_dirs = []
    if sys.platform == "win32":
        font_dirs = [Path("C:/Windows/Fonts")]
    elif sys.platform == "darwin":
        font_dirs = [
            Path("/Library/Fonts"),
            Path.home() / "Library/Fonts",
        ]
    elif sys.platform.startswith("linux"):
        font_dirs = [
            Path("/usr/share/fonts"),
            Path.home() / ".fonts",
        ]

    for font_dir in font_dirs:
        if font_dir.is_dir():
            for font_file in font_dir.rglob("*.ttf"):
                name = font_file.stem
                if name:
                    fonts.add(name)

    return fonts


def apply_font_to_run(
    run,
    role: str,
    theme: Optional[dict] = None,
    *,
    embed_fonts: bool = False,
    system_fonts: Optional[set[str]] = None,
) -> None:
    """Apply a font to a python-pptx text run.

    Resolves the font name, checks if available in system_fonts,
    and falls back with a warning if not found (only warns once per session).

    Args:
        run: A python-pptx run object (has .font.name attribute).
        role: One of 'sans', 'display', 'mono'.
        theme: Optional theme dict for font overrides.
        embed_fonts: If False (default), warn if font is not in system_fonts.
                     If True, assume embedding will handle missing fonts.
        system_fonts: Set of available system font names. If None and
                      embed_fonts=False, no check is performed.
    """
    resolved = resolve_font(role, theme)

    # If embedding is enabled, trust the font will be embedded
    if embed_fonts:
        run.font.name = resolved
        return

    # Check system fonts and warn if missing (once per font)
    if system_fonts is not None and resolved not in system_fonts:
        if resolved not in _warned_fonts:
            _warned_fonts.add(resolved)
            fallback = FALLBACK_FONTS.get(role, "Calibri")
            print(
                f"Warning: font '{resolved}' not found in system fonts; falling back to '{fallback}'",
                file=sys.stderr,
            )
        run.font.name = FALLBACK_FONTS.get(role, "Calibri")
    else:
        run.font.name = resolved


def embed_fonts_in_pptx(prs, fonts: list[str]) -> None:
    """Stub for embedding font binaries into PPTX.

    This is a deferred feature. Real implementation would require:
    - Font .ttf binaries (not bundled; see spec for rationale)
    - OLE object embedding in PPTX XML
    - Font subsetting for size optimization

    For now, logs a message and continues (does not break).

    Args:
        prs: A python-pptx Presentation object.
        fonts: List of font names to embed.
    """
    print(
        f"embed-fonts not yet implemented (font binaries not bundled)",
        file=sys.stderr,
    )
