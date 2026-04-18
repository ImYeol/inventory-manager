#!/usr/bin/env python3
"""Regression tests for the Codex-native review context builder."""

from __future__ import annotations

import io
import json
import tempfile
import unittest
from contextlib import redirect_stdout
from pathlib import Path
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


if __name__ == "__main__":
    unittest.main()
