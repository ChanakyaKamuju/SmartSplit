"""Autonomous agent that drives SmartSplitAI through the MCP server.

Usage:
    python agent.py "add a $600 grocery expense I paid, split equally with
                     Ravi and Priya, then tell me who owes whom"

    python agent.py            # reads the instruction from stdin

Credentials:
    OPENAI_API_KEY   required
    OPENAI_MODEL     required (run `python scripts/list_models.py` to see yours)
    SMARTSPLIT_EMAIL / SMARTSPLIT_PASSWORD  optional; when set the MCP server
                     logs in by itself and the password never reaches OpenAI.
"""

import asyncio
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

from agents import Agent, Runner  # noqa: E402
from agents.mcp import MCPServerStdio  # noqa: E402

DESTRUCTIVE_TOOLS = [
    "remove_member",
    "leave_room",
    "delete_room",
    "delete_expense",
    "delete_treasure_transaction",
]

SYSTEM_PROMPT = """\
You manage a SmartSplitAI household account through the provided tools.

Workflow, always in this order:
  1. Call whoami() first. The server may already be logged in. If it is not,
     ask the user for credentials rather than guessing.
  2. Pick the room with list_my_rooms() and select_room(...) before doing
     anything room-specific.
  3. Read the current state (get_balances, list_expenses, get_duties,
     get_treasure) before you change it.

Rules:
  - Refer to people by name or email, or "me" for the logged-in user. Never
    invent or pass raw ids.
  - Do not calculate split amounts yourself. State the split type and let the
    tool compute it; if a tool reports that amounts do not add up, fix the
    inputs rather than adjusting the total.
  - If a name is ambiguous the tool will list the candidates. Ask the user
    which one they mean instead of picking one.
  - Deletions and removals are irreversible. Never call them speculatively;
    only when the user clearly asked, and report exactly what changed.
  - Finish by summarising what you actually did, with amounts.
"""


def _describe(item) -> str:
    """Best-effort human description of an approval request."""
    raw = getattr(item, "raw_item", None)
    name = (
        getattr(item, "name", None)
        or getattr(raw, "name", None)
        or (raw.get("name") if isinstance(raw, dict) else None)
        or "unknown tool"
    )
    args = (
        getattr(raw, "arguments", None)
        or (raw.get("arguments") if isinstance(raw, dict) else None)
        or {}
    )
    if isinstance(args, str):
        try:
            args = json.loads(args)
        except ValueError:
            pass
    return f"{name}({json.dumps(args, default=str)})"


def _ask(prompt: str) -> bool:
    try:
        answer = input(prompt).strip().lower()
    except EOFError:
        return False
    return answer in {"y", "yes"}


async def run(instruction: str) -> int:
    if not os.environ.get("OPENAI_API_KEY"):
        print("OPENAI_API_KEY is not set (put it in smartsplit-agent/.env).", file=sys.stderr)
        return 2
    model = os.environ.get("OPENAI_MODEL")
    if not model:
        print(
            "OPENAI_MODEL is not set. Run `python scripts/list_models.py` to see "
            "which models your key can use, then set it in .env.",
            file=sys.stderr,
        )
        return 2

    async with MCPServerStdio(
        name="smartsplit",
        params={
            "command": sys.executable,
            "args": ["-m", "smartsplit_mcp.server"],
            "cwd": str(ROOT),
        },
        cache_tools_list=True,
        client_session_timeout_seconds=30,
        # Second gate. The MCP server also refuses these without confirm=True,
        # which protects other clients; this one protects the user at the console.
        require_approval={"always": {"tool_names": DESTRUCTIVE_TOOLS}},
    ) as server:
        agent = Agent(
            name="SmartSplit Agent",
            instructions=SYSTEM_PROMPT,
            mcp_servers=[server],
            model=model,
        )

        result = await Runner.run(agent, instruction, max_turns=30)

        # Approval loop: pause, ask at the console, resume from run state.
        while result.interruptions:
            state = result.to_state()
            for item in result.interruptions:
                print(f"\n  approval needed: {_describe(item)}", file=sys.stderr)
                if _ask("  allow this irreversible action? [y/N] "):
                    state.approve(item)
                    print("  approved", file=sys.stderr)
                else:
                    state.reject(item)
                    print("  rejected", file=sys.stderr)
            result = await Runner.run(agent, state, max_turns=30)

        print(result.final_output)
        return 0


def main() -> None:
    if len(sys.argv) > 1:
        instruction = " ".join(sys.argv[1:])
    else:
        instruction = sys.stdin.read().strip()
    if not instruction:
        print('Give an instruction, e.g. python agent.py "who owes whom?"', file=sys.stderr)
        raise SystemExit(2)
    raise SystemExit(asyncio.run(run(instruction)))


if __name__ == "__main__":
    main()
