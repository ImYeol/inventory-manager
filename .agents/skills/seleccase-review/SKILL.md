---
name: seleccase-review
description: "이 저장소의 변경사항을 리뷰할 때 사용한다. review_codex.py로 active phase와 step을 확인하고, AGENTS.md와 docs, hooks, active step 기준으로 diff를 검토한다."
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

## Read First
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/.codex/config.toml`
- `/Users/yeol-mac/Development/seleccase-inventory/.codex/hooks.json`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ADR.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/phases/index.json`
- The active phase index under `/Users/yeol-mac/Development/seleccase-inventory/phases/`
- The current `step*.md` file for the work being reviewed

## Review Workflow
1. Run `python3 .agents/skills/seleccase-review/scripts/review_codex.py` from the repository root.
2. Inspect the diff first.
3. Map the diff to the active phase and current step file.
4. Review both code changes and phase metadata consistency.
5. Run or verify the required validation commands when possible.
6. Emit findings first. Keep summaries brief.

## Review Checklist
1. Does the change follow the current contracts in `AGENTS.md` and `docs/`?
2. Are hooks, repo contracts, and phase metadata aligned with the shipped behavior?
3. Are tests present for the new behavior and do lint, build, test, and phase validation pass?

## Output Rules
- Findings first, ordered by severity.
- Use absolute file paths and tight line ranges when calling out concrete defects.
- If there are no blocking findings, state that explicitly and note any residual risks or validation gaps.
- Open questions or assumptions second.
- Short summary last.

## Runtime Regression Test
When editing the review helper itself, run:

```bash
python3 .agents/skills/seleccase-review/scripts/test_review_codex.py
```
