#!/bin/zsh
set -euo pipefail

payload=$(cat)

PAYLOAD="$payload" python3 <<'PY'
import json
import os
import re
import subprocess
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


def silent() -> None:
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

command = tool_input.get("command", "")
patch = tool_input.get("patch", "")
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

try:
    tracked = subprocess.run(
        ["git", "ls-files"],
        capture_output=True,
        text=True,
        check=True,
    ).stdout.splitlines()
except subprocess.CalledProcessError:
    silent()
    raise SystemExit

tracked_set = set(tracked)

path_candidates = re.findall(r"([A-Za-z0-9_./-]+\.[A-Za-z0-9_]+)", command)
path_candidates.extend(
    re.findall(r"^\*\*\* (?:Update|Add|Delete) File: (.+)$", patch, re.MULTILINE)
)

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
    silent()
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
                "systemMessage": "구현 파일 변경에 대응 테스트가 확인되지 않았습니다. "
                + ", ".join(sorted(set(missing_tests))),
            }
        )
    )
    raise SystemExit

silent()
PY
