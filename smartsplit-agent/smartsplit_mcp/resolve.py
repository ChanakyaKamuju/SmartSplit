"""Turn human references ("Ravi", an email, "me") into member ObjectIds.

This is the core of the semantic layer. The REST API takes 24-character ids for
paidBy, splits[].user, userId and memberOrder; a model handed those parameters
directly will invent them. Everything here fails loudly on ambiguity rather
than guessing - display names are not unique in this data model.
"""

from typing import Any

from .api import SmartSplitError
from .session import session

SELF_WORDS = {"me", "myself", "i", "self"}


def _candidates_text(members: list[dict[str, Any]]) -> str:
    return ", ".join(f"{m['name']} <{m['email']}>" for m in members)


def member(query: str) -> dict[str, Any]:
    """Resolve one member of the active room. Raises with candidates listed."""
    session.require_room()
    members = session.members
    if not members:
        raise SmartSplitError(
            400, "The active room has no cached members. Call select_room again."
        )

    raw = (query or "").strip()
    if not raw:
        raise SmartSplitError(400, "No member given.")

    needle = raw.lower()

    # "me" / "myself"
    if needle in SELF_WORDS:
        me = session.require_user()
        for m in members:
            if m["_id"] == me["_id"]:
                return m
        raise SmartSplitError(
            400, f"You ({me['name']}) are not a member of this room."
        )

    # Exact id
    for m in members:
        if m["_id"] == raw:
            return m

    # Exact email
    email_hits = [m for m in members if m["email"].lower() == needle]
    if len(email_hits) == 1:
        return email_hits[0]

    # Exact (case-insensitive) full name
    name_hits = [m for m in members if m["name"].lower() == needle]
    if len(name_hits) == 1:
        return name_hits[0]
    if len(name_hits) > 1:
        raise SmartSplitError(
            400,
            f"'{raw}' matches {len(name_hits)} members in this room "
            f"({_candidates_text(name_hits)}). Pass the email address instead.",
        )

    # Unique prefix / first name
    prefix_hits = [m for m in members if m["name"].lower().startswith(needle)]
    if len(prefix_hits) == 1:
        return prefix_hits[0]
    if len(prefix_hits) > 1:
        raise SmartSplitError(
            400,
            f"'{raw}' is ambiguous - it matches {_candidates_text(prefix_hits)}. "
            f"Use the full name or the email address.",
        )

    raise SmartSplitError(
        404,
        f"No member of this room matches '{raw}'. Members are: "
        f"{_candidates_text(members)}",
    )


def members(queries: list[str]) -> list[dict[str, Any]]:
    """Resolve a list, rejecting duplicates (a split cannot list someone twice)."""
    resolved: list[dict[str, Any]] = []
    seen: set[str] = set()
    for query in queries:
        found = member(query)
        if found["_id"] in seen:
            raise SmartSplitError(
                400, f"{found['name']} is listed more than once."
            )
        seen.add(found["_id"])
        resolved.append(found)
    return resolved
