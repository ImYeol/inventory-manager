# Codex Harness Prompt

- Project: Seleccase Inventory
- Phase: warehouse-ops-redesign
- Step: 2 (inventory-operations-hub)
- Branch: codex/warehouse-ops-redesign

## Execution Rules

1. Use Codex in this repository to execute only this step.
2. Read the step file and the listed dependencies before editing.
3. Run the step acceptance criteria directly.
4. When the step is complete, record the summary with `complete`.
5. If blocked, record the reason with `block`.
6. If the step fails after retries, record the error with `error`.

## Completed Step Summaries

- Step 0 (codex-hooks-and-doc-foundation): Codex hooks, AGENTS.md, and redesign docs were aligned to the warehouse-ops, sourcing, and store-connections IA.
- Step 1 (navigation-and-route-simplification): Navigation was simplified to direct primary items plus a sourcing group, with protected routes aligned around /inventory and /integrations.
## Guardrails

## AGENTS

# AGENTS

## Repo Contract
- This file is the single source of truth for repository-specific Codex instructions.
- For non-trivial work, read `AGENTS.md`, `docs/`, `DESIGN_SYSTEM.md`, `phases/`, `.codex/config.toml`, and `.codex/hooks.json` first.
- Prefer repo-local skills at `.agents/skills/seleccase-harness` and `.agents/skills/seleccase-review` when the task matches them.

## Project Context
- Stack: Next.js 16 App Router, React 19, TypeScript 5, Tailwind CSS v4, Supabase, Prisma, Vitest, Testing Library, `xlsx`.
- Protected operator workflows, inventory lookup and in/out registration, analytics, shipping upload/matching/dispatch assist, and Naver/Coupang credential-backed integrations are in scope.
- Current redesign scope is limited to warehouse operations UX, sourcing arrivals flow, and store-connections IA cleanup.

## Core Rule
- Main agent acts as orchestrator by default.
- For user requests involving file search, UI work, code search, test writing, implementation, or test execution, delegate as much as possible to subagents.

## 하지 말아야 할 것
- 범위를 벗어난 기능 확장이나 요구사항 추가를 하지 않는다.
- 임시 편법보다 기존 구조와 컴포넌트를 우선 재사용하고, 새 컴포넌트의 과도한 추가를 하지 않는다.
- 이미 확인한 결함은 다시 반복 지적하지 않으며, 동일한 수정을 되풀이하지 않는다.
- 일반론적 제안으로 끝내지 않고, 사용자의 현재 맥락과 코드 증거 기반으로만 변경한다.
- 각 사용자 피드백은 다음 작업의 강제 규칙으로 고정하고, 모호한 부분은 구현 전 확인한다.
- 재고 관리 핵심 흐름(업로드→미리보기→매칭/발송)을 건드리지 않는 범위를 벗어나지 않는다.
- 임의 추측 수정이나 비슷한 동작 중복 구현보다 필요한 최소 변경으로 끝낸다.

## Execution Model
- Prefer TDD order: inspect/search -> write or update tests -> implement -> run tests -> verify.
- Split independent tasks and run them in parallel whenever possible.
- Reorder work for shortest critical path, highest accuracy, and lowest token cost.

## Subagent Policy
- Use subagents by default unless the task is too small to justify delegation.
- Keep each subagent task narrow, concrete, and isolated.
- Assign UI, code search, test authoring, implementation, and test execution to separate subagents when parallelism is possible.

## Model Selection
- Use `gpt-5.4-mini` for low or medium complexity subtasks by default.
- Increase model size only when task difficulty, ambiguity, or risk clearly requires it.
- Set reasoning effort by task difficulty: low for simple search or edits, medium for standard implementation, high only for genuinely complex debugging or design decisions.

## Workflow Goal
- Optimize for fast parallel execution, correct final results, and token-efficient coordination.
- Main agent should synthesize, review, and integrate subagent outputs rather than doing all work directly.

## Product Guardrails
- Keep `재고 운영` as one first-level warehouse operations hub with `개요`, `입고`, `출고`, `CSV`, `이력` workspaces.
- Only use expandable navigation for sections with 2 or more meaningful child screens. `소싱` may expand; `운송장` and `분석` stay direct items unless the codebase materially changes.
- Keep `기준 데이터` under `설정` or an admin surface unless the user explicitly asks to promote it again.
- Treat Naver and Coupang as `스토어 연결`, separate from `/shipping`, while reusing the current credential and action layers for MVP where possible.
- Default inbound and outbound UX to `빠른 다건 입력 + CSV` rather than repetitive single-item forms.
- Use desktop dialog and mobile full-height sheet patterns consistently for create and edit flows.

## Architecture Rules
- `inventory` and `transactions` remain the source of truth for stock. Do not create a duplicate ledger.
- Preserve existing Supabase `user_id` scoping and RLS assumptions for any new entity.
- Keep `/analytics` and `/shipping` available.
- Do not expand scope into the shipping core flow beyond `업로드 → 미리보기 → 매칭/발송`.
- Prefer protected routes under `src/app/(protected)` with server-rendered pages and the smallest possible client components.
- Build menus, tables, filters, and status pills from shared config or primitives instead of page-local one-offs.
- Mobile baseline: 44px+ tap targets, 14px+ body text, 16px horizontal padding.

## Web App Code Rules
- Build UI from small reusable components and shared primitives; split large files early and prefer composition over duplication.
- Keep components and hooks pure and predictable: same inputs, same output; do not mutate props, state, or context.
- Prefer derived state and event handlers; use `useEffect` only when syncing with external systems.
- In Next.js, default to Server Components and isolate interactivity in the smallest possible Client Component.
- Reuse existing `shadcn` variants, semantic tokens, and CSS variables before adding custom styles; avoid raw colors and one-off patterns.
- Prefer semantic HTML, clear props, direct imports, and simple accessible layouts that are easy to scan, test, and change.

## Design System Rules
- Source of truth: `src/app/globals.css` for tokens and `src/app/components/ui.tsx` for reusable class presets.
- Use `ui.shell`, `ui.panel`, `ui.button*`, `ui.control*`, `ui.table*`, `ui.pill*`, and `PageHeader` before introducing new page-specific styling.
- Keep color usage token-based: `--background`, `--foreground`, `--surface`, `--surface-muted`, `--border`, `--accent`, and `--focus-ring`.
- Keep spacing and radius consistent with existing primitives: `surface`/`ui-control`/`ui-button` use rounded cards and controls rather than ad hoc values.
- Prefer `surface` blocks, `surface-header`, and `ui-empty` for card layouts, sections, and empty states; avoid nested one-off borders unless the pattern is repeated in multiple places.
- Follow accessibility defaults already in the codebase: semantic headings, visible focus rings, large click targets, and labels linked to controls.
- For React UI changes, keep derived state local, avoid unnecessary effects, and prefer server-rendered shells with minimal client interactivity.
- When adding a new visual pattern, document the token or component in `DESIGN_SYSTEM.md` first and reuse it across at least two screens when possible.

## Codex Harness Rules
- Manage repo-local Codex behavior through `.codex/config.toml` and `.codex/hooks.json`.
- Active hooks are limited to `SessionStart`, `UserPromptSubmit`, and `PreToolUse`.
- Hooks should only reinforce repo context, planning and navigation context, and destructive-command protection.
- For plan-only requests, update docs, hooks, skills, and phase files before application code.
- Phase work should follow `phases/index.json`, `phases/<phase>/index.json`, and the active `step*.md` contract in order.

## Key Paths
- `src/app/components/Nav.tsx`: global navigation
- `src/app/components/InventoryView.tsx`: inventory UI baseline
- `src/app/(protected)/inventory/*`: inventory operations hub
- `src/app/(protected)/inout/*`: legacy inbound and outbound entry points
- `src/app/(protected)/history/*`: history screens
- `src/app/(protected)/shipping/*`: shipping flow
- `src/app/(protected)/analytics/*`: analytics flow
- `src/app/(protected)/settings/*`: admin and settings surfaces
- `src/lib/shipping-credentials.ts`: store-connection credential persistence
- `src/lib/actions/shipping.ts`: shipping order and dispatch actions
- `src/lib/api/naver.ts`, `src/lib/api/coupang.ts`: commerce integrations
- `src/lib/actions.ts`, `src/lib/data.ts`: inventory and transaction actions and queries
- `prisma/schema.prisma`: data-model baseline

## Validation Commands
- `npm run lint`
- `npm run build`
- `npm run test`


---

## DESIGN_SYSTEM

# Design System

This document tracks both the current token system and the planned warehouse-operations redesign direction. Implementation has not happened yet; this file is the design contract future code should follow.

## Source Of Truth

- Tokens live in [`src/app/globals.css`](src/app/globals.css).
- Shared UI presets live in [`src/app/components/ui.tsx`](src/app/components/ui.tsx).
- Project planning and IA decisions live in [`docs/UI_GUIDE.md`](docs/UI_GUIDE.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- Phase execution scope lives under [`phases/warehouse-ops-redesign`](phases/warehouse-ops-redesign).
- Codex harness behavior lives in [`.codex/config.toml`](.codex/config.toml), [`.codex/hooks.json`](.codex/hooks.json), and [`.agents/skills`](.agents/skills).

## Product Character

- This is an operations console, not a marketing SaaS dashboard.
- Warehouse, sourcing, shipping, analytics, and store connections should feel like one tool.
- Dense tables, clear status semantics, and fast action paths matter more than ornamental visuals.

## Tokens

Use CSS variables instead of raw colors for new work.

- `--background`: app background
- `--foreground`: primary text and strong UI chrome
- `--surface`: card and panel background
- `--surface-muted`: quiet section background
- `--surface-strong`: emphasized section background
- `--border`: default border color
- `--border-strong`: emphasized border color
- `--accent`: primary action or active state color
- `--accent-foreground`: text on accent surfaces
- `--focus-ring`: focus outline color
- `--shadow`: shared surface shadow

### Planned Theme Direction
- Base: cool neutral slate surfaces
- Accent: safety orange for actions and active states
- Status colors: green / amber / red / blue by semantics
- Avoid purple-dominant branding and glassmorphism patterns

## Typography

- Current baseline is Geist Sans + Geist Mono.
- Planned redesign may move body typography toward a Korean-friendly UI font such as `SUIT Variable` or `Pretendard Variable`, while keeping a mono font for codes and quantities.
- Use `PageHeader` for titles and descriptions instead of ad hoc hero blocks.
- Use `ui.number` or equivalent mono treatment for IDs, quantities, warehouse references, and tracking-like values.

## Navigation Patterns

- Desktop navigation should become a mixed sidebar with direct items and expandable groups.
- Only sections with 2 or more child screens should be expandable.
- `재고 운영`, `운송장`, `분석`, `스토어 연결`, `설정` are expected to be direct items.
- `소싱` is the primary expandable group in the current plan.
- Do not introduce singleton category headers for `운송장` or `분석` unless those domains gain real subnavigation.
- Mobile should use a drawer or sheet instead of the current fixed bottom nav.
- Navigation styles must be centralized rather than hard-coded inside route components.

## Layout Patterns

- Keep pages inside `ui.shell` or `ui.shellNarrow`.
- Operations pages should be table-first by default. Use the page header and filters to support the table, and add summary cards only when a page genuinely needs a glanceable KPI layer.
- For heavy operations pages, keep action buttons within the same visual zone as the filter toolbar.
- `재고 운영` should behave like one workspace with internal tab or segmented views, not several disconnected pages.
- Creation and edit actions should prefer a shared overlay pattern: desktop dialog, mobile full-height sheet.

## Core Components

- `ui.panel`, `ui.panelHeader`, `ui.panelBody`: section shells
- `ui.buttonPrimary`, `ui.buttonSecondary`, `ui.buttonGhost`: actions
- `ui.control`, `ui.controlSm`: form controls
- `ui.tab`, `ui.tabActive`: segmented choices
- `ui.pill`, `ui.pillMuted`: compact statuses
- `ui.tableShell`, `ui.tableHeadCell`, `ui.tableCell`: dense tables
- `ui.emptyState`: empty states

### Planned Shared Additions
- Sidebar item / section / submenu primitives
- Filter toolbar shell
- Workspace tab switcher
- Status pill variants for `normal`, `warning`, `danger`, `incoming`
- Table row action cluster
- CSV upload dropzone and validation summary block
- Store connection status card
- Quick entry overlay shell
- Line-item editor for multi-row manual entry
- Responsive table-to-card fallback

## Screen Rules

### Inventory Operations
- Warehouse-first visibility
- One warehouse context should drive overview, inbound, outbound, csv, and history states
- Status pills and quantity columns should be scannable at a glance
- Filters must stay close to the table
- Manual inbound/outbound should optimize for 2 to 20 row entry without forcing CSV

### Sourcing
- Separate factory management from arrival operations
- Residual quantity and arrival status should always be visible

### Store Connections
- Show provider state, masked credentials summary, and last update time
- Keep the visual language aligned with shipping, but distinguish setup from execution

### Shipping
- Keep upload CTA and provider status summary above the order tables
- Do not let redesign work disrupt the existing upload-preview-match-send flow

## Accessibility

- Preserve focus-visible styles using `--focus-ring`.
- Keep semantic headings and labels.
- Avoid icon-only controls without accessible names.
- Status should never be color-only; include text labels.
- Keep tap targets 44px or larger on mobile-sized interactive controls.

## Mobile Baseline

- Body text should stay at 14px to 15px.
- Default horizontal page padding should stay around 16px.
- Card and section spacing should stay in the 12px to 16px range.
- Dense desktop tables should collapse into compact priority-column lists or cards on mobile.

## Implementation Note

- New visual patterns should be documented here before they are spread across multiple screens.
- Shared token or primitive changes should happen before page-specific restyling.


---

## docs/ADR.md

# Architecture Decision Records

## 철학
이 프로젝트는 기존 재고 원장을 버리지 않고 운영 관점 UX를 재정렬하는 방향으로 간다. 새 도메인(외부 공장, 예정 입고)은 추가하되, 핵심 재고 수량의 단일 진실 공급원은 유지한다.

---

### ADR-001: 메뉴는 mixed sidebar로 구성하고 필요할 때만 확장형을 사용한다
**결정**: direct item과 expandable section을 혼합한 사이드바를 채택한다. 하위 화면이 2개 이상인 섹션만 확장형으로 둔다.  
**이유**: 모든 메뉴를 드롭다운으로 만들면 구조만 복잡해지고, 실제 탐색 속도는 오히려 느려진다.  
**트레이드오프**: direct item과 section을 함께 설계해야 하므로 nav config가 조금 더 정교해진다.

### ADR-001A: `운송장`과 `분석`은 singleton category로 쪼개지 않는다
**결정**: `/shipping`, `/analytics`는 현재 direct item으로 유지하고, 의미 있는 child destination이 실제로 생길 때만 하위 메뉴로 확장한다.  
**이유**: 한 화면짜리 도메인을 굳이 그룹으로 감싸면 메뉴 단계만 늘고 사용성은 좋아지지 않는다.  
**트레이드오프**: 향후 기능이 커지면 nav refactor가 한 번 더 필요할 수 있다.

### ADR-002: `재고 운영`은 단일 허브로 재구성한다
**결정**: `재고`, `입출고`, `이력`, `창고별 운영`을 여러 1차 메뉴로 쪼개지 않고 `/inventory` 기반 허브로 통합한다.  
**이유**: 창고 담당자 기준으로는 한 창고 컨텍스트 안에서 개요, 입고, 출고, CSV, 이력을 연속해서 다루는 것이 자연스럽다.  
**트레이드오프**: 허브 내부 tab/query-state 설계가 필요하고, 기존 `/inout`, `/history` 라우트는 전환 전략이 필요하다.

### ADR-003: 재고 원장은 `inventory` + `transactions` 단일 구조를 유지한다
**결정**: 창고별 재고와 변동 이력은 기존 테이블을 유지하고, 새 기능은 메타데이터와 보조 엔터티를 확장하는 방식으로 붙인다.  
**이유**: 현재 시스템은 이미 창고 단위 수량과 트랜잭션을 보유하고 있어 재작성보다 확장이 안전하다.  
**트레이드오프**: 트랜잭션 메타데이터 보강과 RPC 수정이 필요하다.

### ADR-004: 외부 공장과 예정 입고는 staging 도메인으로 분리한다
**결정**: `factories`, `factory_arrivals`, `factory_arrival_items`를 도입해 실제 재고 반영 전 단계를 따로 관리한다.  
**이유**: 예정 수량과 실제 입고 수량은 의미가 다르며, 실제 원장과 분리해야 감사 가능성과 UX가 좋아진다.  
**트레이드오프**: 엔터티 수와 상태 전이 로직이 늘어난다.

### ADR-005: 네이버/쿠팡은 `스토어 연결` 도메인으로 승격하되 저장소는 우선 재사용한다
**결정**: 사용자 IA에서는 `스토어 연결`을 별도 1차 메뉴로 승격하고, MVP 저장소는 `shipping_provider_credentials`를 계속 사용한다.  
**이유**: 현재 코드상 네이버/쿠팡은 실제 주문 조회/발송 흐름과 연결된 도메인이며, 지금 필요한 것은 구조 재작성보다 의미 있는 배치다.  
**트레이드오프**: storage 이름과 사용자 노출 용어가 다를 수 있으므로 문서와 코드 명명 전략을 정리해야 한다.

### ADR-006: `기준 데이터`는 top-level에서 내리고 `설정`에 통합한다
**결정**: 기준 데이터는 별도 핵심 메뉴가 아니라 설정/관리 영역으로 재배치한다.  
**이유**: 창고 운영 실사용 동선에서 기준 데이터는 준비 작업이지 핵심 daily destination이 아니다.  
**트레이드오프**: 기존 사용자 링크나 습관을 고려해 전환 기간 alias 또는 안내가 필요할 수 있다.

### ADR-007: CSV는 부가 기능이 아니라 1급 운영 입력 채널로 취급한다
**결정**: 입출고와 공장 예정 등록 모두에서 CSV 업로드를 수동 입력과 동등한 진입점으로 제공한다.  
**이유**: 운영 데이터는 대량 입력 비중이 높고, 실무자가 원하는 핵심 편의성이다.  
**트레이드오프**: 파싱, 미리보기, 오류 표시, 멱등성 처리 설계가 필요하다.

### ADR-007A: 수동 입출고도 quick entry 다건 입력 패턴으로 최적화한다
**결정**: 수동 입출고는 단건 form 중심이 아니라 line-item 기반 quick entry overlay를 기본으로 한다.  
**이유**: 실무에서는 2~20개 수준의 다건 입력이 자주 발생하고, 이 구간은 CSV보다 빠른 직접 입력 UX가 필요하다.  
**트레이드오프**: dialog/sheet 상태, 붙여넣기 파싱, inline validation 설계가 필요하다.

### ADR-007B: 생성/수정 UX는 공통 dialog/sheet 패턴으로 통일한다
**결정**: 데스크톱은 dialog, 모바일은 full-height sheet를 기본 overlay 패턴으로 통일한다.  
**이유**: 팝업 구조가 화면마다 달라지면 사용자가 학습한 입력 흐름을 재사용하기 어렵다.  
**트레이드오프**: 공용 overlay primitive와 responsive 규칙을 먼저 설계해야 한다.

### ADR-008: repo-local Codex hooks를 하네스 계층으로 채택한다
**결정**: `.codex/config.toml`, `.codex/hooks.json`, `.codex/hooks/*.py`를 저장소에 두고 하네스 규칙을 Codex 세션에 자동 주입한다.  
**이유**: 계획 문서와 IA 원칙이 매번 누락되지 않게 하고, 파괴적 명령을 사전에 막을 수 있다.  
**트레이드오프**: experimental 기능 전제이므로 hook 실패 시에도 기본 문서 계약이 유지되도록 문서와 skill을 함께 관리해야 한다.


---

## docs/ARCHITECTURE.md

# Architecture

## 현재 구조 요약
현재 앱은 Next.js App Router 기반 보호된 운영 대시보드이며, 코드와 스키마 기준으로 핵심 도메인은 이미 아래를 가진다.

- `warehouses`
- `models`
- `sizes`
- `colors`
- `inventory`
- `transactions`
- `shipping_provider_credentials`
- `src/lib/api/naver.ts`
- `src/lib/api/coupang.ts`
- `src/lib/actions/shipping.ts`

즉, 이번 작업의 본질은 원장 재작성보다 `정보 구조`, `운영 UX`, `소싱 도메인 확장`, `연동 도메인 재배치`다.

## 현재 코드베이스 기준선
```text
src/
├── app/
│   ├── (protected)/
│   │   ├── analytics/
│   │   ├── history/
│   │   ├── inout/
│   │   ├── inventory/
│   │   ├── master-data/
│   │   ├── settings/
│   │   └── shipping/
│   ├── components/
│   │   ├── Nav.tsx
│   │   ├── InventoryView.tsx
│   │   └── ui.tsx
│   └── globals.css
├── lib/
│   ├── actions.ts
│   ├── data.ts
│   ├── actions/shipping.ts
│   ├── api/naver.ts
│   ├── api/coupang.ts
│   └── shipping-credentials.ts
└── prisma/schema.prisma
```

## 재검토 결과 발견한 문제점

### 1. 재고 운영 도메인이 과도하게 분리되어 있었다
- `재고`, `입출고`, `이력`, `창고별 운영`을 별도 1차 목적지로 두면 창고 담당자의 작업 흐름이 여러 페이지 사이에서 끊긴다.
- 해결: `재고 운영`을 단일 허브로 두고 내부 탭/세그먼트/서브섹션으로 풀어야 한다.

### 2. 드롭다운형 메뉴가 과도하게 계획되어 있었다
- 하위 메뉴가 없는 섹션까지 확장형으로 만들면 UI만 복잡해지고 탐색이 느려진다.
- 해결: child screen이 2개 이상인 섹션만 확장형으로 둔다.

### 2-1. 운송장/분석을 굳이 별도 메뉴 구조로 쪼갤 근거가 부족했다
- 현재 코드 기준으로 `/shipping`, `/analytics`는 각각 하나의 명확한 목적지를 가진다.
- 해결: 두 화면은 direct item으로 유지하고, 나중에 실제 하위 목적지가 생겼을 때만 분리한다.

### 3. `기준 데이터`가 제품 가치 대비 너무 전면에 있었다
- 실제 업무 흐름은 `재고 운영 → 소싱 → 운송장/분석`이 우선이고, 기준 데이터는 관리 보조 성격이 강하다.
- 해결: `기준 데이터`를 `설정` 또는 보조 관리자 흐름으로 내린다.

### 4. 네이버/쿠팡이 이미 존재하는데도 IA에서 저평가되어 있었다
- 현재 코드상 네이버/쿠팡은 단순 설정값이 아니라 주문 조회/발송 액션까지 연결된 실제 도메인이다.
- 해결: `스토어 연결`을 별도 1차 메뉴로 승격하고, 운송장과 관계를 분리해서 보여준다.

## 목표 정보 구조
```text
대시보드 (/)
재고 운영 (/inventory)
소싱
├── 외부 공장 (/sourcing/factories)
└── 입고 예정 (/sourcing/arrivals)
운송장 (/shipping)
분석 (/analytics)
스토어 연결 (/integrations)
설정 (/settings)
```

### IA 단순화 규칙
- 1개 화면만 가진 도메인에는 category wrapper를 만들지 않는다.
- top-level item은 사용자가 직접 가치를 느끼는 목적지여야 한다.
- `운송장`, `분석`, `스토어 연결`은 현재 direct item이 최적이다.

## 라우트 전략

### Canonical routes
- `/inventory`: 재고 운영 허브의 canonical route
- `/sourcing/factories`: 외부 공장 관리
- `/sourcing/arrivals`: 입고 예정 관리
- `/shipping`: 운송장 업무
- `/analytics`: 분석
- `/integrations`: 스토어 연결
- `/settings`: 기준 데이터와 기타 운영 설정

### 재고 운영 허브 내부 상태
`/inventory` 안에서 아래 워크스페이스를 탭/세그먼트/query param 기반으로 전환한다.

- `overview`
- `inbound`
- `outbound`
- `csv`
- `history`

예시:
```text
/inventory
/inventory?tab=overview
/inventory?tab=inbound
/inventory?tab=history
```

### 기존 라우트 처리 원칙
- `/inout`, `/history`, `/master-data`는 즉시 제거하기보다 전환 단계에서 유지 또는 redirect 대상으로 본다.
- 메뉴의 canonical 진입점은 바꾸되, 내부 링크/북마크 회귀를 줄이기 위해 alias 전략을 허용한다.

## 파일 구조 제안
```text
src/app/(protected)/
├── inventory/
│   ├── page.tsx
│   ├── InventoryWorkspace.tsx
│   ├── InventoryOverview.tsx
│   ├── InventoryInbound.tsx
│   ├── InventoryOutbound.tsx
│   ├── InventoryCsv.tsx
│   └── InventoryHistory.tsx
├── sourcing/
│   ├── factories/
│   │   ├── page.tsx
│   │   └── FactoriesView.tsx
│   └── arrivals/
│       ├── page.tsx
│       └── ArrivalView.tsx
├── integrations/
│   ├── page.tsx
│   └── IntegrationsView.tsx
└── ...
```

공유 UI는 route-local에 흩뿌리지 않고 아래처럼 끌어올린다.

```text
src/app/components/
├── nav/
│   ├── NavigationShell.tsx
│   ├── NavigationSection.tsx
│   └── nav-config.ts
├── inventory/
│   ├── InventoryWorkspaceTabs.tsx
│   ├── InventoryToolbar.tsx
│   ├── InventoryStatusPill.tsx
│   ├── InventoryTable.tsx
│   ├── WarehouseSelector.tsx
│   ├── QuickEntryOverlay.tsx
│   ├── LineItemEditor.tsx
│   └── BulkPasteInput.tsx
├── sourcing/
│   ├── FactoryList.tsx
│   ├── ArrivalTable.tsx
│   └── ReceiveToWarehouseDialog.tsx
├── integrations/
│   └── StoreConnectionCard.tsx
├── responsive/
│   └── ResponsiveDataList.tsx
└── ui.tsx
```

## 데이터 모델 전략

### 유지할 것
- `inventory`는 현재 수량의 단일 진실 공급원으로 유지한다.
- `transactions`는 재고 변동 이력의 단일 진실 공급원으로 유지한다.
- `shipping_provider_credentials`는 MVP에서 네이버/쿠팡 스토어 연결 저장소로 재사용한다.

### 확장할 것
외부 공장과 예정 입고를 위해 아래 엔터티를 추가하는 방향을 권장한다.

```text
factories
- id
- user_id
- name
- contact_name
- phone
- email
- notes
- is_active
- created_at
- updated_at

factory_arrivals
- id
- user_id
- factory_id
- reference_code
- expected_date
- status
- source_channel        # manual | csv
- memo
- created_at
- updated_at

factory_arrival_items
- id
- user_id
- factory_arrival_id
- model_id
- size_id
- color_id
- ordered_quantity
- received_quantity
- created_at
- updated_at
```

### 트랜잭션 메타데이터 확장 제안
예정입고 반영, CSV 일괄 입력, 수동 입력의 출처를 남기기 위해 `transactions`에는 아래 보강을 고려한다.

```text
transactions (추가 필드 제안)
- source_channel        # manual | csv | factory-arrival
- reference_type        # factory_arrival | csv_batch | adjustment
- reference_id
- memo
```

## 스토어 연결 아키텍처

### MVP 원칙
- 새 generic connector 플랫폼을 바로 만들지 않는다.
- 현재 `shipping_provider_credentials`와 `naver/coupang` 액션 계층을 활용해 `스토어 연결` UX를 먼저 정리한다.

### 이유
- 현재 코드에 이미 provider 단위 추상화가 있다.
- 네이버/쿠팡은 운송장 기능과 직접 연결되어 있다.
- 지금 필요한 것은 인프라 재작성보다 정보 구조 개선이다.

### V2 여지
- 향후 주문 수집, 재고 동기화, 상품 동기화까지 확장되면 `commerce_connections` 같은 더 일반화된 모델을 검토할 수 있다.
- 이번 단계에서는 설계 메모만 남기고 도입하지 않는다.

## 데이터 흐름

### A. 재고 운영 허브
```text
사용자 진입
→ warehouse selector 설정
→ tab 선택(개요/입고/출고/CSV/이력)
→ 공통 warehouse context 기준으로 loader/action 실행
→ table를 중심으로 필요한 summary, form, history를 보조 렌더링
```

### B. 수동/CSV 입출고
```text
사용자 quick entry overlay 또는 CSV 업로드 진입
→ warehouse/date 기본값 주입
→ line-item editor 또는 paste parser로 다건 입력
→ 클라이언트에서 미리보기/행 검증
→ 서버 액션에 정규화된 payload 제출
→ inventory + transactions 동시 반영
→ inventory hub 재검증
```

### B-1. Overlay 전략
```text
데스크톱
→ centered dialog 또는 side panel

모바일
→ full-height sheet

공통
→ 같은 필드 순서
→ 같은 검증 블록
→ 같은 CTA 규칙
```

### C. 공장 예정 입고 등록
```text
수동 입력 또는 CSV 업로드
→ factory_arrivals + factory_arrival_items 저장
→ 예정 목록/필터/상태 화면 갱신
```

### D. 공장 예정 → 실제 입고 반영
```text
예정 항목 선택
→ 대상 warehouse 선택
→ 잔여 수량 계산
→ inventory transaction 실행
→ arrival item의 received_quantity 갱신
→ transactions에 출처 메타데이터 기록
→ inventory/history 재검증
```

### E. 스토어 연결 → 운송장
```text
사용자 연결 정보 저장
→ shipping_provider_credentials 갱신
→ 운송장 화면에서 provider credentials 조회
→ 네이버/쿠팡 주문 fetch
→ 업로드/매칭/발송 흐름 유지
```

## 상태 관리 원칙
- 서버 데이터는 서버 페이지 또는 서버 액션에서 가져온다.
- 탭 상태, 필터, 정렬, CSV 미리보기는 route-local client state로 둔다.
- quick entry overlay 상태와 mobile filter sheet 상태도 route-local client state로 둔다.
- cross-page 전역 상태 라이브러리는 도입하지 않는다.

## 모바일 렌더링 원칙
- dense table은 모바일에서 그대로 축소하지 않는다.
- 우선순위 컬럼만 남긴 compact table 또는 stacked card/list 변형을 허용한다.
- CTA는 하단 sticky action bar 또는 sheet footer에 고정할 수 있다.
- typography, spacing, tap target 수치는 `docs/UI_GUIDE.md`의 모바일 기준을 따른다.

## CSV 처리 원칙
- 기존 `xlsx` 의존성을 재사용한다.
- 운송장 화면의 엑셀 처리 패턴을 참고하되, 재고/소싱용 파서를 분리한다.
- 파일 업로드 직후 서버 반영하지 않고 반드시 미리보기와 유효성 검사를 거친다.

## Codex Hooks 구성
repo-local Codex 자동 맥락 주입은 아래로 관리한다.

```text
.codex/
├── config.toml
├── hooks.json
└── hooks/
    ├── session_start.py
    ├── user_prompt_submit.py
    └── pre_tool_use.py
```

- `SessionStart`: 저장소 하네스와 IA 원칙 재주입
- `UserPromptSubmit`: 계획/네비게이션/스토어 연결 관련 프롬프트 보강
- `PreToolUse`: 파괴적 Bash 명령 차단

## 테스트 전략
- 데이터 변환 로직: 순수 함수 단위 테스트
- 서버 액션: 성공/실패/멱등성 시나리오 테스트
- 주요 화면: 필터링, 상태 pill, CSV 미리보기 렌더링 테스트
- 회귀 보호: `/analytics`, `/shipping`, `/integrations` 주요 진입/렌더링 테스트 유지

## 구현 순서
- 0단계: Codex hooks + 문서 기반 정리
- 1단계: 네비게이션과 canonical route 단순화
- 2단계: 재고 운영 허브 정립
- 3단계: 소싱 스키마와 입고 예정
- 4단계: 원클릭 입고 반영과 이력 결합
- 5단계: 스토어 연결 승격과 운송장 정렬
- 6단계: 설정 정리와 분석/운송장 회귀 검증


---

## docs/PRD.md

# PRD: Warehouse Operations Redesign

## 한 줄 목표
Seleccase Inventory를 `재고 운영 허브 + 소싱 확장 + 스토어 연결 + 기존 운송장/분석 유지` 구조의 운영 콘솔로 재정리한다.

## 현재 문제
- 좌측 메뉴가 평면 구조라 기능 수가 늘수록 탐색성이 떨어진다.
- 재고 운영이 `재고`, `입출고`, `이력`으로 분리되어 창고 담당자의 실제 업무 흐름이 끊긴다.
- 드롭다운 메뉴를 무조건 늘리는 구조는 과하고, 하위 화면이 없는 메뉴까지 복잡하게 만들 위험이 있다.
- `기준 데이터`가 top-level에서 차지하는 비중이 실제 사용자 업무 우선순위보다 높다.
- 외부 공장과 입고 예정 관리가 없어 예상 입고와 실제 창고 반영이 분리되어 있다.
- 네이버/쿠팡 연동은 이미 존재하지만 `설정` 아래에 숨어 있어 제품 정보 구조상 가치가 드러나지 않는다.

## 사용자
- 창고 관리자: 창고별 재고, 입고, 출고, 이력 확인이 가장 중요하다.
- 운영 매니저: 여러 창고와 SKU 상태를 한 번에 보고 CSV로 일괄 업데이트하고 싶다.
- 소싱 담당자: 외부 공장에서 어떤 물건이 언제 들어올지 등록하고 추적하고 싶다.
- 배송 담당자: 네이버/쿠팡 주문을 가져오고 운송장 업로드와 매칭/발송을 계속 써야 한다.
- 관리자: 연결 상태와 기준 데이터를 설정하고 분석 화면으로 추세를 보고 싶다.

## 핵심 재설계 판단
- `재고 운영` 카테고리 안의 창고별 운영은 입고/출고와 분리된 별도 1차 메뉴가 아니라 하나의 운영 허브로 보는 것이 맞다.
- 하위 카테고리가 없는 메뉴는 확장형으로 만들지 않는다.
- `운송장`과 `분석`은 지금 단계에서 각각 단일 목적지이므로 별도 카테고리 그룹으로 쪼개지 않는다.
- `기준 데이터`는 관리용 보조 기능이므로 top-level 1차 메뉴에서 내린다.
- 네이버/쿠팡은 `운송장 설정`이 아니라 `스토어 연결`로 다뤄야 이후 주문 수집/배송 흐름과 연결이 자연스럽다.

## 목표 정보 구조
```text
대시보드
재고 운영
소싱
├── 외부 공장
└── 입고 예정
운송장
분석
스토어 연결
설정
```

## 메뉴 원칙
- 1차 메뉴는 직접 진입 가능한 목적지여야 한다.
- 하위 화면이 2개 이상인 경우만 확장형 메뉴를 사용한다.
- 하위 화면이 1개뿐인 singleton category는 만들지 않는다.
- 이번 범위에서 확장형 메뉴는 `소싱`만 사용한다.
- `재고 운영`, `운송장`, `분석`, `스토어 연결`, `설정`은 direct item으로 유지한다.

## 핵심 시나리오
1. 사용자는 좌측 메뉴에서 `재고 운영`으로 이동한다.
2. 먼저 창고를 선택하고 `개요`, `입고`, `출고`, `CSV`, `이력` 워크스페이스 중 필요한 탭을 사용한다.
3. 재고 테이블에서 창고, 상태, 검색어, 기간, 예정 입고 여부로 필터링한다.
4. 입고/출고는 같은 운영 허브 안에서 수동 입력 또는 CSV 업로드로 처리한다.
5. 이력은 같은 허브 안 또는 같은 컨텍스트에서 창고/유형/출처 기준으로 추적한다.
6. `소싱 > 외부 공장`에서 공장을 관리하고, `소싱 > 입고 예정`에서 수동 또는 CSV로 예정 입고를 등록한다.
7. 실제 입고 시 예정 목록에서 항목을 선택하고 창고를 지정해 원클릭으로 재고에 반영한다.
8. `스토어 연결`에서 네이버/쿠팡 연결 상태를 관리한다.
9. `운송장`에서 연결된 스토어 주문을 조회하고 업로드/매칭/발송을 계속 수행한다.

## 기능 요구사항

### 1. 재고 운영 허브
- `재고 운영`은 단일 workspace여야 한다.
- workspace 안에서 최소 다음 섹션 또는 탭을 제공한다.
  - `개요`
  - `입고`
  - `출고`
  - `CSV`
  - `이력`
- warehouse selector는 허브 공통 컨텍스트로 동작한다.
- 한 번 창고를 선택하면 관련 요약, 테이블, 입력 흐름이 함께 정렬되어 보여야 한다.

### 2. 창고별 재고 개요
- 테이블은 최소 다음 정보를 제공한다.
  - 제품명
  - 모델/옵션 조합
  - 창고
  - 현재 재고
  - 입고 예정 수량
  - 최근 입고일
  - 최근 출고일
  - 상태 pill
- 컬럼 표시, 정렬, 검색, 상태 필터를 제공한다.
- CSV 등록 진입점은 테이블 상단 액션 영역에 노출한다.

### 3. 입고/출고 + CSV
- 입고/출고는 창고를 먼저 선택하는 흐름을 기본으로 한다.
- 수동 입력과 CSV 입력은 허브 안에서 자연스럽게 전환되어야 한다.
- 수동 입력은 `최소 절차`를 목표로 한다.
- 기본 경로는 전체 페이지 이탈이 아닌 quick entry dialog 또는 sheet를 우선한다.
- 한 번의 진입에서 여러 아이템을 연속 추가할 수 있어야 한다.
- 최소 다음 편의 기능을 제공한다.
  - 행 추가
  - 마지막 행 복제
  - 엑셀/시트 붙여넣기 기반 다건 입력
  - 기본 warehouse/date 유지
  - inline validation
- 등록 전 미리보기와 검증 결과를 보여준다.
- 대량 처리 후 결과 요약과 실패 행 정보를 제공한다.

### 3-1. 공통 팝업/오버레이 원칙
- 생성/수정/빠른 등록 액션은 공통 overlay 패턴을 사용한다.
- 데스크톱은 centered dialog 또는 side panel, 모바일은 full-height sheet를 기본으로 한다.
- header, body, summary, footer CTA 배치를 모든 팝업에서 일관되게 유지한다.
- destructive action을 제외하면 primary CTA는 우측 하단, secondary는 좌측 또는 상단 닫기 규칙을 따른다.

### 4. 이력
- 이력은 운영 감사 로그처럼 동작해야 한다.
- 필터는 최소 다음을 지원한다.
  - 창고
  - 구분(입고/출고/재고조정/공장입고)
  - 모델
  - 공장
  - 등록 방식(수동/CSV/예정입고 반영)
  - 날짜 범위
- 행 상세에서 원천 액션과 참조 정보를 확인할 수 있어야 한다.

### 5. 외부 공장 관리
- 공장 목록 등록/수정/비활성화가 가능해야 한다.
- 공장별 기본 정보와 최근 입고 예정 건수를 보여준다.
- 공장 단위 CSV 등록 진입점이 필요하다.

### 6. 공장발 입고 예정
- 공장, 품목, 옵션, 수량, 예정 입고일, 메모를 등록한다.
- 수동 등록과 CSV 등록을 모두 지원한다.
- 상태는 `예정`, `부분입고`, `입고완료`, `취소`를 기본으로 한다.
- 예정 목록에서 실제 입고 처리 대상만 빠르게 찾을 수 있어야 한다.

### 7. 원클릭 입고 반영
- 사용자는 예정 항목 또는 예정 묶음을 선택한다.
- 입고할 창고를 선택한다.
- 한 번의 액션으로 현재 재고와 트랜잭션 이력에 반영한다.
- 이미 반영된 수량을 다시 반영하지 않도록 멱등성 또는 잔여 수량 기준 로직이 필요하다.

### 8. 스토어 연결
- `스토어 연결` 화면에서 네이버/쿠팡 연결 상태를 확인할 수 있어야 한다.
- 각 스토어는 다음 정보를 보여준다.
  - 연결 여부
  - 마스킹된 요약
  - 최근 갱신 시각
- 연결 정보 입력/갱신은 현재 사용자 스코프에 저장된다.
- `운송장` 화면과의 관계가 명확해야 한다.
  - 연결 준비는 `스토어 연결`
  - 주문 조회/매칭/발송은 `운송장`

### 9. 분석/운송장 유지
- `/analytics`와 `/shipping`은 새 IA 아래에서 계속 접근 가능해야 한다.
- 운송장 업로드, 미리보기, 주문 매칭/발송은 회귀 없이 유지한다.

### 10. 설정 재정리
- `기준 데이터`는 `설정` 또는 운영 허브 보조 관리자 흐름으로 재배치한다.
- 창고/모델/옵션 관리 기능 자체를 제거하지는 않는다.

## 비기능 요구사항
- 기존 Supabase 사용자별 데이터 격리를 유지한다.
- 테이블 밀도는 높되 읽기 어려울 정도로 과밀하지 않아야 한다.
- 모바일에서도 최소 필터/조회/기본 액션은 가능해야 한다.
- 모바일에서는 본문 14px 이상, 주요 버튼/입력 44px 이상, 기본 좌우 여백 16px 이상을 유지한다.
- 모바일에서 dense table이 무너지면 card/list 변형과 sticky action bar를 허용한다.
- CSV 오류 메시지는 행 번호와 이유를 함께 보여준다.
- 새 엔터티가 생겨도 기존 재고 원장 일관성을 깨면 안 된다.

## MVP 제외 사항
- 구매 발주/정산/재무 기능
- 다중 사용자 승인 워크플로우
- 자동 재주문 추천 엔진
- 창고 간 이동 자동화
- 복잡한 권한 세분화
- 바코드/스캐너 연동
- 네이버/쿠팡 외 스토어의 범용 커넥터 프레임워크

## 성공 기준
- 창고 단위 재고 파악 경로가 2클릭 이내여야 한다.
- 창고 선택 후 입고/출고/CSV/이력 이동이 페이지 이탈 없이 이어진다.
- 2개 이상 아이템 수기 입출고가 modal/sheet 한 번의 진입으로 완료된다.
- 공장 예정 → 실제 입고 반영까지 별도 엑셀 수작업 없이 이어진다.
- 네이버/쿠팡 연결 상태가 사용자에게 명확히 보인다.
- 분석 및 운송장 기능이 새 메뉴 구조에서 계속 노출되고 동작한다.

## 참고 UI 방향
- 첫 번째 참고 이미지는 `재고 테이블 밀도`, `필터 툴바`, `상태 중심 테이블`의 기준으로 사용한다.
- 두 번째 참고 이미지는 `카테고리형 사이드바`를 참고하되, 실제로 하위 메뉴가 있는 섹션에만 확장형을 사용한다.
- 보라색 중심 브랜딩은 그대로 복제하지 않고, 창고 운영 도메인에 맞는 중성 톤 + 안전색 포인트 체계로 재해석한다.


---

## docs/UI_GUIDE.md

# UI Guide

## 디자인 목표
이 제품은 홍보용 SaaS가 아니라 매일 반복 사용하는 창고 운영 콘솔이어야 한다. 화면은 깔끔해야 하지만, 더 중요한 것은 빠른 판단과 대량 처리다.

## 핵심 원칙
1. 창고 운영 관점이 먼저 보여야 한다.
2. 밀도는 높게, 피로도는 낮게 설계한다.
3. 입력보다 검증이 먼저다. CSV, 일괄 반영, 원클릭 입고는 항상 미리보기와 상태 피드백을 동반해야 한다.
4. 확장형 메뉴는 필요한 곳에만 쓴다.
5. 분석, 운송장, 스토어 연결은 같은 운영 콘솔 안에서 일관된 토큰과 컴포넌트를 공유해야 한다.

## 정보 구조와 메뉴 원칙

### 사이드바
- 데스크톱: mixed sidebar
- direct item과 expandable section을 혼합 사용한다.
- expandable section은 child screen이 2개 이상일 때만 사용한다.
- 활성 페이지는 상위 그룹과 현재 목적지를 함께 드러내야 한다.
- singleton category header는 만들지 않는다.

### 메뉴 구조
- `대시보드`
- `재고 운영`
- `소싱`
  - `외부 공장`
  - `입고 예정`
- `운송장`
- `분석`
- `스토어 연결`
- `설정`

### 메뉴 해석 규칙
- `재고 운영`은 별도 하위 메뉴를 펼치는 구조보다, 들어가면 내부 workspace가 보이는 direct item이 더 적절하다.
- `소싱`은 실제로 2개의 하위 화면이 있으므로 확장형이 적절하다.
- `운송장`과 `분석`은 각각 현재 단일 목적지이므로 top-level direct item으로 두고, 화면이 실제로 분화되기 전까지는 하위 구조를 만들지 않는다.
- `설정` 안에는 기준 데이터, 보안성 설정, 기타 운영 준비 항목을 둘 수 있다.

### 모바일
- 기존 하단 고정 탭은 유지하지 않는다.
- 상단 메뉴 버튼 + sheet/drawer 방식으로 전환한다.
- 자주 쓰는 액션은 페이지 헤더 안 CTA로 노출한다.
- 본문은 14~15px 이하로 내리지 않는다.
- 탭/버튼/입력의 touch target은 44px 이상을 유지한다.
- 기본 좌우 여백은 16px, 카드 간 간격은 12~16px 범위를 유지한다.

## 비주얼 방향

### 테마
- 방향: `Warehouse Console`
- 인상: 중성 슬레이트 기반, 안전/상태 색이 명확한 운영 화면
- 참고 재해석:
  - 1번 레퍼런스의 넓은 테이블 + 필터 툴바
  - 2번 레퍼런스의 카테고리형 좌측 메뉴

### 색상 제안
| 용도 | 토큰 | 제안 값 |
|------|------|---------|
| 앱 배경 | `--background` | `#F5F7FA` |
| 기본 텍스트 | `--foreground` | `#111827` |
| 패널 배경 | `--surface` | `#FFFFFF` |
| 약한 배경 | `--surface-muted` | `#EEF2F6` |
| 강한 배경 | `--surface-strong` | `#E3E8EF` |
| 기본 보더 | `--border` | `#D7DEE7` |
| 강한 보더 | `--border-strong` | `#B9C3D0` |
| 포인트 | `--accent` | `#D97706` |
| 포인트 텍스트 | `--accent-foreground` | `#FFFFFF` |
| 포커스 링 | `--focus-ring` | `#F4C48B` |

### 상태 색상
| 상태 | 의미 | 제안 값 |
|------|------|---------|
| 정상 | 재고 충분/진행 가능 | `#15803D` |
| 주의 | 재고 부족/부분 입고 | `#D97706` |
| 위험 | 품절/실패/오류 | `#DC2626` |
| 정보 | 예정 입고/처리 대기 | `#2563EB` |

## 타이포그래피
- 기본 UI 폰트: `SUIT Variable` 또는 `Pretendard Variable`
- 숫자/코드/참조 ID: `JetBrains Mono`
- 페이지 제목은 짧고 강하게, 설명은 2줄 이내
- 테이블 헤더는 지나치게 작지 않게 유지하되 uppercase 남용을 피한다
- 모바일 기준:
  - page title: 24px 내외
  - section title: 18px 내외
  - body/control text: 14~15px
  - helper/meta text: 12~13px

## 하지 말아야 할 것
| 금지 사항 | 이유 |
|-----------|------|
| 하위 화면이 없는데도 메뉴를 드롭다운으로 만들기 | 정보 구조만 복잡해진다 |
| 재고 운영을 여러 1차 메뉴로 다시 쪼개기 | 창고 담당자의 작업 흐름이 끊긴다 |
| `기준 데이터`를 top-level 핵심 메뉴처럼 강조하기 | 실사용 우선순위와 맞지 않는다 |
| 보라색 위주의 범용 SaaS 룩 | 참고 이미지를 기계적으로 모방한 느낌이 난다 |
| blur/glassmorphism 과한 사용 | 운영 화면 밀도와 가독성을 해친다 |
| 모바일 하단 탭에 모든 메뉴를 몰아넣기 | 기능 확장 이후 탐색성이 급격히 나빠진다 |

## 페이지 패턴

### 1. 재고 운영
- 상단: 페이지 제목 + 설명 + 주요 액션
- 공통 컨텍스트: warehouse selector
- 워크스페이스 전환: `개요`, `입고`, `출고`, `CSV`, `이력`
- 메인 패턴:
  - `개요`: table-first layout with optional summary cards + filter toolbar
  - `입고/출고`: quick entry dialog/sheet + validation + result summary
  - `CSV`: upload block + preview table + error list
  - `이력`: audit table + detail drawer

### 1-1. 빠른 입고/출고 패턴
- 기본 진입은 `빠른 등록` CTA다.
- 데스크톱은 medium-to-large dialog, 모바일은 full-height sheet를 사용한다.
- body는 line-item editor로 구성한다.
- 각 행은 최소 `상품 선택`, `옵션`, `수량`, `비고`를 가진다.
- 다건 입력 편의 기능:
  - 새 행 추가
  - 마지막 행 복제
  - 표 형태 붙여넣기
  - validation 즉시 표시
  - footer에서 총 행 수와 합계 수량 확인
- CSV는 더 큰 배치용 2차 입력 경로로 유지하되, 수동 다건 입력 자체도 충분히 빠르게 만들어야 한다.

### 2. 소싱 > 외부 공장
- 공장 목록은 관리 화면처럼 간결하게
- 이름, 연락 정보, 활성 상태, 최근 예정 건수를 빠르게 스캔 가능해야 한다

### 3. 소싱 > 입고 예정
- 상태 pill과 잔여 수량이 핵심
- `창고로 입고` CTA는 row action 또는 bulk action 형태로 제공한다

### 4. 스토어 연결
- 카드 또는 2열 panel 구조를 사용한다
- provider별 연결 상태, 마스킹된 정보, 최근 갱신 시각을 노출한다
- 목적은 주문 작업이 가능한 준비 상태를 보여주는 것이다

### 5. 운송장
- 업로드 CTA와 provider 상태 summary를 상단에 둔다
- `스토어 연결`과 역할이 겹치지 않게, 여기서는 실제 주문/발송 처리 중심으로 둔다
- 별도 하위 메뉴 구조가 필요할 정도로 화면이 분화되기 전까지는 direct item으로 유지한다

### 6. 분석
- 핵심 요약과 리포트 접근을 제공하는 direct item으로 유지한다
- 세부 리포트가 실제로 2개 이상 의미 있는 목적지로 갈라지기 전까지는 하위 메뉴를 만들지 않는다

## 테이블 원칙
- sticky header 허용
- 행 높이는 48~56px 범위를 유지
- 이미지가 없으면 썸네일보다 옵션/상태 정보에 집중
- 컬럼 수가 많아질 경우 기본/확장 컬럼 체계를 둔다
- 상태 pill은 텍스트 + 색상으로 동시에 구분한다
- 모바일에서는 dense table을 그대로 축소하지 말고 우선순위 컬럼만 남기거나 stacked card로 변환한다

## 필터와 액션 원칙
- 필터와 bulk action은 테이블 상단 같은 시야 안에 둔다
- CSV 업로드는 2차 기능이 아니라 1차 액션으로 노출한다
- 필터 초기화 버튼은 항상 명확하게 제공한다
- 모바일에서는 필터를 collapsible sheet나 2단 요약 bar로 줄여 첫 화면의 데이터 가독성을 우선한다

## Dialog / Sheet 원칙
- 생성/수정/빠른 등록 액션은 공통 overlay 컴포넌트 패턴을 사용한다
- 데스크톱 dialog와 모바일 sheet는 구조만 다르고 정보 순서는 같아야 한다
- 공통 구조:
  - 제목/설명
  - 핵심 컨텍스트
  - 입력 본문
  - 검증/요약
  - footer CTA
- 닫기 위치, CTA 우선순위, 오류 문구 위치를 전 화면에서 통일한다

## 모션
- 허용:
  - 사이드바 그룹 열림/닫힘
  - workspace tab 전환
  - 테이블 행 hover/focus
  - drawer/sheet 진입
- 금지:
  - 과도한 spring
  - 반복적인 펄스/글로우
  - 핵심 데이터를 가리는 전환 애니메이션


---

## .codex/hooks.json

{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "*",
        "handlers": [
          {
            "type": "command",
            "command": "python3 .codex/hooks/session_start.py",
            "timeoutSec": 5
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "matcher": "*",
        "handlers": [
          {
            "type": "command",
            "command": "python3 .codex/hooks/user_prompt_submit.py",
            "timeoutSec": 5
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Bash",
        "handlers": [
          {
            "type": "command",
            "command": "python3 .codex/hooks/pre_tool_use.py",
            "timeoutSec": 5
          }
        ]
      }
    ]
  }
}


---

# Step 2: inventory-operations-hub

## 읽어야 할 파일
- `/Users/yeol-mac/Development/seleccase-inventory/AGENTS.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/PRD.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/ARCHITECTURE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/docs/UI_GUIDE.md`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/components/InventoryView.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/inventory/page.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/inout/InOutForm.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/app/(protected)/history/HistoryView.tsx`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/actions.ts`
- `/Users/yeol-mac/Development/seleccase-inventory/src/lib/data.ts`

## 작업
- `/inventory`를 단일 재고 운영 허브로 개편한다.
- warehouse selector를 공통 컨텍스트로 도입한다.
- 허브 안에서 `개요`, `입고`, `출고`, `CSV`, `이력` workspace 전환을 제공한다.
- 재고 개요 테이블과 요약 영역을 첫 번째 레퍼런스 수준의 밀도로 재설계한다.
- 수동 입고/출고는 quick entry dialog 또는 sheet 기반 다건 입력 UX를 기본으로 설계한다.
- line-item editor, 마지막 행 복제, 표 붙여넣기, inline validation을 고려한다.
- 모바일에서는 table/card 전환, sticky action, 44px tap target, 14px 이상 body text를 만족시킨다.

## Acceptance Criteria
```bash
npm run lint
npm run build
npm run test
```

## 검증 절차
1. 특정 warehouse를 선택하면 summary, table, 입력 흐름이 함께 바뀐다.
2. 기존 입출고/이력 기능이 허브 안에서 연결된다.
3. 빈 상태와 데이터 존재 상태 모두 일관된 workspace shell 안에서 렌더링된다.
4. 2개 이상 아이템 수기 입력이 한 overlay 안에서 완료 가능하다.
5. 모바일에서 주요 액션과 핵심 데이터가 축소로 인해 읽기 어려워지지 않는다.

## 금지사항
- `입고`, `출고`, `이력`을 다시 1차 메뉴 수준으로 분리하지 마라. 이유: 이번 리디자인의 핵심 방향에 역행한다.
- 모델/옵션 정보를 희생하고 창고명만 강조하지 마라. 이유: SKU 수준 운영 판단이 어려워진다.
