#!/bin/zsh
set -euo pipefail

payload=$(cat)

result=$(
  PAYLOAD="$payload" python3 <<'PY'
import json
import os
import re
import shlex
import subprocess
import sys
from pathlib import Path


IMPLEMENTATION_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py"}
TEST_MARKERS = (".test.", ".spec.", "__tests__/", "/tests/")
IMPLEMENTATION_ROOTS = ("src/", "app/", "components/", "lib/", "pages/")
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


def approve() -> None:
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

command = tool_input.get("command")
if not isinstance(command, str) or not command.strip():
    approve()
    raise SystemExit

if not any(re.search(pattern, command) for pattern in MODIFICATION_PATTERNS):
    approve()
    raise SystemExit

try:
    tracked = subprocess.run(
        ["git", "ls-files"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.splitlines()
except subprocess.CalledProcessError:
    approve()
    raise SystemExit

tracked_set = set(tracked)

path_candidates = re.findall(r"([A-Za-z0-9_./-]+\.[A-Za-z0-9_]+)", command)

implementation_files: list[str] = []
for candidate in path_candidates:
    path = Path(candidate)
    suffix = path.suffix.lower()
    normalized = candidate.lstrip("./")

    if suffix not in IMPLEMENTATION_EXTENSIONS:
        continue
    if any(marker in normalized for marker in TEST_MARKERS):
        continue
    if not normalized.startswith(IMPLEMENTATION_ROOTS):
        continue
    if normalized not in tracked_set:
        continue
    implementation_files.append(normalized)

if not implementation_files:
    approve()
    raise SystemExit

missing_tests: list[str] = []
for implementation_file in implementation_files:
    path = Path(implementation_file)
    stem = path.stem
    stem_without_index = path.parent.name if stem == "index" else stem

    matching_tests = [
        tracked_file
        for tracked_file in tracked
        if any(marker in tracked_file for marker in TEST_MARKERS)
        and (
            f"/{stem}.test." in tracked_file
            or f"/{stem}.spec." in tracked_file
            or f"/{stem_without_index}.test." in tracked_file
            or f"/{stem_without_index}.spec." in tracked_file
        )
    ]

    if not matching_tests:
        missing_tests.append(implementation_file)

if missing_tests:
    print(
        json.dumps(
            {
                "decision": "block",
                "reason": "BLOCKED: 구현 파일 수정 전에 대응 테스트를 추가하세요. "
                + ", ".join(sorted(set(missing_tests))),
            }
        )
    )
    raise SystemExit

approve()
PY
)

printf '%s\n' "$result"
