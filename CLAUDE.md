# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SmartSplitAI is a MERN app for shared-living groups ("rooms"): split expenses, manage a shared
treasure fund, and rotate recurring duties. The repo holds three independent projects with no
root package.json or workspace config — install and run each separately:

- `backend/` — Express 5 + MongoDB (CommonJS)
- `frontend/` — React 19 + Vite + Tailwind 4 (ESM)
- `smartsplit-agent/` — Python: an MCP server wrapping the REST API, plus an OpenAI agent

## Commands

Backend (`cd backend`):

```bash
npm install
npm run dev     # nodemon server.js — port 5000 by default, binds 0.0.0.0
npm start       # node server.js
```

Frontend (`cd frontend`):

```bash
npm install
npm run dev     # vite, port 5173, server.host = true (exposed on LAN)
npm run build
npm run lint    # eslint . — the only automated check in the repo
```

Agent / MCP server (`cd smartsplit-agent`) — Windows venv paths shown:

```bash
./.venv/Scripts/python.exe -m smartsplit_mcp.server      # MCP server over stdio
./.venv/Scripts/python.exe agent.py "who owes whom?"     # autonomous agent
./.venv/Scripts/python.exe scripts/list_models.py        # models your OPENAI_API_KEY can use
./.venv/Scripts/python.exe scripts/snapshot_db.py        # JSON backup before destructive tests
```

There are no tests. `backend`'s `npm test` is the default placeholder and exits 1 — do not treat
its failure as a regression, and do not add a test command to CI expectations without adding a
runner first.

## Required environment

`backend/.env` (gitignored, must exist before the server or Agenda can start):

- `MONGO_URI` — used both by `config/db.js` and by Agenda's job store (`agendaJobs` collection)
- `JWT_SECRET` — 30-day tokens, signed in `controllers/userController.js`
- `PORT` — optional, defaults to 5000

Frontend (optional): `VITE_APP_API_URL` in `frontend/.env.development` (e.g.
`http://192.168.1.11:5000/api` to test from a phone on the same LAN). It defaults to
`http://localhost:5000/api`. All five service modules derive their URL from
`src/services/apiConfig.js` — add new services via `resourceUrl("<resource>")` rather than
hardcoding a host.

## Architecture

### Backend request flow

`server.js` → route module → `middleware/authMiddleware.js` → controller → Mongoose model →
`middleware/errorMiddleware.js`.

Controllers wrap handlers in `express-async-handler` and signal errors with
`res.status(4xx); throw new Error(...)`. `errorMiddleware.js` (registered after all routes) turns
those into the `{ message }` JSON that every frontend service reads from
`error.response.data.message`; it reads the status the controller set, defaults to 500, and maps
Mongoose `CastError`/duplicate-key errors to 404/400. **Set the status before throwing** — a bare
throw surfaces as a 500.

Two auth middlewares:

- `protect` — verifies the Bearer token, sets `req.user` (password excluded).
- `adminProtect` — resolves the room from `req.params.id || req.body.roomId`, checks the caller's
  per-room `role === "admin"`, and attaches `req.room`. It calls `Room.findById`, so the route
  param must be the Mongo `_id`, **not** the human-shareable `roomId` string. This is why
  admin-scoped routes are named `/:id/...` while member-readable ones use `/:roomId`.

### Data model (`backend/models/`)

- `User` — bcrypt hashing in a `pre("save")` hook plus `matchPassword()`; holds a `rooms[]` array
  that must be kept in sync by hand whenever room membership changes.
- `Room` — `roomId` is a separate unique shareable code distinct from `_id`. Treasure lives *inside*
  the room document: a `treasure` running total plus embedded `treasureTransactions[]` (each with
  its own `_id` and `performedBy`, so a single transaction can be deleted and its effect reverted).
- `Expense` — one doc per expense with `splitType` of `equal | unequal | percentage | shares`.
  The controller normalizes every split type down to a concrete per-user `amount` at write time, so
  readers only ever deal with `splits[].amount`.
- `Duty` — one doc per room (`roomId` is unique). `duties[]` are the tasks, `memberOrder[]` is the
  rotation ring, and `currentStartingMemberIndex` is the ring offset.

Two conventions to preserve: role is **per-room** (`Room.members[].role`), not the global
`User.isAdmin` flag; and `Expense.splits` uses `_id: false`, so individual splits have no stable id
(duty items and treasure transactions do have ids).

When a query populates `members.user`, compare `member.user._id.toString()` — `member.user` is then
a document, and `member.user.toString()` will not equal a hex id. Unpopulated queries are the
opposite. Mixing these up has already caused one duplicate-member bug.

### Balance calculation is duplicated

The credit/debit walk over expenses exists twice and must be changed in both places:

- `backend/controllers/expenseController.js:245` `getRoomBalances` — the HTTP endpoint; also
  produces `simplifiedDebts` via a greedy creditor/debtor match.
- `backend/controllers/roomController.js` `getRoomBalancesInternal` — the same math without a
  response, used to block member removal and leaving a room while a member still has a non-zero
  balance. It is a plain `async` function on purpose: `asyncHandler` would treat its third argument
  as `next` and swallow errors.

`simplifiedDebts` entries carry `fromId`/`toId` as well as display names; resolve users by id, not
by name.

Settlements are not a separate entity. `frontend/src/services/expenseService.js` `settleDebt()`
writes a synthetic `unequal` Expense where the debtor is `paidBy` and the creditor is the sole
split, which nets the two balances back out.

### Duty rotation (Agenda)

`server.js` `require("./agenda")` starts the scheduler as an import side effect. `agenda/index.js`
registers `agenda/jobs/incrementDutyIndex.js` and schedules it at `0 0 * * *`; the job advances
`currentStartingMemberIndex` for every Duty doc, rewrites each `duties[].assignedTo`, and clears
`skippedMembersForCurrentCycle` (skips apply only to the cycle they were requested in).
`getDutiesTable` therefore just reads the persisted assignments — the older on-read assignment
logic is left commented out in `dutyController.js` and should not be revived alongside the job.

`backend/utils/dutyAssignment.js` holds the rotation math (`resolveAssignments`,
`nextStartingIndex`) shared by the job, `skipMemberFromCycle`, and `createOrUpdateDuties`. Change
it there, not in a copy. `assignedTo` can be `null` when no member is eligible, so clients must
guard it.

Membership changes must keep the Duty config in sync: `roomController.dropMemberFromDuties` prunes
a departing member from `memberOrder`/`skippedMembersForCurrentCycle` and reassigns, and
`deleteRoom` deletes the room's Duty document. Any new path that removes a member needs the same
treatment, or the nightly job keeps assigning duties to someone who left.

### Frontend structure

`main.jsx` → `App.jsx` wraps `AuthProvider` → `RoomProvider` → `Router`. Both providers gate
rendering on their own loading flags, which is what makes the routes effectively protected — there
is no route guard component.

- `contexts/AuthContext.jsx` — persists the user (token included) in `localStorage.user`, validates
  it on mount via `GET /api/users/profile`, and exports `useAuth`.
- `contexts/RoomContext.jsx` — owns `myRooms` / `currentRoom`, persists the selection in
  `localStorage.currentRoomId`. Its `useRoom` consumer hook lives in `hooks/useRoomData.js`, split
  out so the context file stays Fast-Refresh friendly — keep that separation.
- `pages/RoomDetail.jsx` — the real app surface: four tabs (`expenses`, `treasure`, `members`,
  `duties`) rendering the matching component from `components/`, each receiving `room` and `user`
  as props and calling services directly rather than through context.

`components/ExpenseSplitter.jsx` is ~1300 lines and contains large blocks of commented-out earlier
UI; read for the live JSX near the bottom rather than assuming the whole file is active. `Login.jsx`
and `Register.jsx` are the same — the live markup is the second copy.

Data-fetching components (`ExpenseSplitter`, `TreasureManager`, `DutyTimeTable`) wrap their refresh
function in `useCallback([currentRoom, user])` and depend on that in `useEffect`. Keep that shape;
listing `[currentRoom, user]` on the effect while the callback is unmemoized reintroduces stale
closures.

### MCP server + agent (`smartsplit-agent/`)

A **semantic** wrapper over the REST API, not a 1:1 mirror. The API is id-driven (`paidBy`,
`splits[].user`, `userId`, `memberOrder` all take ObjectIds) and a model handed those invents
them, so tools accept **names, emails, or "me"** and `smartsplit_mcp/resolve.py` maps them
against the active room's cached member list — raising with the candidate list on ambiguity
rather than guessing.

Layering: `tools/*.py` (one `register(mcp)` per group) → `resolve.py` / `format.py` →
`api.py` → the Express API over HTTP. It never touches MongoDB directly, so all business rules
stay in the backend.

Invariants worth preserving:

- **`mcp` is 2.x**, where `FastMCP` was renamed `MCPServer` (`mcp.server.mcpserver`) and model
  fields are snake_case (`input_schema`, `ToolAnnotations(read_only_hint=...)`). Most examples
  online are 1.x and will not run.
- `SmartSplitError` subclasses MCP's `ToolError`, so a failure reaches the model as the API's own
  message instead of an "unexpected error" wrapper.
- The auth token lives in `session.py` and is **never returned from a tool**. Setting
  `SMARTSPLIT_EMAIL`/`SMARTSPLIT_PASSWORD` makes the server log in lazily by itself, keeping the
  password out of the model's context entirely.
- Split arithmetic is computed and validated in `tools/expenses.py` before the HTTP call — the
  model never does float maths the backend would reject.
- `settle_debt` has no REST endpoint; it writes the synthetic `unequal` expense, mirroring
  `expenseService.settleDebt()`, and reads the exact figure from `/balances`.
- Destructive tools are gated three ways: absent unless `SMARTSPLIT_ALLOW_DESTRUCTIVE=true`,
  then require `confirm=True` **in the server** (so Claude Desktop/Cursor are protected too),
  then `require_approval` in `agent.py`. The API has no soft delete.
- The model id is never hardcoded — `OPENAI_MODEL` comes from `.env`.

## Known gaps

- `User.rooms[]` is never written to by any controller (membership is derived from
  `Room.members`), so `GET /api/users/profile` always returns an empty `rooms` array.
- `frontend/README.md` still describes the frontend as its own repository and is otherwise stale.

## Verifying changes

There is no test runner, so verification is manual. `backend/.env` points at a live MongoDB Atlas
database (`Splitstore`) holding **real data** — and this API has no soft delete. Never run
destructive tests against it. Either scope tests to throwaway records you create and then remove
(e.g. `@agent-test.local` accounts in their own room), or override the env inline to point at a
disposable database — never edit `.env` for a test:

```bash
MONGO_URI="mongodb://127.0.0.1:27018/smoketest" JWT_SECRET="test" PORT=5001 node server.js
```

Always confirm the old process is gone before re-testing (`Get-NetTCPConnection -LocalPort 5001`);
a stale server silently serves pre-edit code and produces confusing failures.

## Conventions

- Backend is CommonJS (`require`), frontend is ESM. Don't mix.
- Controllers are heavily `console.log`-instrumented, including in balance math; that is the
  existing style, not leftover debugging to clean up wholesale.
- Styling is Tailwind utility classes inline via `@tailwindcss/vite` — there is no CSS module or
  component library layer.
