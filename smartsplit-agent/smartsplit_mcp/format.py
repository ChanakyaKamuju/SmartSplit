"""Digest API responses into compact text.

Raw Mongo documents (with __v, createdAt, nested _ids) waste context and invite
the model to copy ids around. Tools return these strings instead.
"""

from typing import Any


def money(value: Any) -> str:
    try:
        return f"${float(value):,.2f}"
    except (TypeError, ValueError):
        return str(value)


def _date(value: Any) -> str:
    text = str(value or "")
    return text[:10] if len(text) >= 10 else text


def members(member_list: list[dict[str, Any]]) -> str:
    if not member_list:
        return "No members."
    return "\n".join(
        f"- {m['name']} <{m['email']}>" + (" [admin]" if m.get("role") == "admin" else "")
        for m in member_list
    )


def rooms(room_list: list[dict[str, Any]]) -> str:
    if not room_list:
        return "You are not a member of any rooms yet."
    return "\n".join(
        f"- {r.get('name', '?')} (code {r.get('roomId', '?')})" for r in room_list
    )


def balances(payload: dict[str, Any]) -> str:
    raw = payload.get("rawBalances") or []
    debts = payload.get("simplifiedDebts") or []

    lines = ["Balances:"]
    if not raw:
        lines.append("  (none)")
    for entry in raw:
        amount = float(entry.get("amount", 0) or 0)
        name = entry.get("name", "?")
        if amount > 0.005:
            lines.append(f"  {name} is owed {money(amount)}")
        elif amount < -0.005:
            lines.append(f"  {name} owes {money(-amount)}")
        else:
            lines.append(f"  {name} is settled up")

    lines.append("")
    if debts:
        lines.append("Who pays whom:")
        for debt in debts:
            lines.append(
                f"  {debt.get('from', '?')} -> {debt.get('to', '?')} {money(debt.get('amount'))}"
            )
    else:
        lines.append("Who pays whom: nothing outstanding.")
    return "\n".join(lines)


def expenses(expense_list: list[dict[str, Any]], limit: int | None = None) -> str:
    if not expense_list:
        return "No expenses in this room yet."
    shown = expense_list[:limit] if limit else expense_list
    lines = []
    for exp in shown:
        payer = (exp.get("paidBy") or {}).get("name", "?")
        parts = ", ".join(
            f"{(s.get('user') or {}).get('name', '?')} {money(s.get('amount'))}"
            for s in exp.get("splits", []) or []
        )
        lines.append(
            f"- {_date(exp.get('date'))} {exp.get('description', '?')} "
            f"{money(exp.get('totalAmount'))} paid by {payer} "
            f"[{exp.get('splitType', '?')}] -> {parts}"
        )
    suffix = ""
    if limit and len(expense_list) > limit:
        suffix = f"\n({len(expense_list) - limit} older expenses not shown)"
    return "\n".join(lines) + suffix


def treasure_transactions(tx_list: list[dict[str, Any]]) -> str:
    if not tx_list:
        return "No treasure transactions yet."
    lines = []
    for tx in tx_list:
        sign = "+" if tx.get("type") == "credit" else "-"
        by = (tx.get("performedBy") or {}).get("name", "unknown")
        lines.append(
            f"- {_date(tx.get('date'))} {sign}{money(tx.get('amount'))} "
            f"{tx.get('description', '?')} (by {by})"
        )
    return "\n".join(lines)


def duties(payload: dict[str, Any]) -> str:
    if not payload.get("isConfigured"):
        return "Duties are not configured for this room yet."

    lines = ["Today's duties:"]
    for duty in payload.get("allDuties", []) or []:
        assignee = duty.get("assignedTo")
        who = assignee.get("name") if isinstance(assignee, dict) else None
        lines.append(f"  {duty.get('description', '?')} -> {who or 'Unassigned'}")

    order = payload.get("memberOrder") or []
    if order:
        names = [m.get("name", "?") if isinstance(m, dict) else str(m) for m in order]
        lines.append("")
        lines.append("Rotation order: " + " -> ".join(names))

    skipped = payload.get("skippedMembersForCurrentCycle") or []
    if skipped:
        lines.append(f"Skipped this cycle: {len(skipped)} member(s)")

    mine = payload.get("currentUserDuty")
    if isinstance(mine, dict):
        lines.append(f"Your duty today: {mine.get('description', '?')}")
    return "\n".join(lines)
