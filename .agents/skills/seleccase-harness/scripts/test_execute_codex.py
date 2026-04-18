#!/usr/bin/env python3
"""Regression tests for the Codex-native harness executor."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path
from subprocess import CompletedProcess
from unittest.mock import patch

import execute_codex as ex


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


class HarnessFixture:
    def __init__(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "docs").mkdir()
        (self.root / ".codex").mkdir()
        (self.root / "phases" / "demo-phase").mkdir(parents=True)
        (self.root / "AGENTS.md").write_text("# Agents\n", encoding="utf-8")
        (self.root / "DESIGN_SYSTEM.md").write_text("# Design\n", encoding="utf-8")
        (self.root / "docs" / "ARCHITECTURE.md").write_text("# Architecture\n", encoding="utf-8")
        (self.root / ".codex" / "config.toml").write_text("[features]\n", encoding="utf-8")
        (self.root / ".codex" / "hooks.json").write_text('{"hooks":{}}', encoding="utf-8")
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


class ExecuteCodexTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = HarnessFixture()

    def tearDown(self) -> None:
        self.fixture.cleanup()

    def read_phase(self) -> dict:
        return json.loads((self.fixture.root / "phases" / "demo-phase" / "index.json").read_text(encoding="utf-8"))

    def read_top(self) -> dict:
        return json.loads((self.fixture.root / "phases" / "index.json").read_text(encoding="utf-8"))

    @patch.object(ex, "ensure_branch")
    def test_prepare_marks_first_pending_step_and_writes_prompt(self, ensure_branch) -> None:
        result = ex.main(["--root", str(self.fixture.root), "prepare", "demo-phase"])
        self.assertEqual(result, 0)
        ensure_branch.assert_called_once()
        called_root, called_branch = ensure_branch.call_args.args
        self.assertEqual(Path(called_root).resolve(), self.fixture.root.resolve())
        self.assertEqual(called_branch, "feat-demo-phase")

        phase = self.read_phase()
        self.assertEqual(phase["status"], "in_progress")
        self.assertEqual(phase["current_step"], 0)
        self.assertEqual(phase["steps"][0]["status"], "in_progress")
        prompt_path = self.fixture.root / "phases" / "demo-phase" / "step0-prompt.md"
        self.assertTrue(prompt_path.exists())
        prompt = prompt_path.read_text(encoding="utf-8")
        self.assertIn("Codex Harness Prompt", prompt)
        self.assertIn("execute_codex.py complete demo-phase", prompt)

    def test_complete_advances_to_next_step(self) -> None:
        phase = self.read_phase()
        phase["status"] = "in_progress"
        phase["current_step"] = 0
        phase["steps"][0]["status"] = "in_progress"
        write_json(self.fixture.root / "phases" / "demo-phase" / "index.json", phase)
        top = self.read_top()
        top["phases"][0]["status"] = "in_progress"
        top["phases"][0]["current_step"] = 0
        write_json(self.fixture.root / "phases" / "index.json", top)

        result = ex.main(["--root", str(self.fixture.root), "complete", "demo-phase", "--summary", "Docs aligned."])
        self.assertEqual(result, 0)

        phase = self.read_phase()
        self.assertEqual(phase["steps"][0]["status"], "completed")
        self.assertEqual(phase["steps"][0]["summary"], "Docs aligned.")
        self.assertEqual(phase["steps"][1]["status"], "in_progress")
        self.assertEqual(phase["current_step"], 1)

    def test_block_marks_phase_and_step(self) -> None:
        phase = self.read_phase()
        phase["status"] = "in_progress"
        phase["current_step"] = 0
        phase["steps"][0]["status"] = "in_progress"
        write_json(self.fixture.root / "phases" / "demo-phase" / "index.json", phase)
        top = self.read_top()
        top["phases"][0]["status"] = "in_progress"
        top["phases"][0]["current_step"] = 0
        write_json(self.fixture.root / "phases" / "index.json", top)

        result = ex.main(["--root", str(self.fixture.root), "block", "demo-phase", "--reason", "API key missing"])
        self.assertEqual(result, 0)

        phase = self.read_phase()
        self.assertEqual(phase["status"], "blocked")
        self.assertEqual(phase["steps"][0]["status"], "blocked")
        self.assertEqual(phase["steps"][0]["blocked_reason"], "API key missing")

    def test_error_marks_phase_and_step(self) -> None:
        phase = self.read_phase()
        phase["status"] = "in_progress"
        phase["current_step"] = 0
        phase["steps"][0]["status"] = "in_progress"
        write_json(self.fixture.root / "phases" / "demo-phase" / "index.json", phase)
        top = self.read_top()
        top["phases"][0]["status"] = "in_progress"
        top["phases"][0]["current_step"] = 0
        write_json(self.fixture.root / "phases" / "index.json", top)

        result = ex.main(["--root", str(self.fixture.root), "error", "demo-phase", "--message", "lint failed"])
        self.assertEqual(result, 0)

        phase = self.read_phase()
        self.assertEqual(phase["status"], "error")
        self.assertEqual(phase["steps"][0]["status"], "error")
        self.assertEqual(phase["steps"][0]["error_message"], "lint failed")

    def test_reset_returns_phase_to_pending_and_clears_current_step(self) -> None:
        phase = self.read_phase()
        phase["status"] = "error"
        phase["current_step"] = 0
        phase["steps"][0]["status"] = "error"
        phase["steps"][0]["error_message"] = "lint failed"
        phase["steps"][0]["failed_at"] = "2026-04-19T00:00:00+0900"
        write_json(self.fixture.root / "phases" / "demo-phase" / "index.json", phase)
        top = self.read_top()
        top["phases"][0]["status"] = "error"
        top["phases"][0]["current_step"] = 0
        write_json(self.fixture.root / "phases" / "index.json", top)

        result = ex.main(["--root", str(self.fixture.root), "reset", "demo-phase", "--step", "0"])
        self.assertEqual(result, 0)

        phase = self.read_phase()
        top = self.read_top()
        self.assertEqual(phase["status"], "pending")
        self.assertNotIn("current_step", phase)
        self.assertEqual(phase["steps"][0]["status"], "pending")
        self.assertNotIn("error_message", phase["steps"][0])
        self.assertEqual(top["phases"][0]["status"], "pending")
        self.assertNotIn("current_step", top["phases"][0])

    def test_validate_detects_missing_summary_for_completed_step(self) -> None:
        phase = self.read_phase()
        phase["status"] = "completed"
        phase["steps"][0]["status"] = "completed"
        write_json(self.fixture.root / "phases" / "demo-phase" / "index.json", phase)
        top = self.read_top()
        top["phases"][0]["status"] = "completed"
        write_json(self.fixture.root / "phases" / "index.json", top)

        result = ex.main(["--root", str(self.fixture.root), "validate", "demo-phase"])
        self.assertEqual(result, 1)

    def test_parse_structured_result_rejects_invalid_payload(self) -> None:
        with self.assertRaises(RuntimeError):
            ex.parse_structured_result("not-json")

        with self.assertRaises(RuntimeError):
            ex.parse_structured_result(json.dumps({"status": "completed", "summary": "x"}))

    def test_parse_args_supports_legacy_run_syntax(self) -> None:
        args = ex.parse_args(["demo-phase", "--push"])
        self.assertEqual(args.command, "run")
        self.assertEqual(args.phase_dir, "demo-phase")
        self.assertTrue(args.push)

    @patch.object(ex, "finalize_phase")
    @patch.object(ex, "commit_step")
    @patch.object(ex, "ensure_branch")
    @patch("execute_codex.subprocess.run")
    def test_run_completes_remaining_steps(self, run_mock, ensure_branch, commit_step, finalize_phase) -> None:
        def fake_run(command, cwd=None, input=None, capture_output=None, text=None):
            if command[0] == "codex":
                output_path = Path(command[command.index("--output-last-message") + 1])
                payload = {
                    "status": "completed",
                    "summary": "Implemented step from headless Codex.",
                    "details": "Applied the requested changes and verified them.",
                    "validations": ["npm run test"],
                }
                output_path.write_text(json.dumps(payload), encoding="utf-8")
                return CompletedProcess(command, 0, stdout="ok", stderr="")
            raise AssertionError(f"Unexpected subprocess call: {command}")

        run_mock.side_effect = fake_run

        result = ex.main(["--root", str(self.fixture.root), "run", "demo-phase"])
        self.assertEqual(result, 0)
        ensure_branch.assert_called()
        self.assertEqual(commit_step.call_count, 2)
        finalize_phase.assert_called_once()

        phase = self.read_phase()
        self.assertEqual(phase["status"], "completed")
        self.assertEqual(phase["steps"][0]["status"], "completed")
        self.assertEqual(phase["steps"][1]["status"], "completed")
        self.assertEqual(phase["steps"][0]["summary"], "Implemented step from headless Codex.")
        self.assertNotIn("current_step", phase)
        self.assertTrue((self.fixture.root / "phases" / "demo-phase" / "step0-codex-result.json").exists())
        self.assertTrue((self.fixture.root / "phases" / "demo-phase" / "step1-codex-result.json").exists())

    @patch.object(ex, "finalize_phase")
    @patch.object(ex, "commit_step")
    @patch.object(ex, "ensure_branch")
    @patch("execute_codex.subprocess.run")
    def test_run_marks_blocked_when_codex_returns_blocked(self, run_mock, ensure_branch, commit_step, finalize_phase) -> None:
        def fake_run(command, cwd=None, input=None, capture_output=None, text=None):
            if command[0] == "codex":
                output_path = Path(command[command.index("--output-last-message") + 1])
                payload = {
                    "status": "blocked",
                    "summary": "Missing credentials.",
                    "details": "The required provider credentials were unavailable in the environment.",
                    "validations": [],
                }
                output_path.write_text(json.dumps(payload), encoding="utf-8")
                return CompletedProcess(command, 0, stdout="", stderr="")
            raise AssertionError(f"Unexpected subprocess call: {command}")

        run_mock.side_effect = fake_run

        result = ex.main(["--root", str(self.fixture.root), "run", "demo-phase", "--max-steps", "1"])
        self.assertEqual(result, 1)
        ensure_branch.assert_called_once()
        commit_step.assert_called_once()
        finalize_phase.assert_not_called()

        phase = self.read_phase()
        self.assertEqual(phase["status"], "blocked")
        self.assertEqual(phase["steps"][0]["status"], "blocked")
        self.assertEqual(phase["steps"][0]["blocked_reason"], "Missing credentials.")

    @patch.object(ex, "finalize_phase")
    @patch.object(ex, "commit_step")
    @patch.object(ex, "ensure_branch")
    @patch("execute_codex.subprocess.run")
    def test_run_retries_after_failed_attempt_and_then_completes(self, run_mock, ensure_branch, commit_step, finalize_phase) -> None:
        attempts = {"count": 0}

        def fake_run(command, cwd=None, input=None, capture_output=None, text=None):
            if command[0] != "codex":
                raise AssertionError(f"Unexpected subprocess call: {command}")

            attempts["count"] += 1
            output_path = Path(command[command.index("--output-last-message") + 1])
            if attempts["count"] == 1:
                payload = {
                    "status": "error",
                    "summary": "Tests failed.",
                    "details": "The first implementation failed validation.",
                    "validations": ["npm run test"],
                }
            else:
                payload = {
                    "status": "completed",
                    "summary": "Retried successfully.",
                    "details": "The validation issue was fixed on retry.",
                    "validations": ["npm run test"],
                }
            output_path.write_text(json.dumps(payload), encoding="utf-8")
            return CompletedProcess(command, 0, stdout="ok", stderr="")

        run_mock.side_effect = fake_run

        result = ex.main(["--root", str(self.fixture.root), "run", "demo-phase", "--max-steps", "1"])
        self.assertEqual(result, 0)
        self.assertEqual(attempts["count"], 2)
        ensure_branch.assert_called_once()
        commit_step.assert_called_once()
        finalize_phase.assert_not_called()

        phase = self.read_phase()
        self.assertEqual(phase["status"], "in_progress")
        self.assertEqual(phase["steps"][0]["status"], "completed")
        self.assertEqual(phase["steps"][0]["summary"], "Retried successfully.")
        prompt = (self.fixture.root / "phases" / "demo-phase" / "step0-prompt.md").read_text(encoding="utf-8")
        self.assertIn("Previous Attempt Failed", prompt)
        self.assertIn("The first implementation failed validation.", prompt)

    @patch.object(ex, "finalize_phase")
    @patch.object(ex, "commit_step")
    @patch.object(ex, "ensure_branch")
    @patch("execute_codex.subprocess.run")
    def test_run_does_not_double_complete_if_headless_session_already_recorded_step(
        self, run_mock, ensure_branch, commit_step, finalize_phase
    ) -> None:
        def fake_run(command, cwd=None, input=None, capture_output=None, text=None):
            if command[0] == "codex":
                output_path = Path(command[command.index("--output-last-message") + 1])
                phase_path = self.fixture.root / "phases" / "demo-phase" / "index.json"
                top_path = self.fixture.root / "phases" / "index.json"
                phase = json.loads(phase_path.read_text(encoding="utf-8"))
                phase["steps"][0]["status"] = "completed"
                phase["steps"][0]["summary"] = "Recorded inside headless session."
                phase["steps"][0]["completed_at"] = "2026-04-19T00:00:00+0900"
                phase["steps"][1]["status"] = "in_progress"
                phase["steps"][1]["started_at"] = "2026-04-19T00:00:00+0900"
                phase["status"] = "in_progress"
                phase["current_step"] = 1
                write_json(phase_path, phase)
                top = json.loads(top_path.read_text(encoding="utf-8"))
                top["phases"][0]["status"] = "in_progress"
                top["phases"][0]["current_step"] = 1
                write_json(top_path, top)
                payload = {
                    "status": "completed",
                    "summary": "Completed step from JSON output.",
                    "details": "The step was already recorded by the headless session.",
                    "validations": ["python3 validate"],
                }
                output_path.write_text(json.dumps(payload), encoding="utf-8")
                return CompletedProcess(command, 0, stdout="ok", stderr="")
            raise AssertionError(f"Unexpected subprocess call: {command}")

        run_mock.side_effect = fake_run

        result = ex.main(["--root", str(self.fixture.root), "run", "demo-phase", "--max-steps", "1"])
        self.assertEqual(result, 0)
        ensure_branch.assert_called_once()
        commit_step.assert_called_once()
        finalize_phase.assert_not_called()

        phase = self.read_phase()
        self.assertEqual(phase["steps"][0]["status"], "completed")
        self.assertEqual(phase["steps"][0]["summary"], "Recorded inside headless session.")
        self.assertEqual(phase["steps"][1]["status"], "in_progress")


if __name__ == "__main__":
    unittest.main()
