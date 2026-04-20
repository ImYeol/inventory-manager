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
**결정**: 네이버/쿠팡 연결 상태와 credential 편집의 canonical owner는 `/settings`다. `/integrations`는 남더라도 redirect 또는 thin alias로 제한한다. 가능하면 provider별 상태 요약과 편집 form은 같은 surface에 둔다.
**이유**: `IntegrationsView`와 `SettingsView`가 동시에 스토어 연결을 설명하면 IA가 중복되고, 사용자는 어디서 연결을 바꾸는지 헷갈린다.  
**트레이드오프**: 기존 `/integrations` 링크는 호환 경로 또는 redirect 처리가 필요하다.

## ADR-007: `운송장`은 연결 설명 페이지가 아니라 분류와 발송 실행 화면이다
**결정**: `/shipping`은 `업로드 → 미리보기 → 분류 → 매칭/발송`만 소유한다. 별도 `연동 준비 상태` 섹션은 두지 않는다. 채널별 발송 액션은 preview surface와 붙여서 다룬다.
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

## ADR-012: 상단 tabs는 view switch, toolbar는 filter/action, card는 border language로 분리한다
**결정**: 상단 tabs는 같은 page 안의 view switch에만 사용한다. filter와 action은 compact toolbar로 둔다. bordered container는 shared surface/card variants를 canonical language로 사용한다.
**이유**: tabs를 필터처럼 쓰거나 toolbar를 navigation처럼 쓰면 dense operational screen의 의미가 흐려진다. card/surface language를 분리하면 설명용 chrome을 줄이고 bordered surfaces를 일관되게 만들 수 있다.
**트레이드오프**: 기존 화면에서 tabs, toolbar, card의 역할이 섞여 있으면 재배치가 필요하다.

## ADR-013: 분석은 독립 1차 메뉴가 아니라 dashboard 내부 section으로 둔다
**결정**: `분석`은 sidebar direct item으로 두지 않고 dashboard 내부 section으로 흡수한다. `/analytics`는 legacy redirect만 유지한다.  
**이유**: KPI와 분석 차트가 같은 operational context를 설명하는데 메뉴와 화면을 분리하면 지표가 중복되고 탐색 비용만 늘어난다.  
**트레이드오프**: dashboard props와 analytics action 시그니처가 조금 더 커진다.

## ADR-014: 상품 추가는 최소 modal과 후속 옵션 생성 action 조합으로 처리한다
**결정**: 상품 추가는 `모델명 + 기본 사이즈들 + 기본 색상들`만 받는 최소 modal로 처리하고, 저장 시 `createModel` 뒤에 `createModelSize/createModelColor`를 조합 호출한다.  
**이유**: 상품 관리의 기본 흐름은 빠른 기준정보 생성이지 상세 편집 화면 탐색이 아니다.  
**트레이드오프**: 생성 직후 고급 편집은 별도 흐름으로 남겨야 한다.

## ADR-015: provider 연결 상태는 dot + label primitive로 통일한다
**결정**: 네이버/쿠팡 연결 상태는 shared `StoreConnectionStatus` primitive 하나로 표현한다. 연결됨은 초록 dot, 미연결은 빨강 dot를 사용한다.  
**이유**: settings와 shipping에서 상태 표현이 갈라지면 같은 상태를 다른 배지 언어로 읽게 된다.  
**트레이드오프**: 기존 status badge 기반 UI는 일부 밀도 조정이 필요하다.

## ADR-016: sourcing factories는 table + detail modal 구조로 전환한다
**결정**: 외부 공장 목록은 카드형 master/detail 레이아웃 대신 `toolbar + table + detail modal + register modal` 구조를 쓴다.  
**이유**: 운영자가 많은 공장을 빠르게 훑고 필터링하려면 카드형 탐색보다 행 중심 표면이 낫다.  
**트레이드오프**: row interaction과 modal 상태 관리가 추가된다.

## ADR-017: console의 선택형 입력은 native select를 쓰지 않고 shared Select primitive로 통일한다
**결정**: 운영 콘솔 내 선택형 입력은 `src/components/ui/select.tsx`를 canonical primitive로 사용하고 native `<select>` 또는 화면별 개별 dropdown 구현은 남기지 않는다.  
**이유**: 재고 운영, 상품 관리, 운송장, 소싱, dashboard에서 서로 다른 dropdown 언어가 섞이면 interaction 품질과 시각 일관성이 무너진다.  
**트레이드오프**: 테스트 환경에서는 portal/scroll 동작을 고려한 보강이 필요하다.

## ADR-018: UI 변경과 검사 스크립트는 shared design system 사용 여부를 함께 검토한다
**결정**: `docs/UI_GUIDE.md`와 hooks/검사 스크립트는 UI 변경 시 shared theme, component, primitive, design token 사용 여부를 함께 검토하도록 유지한다.  
**이유**: 문서와 검사 로직이 같은 기준을 보지 않으면 UI 원칙이 코드보다 먼저 느슨해진다.  
**트레이드오프**: hooks와 문서의 수정 범위가 함께 움직여야 한다.

## ADR-019: page-level self-themed UI를 금지하고 shared primitive variant로 올린다
**결정**: 페이지 안에서 inline style이나 ad-hoc class 조합으로 새로운 색상/보더/배경 언어를 만들지 않는다. 필요한 시맨틱은 shared primitive variant와 design token에 먼저 추가한다.  
**이유**: inventory toolbar처럼 같은 의미의 액션이 페이지별로 다른 inline style을 쓰기 시작하면 디자인 시스템이 깨지고, hooks가 검출할 수 있는 기준도 약해진다.  
**트레이드오프**: 간단한 화면 수정도 먼저 primitive 계층을 손봐야 할 수 있지만, 전체 surface의 일관성은 유지된다.

## ADR-020: list-management screens는 toolbar 다음 primary table을 기본 surface로 둔다
**결정**: inventory처럼 목록 관리가 주된 화면은 `compact filter/action toolbar -> primary table`을 기본 구조로 사용하고, 같은 표를 설명하는 title/subtitle/count chrome을 중복으로 올리지 않는다.  
**이유**: 운영자가 빠르게 필터를 바꾸고 표를 읽는 화면에서는 설명 chrome이 반복될수록 작업 표면이 늦게 보인다.  
**트레이드오프**: page-level context가 필요한 경우에도 한 번만 보여주도록 헤더와 toolbar 메타를 정리해야 한다.

## ADR-021: strong card seam 문제는 shared primitive로 해결한다
**결정**: header/body를 함께 담는 strong card는 하나의 clipped surface로 읽혀야 하며, corner gap이나 segmented seam을 page-local border patch로 땜질하지 않는다. 대신 shared card/surface primitive의 variant, padding, token을 고친다.  
**이유**: settings-card처럼 카드가 두 개로 쪼개져 보이면 동일 surface가 아니라 임시 조립물처럼 읽힌다. 이런 문제를 페이지별 border 수정으로 막으면 재발한다.  
**트레이드오프**: 카드가 어색하면 개별 화면에서 고치는 대신 shared primitive까지 올라가야 하므로 수정 범위가 커질 수 있다.

## ADR-022: 운영 콘솔은 Simple Surface First와 component budget을 기본 원칙으로 삼는다
**결정**: 모든 운영 화면은 `compact toolbar + primary surface`를 기본 구조로 하고, 새 기능은 새 카드/새 섹션을 추가하기 전에 기존 toolbar, table, header, action rail 안에서 먼저 흡수한다. 전역 액션은 영향을 주는 surface 가까이에 두고, 관련 액션은 compact group으로 묶는다.  
**이유**: 운영 콘솔에서 실제 가치가 생기는 지점은 설명 카드가 아니라 표, 필터, 액션이다. component 수와 action 수가 늘어날수록 사용자는 어디를 눌러야 하는지 다시 해석해야 한다.  
**트레이드오프**: 화면별로 즉흥적인 wrapper나 상태 카드를 추가하는 대신, shared primitive와 existing surface를 더 엄격하게 재사용해야 한다.

## ADR-023: 쿠팡 운송장 업로드는 기본 택배사 코드 + 일반배송 v1로 고정한다
**결정**: 쿠팡 운송장 업로드는 설정의 `defaultDeliveryCompanyCode`를 사용하고, `shipmentBoxId + orderId + vendorItemId` 단위의 `orderSheetInvoiceApplyDtos[]` payload로 전송한다. v1 범위에서는 `splitShipping=false`, `preSplitShipped=false`, `estimatedShippingDate=""`의 일반배송만 지원한다.  
**이유**: 현재 운송장 화면의 핵심 목적은 엑셀 업로드 후 빠르게 분류하고 반영하는 것이다. 행별 택배사 코드 입력이나 분리배송 UI까지 한 번에 열면 preview toolbar와 row state가 과도하게 복잡해진다.  
**트레이드오프**: 분리배송과 행별 택배사 지정은 후속 범위로 남기고, 현재는 설정의 기본값과 item-level payload로 안정적으로 수렴한다.

## ADR-024: 운영 콘솔의 기본 필터는 intent-ranked minimal set으로 제한한다
**결정**: 운영 콘솔의 기본 filter set은 field-complete가 아니라 intent-ranked minimal set이다. 기본 필터는 자주 바꾸는 핵심 조회 조건만 노출하고, row에서 이미 읽히는 감사/참조 메타는 기본 필터에 중복 추가하지 않는다. shared view가 embedded와 standalone에 모두 쓰일 때는 같은 control vocabulary를 유지하고, 탭 unmount로 상태가 사라지면 안 되는 경우 filter state는 parent workspace가 소유한다.  
**이유**: history처럼 감사성 메타가 많은 화면은 모든 속성을 필터로 올리기 시작하면 toolbar가 빠르게 과밀해진다. 또한 embedded view에서 filterable field를 context pill로 바꾸거나 local tab state로만 들고 있으면 standalone과 interaction 문법이 갈라지고, 탭 전환 시 상태가 사라져 사용성이 떨어진다.  
**트레이드오프**: 일부 low-frequency filter는 즉시 보이지 않을 수 있으므로 row metadata, modal, advanced disclosure, dedicated audit page로 단계적으로 승격하는 기준이 필요하다. 이 규칙은 history뿐 아니라 shipping preview, sourcing table, settings table-toolbar에도 공통 적용한다.

**외부 근거**
- Carbon: table에 영향을 주는 액션은 table toolbar에 둔다.
- PatternFly: action은 영향을 주는 surface 가까이에 둔다.
- Oracle: 자동 반영 가능한 흐름에는 불필요한 refresh UI를 늘리지 않는다.
