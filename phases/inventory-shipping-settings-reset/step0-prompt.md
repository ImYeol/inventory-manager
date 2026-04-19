# Codex Harness Prompt

- Project: Seleccase Inventory
- Phase: inventory-shipping-settings-reset
- Step: 0 (docs-and-ia-reset)
- Branch: feat-inventory-shipping-settings-reset

## Execution Rules

1. Execute only this step and keep earlier completed work consistent.
2. Read the step file and AGENTS.md before editing.
3. Run the step acceptance criteria directly.
4. Update `phases/inventory-shipping-settings-reset/index.json` directly when the step is done.
5. Write the current step result into the phase index file itself. Do not call helper commands.
6. Do not change unrelated step statuses or broaden scope.

## Guardrails

프로젝트: Seleccase Inventory

기술 스택
- Next.js 16 App Router
- TypeScript 5
- Tailwind CSS v4

아키텍처 규칙
- CRITICAL: 모든 서버/외부 API 로직은 server action 또는 route handler에서만 처리한다.
- CRITICAL: 클라이언트 컴포넌트에서 직접 외부 API를 호출하지 않는다.
- 컴포넌트는 shared primitive를 우선 재사용하고, 타입과 액션은 역할별로 분리한다.

개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성한다.
- 커밋 메시지는 conventional commits 형식을 따른다. (`feat:`, `fix:`, `docs:`, `refactor:`)

명령어
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`


---

# Step 0: docs-and-ia-reset

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ADR.md`
- `/Users/yeol-mac/Development/seleccase-inventory/phases/index.json`

## 작업
- 사용 맥락 기준으로 전역 IA를 다시 정의한다.
- `상품 관리`를 top-level 도메인으로 승격하고 `상품` / `창고` 관리 책임을 명확히 적는다.
- `재고 운영`은 목록과 이력 view, 입고/출고 action 중심으로 재정의한다.
- `설정`은 `스토어 연결`의 canonical owner로 고정한다.
- 운송장, 설정, 재고 운영의 중복 설명 카드와 AI slop 패턴을 문서에서 명시적으로 제거한다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. 문서 전반의 메뉴 구조가 서로 충돌하지 않는다.
2. `상품 관리`, `재고 운영`, `소싱`, `운송장`, `설정`의 책임 경계가 분명하다.
3. 기존 `기준 데이터`와 `/integrations` 설명은 stale source of truth로 남지 않는다.

## 금지사항
- 기존 mixed-sidebar 규칙을 그대로 유지한다고 가정하지 마라. 이유: 이번 작업의 출발점이 그 판단의 재검토다.
- 화면 수 기준으로 메뉴를 나누지 마라. 이유: 사용 맥락 중심 IA와 충돌한다.

