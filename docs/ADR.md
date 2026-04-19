# Architecture Decision Records

## 철학
이 프로젝트는 기존 재고 원장을 버리지 않고 운영 관점 UX를 재정렬하는 방향으로 간다. 새 도메인(외부 공장, 예정 입고)은 추가하되, 핵심 재고 수량의 단일 진실 공급원은 유지한다.

---

### ADR-001: 메뉴는 mixed sidebar로 구성하고 필요할 때만 확장형을 사용한다
**결정**: direct item과 expandable section을 혼합한 사이드바를 채택한다. 하위 화면이 2개 이상인 섹션만 확장형으로 둔다.  
**이유**: 모든 메뉴를 드롭다운으로 만들면 구조만 복잡해지고, 실제 탐색 속도는 오히려 느려진다.  
**트레이드오프**: direct item과 section을 함께 설계해야 하므로 nav config가 조금 더 정교해진다.

### ADR-001A: `운송장`과 `분석`은 singleton category로 쪼개지 않는다
**결정**: `/shipping`, `/analytics`는 현재 direct item으로 유지하고, 의미 있는 child destination이 실제로 생길 때만 하위 메뉴로 확장한다.  
**이유**: 한 화면짜리 도메인을 굳이 그룹으로 감싸면 메뉴 단계만 늘고 사용성은 좋아지지 않는다.  
**트레이드오프**: 향후 기능이 커지면 nav refactor가 한 번 더 필요할 수 있다.

### ADR-002: `재고 운영`은 단일 허브로 재구성한다
**결정**: `재고`, `입출고`, `이력`, `창고별 운영`을 여러 1차 메뉴로 쪼개지 않고 `/inventory` 기반 허브로 통합한다.  
**이유**: 창고 담당자 기준으로는 한 창고 컨텍스트 안에서 개요, 입고, 출고, CSV, 이력을 연속해서 다루는 것이 자연스럽다.  
**트레이드오프**: 허브 내부 tab/query-state 설계가 필요하고, 기존 `/inout`, `/history` 라우트는 전환 전략이 필요하다.

### ADR-003: 재고 원장은 `inventory` + `transactions` 단일 구조를 유지한다
**결정**: 창고별 재고와 변동 이력은 기존 테이블을 유지하고, 새 기능은 메타데이터와 보조 엔터티를 확장하는 방식으로 붙인다.  
**이유**: 현재 시스템은 이미 창고 단위 수량과 트랜잭션을 보유하고 있어 재작성보다 확장이 안전하다.  
**트레이드오프**: 트랜잭션 메타데이터 보강과 RPC 수정이 필요하다.

### ADR-004: 외부 공장과 예정 입고는 staging 도메인으로 분리한다
**결정**: `factories`, `factory_arrivals`, `factory_arrival_items`를 도입해 실제 재고 반영 전 단계를 따로 관리한다.  
**이유**: 예정 수량과 실제 입고 수량은 의미가 다르며, 실제 원장과 분리해야 감사 가능성과 UX가 좋아진다.  
**트레이드오프**: 엔터티 수와 상태 전이 로직이 늘어난다.

### ADR-005: 네이버/쿠팡은 `스토어 연결` 도메인으로 승격하되 저장소는 우선 재사용한다
**결정**: 사용자 IA에서는 `스토어 연결`을 별도 1차 메뉴로 승격하고, MVP 저장소는 `shipping_provider_credentials`를 계속 사용한다.  
**이유**: 현재 코드상 네이버/쿠팡은 실제 주문 조회/발송 흐름과 연결된 도메인이며, 지금 필요한 것은 구조 재작성보다 의미 있는 배치다.  
**트레이드오프**: storage 이름과 사용자 노출 용어가 다를 수 있으므로 문서와 코드 명명 전략을 정리해야 한다.

### ADR-006: `기준 데이터`는 top-level에서 내리고 `설정`에 통합한다
**결정**: 기준 데이터는 별도 핵심 메뉴가 아니라 설정/관리 영역으로 재배치한다.  
**이유**: 창고 운영 실사용 동선에서 기준 데이터는 준비 작업이지 핵심 daily destination이 아니다.  
**트레이드오프**: 기존 사용자 링크나 습관을 고려해 전환 기간 alias 또는 안내가 필요할 수 있다.

### ADR-007: CSV는 부가 기능이 아니라 1급 운영 입력 채널로 취급한다
**결정**: 입출고와 공장 예정 등록 모두에서 CSV 업로드를 수동 입력과 동등한 진입점으로 제공한다.  
**이유**: 운영 데이터는 대량 입력 비중이 높고, 실무자가 원하는 핵심 편의성이다.  
**트레이드오프**: 파싱, 미리보기, 오류 표시, 멱등성 처리 설계가 필요하다.

### ADR-007A: 수동 입출고도 quick entry 다건 입력 패턴으로 최적화한다
**결정**: 수동 입출고는 단건 form 중심이 아니라 line-item 기반 quick entry overlay를 기본으로 한다.  
**이유**: 실무에서는 2~20개 수준의 다건 입력이 자주 발생하고, 이 구간은 CSV보다 빠른 직접 입력 UX가 필요하다.  
**트레이드오프**: dialog/sheet 상태, 붙여넣기 파싱, inline validation 설계가 필요하다.

### ADR-007B: 생성/수정 UX는 공통 dialog/sheet 패턴으로 통일한다
**결정**: 데스크톱은 dialog, 모바일은 full-height sheet를 기본 overlay 패턴으로 통일한다.  
**이유**: 팝업 구조가 화면마다 달라지면 사용자가 학습한 입력 흐름을 재사용하기 어렵다.  
**트레이드오프**: 공용 overlay primitive와 responsive 규칙을 먼저 설계해야 한다.

### ADR-008: repo-local Codex hooks를 하네스 계층으로 채택한다
**결정**: `.codex/config.toml`, `.codex/hooks.json`, `.codex/hooks/*.py`를 저장소에 두고 하네스 규칙을 Codex 세션에 자동 주입한다.  
**이유**: 계획 문서와 IA 원칙이 매번 누락되지 않게 하고, 파괴적 명령을 사전에 막을 수 있다.  
**트레이드오프**: experimental 기능 전제이므로 hook 실패 시에도 기본 문서 계약이 유지되도록 문서와 skill을 함께 관리해야 한다.

### ADR-009: page chrome는 제목 우선, 액션 우선으로 제한한다
**결정**: 페이지 제목 위의 kicker/eyebrow/tag cluster를 금지하고, 헤더 copy는 기본적으로 `title + 1문장 설명 + 1개 액션 영역`으로 제한한다. 탭은 라벨만으로 의미가 서야 하며, table은 live/actionable columns만 기본으로 보여준다.  
**이유**: 이 저장소는 밀도와 운영 속도를 중요하게 보지만, 이전 문서에는 헤더 copy 예산이나 table 열 예산이 명시돼 있지 않았다. 그 결과 각 화면이 "정보를 더 설명하려는" 방향으로 쉽게 흘러가서, 제목 위 보조 텍스트와 과도한 badge/tag, 비활성 메타데이터가 누적되면서 오히려 페이지가 복잡해졌다.  
**트레이드오프**: 일부 맥락은 상단 chrome에서 사라지므로, 상세 정보는 drawer, secondary view, or inline disclosure로 옮겨야 한다.  
**재발 방지**: 새로운 shared pattern은 `DESIGN_SYSTEM.md`에 먼저 기록한 뒤 재사용하고, page-local one-off header/tab/table pattern은 기본적으로 금지한다.

### ADR-010: UI drift의 root cause는 summary card와 surface 중첩의 기본화였다
**결정**: operations page에서 summary card와 반복 surface를 기본 레이아웃으로 삼지 않는다. 재고 운영 workspace는 table-first로 두고, compact filter bar와 primary table을 기준 구조로 유지한다.  
**이유**: UI가 oversized section과 repeated card로 흐른 직접 원인은 세 가지였다. 첫째, 요약 정보를 모든 화면의 출발점처럼 두면서 표보다 카드가 먼저 렌더링되는 습관이 생겼다. 둘째, header와 카드가 같은 context를 반복 설명하면서 정보가 중복되었다. 셋째, surface를 section의 기본 래퍼처럼 계속 중첩해 본문 밀도보다 카드 프레임이 더 두드러지게 되었다.  
**트레이드오프**: glanceable KPI가 진짜 필요한 화면에서는 summary card를 예외적으로 설계해야 한다.  
**재발 방지**: utility/filter bar, tabs, buttons는 compact defaults를 지키고, surface/card nesting이 늘어나면 table, inline disclosure, drawer로 되돌린다.

### ADR-011: 상태 표현은 shared badge primitive로 통일한다
**결정**: 상태 정보는 shared badge primitive를 통해 `neutral`, `info`, `success`, `warning`, `danger` 계열로 표현한다. table row, provider status, CSV validation, action result에서 page-local 상태 스타일을 새로 만들지 않는다.  
**이유**: 현재 코드에는 `InventoryWorkspace`, `ShippingView`, `IntegrationsView`, `SettingsView`, `HistoryView`마다 상태 pill이 제각각 하드코딩되어 있어 의미와 시각 규칙이 분리돼 있다.  
**트레이드오프**: 초기에 variant 설계와 치환 작업이 필요하다.  
**재발 방지**: 새 상태 UI는 먼저 `DESIGN_SYSTEM.md`와 shared component path에 추가하고, helper copy로 상태를 다시 설명하지 않는다.

### ADR-012: 메뉴와 반복 액션은 icon + text hierarchy를 기본으로 한다
**결정**: 사이드바, toolbar, row action, dialog CTA 등 반복 액션에는 lucide-react 기반 아이콘 + 텍스트 조합을 기본으로 한다. icon-only는 검색, 정렬, 더보기처럼 의미가 업계 표준으로 굳은 경우만 허용한다.  
**이유**: 현재 텍스트만 있는 버튼은 빠른 스캔이 어렵고, 비슷한 라벨이 여러 위치에서 반복될 때 구분 비용이 높다.  
**트레이드오프**: icon mapping과 버튼 폭 조정이 필요하다.  
**재발 방지**: 한 surface 안의 filled primary는 1개를 기본으로 두고, 이동/설정/보기 액션은 secondary 또는 ghost hierarchy로 내린다.

### ADR-013: `/integrations`, `/shipping`, `/settings`의 화면 책임을 다시 분리한다
**결정**: `/integrations`는 provider credential setup과 연결 상태를 소유하고, `/shipping`은 업로드/미리보기/매칭/발송만 소유하며, `/settings`는 기준 데이터와 관리자 기능만 소유한다.  
**이유**: 현재 `IntegrationsView`와 `SettingsView`는 거의 동일한 provider 입력 UI를 중복 렌더링하고, `ShippingView`도 provider summary와 연결 CTA를 과도하게 포함해 세 route의 책임이 겹친다.  
**트레이드오프**: 기존 사용자에게는 일부 진입 경로가 줄어들 수 있으므로 명확한 링크와 안내가 필요하다.  
**재발 방지**: 같은 form, 같은 summary card, 같은 CTA cluster가 두 route 이상에 존재하면 UI polishing이 아니라 ownership 문제로 보고 먼저 구조를 정리한다.

### ADR-014: shared primitive의 canonical path는 `src/components/ui`로 수렴한다
**결정**: 재사용 가능한 컴포넌트 primitive는 `src/components/ui/*` 아래로 수렴시키고, `src/app/components/ui.tsx`는 class preset과 page helper를 제공하는 transitional registry로 유지한다.  
**이유**: 현재 `src/app/components/ui.tsx`와 `src/components/ui/*`가 혼재되어 shared primitive의 소유권이 흐려져 있고, 그 결과 menu, table, badge, action pattern이 쉽게 page-local로 분기된다.  
**트레이드오프**: 점진적 migration 동안 두 경로가 공존한다.  
**재발 방지**: 새 shared component 예시는 root `/components/ui`가 아니라 `src/components/ui`에 추가하고, 외부 예제를 들여올 때도 repo token과 utility에 맞게 먼저 적응시킨다.
