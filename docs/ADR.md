# Architecture Decision Records

## ADR-001: 메뉴는 사용 맥락 중심 direct item을 우선하고, local section은 실제 child screen이 있을 때만 쓴다
**결정**: top-level 메뉴는 사용자가 자주 가는 목적지를 direct item으로 둔다. 확장형은 실제 child screen이 2개 이상일 때만 사용하고, 나머지는 local section이나 page internal nav로 처리한다.  
**이유**: 화면 수를 맞추기 위한 category는 사용자가 찾는 경로를 길게 만든다.  
**트레이드오프**: 일부 도메인은 top-level item이 아니라 local navigation으로 풀어야 한다.

## ADR-002: `재고 운영`은 하나의 first-level hub로 유지하고, 목록과 이력 중심으로 분산한다
**결정**: `재고 운영`은 1차 메뉴 하나로 유지한다. 다만 내부는 목록, 이력, 입고, 출고 중심으로 구성하고, `CSV`와 추가 감사 화면이 과밀해지면 `/inventory/csv`, `/inventory/history`로 분리할 수 있다.  
**이유**: top-level을 다시 쪼개면 창고 담당자 흐름이 끊기지만, 모든 워크스페이스를 한 화면에 영구 고정하면 허브 자체가 과밀해진다.  
**트레이드오프**: inventory 내부 subnav와 redirect 전략이 필요할 수 있다.

## ADR-003: list/history는 dense table + compact filters가 canonical surface다
**결정**: 재고 운영의 canonical surface는 summary card-first가 아니라 `compact filter toolbar + dense data table` 구조다. 목록은 현재 재고를, 이력은 변동 기록을 먼저 보여준다.  
**이유**: 실제 작업은 창고, 상품명, 상태, 컬럼 가시성 변경과 표 읽기에서 발생한다.  
**트레이드오프**: glanceable KPI는 secondary badge strip 정도로 축소해야 한다.

## ADR-004: 빠른 입고/출고는 fixed-mode overlay로 단순화한다
**결정**: 입고 버튼은 입고 overlay만, 출고 버튼은 출고 overlay만 연다. overlay 안에서 다시 타입을 바꾸지 않는다.  
**이유**: 진입한 액션과 팝업 모드가 다르면 사용자가 지금 무엇을 저장하는지 다시 해석해야 한다.  
**트레이드오프**: inbound/outbound가 하나의 form primitive를 공유하더라도 상위에서 mode lock이 필요하다.

## ADR-005: 빠른 입력 overlay에서는 `표 붙여넣기`를 제거하고 editable table만 남긴다
**결정**: 수동 입출고 overlay는 compact editable table을 중심으로 하고 `표 붙여넣기`/bulk import panel은 CSV 경로로 이동시킨다.  
**이유**: 빠른 입력 팝업의 목표는 최소 필드로 빠르게 저장하는 것이지, 모든 입력 경로를 한 overlay에 몰아넣는 것이 아니다.  
**트레이드오프**: 대량 입력은 CSV 경로가 더 중요해진다.

## ADR-006: 스토어 연결은 설정 소유로 수렴한다
**결정**: 네이버/쿠팡 연결 상태와 credential 편집의 canonical owner는 `/settings`다. `/integrations`는 남더라도 redirect 또는 thin alias로 제한한다.  
**이유**: `IntegrationsView`와 `SettingsView`가 동시에 스토어 연결을 설명하면 IA가 중복되고, 사용자는 어디서 연결을 바꾸는지 헷갈린다.  
**트레이드오프**: 기존 `/integrations` 링크는 호환 경로 또는 redirect 처리가 필요하다.

## ADR-007: `운송장`은 연결 설명 페이지가 아니라 분류와 발송 실행 화면이다
**결정**: `/shipping`은 `업로드 → 미리보기 → 분류 → 매칭/발송`만 소유한다. 별도 `연동 준비 상태` 섹션은 두지 않는다.  
**이유**: 연결 준비와 실행 흐름을 한 화면에서 반복 설명하면 작업 표면보다 안내 카드가 더 커진다.  
**트레이드오프**: 연결 부족 상태는 짧은 badge와 deep link로만 전달해야 한다.

## ADR-008: 업로드 미리보기의 canonical row state는 channel classification이다
**결정**: 엑셀 업로드 뒤 첫 번째 핵심 표는 원본 데이터 단순 출력이 아니라 `네이버/쿠팡/미분류/중복 후보` 분류가 포함된 preview table이어야 한다.  
**이유**: 사용자는 어떤 행이 어느 채널로 갈지 바로 보고 필터링해야 한다.  
**트레이드오프**: name/address normalization과 ambiguous state 처리가 필요하다.

## ADR-009: shared primitive의 canonical path는 `src/components/ui`다
**결정**: shared primitive는 `src/components/ui` 아래에 추가한다. root `/components/ui`는 만들지 않는다.  
**이유**: 이 저장소는 이미 `@/*` alias와 `src` 중심 구조를 사용하고 있다. 두 번째 component tree를 만들면 ownership이 다시 갈라진다.  
**트레이드오프**: shadcn CLI를 도입하더라도 path 설정을 repo 구조에 맞춰 수동 정렬해야 할 수 있다.

## ADR-010: 외부 data-table 예제는 패턴만 적응하고 demo 도메인은 버린다
**결정**: 제공된 `project-data-table.tsx` 류 예제는 column visibility, dropdown, row motion 패턴만 가져오고, repository/avatar/contributor 같은 demo 필드는 최종 UI에 들여오지 않는다.  
**이유**: 그대로 복제하면 운영 도메인과 무관한 UI가 섞여 AI slop처럼 보인다.  
**트레이드오프**: 적응 작업이 단순 copy-paste보다 조금 더 든다.

## ADR-011: `상품 관리`는 상품과 창고 기준정보의 canonical owner다
**결정**: `/products`는 상품과 창고 기준정보의 단일 owner다. `상품`은 SKU, 옵션, 상태, 표시명을, `창고`는 창고명, 식별 정보, 운영 메모를 관리한다. `기준 데이터`는 별도 top-level destination이 아니다.  
**이유**: 상품/창고 기준정보는 재고 운영의 참조 데이터이지만, 사용자 입장에서는 상품 관리라는 맥락으로 직접 찾는 편이 더 명확하다.  
**트레이드오프**: 기존 `기준 데이터`라는 내부 용어는 redirect와 label 정리로 흡수해야 한다.
