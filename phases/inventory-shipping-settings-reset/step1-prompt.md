# Codex Harness Prompt

- Project: Seleccase Inventory
- Phase: inventory-shipping-settings-reset
- Step: 1 (navigation-products-and-settings-ownership)
- Branch: feat-inventory-shipping-settings-reset

## Execution Rules

1. Execute only this step and keep earlier completed work consistent.
2. Read the step file and AGENTS.md before editing.
3. Run the step acceptance criteria directly.
4. Update `phases/inventory-shipping-settings-reset/index.json` directly when the step is done.
5. Write the current step result into the phase index file itself. Do not call helper commands.
6. Do not change unrelated step statuses or broaden scope.

## Completed Step Summaries

- Step 0 (docs-and-ia-reset): Rewrote the IA docs so product management is a top-level domain, inventory is list/history and inbound/outbound centered, settings owns store connections, and legacy 기준 데이터 /integrations ownership is demoted to redirects.

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

# Step 1: navigation-products-and-settings-ownership

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/components/Nav.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/settings/page.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/settings/SettingsView.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/integrations/page.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/master-data/page.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/settings/master-data/page.tsx`

## 작업
- 전역 메뉴를 `대시보드`, `재고 운영`, `상품 관리`, `소싱`, `운송장`, `분석`, `설정` 기준으로 재배치한다.
- `상품 관리` canonical route를 만들고 기존 master-data 진입점은 redirect로 정리한다.
- `설정` 안에 스토어 연결 관리 surface를 합치고 `/integrations`는 redirect 또는 thin alias로 축소한다.
- 필요 시 `소싱`은 top-level direct item으로 정리하고 내부 전환은 local navigation으로 풀어낸다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. 네비게이션에서 `상품 관리`를 바로 찾을 수 있다.
2. `설정`과 `스토어 연결`의 ownership이 한 화면으로 수렴한다.
3. 기존 `/master-data`, `/settings/master-data`, `/integrations` 접근은 깨지지 않고 canonical owner로 이동한다.

## 금지사항
- `설정`과 `스토어 연결`에 같은 form을 동시에 남기지 마라. 이유: ownership이 다시 갈라진다.
- `상품 관리`를 다시 `기준 데이터`라는 내부 용어로만 숨기지 마라. 이유: 사용자가 찾지 못한다.
- `src/app/layout.tsx`, `src/app/globals.css`, `next.config.ts`를 건드리지 마라. 이유: step 1의 ownership 정리와 무관한 전역 스타일/런타임 변경은 회귀 범위를 넓힌다.
- 대시보드나 다른 unrelated surface를 전면 재설계하지 마라. 이유: 이번 step은 전역 메뉴, canonical route, redirect ownership에만 집중해야 한다.

