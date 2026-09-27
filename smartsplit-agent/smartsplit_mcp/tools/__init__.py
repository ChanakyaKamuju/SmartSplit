"""Tool modules. Each exposes register(mcp) and is wired up in server.py."""

from mcp.types import ToolAnnotations

READ_ONLY = ToolAnnotations(read_only_hint=True, destructive_hint=False)
WRITE = ToolAnnotations(read_only_hint=False, destructive_hint=False)
DESTRUCTIVE = ToolAnnotations(read_only_hint=False, destructive_hint=True)

__all__ = ["READ_ONLY", "WRITE", "DESTRUCTIVE"]
