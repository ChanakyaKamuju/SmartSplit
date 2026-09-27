"""Expense, balance and settlement tools.

Split arithmetic happens here, not in the model. The backend validates sums
strictly (unequal must equal the total within a cent, percentages must total
100), so we compute and check locally first and return a fixable message
instead of letting a rounding slip become an HTTP 400.
"""

from typing import Any

from .. import config, format
from ..api import SmartSplitError, client
from ..resolve import member as resolve_member
from ..resolve import members as resolve_members
from ..session import session
from . import DESTRUCTIVE, READ_ONLY, WRITE

SPLIT_TYPES = {"equal", "unequal", "percentage", "shares"}
TOLERANCE = 0.01


def _fetch_balances() -> dict[str, Any]:
    room = session.require_room()
    return client.get(
        f"/expenses/{room['_id']}/balances", token=session.require_token()
    )


def _require_parallel(
    label: str, values: list[float] | None, participants: list[str]
) -> list[float]:
    if not values:
        raise SmartSplitError(
            400,
            f"split_type requires '{label}': one value per participant, "
            f"in the same order as participants.",
        )
    if len(values) != len(participants):
        raise SmartSplitError(
            400,
            f"Got {len(participants)} participants but {len(values)} {label}. "
            f"They must line up one-to-one.",
        )
    try:
        return [float(v) for v in values]
    except (TypeError, ValueError):
        raise SmartSplitError(400, f"All {label} must be numbers.") from None


def register(mcp) -> None:
    @mcp.tool(annotations=READ_ONLY)
    def list_expenses(limit: int = 10) -> str:
        """List recent expenses in the active room, newest first."""
        room = session.require_room()
        expenses = client.get(
            f"/expenses/{room['_id']}", token=session.require_token()
        )
        return format.expenses(expenses, limit=limit)

    @mcp.tool(annotations=READ_ONLY)
    def get_balances() -> str:
        """Who is owed, who owes, and the simplified who-pays-whom list."""
        return format.balances(_fetch_balances())

    @mcp.tool(annotations=WRITE)
    def add_expense(
        description: str,
        total_amount: float,
        paid_by: str,
        participants: list[str],
        split_type: str = "equal",
        amounts: list[float] | None = None,
        percentages: list[float] | None = None,
        shares: list[float] | None = None,
        allow_duplicate: bool = False,
    ) -> str:
        """Add an expense to the active room.

        Identify people by name, email, or "me" - never by id.

        split_type:
          - "equal"      : divided evenly among participants (default)
          - "unequal"    : pass `amounts`, one per participant, summing to total_amount
          - "percentage" : pass `percentages`, one per participant, summing to 100
          - "shares"     : pass `shares`, one per participant (e.g. [2, 1, 1])

        `participants` is the list of people the cost is split between, and the
        parallel list (`amounts`/`percentages`/`shares`) must be in the same order.
        """
        room = session.require_room()
        token = session.require_token()

        if not description or not description.strip():
            raise SmartSplitError(400, "description is required.")
        try:
            total = float(total_amount)
        except (TypeError, ValueError):
            raise SmartSplitError(400, "total_amount must be a number.") from None
        if total <= 0:
            raise SmartSplitError(400, "total_amount must be greater than zero.")
        if split_type not in SPLIT_TYPES:
            raise SmartSplitError(
                400, f"split_type must be one of {sorted(SPLIT_TYPES)}."
            )
        if not participants:
            raise SmartSplitError(
                400, "participants must list at least one person."
            )

        payer = resolve_member(paid_by)
        people = resolve_members(participants)

        if not allow_duplicate and session.seen_expense_recently(
            description, total, payer["_id"], config.DEDUPE_WINDOW_SECONDS
        ):
            raise SmartSplitError(
                409,
                f"An identical expense ('{description}' {format.money(total)} paid by "
                f"{payer['name']}) was just added. This API has no idempotency key, so "
                f"this is probably a retry. Pass allow_duplicate=True if it is genuinely "
                f"a second, separate expense.",
            )

        splits: list[dict[str, Any]] = []
        preview: list[str] = []

        if split_type == "equal":
            splits = [{"user": p["_id"]} for p in people]
            each = round(total / len(people), 2)
            preview = [f"{p['name']} {format.money(each)}" for p in people]

        elif split_type == "unequal":
            values = _require_parallel("amounts", amounts, participants)
            if any(v <= 0 for v in values):
                raise SmartSplitError(400, "Every amount must be greater than zero.")
            if abs(sum(values) - total) > TOLERANCE:
                raise SmartSplitError(
                    400,
                    f"The amounts add up to {format.money(sum(values))} but the total is "
                    f"{format.money(total)}. Adjust them to match.",
                )
            splits = [
                {"user": p["_id"], "amount": round(v, 2)}
                for p, v in zip(people, values)
            ]
            preview = [
                f"{p['name']} {format.money(v)}" for p, v in zip(people, values)
            ]

        elif split_type == "percentage":
            values = _require_parallel("percentages", percentages, participants)
            if any(v < 0 or v > 100 for v in values):
                raise SmartSplitError(400, "Percentages must be between 0 and 100.")
            if abs(sum(values) - 100) > TOLERANCE:
                raise SmartSplitError(
                    400,
                    f"The percentages add up to {sum(values):g}%, not 100%. Adjust them.",
                )
            splits = [
                {"user": p["_id"], "percentage": v} for p, v in zip(people, values)
            ]
            preview = [
                f"{p['name']} {v:g}% ({format.money(total * v / 100)})"
                for p, v in zip(people, values)
            ]

        else:  # shares
            values = _require_parallel("shares", shares, participants)
            if any(v <= 0 for v in values):
                raise SmartSplitError(400, "Every share must be greater than zero.")
            unit = total / sum(values)
            splits = [
                {"user": p["_id"], "shares": v} for p, v in zip(people, values)
            ]
            preview = [
                f"{p['name']} {v:g} share(s) ({format.money(unit * v)})"
                for p, v in zip(people, values)
            ]

        client.post(
            "/expenses/add",
            json={
                "roomId": room["_id"],
                "description": description.strip(),
                "totalAmount": round(total, 2),
                "paidBy": payer["_id"],
                "splitType": split_type,
                "splits": splits,
            },
            token=token,
        )
        session.remember_expense(description, total, payer["_id"])

        return (
            f"Added '{description.strip()}' {format.money(total)} paid by "
            f"{payer['name']} ({split_type} split):\n  "
            + "\n  ".join(preview)
        )

    @mcp.tool(annotations=WRITE)
    def settle_debt(
        from_member: str, to_member: str, amount: float | None = None
    ) -> str:
        """Record a payment that clears a debt between two members.

        Leave `amount` empty to settle the exact outstanding figure - the server
        reads it from the current balances so nobody has to compute it. This is
        recorded as a balancing expense, which is how the web app does it too.
        """
        room = session.require_room()
        token = session.require_token()

        debtor = resolve_member(from_member)
        creditor = resolve_member(to_member)
        if debtor["_id"] == creditor["_id"]:
            raise SmartSplitError(400, "A member cannot settle with themselves.")

        payload = _fetch_balances()
        debts = payload.get("simplifiedDebts") or []
        outstanding = next(
            (
                d
                for d in debts
                if d.get("fromId") == debtor["_id"]
                and d.get("toId") == creditor["_id"]
            ),
            None,
        )

        if amount is None:
            if not outstanding:
                raise SmartSplitError(
                    400,
                    f"{debtor['name']} does not currently owe {creditor['name']}.\n"
                    f"{format.balances(payload)}",
                )
            settle_for = float(outstanding["amount"])
        else:
            settle_for = float(amount)
            if settle_for <= 0:
                raise SmartSplitError(400, "amount must be greater than zero.")

        client.post(
            "/expenses/add",
            json={
                "roomId": room["_id"],
                "description": f"Settlement: {debtor['name']} to {creditor['name']}",
                "totalAmount": round(settle_for, 2),
                "paidBy": debtor["_id"],
                "splitType": "unequal",
                "splits": [
                    {"user": creditor["_id"], "amount": round(settle_for, 2)}
                ],
            },
            token=token,
        )

        return (
            f"Recorded {debtor['name']} paying {creditor['name']} "
            f"{format.money(settle_for)}.\n\n{format.balances(_fetch_balances())}"
        )


def register_destructive(mcp) -> None:
    @mcp.tool(annotations=DESTRUCTIVE)
    def delete_expense(
        description: str, confirm: bool = False, occurrence: int | None = None
    ) -> str:
        """Delete an expense from the active room by its description.

        Irreversible, and it changes everyone's balances. Pass confirm=True to
        proceed. Only the payer or a room admin may delete an expense.

        If several expenses share a description the tool lists them numbered;
        pass occurrence=N to pick one.
        """
        room = session.require_room()
        token = session.require_token()
        expenses = client.get(f"/expenses/{room['_id']}", token=token)

        needle = (description or "").strip().lower()
        if not needle:
            raise SmartSplitError(400, "Give the expense description.")

        exact = [
            e for e in expenses if (e.get("description", "") or "").lower() == needle
        ]
        matches = exact or [
            e for e in expenses if needle in (e.get("description", "") or "").lower()
        ]

        if not matches:
            raise SmartSplitError(
                404,
                f"No expense matches '{description}'. Current expenses:\n"
                f"{format.expenses(expenses, limit=10)}",
            )
        if len(matches) > 1:
            if occurrence is None:
                numbered = "\n".join(
                    f"  {i}. {str(e.get('date', ''))[:10]} "
                    f"{e.get('description')} {format.money(e.get('totalAmount'))} "
                    f"paid by {(e.get('paidBy') or {}).get('name', '?')}"
                    for i, e in enumerate(matches, start=1)
                )
                raise SmartSplitError(
                    400,
                    f"'{description}' matches {len(matches)} expenses:\n{numbered}\n"
                    f"Re-call with occurrence=N to choose one.",
                )
            if not 1 <= occurrence <= len(matches):
                raise SmartSplitError(
                    400,
                    f"occurrence must be between 1 and {len(matches)}.",
                )
            target = matches[occurrence - 1]
        else:
            target = matches[0]
        if not confirm:
            payer = (target.get("paidBy") or {}).get("name", "?")
            return (
                f"Refused: this would delete '{target.get('description')}' "
                f"{format.money(target.get('totalAmount'))} paid by {payer} on "
                f"{str(target.get('date', ''))[:10]}, and recalculate everyone's "
                f"balances. There is no undo. Re-call with confirm=True to proceed."
            )

        client.delete(f"/expenses/{target['_id']}", token=token)
        return (
            f"Deleted '{target.get('description')}'.\n\n"
            f"{format.balances(_fetch_balances())}"
        )
