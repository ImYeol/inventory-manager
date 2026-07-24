# Inventory `/inventory`

## Purpose
창고별 재고를 조회하고 수동 입고·출고·조정을 처리한다.
## Data
상품, SKU/옵션, 창고, 현재 재고, 예약 재고, 출고 가능, 입고 예정, 상태.
## Filters
상품명 search, 창고, 상태, 필요한 옵션 filter, column visibility.
## Actions
목록에서 입고·출고·조정·이동을 제공한다. Action Row는 중복 결과 수를 표시하지 않고 네 운영 action을 왼쪽 정렬한다. 각 action은 `size="sm"` 독립 버튼이며 `IndependentActionGroup`의 작은 간격과 bounded horizontal overflow를 사용해 border/radius를 서로 합치지 않는다. 결과 수는 table footer가 소유한다.
Query Row는 테이블에 직접 인접한 마지막 행으로 두고, `필터 초기화`는 shared outlined reset button을 사용한다.
## Overlays
입고/출고/조정/이동은 고정 mode의 editable Dialog/작업 overlay에서 완결한다. mobile은 full-screen Dialog다.
## States
loading skeleton, filtered empty + reset, data empty + 입고, validation error per cell + summary, save error + retry.
## Mobile
identity/창고/현재 재고/상태를 우선하고 나머지는 column visibility 또는 상세로 보낸다.
## Non-goals
상품 기준정보, 주문 발송, 공급자 원본 import의 canonical owner가 아니다.
