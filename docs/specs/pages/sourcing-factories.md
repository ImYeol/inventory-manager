# Sourcing Factories `/sourcing/factories`

## Purpose
입고처 목록과 활성 상태, 공급자 SKU/파싱 template 작업을 관리한다.
## Data
입고처명, 연락처/메모, 활성 상태, 연결된 template와 소싱 내역 요약.
## Filters
입고처 search 다음에 활성 상태 tabs/filter를 query row의 핵심 filter로 둔다. 상태 filter는 result meta/action과 같은 cluster에 섞지 않는다.
## Actions
입고처 등록, 상세, 활성/비활성, template 관리. 관련 template action만 같은 family로 묶는다.
## Overlays
등록·상세·template/version 작업은 Dialog에서 완결한다. mobile은 full-screen Dialog다.
## States
loading, no matching factories, no factories + register, template parse error inline.
## Mobile
입고처 identity와 상태를 우선하고 연락처·template metadata는 상세로 보낸다.
## Non-goals
입고 예정 aggregate와 실제 receipt 원장을 소유하지 않는다.
