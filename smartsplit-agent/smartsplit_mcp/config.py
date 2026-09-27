"""Environment configuration. Loaded once at import time."""

import os
from pathlib import Path

from dotenv import load_dotenv

PACKAGE_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PACKAGE_ROOT / ".env")


def _flag(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


# Base URL of the Express API (no trailing slash).
API_BASE_URL = os.environ.get("SMARTSPLIT_API_URL", "http://localhost:5000/api").rstrip("/")

REQUEST_TIMEOUT = float(os.environ.get("SMARTSPLIT_TIMEOUT", "20"))

# Destructive tools are not registered at all unless this is explicitly enabled.
# The SmartSplitAI API has no soft delete, so this is the kill switch.
ALLOW_DESTRUCTIVE = _flag("SMARTSPLIT_ALLOW_DESTRUCTIVE", False)

# An identical expense inside this window is rejected: the API has no
# idempotency key, so a retried timeout would otherwise double-charge a room.
DEDUPE_WINDOW_SECONDS = float(os.environ.get("SMARTSPLIT_DEDUPE_WINDOW", "60"))

# Optional server-side credentials. When set, the server logs in by itself on
# first use, so the agent never has to be told a password (which would send it
# to the model provider).
AUTO_LOGIN_EMAIL = os.environ.get("SMARTSPLIT_EMAIL", "")
AUTO_LOGIN_PASSWORD = os.environ.get("SMARTSPLIT_PASSWORD", "")

# Agent-side only; the MCP server never calls OpenAI.
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "")
