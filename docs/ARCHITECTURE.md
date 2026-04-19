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
│   │   ├── settings/
│   │   └── shipping/
│   ├── components/
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

- `inventory`
- `transactions`
- `shipping_provider_credentials`
- `src/lib/actions/shipping.ts`
- `src/lib/api/naver.ts`
- `src/lib/api/coupang.ts`

이번 패스의 본질은 원장 재작성보다 `route ownership`, `inventory table UX`, `settings/store-connection consolidation`, `shipping preview classification`을 다시 정리하는 것이다.

## 코드 증거 기준 문제 정리

### 1. 재고 운영은 허브지만 작업 표면보다 chrome이 크다
- `src/app/components/inventory/InventoryWorkspace.tsx`는 헤더, 탭, 상단 CTA, 요약 배지, 탭 내부 보조 문장, overlay CTA가 한 파일에 몰려 있다.
- 개요 화면은 창고 선택 외에 상품/상태/컬럼 필터가 없고, 표 자체가 reference-grade 작업 표면으로 기능하지 못한다.

### 2. 빠른 입출고가 고정 모드가 아니다
- `src/app/(protected)/inout/InOutForm.tsx`는 `initialType`으로 열어도 내부에서 다시 `입고/출고`를 전환할 수 있다.
- 같은 컴포넌트 안에 `표 붙여넣기` 패널까지 들어 있어, 빠른 입력 팝업이 최소 입력 surface가 되지 못한다.

### 3. 스토어 연결 ownership이 분산돼 있다
- `src/app/(protected)/integrations/IntegrationsView.tsx`는 summary + credential form을 소유한다.
- `src/app/(protected)/settings/SettingsView.tsx`는 다시 스토어 연결을 언급한다.
- `src/app/components/Nav.tsx`는 `스토어 연결`을 top-level direct item으로 유지한다.

### 4. 운송장은 실행 흐름보다 연결 안내가 먼저 보인다
- `src/app/(protected)/shipping/ShippingView.tsx`는 업로드 상단 배지, 별도 `연동 준비 상태` 섹션, 채널별 미연결 카드와 이동 버튼을 중복 노출한다.
- 업로드 후 표는 원본 엑셀만 보여 주고, 사용자가 실제로 필요로 하는 `채널 분류 결과`는 row surface에 통합되지 않았다.

## 목표 정보 구조
```text
대시보드 (/)
재고 운영 (/inventory)
소싱
├── 외부 공장 (/sourcing/factories)
└── 입고 예정 (/sourcing/arrivals)
운송장 (/shipping)
분석 (/analytics)
설정 (/settings)
├── 기준 데이터
└── 스토어 연결
```

## 라우트 전략

### Canonical routes
- `/inventory`: 재고 운영 landing
- `/inventory?tab=overview|inbound|outbound`: overview와 빠른 입력 중심 워크스페이스
- `/inventory/csv`: 필요 시 분리되는 대량 반영 workspace
- `/inventory/history`: 필요 시 분리되는 이력 workspace
- `/shipping`: 엑셀 업로드, 분류 미리보기, 매칭/발송
- `/settings`: 기준 데이터 + 스토어 연결
- `/integrations`: legacy alias 또는 redirect 후보

### Ownership matrix
- `/inventory`
  - 창고 컨텍스트
  - dense overview table
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
  - 기준 데이터
  - 네이버/쿠팡 연결 상태, 연결/변경 폼
- `/integrations`
  - 별도 owner가 아니라 `/settings`로 보내는 호환 경로

같은 provider summary나 credential form이 두 route 이상에 존재하면 component reuse 문제가 아니라 ownership 오류로 본다.

## Inventory Architecture

### 1. Overview surface
- overview는 `filter toolbar + data table`이 중심이다.
- 필터 상태는 최소 다음을 가진다.
  - `warehouseId`
  - `search`
  - `status`
  - `visibleColumns`
- 필요 시 query param으로 직렬화해 deep link와 back/forward를 유지한다.

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
- `CSV`와 `이력`이 overview/inbound/outbound와 같은 화면에 있을 때 헤더/CTA/필터가 반복되면 child route로 승격한다.
- 그래도 `재고 운영`은 하나의 first-level domain으로 유지한다.
- nav는 top-level 추가 항목을 늘리는 대신 inventory 내부 subnav 또는 workspace tabs로 처리한다.

## Settings / Store Connections Architecture

### Canonical owner
- `settings`가 네이버/쿠팡 연결 상태와 credential 편집의 단일 owner다.
- 저장소는 기존 `shipping_provider_credentials`를 재사용한다.
- provider별 deep link는 query param 또는 section id로 처리한다.
  - 예: `/settings?section=store-connections&provider=naver`

### Legacy compatibility
- `/integrations`가 유지된다면 독립된 form을 렌더링하지 않는다.
- 최소 구현은 redirect 또는 thin wrapper다.

## Shipping Classification Flow

### Data flow
1. 사용자가 엑셀 업로드
2. 시트 파싱으로 courier rows 생성
3. 연결된 provider만 주문 조회
4. 이름/주소 정규화 비교
5. 각 업로드 row에 classification 부여
6. classification 필터로 preview table 조정
7. provider별 발송 payload 계산

### Row classification model
```text
shipping_preview_rows
- source_row_index
- recipient_name
- address
- tracking_number
- channel_badge        # naver | coupang | unclassified | ambiguous
- matched_provider
- matched_order_ref
- match_reason
```

### Matching rule
- 이름은 trim 후 정확 일치 기준을 우선한다.
- 주소는 공백 제거 + lowercasing 후 포함 관계를 본다.
- 두 provider가 동시에 매칭되면 `ambiguous`로 표시하고 자동 발송 대상에서 제외한다.
- 어떤 provider도 매칭되지 않으면 `unclassified`로 남긴다.

### Shipping UI contract
- 별도 `연동 준비 상태` 섹션은 두지 않는다.
- 업로드 직후 표 아래 첫 surface가 분류 미리보기여야 한다.
- 미연결 provider는 비활성 안내가 아니라 활성 `연결` 버튼으로 노출한다.
- 버튼은 canonical settings section으로 이동해야 한다.

## Shared Component Strategy

### Existing support
- TypeScript 5와 Tailwind CSS v4는 이미 설치되어 있다.
- `framer-motion`과 `lucide-react`도 이미 의존성에 포함되어 있다.
- `@/*` alias가 있으므로 shadcn-style shared primitive 경로는 root `/components/ui`가 아니라 `src/components/ui`가 맞다.
- `components.json`이 아직 없어도 경로 기준은 바꾸지 않는다.

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
├── basic-data-table.tsx
├── table.tsx
├── badge-1.tsx
├── inventory-data-table.tsx
├── filter-toolbar.tsx
├── column-visibility-menu.tsx
├── shipping-classification-badge.tsx
└── store-connection-row.tsx
```

- `src/app/components/ui.tsx`는 class preset bridge 역할만 유지한다.
- 새 shared component는 root `/components/ui`에 만들지 않는다.

## Validation impact
- inventory filter logic는 view-level tests가 필요하다.
- quick entry mode locking은 form interaction tests가 필요하다.
- settings connection ownership 변경은 redirect/deep-link tests가 필요하다.
- shipping classification은 parsing/matching unit tests와 preview rendering tests가 필요하다.
