#!/usr/bin/env python3
"""Codex-native harness executor for phased headless execution and status management."""

from __future__ import annotations

import argparse
import contextlib
import json
import subprocess
import sys
import tempfile
import threading
import time
import types
from pathlib import Path
from typing import Any

from phase_runtime import (
    active_step,
    build_step_context,
    first_pending_step,
    load_guardrails,
    load_json,
    phase_paths,
    repo_root_from_script,
    set_top_phase_status,
    stamp,
    step_file_for,
    validate_phase,
    write_json,
)

MAX_RETRIES = 3
FEAT_MSG = "feat({phase}): step {num} - {name}"
CHORE_MSG = "chore({phase}): step {num} output"


@contextlib.contextmanager
def progress_indicator(label: str):
    """Simple terminal progress indicator with elapsed time."""
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


def run_git(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], cwd=root, capture_output=True, text=True)


def ensure_branch(root: Path, branch_name: str) -> None:
    current = run_git(root, "rev-parse", "--abbrev-ref", "HEAD")
    if current.returncode != 0:
        raise RuntimeError(current.stderr.strip() or "git rev-parse failed")
    if current.stdout.strip() == branch_name:
        return

    exists = run_git(root, "rev-parse", "--verify", branch_name)
    result = run_git(root, "checkout", branch_name) if exists.returncode == 0 else run_git(root, "checkout", "-b", branch_name)
    if result.returncode != 0:
        raise RuntimeError(result.stderr.strip() or f"Failed to checkout '{branch_name}'")


def commit_step(root: Path, phase_dir: str, phase_name: str, step_number: int, step_name: str) -> None:
    step_prefix = f"phases/{phase_dir}/step{step_number}"
    excluded = [
        "phases/index.json",
        f"phases/{phase_dir}/index.json",
        f"{step_prefix}-output.json",
        f"{step_prefix}-codex-result.json",
        f"{step_prefix}-prompt.md",
    ]

    run_git(root, "add", "-A")
    run_git(root, "reset", "HEAD", "--", *excluded)
    if run_git(root, "diff", "--cached", "--quiet").returncode != 0:
        message = FEAT_MSG.format(phase=phase_name, num=step_number, name=step_name)
        result = run_git(root, "commit", "-m", message)
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or f"Failed to commit step {step_number}")

    run_git(root, "add", "-A")
    if run_git(root, "diff", "--cached", "--quiet").returncode != 0:
        message = CHORE_MSG.format(phase=phase_name, num=step_number)
        result = run_git(root, "commit", "-m", message)
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or f"Failed to commit step metadata for {step_number}")


def finalize_phase(root: Path, phase_name: str, branch_name: str, auto_push: bool) -> None:
    run_git(root, "add", "-A")
    if run_git(root, "diff", "--cached", "--quiet").returncode != 0:
        message = f"chore({phase_name}): mark phase completed"
        result = run_git(root, "commit", "-m", message)
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or "Failed to commit final phase metadata")

    if auto_push:
        result = run_git(root, "push", "-u", "origin", branch_name)
        if result.returncode != 0:
            raise RuntimeError(result.stderr.strip() or f"Failed to push '{branch_name}'")


def ensure_phase_exists(root: Path, phase_dir: str) -> dict[str, Path]:
    paths = phase_paths(root, phase_dir)
    if not paths["phase_dir"].is_dir():
        raise RuntimeError(f"Phase directory '{paths['phase_dir']}' not found.")
    if not paths["phase_index"].is_file():
        raise RuntimeError(f"Phase index '{paths['phase_index']}' not found.")
    if not paths["top_index"].is_file():
        raise RuntimeError(f"Top phase index '{paths['top_index']}' not found.")
    return paths


def write_step_output(paths: dict[str, Path], step_number: int, payload: dict[str, Any]) -> None:
    write_json(paths["phase_dir"] / f"step{step_number}-output.json", payload)


def step_result_path(paths: dict[str, Path], step_number: int) -> Path:
    return paths["phase_dir"] / f"step{step_number}-codex-result.json"


def lookup_step(phase_index: dict[str, Any], step_number: int) -> dict[str, Any]:
    for step in phase_index["steps"]:
        if step["step"] == step_number:
            return step
    raise RuntimeError(f"Step {step_number} not found in phase index.")


def build_prompt(
    root: Path,
    phase_dir: str,
    phase_index: dict[str, Any],
    step: dict[str, Any],
    branch_name: str,
    prev_error: str | None = None,
) -> str:
    step_path = step_file_for(root / "phases" / phase_dir, step["step"])
    step_body = step_path.read_text(encoding="utf-8")
    guardrails = load_guardrails(root)
    step_context = build_step_context(phase_index)
    helper = "python3 .agents/skills/seleccase-harness/scripts/execute_codex.py"
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
        "2. Read the step file and listed dependencies before editing.\n"
        "3. Run the step acceptance criteria directly.\n"
        "4. Record the outcome before you finish by running exactly one helper command from the repository root:\n"
        f"   - complete: `{helper} complete {phase_dir} --summary \"...\"`\n"
        f"   - blocked: `{helper} block {phase_dir} --reason \"...\"`\n"
        f"   - error: `{helper} error {phase_dir} --message \"...\"`\n"
        "5. Do not change unrelated step statuses or broaden scope.\n"
        "6. Commit the changes you made for this step if the run results in code or metadata changes.\n\n"
        f"{step_context}"
        f"{retry_section}"
        f"## Guardrails\n\n{guardrails}\n\n"
        "---\n\n"
        f"{step_body}\n"
    )


def build_automation_prompt(prompt: str) -> str:
    return (
        f"{prompt.rstrip()}\n\n"
        "## Automation Contract\n\n"
        "You are running headlessly through `codex exec`.\n"
        "Implement exactly this step, run the step acceptance criteria directly when possible, and do not stop after editing files.\n"
        "You must record the phase outcome before finishing by invoking the harness helper command for `complete`, `block`, or `error`.\n"
        "Return a JSON object that matches the provided schema.\n"
        "Use these status rules in the JSON response:\n"
        "- `completed`: the step scope is implemented and verified.\n"
        "- `blocked`: you cannot continue because a real blocker requires user intervention.\n"
        "- `error`: the step failed or could not be finished within scope.\n"
        "Keep `summary` short and concrete. Put the main implementation and validation notes in `details`. "
        "List the commands you ran in `validations`.\n"
    )


def parse_structured_result(raw: str) -> dict[str, Any]:
    try:
        payload = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Codex output was not valid JSON: {exc}") from exc

    if not isinstance(payload, dict):
        raise RuntimeError("Codex output must be a JSON object.")

    status = payload.get("status")
    summary = payload.get("summary")
    details = payload.get("details")
    validations = payload.get("validations")
    valid_statuses = {"completed", "blocked", "error"}

    if status not in valid_statuses:
        raise RuntimeError(f"Codex output status must be one of {sorted(valid_statuses)}, got {status!r}.")
    if not isinstance(summary, str) or not summary.strip():
        raise RuntimeError("Codex output must include a non-empty summary string.")
    if not isinstance(details, str) or not details.strip():
        raise RuntimeError("Codex output must include a non-empty details string.")
    if not isinstance(validations, list) or any(not isinstance(item, str) for item in validations):
        raise RuntimeError("Codex output validations must be an array of strings.")

    return payload


def build_output_schema_file(schema_path: Path) -> None:
    schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "status": {"type": "string", "enum": ["completed", "blocked", "error"]},
            "summary": {"type": "string", "minLength": 1},
            "details": {"type": "string", "minLength": 1},
            "validations": {
                "type": "array",
                "items": {"type": "string"},
            },
        },
        "required": ["status", "summary", "details", "validations"],
    }
    write_json(schema_path, schema)


def build_codex_exec_command(
    *,
    root: Path,
    output_path: Path,
    schema_path: Path,
    model: str | None,
    profile: str | None,
) -> list[str]:
    command = [
        "codex",
        "exec",
        "-C",
        str(root),
        "--skip-git-repo-check",
        "--sandbox",
        "danger-full-access",
        "--full-auto",
        "--ephemeral",
        "--output-schema",
        str(schema_path),
        "--output-last-message",
        str(output_path),
        "-",
    ]
    if model:
        command[2:2] = ["--model", model]
    if profile:
        command[2:2] = ["--profile", profile]
    return command


def run_codex_for_step(
    *,
    root: Path,
    prompt: str,
    output_path: Path,
    schema_path: Path,
    model: str | None,
    profile: str | None,
) -> dict[str, Any]:
    command = build_codex_exec_command(
        root=root,
        output_path=output_path,
        schema_path=schema_path,
        model=model,
        profile=profile,
    )
    result = subprocess.run(
        command,
        cwd=root,
        input=prompt,
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        stderr = result.stderr.strip()
        stdout = result.stdout.strip()
        message = stderr or stdout or f"codex exec failed with exit code {result.returncode}"
        raise RuntimeError(message)

    if not output_path.is_file():
        raise RuntimeError(f"Codex did not write the structured output file: {output_path}")

    payload = parse_structured_result(output_path.read_text(encoding="utf-8"))
    payload["codex_stdout"] = result.stdout
    payload["codex_stderr"] = result.stderr
    return payload


def clear_step_transient_fields(step: dict[str, Any]) -> None:
    for key in [
        "blocked_reason",
        "blocked_at",
        "error_message",
        "failed_at",
    ]:
        step.pop(key, None)


def command_prepare(root: Path, phase_dir: str, branch_prefix: str, output: Path | None) -> int:
    paths = ensure_phase_exists(root, phase_dir)
    errors = validate_phase(root, phase_dir)
    if errors:
        raise RuntimeError("\n".join(errors))

    phase_index = load_json(paths["phase_index"])
    top_index = load_json(paths["top_index"])

    current = active_step(phase_index)
    if current is None:
        current = first_pending_step(phase_index)
        if current is None:
            print(f"Phase '{phase_dir}' has no pending steps.")
            return 0
        current["status"] = "in_progress"
        current.setdefault("started_at", stamp())
        phase_index.setdefault("created_at", stamp())

    phase_index["status"] = "in_progress"
    phase_index["current_step"] = current["step"]
    set_top_phase_status(top_index, phase_dir, status="in_progress", current_step=current["step"])

    branch_name = f"{branch_prefix}{phase_index['phase']}"
    ensure_branch(root, branch_name)

    prompt = build_prompt(root, phase_dir, phase_index, current, branch_name)
    prompt_path = output or (paths["phase_dir"] / f"step{current['step']}-prompt.md")
    prompt_path.write_text(prompt, encoding="utf-8")

    write_json(paths["phase_index"], phase_index)
    write_json(paths["top_index"], top_index)
    write_step_output(
        paths,
        current["step"],
        {
            "step": current["step"],
            "name": current["name"],
            "status": "prepared",
            "prepared_at": stamp(),
            "branch": branch_name,
            "prompt_file": str(prompt_path),
        },
    )

    print(
        json.dumps(
            {
                "phase": phase_dir,
                "step": current["step"],
                "prompt_file": str(prompt_path),
                "branch": branch_name,
            },
            ensure_ascii=False,
        )
    )
    return 0


def sync_recorded_completion(root: Path, phase_dir: str, step_number: int) -> None:
    paths = ensure_phase_exists(root, phase_dir)
    phase_index = load_json(paths["phase_index"])
    top_index = load_json(paths["top_index"])
    step = lookup_step(phase_index, step_number)
    if step.get("status") != "completed":
        raise RuntimeError(f"Step {step_number} is not marked completed.")

    clear_step_transient_fields(step)
    step.setdefault("completed_at", stamp())
    current = active_step(phase_index)
    if current is not None and current["step"] != step_number:
        set_top_phase_status(top_index, phase_dir, status="in_progress", current_step=current["step"])
    elif phase_index.get("status") == "completed":
        set_top_phase_status(top_index, phase_dir, status="completed", current_step=None)
    else:
        next_step = first_pending_step(phase_index)
        if next_step is None:
            phase_index["status"] = "completed"
            phase_index["completed_at"] = phase_index.get("completed_at", stamp())
            phase_index.pop("current_step", None)
            set_top_phase_status(top_index, phase_dir, status="completed", current_step=None)
        else:
            next_step["status"] = "in_progress"
            next_step.setdefault("started_at", stamp())
            phase_index["status"] = "in_progress"
            phase_index["current_step"] = next_step["step"]
            set_top_phase_status(top_index, phase_dir, status="in_progress", current_step=next_step["step"])

    write_json(paths["phase_index"], phase_index)
    write_json(paths["top_index"], top_index)
    write_step_output(
        paths,
        step_number,
        {
            "step": step_number,
            "name": step["name"],
            "status": "completed",
            "summary": step["summary"],
            "completed_at": step["completed_at"],
        },
    )


def sync_recorded_block(root: Path, phase_dir: str, step_number: int) -> None:
    paths = ensure_phase_exists(root, phase_dir)
    phase_index = load_json(paths["phase_index"])
    top_index = load_json(paths["top_index"])
    step = lookup_step(phase_index, step_number)
    if step.get("status") != "blocked":
        raise RuntimeError(f"Step {step_number} is not marked blocked.")

    step.setdefault("blocked_at", stamp())
    phase_index["status"] = "blocked"
    phase_index["current_step"] = step_number
    set_top_phase_status(top_index, phase_dir, status="blocked", current_step=step_number)

    write_json(paths["phase_index"], phase_index)
    write_json(paths["top_index"], top_index)
    write_step_output(
        paths,
        step_number,
        {
            "step": step_number,
            "name": step["name"],
            "status": "blocked",
            "blocked_reason": step["blocked_reason"],
            "blocked_at": step["blocked_at"],
        },
    )


def sync_recorded_error(root: Path, phase_dir: str, step_number: int) -> None:
    paths = ensure_phase_exists(root, phase_dir)
    phase_index = load_json(paths["phase_index"])
    top_index = load_json(paths["top_index"])
    step = lookup_step(phase_index, step_number)
    if step.get("status") != "error":
        raise RuntimeError(f"Step {step_number} is not marked error.")

    step.setdefault("failed_at", stamp())
    phase_index["status"] = "error"
    phase_index["current_step"] = step_number
    set_top_phase_status(top_index, phase_dir, status="error", current_step=step_number)

    write_json(paths["phase_index"], phase_index)
    write_json(paths["top_index"], top_index)
    write_step_output(
        paths,
        step_number,
        {
            "step": step_number,
            "name": step["name"],
            "status": "error",
            "error_message": step["error_message"],
            "failed_at": step["failed_at"],
        },
    )


def reset_step_for_retry(root: Path, phase_dir: str, step_number: int) -> None:
    paths = ensure_phase_exists(root, phase_dir)
    phase_index = load_json(paths["phase_index"])
    top_index = load_json(paths["top_index"])
    target = lookup_step(phase_index, step_number)

    target["status"] = "in_progress"
    target.setdefault("started_at", stamp())
    for key in [
        "summary",
        "completed_at",
        "blocked_reason",
        "blocked_at",
        "error_message",
        "failed_at",
    ]:
        target.pop(key, None)

    phase_index["status"] = "in_progress"
    phase_index["current_step"] = step_number
    set_top_phase_status(top_index, phase_dir, status="in_progress", current_step=step_number)

    write_json(paths["phase_index"], phase_index)
    write_json(paths["top_index"], top_index)


def command_run(
    root: Path,
    phase_dir: str,
    branch_prefix: str,
    model: str | None,
    profile: str | None,
    max_steps: int | None,
    auto_push: bool,
) -> int:
    paths = ensure_phase_exists(root, phase_dir)
    phase_index = load_json(paths["phase_index"])
    if phase_index.get("status") == "blocked":
        current = phase_index.get("current_step")
        step = lookup_step(phase_index, current) if isinstance(current, int) else None
        reason = step.get("blocked_reason", "unknown") if step else "unknown"
        raise RuntimeError(f"Phase '{phase_dir}' is blocked. Resolve and reset it first. Reason: {reason}")
    if phase_index.get("status") == "error":
        current = phase_index.get("current_step")
        step = lookup_step(phase_index, current) if isinstance(current, int) else None
        message = step.get("error_message", "unknown") if step else "unknown"
        raise RuntimeError(f"Phase '{phase_dir}' is in error state. Reset it first. Error: {message}")

    steps_run = 0

    while True:
        paths = ensure_phase_exists(root, phase_dir)
        phase_index = load_json(paths["phase_index"])
        phase_name = phase_index["phase"]
        branch_name = f"{branch_prefix}{phase_name}"

        if phase_index.get("status") == "completed":
            finalize_phase(root, phase_name, branch_name, auto_push and steps_run > 0)
            print(f"Phase '{phase_dir}' completed after {steps_run} step(s).")
            return 0
        if max_steps is not None and steps_run >= max_steps:
            print(f"Stopped after {steps_run} step(s) because --max-steps was reached.")
            return 0

        current = active_step(phase_index) or first_pending_step(phase_index)
        if current is None:
            print(f"Phase '{phase_dir}' has no runnable steps.")
            return 0

        command_prepare(root, phase_dir, branch_prefix, None)
        paths = ensure_phase_exists(root, phase_dir)
        phase_index = load_json(paths["phase_index"])
        current = active_step(phase_index)
        if current is None:
            raise RuntimeError(f"Phase '{phase_dir}' has no in-progress step after prepare.")

        step_number = current["step"]
        step_name = current["name"]
        prompt_path = paths["phase_dir"] / f"step{step_number}-prompt.md"
        result_path = step_result_path(paths, step_number)
        prev_error: str | None = None

        for attempt in range(1, MAX_RETRIES + 1):
            phase_index = load_json(paths["phase_index"])
            current = lookup_step(phase_index, step_number)
            prompt_text = build_prompt(root, phase_dir, phase_index, current, branch_name, prev_error=prev_error)
            prompt_path.write_text(prompt_text, encoding="utf-8")

            with tempfile.TemporaryDirectory() as tmp_dir:
                tmp_root = Path(tmp_dir)
                schema_path = tmp_root / "codex-output-schema.json"
                output_path = tmp_root / "codex-last-message.json"
                build_output_schema_file(schema_path)
                tag = f"Step {step_number}: {step_name}"
                if attempt > 1:
                    tag += f" [retry {attempt}/{MAX_RETRIES}]"
                with progress_indicator(tag):
                    payload = run_codex_for_step(
                        root=root,
                        prompt=build_automation_prompt(prompt_text),
                        output_path=output_path,
                        schema_path=schema_path,
                        model=model,
                        profile=profile,
                    )

            write_json(result_path, payload)
            refreshed_phase = load_json(paths["phase_index"])
            refreshed_step = lookup_step(refreshed_phase, step_number)
            recorded_status = refreshed_step.get("status")

            if recorded_status == "completed":
                sync_recorded_completion(root, phase_dir, step_number)
                commit_step(root, phase_dir, phase_name, step_number, step_name)
                steps_run += 1
                break

            if recorded_status == "blocked":
                sync_recorded_block(root, phase_dir, step_number)
                commit_step(root, phase_dir, phase_name, step_number, step_name)
                print(f"Phase '{phase_dir}' blocked at step {step_number}: {refreshed_step['blocked_reason']}")
                return 1

            if recorded_status == "error":
                error_message = refreshed_step.get("error_message", payload["summary"]).strip()
                if attempt < MAX_RETRIES:
                    reset_step_for_retry(root, phase_dir, step_number)
                    prev_error = error_message
                    print(f"Retrying step {step_number} after recorded error: {error_message}")
                    continue
                sync_recorded_error(root, phase_dir, step_number)
                commit_step(root, phase_dir, phase_name, step_number, step_name)
                print(f"Phase '{phase_dir}' failed at step {step_number}: {error_message}")
                return 1

            summary = payload["summary"].strip()
            if payload["status"] == "completed":
                command_complete(root, phase_dir, summary)
                commit_step(root, phase_dir, phase_name, step_number, step_name)
                steps_run += 1
                break

            if payload["status"] == "blocked":
                command_block(root, phase_dir, summary)
                commit_step(root, phase_dir, phase_name, step_number, step_name)
                print(f"Phase '{phase_dir}' blocked at step {step_number}: {summary}")
                return 1

            error_message = payload["details"].strip() or summary or "Step did not update status."
            if attempt < MAX_RETRIES:
                reset_step_for_retry(root, phase_dir, step_number)
                prev_error = error_message
                print(f"Retrying step {step_number} after failed attempt: {error_message}")
                continue

            reset_step_for_retry(root, phase_dir, step_number)
            command_error(root, phase_dir, f"[after {MAX_RETRIES} attempts] {error_message}")
            commit_step(root, phase_dir, phase_name, step_number, step_name)
            print(f"Phase '{phase_dir}' failed at step {step_number}: {error_message}")
            return 1


def command_complete(root: Path, phase_dir: str, summary: str) -> int:
    paths = ensure_phase_exists(root, phase_dir)
    phase_index = load_json(paths["phase_index"])
    top_index = load_json(paths["top_index"])
    current = active_step(phase_index)
    if current is None:
        raise RuntimeError(f"Phase '{phase_dir}' has no in-progress step to complete.")

    clear_step_transient_fields(current)
    current["status"] = "completed"
    current["summary"] = summary.strip()
    current["completed_at"] = stamp()

    next_step = first_pending_step(phase_index)
    if next_step is None:
        phase_index["status"] = "completed"
        phase_index["completed_at"] = stamp()
        phase_index.pop("current_step", None)
        set_top_phase_status(top_index, phase_dir, status="completed", current_step=None)
    else:
        next_step["status"] = "in_progress"
        next_step.setdefault("started_at", stamp())
        phase_index["status"] = "in_progress"
        phase_index["current_step"] = next_step["step"]
        set_top_phase_status(top_index, phase_dir, status="in_progress", current_step=next_step["step"])

    write_json(paths["phase_index"], phase_index)
    write_json(paths["top_index"], top_index)
    write_step_output(
        paths,
        current["step"],
        {
            "step": current["step"],
            "name": current["name"],
            "status": "completed",
            "summary": current["summary"],
            "completed_at": current["completed_at"],
        },
    )
    return 0


def command_block(root: Path, phase_dir: str, reason: str) -> int:
    paths = ensure_phase_exists(root, phase_dir)
    phase_index = load_json(paths["phase_index"])
    top_index = load_json(paths["top_index"])
    current = active_step(phase_index)
    if current is None:
        raise RuntimeError(f"Phase '{phase_dir}' has no in-progress step to block.")

    current["status"] = "blocked"
    current["blocked_reason"] = reason.strip()
    current["blocked_at"] = stamp()
    phase_index["status"] = "blocked"
    phase_index["current_step"] = current["step"]
    set_top_phase_status(top_index, phase_dir, status="blocked", current_step=current["step"])

    write_json(paths["phase_index"], phase_index)
    write_json(paths["top_index"], top_index)
    write_step_output(
        paths,
        current["step"],
        {
            "step": current["step"],
            "name": current["name"],
            "status": "blocked",
            "blocked_reason": current["blocked_reason"],
            "blocked_at": current["blocked_at"],
        },
    )
    return 0


def command_error(root: Path, phase_dir: str, message: str) -> int:
    paths = ensure_phase_exists(root, phase_dir)
    phase_index = load_json(paths["phase_index"])
    top_index = load_json(paths["top_index"])
    current = active_step(phase_index)
    if current is None:
        raise RuntimeError(f"Phase '{phase_dir}' has no in-progress step to mark as error.")

    current["status"] = "error"
    current["error_message"] = message.strip()
    current["failed_at"] = stamp()
    phase_index["status"] = "error"
    phase_index["current_step"] = current["step"]
    set_top_phase_status(top_index, phase_dir, status="error", current_step=current["step"])

    write_json(paths["phase_index"], phase_index)
    write_json(paths["top_index"], top_index)
    write_step_output(
        paths,
        current["step"],
        {
            "step": current["step"],
            "name": current["name"],
            "status": "error",
            "error_message": current["error_message"],
            "failed_at": current["failed_at"],
        },
    )
    return 0


def command_reset(root: Path, phase_dir: str, step_number: int) -> int:
    paths = ensure_phase_exists(root, phase_dir)
    phase_index = load_json(paths["phase_index"])
    top_index = load_json(paths["top_index"])

    target = None
    for step in phase_index["steps"]:
        if step["step"] == step_number:
            target = step
        elif step.get("status") == "in_progress":
            step["status"] = "pending"
            step.pop("started_at", None)
    if target is None:
        raise RuntimeError(f"Step {step_number} not found in phase '{phase_dir}'.")

    target["status"] = "pending"
    for key in [
        "summary",
        "completed_at",
        "blocked_reason",
        "blocked_at",
        "error_message",
        "failed_at",
        "started_at",
    ]:
        target.pop(key, None)

    phase_index["status"] = "pending"
    phase_index.pop("current_step", None)
    set_top_phase_status(top_index, phase_dir, status="pending", current_step=None)

    write_json(paths["phase_index"], phase_index)
    write_json(paths["top_index"], top_index)
    return 0


def command_status(root: Path, phase_dir: str) -> int:
    paths = ensure_phase_exists(root, phase_dir)
    phase_index = load_json(paths["phase_index"])

    print(f"Phase: {phase_index['phase']}")
    print(f"Status: {phase_index.get('status')}")
    print(f"Current step: {phase_index.get('current_step')}")
    for step in phase_index["steps"]:
        marker = "->" if step.get("status") == "in_progress" else "  "
        line = f"{marker} step {step['step']}: {step['name']} [{step.get('status')}]"
        if step.get("summary"):
            line += f" | {step['summary']}"
        if step.get("blocked_reason"):
            line += f" | blocked: {step['blocked_reason']}"
        if step.get("error_message"):
            line += f" | error: {step['error_message']}"
        print(line)
    return 0


def command_validate(root: Path, phase_dir: str | None) -> int:
    errors = validate_phase(root, phase_dir)
    if errors:
        for error in errors:
            print(f"ERROR: {error}", file=sys.stderr)
        return 1
    if phase_dir is None:
        print("OK: phase metadata is consistent.")
    else:
        print(f"OK: phase '{phase_dir}' metadata is consistent.")
    return 0


def parse_args(argv: list[str]) -> argparse.Namespace:
    known_commands = {"prepare", "run", "complete", "block", "error", "reset", "status", "validate"}
    normalized_argv = list(argv)
    if normalized_argv and normalized_argv[0] not in known_commands and not normalized_argv[0].startswith("-"):
        normalized_argv.insert(0, "run")

    parser = argparse.ArgumentParser(description="Codex-native phase executor.")
    parser.add_argument("--root", default=str(repo_root_from_script(__file__)), help="Repository root.")
    subparsers = parser.add_subparsers(dest="command", required=True)

    prepare = subparsers.add_parser("prepare", help="Prepare the active or next pending step.")
    prepare.add_argument("phase_dir")
    prepare.add_argument("--branch-prefix", default="feat-")
    prepare.add_argument("--output", type=Path)

    run = subparsers.add_parser("run", help="Run steps headlessly with codex exec until completion or blockage.")
    run.add_argument("phase_dir")
    run.add_argument("--branch-prefix", default="feat-")
    run.add_argument("--model")
    run.add_argument("--profile")
    run.add_argument("--max-steps", type=int)
    run.add_argument("--push", action="store_true", help="Push the feature branch after phase completion.")

    complete = subparsers.add_parser("complete", help="Complete the current step and advance.")
    complete.add_argument("phase_dir")
    complete.add_argument("--summary", required=True)

    blocked = subparsers.add_parser("block", help="Mark the current step as blocked.")
    blocked.add_argument("phase_dir")
    blocked.add_argument("--reason", required=True)

    error = subparsers.add_parser("error", help="Mark the current step as failed.")
    error.add_argument("phase_dir")
    error.add_argument("--message", required=True)

    reset = subparsers.add_parser("reset", help="Reset a step to pending.")
    reset.add_argument("phase_dir")
    reset.add_argument("--step", type=int, required=True)

    status = subparsers.add_parser("status", help="Show phase status.")
    status.add_argument("phase_dir")

    validate = subparsers.add_parser("validate", help="Validate phase metadata.")
    validate.add_argument("phase_dir", nargs="?")

    return parser.parse_args(normalized_argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    root = Path(args.root).resolve()

    try:
        if args.command == "prepare":
            return command_prepare(root, args.phase_dir, args.branch_prefix, args.output)
        if args.command == "run":
            return command_run(root, args.phase_dir, args.branch_prefix, args.model, args.profile, args.max_steps, args.push)
        if args.command == "complete":
            return command_complete(root, args.phase_dir, args.summary)
        if args.command == "block":
            return command_block(root, args.phase_dir, args.reason)
        if args.command == "error":
            return command_error(root, args.phase_dir, args.message)
        if args.command == "reset":
            return command_reset(root, args.phase_dir, args.step)
        if args.command == "status":
            return command_status(root, args.phase_dir)
        if args.command == "validate":
            return command_validate(root, args.phase_dir)
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
