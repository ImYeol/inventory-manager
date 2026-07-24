# Dashboard `/`

## Purpose
핵심 운영 상태를 한눈에 보고 바로 처리할 대상을 찾는다. Dashboard는 분석과 운영 요약의 owner다.

## Data
KPI, 주문 예외, 재고 주의 항목, 최근 활동, 거래 추이·재고 추이·창고별 변동 비교를 제공한다.
창고별 변동 비교는 plot 좌우 inset, 실제 막대, 값 label을 유지하며 창고가 한 곳이어도 비어 보이지 않게 한다.

## Filters
각 chart가 model/date range/period를 독립적으로 소유한다. dashboard 전체를 바꾸는 전역 table filter는 만들지 않는다.

## Actions
주의 항목의 상세 화면 이동과 분석 chart 조건 변경. 장식용 quick-start action은 기본 surface가 아니다.

## Overlays
필요한 행 상세만 Dialog로 열며 대시보드 안에서 업무 입력을 중복 소유하지 않는다.

## States
KPI loading, chart loading/empty/error, operational table empty/error를 embedded-bare 규칙으로 표현한다.

## Mobile
KPI와 작업 큐를 먼저, 분석 chart를 뒤에 둔다. 보조 table은 bare로 축소한다.

## Non-goals
주문·재고·스토어 연결의 mutation owner가 되지 않는다.
