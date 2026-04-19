#!/usr/bin/env python3
"""Codex-native harness executor for phased headless execution."""

from __future__ import annotations

import argparse
import contextlib
import json
import subprocess
import sys
import threading
import time
import types
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

READ_STATUS = {"pending", "in_progress", "completed", "blocked", "error"}
MAX_RETRIES = 3
FEATURE_COMMIT_MSG = "feat({phase}): step {num} - {name}"
METADATA_COMMIT_MSG = "chore({phase}): step {num} metadata"
PHASE_COMPLETE_COMMIT_MSG = "chore({phase}): mark phase completed"
KST = timezone(timedelta(hours=9))


def repo_root_from_script(script_path: str | Path) -> Path:
    return Path(script_path).resolve().parents[4]


def stamp() -> str:
    return datetime.now(KST).strftime("%Y-%m-%dT%H:%M:%S%z")


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def phase_paths(root: Path, phase_dir: str) -> dict[str, Path]:
    phases_dir = root / "phases"
    phase_dir_path = phases_dir / phase_dir
    return {
        "root": root,
        "phases_dir": phases_dir,
        "top_index": phases_dir / "index.json",
        "phase_dir": phase_dir_path,
        "phase_index": phase_dir_path / "index.json",
    }


def step_file_for(phase_dir: Path, step_number: int, suffix: str = ".md") -> Path:
    return phase_dir / f"step{step_number}{suffix}"


def run_git(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], cwd=root, capture_output=True, text=True)


def ensure_branch(root: Path, branch_name: str) -> None:
    current = run_git(root, "rev-parse", "--abbrev-ref", "HEAD")
    if current.returncode != 0:
        raise RuntimeError(current.stderr.strip() or "git rev-parse failed")
    if current.stdout.strip() == branch_name:
        return

    exists = run_git(root, "rev-parse", "--verify", branch_name)
    if exists.returncode == 0:
        result = run_git(root, "checkout", branch_name)
    else:
        result = run_git(root, "checkout", "-b", branch_name)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"Failed to checkout '{branch_name}'")


def load_guardrails(root: Path) -> str:
    agents_path = root / "AGENTS.md"
    if not agents_path.exists():
        raise RuntimeError("AGENTS.md not found at repository root.")
    return agents_path.read_text(encoding="utf-8")


def build_step_context(phase_index: dict[str, Any]) -> str:
    lines = [
        f"- Step {step['step']} ({step['name']}): {step['summary']}"
        for step in phase_index.get("steps", [])
        if step.get("status") == "completed" and step.get("summary")
    ]
    if not lines:
        return ""
    return "## Completed Step Summaries\n\n" + "\n".join(lines) + "\n\n"


def normalize_step(step: dict[str, Any]) -> dict[str, Any]:
    normalized = deepcopy(step)
    status = normalized.get("status", "pending")
    if status not in READ_STATUS:
        raise RuntimeError(f"Invalid step status '{status}'.")
    if status == "in_progress":
        normalized["status"] = "pending"
    if normalized["status"] != "completed":
        normalized.pop("summary", None)
        normalized.pop("completed_at", None)
    if normalized["status"] != "blocked":
        normalized.pop("blocked_reason", None)
        normalized.pop("blocked_at", None)
    if normalized["status"] != "error":
        normalized.pop("error_message", None)
        normalized.pop("failed_at", None)
    return normalized


def derive_phase_status(steps: list[dict[str, Any]]) -> str:
    statuses = [step.get("status") for step in steps]
    if "error" in statuses:
        return "error"
    if "blocked" in statuses:
        return "blocked"
    if steps and all(status == "completed" for status in statuses):
        return "completed"
    return "pending"


def normalize_phase_index(phase_index: dict[str, Any]) -> dict[str, Any]:
    normalized = deepcopy(phase_index)
    normalized.pop("current_step", None)
    normalized.pop("created_at", None)

    steps = normalized.get("steps")
    if not isinstance(steps, list):
        raise RuntimeError("Phase index must include a steps array.")
    normalized["steps"] = [normalize_step(step) for step in steps]
    normalized["status"] = derive_phase_status(normalized["steps"])

    if normalized["status"] != "completed":
        normalized.pop("completed_at", None)
    if normalized["status"] != "blocked":
        normalized.pop("blocked_at", None)
    if normalized["status"] != "error":
        normalized.pop("failed_at", None)
    return normalized


def normalize_top_index(top_index: dict[str, Any]) -> dict[str, Any]:
    normalized = deepcopy(top_index)
    phases = normalized.get("phases")
    if not isinstance(phases, list):
        raise RuntimeError("phases/index.json must include a phases array.")

    for entry in phases:
        if not isinstance(entry, dict):
            raise RuntimeError("Each phase entry must be an object.")
        status = entry.get("status", "pending")
        if status not in READ_STATUS:
            raise RuntimeError(f"Invalid top-level phase status '{status}'.")
        if status == "in_progress":
            status = "pending"
        entry["status"] = status
        entry.pop("current_step", None)
        entry.pop("created_at", None)
        if status != "completed":
            entry.pop("completed_at", None)
        if status != "blocked":
            entry.pop("blocked_at", None)
        if status != "error":
            entry.pop("failed_at", None)
    return normalized


def sync_top_phase_status(
    top_index: dict[str, Any],
    phase_dir: str,
    status: str,
    *,
    completed_at: str | None = None,
    blocked_at: str | None = None,
    failed_at: str | None = None,
) -> None:
    for entry in top_index.get("phases", []):
        if entry.get("dir") != phase_dir:
            continue
        existing_completed_at = entry.get("completed_at")
        existing_blocked_at = entry.get("blocked_at")
        existing_failed_at = entry.get("failed_at")
        entry["status"] = status
        entry.pop("current_step", None)
        entry.pop("created_at", None)
        entry.pop("completed_at", None)
        entry.pop("blocked_at", None)
        entry.pop("failed_at", None)
        if status == "completed" and (completed_at or existing_completed_at):
            entry["completed_at"] = completed_at or existing_completed_at
        if status == "blocked" and (blocked_at or existing_blocked_at):
            entry["blocked_at"] = blocked_at or existing_blocked_at
        if status == "error" and (failed_at or existing_failed_at):
            entry["failed_at"] = failed_at or existing_failed_at
        return
    raise RuntimeError(f"Phase '{phase_dir}' not found in phases/index.json.")


def persist_phase_state(paths: dict[str, Path], phase_index: dict[str, Any], top_index: dict[str, Any]) -> None:
    write_json(paths["phase_index"], normalize_phase_index(phase_index))
    write_json(paths["top_index"], normalize_top_index(top_index))


def ensure_phase_exists(root: Path, phase_dir: str) -> dict[str, Path]:
    paths = phase_paths(root, phase_dir)
    if not paths["phase_dir"].is_dir():
        raise RuntimeError(f"Phase directory '{paths['phase_dir']}' not found.")
    if not paths["phase_index"].is_file():
        raise RuntimeError(f"Phase index '{paths['phase_index']}' not found.")
    if not paths["top_index"].is_file():
        raise RuntimeError(f"Top phase index '{paths['top_index']}' not found.")
    return paths


def load_phase_state(root: Path, phase_dir: str, *, persist_normalized: bool) -> tuple[dict[str, Path], dict[str, Any], dict[str, Any]]:
    paths = ensure_phase_exists(root, phase_dir)
    raw_phase = load_json(paths["phase_index"])
    raw_top = load_json(paths["top_index"])
    phase_index = normalize_phase_index(raw_phase)
    top_index = normalize_top_index(raw_top)

    sync_top_phase_status(
        top_index,
        phase_dir,
        phase_index["status"],
        completed_at=phase_index.get("completed_at"),
        blocked_at=phase_index.get("blocked_at"),
        failed_at=phase_index.get("failed_at"),
    )

    if persist_normalized and (raw_phase != phase_index or raw_top != top_index):
        persist_phase_state(paths, phase_index, top_index)

    return paths, phase_index, top_index


def first_pending_step(phase_index: dict[str, Any]) -> dict[str, Any] | None:
    for step in phase_index.get("steps", []):
        if step.get("status") == "pending":
            return step
    return None


def lookup_step(phase_index: dict[str, Any], step_number: int) -> dict[str, Any]:
    for step in phase_index.get("steps", []):
        if step.get("step") == step_number:
            return step
    raise RuntimeError(f"Step {step_number} not found in phase index.")


def clear_step_result_fields(step: dict[str, Any]) -> None:
    for key in [
        "summary",
        "completed_at",
        "blocked_reason",
        "blocked_at",
        "error_message",
        "failed_at",
    ]:
        step.pop(key, None)


def build_codex_exec_command(root: Path) -> list[str]:
    return [
        "codex",
        "exec",
        "-C",
        str(root),
        "--skip-git-repo-check",
        "--sandbox",
        "danger-full-access",
        "--full-auto",
        "--ephemeral",
        "-",
    ]


@contextlib.contextmanager
def progress_indicator(label: str):
    frames = "|/-\\"
    stop = threading.Event()
    started_at = time.monotonic()

    def animate() -> None:
        idx = 0
        while not stop.wait(0.12):
            elapsed = int(time.monotonic() - started_at)
            sys.stderr.write(f"\r{frames[idx % len(frames)]} {label} [{elapsed}s]")
            sys.stderr.flush()
            idx += 1
        sys.stderr.write("\r" + (" " * (len(label) + 24)) + "\r")
        sys.stderr.flush()

    thread = threading.Thread(target=animate, daemon=True)
    thread.start()
    info = types.SimpleNamespace(elapsed=0.0)
    try:
        yield info
    finally:
        stop.set()
        thread.join()
        info.elapsed = time.monotonic() - started_at


class HarnessExecutor:
    def __init__(self, root: Path, phase_dir: str, *, push: bool = False) -> None:
        self.root = root
        self.phase_dir = phase_dir
        self.push = push
        self.paths, self.phase_index, self.top_index = load_phase_state(self.root, self.phase_dir, persist_normalized=True)
        self.phase_name = self.phase_index["phase"]
        self.branch_name = f"feat-{self.phase_name}"
        self.steps_run = 0

    def refresh_state(self, *, persist_normalized: bool = True) -> tuple[dict[str, Any], dict[str, Any]]:
        self.paths, self.phase_index, self.top_index = load_phase_state(
            self.root,
            self.phase_dir,
            persist_normalized=persist_normalized,
        )
        return self.phase_index, self.top_index

    def write_step_output(
        self,
        *,
        step_number: int,
        step_name: str,
        attempt: int,
        result: subprocess.CompletedProcess[str],
        observed_status: str,
        prompt_path: Path,
    ) -> None:
        output_path = step_file_for(self.paths["phase_dir"], step_number, suffix="-output.json")
        write_json(
            output_path,
            {
                "phase": self.phase_name,
                "phase_dir": self.phase_dir,
                "step": step_number,
                "name": step_name,
                "attempt": attempt,
                "started_at": stamp(),
                "finished_at": stamp(),
                "status": observed_status,
                "returncode": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "prompt_path": str(prompt_path.relative_to(self.root)),
            },
        )

    def build_prompt(
        self,
        phase_index: dict[str, Any],
        step: dict[str, Any],
        *,
        branch_name: str,
        prev_error: str | None = None,
    ) -> str:
        step_path = step_file_for(self.paths["phase_dir"], step["step"])
        step_body = step_path.read_text(encoding="utf-8")
        retry_section = ""
        if prev_error:
            retry_section = (
                "## Previous Attempt Failed\n\n"
                "Fix the issue below before you retry this step.\n\n"
                f"{prev_error.strip()}\n\n"
            )

        return (
            "# Codex Harness Prompt\n\n"
            f"- Project: {phase_index['project']}\n"
            f"- Phase: {phase_index['phase']}\n"
            f"- Step: {step['step']} ({step['name']})\n"
            f"- Branch: {branch_name}\n\n"
            "## Execution Rules\n\n"
            "1. Execute only this step and keep earlier completed work consistent.\n"
            "2. Read the step file and AGENTS.md before editing.\n"
            "3. Run the step acceptance criteria directly.\n"
            "4. Update `phases/"
            f"{self.phase_dir}/index.json` directly when the step is done.\n"
            "5. Write the current step result into the phase index file itself. Do not call helper commands.\n"
            "6. Do not change unrelated step statuses or broaden scope.\n\n"
            f"{build_step_context(phase_index)}"
            f"{retry_section}"
            f"## Guardrails\n\n{load_guardrails(self.root)}\n\n"
            "---\n\n"
            f"{step_body}\n"
        )

    def build_automation_prompt(self, prompt: str) -> str:
        return (
            f"{prompt.rstrip()}\n\n"
            "## Automation Contract\n\n"
            "You are running headlessly through `codex exec --full-auto --ephemeral`.\n"
            "Implement exactly this step, run the acceptance criteria directly when possible, and do not stop after editing files.\n"
            "Record the result by editing `phases/"
            f"{self.phase_dir}/index.json` directly. Conversation output is ignored.\n"
        )

    def run_codex_for_step(self, *, prompt: str) -> subprocess.CompletedProcess[str]:
        return subprocess.run(
            build_codex_exec_command(self.root),
            cwd=self.root,
            input=self.build_automation_prompt(prompt),
            capture_output=True,
            text=True,
        )

    def mark_step_pending_for_retry(
        self,
        paths: dict[str, Path],
        phase_index: dict[str, Any],
        top_index: dict[str, Any],
        step_number: int,
    ) -> None:
        target = lookup_step(phase_index, step_number)
        target["status"] = "pending"
        target["started_at"] = stamp()
        clear_step_result_fields(target)
        phase_index["status"] = "pending"
        phase_index.pop("completed_at", None)
        phase_index.pop("blocked_at", None)
        phase_index.pop("failed_at", None)
        sync_top_phase_status(top_index, self.phase_dir, "pending")
        persist_phase_state(paths, phase_index, top_index)

    def mark_step_error(
        self,
        paths: dict[str, Path],
        phase_index: dict[str, Any],
        top_index: dict[str, Any],
        step_number: int,
        message: str,
    ) -> None:
        target = lookup_step(phase_index, step_number)
        target["status"] = "error"
        target["error_message"] = message.strip()
        target["failed_at"] = stamp()
        phase_index["status"] = "error"
        phase_index["failed_at"] = target["failed_at"]
        phase_index.pop("completed_at", None)
        phase_index.pop("blocked_at", None)
        sync_top_phase_status(top_index, self.phase_dir, "error", failed_at=target["failed_at"])
        persist_phase_state(paths, phase_index, top_index)

    def commit_step(self, step_number: int, step_name: str) -> None:
        excluded = [
            "phases/index.json",
            f"phases/{self.phase_dir}/index.json",
            f"phases/{self.phase_dir}/step{step_number}.md",
            f"phases/{self.phase_dir}/step{step_number}-prompt.md",
            f"phases/{self.phase_dir}/step{step_number}-output.json",
        ]

        run_git(self.root, "add", "-A")
        run_git(self.root, "reset", "HEAD", "--", *excluded)
        if run_git(self.root, "diff", "--cached", "--quiet").returncode != 0:
            message = FEATURE_COMMIT_MSG.format(phase=self.phase_name, num=step_number, name=step_name)
            result = run_git(self.root, "commit", "-m", message)
            if result.returncode != 0:
                raise RuntimeError(result.stderr.strip() or f"Failed to commit step {step_number}")

        run_git(self.root, "add", "-A")
        if run_git(self.root, "diff", "--cached", "--quiet").returncode != 0:
            message = METADATA_COMMIT_MSG.format(phase=self.phase_name, num=step_number)
            result = run_git(self.root, "commit", "-m", message)
            if result.returncode != 0:
                raise RuntimeError(result.stderr.strip() or f"Failed to commit step metadata for {step_number}")

    def finalize_phase(self) -> None:
        run_git(self.root, "add", "-A")
        if run_git(self.root, "diff", "--cached", "--quiet").returncode != 0:
            result = run_git(self.root, "commit", "-m", PHASE_COMPLETE_COMMIT_MSG.format(phase=self.phase_name))
            if result.returncode != 0:
                raise RuntimeError(result.stderr.strip() or "Failed to commit final phase metadata")

        if self.push:
            result = run_git(self.root, "push", "-u", "origin", self.branch_name)
            if result.returncode != 0:
                raise RuntimeError(result.stderr.strip() or f"Failed to push '{self.branch_name}'")

    def run(self) -> int:
        if self.phase_index.get("status") == "blocked":
            blocked_step = next((step for step in self.phase_index["steps"] if step.get("status") == "blocked"), None)
            reason = blocked_step.get("blocked_reason", "unknown") if blocked_step else "unknown"
            raise RuntimeError(f"Phase '{self.phase_dir}' is blocked. Resolve and reset it first. Reason: {reason}")
        if self.phase_index.get("status") == "error":
            error_step = next((step for step in self.phase_index["steps"] if step.get("status") == "error"), None)
            message = error_step.get("error_message", "unknown") if error_step else "unknown"
            raise RuntimeError(f"Phase '{self.phase_dir}' is in error state. Reset it first. Error: {message}")

        ensure_branch(self.root, self.branch_name)

        while True:
            self.refresh_state(persist_normalized=True)

            if self.phase_index.get("status") == "completed" and first_pending_step(self.phase_index) is None:
                self.finalize_phase()
                print(f"Phase '{self.phase_dir}' completed after {self.steps_run} step(s).")
                return 0

            current = first_pending_step(self.phase_index)
            if current is None:
                self.finalize_phase()
                print(f"Phase '{self.phase_dir}' has no runnable steps.")
                return 0

            if "started_at" not in current:
                current["started_at"] = stamp()
                persist_phase_state(self.paths, self.phase_index, self.top_index)

            step_number = current["step"]
            step_name = current["name"]
            prompt_path = step_file_for(self.paths["phase_dir"], step_number, suffix="-prompt.md")
            prev_error: str | None = None

            for attempt in range(1, MAX_RETRIES + 1):
                self.refresh_state(persist_normalized=False)
                current = lookup_step(self.phase_index, step_number)
                prompt_text = self.build_prompt(self.phase_index, current, branch_name=self.branch_name, prev_error=prev_error)
                prompt_path.write_text(prompt_text, encoding="utf-8")

                tag = f"Step {step_number}: {step_name}"
                if attempt > 1:
                    tag += f" [retry {attempt}/{MAX_RETRIES}]"

                with progress_indicator(tag):
                    result = self.run_codex_for_step(prompt=prompt_text)

                _, refreshed_phase, refreshed_top = load_phase_state(self.root, self.phase_dir, persist_normalized=True)
                refreshed_step = lookup_step(refreshed_phase, step_number)
                self.write_step_output(
                    step_number=step_number,
                    step_name=step_name,
                    attempt=attempt,
                    result=result,
                    observed_status=refreshed_step.get("status", "pending"),
                    prompt_path=prompt_path,
                )
                helper_message = (
                    refreshed_step.get("summary")
                    or refreshed_step.get("blocked_reason")
                    or refreshed_step.get("error_message")
                )

                if refreshed_step.get("status") == "completed":
                    self.commit_step(step_number, step_name)
                    self.steps_run += 1
                    break

                if refreshed_step.get("status") == "blocked":
                    self.commit_step(step_number, step_name)
                    print(f"Phase '{self.phase_dir}' blocked at step {step_number}: {helper_message or 'blocked'}")
                    return 1

                if refreshed_step.get("status") == "error":
                    error_message = str(helper_message or "Step failed.").strip()
                    if attempt < MAX_RETRIES:
                        self.mark_step_pending_for_retry(self.paths, refreshed_phase, refreshed_top, step_number)
                        prev_error = error_message
                        print(f"Retrying step {step_number} after recorded error: {error_message}")
                        continue
                    self.mark_step_error(
                        self.paths,
                        refreshed_phase,
                        refreshed_top,
                        step_number,
                        f"[after {MAX_RETRIES} attempts] {error_message}",
                    )
                    self.commit_step(step_number, step_name)
                    print(f"Phase '{self.phase_dir}' failed at step {step_number}: {error_message}")
                    return 1

                process_error = (result.stderr or result.stdout or "").strip()
                if result.returncode != 0:
                    error_message = process_error or f"codex exec failed with exit code {result.returncode}"
                else:
                    error_message = "Codex finished without recording a step outcome."

                if attempt < MAX_RETRIES:
                    self.mark_step_pending_for_retry(self.paths, refreshed_phase, refreshed_top, step_number)
                    prev_error = error_message
                    print(f"Retrying step {step_number} after failed attempt: {error_message}")
                    continue

                self.mark_step_error(
                    self.paths,
                    refreshed_phase,
                    refreshed_top,
                    step_number,
                    f"[after {MAX_RETRIES} attempts] {error_message}",
                )
                self.commit_step(step_number, step_name)
                print(f"Phase '{self.phase_dir}' failed at step {step_number}: {error_message}")
                return 1


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Codex-native phase executor.")
    parser.add_argument("phase_dir", help="Phase directory under phases/.")
    parser.add_argument("--push", action="store_true", help="Push the feature branch after phase completion.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None, *, root: Path | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    resolved_root = (root or repo_root_from_script(__file__)).resolve()

    try:
        executor = HarnessExecutor(resolved_root, args.phase_dir, push=args.push)
        return executor.run()
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
