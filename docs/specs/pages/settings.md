# Settings `/settings`

## Purpose
네이버·쿠팡 스토어 연결과 credential을 관리하는 canonical owner다.
## Data
provider 연결 상태, 마스킹 summary, 최근 변경 시각, 쿠팡 기본 택배사 코드.
## Filters
provider section/deep link. 검색 toolbar나 table filter는 기본 제공하지 않는다.
## Actions
연결, 변경, 해제, 저장. provider별 action은 독립 row action이다.
## Overlays
credential 입력·해제 확인은 Dialog에서 완결하며 mobile은 full-screen Dialog다.
## States
configured/unconfigured, saving, validation error, provider error, retry.
## Mobile
provider row와 상태/action을 우선하고 credential form은 full-screen Dialog로 연다.
## Non-goals
송장 분류나 주문/재고 mutation을 소유하지 않는다.

