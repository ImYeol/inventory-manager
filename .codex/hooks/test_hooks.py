#!/usr/bin/env python3
"""Regression tests for repository-local Codex hook scripts."""

from __future__ import annotations

import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
HOOKS = ROOT / ".codex" / "hooks"


def run_hook(name: str, payload: dict) -> dict:
    result = subprocess.run(
        ["zsh", str(HOOKS / name)],
        cwd=ROOT,
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        check=True,
    )
    return json.loads(result.stdout)


class CodexHookTests(unittest.TestCase):
    def test_dangerous_bash_command_warns(self) -> None:
        output = run_hook(
            "dangerous-cmd-guard.sh",
            {"tool_input": {"command": "git reset --hard HEAD"}},
        )

        self.assertIn("systemMessage", output)
        self.assertIn("위험한 명령어", output["systemMessage"])

    def test_tdd_guard_detects_apply_patch_without_matching_test(self) -> None:
        output = run_hook(
            "tdd-guard.sh",
            {
                "tool_input": {
                    "patch": "*** Begin Patch\n*** Update File: src/lib/inventory.ts\n*** End Patch"
                }
            },
        )

        self.assertIn("systemMessage", output)
        self.assertIn("대응 테스트", output["systemMessage"])
        self.assertIn("src/lib/inventory.ts", output["systemMessage"])

    def test_ui_guard_detects_apply_patch_without_contract_review(self) -> None:
        output = run_hook(
            "ui-review-guard.sh",
            {
                "tool_input": {
                    "patch": "*** Begin Patch\n*** Update File: src/app/components/DashboardView.tsx\n*** End Patch"
                }
            },
        )

        self.assertIn("systemMessage", output)
        self.assertIn("UI 변경", output["systemMessage"])
        self.assertIn("design composition contract", output["systemMessage"])

    def test_non_matching_command_is_silent(self) -> None:
        output = run_hook(
            "dangerous-cmd-guard.sh",
            {"tool_input": {"command": "git status --short"}},
        )

        self.assertEqual(output, {})


if __name__ == "__main__":
    unittest.main()
