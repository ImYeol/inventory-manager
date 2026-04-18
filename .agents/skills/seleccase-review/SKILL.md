---
name: seleccase-review
description: "Use when reviewing changes in this repository, especially for warehouse inventory, sourcing arrivals, store connections, analytics, shipping, navigation, hooks, or design system updates. Codex-native review workflow for this repo: use the bundled review_codex.py helper to resolve the active phase and step, collect changed files, validate phase metadata, and build review context before checking the diff against AGENTS.md, docs, DESIGN_SYSTEM.md, hooks, and the active phase step."
--- 

# Seleccase Review

Use this skill for repo-specific review passes.

## Bundled Scripts
- Skill directory:
  `/Users/yeol-mac/Development/seleccase-inventory/.agents/skills/seleccase-review`
- Primary helper file:
  `/Users/yeol-mac/Development/seleccase-inventory/.agents/skills/seleccase-review/scripts/review_codex.py`
- Regression test file:
  `/Users/yeol-mac/Development/seleccase-inventory/.agents/skills/seleccase-review/scripts/test_review_codex.py`

## Python Script Paths
- Run every review script from the repository root:
  `/Users/yeol-mac/Development/seleccase-inventory`
- The executable command path is explicit. Do not assume a root-level `scripts/review_codex.py` wrapper exists.
- Preferred command form from the repository root:
  `python3 .agents/skills/seleccase-review/scripts/review_codex.py ...`
- Equivalent absolute command form:
  `python3 /Users/yeol-mac/Development/seleccase-inventory/.agents/skills/seleccase-review/scripts/review_codex.py ...`

## Read First
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/.codex/config.toml`
- `/Users/yeol-mac/Development/seleccase-inventory/.codex/hooks.json`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ADR.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/DESIGN_SYSTEM.md`
- `/Users/yeol-mac/Development/seleccase-inventory/phases/index.json`
- The active phase index under `/Users/yeol-mac/Development/seleccase-inventory/phases/`
- The current `step*.md` file for the work being reviewed

## Review Workflow
1. Run `python3 .agents/skills/seleccase-review/scripts/review_codex.py` from the repository root to resolve the active phase, current step, changed files, and phase validation result.
2. Inspect the diff first.
3. Map the diff to the active phase and current step file.
4. Review both code changes and phase metadata consistency.
5. Run or verify the required validation commands when possible.
6. Emit findings first. Keep summaries brief.

## Review Checklist
1. Does the change preserve the shipping flow and analytics access?
2. Does the change keep `inventory` + `transactions` as the stock source of truth?
3. Does the IA keep `재고 운영` as a single workspace instead of splitting it again?
4. Does navigation only use expandable groups where there are multiple child screens?
5. Do `운송장` and `분석` remain direct items unless they truly earn subnavigation?
6. Does the plan support fast multi-item inbound/outbound entry instead of forcing repetitive single-item flows?
7. Are dialog and sheet patterns consistent across create, edit, and quick-entry actions?
8. Are mobile tap targets, font sizes, spacing, and table fallbacks explicitly accounted for?
9. Does `기준 데이터` stay demoted under settings or admin instead of reappearing as a top-level default?
10. Do Naver and Coupang changes align with the `스토어 연결` concept while reusing the current credential and action layers when possible?
11. Does new UI reuse shared tokens and primitives instead of one-off styles?
12. Are CSV flows validated before commit?
13. Are history and sourcing actions traceable with enough metadata?
14. Are hooks or repo contract files updated when the planning contract changes?
15. Do `phases/index.json`, `phases/<phase>/index.json`, and the active `step*.md` agree on active phase, active step, and status?
16. Are tests present for the new behavior and do lint, build, test, and phase validation pass?

## Output Rules
- Findings first, ordered by severity.
- Use Codex-native review findings with absolute file paths and tight line ranges when calling out concrete defects.
- If there are no blocking findings, state that explicitly and note any residual risks or validation gaps.
- Open questions or assumptions second.
- Short summary last.

## Runtime Regression Test
When editing the review helper itself, run:

```bash
python3 .agents/skills/seleccase-review/scripts/test_review_codex.py
```
