#!/usr/bin/env python3
"""Codex-native review context builder for the seleccase review skill."""

from __future__ import annotations

import argparse
import json
import subprocess
import sys
from pathlib import Path
from typing import Any


VALIDATION_SCRIPT = ".agents/skills/seleccase-harness/scripts/execute_codex.py"


def repo_root_from_script(script_path: str | Path) -> Path:
    return Path(script_path).resolve().parents[4]


def run_git(root: Path, *args: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(["git", *args], cwd=root, capture_output=True, text=True)


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def resolve_active_phase(root: Path, requested_phase: str | None) -> tuple[dict[str, Any], dict[str, Any], Path]:
    top_index = load_json(root / "phases" / "index.json")
    phases = top_index.get("phases", [])
    if requested_phase:
        selected = next((entry for entry in phases if entry.get("dir") == requested_phase), None)
    else:
        selected = next((entry for entry in phases if entry.get("status") == "in_progress"), None)
        if selected is None and phases:
            selected = phases[0]
    if selected is None:
        raise RuntimeError("No phase entry could be resolved.")

    phase_dir = root / "phases" / selected["dir"]
    phase_index = load_json(phase_dir / "index.json")
    return selected, phase_index, phase_dir


def resolve_current_step(phase_index: dict[str, Any], phase_dir: Path) -> dict[str, Any] | None:
    for step in phase_index.get("steps", []):
        if step.get("status") == "in_progress":
            resolved = dict(step)
            resolved["file"] = str(phase_dir / f"step{step['step']}.md")
            return resolved
    current_step = phase_index.get("current_step")
    if isinstance(current_step, int):
        step = next((item for item in phase_index.get("steps", []) if item.get("step") == current_step), None)
        if step:
            resolved = dict(step)
            resolved["file"] = str(phase_dir / f"step{step['step']}.md")
            return resolved
    return None


def changed_files(root: Path, base_ref: str | None) -> list[str]:
    if base_ref:
        diff = run_git(root, "diff", "--name-only", base_ref, "--")
    else:
        diff = run_git(root, "diff", "--name-only", "--")
    if diff.returncode != 0:
        raise RuntimeError(diff.stderr.strip() or "git diff failed")

    files = [line.strip() for line in diff.stdout.splitlines() if line.strip()]
    status = run_git(root, "status", "--porcelain")
    if status.returncode == 0:
        for line in status.stdout.splitlines():
            path = line[3:].strip()
            if path and path not in files:
                files.append(path)
    return files


def phase_validation(root: Path, phase_dir: str) -> tuple[bool, str]:
    result = subprocess.run(
        ["python3", VALIDATION_SCRIPT, "validate", phase_dir],
        cwd=root,
        capture_output=True,
        text=True,
    )
    output = result.stdout.strip() or result.stderr.strip()
    return result.returncode == 0, output


def build_markdown(selected: dict[str, Any], phase_index: dict[str, Any], current_step: dict[str, Any] | None, files: list[str], validation: tuple[bool, str]) -> str:
    lines = [
        "# Codex Review Context",
        "",
        f"- Phase: `{selected['dir']}`",
        f"- Phase status: `{phase_index.get('status')}`",
        f"- Root current_step: `{selected.get('current_step')}`",
        f"- Phase current_step: `{phase_index.get('current_step')}`",
    ]
    if current_step:
        lines.extend(
            [
                f"- Active step: `{current_step['step']}` `{current_step['name']}`",
                f"- Active step status: `{current_step.get('status')}`",
                f"- Active step file: `{current_step['file']}`",
            ]
        )
    lines.extend(["", "## Changed Files", ""])
    if files:
        lines.extend([f"- `{path}`" for path in files])
    else:
        lines.append("- No changed files detected.")

    lines.extend(
        [
            "",
            "## Checks",
            "",
            f"- Phase metadata validation: {'PASS' if validation[0] else 'FAIL'}",
            f"- Validation output: {validation[1] or 'no output'}",
            "- Review against AGENTS.md, docs/ARCHITECTURE.md, docs/ADR.md, docs/UI_GUIDE.md, and the active step file.",
            "- Findings should be emitted first with absolute file paths and tight ranges.",
        ]
    )
    return "\n".join(lines) + "\n"


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build Codex-native review context.")
    parser.add_argument("--root", default=str(repo_root_from_script(__file__)), help="Repository root.")
    parser.add_argument("--phase", help="Specific phase directory.")
    parser.add_argument("--base", help="Optional git base ref for changed file discovery.")
    parser.add_argument("--format", choices=["markdown", "json"], default="markdown")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    root = Path(args.root).resolve()
    try:
        selected, phase_index, phase_dir = resolve_active_phase(root, args.phase)
        current_step = resolve_current_step(phase_index, phase_dir)
        files = changed_files(root, args.base)
        validation = phase_validation(root, selected["dir"])
        payload = {
            "phase": selected["dir"],
            "phase_status": phase_index.get("status"),
            "root_current_step": selected.get("current_step"),
            "phase_current_step": phase_index.get("current_step"),
            "active_step": current_step,
            "changed_files": files,
            "phase_validation_ok": validation[0],
            "phase_validation_output": validation[1],
        }
        if args.format == "json":
            print(json.dumps(payload, indent=2, ensure_ascii=False))
        else:
            print(build_markdown(selected, phase_index, current_step, files, validation))
        return 0
    except RuntimeError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
