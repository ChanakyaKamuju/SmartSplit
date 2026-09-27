"""Shared treasure-fund tools.

Note the honest verb names: the REST routes are `/add` and `/transaction`,
but "transaction" tells a model nothing about direction.
"""

from .. import format
from ..api import SmartSplitError, client
from ..session import session
from . import DESTRUCTIVE, READ_ONLY, WRITE


def _amount(value) -> float:
    try:
        parsed = float(value)
    except (TypeError, ValueError):
        raise SmartSplitError(400, "amount must be a number.") from None
    if parsed <= 0:
        raise SmartSplitError(400, "amount must be greater than zero.")
    return round(parsed, 2)


def register(mcp) -> None:
    @mcp.tool(annotations=READ_ONLY)
    def get_treasure() -> str:
        """Current balance of the active room's shared treasure fund."""
        room = session.require_room()
        payload = client.get(
            f"/treasure/{room['_id']}", token=session.require_token()
        )
        return (
            f"Treasure fund for '{room['name']}': "
            f"{format.money(payload.get('currentTreasure'))}"
        )

    @mcp.tool(annotations=READ_ONLY)
    def list_treasure_transactions() -> str:
        """History of deposits and withdrawals, newest first."""
        room = session.require_room()
        payload = client.get(
            f"/treasure/{room['_id']}/transactions", token=session.require_token()
        )
        return format.treasure_transactions(payload.get("treasureTransactions") or [])

    @mcp.tool(annotations=WRITE)
    def deposit_to_treasure(amount: float, description: str) -> str:
        """Pay money into the shared fund. Requires room admin."""
        room = session.require_room()
        session.require_admin("Depositing to the treasure")
        if not description or not description.strip():
            raise SmartSplitError(400, "description is required.")
        payload = client.post(
            f"/treasure/{room['_id']}/add",
            json={"amount": _amount(amount), "description": description.strip()},
            token=session.require_token(),
        )
        return (
            f"Deposited {format.money(amount)} ({description.strip()}). "
            f"Fund now {format.money(payload.get('currentTreasure'))}."
        )

    @mcp.tool(annotations=WRITE)
    def spend_from_treasure(amount: float, description: str) -> str:
        """Spend money out of the shared fund. Requires room admin.

        The API refuses if the fund does not hold enough.
        """
        room = session.require_room()
        session.require_admin("Spending from the treasure")
        if not description or not description.strip():
            raise SmartSplitError(400, "description is required.")
        payload = client.post(
            f"/treasure/{room['_id']}/transaction",
            json={"amount": _amount(amount), "description": description.strip()},
            token=session.require_token(),
        )
        return (
            f"Spent {format.money(amount)} ({description.strip()}). "
            f"Fund now {format.money(payload.get('currentTreasure'))}."
        )


def register_destructive(mcp) -> None:
    @mcp.tool(annotations=DESTRUCTIVE)
    def delete_treasure_transaction(description: str, confirm: bool = False) -> str:
        """Delete a treasure transaction and revert its effect on the balance.

        Irreversible. Pass confirm=True to proceed. Only a room admin or the
        member who recorded it may delete it.
        """
        room = session.require_room()
        token = session.require_token()
        payload = client.get(f"/treasure/{room['_id']}/transactions", token=token)
        transactions = payload.get("treasureTransactions") or []

        needle = (description or "").strip().lower()
        if not needle:
            raise SmartSplitError(400, "Give the transaction description.")

        exact = [
            t for t in transactions if (t.get("description", "") or "").lower() == needle
        ]
        matches = exact or [
            t for t in transactions if needle in (t.get("description", "") or "").lower()
        ]

        if not matches:
            raise SmartSplitError(
                404,
                f"No transaction matches '{description}'. Current history:\n"
                f"{format.treasure_transactions(transactions)}",
            )
        if len(matches) > 1:
            raise SmartSplitError(
                400,
                f"'{description}' matches {len(matches)} transactions:\n"
                f"{format.treasure_transactions(matches)}\nUse the exact description.",
            )

        target = matches[0]
        direction = "deposit" if target.get("type") == "credit" else "withdrawal"
        if not confirm:
            return (
                f"Refused: this would delete the {direction} "
                f"'{target.get('description')}' of {format.money(target.get('amount'))} "
                f"and adjust the fund accordingly. There is no undo. "
                f"Re-call with confirm=True to proceed."
            )

        result = client.delete(
            f"/treasure/transaction/{target['_id']}", token=token
        )
        return (
            f"Deleted the {direction} '{target.get('description')}'. "
            f"Fund now {format.money(result.get('currentTreasure'))}."
        )
