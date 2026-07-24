# Data Layout Contracts

이 문서는 표가 있는 모든 메뉴와 overlay의 공통 배치 계약이다. 페이지별 업무 의미는 `docs/specs/pages/`가 소유하고, 수치 token은 [tokens.md](./tokens.md)가 소유한다.

## Current API and migration target

현재 코드의 `TableSurface`는 `toolbar` prop을, `DataTable`은 `toolbarStart`/`toolbarEnd` prop을 여전히 제공한다. 이 API와 기존 소비처는 구현 phase에서 호환성을 위해 보존한다. 아래 detached-controls 규칙은 승인된 migration target이며, 현재 모든 화면에 이미 적용됐다는 의미가 아니다.

## Three contexts

### `standalone`

주문, 상품, 재고, 이력, 입고처, 입고 예정처럼 결과 집합을 직접 조회·작업하는 화면이다. `page header → tabs → Action Row → Query Row → TableSurface`를 사용한다.

### `embedded-bare`

대시보드 카드, 상세 Dialog, overlay 안의 보조 표다. 별도 toolbar·pagination·surface를 강제하지 않고 `DataTable(bare)` 또는 기존 table primitive만 제공한다. standalone의 filter vocabulary가 필요한 경우에도 page chrome은 중복하지 않는다.

### `editable`

입고·출고·다건 등록처럼 행을 직접 입력하는 화면이다. 조회용 Query Row를 붙이지 않고 `EditableTable`의 최소 48px 행, 셀 검증, 행 추가/복제/삭제와 footer 저장을 사용한다.

## Page hierarchy

일반 메뉴는 다음 순서를 고정한다.

`Breadcrumb → title/description → tabs → controls → table`

대시보드는 breadcrumb를 생략한다. title/description은 한 번만 보여주고, table 위에 같은 내용을 설명하는 별도 card를 추가하지 않는다.

## Standalone controls

Migration target에서는 controls를 TableSurface 바깥의 page background 위에 놓는다. 현재 일부 화면은 기존 `TableSurface.toolbar` 또는 `DataTable.toolbarStart`/`toolbarEnd`를 사용하므로, 각 구현 step에서 점진적으로 분리한다. 최종 TableSurface에는 실제 table header/body/footer만 들어간다.

- Action Row: 기본 split 문맥에서는 결과 count/meta는 왼쪽, 업무 변경 action은 오른쪽이다. 단, table footer가 같은 결과 count를 제공하면 Action Row에서 중복하지 않는다. action-only 문맥은 생성 action 하나(`products`)를 `end`, 운영 action family(`inventory`)를 `start`로 명시하며 `ActionRow`의 alignment API로 표현한다.
- Query Row: 왼쪽 `QueryRowStart`에 search → 핵심 Select filter, 오른쪽 `QueryRowEnd`에 outlined `QueryResetButton` → Column visibility를 둔다. 텍스트 control은 center 정렬하지 않는다. 다른 의미의 저강조 action만 `ghost`를 사용한다.
- Column button은 label과 icon에 맞는 intrinsic width를 유지한다.
- 연결형 `ButtonGroup`은 split button처럼 경계를 공유해야 하는 한 control에만 사용한다. inventory 운영 action처럼 각각 독립 의미와 focus target을 가지는 action family는 `IndependentActionGroup`을 사용해 각 버튼의 radius/border를 유지한다.
- `IndependentActionGroup`은 `--space-1` 간격, `Button size="sm"`, cluster 내부 horizontal overflow를 사용한다.
- 서로 다른 business action은 독립 Button으로 두고 8px group gap을 사용한다. 예: 주문 동기화와 송장 등록.
- row action은 대표 action 하나만 inline으로 두고 나머지는 `…` menu에 둔다. 위험 action은 menu 하단에서 분리한다.
- toolbar는 역할 row를 섞지 않으며, 무작위 wrap으로 높이를 해결하지 않는다.
- 1112px 기준으로 Action Row의 business action은 겹치지 않아야 한다. 폭이 부족하면 해당 action cluster 내부에서 compact/overflow를 사용하며 page-level wrap이나 body overflow를 만들지 않는다.

## Responsive behavior

desktop에서 핵심 query controls는 Query Row에 유지한다. 폭이 부족해지면 Select filter들을 `필터` Popover 하나로 접고 search는 남은 폭을 사용한다. mobile의 filter surface는 full-screen Dialog로 연다. Column button은 계속 intrinsic width다.

Table overflow는 TableSurface 안에서만 발생한다. query/action overflow는 각 cluster 내부에 제한하며 page-level horizontal overflow를 만들지 않는다. identity/numeric/status 최소 너비는 [tokens.md](./tokens.md)의 기준을 사용하고, 낮은 우선순위 열을 먼저 숨긴다.

Column visibility menu와 Popover/Dropdown은 document scrollbar geometry를 바꾸지 않는다. `scrollbar-gutter: stable`을 유지하고 overlay는 portal surface에서만 스크롤한다.

## Text, alignment, density

- standalone primary identity와 secondary metadata는 각각 한 줄 `truncate`를 기본으로 한다. full value는 title/accessible description과 상세 Dialog에서 제공한다.
- mobile에서 primary identity만 최대 2줄을 허용한다. 긴 텍스트 때문에 임의로 행 전체를 여러 줄로 늘리지 않는다.
- text는 왼쪽, numeric은 오른쪽, status는 가운데, row action은 오른쪽 정렬한다.
- header는 40px, standalone row는 44px, editable row는 최소 48px이다. header/cell x padding은 16px다.

## TableSurface and states

TableSurface는 `1px border`, `10px radius`, 기본 shadow 없음이다. controls와 12px 떨어진 독립 surface이며, child table은 자체 border를 추가하지 않는다.

- loading: header와 높이를 유지하는 skeleton rows
- filtered empty: 조건 안내 + `필터 초기화`
- empty dataset: 필요한 경우에만 대표 생성 action
- error: table body 안 설명 + `다시 시도`
- EditableTable validation: 셀 단위 오류와 상단 오류 요약

상태를 toast 하나로만 표현하거나, table 밖의 별도 설명 card로 중복하지 않는다.
