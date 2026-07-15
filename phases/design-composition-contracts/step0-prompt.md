# Codex Harness Prompt

- Project: Seleccase Inventory
- Phase: design-composition-contracts
- Step: 0 (formalize-card-composition-contract)
- Branch: feat-design-composition-contracts

## Execution Rules

1. Execute only this step and keep earlier completed work consistent.
2. Read the step file and AGENTS.md before editing.
3. Run the step acceptance criteria directly.
4. Update `phases/design-composition-contracts/index.json` directly when the step is done.
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
- UI/시각 토큰의 SoT는 `docs/DESIGN.md`, 모션의 SoT는 `docs/MOTION.md`다. 컴포넌트에 색상/크기/radius/duration을 하드코딩하지 말고 토큰만 사용한다.
- 컴포넌트 재사용의 SoT는 `docs/COMPONENTS.md`다.

개발 프로세스
- CRITICAL: 새 기능 구현 시 반드시 테스트를 먼저 작성하고, 테스트가 통과하는 구현을 작성한다.
- 커밋 메시지는 conventional commits 형식을 따른다. (`feat:`, `fix:`, `docs:`, `refactor:`)
- UI/기획 작업 시에는 `Simple Surface First` 원칙을 따른다.
  - 새 카드/새 섹션을 추가하기 전에 기존 toolbar, table, header, action rail 안에서 해결 가능한지 먼저 검토한다.
  - shared primitive를 우선 재사용하고, 화면별 component budget을 점검한다.
  - 버튼 라벨은 짧은 동사를 우선하고, 같은 상태를 여러 요소로 반복하지 않는다.
  - 운영 toolbar는 높이 안정성을 먼저 검토하고, wrap으로 문제를 해결하지 않는다.
  - 기본 필터는 `자주 바꾸는 핵심 조회 조건`만 노출한다. row에 이미 보이는 감사/참조 메타는 기본 필터로 올리지 않는다.
  - embedded 탭도 standalone view와 같은 filter vocabulary를 유지한다. filterable field를 read-only pill로 바꾸지 않는다.
  - 탭 전환 후 유지되어야 하는 필터 상태는 부모 workspace가 소유한다. shared view는 controlled props를 우선 검토한다.
  - multi-row toolbar는 역할별로 나눈다. `select row`, `query row`, `meta cluster`를 섞지 않는다.

메모리 정책 (계약 vs 학습 분리)
- 이 저장소의 커밋된 문서(`AGENTS.md`, `docs/*`)는 **지시(instruction) 층**이다: 모든 기여자·에이전트를 규율하는 규칙·정책·토큰 값·아키텍처 결정. 리뷰·버전관리 대상이며 결정적이어야 한다.
- 에이전트 개인 메모리(예: Claude의 `~/.claude/.../memory/`)는 **학습(learning) 층**이다: 특정 사용자의 취향, 교정과 그 이유, 진행 중 맥락, gotcha, 외부 링크. 커밋하지 않는다.
- CRITICAL: 두 층의 내용을 중복하지 않는다. 규칙은 이 문서/`docs`에만 두고, 메모리는 규칙을 재서술하지 말고 문서 경로로 링크만 한다. 이유: 경험 노트가 핵심 규칙을 오염시키면 에이전트 행동이 불안정해진다.
- 저장 위치 판단: "모든 기여자를 규율하며 리뷰 대상인가?" → 예면 `AGENTS.md`/`docs`, 아니오(개인 취향·이유·세션 맥락)면 메모리.

명령어
- `npm run dev`
- `npm run build`
- `npm run lint`
- `npm run test`


---

# Step 0: formalize card composition contract

## Read first

- AGENTS.md
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/UI_GUIDE.md
- docs/COMPONENTS.md
- docs/DESIGN.md
- docs/MOTION.md
- docs/ADR.md
- src/app/globals.css
- src/app/components/ui.tsx
- src/components/ui/card.tsx
- src/components/ui/store-connection-row.tsx
- tests/settings-view.test.ts
- tests/ui-token-presets.test.ts
- .codex/hooks/ui-review-guard.sh
- .codex/hooks/test_hooks.py
- phases/card-divider-rhythm-guardrail/step0.md

## Goal

Replace the prose-only `Card divider rhythm` rule with a reusable, machine-readable card composition contract. The contract must describe the same component/variant names that a Figma library can use, and the React Card primitive plus harness checks must consume or verify it. A divided card must guarantee token-based body inset by default; a deliberately continuous data surface must opt in explicitly.

## Required sequence

1. Write focused regression tests before implementation. Include a contract validation test that fails when a contract token reference does not exist in `src/app/globals.css`, and a Card primitive test that proves the default divided composition keeps the body inset while continuous composition is an explicit variant.
2. Add one vendor-neutral, machine-readable design contract artifact under a stable design-system path. It must use references to existing CSS tokens only, not duplicate literal token values. Include Figma-facing component/variant/property names (`Card`, `surface`, `contentLayout`) so a Figma library can mirror it without a second naming system.
3. Extend the shared Card primitive with a semantic composition API. Preserve current default behavior and preserve an explicit continuous/flush opt-in for data surfaces. Do not allow individual settings screens to encode divider spacing through local padding overrides.
4. Migrate the store connection surface to the semantic divided composition. Migrate existing intentional `CardContent` flush usages only where necessary so the rendered UI remains unchanged.
5. Add a repository-local, deterministic design-contract check that validates token references and Card composition API/contract alignment. Wire it into `npm run test` or an existing focused test without requiring network or Figma credentials.
6. Update DESIGN.md, COMPONENTS.md, UI_GUIDE.md, ARCHITECTURE.md, and ADR.md to reference the contract artifact and establish the rule: documentation explains intent; the contract artifact defines component composition; code and harness verify it. Avoid duplicating individual component cases in prose.
7. Update the UI review harness message and its regression test so UI changes must check the composition contract rather than enumerate divider cases.

## Constraints

- Do not add literal spacing, color, radius, or duration values to the new contract. Reason: `src/app/globals.css` remains the value source of truth.
- Do not introduce a Figma API integration, plugin, credentials, or generated Figma file. Reason: this repository needs a portable contract that is ready for Figma mapping without external-state dependencies.
- Do not alter server actions, credential masking/deletion behavior, provider API logic, or database schema. Reason: this is design-system and harness scope only.
- Do not add page-local `pt-*`, `p-*`, border, or background patches to solve card composition. Reason: the semantic Card API must own this relationship.
- Do not change `src/app/globals.css`. Reason: the existing token source is sufficient; this step formalizes composition, not token values.

## Acceptance

    npm run test -- --run tests/design-contracts.test.ts tests/settings-view.test.ts tests/ui-token-presets.test.ts
    python3 .codex/hooks/test_hooks.py
    npm run lint
    npm run build

Record results in `step0-output.json` and update the phase index.

