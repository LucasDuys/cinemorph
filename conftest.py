"""Pytest configuration and fixtures."""

import sys
from pathlib import Path

# Add plugin/generators to path to enable imports
PROJECT_ROOT = Path(__file__).parent
GENERATORS_PATH = PROJECT_ROOT / "plugin" / "generators"
if str(GENERATORS_PATH) not in sys.path:
    sys.path.insert(0, str(GENERATORS_PATH))
