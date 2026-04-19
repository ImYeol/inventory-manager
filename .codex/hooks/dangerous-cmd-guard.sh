#!/bin/zsh
set -euo pipefail

payload=$(cat)

command=$(
  printf '%s' "$payload" | python3 -c '
import json
import sys

raw = sys.stdin.read().strip()
if not raw:
    print("")
    raise SystemExit

try:
    payload = json.loads(raw)
except json.JSONDecodeError:
    print("")
    raise SystemExit

tool_input = payload.get("tool_input")
if not isinstance(tool_input, dict):
    print("")
    raise SystemExit

command = tool_input.get("command")
print(command if isinstance(command, str) else "")
'
)

if [[ -z "$command" ]]; then
  printf '%s\n' '{"decision":"approve"}'
  exit 0
fi

patterns=(
  'rm[[:space:]]+-rf'
  'git[[:space:]]+push([^[:alnum:]]|.*[[:space:]])--force'
  'git[[:space:]]+push([^[:alnum:]]|.*[[:space:]])--force-with-lease'
  'git[[:space:]]+reset[[:space:]]+--hard'
  'git[[:space:]]+checkout[[:space:]]+--'
  'git[[:space:]]+clean[[:space:]]+-fd'
  'DROP[[:space:]]+TABLE'
  'TRUNCATE([^[:alnum:]_]|$)'
)

for pattern in "${patterns[@]}"; do
  if printf '%s\n' "$command" | grep -Eqi "$pattern"; then
    printf '%s\n' '{"decision":"block","reason":"BLOCKED: 위험한 명령어가 감지되었습니다."}'
    exit 0
  fi
done

printf '%s\n' '{"decision":"approve"}'
