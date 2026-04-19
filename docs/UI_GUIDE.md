# UI Guide

## 디자인 목표
이 제품은 홍보용 SaaS가 아니라 매일 반복 사용하는 창고 운영 콘솔이어야 한다. 화면은 깔끔해야 하지만, 더 중요한 것은 빠른 판단과 대량 처리다.

## 핵심 원칙
1. 창고 운영 관점이 먼저 보여야 한다.
2. 밀도는 높게, 피로도는 낮게 설계한다.
3. 입력보다 검증이 먼저다. CSV, 일괄 반영, 원클릭 입고는 항상 미리보기와 상태 피드백을 동반해야 한다.
4. 확장형 메뉴는 필요한 곳에만 쓴다.
5. 분석, 운송장, 스토어 연결은 같은 운영 콘솔 안에서 일관된 토큰과 컴포넌트를 공유해야 한다.
6. 페이지 chrome은 제목 우선, 짧은 copy 우선으로 유지한다.
7. 재고 운영 workspace는 table-first다. 개요/입고/출고/CSV/이력의 기본 진입은 표와 작업 흐름이며, summary card는 기본 배치가 아니다.
8. 상태 정보는 본문 badge와 table cell에서 우선 표현하고, 설명 문장을 늘려 대신하지 않는다.
9. 반복 액션은 아이콘 + 텍스트 조합으로 빠르게 식별되게 하고, 한 surface 안의 버튼 위계는 primary 1개를 기본으로 한다.

## 페이지 chrome 예산
- 제목 위에 kicker, eyebrow, label, tag cluster를 두지 않는다.
- 상단 chrome은 현재 workspace의 맥락을 다시 설명하지 않는다. `재고 운영`, `입고`, `출고` 같은 context label을 header copy에서 반복하지 말고 workspace 본문으로 넘긴다.
- 페이지 헤더는 기본적으로 `title + 1문장 설명 + 1개 액션 영역`까지만 허용한다.
- 설명 문구는 사용자가 지금 당장 알아야 하는 정보만 남기고, 반복 설명이나 배경 설명은 제거한다.
- 상단에 badges/tags를 여러 개 쌓아 놓아 상태를 "설명"하려 하지 않는다. 필요한 상태는 표 본문이나 pill로 흡수한다.
- tab은 라벨만으로 의미가 서도록 작성하고, 기본값으로 helper sentence를 아래에 붙이지 않는다.
- tables는 기본적으로 live/actionable column만 노출하고, 정적 메타데이터는 detail drawer나 secondary view로 내린다.

## 현재 UI 복잡성의 원인
- `src/app/components/inventory/InventoryWorkspace.tsx`는 상단 탭, 상단 CTA, 탭 내부 CTA, overlay CTA가 함께 존재해 `개요/입고/출고`가 여러 위치에서 반복된다.
- `src/app/(protected)/shipping/ShippingView.tsx`는 업로드 흐름 화면 안에 스토어 연결 상태 카드, 설정 유도 배너, 채널별 연결 CTA를 함께 넣어 화면 책임이 겹친다.
- `src/app/(protected)/integrations/IntegrationsView.tsx`와 `src/app/(protected)/settings/SettingsView.tsx`는 거의 동일한 스토어 연결 요약/입력 UI를 중복 렌더링한다.
- `src/components/ui/*`가 shared primitive의 주 소유권을 갖고, `src/app/components/ui.tsx`는 page helper 레이어로 좁혀졌다. 그 결과 badge, icon button, menu item, section header를 페이지마다 다시 구현하는 drift를 줄일 수 있었다.
- 문제의 공통 원인은 "상태를 문장으로 더 설명하려는 습관", "요약 카드와 중첩 surface를 기본 레이아웃처럼 쓰는 습관", "한 도메인을 여러 route가 동시에 소유하는 구조"다.

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

### 레퍼런스 스크린샷 분석
- 테마: 밝은 neutral background 위에 얇은 border와 한 개의 강조색만 쓰는 운영형 콘솔이다. 브랜드색보다 상태색과 정보 밀도가 더 중요하다.
- 색상: 기본 화면은 거의 white, light gray, muted gray로 구성되고, 강조는 CTA 1개와 상태 badge에서만 나타난다. 우리 구현은 이를 그대로 보라색으로 복제하지 않고 slate + amber accent + status palette로 재해석한다.
- 폰트: 장식적인 타이포가 아니라 medium weight 중심의 UI 산세리프다. 제목과 표 숫자만 강하게 주고 설명문은 한 단계 낮은 대비로 눌러야 한다.
- 여백: 헤더와 툴바는 16~24px 단위로 여유가 있지만, 버튼과 filter chip은 36~40px 높이의 compact control이다. 넓은 여백과 큰 카드가 아니라 compact control + 넓은 table area가 핵심이다.
- 컴포넌트: 좌측 nav, 상단 유틸리티, 단일 페이지 헤더, 상태 filter, dense table, row-level status badge가 화면 대부분을 차지한다. summary card는 전면이 아니라 주변 역할이다.
- 화면 구성: 상단에서 아래로 `title/primary action -> compact filter/action bar -> table`의 단선형 흐름이다. 상태 설명은 표 본문과 badge로 흡수되고, 같은 정보를 카드/설명/버튼에서 다시 반복하지 않는다.

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

## 배지, 아이콘, 버튼 규칙
- 상태 badge는 `neutral`, `info`, `success`, `warning`, `danger` 다섯 계열을 기본으로 한다.
- status 정보는 badge에서 먼저 전달하고, 같은 상태를 helper copy와 설명 카드로 다시 풀어 쓰지 않는다.
- 테이블 row 상태, provider 연결 상태, CSV 검증 상태, 최근 처리 결과는 모두 shared badge primitive를 사용한다.
- 메뉴, 주요 CTA, 반복 액션 버튼에는 lucide-react 아이콘을 붙인다. icon-only 버튼은 검색, 정렬, 더보기처럼 의미가 업계 표준으로 굳은 경우로 제한한다.
- 버튼 위계는 `primary 1개 + secondary/ghost 보조`를 기본으로 한다. 같은 시야에서 동일 우선순위의 filled button이 여러 개 보이면 구조를 다시 나눈다.
- filled primary는 저장, 업로드, 보내기 같은 실행 액션에만 사용한다. 이동, 열기, 돌아가기, 설정 진입은 기본적으로 secondary 또는 ghost다.
- nav item은 아이콘 + 텍스트 조합을 기본으로 하고, badge는 count나 새로운 상태를 보완하는 용도에만 사용한다.

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
  - `개요`: dense table + compact filter bar + primary actions
  - `입고/출고`: quick entry dialog/sheet + validation + result summary
  - `CSV`: upload block + preview table + error list
  - `이력`: audit table + detail drawer
- `개요/입고/출고`를 top-level route로 다시 쪼개지 않는다. 복잡한 SKU 상세는 drawer 또는 secondary detail page로 내리고, 허브 헤더와 CTA를 반복하지 않는다.
- 한 화면에 `상단 CTA + 본문 CTA + overlay CTA`가 모두 있지 않게 한다. 기본 CTA는 workspace context당 한 군데만 둔다.

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
- provider별 연결 상태, 마스킹된 정보, 최근 갱신 시각을 노출한다
- 목적은 주문 작업이 가능한 준비 상태를 보여주는 것이다
- 자격증명 입력과 갱신은 이 화면만 소유한다.
- provider 상태는 카드 2개와 compact alert 정도로 끝내고, 같은 상태를 설정 화면이나 운송장 본문에서 다시 중복 렌더링하지 않는다.

### 5. 운송장
- 업로드 CTA와 provider 상태 summary를 상단에 둔다
- `스토어 연결`과 역할이 겹치지 않게, 여기서는 실제 주문/발송 처리 중심으로 둔다
- 별도 하위 메뉴 구조가 필요할 정도로 화면이 분화되기 전까지는 direct item으로 유지한다
- 여기서 필요한 provider 정보는 `연결 여부`, `누락 채널`, `바로 이동 CTA` 정도의 compact strip면 충분하다.
- 자격증명 폼, 마스킹된 키 상세, 중복 안내 문장은 `스토어 연결`로 이동한다.

### 6. 분석
- 핵심 요약과 리포트 접근을 제공하는 direct item으로 유지한다
- 세부 리포트가 실제로 2개 이상 의미 있는 목적지로 갈라지기 전까지는 하위 메뉴를 만들지 않는다

### 7. 설정
- `설정`은 기준 데이터와 운영 관리자 기능의 목적지다.
- `스토어 연결`과 동일한 provider 입력 폼을 다시 두지 않는다.
- 섹션은 역할 기준으로 묶고, 안내 문장보다 실제 관리 액션과 데이터 목록을 우선한다.

## 반복 방지 규칙
- 새로운 shared pattern은 `DESIGN_SYSTEM.md`에 먼저 기록한 뒤 reuse한다.
- page-local one-off로 보이는 header, tab, table, menu 패턴은 기본적으로 금지한다.
- 같은 정보를 title, helper text, badge, pill, table column에 중복 노출하지 않는다.
- summary card를 먼저 쌓고 나서 표를 뒤로 미루는 구성은 operations page의 기본값이 아니다.
- utility/filter bar는 compact해야 하며, 본문보다 시각적으로 커지면 우선순위가 잘못된 것이다.
- workspace 내 tabs/buttons는 compact dimensions를 기본으로 두고, 큰 버튼은 예외적인 primary action에만 허용한다.
- surface/card nesting이 2~3단으로 늘어나면 실패 신호로 본다. 정보를 새 카드에 계속 넣기보다 표, drawer, inline disclosure로 접는다.
- 화면이 복잡해질수록 chrome을 늘리는 대신 details drawer, inline disclosure, secondary view로 정보를 내린다.
- route 책임이 겹치기 시작하면 UI를 더 손보지 말고 ownership부터 다시 정리한다. 같은 form, 같은 provider summary, 같은 이동 CTA가 두 route 이상에 있으면 구조가 잘못된 것이다.
- shared badge, icon button, menu item, section header 없이 page-local className로 상태를 새로 만들지 않는다.

## 테이블 원칙
- sticky header 허용
- 행 높이는 48~56px 범위를 유지
- 이미지가 없으면 썸네일보다 옵션/상태 정보에 집중
- 컬럼 수가 많아질 경우 기본/확장 컬럼 체계를 둔다
- 기본 컬럼에는 현재 작업을 돕는 정보만 둔다. 과거값, 설명문, 내부 식별자는 기본적으로 숨긴다.
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
