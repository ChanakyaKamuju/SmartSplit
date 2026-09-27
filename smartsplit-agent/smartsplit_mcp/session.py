"""In-process session state: auth token, active room, cached members.

The token lives here and is never returned from a tool - otherwise it would
land in agent transcripts and client logs.
"""

import time
from typing import Any

from . import config
from .api import SmartSplitError


class NeedsLogin(SmartSplitError):
    def __init__(self) -> None:
        super().__init__(401, "Not logged in. Call login(email, password) first.")


class NeedsRoom(SmartSplitError):
    def __init__(self) -> None:
        super().__init__(
            400,
            "No room selected. Call list_my_rooms() to see the options, "
            "then select_room(name_or_code).",
        )


class SessionState:
    def __init__(self) -> None:
        self.token: str | None = None
        self.user: dict[str, Any] | None = None
        self.room: dict[str, Any] | None = None
        self.members: list[dict[str, Any]] = []
        # (description, amount, paid_by_id) -> monotonic timestamp, for dedupe
        self._recent_expenses: dict[tuple[str, float, str], float] = {}

    # --- auth ---------------------------------------------------------------

    def login(self, payload: dict[str, Any]) -> None:
        self.token = payload["token"]
        self.user = {
            "_id": payload["_id"],
            "name": payload.get("name", ""),
            "email": payload.get("email", ""),
        }
        self.room = None
        self.members = []

    def ensure_login(self) -> bool:
        """Log in from environment credentials if they are configured.

        Keeps the password out of the model's context entirely. Returns True if
        a session is available afterwards.
        """
        if self.token:
            return True
        if not (config.AUTO_LOGIN_EMAIL and config.AUTO_LOGIN_PASSWORD):
            return False
        from .api import client  # local import: api must not depend on session

        payload = client.post(
            "/users/login",
            json={
                "email": config.AUTO_LOGIN_EMAIL,
                "password": config.AUTO_LOGIN_PASSWORD,
            },
        )
        self.login(payload)
        return True

    def require_token(self) -> str:
        if not self.token:
            self.ensure_login()
        if not self.token:
            raise NeedsLogin()
        return self.token

    def require_user(self) -> dict[str, Any]:
        if not self.user:
            self.ensure_login()
        if not self.user:
            raise NeedsLogin()
        return self.user

    # --- active room --------------------------------------------------------

    def set_room(self, room: dict[str, Any]) -> None:
        """Cache a room document (as returned by GET /api/rooms/:id)."""
        self.room = {
            "_id": room["_id"],
            "name": room.get("name", ""),
            "roomId": room.get("roomId", ""),
            "treasure": room.get("treasure", 0),
        }
        members: list[dict[str, Any]] = []
        for entry in room.get("members", []) or []:
            user = entry.get("user") or {}
            if not isinstance(user, dict):
                continue
            members.append(
                {
                    "_id": user.get("_id", ""),
                    "name": user.get("name", "") or "",
                    "email": user.get("email", "") or "",
                    "role": entry.get("role", "user"),
                }
            )
        self.members = members

    def require_room(self) -> dict[str, Any]:
        if not self.room:
            raise NeedsRoom()
        return self.room

    def clear_room(self) -> None:
        self.room = None
        self.members = []

    def my_role(self) -> str:
        me = self.require_user()
        for member in self.members:
            if member["_id"] == me["_id"]:
                return member["role"]
        return "user"

    def require_admin(self, action: str) -> None:
        """Fail fast instead of letting the agent collect a 403."""
        if self.my_role() != "admin":
            room = self.require_room()
            raise SmartSplitError(
                403,
                f"{action} requires room admin, and you are not an admin of "
                f"'{room['name']}'. Ask an admin to do it.",
            )

    # --- expense dedupe -----------------------------------------------------

    def seen_expense_recently(
        self, description: str, amount: float, paid_by: str, window: float
    ) -> bool:
        key = (description.strip().lower(), round(float(amount), 2), paid_by)
        now = time.monotonic()
        for stale, seen_at in list(self._recent_expenses.items()):
            if now - seen_at > window:
                del self._recent_expenses[stale]
        return key in self._recent_expenses

    def remember_expense(self, description: str, amount: float, paid_by: str) -> None:
        key = (description.strip().lower(), round(float(amount), 2), paid_by)
        self._recent_expenses[key] = time.monotonic()


session = SessionState()
