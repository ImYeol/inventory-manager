# History `/history`

## Purpose
재고 변동과 감사 이력을 조회하고 필요한 보정 흐름을 시작한다.
## Data
시각, 상품/SKU, 창고, 수량 변화, source/action, 참조 메타.
## Filters
창고, 구분, 모델명/상품명, 기간. 등록 방식·참조는 기본 필터가 아니다.
## Actions
행 상세와 허용된 이력 되돌리기. 목록의 입고·출고 action을 복제하지 않는다.
## Overlays
되돌리기 확인과 상세는 Dialog로 완결하며 mobile은 full-screen Dialog다.
## States
loading, no history, filtered empty + reset, revert error inline/alert.
## Mobile
시각·identity·변동량·source를 우선하고 상세 메타는 Dialog로 보낸다.
## Non-goals
새 재고 입력과 원장 계산을 직접 소유하지 않는다.

