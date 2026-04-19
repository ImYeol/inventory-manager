#!/bin/zsh
set -euo pipefail

payload=$(cat)

result=$(
  PAYLOAD="$payload" python3 <<'PY'
import json
import os
import re


MODIFICATION_PATTERNS = (
    r"(^|\s)mv\s",
    r"(^|\s)cp\s",
    r"(^|\s)rm\s",
    r"(^|\s)touch\s",
    r"(^|\s)install\s",
    r"(^|\s)tee\s",
    r">>",
    r"(^|[^-])>",
    r"\bsed\s+-i\b",
    r"\bperl\s+-i\b",
)

UI_ROOTS = (
    "src/app/",
    "src/components/ui/",
    "tests/",
    ".codex/hooks/",
    ".codex/hooks.json",
)

DOC_ROOTS = (
    "docs/UI_GUIDE.md",
    "docs/ARCHITECTURE.md",
    "docs/ADR.md",
)


def approve():
    print(json.dumps({"decision": "approve"}))


raw = os.environ.get("PAYLOAD", "").strip()
if not raw:
    approve()
    raise SystemExit

try:
    payload = json.loads(raw)
except json.JSONDecodeError:
    approve()
    raise SystemExit

tool_input = payload.get("tool_input")
if not isinstance(tool_input, dict):
    approve()
    raise SystemExit

command = tool_input.get("command") or tool_input.get("cmd")
if not isinstance(command, str) or not command.strip():
    command = tool_input.get("cmd")

if not isinstance(command, str) or not command.strip():
    approve()
    raise SystemExit

if not any(re.search(pattern, command) for pattern in MODIFICATION_PATTERNS):
    approve()
    raise SystemExit

path_candidates = re.findall(r"([A-Za-z0-9_./-]+\.[A-Za-z0-9_]+)", command)
normalized_paths = {candidate.lstrip("./") for candidate in path_candidates}

ui_targets = [path for path in normalized_paths if any(path.startswith(root) for root in UI_ROOTS)]
doc_targets = [path for path in normalized_paths if path in DOC_ROOTS]

if not ui_targets:
    approve()
    raise SystemExit

if doc_targets:
    approve()
    raise SystemExit

print(
    json.dumps(
        {
            "decision": "block",
            "reason": (
                "BLOCKED: UI 변경은 shared theme/component/primitive/design token 기준을 "
                "docs/UI_GUIDE.md, docs/ARCHITECTURE.md, docs/ADR.md와 함께 검토하세요."
            ),
        }
    )
)
PY
)

printf '%s\n' "$result"
