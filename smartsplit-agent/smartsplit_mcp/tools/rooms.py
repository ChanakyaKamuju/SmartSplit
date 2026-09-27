"""Room and membership tools."""

from .. import format
from ..api import SmartSplitError, client
from ..resolve import member as resolve_member
from ..session import session
from . import DESTRUCTIVE, READ_ONLY, WRITE


def _load_room(room_id: str) -> str:
    """Fetch the populated room document and make it the active room."""
    room = client.get(f"/rooms/{room_id}", token=session.require_token())
    session.set_room(room)
    active = session.room
    return (
        f"Active room: {active['name']} (code {active['roomId']}), "
        f"your role: {session.my_role()}, treasure {format.money(active['treasure'])}\n"
        f"{format.members(session.members)}"
    )


def register(mcp) -> None:
    @mcp.tool(annotations=READ_ONLY)
    def list_my_rooms() -> str:
        """List every room you belong to, with its shareable code."""
        rooms = client.get("/rooms/my-rooms", token=session.require_token())
        return format.rooms(rooms)

    @mcp.tool(annotations=READ_ONLY)
    def select_room(name_or_code: str) -> str:
        """Make a room active by its name or 6-character code.

        Every other room-scoped tool operates on the active room, so call this
        once before adding expenses, reading balances, or managing duties.
        """
        token = session.require_token()
        rooms = client.get("/rooms/my-rooms", token=token)
        needle = (name_or_code or "").strip().lower()
        if not needle:
            raise SmartSplitError(400, "Give a room name or code.")

        exact = [
            r
            for r in rooms
            if (r.get("roomId", "") or "").lower() == needle
            or (r.get("name", "") or "").lower() == needle
        ]
        matches = exact or [
            r for r in rooms if needle in (r.get("name", "") or "").lower()
        ]

        if not matches:
            raise SmartSplitError(
                404,
                f"No room of yours matches '{name_or_code}'. Your rooms:\n"
                f"{format.rooms(rooms)}",
            )
        if len(matches) > 1:
            listed = ", ".join(
                f"{r.get('name')} ({r.get('roomId')})" for r in matches
            )
            raise SmartSplitError(
                400, f"'{name_or_code}' matches several rooms: {listed}. Use the code."
            )
        return _load_room(matches[0]["_id"])

    @mcp.tool(annotations=READ_ONLY)
    def get_room() -> str:
        """Re-read the active room: members, roles, treasure total."""
        room = session.require_room()
        return _load_room(room["_id"])

    @mcp.tool(annotations=READ_ONLY)
    def room_summary() -> str:
        """One-shot overview of the active room: members, admins, treasure and
        who currently owes whom.

        Prefer this over calling get_room, get_treasure and get_balances
        separately when you just need to know the state of things.
        """
        room = session.require_room()
        token = session.require_token()

        treasure = client.get(f"/treasure/{room['_id']}", token=token)
        balances = client.get(f"/expenses/{room['_id']}/balances", token=token)
        debts = balances.get("simplifiedDebts") or []
        admins = [m["name"] for m in session.members if m["role"] == "admin"]

        lines = [
            f"{room['name']} (code {room['roomId']})",
            f"  members ({len(session.members)}): "
            + ", ".join(m["name"] for m in session.members),
            f"  admins: {', '.join(admins) or 'none'}",
            f"  treasure: {format.money(treasure.get('currentTreasure'))}",
        ]
        if debts:
            lines.append(f"  outstanding debts ({len(debts)}):")
            lines += [
                f"    {d.get('from')} -> {d.get('to')} {format.money(d.get('amount'))}"
                for d in debts
            ]
        else:
            lines.append("  outstanding debts: none, everyone is settled up")
        return "\n".join(lines)

    @mcp.tool(annotations=WRITE)
    def create_room(name: str) -> str:
        """Create a room (you become its admin) and make it active."""
        created = client.post(
            "/rooms/create", json={"name": name}, token=session.require_token()
        )
        return f"Created room '{created.get('name')}'.\n" + _load_room(created["_id"])

    @mcp.tool(annotations=WRITE)
    def join_room(code: str) -> str:
        """Join an existing room using its 6-character code, and make it active."""
        joined = client.post(
            "/rooms/join", json={"roomId": code}, token=session.require_token()
        )
        return f"Joined '{joined.get('name')}'.\n" + _load_room(joined["_id"])

    @mcp.tool(annotations=WRITE)
    def add_member(email: str, role: str = "user") -> str:
        """Add a registered user to the active room by email. Requires room admin.

        role must be "user" or "admin". The person must already have a
        SmartSplitAI account.
        """
        room = session.require_room()
        session.require_admin("Adding a member")
        if role not in {"user", "admin"}:
            raise SmartSplitError(400, 'role must be "user" or "admin".')
        client.put(
            f"/rooms/{room['_id']}/add-member",
            json={"email": email, "role": role},
            token=session.require_token(),
        )
        return f"Added {email} as {role}.\n" + _load_room(room["_id"])

    @mcp.tool(annotations=WRITE)
    def change_member_role(member: str, role: str) -> str:
        """Promote or demote a member of the active room. Requires room admin.

        Identify the member by name or email; role must be "user" or "admin".
        """
        room = session.require_room()
        session.require_admin("Changing a role")
        if role not in {"user", "admin"}:
            raise SmartSplitError(400, 'role must be "user" or "admin".')
        target = resolve_member(member)
        client.put(
            f"/rooms/{room['_id']}/change-role",
            json={"userId": target["_id"], "newRole": role},
            token=session.require_token(),
        )
        return f"{target['name']} is now {role}.\n" + _load_room(room["_id"])


def register_destructive(mcp) -> None:
    @mcp.tool(annotations=DESTRUCTIVE)
    def remove_member(member: str, confirm: bool = False) -> str:
        """Remove a member from the active room. Requires room admin.

        Irreversible. Pass confirm=True to actually do it. The API refuses if
        the member still has a non-zero balance - settle up first.
        """
        room = session.require_room()
        session.require_admin("Removing a member")
        target = resolve_member(member)
        if not confirm:
            return (
                f"Refused: this would remove {target['name']} <{target['email']}> "
                f"from '{room['name']}' and drop them from the duty rotation. "
                f"There is no undo. Re-call with confirm=True to proceed."
            )
        client.put(
            f"/rooms/{room['_id']}/remove-member",
            json={"userId": target["_id"]},
            token=session.require_token(),
        )
        return f"Removed {target['name']}.\n" + _load_room(room["_id"])

    @mcp.tool(annotations=DESTRUCTIVE)
    def leave_room(confirm: bool = False) -> str:
        """Leave the active room.

        Irreversible. Pass confirm=True to proceed. The API refuses if you have
        a non-zero balance, or if you are the last admin.
        """
        room = session.require_room()
        if not confirm:
            return (
                f"Refused: this would remove you from '{room['name']}' "
                f"({len(session.members)} members). You would need the room code "
                f"to rejoin. Re-call with confirm=True to proceed."
            )
        client.put(f"/rooms/{room['_id']}/leave", token=session.require_token())
        name = room["name"]
        session.clear_room()
        return f"Left '{name}'. No room is active now."

    @mcp.tool(annotations=DESTRUCTIVE)
    def delete_room(confirm: bool = False) -> str:
        """Delete the active room permanently. Requires room admin.

        Irreversible. Pass confirm=True to proceed. The API refuses unless you
        are the only member left and the room has no expenses.
        """
        room = session.require_room()
        session.require_admin("Deleting a room")
        if not confirm:
            return (
                f"Refused: this would permanently delete '{room['name']}' "
                f"(code {room['roomId']}) along with its treasure history and "
                f"duty configuration. There is no undo and no backup. "
                f"Re-call with confirm=True to proceed."
            )
        client.delete(f"/rooms/{room['_id']}", token=session.require_token())
        name = room["name"]
        session.clear_room()
        return f"Deleted '{name}'. No room is active now."
