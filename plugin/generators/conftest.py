"""Pytest configuration for pptx_renderers tests."""

import sys
from pathlib import Path

# Ensure generators directory is importable as a package context
GENERATORS_DIR = Path(__file__).parent
PLUGIN_DIR = GENERATORS_DIR.parent

# Add plugin to path so lib can be imported correctly
if str(PLUGIN_DIR) not in sys.path:
    sys.path.insert(0, str(PLUGIN_DIR))

