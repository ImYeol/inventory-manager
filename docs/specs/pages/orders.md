# Orders `/orders`

## Purpose
주문 조회, 예약 상태 확인, 송장 등록/반영을 한곳에서 처리한다.
## Data
채널, 주문번호/상품, 수량, 배정 창고, 주문·발송 상태, 주문일.
## Filters
view tabs(신규/출고 준비/확인 필요/발송 완료), 주문번호 또는 SKU search, 채널 filter.
## Actions
주문 동기화와 송장 등록은 독립 business actions. Column visibility는 query/view control이다.
## Overlays
송장 등록은 desktop wide Dialog, mobile full-screen Dialog에서 업로드→분류→미리보기→반영을 완결한다.
## States
loading skeleton, filtered empty + reset, provider/API error + retry, row-level classification status.
## Mobile
핵심 주문 식별자와 상태를 남기고 낮은 우선순위 열은 숨긴다. filters는 full-screen Dialog로 접는다.
## Non-goals
스토어 credential 편집과 재고 원장 변경을 소유하지 않는다.

