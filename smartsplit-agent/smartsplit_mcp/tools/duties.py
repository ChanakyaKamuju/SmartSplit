"""Recurring-duty tools.

All rotation maths stays in the backend (backend/utils/dutyAssignment.js);
this layer only translates names to ids.
"""

from .. import format
from ..api import SmartSplitError, client
from ..resolve import member as resolve_member
from ..resolve import members as resolve_members
from ..session import session
from . import READ_ONLY, WRITE


def register(mcp) -> None:
    @mcp.tool(annotations=READ_ONLY)
    def get_duties() -> str:
        """Today's duty assignments, the rotation order, and your own duty."""
        room = session.require_room()
        payload = client.get(
            f"/duties/{room['_id']}", token=session.require_token()
        )
        return format.duties(payload)

    @mcp.tool(annotations=WRITE)
    def configure_duties(duties: list[str], member_order: list[str]) -> str:
        """Set up the duty rotation for the active room. Requires room admin.

        `duties` are task descriptions, e.g. ["Dishes", "Trash"].
        `member_order` is the rotation ring, by name or email, in order.
        There cannot be more duties than members. Saving resets the rotation to
        the first member and clears any skips.
        """
        room = session.require_room()
        session.require_admin("Configuring duties")

        if not duties:
            raise SmartSplitError(400, "Give at least one duty description.")
        if not member_order:
            raise SmartSplitError(400, "Give the rotation order.")
        cleaned = [d.strip() for d in duties if d and d.strip()]
        if not cleaned:
            raise SmartSplitError(400, "Duty descriptions cannot be blank.")
        if len(cleaned) > len(member_order):
            raise SmartSplitError(
                400,
                f"{len(cleaned)} duties but only {len(member_order)} members in the "
                f"rotation. There cannot be more duties than members.",
            )

        people = resolve_members(member_order)
        client.post(
            f"/duties/{room['_id']}/configure",
            json={
                "duties": [{"description": d} for d in cleaned],
                "memberOrder": [p["_id"] for p in people],
            },
            token=session.require_token(),
        )

        payload = client.get(
            f"/duties/{room['_id']}", token=session.require_token()
        )
        return (
            f"Configured {len(cleaned)} duties over "
            f"{len(people)} members.\n\n{format.duties(payload)}"
        )

    @mcp.tool(annotations=WRITE)
    def skip_member_today(member: str) -> str:
        """Skip one member for the current duty cycle. Requires room admin.

        Their duties are handed to the remaining members. The skip is cleared
        automatically when the rotation advances at midnight.
        """
        room = session.require_room()
        session.require_admin("Skipping a member")
        target = resolve_member(member)
        payload = client.put(
            f"/duties/{room['_id']}/skip-member",
            json={"membersToSkip": [target["_id"]]},
            token=session.require_token(),
        )
        return f"Skipped {target['name']} for today.\n\n{format.duties(payload)}"
