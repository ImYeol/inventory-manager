---
name: seleccase-harness
description: 이 프로젝트의 Harness 워크플로우를 Codex CLI 기준으로 진행한다. 구현 전 `AGENTS.md`와 `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/UI_GUIDE.md`, `docs/ADR.md`, `phases/`를 읽고, 각 step은 별도의 headless Codex CLI 세션에서 `execute_codex.py`로 실행한다.
---

# Seleccase Harness

이 프로젝트는 Harness 프레임워크를 사용한다. 스킬 자체에 제품/IA/UI 가드레일을 중복 기록하지 말고, 아래 문서를 source of truth로 사용한다.

## Read First
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/.codex/config.toml`
- `/Users/yeol-mac/Development/seleccase-inventory/.codex/hooks.json`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ADR.md`
- `/Users/yeol-mac/Development/seleccase-inventory/phases/index.json`

`AGENTS.md`와 `docs/`가 저장소 계약의 source of truth다. 이 스킬과 충돌하면 문서를 따른다.

## Workflow

### A. 탐색
- `AGENTS.md`와 `docs/`를 먼저 읽고 현재 작업의 계약, 범위, 검증 방식을 확정한다.
- 필요 시 phase 파일과 관련 코드까지 읽고 현재 step의 맥락을 정리한다.

### B. 논의
- 구현을 위해 결정이 필요한 항목이 있으면 사용자와 합의한다.

### C. Step 설계
- 사용자가 구현 계획 작성을 지시하면 여러 step으로 나눈 초안을 작성한다.

설계 원칙:
1. Scope 최소화: 한 step에서 한 레이어 또는 한 모듈만 다룬다.
2. 자기완결성: 각 `stepN.md`는 별도 Codex CLI 세션에서 바로 실행 가능해야 한다.
3. 사전 준비 강제: 관련 문서 경로와 이전 step 산출물 경로를 명시한다.
4. 시그니처 수준 지시: 인터페이스와 핵심 규칙만 고정하고 내부 구현은 step 세션에 맡긴다.
5. AC는 실제 명령으로 적는다.
6. 금지사항은 `X를 하지 마라. 이유: Y` 형식으로 적는다.
7. step name은 kebab-case slug를 사용한다.

### D. 파일 생성
- 사용자가 승인하면 `phases/index.json`, `phases/{task-name}/index.json`, `phases/{task-name}/step{N}.md`를 생성한다.
- 상태 필드와 step 산출물 형식은 기존 harness runtime 계약을 따른다.

### E. 실행
- 각 step은 별도의 headless Codex CLI 세션으로 실행된다.
- step 세션은 종료 전에 `phases/{task-name}/step{N}-output.json`을 생성하거나 갱신해야 한다.
- 실행 형식:

```bash
python3 .agents/skills/seleccase-harness/scripts/execute_codex.py {task-name} [--push]
```

## Acceptance Baseline
특별한 지시가 없으면 각 step은 아래를 기본 검증으로 사용한다.

```bash
npm run lint
npm run build
npm run test
```

## Error Recovery
- step이 `error` 또는 `blocked`로 끝나면 원인 수정 후 다시 실행한다.
- rerun은 `step{N}-output.json`을 다시 생성하고 실행기가 `index.json`을 동기화하게 둔다.

## Runtime Regression Test
Harness runtime 자체를 수정할 때는 아래를 실행한다.

```bash
python3 .agents/skills/seleccase-harness/scripts/test_execute_codex.py
```
