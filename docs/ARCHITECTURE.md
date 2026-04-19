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

즉, 이번 작업의 본질은 원장 재작성보다 `정보 구조`, `운영 UX`, `소싱 도메인 확장`, `연동 도메인 재배치`였고, 단계 0-4를 거치며 route ownership과 shared primitive ownership은 이미 정리되었다.

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

## 재검토 결과와 정리된 대응

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

### 5. shared primitive의 소유권이 분리되어 UI가 drift하기 쉬웠다
- 현재 기준으로 `src/components/ui/*`가 shared primitive의 주 소유권을 갖고 있고, `src/app/components/ui.tsx`는 class preset과 page helper를 담는 얇은 레이어다.
- 이 구조 덕분에 status pill, menu item, action cluster, section header를 page-local className으로 다시 만드는 drift를 줄였다.
- 해결: reusable primitive는 `src/components/ui/*`를 기준으로 유지하고, `src/app/components/ui.tsx`는 page helper registry 역할에 둔다.

### 6. `/shipping`, `/integrations`, `/settings`의 route 책임이 겹쳤다
- `IntegrationsView`와 `SettingsView`는 provider summary와 입력 form이 거의 동일하다.
- `ShippingView`도 업로드/발송 화면 안에 provider summary, 누락 채널 경고, 연결 유도 CTA를 반복한다.
- 해결: `/integrations`는 연결 준비와 credential 저장, `/shipping`은 실행 흐름, `/settings`는 관리자 설정으로 역할을 재분리한다.

### 7. 재고 운영 허브는 맞지만 구현 surface가 한 파일에 과밀해졌다
- `InventoryWorkspace`는 헤더, 창고 컨텍스트, 탭, 액션, 개요 테이블, 빠른 입력, CSV, 이력, overlay까지 한 컴포넌트에 모여 있다.
- 허브 구조 자체는 맞지만, CTA 반복과 helper copy 누적 때문에 실제 사용 밀도보다 chrome이 먼저 보이게 되었다.
- 해결: 허브는 유지하되 section component 분리, secondary detail surface, shared toolbar/badge primitive로 밀도를 다시 정리한다.

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

### Screen ownership matrix
- `/inventory`: 창고 컨텍스트, overview/inbound/outbound/csv/history workspace, quick entry, dense tables
- `/shipping`: 업로드, 미리보기, provider 주문 조회, 매칭, 발송
- `/integrations`: provider 연결 상태, masked summary, 최근 갱신 시각, credential 입력/갱신
- `/settings`: 기준 데이터와 운영 관리자 기능
- `/analytics`: 리포트 조회와 요약 시각화

이 ownership matrix를 넘는 중복이 생기면 component 재사용 문제가 아니라 route 책임 문제로 본다.

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

향후 shared primitive 수렴 방향은 아래와 같다.

```text
src/components/ui/
├── badge-1.tsx
├── status-badge.tsx
├── icon-button.tsx
├── toolbar.tsx
├── menu.tsx
├── basic-data-table.tsx
└── table.tsx
```

- 외부 예제를 도입할 때도 root `/components/ui`가 아니라 `src/components/ui`를 사용한다.
- `components.json`이 아직 없더라도 path 기준은 `src` alias에 맞춰 유지한다.

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
