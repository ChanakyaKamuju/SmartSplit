"""Dump every SmartSplitAI collection to timestamped JSON.

The API has no soft delete and no backup. Run this before letting an agent
loose with destructive tools enabled - it is the only restore point you have.

    python scripts/snapshot_db.py

Reads MONGO_URI from backend/.env. Writes to smartsplit-agent/snapshots/.
"""

import json
import sys
from datetime import datetime, timezone
from pathlib import Path

from dotenv import dotenv_values

ROOT = Path(__file__).resolve().parent.parent
BACKEND_ENV = ROOT.parent / "backend" / ".env"
OUT_DIR = ROOT / "snapshots"

COLLECTIONS = ["users", "rooms", "expenses", "duties"]


def main() -> int:
    if not BACKEND_ENV.exists():
        print(f"No backend .env at {BACKEND_ENV}", file=sys.stderr)
        return 2
    uri = dotenv_values(BACKEND_ENV).get("MONGO_URI")
    if not uri:
        print("MONGO_URI is not set in backend/.env", file=sys.stderr)
        return 2

    from pymongo import MongoClient

    client = MongoClient(uri, serverSelectionTimeoutMS=10000)
    db = client.get_default_database()
    if db is None:
        print("MONGO_URI has no database name in its path.", file=sys.stderr)
        return 2

    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    OUT_DIR.mkdir(exist_ok=True)
    target = OUT_DIR / f"{db.name}-{stamp}.json"

    dump: dict[str, list] = {}
    for name in COLLECTIONS:
        docs = list(db[name].find({}))
        dump[name] = docs
        print(f"  {name}: {len(docs)} docs")

    target.write_text(json.dumps(dump, indent=2, default=str), encoding="utf-8")
    print(f"\nWrote {target}")
    print("Note: this is a plain JSON dump for reference/manual restore, not a mongodump.")
    client.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
