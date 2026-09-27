"""MCP server entrypoint (stdio).

Run directly:      python -m smartsplit_mcp.server
Or via the script: smartsplit-mcp
"""

import logging
import sys

from mcp.server.mcpserver import MCPServer

from . import config
from .tools import auth, duties, expenses, rooms, treasure

INSTRUCTIONS = """\
Tools for SmartSplitAI, a shared-expenses app for people living together.

Always in this order:
  1. login(email, password)
  2. list_my_rooms() then select_room(name_or_code)
  3. anything else - every room-scoped tool acts on the active room

Refer to people by name, email, or "me". Never pass raw ids; the server
resolves them and will tell you when a name is ambiguous. Do not compute
split amounts yourself - describe the split and the server calculates it.
Read the current state (get_balances, list_expenses, get_duties) before
changing anything.
"""


def build_server() -> MCPServer:
    # httpx logs every request at INFO, which is noise in an MCP client's log.
    logging.getLogger("httpx").setLevel(logging.WARNING)

    mcp = MCPServer(
        name="smartsplit",
        version="0.1.0",
        instructions=INSTRUCTIONS,
    )

    auth.register(mcp)
    rooms.register(mcp)
    expenses.register(mcp)
    treasure.register(mcp)
    duties.register(mcp)

    # Irreversible operations are absent unless explicitly enabled, because
    # the SmartSplitAI API has no soft delete and no backup.
    if config.ALLOW_DESTRUCTIVE:
        rooms.register_destructive(mcp)
        expenses.register_destructive(mcp)
        treasure.register_destructive(mcp)
        print(
            "[smartsplit-mcp] destructive tools ENABLED "
            "(SMARTSPLIT_ALLOW_DESTRUCTIVE)",
            file=sys.stderr,
        )
    else:
        print(
            "[smartsplit-mcp] destructive tools disabled; set "
            "SMARTSPLIT_ALLOW_DESTRUCTIVE=true to register them",
            file=sys.stderr,
        )

    return mcp


def main() -> None:
    print(f"[smartsplit-mcp] API base: {config.API_BASE_URL}", file=sys.stderr)
    build_server().run(transport="stdio")


if __name__ == "__main__":
    main()
