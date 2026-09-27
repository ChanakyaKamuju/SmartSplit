"""Print the models your OPENAI_API_KEY can actually use.

The model id is deliberately not hardcoded anywhere in this project - pick one
from this list and set OPENAI_MODEL in .env.

    python scripts/list_models.py
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")


def main() -> int:
    if not os.environ.get("OPENAI_API_KEY"):
        print("OPENAI_API_KEY is not set (put it in smartsplit-agent/.env).", file=sys.stderr)
        return 2

    from openai import OpenAI

    models = sorted(m.id for m in OpenAI().models.list())
    print(f"{len(models)} models available to this key:\n")
    for model_id in models:
        print(f"  {model_id}")
    print("\nSet one of these as OPENAI_MODEL in .env.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
