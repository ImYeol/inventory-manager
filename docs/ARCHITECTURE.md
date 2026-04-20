# Architecture

## 현재 코드베이스 기준선
```text
src/
├── app/
│   ├── (protected)/
│   │   ├── analytics/
│   │   ├── history/
│   │   ├── inout/
│   │   ├── integrations/
│   │   ├── inventory/
│   │   ├── products/
│   │   ├── settings/
│   │   └── shipping/
│   ├── components/
│   │   ├── DashboardView.tsx
│   │   ├── InventoryView.tsx
│   │   ├── Nav.tsx
│   │   └── inventory/InventoryWorkspace.tsx
│   └── globals.css
├── components/
│   └── ui/
├── lib/
│   ├── actions.ts
│   ├── actions/shipping.ts
│   ├── shipping-credentials.ts
│   ├── api/naver.ts
│   └── api/coupang.ts
└── prisma/schema.prisma
```

핵심 데이터 원장은 이미 존재한다.

- `products`
- `inventory`
- `transactions`
- `shipping_provider_credentials`
- `src/lib/actions/shipping.ts`
- `src/lib/api/naver.ts`
- `src/lib/api/coupang.ts`

이번 패스의 본질은 원장 재작성보다 `route ownership`, `product management ownership`, `inventory table UX`, `settings/store-connection consolidation`, `shipping preview classification`을 다시 정리하는 것이다.

## Global Action Ownership
- 운영 화면의 canonical 구조는 `compact toolbar + primary surface`다.
- 새 기능은 새 카드나 새 설명 섹션으로 풀기 전에, 기존 toolbar나 action rail 안에 흡수 가능한지 먼저 검토한다.
- action ownership은 화면 ownership과 별도로 본다. 데이터에 직접 영향을 주는 액션은 그 데이터를 보여 주는 surface의 toolbar가 canonical owner다.
- navigation은 route owner가 맡고, 데이터 변경 action은 surface owner가 맡는다.
- 설계/구현 단계에서는 component budget을 함께 본다.
  - 전역 액션 수를 최소화했는가
  - provider/tool/action을 compact group으로 묶을 수 있는가
  - 같은 상태를 카드, 배지, 문장, 버튼으로 반복하지 않는가

## 코드 증거 기준 문제 정리

### 1. 상품 관리와 재고 운영의 ownership이 분리되지 않았다
- `src/app/(protected)/master-data/MasterDataManager.tsx`와 `src/app/(protected)/products/page.tsx`는 상품과 창고 기준정보를 다루는 surface인데, 문서 곳곳에서 `기준 데이터`라는 옛 표현이 아직 주인처럼 남아 있다.
- `상품 관리`는 상품/창고 기준정보를 소유하고, `재고 운영`은 수량과 트랜잭션을 소유해야 한다.

### 2. 재고 운영은 허브지만 작업 표면보다 chrome이 크다
- `src/app/components/inventory/InventoryWorkspace.tsx`는 헤더, 탭, 상단 CTA, 요약 배지, 탭 내부 보조 문장, overlay CTA가 한 파일에 몰려 있다.
- 재고 목록과 이력은 표 자체가 reference-grade 작업 표면으로 기능해야 한다.

### 3. 빠른 입출고가 고정 모드가 아니다
- `src/app/(protected)/inout/InOutForm.tsx`는 `initialType`으로 열어도 내부에서 다시 `입고/출고`를 전환할 수 있다.
- 같은 컴포넌트 안에 `표 붙여넣기` 패널까지 들어 있어, 빠른 입력 팝업이 최소 입력 surface가 되지 못한다.

### 4. 스토어 연결 ownership이 분산돼 있다
- `src/app/(protected)/integrations/IntegrationsView.tsx`는 summary + credential form을 소유한다.
- `src/app/(protected)/settings/SettingsView.tsx`는 다시 스토어 연결을 언급한다.
- `src/app/components/Nav.tsx`는 `스토어 연결`을 top-level direct item으로 유지한다.

### 5. 운송장은 실행 흐름보다 연결 안내가 먼저 보인다
- `src/app/(protected)/shipping/ShippingView.tsx`는 업로드 상단 배지, 별도 `연동 준비 상태` 섹션, 채널별 미연결 카드와 이동 버튼을 중복 노출한다.
- 업로드 후 표는 원본 엑셀만 보여 주고, 사용자가 실제로 필요로 하는 `채널 분류 결과`는 row surface에 통합되지 않았다.

## 목표 정보 구조
```text
대시보드 (/)
└── analytics section
상품 관리 (/products)
├── 상품
└── 창고
재고 운영 (/inventory)
소싱
├── 외부 공장 (/sourcing/factories)
└── 입고 예정 (/sourcing/arrivals)
운송장 (/shipping)
설정 (/settings)
└── 스토어 연결
```

## 라우트 전략

### Canonical routes
- `/`: KPI, 최근 활동, dashboard-owned analytics section
- `/products`: 상품과 창고 기준정보 canonical owner
- `/inventory`: 재고 운영 landing
- `/inventory?tab=list|history|inbound|outbound`: 목록, 이력, 빠른 입력 중심 워크스페이스
- `/inventory/csv`: 필요 시 분리되는 대량 반영 workspace
- `/inventory/history`: 필요 시 분리되는 이력 workspace
- `/shipping`: 엑셀 업로드, 분류 미리보기, 매칭/발송
- `/settings`: 스토어 연결
- `/analytics`: 독립 화면이 아니라 `/`로 보내는 legacy redirect
- `/integrations`: legacy alias 또는 redirect 후보
- `/master-data`: legacy alias, redirect to `/products`
- `/settings/master-data`: legacy alias, redirect to `/products`

### Ownership matrix
- `/`
  - KPI summary
  - dashboard-owned analytics section
  - recent activity / attention tables
- `/products`
  - 상품 속성 관리
  - 창고 속성 관리
  - product/warehouse master data deep link
- `/inventory`
  - 창고 컨텍스트
  - dense list table
  - history table
  - column filters / visibility
  - quick inbound / quick outbound entry
- `/inventory/csv`
  - 대량 파일 반영과 preview
- `/inventory/history`
  - 감사성 조회와 상세 이력
- `/shipping`
  - 업로드
  - 분류 미리보기
  - 채널별 매칭/발송
- `/settings`
  - 네이버/쿠팡 연결 상태, 연결/변경 폼
- `/analytics`
  - standalone owner 없음
  - redirect only
- `/integrations`
  - 별도 owner가 아니라 `/settings`로 보내는 호환 경로

같은 provider summary나 credential form이 두 route 이상에 존재하면 component reuse 문제가 아니라 ownership 오류로 본다.

## Dashboard-Owned Analytics Architecture

- dashboard는 KPI 섹션과 분석 차트 섹션을 함께 소유한다.
- 유지 차트는 `거래 추이`, `재고 추이`, `창고별 변동 비교` 3개다.
- 각 차트는 자신만의 local control strip를 가진다.
  - `modelId`
  - `dateFrom`
  - `dateTo`
  - 필요 시 `period`
- `ModelPieChart`와 모델 요약 표는 dashboard-owned analytics에서 제거한다.
- `src/lib/actions/analytics.ts`는 차트별로 독립적으로 다시 계산할 수 있게 날짜 범위 인자를 받는다.

## Inventory Architecture

### 1. List surface
- list view는 `filter toolbar + data table`이 중심이다.
- list-management screen은 toolbar 바로 아래 primary table을 두고, 같은 테이블 위에 별도 section title/subtitle/count chrome을 반복하지 않는다.
- page header가 필요한 경우에도 table 위에 중복 설명을 다시 붙이지 않는다.
- 필터 상태는 최소 다음을 가진다.
  - `warehouseId`
  - `search`
  - `status`
  - `visibleColumns`
- 필요 시 query param으로 직렬화해 deep link와 back/forward를 유지한다.
- history view는 같은 필터 체계를 공유하되 변경 이력과 감사성 메타데이터를 더 강조한다.

### 2. Quick entry overlay
- 입고와 출고는 같은 editor primitive를 재사용하되, 상위 route에서 mode를 고정해 전달한다.
- overlay 내부에서 mode를 다시 고르지 않는다.
- overlay는 다음 구조만 가진다.
  - title
  - context row
  - editable rows table
  - validation + footer CTA
- `표 붙여넣기`와 별도 bulk import panel은 `CSV` route로 이동시킨다.

### 3. Child route graduation
- `CSV`와 `이력`이 list/inbound/outbound와 같은 화면에 있을 때 헤더/CTA/필터가 반복되면 child route로 승격한다.
- 그래도 `재고 운영`은 하나의 first-level domain으로 유지한다.
- nav는 top-level 추가 항목을 늘리는 대신 inventory 내부 subnav 또는 workspace tabs로 처리한다.

## Product Management Architecture

### Canonical owner
- `/products`가 상품과 창고 기준정보의 canonical owner다.
- `상품` view는 SKU, 옵션, 상태, 표시명 같은 상품 속성을 편집한다.
- `창고` view는 창고명, 사용 여부, 코드, 운영 메모 같은 창고 속성을 편집한다.
- `재고 운영`은 이 정보를 읽어오지만, 기준정보 자체를 편집하지 않는다.

### Legacy compatibility
- `/master-data`와 `/settings/master-data`는 canonical route가 아니라 `/products`로 보내는 호환 경로다.
- `기준 데이터`는 사용자 IA에서 별도 목적지가 아니라 상품 관리의 과거 표현으로만 남는다.

## Settings / Store Connections Architecture

### Canonical owner
- `settings`가 네이버/쿠팡 연결 상태와 credential 편집의 단일 owner다.
- 저장소는 기존 `shipping_provider_credentials`를 재사용한다.
- 쿠팡 credential payload는 `accessKey`, `secretKey`, `vendorId`, `defaultDeliveryCompanyCode`를 함께 저장한다.
- provider별 deep link는 query param 또는 section id로 처리한다.
  - 예: `/settings?section=store-connections&provider=naver`

### Legacy compatibility
- `/integrations`가 유지된다면 독립된 form을 렌더링하지 않는다.
- 최소 구현은 redirect 또는 thin wrapper다.

## Shipping Classification Flow

### Data flow
1. 사용자가 엑셀 업로드
2. 시트 파싱으로 courier rows 생성
3. 쿠팡은 courier row의 날짜 컬럼 범위를 기준으로 `GET /api/v5/vendors/{vendorId}/ordersheets`를 조회하고, 필요 시 `nextToken`으로 다음 페이지를 이어서 수집한다.
4. 연결된 provider만 주문 조회
5. 이름/주소 정규화 비교
6. 각 업로드 row에 classification 부여
7. classification 필터로 preview table 조정
8. provider별 발송 payload 계산

### Row classification model
```text
shipping_preview_rows
- source_row_index
- recipient_name
- address
- tracking_number
- channel_badge        # naver | coupang | unclassified | ambiguous
- classification_source # auto | manual
- naver_order_ref
- coupang_shipment_ref # shipmentBoxId + orderId + vendorItemIds[]
- match_reason
```

### Matching rule
- 이름은 trim 후 정확 일치 기준을 우선한다.
- 주소는 공백 제거 + lowercasing 후 포함 관계를 본다.
- 쿠팡 shipment 후보가 2개 이상이면 `ambiguous`로 표시하고 자동 발송 대상에서 제외한다.
- 두 provider가 동시에 매칭되면 `ambiguous`로 표시하고 자동 발송 대상에서 제외한다.
- 어떤 provider도 매칭되지 않으면 `unclassified`로 남긴다.

### Shipping UI contract
- 별도 `연동 준비 상태` 섹션은 두지 않는다.
- 업로드 직후 표 아래 첫 surface가 분류 미리보기가 되어야 한다.
- 미연결 provider는 비활성 안내가 아니라 활성 `연결` 버튼으로 노출한다.
- 버튼은 canonical settings section으로 이동해야 한다.
- `/shipping`에서 provider action의 canonical owner는 preview toolbar다.
- preview toolbar는 `분류 필터 + provider action group` 구조를 기본으로 한다.
- provider action group은 `상태 chip + 갱신 + 반영`을 한 묶음으로 둔다.
- `중복 후보`는 row badge와 summary count에는 남길 수 있지만, 기본 filter set의 canonical 대상은 아니다.
- 자동 분류 후 사용자가 바꾼 row는 `classification_source=manual`로 보호하고, provider 갱신 시 분류값을 덮어쓰지 않는다.
- 운송장 번호가 없는 row도 preview에는 남기되, provider 반영 payload에서는 제외한다.
- 쿠팡 반영 payload는 `POST /api/v4/vendors/{vendorId}/orders/invoices`와 `orderSheetInvoiceApplyDtos[]`를 사용한다.
- 쿠팡 v1 업로드는 `splitShipping=false`, `preSplitShipped=false`, `estimatedShippingDate=""`, `deliveryCompanyCode=defaultDeliveryCompanyCode`를 기본값으로 사용한다.

## Shared Component Strategy

### Existing support
- TypeScript 5와 Tailwind CSS v4는 이미 설치되어 있다.
- `framer-motion`과 `lucide-react`도 이미 의존성에 포함되어 있다.
- `@/*` alias가 있으므로 shadcn-style shared primitive 경로는 root `/components/ui`가 아니라 `src/components/ui`가 맞다.
- `components.json`이 아직 없어도 경로 기준은 바꾸지 않는다.
- UI 구현은 shared theme, component, primitive, design token을 우선 재사용한다.
- 새 컴포넌트가 필요하면 먼저 existing shared source로 수렴할 수 있는지 검토하고, 검토 결과는 `docs/UI_GUIDE.md`와 hooks 검사 규칙과 맞춰 본다.
- page-level UI에서 임의의 색상/보더/배경 inline style을 직접 넣지 않는다. 필요한 시맨틱은 `src/app/components/ui.tsx`, `src/app/globals.css`, `src/components/ui/*`에 variant나 token으로 올린다.
- hooks는 UI 변경 명령 payload의 `command`와 `cmd`를 모두 해석해 docs 동반 검토를 확인한다.
- strong card가 header/body를 함께 담는 경우, 절반만 살아 있는 seam이나 corner gap을 page-local border patch로 메우지 않는다. shared card/surface primitive의 variant와 padding/token을 고쳐서 하나의 clipped surface로 정리한다.

### External table example adaptation
- 제공된 `project-data-table.tsx` 예시는 그대로의 도메인 필드가 아니라 `table layout`, `column visibility`, `row motion`, `dropdown interaction` 패턴만 가져온다.
- canonical 위치는 `src/components/ui/project-data-table.tsx` 또는 더 구체적인 `src/components/ui/inventory-data-table.tsx`다.
- demo의 repository/contributors/avatar/Unsplash 자산은 final inventory table에 필요하지 않으므로 그대로 들여오지 않는다.
- 구현 단계에서만 다음 누락 의존성을 추가 검토한다.
  - `class-variance-authority`
  - `@radix-ui/react-slot`
  - `@radix-ui/react-icons`
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-avatar`

### Canonical primitive ownership
```text
src/components/ui/
├── card.tsx
├── select.tsx
├── tabs.tsx
├── modal.tsx
├── basic-data-table.tsx
├── table.tsx
├── badge-1.tsx
├── inventory-data-table.tsx
├── filter-toolbar.tsx
├── column-visibility-menu.tsx
├── shipping-classification-badge.tsx
├── store-connection-status.tsx
└── store-connection-row.tsx
```

- `product-management-table`이 필요해지면 `inventory-data-table`과 같은 규칙으로 `src/components/ui` 아래에 둔다.
- `src/app/components/ui.tsx`는 class preset bridge 역할만 유지한다.
- 새 shared component는 root `/components/ui`에 만들지 않는다.
- 상단 tabs는 같은 route 내부의 view switch에만 쓰고, toolbar는 filter/action cluster만 맡는다.
- bordered container의 canonical language는 shared surface/card variants다. 설명용 카드와 상태 카드의 중첩은 구조 오류로 본다.
- 선택형 dropdown은 `src/components/ui/select.tsx`만 canonical owner다.
- console 내부 새 선택 입력은 native `<select>`를 추가하지 않는다.

## Product Management Architecture

### Table-first workspace
- `/products`는 `상품`과 `창고`를 tabs로 나누되, 두 탭 모두 `toolbar + table + modal action` 구조를 공유한다.
- `상품` 탭은 `createModel -> createModelSize/createModelColor` 조합 액션으로 최소 modal 생성 흐름을 갖는다.
- 신규 색상 생성은 공통 기본값을 적용한다.
  - `rgbCode='#111827'`
  - `textWhite=true`
- `BasicDataTable`는 table-first workspace에서 재사용되며 선택적으로 다음 row interaction API를 가진다.
  - `onRowClick`
  - `rowAriaLabel`
  - `getRowClassName`

## Sourcing Architecture

### Factories
- `/sourcing/factories`는 `toolbar + factories table + detail modal + register modal` 구조다.
- 테이블은 검색/상태 필터를 기준으로 행을 좁히고, 상세 modal에서 활성/비활성 토글을 수행한다.

### Arrivals
- `/sourcing/arrivals`는 staged arrival 등록과 remaining quantity receive flow를 한 화면에서 처리한다.
- 공장/모델/사이즈/색상/창고 선택은 shared select primitive를 사용한다.

## Validation impact
- product management redirect / deep-link tests가 필요하다.
- inventory filter logic는 view-level tests가 필요하다.
- quick entry mode locking은 form interaction tests가 필요하다.
- settings connection ownership 변경은 redirect/deep-link tests가 필요하다.
- shipping classification은 parsing/matching unit tests와 preview rendering tests가 필요하다.
