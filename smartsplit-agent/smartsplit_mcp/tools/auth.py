"""Authentication tools."""

from ..api import SmartSplitError, client
from ..session import session
from . import READ_ONLY, WRITE


def register(mcp) -> None:
    @mcp.tool(annotations=WRITE)
    def login(email: str, password: str) -> str:
        """Log in to SmartSplitAI. Must be called before anything else.

        The auth token is held inside the server and is never returned.
        """
        payload = client.post(
            "/users/login", json={"email": email, "password": password}
        )
        session.login(payload)
        return (
            f"Logged in as {session.user['name']} <{session.user['email']}>. "
            f"Next: list_my_rooms() then select_room(...)."
        )

    @mcp.tool(annotations=READ_ONLY)
    def whoami() -> str:
        """Report who is logged in, which room is active, and your role in it.

        If the server was configured with credentials it logs in by itself, so
        call this first: you may already be authenticated.
        """
        if not session.user:
            try:
                session.ensure_login()
            except SmartSplitError as exc:
                return f"Automatic login failed: {exc.message}"
        if not session.user:
            return "Not logged in. Call login(email, password)."
        lines = [f"Logged in as {session.user['name']} <{session.user['email']}>"]
        if session.room:
            lines.append(
                f"Active room: {session.room['name']} "
                f"(code {session.room['roomId']}), your role: {session.my_role()}"
            )
            lines.append(f"Members cached: {len(session.members)}")
        else:
            lines.append("No room selected yet.")
        return "\n".join(lines)
