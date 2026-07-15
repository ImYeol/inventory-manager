# Architecture Decision Records

## ADR-001: 메뉴는 사용 맥락 중심 direct item을 우선하고, local section은 실제 child screen이 있을 때만 쓴다
**결정**: top-level 메뉴는 사용자가 자주 가는 목적지를 direct item으로 둔다. 확장형은 실제 child screen이 2개 이상일 때만 사용하고, 나머지는 local section이나 page internal nav로 처리한다.  
**이유**: 화면 수를 맞추기 위한 category는 사용자가 찾는 경로를 길게 만든다.  
**트레이드오프**: 일부 도메인은 top-level item이 아니라 local navigation으로 풀어야 한다.

## ADR-002: `재고 운영`은 하나의 first-level hub로 유지하고, 목록과 이력 중심으로 분산한다
**결정**: `재고 운영`은 1차 메뉴 하나로 유지하고, 목록·입고·출고를 중심으로 구성한다. 이력의 현재 canonical route는 top-level `/history`이며, CSV 또는 추가 감사 surface는 실제 필요가 생길 때 재고 운영 ownership 아래에서 분리한다.
**이유**: top-level을 다시 쪼개면 창고 담당자 흐름이 끊기지만, 모든 워크스페이스를 한 화면에 영구 고정하면 허브 자체가 과밀해진다.  
**트레이드오프**: inventory 내부 navigation과 top-level 이력 route 사이의 맥락 연결이 필요할 수 있다.

## ADR-003: list/history는 dense table + compact filters가 canonical surface다
**결정**: 재고 운영의 canonical surface는 summary card-first가 아니라 `compact filter toolbar + dense data table` 구조다. 목록은 현재 재고를, 이력은 변동 기록을 먼저 보여준다.  
**이유**: 실제 작업은 창고, 상품명, 상태, 컬럼 가시성 변경과 표 읽기에서 발생한다.  
**트레이드오프**: glanceable KPI는 secondary badge strip 정도로 축소해야 한다.

## ADR-004: 입고는 단일 재고 진입 action이고 빠른 입고/출고는 fixed-mode overlay로 단순화한다
**결정**: 별도 `재고 추가` action은 제거한다. 입고 버튼은 신규 상품 옵션+창고 조합의 첫 입고와 기존 조합의 수량 증가를 모두 처리하는 유일한 수동 입고 action이며, 출고 버튼은 현재 `onHand`를 줄이는 수동 조정 overlay만 연다. 주문 발송 출고는 별도 자동 흐름으로 유지한다. overlay 안에서 다시 타입을 바꾸지 않는다.
**이유**: 선택값과 초기 수량을 저장하지 않고 입고 화면만 다시 여는 중복 경로는 action의 결과를 보장하지 못한다. 진입한 액션과 팝업 모드가 다르면 사용자가 지금 무엇을 저장하는지 다시 해석해야 한다.
**트레이드오프**: inbound/outbound가 하나의 form primitive를 공유하더라도 상위에서 mode lock과 간결한 도움말이 필요하다.

## ADR-004A: FixedSheet는 portal과 명시적 overlay/content layering을 소유한다
**결정**: `FixedSheet`는 `Modal`과 같이 portal, body scroll lock, Escape close, 고유 title id를 소유한다. overlay는 content보다 낮은 stacking context를, sheet content는 더 높은 stacking context를 가져야 한다.
**이유**: overlay가 content보다 높으면 backdrop blur가 sheet 전체에 적용되어 입력 surface가 읽히지 않는다.
**트레이드오프**: primitive가 DOM lifecycle과 접근성 속성을 직접 관리한다.

## ADR-005: 빠른 입력 overlay에서는 `표 붙여넣기`를 제거하고 editable table만 남긴다
**결정**: 수동 입출고 overlay는 compact editable table을 중심으로 하고 `표 붙여넣기`/bulk import panel은 CSV 경로로 이동시킨다.  
**이유**: 빠른 입력 팝업의 목표는 최소 필드로 빠르게 저장하는 것이지, 모든 입력 경로를 한 overlay에 몰아넣는 것이 아니다.  
**트레이드오프**: 대량 입력은 CSV 경로가 더 중요해진다.

## ADR-006: 스토어 연결은 설정 소유로 수렴한다
**결정**: 네이버/쿠팡 연결 상태와 credential 편집의 canonical owner는 `/settings`다. primary navigation에는 설정을 두지 않고, 계정 메뉴의 `API 설정` deep link(`/settings?section=store-connections`)로 진입한다. `/integrations`는 `redirect('/settings')`로 수렴하며, thin alias는 redirect 전 과도기 조치로만 허용한다.
**이유**: `IntegrationsView`와 `SettingsView`가 동시에 스토어 연결을 설명하면 IA가 중복되고, 사용자는 어디서 연결을 바꾸는지 헷갈린다.  
**트레이드오프**: 기존 `/integrations` 링크는 호환 경로 또는 redirect 처리가 필요하다.

## ADR-007: 송장 작업은 연결 설명이 아니라 주문 owner의 분류·발송 실행 surface다
**결정**: `/orders/tracking-import`는 `업로드 → 미리보기 → 분류 → 매칭/발송`만 소유한다. `/shipping`은 이 route로 redirect한다. 별도 `연동 준비 상태` 섹션은 두지 않는다. 채널별 발송 액션은 preview surface와 붙여서 다룬다.
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
**결정**: 외부에서 제공된 data-table 예제는 column visibility, dropdown, row motion 패턴만 가져오고, repository/avatar/contributor 같은 demo 필드는 최종 UI에 들여오지 않는다.
**이유**: 그대로 복제하면 운영 도메인과 무관한 UI가 섞여 AI slop처럼 보인다.  
**트레이드오프**: 적응 작업이 단순 copy-paste보다 조금 더 든다.

## ADR-011: `상품 관리`는 상품과 창고 기준정보의 canonical owner다
**결정**: `/products`는 상품과 창고 기준정보의 단일 owner다. `상품`은 SKU, 옵션, 상태, 표시명을, `창고`는 창고명, 식별 정보, 운영 메모를 관리한다. `기준 데이터`는 별도 top-level destination이 아니다.  
**이유**: 상품/창고 기준정보는 재고 운영의 참조 데이터이지만, 사용자 입장에서는 상품 관리라는 맥락으로 직접 찾는 편이 더 명확하다.  
**트레이드오프**: 기존 `기준 데이터`라는 내부 용어는 redirect와 label 정리로 흡수해야 한다.

## ADR-012: 상단 tabs는 view switch, toolbar는 filter/action, card는 border language로 분리한다
**결정**: tabs, toolbar, bordered surface의 역할을 각각 view switch, filter/action, shared border language로 분리한다.
**이유**: tabs를 필터처럼 쓰거나 toolbar를 navigation처럼 쓰면 dense operational screen의 의미가 흐려진다. card/surface language를 분리하면 설명용 chrome을 줄이고 bordered surfaces를 일관되게 만들 수 있다.
**트레이드오프**: 기존 화면에서 tabs, toolbar, card의 역할이 섞여 있으면 재배치가 필요하다.

운영 규칙 세부는 UI Guide의 [Layout Rules](./UI_GUIDE.md#layout-rules)와 [Shared Primitive](./UI_GUIDE.md#shared-primitive)를 참조한다.

## ADR-013: 분석은 독립 1차 메뉴가 아니라 dashboard 내부 section으로 둔다
**결정**: `분석`은 sidebar direct item으로 두지 않고 dashboard 내부 section으로 흡수한다. `/analytics`는 legacy redirect만 유지한다.  
**이유**: KPI와 분석 차트가 같은 operational context를 설명하는데 메뉴와 화면을 분리하면 지표가 중복되고 탐색 비용만 늘어난다.  
**트레이드오프**: dashboard props와 analytics action 시그니처가 조금 더 커진다.

## ADR-014: 상품 추가는 최소 modal과 후속 옵션 생성 action 조합으로 처리한다 (ADR-030으로 대체)
**결정**: 초기 모델 중심 등록 결정은 ADR-030의 channel-first 상품 관리와 원자적 내부 상품 생성 flow로 대체한다.
**이유**: 채널 상품과 내부 판매 옵션의 연결에는 고유 판매자 SKU가 필요해 개별 legacy action 조합으로는 불완전하다.
**트레이드오프**: legacy `models/sizes/colors` 스키마는 호환을 위해 유지한다.

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
**결정**: 목록 관리 화면은 toolbar 뒤 primary table을 canonical 작업 surface로 둔다.
**이유**: 운영자가 빠르게 필터를 바꾸고 표를 읽는 화면에서는 설명 chrome이 반복될수록 작업 표면이 늦게 보인다.  
**트레이드오프**: page-level context가 필요한 경우에도 한 번만 보여주도록 헤더와 toolbar 메타를 정리해야 한다.

운영 규칙 세부는 UI Guide의 [Layout Rules](./UI_GUIDE.md#layout-rules)와 [페이지 chrome 예산](./UI_GUIDE.md#페이지-chrome-예산)을 참조한다.

## ADR-021: strong card seam 문제는 shared primitive로 해결한다
**결정**: header/body를 함께 담는 strong card는 하나의 clipped surface로 읽혀야 하며, corner gap이나 segmented seam을 page-local border patch로 땜질하지 않는다. 대신 shared card/surface primitive의 variant, padding, token을 고친다.  
**이유**: settings-card처럼 카드가 두 개로 쪼개져 보이면 동일 surface가 아니라 임시 조립물처럼 읽힌다. 이런 문제를 페이지별 border 수정으로 막으면 재발한다.  
**트레이드오프**: 카드가 어색하면 개별 화면에서 고치는 대신 shared primitive까지 올라가야 하므로 수정 범위가 커질 수 있다.

**Card composition contract**: [vendor-neutral contract](../design-system/contracts/card.composition.json)가 component composition을 정의한다. 문서는 의도를 설명하고, code와 harness가 contract alignment를 검증한다.

## ADR-022: 운영 콘솔은 Simple Surface First와 component budget을 기본 원칙으로 삼는다
**결정**: 운영 콘솔은 Simple Surface First와 component budget을 기본 판단 기준으로 삼는다.
**이유**: 운영 콘솔에서 실제 가치가 생기는 지점은 설명 카드가 아니라 표, 필터, 액션이다. component 수와 action 수가 늘어날수록 사용자는 어디를 눌러야 하는지 다시 해석해야 한다.  
**트레이드오프**: 화면별로 즉흥적인 wrapper나 상태 카드를 추가하는 대신, shared primitive와 existing surface를 더 엄격하게 재사용해야 한다.

운영 규칙 세부는 UI Guide의 [Compact Action Doctrine](./UI_GUIDE.md#compact-action-doctrine)과 [Component Budget Checklist](./UI_GUIDE.md#component-budget-checklist)를 참조한다.

## ADR-023: 쿠팡 운송장 업로드는 기본 택배사 코드 + 일반배송 v1로 고정한다
**결정**: 쿠팡 운송장 업로드는 설정의 `defaultDeliveryCompanyCode`를 사용하고, `shipmentBoxId + orderId + vendorItemId` 단위의 `orderSheetInvoiceApplyDtos[]` payload로 전송한다. v1 범위에서는 `splitShipping=false`, `preSplitShipped=false`, `estimatedShippingDate=""`의 일반배송만 지원한다.  
**이유**: 현재 운송장 화면의 핵심 목적은 엑셀 업로드 후 빠르게 분류하고 반영하는 것이다. 행별 택배사 코드 입력이나 분리배송 UI까지 한 번에 열면 preview toolbar와 row state가 과도하게 복잡해진다.  
**트레이드오프**: 분리배송과 행별 택배사 지정은 후속 범위로 남기고, 현재는 설정의 기본값과 item-level payload로 안정적으로 수렴한다.

## ADR-024: 운영 콘솔의 기본 필터는 intent-ranked minimal set으로 제한한다
**결정**: 운영 콘솔의 기본 filter set은 field-complete가 아니라 intent-ranked minimal set이다.
**이유**: history처럼 감사성 메타가 많은 화면은 모든 속성을 필터로 올리기 시작하면 toolbar가 빠르게 과밀해진다. 또한 embedded view에서 filterable field를 context pill로 바꾸거나 local tab state로만 들고 있으면 standalone과 interaction 문법이 갈라지고, 탭 전환 시 상태가 사라져 사용성이 떨어진다.  
**트레이드오프**: 일부 low-frequency filter는 즉시 보이지 않을 수 있으므로 별도 disclosure나 audit surface로 승격하는 기준이 필요하다.

운영 규칙 세부는 UI Guide의 [Filter Budget Rules](./UI_GUIDE.md#filter-budget-rules)를 참조한다.

**외부 근거**
- Carbon: table에 영향을 주는 액션은 table toolbar에 둔다.
- PatternFly: action은 영향을 주는 surface 가까이에 둔다.
- Oracle: 자동 반영 가능한 흐름에는 불필요한 refresh UI를 늘리지 않는다.

## ADR-025: 시각 기반 토큰 계층과 명명 스케일을 도입한다
**결정**: visual token은 primitive → semantic → component 계층으로 관리한다. primitive/semantic은 `src/app/globals.css`, component preset bridge는 `src/app/components/ui.tsx`, shared primitive는 `src/components/ui/*`가 소유한다. 컴포넌트에 색상, 크기, radius, duration을 하드코딩하지 않는다.
**이유**: 스케일 부재로 작은 높이가 3종, 이름 없는 radius가 7종, `150ms` 하드코딩이 누적되어 화면별 드리프트가 발생했다.
**트레이드오프**: 단순한 시각 변경도 먼저 토큰과 primitive 계층을 검토해야 하지만, 이후 변경의 일관성과 검토 가능성이 높아진다.

## ADR-026: base 뉴트럴은 warm으로, 브랜드 accent는 amber로 유지한다
**결정**: base neutral palette는 warm neutral을 사용하고, action-first 브랜드 accent는 amber를 유지한다.
**이유**: 노션식 가시성과 따뜻한 표면 깊이를 얻으면서 기존 브랜드의 amber 정체성을 보존한다.
**트레이드오프**: 기존 cool slate 화면은 warm tone에 맞춰 점진적으로 재조정해야 한다.

## ADR-027: 모션은 semantic tier와 표준 easing으로 통일한다
**결정**: 모션은 instant/fast/base/slow semantic tier와 표준 easing을 사용하고 `prefers-reduced-motion`을 존중한다.
**이유**: 고빈도 상호작용의 반응성을 유지하면서 화면별 임의 transition 값을 제거한다.
**트레이드오프**: 장식적 spring이나 반복 효과의 표현 폭은 줄지만, 운영 데이터의 가독성과 접근성은 높아진다.

## ADR-028: 컴포넌트 인벤토리를 재사용의 canonical SoT로 둔다
**결정**: `docs/COMPONENTS.md`를 preset과 shared primitive 재사용의 canonical source of truth로 둔다. hand-roll 또는 새 primitive를 도입하기 전에는 이 카탈로그를 확인하고, 기존 variant 확장 가능성을 먼저 검토한다.
**이유**: preset, primitive, 화면별 조립물이 함께 존재하는 상태에서 canonical·dead·gap을 한곳에 기록하지 않으면 같은 역할의 UI가 다시 분기된다.
**트레이드오프**: 새 UI 작업 전에 카탈로그 검토가 추가되지만, component ownership과 후속 통합 대상이 명확해진다.

## ADR-029: 주문과 송장 작업은 `/orders`로 수렴하고 재고는 예약과 절대 수량 동기화로 관리한다
**결정**: primary navigation의 canonical IA는 `대시보드 / 주문 / 상품 관리 / 재고 운영 / 소싱`이다. `/settings`는 primary navigation이 아닌 계정 메뉴의 `API 설정` deep link(`/settings?section=store-connections`)로 접근하는 스토어 연결 owner다. `/orders`는 주문과 송장 작업의 owner이고, `/shipping`은 `/orders/tracking-import`로 redirect한다. `ProductVariant`는 판매·재고 단위, `ChannelProductRef`는 채널 상품/옵션 참조다. 재고는 `onHand`, `committed`, `available`, `incoming`, `channelReported`로 분리한다.

`available = onHand - committed`이며 `incoming`은 보유 수량에 더하지 않는다. 주문 확정은 예약(`committed` 증가)만 원자적으로 반영한다. 외부 발송 성공 후에만 예약 해제와 `onHand` 차감을 같은 원자적 작업으로 수행한다. 채널 동기화는 delta가 아닌 `available`의 절대 수량을 전송하고, 성공 후에만 `channelReported`를 갱신한다.

**이유**: 주문·송장 실행 위치를 하나로 정하고, 외부 실패/재시도에서 재고가 이중 차감되는 일을 막으며, 채널의 절대 수량을 내부 판매 가능 수량과 일관되게 맞춘다.

**트레이드오프**: 예약, 발송 성공, 채널 성공 응답을 각기 독립된 상태 전이로 구현해야 하므로 이후 schema와 action의 트랜잭션 경계가 명확해야 한다.

## ADR-030: 상품 관리는 channel-first table과 내부 상품 보조 flow를 사용한다
**결정**: `/products`는 variants가 비어도 채널 상품 table을 canonical surface로 렌더한다. unlinked `ChannelProductRef`는 `연결 필요` 행으로 남기고, 연결은 명시적인 variant 선택 또는 exact seller SKU 제안으로만 한다. 내부 상품은 local-only server action으로 bounded variant/SKU 조합을 만든다.
**이유**: 외부 상품 원문과 내부 재고 단위를 분리하면서, 누락된 매핑을 실제 작업 표면에서 처리할 수 있다.
**트레이드오프**: 채널 sync 전의 빈 표도 유지되며, 내부 상품 등록에는 조합 수 validation이 필요하다.
