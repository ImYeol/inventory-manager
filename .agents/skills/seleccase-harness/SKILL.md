---
name: seleccase-harness
description: 이 프로젝트의 Harness 워크플로우를 Codex CLI 기준으로 진행할 때 사용한다. AGENTS.md를 기준 계약으로 삼고, docs, DESIGN_SYSTEM.md, hooks, phase 파일을 먼저 읽은 뒤, 각 step은 별도의 headless Codex CLI 세션에서 `execute_codex.py`로 실행한다. step 산출물은 다시 `stepN-output.json`에 기록한다.
---

# Seleccase Harness

이 프로젝트는 Harness 프레임워크를 사용한다. 아래 워크플로우에 따라 작업을 진행하라.

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

`AGENTS.md` is the repo's CLAUDE-equivalent source of truth. If this skill conflicts with `AGENTS.md`, follow `AGENTS.md`.

## Workflow

### A. 탐색

- `docs/` 하위 문서(PRD, ARCHITECTURE, ADR 등)를 읽고 프로젝트의 기획·아키텍처·설계 의도를 파악한다.
- `AGENTS.md`를 먼저 확인해 현재 작업에서 지켜야 할 계약, 범위, 검증 방식을 확정한다.
- 필요시 phase 파일과 관련 파일까지 읽고 현재 step의 맥락을 정리한다.

### B. 논의

- 구현을 위해 구체화하거나 기술적으로 결정해야 할 사항이 있으면 사용자에게 제시하고 논의한다.

### C. Step 설계

- 사용자가 구현 계획 작성을 지시하면 여러 step으로 나뉜 초안을 작성해 피드백을 요청한다.

설계 원칙:

1. Scope 최소화: 하나의 step에서 하나의 레이어 또는 모듈만 다룬다.
2. 자기완결성: 각 `stepN.md`는 별도의 Codex CLI 세션에서 바로 실행될 수 있어야 한다.
3. 사전 준비 강제: 관련 문서 경로와 이전 step에서 생성/수정된 파일 경로를 명시한다.
4. 시그니처 수준 지시: 인터페이스와 핵심 규칙만 고정하고 내부 구현은 step 세션에 맡긴다.
5. AC는 실행 가능한 커맨드: 추상 서술 대신 실제 명령을 적는다.
6. 주의사항은 구체적으로: `X를 하지 마라. 이유: Y` 형식으로 적는다.
7. 네이밍: step name은 kebab-case slug를 사용한다.

### D. 파일 생성

- 사용자가 승인하면 아래 파일들을 생성한다.

#### D-1. `phases/index.json`

```json
{
  "phases": [
    {
      "dir": "0-mvp",
      "status": "pending"
    }
  ]
}
```

- `dir`: task 디렉토리명
- `status`: `pending` | `completed` | `error` | `blocked`
- `completed_at`, `failed_at`, `blocked_at`는 실행기가 상태 변경 시 자동 기록한다.

#### D-2. `phases/{task-name}/index.json`

```json
{
  "project": "<프로젝트명>",
  "phase": "<task-name>",
  "steps": [
    { "step": 0, "name": "project-setup", "status": "pending" },
    { "step": 1, "name": "core-types", "status": "pending" },
    { "step": 2, "name": "api-layer", "status": "pending" }
  ]
}
```

- `project`: 프로젝트명
- `phase`: task 이름
- `steps[].step`: 0부터 시작하는 순번
- `steps[].name`: kebab-case slug
- `steps[].status`: 초기값은 모두 `pending`

상태 전이와 자동 기록 필드:

| 전이 | 기록되는 필드 | 기록 주체 |
|------|-------------|----------|
| → `completed` | `completed_at`, `summary` | step 세션(summary), 실행기(timestamp) |
| → `error` | `failed_at`, `error_message` | step 세션(message), 실행기(timestamp) |
| → `blocked` | `blocked_at`, `blocked_reason` | step 세션(reason), 실행기(timestamp) |

- `summary`는 다음 step에 유용한 산출물 요약이어야 한다.
- `started_at`은 실행기가 각 step 시작 시 자동 기록할 수 있다.

#### D-3. `phases/{task-name}/step{N}.md`

```markdown
# Step {N}: {이름}

## 읽어야 할 파일

- /docs/ARCHITECTURE.md
- /docs/ADR.md
- {이전 step에서 생성/수정된 파일 경로}

## 작업

{구체적인 구현 지시. 구현체보다 인터페이스/핵심 규칙 중심으로 적는다.}

## Acceptance Criteria

~~~bash
npm run build
npm test
~~~

## 검증 절차

1. 위 AC 커맨드를 실행한다.
2. 결과를 `phases/{task-name}/step{N}-output.json`에 기록한다.
3. 실행기가 `step{N}-output.json`과 `index.json`을 반영하도록 둔다. 수동 helper command는 사용하지 않는다.
4. 성공 시 `summary`, 실패 시 `error_message`, 사용자 개입 필요 시 `blocked_reason`을 남긴다.

## 금지사항

- {이 step에서 하지 말아야 할 것. `X를 하지 마라. 이유: Y`}
- 기존 테스트를 깨뜨리지 마라
```

### E. 실행

- 각 step은 별도의 headless Codex CLI 세션으로 실행된다.
- step 세션은 종료 전에 `phases/{task-name}/step{N}-output.json`을 생성하거나 갱신해야 한다.
- 실행은 아래 형식만 사용한다.

```bash
python3 .agents/skills/seleccase-harness/scripts/execute_codex.py {task-name} [--push]
```

- `--push`는 필요할 때만 덧붙인다.
- helper command는 없다. 상태 반영과 후처리는 실행기가 책임진다.

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
- Converge reusable UI primitives under `src/components/ui/*`; treat `src/app/components/ui.tsx` as the class preset bridge, not the only place new components should live.
- Prefer shared status badges and icon + text action buttons over page-local pills or all-text button rows.
- If `/integrations`, `/shipping`, and `/settings` start showing the same provider form or summary again, stop and resolve ownership before polishing visuals.
- Avoid repeated header copy, duplicate CTA clusters, and multi-layer card nesting when simplifying dense operations pages.
- Prefer the smallest viable schema and UI change that satisfies the step.

## Acceptance Baseline

특별한 지시가 없으면 각 step은 아래를 기본 검증으로 사용한다.

```bash
npm run lint
npm run build
npm run test
```

## Error Recovery

- If a step ends in `error` or `blocked`, fix the underlying issue and rerun:
  `python3 .agents/skills/seleccase-harness/scripts/execute_codex.py {task-name}`
- The rerun should regenerate `step{N}-output.json` and let the executor reconcile `index.json`.

## Runtime Regression Test

When editing the harness runtime itself, run:

```bash
python3 .agents/skills/seleccase-harness/scripts/test_execute_codex.py
```
