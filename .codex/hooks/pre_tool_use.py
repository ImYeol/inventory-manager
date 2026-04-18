#!/usr/bin/env python3
import json
import re
import sys


BLOCK_PATTERNS = (
    (re.compile(r"\brm\s+-rf\b"), "Destructive filesystem deletion is blocked."),
    (re.compile(r"\bgit\s+reset\s+--hard\b"), "Hard git reset is blocked."),
    (re.compile(r"\bgit\s+checkout\s+--\b"), "Discarding tracked file changes is blocked."),
    (re.compile(r"\bgit\s+clean\s+-fd\b"), "Git clean deletion is blocked."),
    (re.compile(r"\bgit\s+push\b.*\s--force(?:-with-lease)?\b"), "Force push is blocked."),
    (re.compile(r"\bDROP\s+TABLE\b", re.IGNORECASE), "DROP TABLE is blocked."),
    (re.compile(r"\bTRUNCATE\b", re.IGNORECASE), "TRUNCATE is blocked."),
)


def load_payload() -> dict:
    raw = sys.stdin.read().strip()
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def extract_command(payload: dict) -> str:
    tool_input = payload.get("tool_input")
    if not isinstance(tool_input, dict):
        return ""
    command = tool_input.get("command")
    return command if isinstance(command, str) else ""


def main() -> None:
    payload = load_payload()
    command = extract_command(payload)

    for pattern, reason in BLOCK_PATTERNS:
        if pattern.search(command):
            print(json.dumps({"decision": "block", "reason": reason}))
            return

    print(json.dumps({"decision": "approve"}))


if __name__ == "__main__":
    main()
