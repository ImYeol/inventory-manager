#!/bin/zsh
set -euo pipefail

payload=$(cat)

PAYLOAD="$payload" python3 <<'PY'
import json
import os
import re
import sys

try:
    payload = json.loads(os.environ.get("PAYLOAD", ""))
except json.JSONDecodeError:
    print("{}")
    raise SystemExit

tool_input = payload.get("tool_input")
command = tool_input.get("command") if isinstance(tool_input, dict) else ""
if not isinstance(command, str):
    print("{}")
    raise SystemExit

patterns = (
    r"\brm\s+-rf\b",
    r"\bgit\s+push\b.*\s--force(?:-with-lease)?\b",
    r"\bgit\s+reset\s+--hard\b",
    r"\bgit\s+checkout\s+--\b",
    r"\bgit\s+clean\s+-fd\b",
)

if any(re.search(pattern, command, re.IGNORECASE) for pattern in patterns):
    print(json.dumps({"systemMessage": "위험한 명령어가 감지되었습니다. 안전 규칙과 대체 절차를 확인하세요."}))
else:
    print("{}")
PY
