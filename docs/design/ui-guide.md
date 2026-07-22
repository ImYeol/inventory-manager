# UI Guide

## Source Of Truth
- UI/UX 원칙과 shared primitive 규칙의 source of truth는 이 문서다. 시각 토큰·모션의 근거 문서는 [DESIGN.md](./DESIGN.md)이며, 값 자체의 SoT는 `src/app/globals.css`와 `components.json`이다.
- 토큰은 `src/app/globals.css`에, page-level preset은 `src/app/components/ui.tsx`에, shared primitive는 `src/components/ui`에 둔다.

## 컴포넌트 경로 규칙
- 이 저장소의 shadcn-style 기본 경로는 root `/components/ui`가 아니라 `src/components/ui`다.
- `@/*` alias와 현재 디렉터리 구조를 기준으로 shared component는 모두 `src/components/ui`에 수렴시킨다.
- 두 번째 component tree를 만들지 않는다.

## Stack Support
- TypeScript 5와 Tailwind CSS v4는 이미 설치되어 있다.
- `framer-motion`과 `lucide-react`도 이미 포함되어 있다.
- 새 shared component는 현재 토큰과 경로 규칙에 맞게 적응한 뒤 도입한다.

## 디자인 목표
이 제품은 매일 반복해서 쓰는 운영 콘솔이다. 표를 빨리 읽고, 필터를 바로 바꾸고, 입력 팝업을 최소 단계로 끝내는 것이 시각적 장식보다 우선이다. 상품 관리, 재고 운영, 설정, 운송장은 각각 다른 일을 맡아야 하고, 같은 surface를 이름만 바꿔 반복하지 않는다.

## 핵심 원칙

### 상품 관리

- 상품 탭은 검색, 고정 보기, 동기화, 내부 상품 등록, 채널 상품 table을 항상 함께 보여주는 table-first surface다.
- 미연결 채널 상품은 별도 안내 card가 아니라 table의 `연결 필요` badge 행으로 보여준다.
- 연결 modal은 `ProductVariantCombobox`를 재사용한다. 정확히 하나 일치하는 판매자 SKU만 제안 선택할 수 있고, 상품명 자동 매칭은 금지한다.
- 내부 상품 등록에는 상품명, 선택형 사이즈·색상 값, SKU prefix만 둔다. 옵션이 없는 단일 SKU는 사이즈·색상을 비워 등록할 수 있으며 색상 hex·텍스트 방향은 업무 입력이 아니다.
1. 상품 관리는 상품/창고 기준정보의 top-level surface다.
2. 대시보드는 KPI와 분석을 같은 surface에서 보여준다.
3. 재고 운영은 list/history-first다.
4. title, subtitle, helper copy는 최소화한다.
5. 상태는 badge와 표 셀에서 먼저 보이고, 설명 문장·label·배지에 같은 상태명을 반복하지 않는다.
6. 하나의 surface에는 primary CTA를 하나만 둔다.
7. 수동 입출고는 빠르되, 팝업 안의 섹션 수는 작아야 한다.
8. 스토어 연결은 설정 안에서 관리하고, 운송장은 실행 흐름만 보여준다.
9. 선택형 dropdown은 shared select primitive 하나로 통일한다.
10. 같은 내용을 카드, 배지, 문장, 버튼으로 여러 번 말하지 않는다.
11. `상품 관리`의 탭 언어는 `재고 운영`과 같은 밀도와 역할 규칙을 따른다.
12. label/select/menu/view 안의 텍스트는 컴포넌트 폭에 맞춰 줄바꿈, 잘림, 정렬 기준을 명확히 가진다.
13. 대시보드 필터는 compact size와 baseline alignment를 기본으로 한다.
14. Simple Surface First: wrapper card·새 섹션·설명 박스를 늘리기 전에 기존 toolbar, table, header, action rail 안에서 해결한다.
15. 소싱 화면의 primary surface는 table/workspace다. 카드형 summary보다 작업 표면을 먼저 둔다.
16. legacy 또는 duplicate primitive는 남기지 않고 shared primitive로 수렴한다.
17. 독립 메뉴가 다른 surface에 흡수되면 이전 view container는 alias만 남기거나 삭제한다.
18. UI 변경과 검사 스크립트는 shared theme, component, primitive, design token 사용 여부를 함께 검토한다. 검토 범위는 `src/app`, `src/components/ui`, 관련 docs, hooks/scripts를 포함한다.
19. page-level self-themed UI는 금지한다. 필요한 semantic은 shared primitive variant와 design token에 추가한다. 데이터 기반 색상 chip과 진행률 width만 예외다.
20. 검색창, toolbar, table shell, empty state는 ad-hoc wrapper 대신 shared primitive를 재사용한다.
21. 화면마다 component budget을 두고, 실제 작업 surface가 설명 surface보다 먼저 보이게 한다.
22. 전역 액션은 영향을 주는 surface의 toolbar에 두며, navigation은 link, 데이터 변경은 button으로 분리한다.
23. action naming은 짧은 동사를 우선하고, 상태는 큰 filled card보다 dot, badge, disabled, loading text 같은 저노이즈 표현을 우선한다.
24. 복합 운영 화면은 progressive disclosure를 사용한다. 목록 행마다 모든 편집 입력을 항상 펼치지 않고 선택된 대상의 sheet/modal/action rail에서 조작한다.
25. 공급자 Excel import는 소싱 입고 예정의 단일 surface다. 재고 운영은 동일 import component를 중복 렌더하지 않는다.
26. 파일 업로드 필드는 항상 `FileDropInput`(`file-drop-input.tsx`) 하나로 통일한다. 선택된 파일명 표시와 drag-active 시각 피드백을 생략한 bare `<Input type="file">`을 화면별로 새로 만들지 않는다.

## Compact Action Doctrine
- 운영 화면의 기본 순서는 `header -> compact toolbar -> primary surface`다.
- 새 문제를 새 wrapper card·섹션·설명 box로 풀지 않고, 기존 action rail에 흡수할 수 있는지 먼저 본다.
- action은 적을수록 좋다. 관련 액션은 compact group으로 묶고, 한 group 안에서 상태와 행동을 같이 해결한다.
- action group은 같은 뜻을 반복하지 않는다. 예: provider 이름은 한 번만 보여주고, 버튼은 `갱신`, `반영`처럼 짧은 동사로 둔다.
- 설명용 메시지보다 버튼 state, disabled state, inline status로 의미를 전달한다.
- toolbar와 action rail은 desktop에서 한 줄 안정성을 우선한다. 내부 action group은 기본적으로 wrap하지 않는다.
- 새 액션이 들어오면 새 줄을 만들기 전에 폭, padding, 라벨 길이, 비핵심 텍스트를 먼저 압축한다.
- 성공/실패/상태 메시지는 toolbar 높이를 밀어 올리면 안 된다. toolbar 폭 계산에 참여하지 않게 하거나, 별도 dense strip으로 보낸다.
- 운영 화면에서는 multi-row 정렬보다 action row 높이 안정성을 우선한다.
- 외부 패턴 근거는 [ADR-024](../adr/0024-minimal-intent-ranked-filters.md)를 참조한다.

## Component Budget Checklist
- 아래 항목은 [Compact Action Doctrine](#compact-action-doctrine)을 기준으로 검토한다.
- 이 화면의 primary surface는 무엇인가.
- 이 작업에 필요한 전역 액션은 몇 개인가.
- 기존 toolbar 안에 흡수 가능한가.
- 새 카드나 새 섹션 없이 해결 가능한가.
- 버튼 라벨을 한 단어 또는 짧은 동사로 줄일 수 있는가.
- 같은 상태를 두 번 이상 말하고 있지 않은가.
- provider, tool, action을 compact group으로 묶을 수 있는가.
- 이 toolbar는 한 줄 유지가 가능한가.
- 내부 group이 별도로 wrap하지 않는가.
- 상태 문구가 action rail 높이를 밀어 올리지 않는가.
- 좁아질 때 새 row 대신 무엇을 압축하거나 숨길지 정했는가.

## Filter Budget Rules
- 기본 필터는 `3~5개`를 기본 목표로 한다. visible column 전체를 필터로 복제하지 않는다.
- 필터는 빈도와 업무 결정 가치로 고른다. low-frequency audit metadata는 row cell, tooltip, modal, advanced disclosure로 남긴다.
- 기본 필터로 올리는 항목은 `이 값을 자주 바꾸며 결과 집합을 실제로 좁히는가`를 설명할 수 있어야 한다.
- `count`, `reset`, active-state 요약은 toolbar meta cluster에 붙인다. 우측 끝 고립 텍스트나 별도 footer strip로 보내지 않는다.
- toolbar search는 page-global search가 아니면 compact width가 기본이다. `flex-fill` 또는 남는 폭 전체 점유는 예외로 본다.
- 같은 의미를 `filter + row cell + context pill`로 중복 노출하지 않는다.
- embedded와 standalone은 같은 control vocabulary를 유지한다. 제거 가능한 것은 page chrome뿐이며, filterable field 자체를 read-only context로 치환하지 않는다.
- multi-row toolbar가 필요하면 역할별 row를 명시한다.
  - `select row`: single-select dropdown, status filter, mode filter
  - `query row`: search, date range, text query
  - `meta cluster`: reset, result count, compact status

## 디자인 토큰
값과 근거의 SoT는 [DESIGN.md](./DESIGN.md)다. 이 문서는 토큰 값을 반복하지 않는다.

## Shared Primitive
공용 UI는 아래 계층으로 수렴시킨다.

```text
src/components/ui/
├── badge-1.tsx
├── basic-data-table.tsx
├── channel-badge.tsx
├── button.tsx
├── card.tsx
├── column-visibility-menu.tsx
├── dropdown-menu.tsx
├── editable-table.tsx
├── filter-toolbar.tsx
├── input.tsx
├── inventory-data-table.tsx
├── inventory-table-toolbar.tsx
├── menu.tsx
├── modal.tsx
├── select.tsx
├── shipping-classification-badge.tsx
├── store-connection-row.tsx
├── store-connection-status.tsx
├── table.tsx
├── table-surface.tsx
├── tabs.tsx
├── tag-input.tsx
└── toolbar.tsx
```

### Required Behavior
- `table-surface`
  - filter toolbar + table을 하나의 이음새 없는 bordered surface로 묶는다
  - `toolbar` strip → divider → table body → optional `footer` 구조
  - 조회 화면은 filter 박스와 table shell을 별도 카드 2개로 쌓지 않고 이 primitive 하나로 수렴한다
  - child table은 자체 border를 갖지 않는다 (`InventoryDataTable`은 shell 없이, `BasicDataTable`은 `bare`로 렌더)
- `inventory-data-table`
  - dense rows
  - configurable visible columns
  - subtle row motion
  - shell 없이 `TableSurface` 안에서 렌더된다
- `filter-toolbar`
  - `TableSurface` toolbar slot 안의 layout (좌측 filter cluster + 우측 meta cluster)
  - compact search / dropdown / reset / count meta
  - bordered 박스가 아니라 layout만 담당한다
- `editable-table`
  - dense, token-consuming editable input table with add/delete/duplicate row actions and inline validation
- `card`
  - canonical border language for bordered surfaces
  - `default`, `muted`, `strong` variants
  - dashboard KPI, analytics, operational table shell은 모두 card variant를 통해 border 강도를 맞춘다
- `button`
  - semantic variant는 shared primitive에만 추가한다
  - page component에서 inline background/border color를 직접 지정하지 않는다
  - `success`, `warning`, `danger` 같은 상태형 액션도 tokenized variant로만 표현한다
- `tabs`
  - upper view switch only
  - do not use for filter chips or action toggles
- `modal`
  - lightweight shared overlay for short-lived form/edit flows
- `select`
  - all console dropdown selection inputs
  - supports placeholder, disabled, compact trigger, keyboard navigation
- `shipping-classification-badge`
  - `naver`
  - `coupang`
  - `unclassified`
  - `ambiguous`
- `channel-badge`
  - canonical channel/listing status primitive
  - `channel`: `naver` | `coupang`
  - `listingStatus`: `active` | `unregistered` | `paused` | `sync-error`
  - channel name and status text are always visible; `compact` only removes the separator
- `store-connection-row`
  - provider label
  - bordered status badge
  - masked summary
  - updated time
  - save action

## Review Contract
- UI work를 할 때는 shared theme, component, primitive, design token 사용 여부를 먼저 확인한다.
- hooks와 검사 스크립트는 UI 변경을 감지하면 이 문서와 `docs/architecture/overview.md`, `docs/adr/`의 원칙을 함께 점검해야 한다.
- theme, tokens, primitive, component가 분리되어 보이면 우선 shared source로 수렴시킨다.
- hook은 UI 변경 payload에서 `command`와 `cmd` 둘 다 읽을 수 있어야 하며, UI 파일 수정 시 docs 검토를 같이 강제한다.

## 현재 구조의 실패 패턴
- 입고 버튼으로 연 팝업에서 다시 입고/출고를 고르게 하는 패턴
- 빠른 입력 팝업 안에 `표 붙여넣기` 패널까지 집어넣는 패턴
- 업로드 화면에서 `미연결 배지 + 준비 상태 섹션 + 채널별 연결 카드`를 반복하는 패턴
- 설정 화면에서 “스토어 연결은 다른 페이지에서 하라”는 안내 카드만 두는 패턴
- 표보다 먼저 큰 제목/서브타이틀/설명 카드가 화면을 차지하는 패턴
- 같은 너비의 긴 filled 버튼을 여러 개 병렬 배치하는 패턴
- 예정 목록을 절반 폭으로 밀어내는 상시 수동/붙여넣기 등록 패널
- 한 입고 행에 배정·부분 입고·부족·후속·정정 입력을 모두 항상 펼치는 패턴

## Visual quality gate

- UI phase 완료 전 desktop 화면에서 primary surface가 첫 viewport의 주 작업 면적을 차지하는지 브라우저로 확인한다.
- 강한 border/shadow가 중첩되거나 form card가 table보다 먼저 보이면 구조를 평탄화한 뒤 완료한다.
- 한글 label/table header에 uppercase를 시각 규칙으로 의존하지 않는다. 자간과 크기는 dense readability를 우선하며 전역 token 변경은 별도 design-system 검증으로 수행한다.
- 테스트가 DOM 존재만 확인해 잘못된 IA를 보호하지 않도록 navigation child route와 primary/secondary surface ownership을 함께 검증한다.

## 메뉴 구조
이 섹션은 canonical primary navigation 순서의 단일 SoT다: **대시보드 → 주문 → 상품 관리 → 재고 운영 → 소싱**. API 설정은 계정 메뉴의 `/settings?section=store-connections` deep link로 제공한다.

- `대시보드`
  - `분석 섹션`
- `주문`
  - `송장 업로드/반영`
- `상품 관리`
  - `상품`
  - `창고`
- `재고 운영`
- `소싱`
  - `입고처`
  - `입고 예정`
- `계정 메뉴`
  - `API 설정` → `/settings?section=store-connections`

`/settings`는 스토어 연결의 canonical owner로 유지하지만 primary navigation에는 넣지 않는다. `/orders`가 주문과 송장 작업의 owner이며, `/shipping`은 `/orders/tracking-import` redirect다. 채널 상태는 `ChannelBadge`로 채널명과 상태 텍스트를 함께 보여 주며, 색만으로 의미를 전달하지 않는다.

## Dashboard Pattern
- dashboard는 quick-start 버튼 행 대신 `KPI strip + analytics cards + operational tables`로 구성한다.
- analytics는 독립 메뉴가 아니라 dashboard 내부 section이다.
- 차트는 `거래 추이`, `재고 추이`, `창고별 변동 비교` 3개만 유지한다.
- 각 차트는 자기 전용 control strip를 가진다.
- control strip은 큰 segmented button rail이 아니라 compact filter row를 기본으로 한다.
- control strip은 차트 카드 안에 중첩된 filter 박스(card-in-card)로 두지 않는다. 카드 header에 title·상태 badge를, body 상단에 label만 붙인 compact filter row를 바로 둔다.
- 기간, 모델, 시작일, 종료일 control은 같은 baseline과 compact height를 유지해야 한다.
- KPI strip은 바깥 wrapper card 없이 개별 card를 바로 grid에 둔다. card 안에 card를 넣어 border가 끊겨 보이게 만들지 않는다.
- dashboard card surface는 끊기지 않는 shared card border language를 사용해야 한다.

## Layout Rules
- 기본 구조와 action-row 안정성은 [Compact Action Doctrine](#compact-action-doctrine)을 따른다.
- summary card는 예외적이며, 같은 섹션 안의 card nesting이 2단 이상 늘어나면 구조를 다시 접는다.
- title 위 kicker/eyebrow/tag cluster는 기본적으로 사용하지 않는다.
- 상단 tabs는 같은 page 안의 view switch에만 사용하고, filter/action cluster는 toolbar로 둔다.
- 탭과 버튼은 compact size를 기본으로 한다.
- 표 위 설명이 꼭 필요하면 page header 또는 toolbar 메타 중 하나만 사용하고 둘을 동시에 반복하지 않는다.
- dashboard filter는 compact size와 baseline alignment를 유지한다.

## Text Fitting Rules
- `label`, `select`, `menu`, `view` 안의 텍스트는 해당 컴포넌트 폭을 먼저 따른다.
- 한 줄이 보장되지 않으면 `wrap -> truncate -> align` 순서로 규칙을 정한다.
- label은 가능한 짧게 두고, select/menu/view 안에서는 긴 옵션명을 잘리거나 줄바꿈될 수 있게 설계한다.
- 오른쪽 정렬 숫자나 상태 텍스트는 같은 행에서 기준선을 유지해야 한다.

## 페이지 chrome 예산
- 세부 layout/action 예산은 [Compact Action Doctrine](#compact-action-doctrine)과 [Layout Rules](#layout-rules)를 따른다.
- 기본 헤더는 `title + 짧은 설명 + 액션 영역`까지만 허용한다.
- kicker, eyebrow, duplicate subtitle, 설명용 배지 묶음은 기본적으로 금지한다.
- 상단에서 반복 설명한 맥락을 본문 카드에서 다시 설명하지 않는다.
- 설명이 길어질수록 chrome을 늘리지 말고 표, drawer, inline state로 옮긴다.

## 상품 관리 패턴
- visible destination은 `상품 관리`다. `기준 데이터`는 사용자 메뉴 이름으로 쓰지 않는다.
- 상품과 창고는 같은 관리 도메인 안에 두되, 서로 다른 리스트와 편집 폼으로 분리한다.
- 두 탭 모두 `compact toolbar + basic data table + modal action` 구조를 쓴다.
- 상품 표에서는 SKU, 옵션, 상태, 표시명이 먼저 보여야 하고, 설명 카드가 그 앞에 서면 안 된다.
- 창고 표에서는 창고명, 사용 여부, 운영 메모, 연결 상태가 먼저 보여야 하고, 상태 설명은 inline state로만 보조한다.

## 재고 운영 패턴

### 상단 툴바
- 한 줄 또는 두 줄 안에 끝나는 compact toolbar를 사용한다.
- 권장 순서:
  - 창고 dropdown
  - 상품명 search
  - 상태 filter
  - columns dropdown
  - `입고`
  - `출고`
  - 필요 시 `CSV`, `이력`
- `재고 추가`는 목록 toolbar에 두지 않는다. 신규 상품 옵션+창고 조합도 `입고`로 첫 수량을 등록한다.
- summary 숫자는 큰 카드 대신 compact badge strip 또는 표 상단 메타로 축소한다.
- `입고`, `출고` action rail은 `목록` 탭 전용이다. `이력` 탭에 같은 action rail을 복제하지 않는다.

### 목록 표
- 기본 컬럼은 현재 작업에 필요한 정보만 둔다.
- 상품명, 옵션, 창고, 현재 재고, 최근 입고, 최근 출고, 상태를 우선한다.
- 컬럼 숨김/표시를 지원한다.
- 행 애니메이션은 짧은 fade/slide-in 정도만 허용한다.
- 목록 표는 filter/action toolbar와 `TableSurface` 하나로 묶여 이음새 없이 이어져야 하고, 위에 별도 summary section을 하나 더 끼워 넣지 않는다.

### 이력 표
- 목록과 같은 필터 감각을 유지하되, 변동 시각과 출처 메타를 더 먼저 보여준다.
- 감사성 정보가 많아져도 summary card를 늘리는 방식으로 대응하지 않는다.
- 기본 history filter는 `창고`, `구분`, `모델명`, `기간`을 canonical set으로 본다.
- `등록 방식 / 참조`는 기본적으로 row metadata다. 표에서 이미 읽히는 감사 메타를 기본 필터에 중복 노출하지 않는다.
- source filter가 필요해지면 dedicated audit page 또는 advanced disclosure로 승격하고, 기본 hub toolbar에는 바로 추가하지 않는다.

### 입고/출고 팝업
- 버튼을 누른 타입에 맞는 고정 모드로 열린다.
- 입고 도움말은 첫 입고와 기존 수량 증가를, 출고 도움말은 수동 `onHand` 차감과 주문 발송 자동 출고의 구분을 짧게 설명한다.
- 팝업 안에서 `입고/출고` 전환 버튼을 다시 두지 않는다.
- 본문은 compact editable table 하나가 중심이다.
- 표 헤더와 선택 control은 `모델` 대신 `상품` 또는 `상품 옵션`을 사용한다.
- 유지:
  - 행 추가
  - 행 삭제
  - 행 복제
  - inline validation
- 제거:
  - `표 붙여넣기`
  - 타입 선택 토글
  - 설명만 하는 카드

### Sheet
- 목록 컨텍스트를 유지한 채 여는 상세/작업 공간은 `Sheet`(`@/components/ui/sheet`, `side="right"`)를 사용한다. `SheetTitle` 필수, Escape·overlay 클릭으로 닫기, 닫힘 후 트리거로 포커스 반환은 base-ui Dialog 기본 동작을 그대로 쓰고 커스텀 focus 코드를 추가하지 않는다.
- 폭은 콘텐츠 밀도에 맞춰 `className`으로 override한다(`sm:max-w-xl` ~ `sm:max-w-2xl`).
- 파괴적 확인이나 짧은 폼은 `Modal`(중앙)을 그대로 쓴다. FixedSheet는 티켓 #27에서 삭제됐다(ADR-004A superseded, ADR-037 흐름).

### CSV / 이력
- 목록/입고/출고와 한 화면에 둘 때 UX가 무너지면 재고 운영 하위 페이지로 올린다.
- child route가 생겨도 top-level IA는 `재고 운영` 하나로 유지한다.
- action section은 목록 탭 전용이다. history 또는 보조 탭에 동일 action rail을 복제하지 않는다.

## 소싱 패턴
- 소싱 화면의 primary surface는 table/workspace다.
- 입고처와 입고 예정은 카드형 요약보다 필터 가능한 table/workspace로 먼저 구성한다.
- register/detail 같은 짧은 editing flow는 modal로 보조하고, surface 자체를 card summary로 대체하지 않는다.
- header 다음에 `toolbar -> section title -> table/list`가 바로 이어져야 한다.
- filter toolbar와 table은 `TableSurface` 하나로 묶어 이음새 없는 단일 surface로 읽히게 한다. filter 박스와 table shell을 별도 카드 2개로 쌓지 않는다.
- table/list를 설명용 wrapper card로 한 번 더 감싸지 않는다. shell이 필요하면 `TableSurface` 하나만 둔다.

## 주문 / 송장 패턴

### 업로드
- 상단은 업로드 CTA와 최소 안내만 둔다.
- `연동 준비 상태` 같은 별도 섹션은 두지 않는다.
- 업로드 후 바로 분류 미리보기 표가 나타나야 한다.

### 분류 미리보기 표
- row마다 채널 badge를 보여준다.
  - `네이버`
  - `쿠팡`
  - `미분류`
  - 필요 시 `중복 후보`
- 필터는 최소 `전체 / 네이버 / 쿠팡 / 미분류`를 제공한다.
- `중복 후보`는 row badge와 count strip에는 남길 수 있지만, 기본 filter set에는 포함하지 않는다.
- 이름과 주소가 비교 기준임을 row detail 또는 tooltip 수준으로만 보여 주고, 긴 설명 문장은 줄인다.
- preview toolbar는 `분류 필터 + provider action group`을 기본으로 한다.
- provider action group은 `[상태 chip] [갱신] [반영]` 구조를 기본으로 하고, provider 이름은 group 안에서 한 번만 보여 준다.
- 채널별 발송 버튼은 summary rail에 따로 두지 않고 provider action group의 `반영`으로 흡수한다.

### 미연결 상태
- `네이버 미연결`, `쿠팡 미연결` 상태는 버튼이 살아 있어야 한다.
- 버튼을 누르면 해당 provider의 settings section으로 이동한다.
- 운송장 화면에 credential form을 넣지 않는다.
- 상태 표현은 초록/빨강 원형 dot와 짧은 label 조합으로 통일한다.

## 설정 패턴
- 설정은 더 이상 “다른 페이지로 가라”는 안내 카드만 두는 화면이 아니다.
- `스토어 연결`을 canonical owner로 둔다.
- provider row/card는 다음만 보여준다.
  - 이름
  - 연결 상태 badge
  - 마스킹된 요약
  - 최근 변경 시각
- provider 요약과 실제 입력 form을 다른 카드로 갈라놓지 않는다.
- 이미 연결된 provider도 값 변경이 가능해야 한다.
- 저장 버튼은 provider row 우측 상단의 단일 primary action으로 둔다.
- 별도의 `연결` 버튼은 두지 않는다. 저장 성공 후 상태 badge가 `미연결 -> 연결됨`으로 바뀌어야 한다.
- 상태 badge는 연결 여부만 말하고, 같은 상태를 label과 문장에 다시 적지 않는다.
- 상태 badge는 아이콘 + label + border를 가진 compact view여야 한다.

## 타이포그래피와 밀도
- 크기·밀도 값의 SoT는 [DESIGN.md](./DESIGN.md)다. 긴 설명문 대신 짧은 라벨과 배지를, 넓은 빈 여백보다 table viewport를 우선한다.

## Sizing / Density 계약
- control/button/tab/badge는 정의된 size tier만 사용하고 임의 height를 추가하지 않는다([DESIGN.md](./DESIGN.md) 참고).

## 버튼과 드롭다운
- 반복 액션은 icon + text를 기본으로 한다.
- 같은 시야에서 filled primary 버튼은 1개가 기본이다.
- filter, column visibility, status filter는 compact dropdown으로 처리한다.
- dropdown 선택 입력은 shared `Select` primitive만 사용한다.
- native `<select>`와 화면별 개별 dropdown 구현은 허용하지 않는다.
- full-width giant button은 업로드 dropzone 같은 예외적 액션에만 한정한다.

## 카드와 surface 규칙
- card/surface variants는 bordered container의 canonical language다.
- 카드 안에 다시 설명 카드, 그 안에 상태 카드가 중첩되면 실패 신호다.
- 정보가 많아질수록 새 카드를 더하는 대신 표, inline disclosure, drawer를 쓴다.
- “상태를 설명하기 위한 카드”는 기본적으로 만들지 않는다.
- strong card는 header와 body가 나뉘어도 하나의 clipped surface로 읽혀야 한다.
- hollow corner, segmented seam, 이질적인 border split이 보이면 card variant가 아니라 shared primitive 구조를 다시 봐야 한다.
- page-local border patch로 임시 봉합하지 말고 shared card/surface primitive의 variant와 padding/token을 고쳐서 해결한다.
- Card의 divider/body 관계는 [card composition contract](../../design-system/contracts/card.composition.json)가 정의한다. 이 문서는 의도를 설명하고, contract는 component composition을 정의하며, code와 harness가 이를 검증한다.
- `globals.css`에서 `.a, .b, .c { ... }` 형태로 셀렉터를 묶어 쓰는 규칙(예: `.surface, .ui-surface, .ui-card`)에 새 속성을 추가할 때는 그 속성이 목록의 모든 셀렉터에 적용돼도 안전한지 먼저 확인한다. 한 컴포넌트(`Card`)의 버그를 고치려고 공유 셀렉터 그룹에 속성을 추가하면, 같은 그룹을 쓰는 다른 컴포넌트(`FixedSheet`의 `.ui-surface-strong` 등)에도 의도치 않게 그 속성이 퍼진다. 고쳐야 할 속성은 실제로 필요한 가장 좁은 셀렉터(`.ui-card` 단독 규칙)에 추가하고, 그룹 규칙에는 정말 모든 멤버가 공유해야 하는 속성만 남긴다.

## 인지·그룹핑 원칙
근접성·공통 영역·시각 계층·강조 예산·elevation 계층 원칙은 [DESIGN.md 인지·그룹핑 원칙](./DESIGN.md#인지그룹핑-원칙)이 SoT다. [ADR-018](../adr/0018-ui-system-checks.md) UI-system-check가 `tests/design-contracts.test.ts`, `tests/ui-token-presets.test.ts`, `tests/shared-primitives-tokens.test.ts`로 강제한다.

## 모션
- duration, easing, reduced-motion 원칙의 SoT는 [DESIGN.md](./DESIGN.md#motion)다.
- 허용: dropdown 열림/닫힘, table row 초기 진입, dialog/sheet 진입.
- 금지: 과한 spring, 반복 pulse/glow, 핵심 데이터 위를 덮는 장식용 전환.

## Accessibility
- status는 색만으로 전달하지 않는다.
- focus-visible을 유지한다.
- icon-only control에는 accessible name이 필요하다.
- mobile tap target은 44px 이상을 유지한다.

## AI Slop 금지 규칙
- 제목과 같은 뜻의 서브타이틀을 한 번 더 쓰지 않는다.
- 같은 이동 버튼을 헤더, 본문, 경고 카드에서 반복하지 않는다.
- “여기로 가세요”만 말하는 페이지를 만들지 않는다.
- 표보다 카드가 먼저 보이는 운영 화면을 기본으로 삼지 않는다.
- reference component를 들여와도 demo 도메인 필드와 불필요한 이미지/아바타를 그대로 복제하지 않는다.
- route가 달라도 같은 form, 같은 summary, 같은 CTA cluster를 반복 렌더링하지 않는다.
