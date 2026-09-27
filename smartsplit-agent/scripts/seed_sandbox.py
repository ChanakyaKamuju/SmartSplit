"""Create an additive "Agent Sandbox" room for agent testing.

Existing rooms are never touched. Use this instead of pointing the agent at a
room you care about.

    python scripts/seed_sandbox.py
    python scripts/seed_sandbox.py --with-test-users

--with-test-users additionally registers two accounts whose first names collide
(ravi.kumar@agent-test.local / ravi.sharma@agent-test.local) and adds them to
the sandbox, so the name-ambiguity path is exercisable.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from smartsplit_mcp import config  # noqa: E402
from smartsplit_mcp.api import SmartSplitError, client  # noqa: E402

ROOM_NAME = "Agent Sandbox"
TEST_USERS = [
    ("Ravi Kumar", "ravi.kumar@agent-test.local", "agenttest123"),
    ("Ravi Sharma", "ravi.sharma@agent-test.local", "agenttest123"),
]


def main() -> int:
    if not (config.AUTO_LOGIN_EMAIL and config.AUTO_LOGIN_PASSWORD):
        print(
            "Set SMARTSPLIT_EMAIL and SMARTSPLIT_PASSWORD in smartsplit-agent/.env first.",
            file=sys.stderr,
        )
        return 2

    session = client.post(
        "/users/login",
        json={
            "email": config.AUTO_LOGIN_EMAIL,
            "password": config.AUTO_LOGIN_PASSWORD,
        },
    )
    token = session["token"]
    print(f"Logged in as {session.get('name')}")

    existing = client.get("/rooms/my-rooms", token=token)
    match = next((r for r in existing if r.get("name") == ROOM_NAME), None)
    if match:
        room = match
        print(f"Reusing existing '{ROOM_NAME}' (code {room.get('roomId')})")
    else:
        room = client.post("/rooms/create", json={"name": ROOM_NAME}, token=token)
        print(f"Created '{ROOM_NAME}' (code {room.get('roomId')})")

    if "--with-test-users" in sys.argv:
        for name, email, password in TEST_USERS:
            try:
                client.post(
                    "/users/register",
                    json={"name": name, "email": email, "password": password},
                )
                print(f"  registered {name} <{email}>")
            except SmartSplitError as exc:
                if exc.status == 400 and "exists" in exc.message.lower():
                    print(f"  {email} already exists")
                else:
                    raise
            try:
                client.put(
                    f"/rooms/{room['_id']}/add-member",
                    json={"email": email, "role": "user"},
                    token=token,
                )
                print(f"  added {name} to the sandbox")
            except SmartSplitError as exc:
                if "already a member" in exc.message.lower():
                    print(f"  {name} is already a member")
                else:
                    raise

    detail = client.get(f"/rooms/{room['_id']}", token=token)
    print(f"\nSandbox room code: {detail.get('roomId')}")
    print(f"Members: {len(detail.get('members') or [])}")
    print(f'\nTry: python agent.py "select the {ROOM_NAME} room and show me the balances"')
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
