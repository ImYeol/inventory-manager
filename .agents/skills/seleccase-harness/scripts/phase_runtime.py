#!/usr/bin/env python3
"""Shared phase runtime helpers for the seleccase Codex harness."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

VALID_STATUS = {"pending", "in_progress", "completed", "blocked", "error"}
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


def load_guardrails(root: Path) -> str:
    sections: list[str] = []

    for rel_path, title in [
        ("AGENTS.md", "AGENTS"),
        ("DESIGN_SYSTEM.md", "DESIGN_SYSTEM"),
        (".codex/config.toml", ".codex/config.toml"),
    ]:
        target = root / rel_path
        if target.exists():
            sections.append(f"## {title}\n\n{target.read_text(encoding='utf-8')}")

    docs_dir = root / "docs"
    if docs_dir.is_dir():
        for doc in sorted(docs_dir.glob("*.md")):
            sections.append(f"## docs/{doc.name}\n\n{doc.read_text(encoding='utf-8')}")

    hooks_path = root / ".codex" / "hooks.json"
    if hooks_path.exists():
        sections.append(f"## .codex/hooks.json\n\n{hooks_path.read_text(encoding='utf-8')}")

    return "\n\n---\n\n".join(sections)


def build_step_context(phase_index: dict[str, Any]) -> str:
    lines = [
        f"- Step {step['step']} ({step['name']}): {step['summary']}"
        for step in phase_index.get("steps", [])
        if step.get("status") == "completed" and step.get("summary")
    ]
    if not lines:
        return ""
    return "## Completed Step Summaries\n\n" + "\n".join(lines) + "\n"


def active_step(phase_index: dict[str, Any]) -> dict[str, Any] | None:
    for step in phase_index.get("steps", []):
        if step.get("status") == "in_progress":
            return step
    return None


def first_pending_step(phase_index: dict[str, Any]) -> dict[str, Any] | None:
    for step in phase_index.get("steps", []):
        if step.get("status") == "pending":
            return step
    return None


def step_file_for(phase_dir: Path, step_number: int) -> Path:
    return phase_dir / f"step{step_number}.md"


def set_top_phase_status(top_index: dict[str, Any], phase_dir: str, *, status: str, current_step: int | None = None) -> None:
    for item in top_index.get("phases", []):
        if item.get("dir") != phase_dir:
            continue
        item["status"] = status
        if current_step is None:
            item.pop("current_step", None)
        else:
            item["current_step"] = current_step
        if status == "completed":
            item["completed_at"] = stamp()
        elif status == "blocked":
            item["blocked_at"] = stamp()
        elif status == "error":
            item["failed_at"] = stamp()
        return
    raise ValueError(f"Phase '{phase_dir}' not found in top index.")


def validate_phase(root: Path, phase_dir: str | None = None) -> list[str]:
    errors: list[str] = []
    top_index_path = root / "phases" / "index.json"
    if not top_index_path.is_file():
        return [f"Missing phases index at {top_index_path}."]

    top_index = load_json(top_index_path)
    phases = top_index.get("phases")
    if not isinstance(phases, list) or not phases:
        return ["phases/index.json must include a non-empty phases array."]

    seen_dirs: set[str] = set()
    in_progress_phases = 0
    for entry in phases:
        dir_name = entry.get("dir")
        status = entry.get("status")
        if not isinstance(dir_name, str) or not dir_name:
            errors.append("Every phase entry must include a non-empty dir.")
            continue
        if dir_name in seen_dirs:
            errors.append(f"Duplicate phase dir '{dir_name}' in phases/index.json.")
        seen_dirs.add(dir_name)
        if status not in VALID_STATUS:
            errors.append(f"Phase '{dir_name}' has invalid status '{status}'.")
        if status == "in_progress":
            in_progress_phases += 1

    if in_progress_phases > 1:
        errors.append(f"Only one phase may be in_progress, found {in_progress_phases}.")

    selected = phases
    if phase_dir is not None:
        selected = [entry for entry in phases if entry.get("dir") == phase_dir]
        if len(selected) != 1:
            errors.append(f"Phase '{phase_dir}' was not found in phases/index.json.")
            return errors

    for entry in selected:
        dir_name = entry["dir"]
        phase_dir_path = root / "phases" / dir_name
        phase_index_path = phase_dir_path / "index.json"
        if not phase_index_path.is_file():
            errors.append(f"Phase index '{phase_index_path}' does not exist.")
            continue

        phase_index = load_json(phase_index_path)
        steps = phase_index.get("steps")
        if phase_index.get("phase") != dir_name:
            errors.append(f"Phase '{dir_name}' index.json phase field must match the directory name.")
        if not isinstance(phase_index.get("project"), str) or not phase_index["project"]:
            errors.append(f"Phase '{dir_name}' index.json must include project.")
        if phase_index.get("status") not in VALID_STATUS:
            errors.append(f"Phase '{dir_name}' index.json has invalid status '{phase_index.get('status')}'.")
        if phase_index.get("status") != entry.get("status"):
            errors.append(
                f"Phase '{dir_name}' root status '{entry.get('status')}' does not match phase index status '{phase_index.get('status')}'."
            )
        if not isinstance(steps, list) or not steps:
            errors.append(f"Phase '{dir_name}' must define a non-empty steps array.")
            continue

        in_progress_steps: list[int] = []
        for expected, step in enumerate(steps):
            if step.get("step") != expected:
                errors.append(f"Phase '{dir_name}' step index {expected} must use step number {expected}.")
            if not isinstance(step.get("name"), str) or not step["name"]:
                errors.append(f"Phase '{dir_name}' step {expected} must include a non-empty name.")
            if step.get("status") not in VALID_STATUS:
                errors.append(f"Phase '{dir_name}' step {expected} has invalid status '{step.get('status')}'.")
            if not step_file_for(phase_dir_path, expected).is_file():
                errors.append(f"Phase '{dir_name}' is missing step file 'step{expected}.md'.")
            if step.get("status") == "completed" and not str(step.get("summary", "")).strip():
                errors.append(f"Phase '{dir_name}' completed step {expected} must include a non-empty summary.")
            if step.get("status") == "blocked" and not str(step.get("blocked_reason", "")).strip():
                errors.append(f"Phase '{dir_name}' blocked step {expected} must include blocked_reason.")
            if step.get("status") == "error" and not str(step.get("error_message", "")).strip():
                errors.append(f"Phase '{dir_name}' error step {expected} must include error_message.")
            if step.get("status") == "in_progress":
                in_progress_steps.append(expected)

        if len(in_progress_steps) > 1:
            errors.append(f"Phase '{dir_name}' must have at most one in-progress step, found {len(in_progress_steps)}.")
        phase_status = phase_index.get("status")
        if phase_status == "in_progress" and len(in_progress_steps) != 1:
            errors.append(f"Phase '{dir_name}' is in_progress but does not have exactly one in-progress step.")
        if phase_status in {"completed", "blocked", "error"} and in_progress_steps:
            errors.append(f"Phase '{dir_name}' is '{phase_status}' but still has an in-progress step.")
        current_step = phase_index.get("current_step")
        if current_step is not None and not isinstance(current_step, int):
            errors.append(f"Phase '{dir_name}' current_step must be an integer.")
        if isinstance(current_step, int):
            if not 0 <= current_step < len(steps):
                errors.append(f"Phase '{dir_name}' current_step {current_step} is out of range.")
            root_step = entry.get("current_step")
            if root_step != current_step:
                errors.append(f"Phase '{dir_name}' current_step differs between root and phase index.")
            if in_progress_steps and current_step != in_progress_steps[0]:
                errors.append(
                    f"Phase '{dir_name}' current_step {current_step} does not match in-progress step {in_progress_steps[0]}."
                )

    return errors
