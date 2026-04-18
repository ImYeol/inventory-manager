#!/usr/bin/env python3
import json
import sys


KEYWORDS = (
    "plan",
    "phase",
    "prd",
    "architecture",
    "ui",
    "ux",
    "hook",
    "menu",
    "navigation",
    "inventory",
    "warehouse",
    "sourcing",
    "factory",
    "naver",
    "coupang",
    "store",
    "shipping",
    "analytics",
)


def load_payload() -> dict:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def extract_prompt(payload: dict) -> str:
    prompt = payload.get("user_prompt")
    if isinstance(prompt, str):
        return prompt
    return ""


def main() -> None:
    payload = load_payload()
    prompt = extract_prompt(payload).lower()

    if not any(keyword in prompt for keyword in KEYWORDS):
        print("{}")
        return

    context = (
        "Apply the repo harness. Re-check whether the request should be modeled as "
        "inventory operations hub, sourcing expansion, store connections, or settings "
        "consolidation. Avoid adding expandable navigation unless the category truly has "
        "multiple child screens. Prefer reusing existing shipping credentials/actions when "
        "discussing Naver or Coupang integrations."
    )
    print(json.dumps({"hookSpecificOutput": {"additionalContext": context}}))


if __name__ == "__main__":
    main()
