# UI Guide

## Source Of Truth
- UI/UX 원칙, design token, shared primitive 규칙의 source of truth는 이 문서다.
- 토큰은 `src/app/globals.css`에, page-level preset은 `src/app/components/ui.tsx`에, shared primitive는 `src/components/ui`에 둔다.
- 별도 루트 디자인 문서는 사용하지 않는다.

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
1. 상품 관리는 상품/창고 기준정보의 top-level surface다.
2. 대시보드는 KPI와 분석을 같은 surface에서 보여준다.
3. 재고 운영은 list/history-first다.
4. title, subtitle, helper copy는 최소화한다.
5. 상태는 badge와 표 셀에서 먼저 보이고, 설명 문장으로 반복하지 않는다. 상태 라벨은 같은 화면에서 중복 표기하지 않는다.
6. 하나의 surface에는 primary CTA를 하나만 둔다.
7. 수동 입출고는 빠르되, 팝업 안의 섹션 수는 작아야 한다.
8. 스토어 연결은 설정 안에서 관리하고, 운송장은 실행 흐름만 보여준다.
9. 선택형 dropdown은 shared select primitive 하나로 통일한다.
10. 같은 내용을 카드, 배지, 문장, 버튼으로 여러 번 말하지 않는다.
11. `상품 관리`의 탭 언어는 `재고 운영`과 같은 밀도와 역할 규칙을 따른다.
12. label/select/menu/view 안의 텍스트는 컴포넌트 폭에 맞춰 줄바꿈, 잘림, 정렬 기준을 명확히 가진다.
13. 화면에서 상태를 보여줄 때는 한 번만 말하고, label/배지/문장에 같은 상태명을 반복하지 않는다.
14. 대시보드 필터는 compact size와 baseline alignment를 기본으로 한다.
15. 상위 wrapper card를 늘려서 chrome을 덧씌우는 패턴은 금지한다.
16. 소싱 화면의 primary surface는 table/workspace다. 카드형 summary보다 작업 표면을 먼저 둔다.
17. legacy primitive와 duplicate primitive는 남기지 않는다. shared primitive로 수렴되지 않는 변형은 제거 후보로 본다.
18. 독립 메뉴가 다른 surface에 흡수되면, 이전 view container는 alias만 남기거나 삭제한다. dead view file을 보존하지 않는다.
19. UI 관련 변경과 검사 스크립트는 항상 shared theme, component, primitive, design token 사용 여부를 함께 검토해야 한다.
20. 검토 대상은 `src/app`, `src/components/ui`, `docs/UI_GUIDE.md`, `docs/ARCHITECTURE.md`, `docs/ADR.md`, 그리고 이를 검사하는 hooks/scripts까지 포함한다.
21. 개별 화면에서 `style={{ ... }}`로 색상, border, 배경을 직접 입히는 self-themed UI는 금지한다. semantic variant나 design token을 shared primitive에 추가해 해결한다. 데이터 기반 색상 chip, 진행률 width 같은 표현만 예외로 둔다.
22. 페이지별 검색창, 툴바, table shell, empty state는 ad-hoc wrapper를 새로 만들지 말고 shared primitive를 재사용한다.

## 디자인 토큰
- `--background`
- `--foreground`
- `--surface`
- `--surface-muted`
- `--surface-strong`
- `--border`
- `--border-strong`
- `--accent`
- `--accent-foreground`
- `--focus-ring`
- `--shadow`

### Theme Direction
- Base: neutral slate
- Accent: action-first amber
- Status: green / amber / red / blue by semantics
- 금지: purple-heavy SaaS gradient, glassmorphism, decorative glow

## Shared Primitive
공용 UI는 아래 계층으로 수렴시킨다.

```text
src/components/ui/
├── card.tsx
├── select.tsx
├── badge-1.tsx
├── table.tsx
├── basic-data-table.tsx
├── inventory-data-table.tsx
├── filter-toolbar.tsx
├── column-visibility-menu.tsx
├── tabs.tsx
├── modal.tsx
├── shipping-classification-badge.tsx
├── store-connection-status.tsx
└── store-connection-row.tsx
```

### Required Behavior
- `inventory-data-table`
  - dense rows
  - configurable visible columns
  - subtle row motion
- `filter-toolbar`
  - compact search / dropdown / reset / action cluster
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
- `store-connection-row`
  - provider label
  - bordered status badge
  - masked summary
  - updated time
  - save action

## Review Contract
- UI work를 할 때는 shared theme, component, primitive, design token 사용 여부를 먼저 확인한다.
- hooks와 검사 스크립트는 UI 변경을 감지하면 이 문서와 `docs/ARCHITECTURE.md`, `docs/ADR.md`의 원칙을 함께 점검해야 한다.
- theme, tokens, primitive, component가 분리되어 보이면 우선 shared source로 수렴시킨다.
- hook은 UI 변경 payload에서 `command`와 `cmd` 둘 다 읽을 수 있어야 하며, UI 파일 수정 시 docs 검토를 같이 강제한다.

## 현재 구조의 실패 패턴
- 입고 버튼으로 연 팝업에서 다시 입고/출고를 고르게 하는 패턴
- 빠른 입력 팝업 안에 `표 붙여넣기` 패널까지 집어넣는 패턴
- 업로드 화면에서 `미연결 배지 + 준비 상태 섹션 + 채널별 연결 카드`를 반복하는 패턴
- 설정 화면에서 “스토어 연결은 다른 페이지에서 하라”는 안내 카드만 두는 패턴
- 표보다 먼저 큰 제목/서브타이틀/설명 카드가 화면을 차지하는 패턴
- 같은 너비의 긴 filled 버튼을 여러 개 병렬 배치하는 패턴

## 메뉴 구조
- `대시보드`
  - `분석 섹션`
- `상품 관리`
  - `상품`
  - `창고`
- `재고 운영`
- `소싱`
  - `외부 공장`
  - `입고 예정`
- `운송장`
- `설정`
  - `스토어 연결`

## Dashboard Pattern
- dashboard는 quick-start 버튼 행 대신 `KPI strip + analytics cards + operational tables`로 구성한다.
- analytics는 독립 메뉴가 아니라 dashboard 내부 section이다.
- 차트는 `거래 추이`, `재고 추이`, `창고별 변동 비교` 3개만 유지한다.
- 각 차트는 자기 전용 control strip를 가진다.
- control strip은 큰 segmented button rail이 아니라 compact filter row를 기본으로 한다.
- 기간, 모델, 시작일, 종료일 control은 같은 baseline과 compact height를 유지해야 한다.
- KPI strip은 바깥 wrapper card 없이 개별 card를 바로 grid에 둔다. card 안에 card를 넣어 border가 끊겨 보이게 만들지 않는다.
- dashboard card surface는 끊기지 않는 shared card border language를 사용해야 한다.

## Layout Rules
- 기본 구조는 `header -> compact toolbar -> primary table`이다.
- summary card는 예외적이어야 하며 기본 레이아웃이 아니다.
- 같은 섹션 안에서 card nesting이 2단 이상 늘어나면 구조를 다시 접는다.
- title 위 kicker/eyebrow/tag cluster는 기본적으로 사용하지 않는다.
- 상단 tabs는 같은 page 안의 view switch에만 사용하고, filter/action cluster는 toolbar로 둔다.
- 탭과 버튼은 compact size를 기본으로 한다.
- list-management screen은 `compact filter/action toolbar -> primary table` 순서를 기본으로 하고, 같은 표 위에 redundant section title/subtitle/count chrome을 덧씌우지 않는다.
- 표 위 설명이 꼭 필요하면 page header 또는 toolbar 메타 중 하나만 사용하고 둘을 동시에 반복하지 않는다.
- dashboard filter는 compact size와 baseline alignment를 유지한다.
- wrapper card는 chrome을 위한 기본 장치가 아니다. surface가 필요한 경우에만 사용한다.

## Text Fitting Rules
- `label`, `select`, `menu`, `view` 안의 텍스트는 해당 컴포넌트 폭을 먼저 따른다.
- 한 줄이 보장되지 않으면 `wrap -> truncate -> align` 순서로 규칙을 정한다.
- label은 가능한 짧게 두고, select/menu/view 안에서는 긴 옵션명을 잘리거나 줄바꿈될 수 있게 설계한다.
- 오른쪽 정렬 숫자나 상태 텍스트는 같은 행에서 기준선을 유지해야 한다.

## 페이지 chrome 예산
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
- summary 숫자는 큰 카드 대신 compact badge strip 또는 표 상단 메타로 축소한다.
- `입고`, `출고` action rail은 `목록` 탭 전용이다. `이력` 탭에 같은 action rail을 복제하지 않는다.

### 목록 표
- 기본 컬럼은 현재 작업에 필요한 정보만 둔다.
- 상품명, 옵션, 창고, 현재 재고, 최근 입고, 최근 출고, 상태를 우선한다.
- 컬럼 숨김/표시를 지원한다.
- 행 애니메이션은 짧은 fade/slide-in 정도만 허용한다.
- 목록 표는 filter/action toolbar 바로 아래에 붙어야 하고, 위에 별도 summary section을 하나 더 끼워 넣지 않는다.

### 이력 표
- 목록과 같은 필터 감각을 유지하되, 변동 시각과 출처 메타를 더 먼저 보여준다.
- 감사성 정보가 많아져도 summary card를 늘리는 방식으로 대응하지 않는다.

### 입고/출고 팝업
- 버튼을 누른 타입에 맞는 고정 모드로 열린다.
- 팝업 안에서 `입고/출고` 전환 버튼을 다시 두지 않는다.
- 본문은 compact editable table 하나가 중심이다.
- 유지:
  - 행 추가
  - 행 삭제
  - 행 복제
  - inline validation
- 제거:
  - `표 붙여넣기`
  - 타입 선택 토글
  - 설명만 하는 카드

### CSV / 이력
- 목록/입고/출고와 한 화면에 둘 때 UX가 무너지면 재고 운영 하위 페이지로 올린다.
- child route가 생겨도 top-level IA는 `재고 운영` 하나로 유지한다.
- action section은 목록 탭 전용이다. history 또는 보조 탭에 동일 action rail을 복제하지 않는다.

## 소싱 패턴
- 소싱 화면의 primary surface는 table/workspace다.
- 외부 공장과 입고 예정은 카드형 요약보다 필터 가능한 table/workspace로 먼저 구성한다.
- register/detail 같은 짧은 editing flow는 modal로 보조하고, surface 자체를 card summary로 대체하지 않는다.
- header 다음에 `toolbar -> section title -> table/list`가 바로 이어져야 한다.
- table/list를 설명용 wrapper card로 한 번 더 감싸지 않는다. shell이 필요하면 table shell 하나만 둔다.

## 운송장 패턴

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
- 이름과 주소가 비교 기준임을 row detail 또는 tooltip 수준으로만 보여 주고, 긴 설명 문장은 줄인다.
- 채널별 발송 버튼은 preview surface 주변의 compact action rail로 붙이고, provider별 중복 카드 분리는 피한다.

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
- body/control text는 14px 이상 유지한다.
- 테이블 헤더는 과도하게 작게 만들지 않는다.
- 긴 설명문 대신 짧은 라벨과 배지를 우선한다.
- 넓은 빈 여백보다 table viewport를 우선한다.

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

## 모션
- 허용:
  - dropdown 열림/닫힘
  - table row 초기 진입
  - dialog/sheet 진입
- 금지:
  - 과한 spring
  - 반복 pulse/glow
  - 핵심 데이터 위를 덮는 장식용 전환

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
