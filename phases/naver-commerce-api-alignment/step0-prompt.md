# Codex Harness Prompt

- Project: Seleccase Inventory
- Phase: naver-commerce-api-alignment
- Step: 0 (align-naver-auth-products-and-orders)
- Branch: feat-naver-commerce-api-alignment

## Execution Rules

1. Execute only this step and keep earlier completed work consistent.
2. Read the step file and AGENTS.md before editing.
3. Run the step acceptance criteria directly.
4. Update `phases/naver-commerce-api-alignment/index.json` directly when the step is done.
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

# Step 0: align-naver-auth-products-and-orders

## Read first

- `AGENTS.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/UI_GUIDE.md`
- `docs/ADR.md`
- `src/lib/api/naver.ts`
- `src/lib/api/coupang.ts`
- `tests/naver-api.test.ts`
- `tests/order-sync.test.ts`
- `tests/shipping-actions.test.ts`
- `phases/naver-commerce-api-alignment/index.json`

## Goal

Align the server-only Naver Commerce integration with the current official API contract used by product sync and order/tracking workflows, while leaving the separate Coupang HMAC integration unchanged.

## Required sequence

1. Add focused regression tests before implementation. They must prove that Naver's OAuth token request uses the provider's bcrypt-plus-Base64 `client_secret_sign`, sends the required client-credentials parameters, and never exposes the Client Secret in a request or error.
2. Add tests for the Naver product-list request and order workflow: product sync uses `POST /v1/products/search`; changed-order lookup uses `GET /v1/pay-order/seller/product-orders/last-changed-statuses` with query parameters; detailed order lookup and dispatch preserve bearer-token server requests.
3. Implement the Naver bcrypt signing dependency and request handling. Keep this logic in `src/lib/api/naver.ts`; no client component may access provider credentials or call Naver directly.
4. Correct changed-order lookup to use the documented GET/query contract and collect every continuation page using the documented `more.moreFrom` and `more.moreSequence` cursor. Then fetch order details in chunks no larger than the documented maximum, and retain only pending/shippable order rows expected by the existing workflow.
5. Keep Naver and Coupang authentication code separate: do not modify Coupang's CEA HMAC signing, endpoint paths, headers, or credential payload.
6. Add a concise repository document that records the verified Naver endpoints and explicitly scopes unimplemented product registration/edit APIs out of the current read/sync and tracking workflow.

## Constraints

- Do not log, store in tests, or return a literal Client Secret or bearer token. Reason: provider credentials are server-only secrets.
- Do not change product-name mapping or automatically link products by similarity. Reason: `ChannelProductRef` mapping remains exact-SKU/manual only.
- Do not add product-registration UI or call write APIs outside the existing tracking dispatch. Reason: this task validates and corrects the current product/order/tracking scope, not a catalog publishing feature.
- Do not change `src/lib/api/coupang.ts`. Reason: Coupang uses a distinct CEA HMAC contract and is out of this Naver alignment scope.

## Acceptance

    npm run test -- --run tests/naver-api.test.ts tests/channel-product-sync.test.ts tests/order-sync.test.ts tests/shipping-actions.test.ts
    npm run lint
    npm run build
    npm run test

Record results in `step0-output.json` and update the phase index.

