#!/bin/zsh
set -euo pipefail

payload=$(cat)

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
    "docs/design/ui-guide.md",
    "docs/architecture/overview.md",
    "docs/adr/",
    "docs/design/tokens.md",
    "docs/design/motion.md",
    "docs/design/components.md",
)


def silent():
    print("{}")


try:
    payload = json.loads(os.environ.get("PAYLOAD", ""))
except json.JSONDecodeError:
    silent()
    raise SystemExit

tool_input = payload.get("tool_input")
if not isinstance(tool_input, dict):
    silent()
    raise SystemExit

command = tool_input.get("command") or tool_input.get("cmd") or ""
patch = tool_input.get("patch") or ""
if not isinstance(command, str):
    command = ""
if not isinstance(patch, str):
    patch = ""

if not command and not patch:
    silent()
    raise SystemExit

if command and not patch and not any(re.search(pattern, command) for pattern in MODIFICATION_PATTERNS):
    silent()
    raise SystemExit

path_candidates = re.findall(r"([A-Za-z0-9_./-]+\.[A-Za-z0-9_]+)", command)
path_candidates.extend(
    re.findall(r"^\*\*\* (?:Update|Add|Delete) File: (.+)$", patch, re.MULTILINE)
)
normalized_paths = {candidate.lstrip("./") for candidate in path_candidates}

ui_targets = [path for path in normalized_paths if any(path.startswith(root) for root in UI_ROOTS)]
doc_targets = [path for path in normalized_paths if any(path.startswith(root) for root in DOC_ROOTS)]

if not ui_targets:
    silent()
    raise SystemExit

if doc_targets:
    silent()
    raise SystemExit

print(
    json.dumps(
        {
            "systemMessage": (
                "UI 변경은 shared theme/component/primitive/design token 기준을 "
                "docs/design/ui-guide.md, docs/architecture/overview.md, 관련 docs/adr/ 결정과 함께 검토하고, "
                "design composition contract가 component/property 이름과 token 참조를 지키는지 확인하세요."
            ),
        }
    )
)
PY
