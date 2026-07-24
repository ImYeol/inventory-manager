# Sourcing Arrivals `/sourcing/arrivals`

## Purpose
공급자 원본을 검토하고 예정 입고·창고 배정·실제 입고·차이 처리를 관리한다.
## Data
입고처/출고번호, 예정일, 상품/SKU, 창고 배정, 수량, 상태, receipt/variance evidence.
## Filters
공장·예정일 search, 상태, 필요 시 창고/상품 filter.
## Actions
입고 예정 추가, 원본 preview/save, 배정, 입고 반영, 부족 종료·후속·정정.
## Overlays
추가·상세·입고·배정과 송장/원본 review는 desktop wide Dialog, mobile full-screen Dialog에서 완결한다. 입력 table은 editable context다.
## States
draft/review blockers, loading, filtered empty, parse mismatch, allocation/receipt validation, server error + retry.
## Mobile
입고처·예정일·상태·identity를 먼저 보여주고 배정/receipt 입력은 full-screen Dialog에서 처리한다.
## Non-goals
동일 원본 import를 재고 운영에 중복 노출하지 않는다.

