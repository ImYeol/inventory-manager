#!/usr/bin/env python3
"""Regression tests for the Codex-native review context builder."""

from __future__ import annotations

import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
from subprocess import CompletedProcess
from unittest.mock import patch

import review_codex as rc


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


class ReviewFixture:
    def __init__(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "phases" / "demo-phase").mkdir(parents=True)
        write_json(
            self.root / "phases" / "index.json",
            {"phases": [{"dir": "demo-phase", "status": "in_progress", "current_step": 1}]},
        )
        write_json(
            self.root / "phases" / "demo-phase" / "index.json",
            {
                "project": "Demo",
                "phase": "demo-phase",
                "status": "in_progress",
                "current_step": 1,
                "steps": [
                    {"step": 0, "name": "docs", "status": "completed", "summary": "Done"},
                    {"step": 1, "name": "hub", "status": "in_progress"},
                ],
            },
        )
        (self.root / "phases" / "demo-phase" / "step0.md").write_text("# Step 0\n")
        (self.root / "phases" / "demo-phase" / "step1.md").write_text("# Step 1\n")

    def cleanup(self) -> None:
        self.tmp.cleanup()


class ReviewCodexTests(unittest.TestCase):
    def setUp(self) -> None:
        self.fixture = ReviewFixture()

    def tearDown(self) -> None:
        self.fixture.cleanup()

    @patch.object(rc, "changed_files", return_value=["src/app/components/Nav.tsx", "phases/demo-phase/index.json"])
    @patch.object(rc, "phase_validation", return_value=(True, "OK"))
    def test_markdown_output_contains_phase_and_changed_files(self, _validation, _changed) -> None:
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            result = rc.main(["--root", str(self.fixture.root)])
        self.assertEqual(result, 0)
        output = buffer.getvalue()
        self.assertIn("Codex Review Context", output)
        self.assertIn("demo-phase", output)
        self.assertIn("src/app/components/Nav.tsx", output)

    @patch.object(rc, "changed_files", return_value=[])
    @patch.object(rc, "phase_validation", return_value=(False, "metadata mismatch"))
    def test_json_output_contains_validation_result(self, _validation, _changed) -> None:
        buffer = io.StringIO()
        with redirect_stdout(buffer):
            result = rc.main(["--root", str(self.fixture.root), "--format", "json"])
        self.assertEqual(result, 0)
        payload = json.loads(buffer.getvalue())
        self.assertEqual(payload["phase"], "demo-phase")
        self.assertFalse(payload["phase_validation_ok"])
        self.assertEqual(payload["phase_validation_output"], "metadata mismatch")

    def test_resolve_active_phase_prefers_current_feature_branch(self) -> None:
        write_json(
            self.fixture.root / "phases" / "index.json",
            {
                "phases": [
                    {"dir": "other-phase", "status": "completed"},
                    {"dir": "demo-phase", "status": "completed"},
                ]
            },
        )

        with patch.object(rc, "run_git", return_value=CompletedProcess(["git"], 0, stdout="feat-demo-phase\n", stderr="")):
            selected, _, _ = rc.resolve_active_phase(self.fixture.root, None)

        self.assertEqual(selected["dir"], "demo-phase")

    def test_phase_validation_rejects_completed_step_with_failed_output(self) -> None:
        phase = json.loads((self.fixture.root / "phases" / "demo-phase" / "index.json").read_text(encoding="utf-8"))
        phase["status"] = "completed"
        phase["steps"][1]["status"] = "completed"
        phase["steps"][1]["summary"] = "Done"
        write_json(self.fixture.root / "phases" / "demo-phase" / "index.json", phase)
        write_json(
            self.fixture.root / "phases" / "demo-phase" / "step1-output.json",
            {"status": "pending", "returncode": 1},
        )

        valid, message = rc.phase_validation(self.fixture.root, "demo-phase")

        self.assertFalse(valid)
        self.assertIn("step1-output.json", message)

    def test_phase_validation_accepts_failed_output_superseded_by_verified_correction(self) -> None:
        phase = json.loads((self.fixture.root / "phases" / "demo-phase" / "index.json").read_text(encoding="utf-8"))
        phase["status"] = "completed"
        phase["steps"][1].update({
            "status": "completed",
            "summary": "Corrected",
            "supersedes_steps": [0],
            "acceptance_commands": [["python3", "-c", "raise SystemExit(0)"]],
        })
        top = json.loads((self.fixture.root / "phases" / "index.json").read_text(encoding="utf-8"))
        top["phases"][0]["status"] = "completed"
        write_json(self.fixture.root / "phases" / "index.json", top)
        write_json(self.fixture.root / "phases" / "demo-phase" / "index.json", phase)
        write_json(self.fixture.root / "phases" / "demo-phase" / "step0-output.json", {"status": "blocked", "returncode": 0})
        write_json(self.fixture.root / "phases" / "demo-phase" / "step1-output.json", {"status": "completed", "returncode": 0})
        write_json(self.fixture.root / "phases" / "demo-phase" / "step1-verification.json", {"status": "completed"})

        valid, message = rc.phase_validation(self.fixture.root, "demo-phase")

        self.assertTrue(valid, message)


if __name__ == "__main__":
    unittest.main()
