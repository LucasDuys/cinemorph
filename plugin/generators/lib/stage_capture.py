"""
Stage capture for Element3D PPTX rendering.

Wraps Playwright sync API to capture a static PNG from a live deck preview
at a specified stage and bounding box. This is used by element3d.py to
embed 3D elements as static fallback images in PPTX.

Spec: spec-morph-deck-verifier.md R010.AC2
- Uses playwright.sync_api for headless Chromium
- Reuses the same pipeline as spec-outputs R002
- Captures a clipped region defined by bounding_box (left, top, width, height in px)

Installation note:
    If playwright is not yet installed, run: python -m playwright install chromium

This ensures the headless Chromium browser is available.
"""

import subprocess
from pathlib import Path
from typing import Dict

try:
    from playwright.sync_api import sync_playwright
except ImportError:
    sync_playwright = None


def start_preview_server(deck_path: Path, port: int = 5173) -> str:
    """
    Start the Vite preview server for a deck.

    Args:
        deck_path: Path to the deck directory
        port: Port to run preview on (default 5173)

    Returns:
        URL of the preview server (e.g. http://localhost:5173)

    Raises:
        RuntimeError: If server fails to start or port is in use
    """
    import subprocess
    import time

    # Check if port is already in use by attempting to connect
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    port_in_use = sock.connect_ex(('localhost', port)) == 0
    sock.close()

    if port_in_use:
        raise RuntimeError(f"Port {port} is already in use")

    # Start the preview server in the background
    # This should be non-blocking; the calling code will wait for port readiness
    proc = subprocess.Popen(
        ['bun', 'run', 'preview'],
        cwd=str(deck_path),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )

    # Wait for server to be ready by polling the port
    max_retries = 40  # 20 seconds at 500ms intervals
    for i in range(max_retries):
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = sock.connect_ex(('localhost', port))
        sock.close()
        if result == 0:
            # Port is now open; server is ready
            return f"http://localhost:{port}"
        time.sleep(0.5)

    raise RuntimeError(f"Preview server did not start on port {port} within 20s")


def capture_stage_png(
    deck_path: Path,
    stage_index: int,
    bounding_box: Dict[str, float],
    port: int = 5173,
) -> bytes:
    """
    Capture a PNG screenshot of a stage at a specific bounding box.

    Uses playwright.sync_api to control headless Chromium, navigates to the
    live preview server, jumps to the specified stage, and captures the
    clipped region defined by bounding_box.

    Args:
        deck_path: Path to the deck directory (must have bun preview available)
        stage_index: 0-indexed stage number to capture
        bounding_box: Dict with keys 'left', 'top', 'width', 'height' (pixels)
        port: Port for preview server (default 5173)

    Returns:
        PNG bytes (raw image data)

    Raises:
        RuntimeError: If playwright is not installed, server fails, or capture fails
        ValueError: If bounding_box is invalid
    """
    if sync_playwright is None:
        raise RuntimeError(
            "playwright is not installed. Run: python -m playwright install chromium"
        )

    # Validate bounding box
    required_keys = {'left', 'top', 'width', 'height'}
    if not isinstance(bounding_box, dict) or not required_keys.issubset(bounding_box.keys()):
        raise ValueError(
            f"bounding_box must contain keys {required_keys}, got {bounding_box.keys()}"
        )

    deck_path = Path(deck_path)
    if not deck_path.is_dir():
        raise ValueError(f"deck_path must be a directory: {deck_path}")

    # Start preview server
    url = start_preview_server(deck_path, port=port)

    try:
        with sync_playwright() as p:
            # Launch headless Chromium
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(
                viewport={'width': 1920, 'height': 1080},
            )
            page = context.new_page()

            try:
                # Navigate to preview
                page.goto(url, wait_until='networkidle')

                # Jump to the specified stage
                # The preview server should expose a way to jump to a stage
                # via URL hash or a window function like window.__morphDeck?.jumpTo(N)
                # Try the URL hash approach first
                page.goto(f"{url}#stage={stage_index}", wait_until='networkidle')

                # Wait for animations to settle (1500ms is standard per spec)
                page.wait_for_timeout(1500)

                # Capture the clipped region
                clip = {
                    'x': bounding_box['left'],
                    'y': bounding_box['top'],
                    'width': bounding_box['width'],
                    'height': bounding_box['height'],
                }

                png_bytes = page.screenshot(clip=clip, type='png')

                return png_bytes

            finally:
                page.close()
                context.close()
                browser.close()

    except Exception as e:
        raise RuntimeError(f"Failed to capture stage {stage_index}: {e}") from e
