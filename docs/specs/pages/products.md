# Products `/products`

## Purpose
내부 상품 SKU와 창고 기준정보를 관리한다.
## Data
상품 탭은 SKU/옵션/출고 가능/판매 옵션/마지막 보고·오류, 창고 탭은 창고 속성과 운영 상태를 제공한다.
## Filters
상품·옵션 search, channel/status filter, tab-specific core filters.
## Actions
상품 탭 Action Row는 중복 결과 수를 표시하지 않고 `내부 상품 등록` 하나만 intrinsic width로 오른쪽 정렬한다. 결과 수는 table footer가 소유한다. 상세/매핑, 창고 등록·수정도 제공하며 Column visibility는 intrinsic-width control이다.
## Overlays
상품 등록·SKU 매핑·창고 편집은 Dialog에서 완결한다. mobile은 full-screen Dialog다.
## States
loading, no matching rows + reset, no dataset + create, mapping/API error inline.
## Mobile
identity 1–2줄과 연결 상태를 우선하고 숫자·감사 열은 숨김 또는 상세로 보낸다.
## Non-goals
채널 전량 수집과 재고 수량 원장을 소유하지 않는다.
