---
name: seleccase-harness
description: Use for planning, phasing, or implementing work in this repository when the request mentions harness, roadmap, phases, PRD, architecture, docs-first work, warehouse inventory redesign, sourcing factory flows, store connections, Codex hooks, or Codex planning setup. Codex adaptation of the original Harness workflow: read AGENTS.md, docs, hooks, DESIGN_SYSTEM.md, and phase files first; treat execute_codex.py as the primary headless phase executor and use its helper subcommands only for inspection, recovery, or explicit manual control.
---

# Seleccase Harness

Use this skill when the user wants structured planning or phased execution in this repository.

## Read First
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/.codex/config.toml`
- `/Users/yeol-mac/Development/seleccase-inventory/.codex/hooks.json`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ADR.md`
- `/Users/yeol-mac/Development/seleccase-inventory/DESIGN_SYSTEM.md`
- `/Users/yeol-mac/Development/seleccase-inventory/phases/index.json`

## Bundled Scripts
- Skill directory:
  `/Users/yeol-mac/Development/seleccase-inventory/.agents/skills/seleccase-harness`
- Primary runtime file:
  `/Users/yeol-mac/Development/seleccase-inventory/.agents/skills/seleccase-harness/scripts/execute_codex.py`
- Shared runtime helper file:
  `/Users/yeol-mac/Development/seleccase-inventory/.agents/skills/seleccase-harness/scripts/phase_runtime.py`
- Regression test file:
  `/Users/yeol-mac/Development/seleccase-inventory/.agents/skills/seleccase-harness/scripts/test_execute_codex.py`

## Python Script Paths
- Run every harness script from the repository root:
  `/Users/yeol-mac/Development/seleccase-inventory`
- Preferred command form from the repository root:
  `python3 .agents/skills/seleccase-harness/scripts/execute_codex.py ...`
- Equivalent absolute command form:
  `python3 /Users/yeol-mac/Development/seleccase-inventory/.agents/skills/seleccase-harness/scripts/execute_codex.py ...`

## Workflow

### A. Explore
- Read `docs/`, `AGENTS.md`, `DESIGN_SYSTEM.md`, `.codex/config.toml`, `.codex/hooks.json`, and the active phase files first.
- Treat the docs and phase files as the planning contract before touching application code.

### B. Discuss
- If implementation requires unresolved product or technical decisions, surface them before changing the phase plan.

### C. Step Design
- When the user asks for a plan, draft multiple small steps and get approval before implementation.
- Step design rules:
  1. Scope should stay narrow. One step should handle one layer or one coherent module.
  2. Each `stepN.md` must be self-contained for a fresh Codex session.
  3. List the docs and concrete file paths the step depends on.
  4. Give interface-level guidance and hard guardrails, not line-by-line implementation unless necessary.
  5. Acceptance criteria must be runnable shell commands.
  6. Use explicit "do not do X. Reason: Y" guardrails instead of vague warnings.
  7. Step names must be kebab-case slugs.

### D. File Creation
- Create or update:
  - `phases/index.json`
  - `phases/<phase-name>/index.json`
  - `phases/<phase-name>/step{N}.md`
- Status fields use:
  - `pending`
  - `in_progress`
  - `completed`
  - `blocked`
  - `error`
- `started_at`, `completed_at`, `failed_at`, and `blocked_at` are executor-managed timestamps.
- `summary`, `blocked_reason`, and `error_message` are step outcome fields and must stay concise and concrete.

### E. Execute
- Primary execution path:
  `python3 .agents/skills/seleccase-harness/scripts/execute_codex.py <phase-dir>`
- Explicit equivalent:
  `python3 .agents/skills/seleccase-harness/scripts/execute_codex.py run <phase-dir>`
- Optional push after phase completion:
  `python3 .agents/skills/seleccase-harness/scripts/execute_codex.py <phase-dir> --push`

`execute_codex.py run` is the Codex equivalent of the original Claude harness executor. It automatically:
- validates the phase contract
- resolves the next runnable step
- checks out or creates `feat-<phase>`
- generates the step prompt with guardrails and completed-step context
- invokes `codex exec` headlessly for the step
- retries up to 3 times with the previous error fed back into the next prompt
- records structured output to `stepN-codex-result.json`
- advances phase metadata through `complete`, `block`, or `error`
- creates step commits plus metadata commits
- optionally pushes the feature branch

## Helper Commands
- Use these when you need inspection, debugging, recovery, or explicit manual control:
  - `python3 .agents/skills/seleccase-harness/scripts/execute_codex.py prepare <phase-dir>`
  - `python3 .agents/skills/seleccase-harness/scripts/execute_codex.py status <phase-dir>`
  - `python3 .agents/skills/seleccase-harness/scripts/execute_codex.py validate [<phase-dir>]`
  - `python3 .agents/skills/seleccase-harness/scripts/execute_codex.py complete <phase-dir> --summary "..."`
  - `python3 .agents/skills/seleccase-harness/scripts/execute_codex.py block <phase-dir> --reason "..."`
  - `python3 .agents/skills/seleccase-harness/scripts/execute_codex.py error <phase-dir> --message "..."`
  - `python3 .agents/skills/seleccase-harness/scripts/execute_codex.py reset <phase-dir> --step N`
- These commands support the main executor; they are not the default harness path when the user asks to execute a phase.

## Codex-Specific Execution Notes
- The headless Codex session should update the current step outcome before it exits by running the helper command for `complete`, `block`, or `error`.
- The executor also captures the final structured Codex message as a debug artifact.
- `stepN.md` should still be authored as if it will run in a fresh isolated Codex session.

## Phase Contract
- `phases/index.json` is the root registry and should stay synchronized with per-phase indexes.
- Only one phase should be `in_progress` at a time.
- `phases/<phase-name>/index.json` must contain:
  - `project`
  - `phase`
  - `status`
  - `steps`
- Each step entry must contain:
  - `step`
  - `name`
  - `status`
- Completed steps require `summary`.
- Blocked steps require `blocked_reason`.
- Error steps require `error_message`.
- `step{n}.md` is the canonical step file path unless the phase index explicitly changes that rule.

## Step Authoring Rules
- Keep each step self-contained.
- Include earlier generated files when they matter for the current step.
- Prefer test updates before or alongside implementation.
- Write acceptance criteria as runnable commands.
- Make verification explicit about how success, blockage, or failure should be recorded.

## Guardrails
- Preserve analytics and shipping flows unless the user explicitly broadens scope.
- Treat `inventory` and `transactions` as the canonical stock ledger.
- Treat `재고 운영` as one warehouse operations hub, not several first-level destinations.
- Only use expandable navigation for categories with 2 or more child screens.
- Keep `운송장` and `분석` as direct items unless the codebase actually grows meaningful child screens.
- Treat Naver and Coupang as `스토어 연결` in IA, while reusing existing shipping credentials and actions for MVP.
- Keep `기준 데이터` out of top-level IA unless the user explicitly wants it promoted again.
- Prefer quick multi-item manual entry plus CSV, not single-item-only forms.
- Extend shared UI primitives before adding page-local styling.
- Prefer the smallest viable schema and UI change that satisfies the step.

## Acceptance Baseline
Unless the user says otherwise, every implementation step should validate with:

```bash
npm run lint
npm run build
npm run test
python3 .agents/skills/seleccase-harness/scripts/execute_codex.py validate <phase-name>
```

## Error Recovery
- If a step ends in `error`, resolve the issue and run:
  `python3 .agents/skills/seleccase-harness/scripts/execute_codex.py reset <phase-dir> --step N`
- If a step ends in `blocked`, resolve the blocker and reset the same step to `pending`.
- After reset, rerun the primary executor command for the phase.

## Runtime Regression Test
When editing the harness runtime itself, run:

```bash
python3 .agents/skills/seleccase-harness/scripts/test_execute_codex.py
```
