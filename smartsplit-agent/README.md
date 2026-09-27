# smartsplit-agent

An MCP server that exposes the SmartSplitAI REST API as 20–25 semantic tools, plus an
autonomous agent (OpenAI Agents SDK) that drives them from one sentence of English.

The MCP server is independent of the agent — point Claude Desktop, Cursor, or MCP Inspector
at it and you get an interactive assistant for the same app.

## Why a "semantic" layer

The REST API is id-driven: `paidBy`, `splits[].user`, `userId` and `memberOrder` all take
24-character ObjectIds. Handed those directly, a model invents them. So these tools take
**names, emails, or "me"**, resolve them server-side against the active room, and refuse
ambiguous matches instead of guessing. Split arithmetic is computed and validated here too,
so the model never does float maths the backend will reject.

## Setup

```bash
cd smartsplit-agent
py -m venv .venv
./.venv/Scripts/python.exe -m pip install -e .
cp .env.example .env     # then fill it in
```

Pick a model your key actually has:

```bash
./.venv/Scripts/python.exe scripts/list_models.py
```

The backend must be running (`cd ../backend && npm run dev`).

## Run the agent

```bash
./.venv/Scripts/python.exe agent.py "who owes whom in the Chargers room?"
```

```bash
./.venv/Scripts/python.exe agent.py "add a 600 grocery expense I paid, split equally with everyone, then show the balances"
```

## Use the MCP server from another client

Stdio config (adjust the absolute paths):

```json
{
  "mcpServers": {
    "smartsplit": {
      "command": "D:\\MyData\\Projects\\SmartSplitAI\\smartsplit-agent\\.venv\\Scripts\\python.exe",
      "args": ["-m", "smartsplit_mcp.server"],
      "cwd": "D:\\MyData\\Projects\\SmartSplitAI\\smartsplit-agent"
    }
  }
}
```

## Tools

| Group | Tools |
|---|---|
| Session | `login` · `whoami` · `list_my_rooms` · `select_room` |
| Rooms | `get_room` · `create_room` · `join_room` · `add_member` · `change_member_role` |
| Expenses | `add_expense` · `list_expenses` · `get_balances` · `settle_debt` |
| Treasure | `get_treasure` · `list_treasure_transactions` · `deposit_to_treasure` · `spend_from_treasure` |
| Duties | `get_duties` · `configure_duties` · `skip_member_today` |
| Destructive *(opt-in)* | `remove_member` · `leave_room` · `delete_room` · `delete_expense` · `delete_treasure_transaction` |

`settle_debt` has no REST endpoint behind it — like the web UI, it records a balancing
expense, reading the exact outstanding figure from `/balances` so nobody computes it by hand.

## Safety

The SmartSplitAI API has **no soft delete and no backup**. Three gates:

1. `SMARTSPLIT_ALLOW_DESTRUCTIVE=false` (default) — the five destructive tools are not
   registered at all.
2. Server-side `confirm=True` — without it the tool describes what would be destroyed and
   does nothing. This lives in the server, so Claude Desktop and Cursor are protected too.
3. Agent-side `require_approval` — `agent.py` prompts at the console before running one.

Before enabling destructive tools:

```bash
./.venv/Scripts/python.exe scripts/snapshot_db.py
```

Prefer testing against a throwaway room rather than a real one:

```bash
./.venv/Scripts/python.exe scripts/seed_sandbox.py --with-test-users
```

Setting `SMARTSPLIT_EMAIL` / `SMARTSPLIT_PASSWORD` lets the server log in by itself, which
keeps your SmartSplitAI password out of the model's context.
