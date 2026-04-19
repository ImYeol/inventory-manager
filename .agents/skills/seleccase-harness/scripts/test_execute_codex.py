#!/usr/bin/env python3
"""Regression tests for the simplified Codex harness executor."""

from __future__ import annotations

import contextlib
import json
import tempfile
import unittest
from pathlib import Path
from subprocess import CompletedProcess
from unittest.mock import patch

import execute_codex as ex


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


class HarnessFixture:
    def __init__(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "phases" / "demo-phase").mkdir(parents=True)
        (self.root / "AGENTS.md").write_text("# Agents\n\nGuardrails.\n", encoding="utf-8")
        write_json(
            self.root / "phases" / "index.json",
            {"phases": [{"dir": "demo-phase", "status": "pending"}]},
        )
        write_json(
            self.root / "phases" / "demo-phase" / "index.json",
            {
                "project": "Demo",
                "phase": "demo-phase",
                "status": "pending",
                "steps": [
                    {"step": 0, "name": "docs-foundation", "status": "pending"},
                    {"step": 1, "name": "inventory-hub", "status": "pending"},
                ],
            },
        )
        (self.root / "phases" / "demo-phase" / "step0.md").write_text("# Step 0\n\nDo docs.\n", encoding="utf-8")
        (self.root / "phases" / "demo-phase" / "step1.md").write_text("# Step 1\n\nBuild hub.\n", encoding="utf-8")

    def cleanup(self) -> None:
        self.tmp.cleanup()

    def phase_path(self) -> Path:
        return self.root / "phases" / "demo-phase" / "index.json"

    def top_path(self) -> Path:
        return self.root / "phases" / "index.json"

    def load_phase(self) -> dict:
        return json.loads(self.phase_path().read_text(encoding="utf-8"))

    def load_top(self) -> dict:
        return json.loads(self.top_path().read_text(encoding="utf-8"))

    def load_step_output(self, step_number: int) -> dict:
        path = self.root / "phases" / "demo-phase" / f"step{step_number}-output.json"
        return json.loads(path.read_text(encoding="utf-8"))


class ExecuteCodexTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = HarnessFixture()

    def tearDown(self) -> None:
        self.fixture.cleanup()

    def test_parse_args_supports_positional_run_syntax(self) -> None:
        args = ex.parse_args(["demo-phase", "--push"])
        self.assertEqual(args.phase_dir, "demo-phase")
        self.assertTrue(args.push)

    def test_refresh_state_normalizes_legacy_fields(self) -> None:
        phase = self.fixture.load_phase()
        phase["status"] = "in_progress"
        phase["current_step"] = 0
        phase["created_at"] = "2026-04-19T00:00:00+0900"
        phase["steps"][0]["status"] = "in_progress"
        top = self.fixture.load_top()
        top["phases"][0]["status"] = "in_progress"
        top["phases"][0]["current_step"] = 0
        top["phases"][0]["created_at"] = "2026-04-19T00:00:00+0900"
        write_json(self.fixture.phase_path(), phase)
        write_json(self.fixture.top_path(), top)

        runner = ex.HarnessExecutor(self.fixture.root, "demo-phase")
        refreshed_phase, refreshed_top = runner.refresh_state()

        self.assertEqual(refreshed_phase["status"], "pending")
        self.assertEqual(refreshed_phase["steps"][0]["status"], "pending")
        self.assertNotIn("current_step", refreshed_phase)
        self.assertNotIn("created_at", refreshed_phase)
        self.assertEqual(refreshed_top["phases"][0]["status"], "pending")
        self.assertNotIn("current_step", refreshed_top["phases"][0])
        self.assertNotIn("created_at", refreshed_top["phases"][0])

    def test_build_prompt_uses_agents_guardrails_and_no_helper_commands(self) -> None:
        runner = ex.HarnessExecutor(self.fixture.root, "demo-phase")
        prompt = runner.build_prompt(
            runner.phase_index,
            runner.phase_index["steps"][0],
            branch_name=runner.branch_name,
        )

        self.assertIn("Guardrails.", prompt)
        self.assertIn("Read the step file and AGENTS.md before editing.", prompt)
        self.assertIn("phases/demo-phase/index.json", prompt)
        self.assertNotIn("complete:", prompt)
        self.assertNotIn("block:", prompt)
        self.assertNotIn("error:", prompt)

    def test_run_updates_phase_index_directly_and_writes_step_output(self) -> None:
        prompts: list[str] = []

        def fake_run_codex_for_step(self, *, prompt: str) -> CompletedProcess[str]:
            prompts.append(prompt)
            phase = ex.load_json(self.paths["phase_index"])
            top = ex.load_json(self.paths["top_index"])
            current = ex.first_pending_step(phase)
            assert current is not None

            current["status"] = "completed"
            current["summary"] = f"Completed step {current['step']}."
            current["completed_at"] = ex.stamp()
            current.pop("blocked_reason", None)
            current.pop("error_message", None)
            phase["status"] = "completed" if all(step.get("status") == "completed" for step in phase["steps"]) else "pending"
            if phase["status"] == "completed":
                phase["completed_at"] = current["completed_at"]
            else:
                phase.pop("completed_at", None)
            phase.pop("blocked_at", None)
            phase.pop("failed_at", None)
            ex.sync_top_phase_status(
                top,
                "demo-phase",
                phase["status"],
                completed_at=phase.get("completed_at"),
            )
            ex.persist_phase_state(self.paths, phase, top)
            return CompletedProcess(["codex"], 0, stdout="ok\n", stderr="")

        runner = ex.HarnessExecutor(self.fixture.root, "demo-phase")

        with (
            patch.object(ex, "ensure_branch"),
            patch.object(ex.HarnessExecutor, "commit_step"),
            patch.object(ex.HarnessExecutor, "finalize_phase"),
            patch.object(ex.HarnessExecutor, "run_codex_for_step", fake_run_codex_for_step),
            patch.object(ex, "progress_indicator", lambda label: contextlib.nullcontext()),
        ):
            result = runner.run()

        self.assertEqual(result, 0)
        self.assertEqual(len(prompts), 2)
        self.assertIn("AGENTS.md", prompts[0])
        self.assertEqual(self.fixture.load_phase()["status"], "completed")
        self.assertEqual(self.fixture.load_phase()["steps"][0]["status"], "completed")
        self.assertEqual(self.fixture.load_phase()["steps"][1]["status"], "completed")
        self.assertEqual(self.fixture.load_top()["phases"][0]["status"], "completed")

        output0 = self.fixture.load_step_output(0)
        output1 = self.fixture.load_step_output(1)
        self.assertEqual(output0["returncode"], 0)
        self.assertEqual(output0["stdout"], "ok\n")
        self.assertEqual(output0["stderr"], "")
        self.assertEqual(output1["returncode"], 0)
        self.assertEqual(output1["stdout"], "ok\n")
        self.assertEqual(output1["stderr"], "")

    def test_run_retries_three_times_then_marks_step_error_and_records_output(self) -> None:
        call_count = {"count": 0}

        def fake_run_codex_for_step(self, *, prompt: str) -> CompletedProcess[str]:
            call_count["count"] += 1
            return CompletedProcess(["codex"], 1, stdout="", stderr="lint failed\n")

        runner = ex.HarnessExecutor(self.fixture.root, "demo-phase")

        with (
            patch.object(ex, "ensure_branch"),
            patch.object(ex.HarnessExecutor, "commit_step"),
            patch.object(ex.HarnessExecutor, "finalize_phase"),
            patch.object(ex.HarnessExecutor, "run_codex_for_step", fake_run_codex_for_step),
            patch.object(ex, "progress_indicator", lambda label: contextlib.nullcontext()),
        ):
            result = runner.run()

        self.assertEqual(result, 1)
        self.assertEqual(call_count["count"], 3)
        phase = self.fixture.load_phase()
        self.assertEqual(phase["status"], "error")
        self.assertEqual(phase["steps"][0]["status"], "error")
        self.assertTrue(phase["steps"][0]["error_message"].startswith("[after 3 attempts]"))

        output = self.fixture.load_step_output(0)
        self.assertEqual(output["returncode"], 1)
        self.assertEqual(output["stderr"], "lint failed\n")

    def test_main_respects_push_flag_and_root_override(self) -> None:
        seen: list[bool] = []

        def fake_run(self) -> int:
            seen.append(self.push)
            return 0

        with patch.object(ex.HarnessExecutor, "run", fake_run):
            result = ex.main(["demo-phase", "--push"], root=self.fixture.root)

        self.assertEqual(result, 0)
        self.assertEqual(seen, [True])


if __name__ == "__main__":
    unittest.main()
