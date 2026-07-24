# Design Tokens

이 문서는 Seleccase Inventory의 semantic visual token 계약이다. 구현값은 현재 `src/app/globals.css`에 남아 있지만, 새 구현과 마이그레이션의 목표값은 이 문서를 따른다. `DESIGN.md`는 방향과 예외를 설명하고, 컴포넌트는 raw 값을 직접 쓰지 않는다.

## Semantic aliases

| Alias | Canonical value | Role |
| --- | ---: | --- |
| `control` | `8px` | Input, Select, 일반 Button의 모서리 |
| `surface` | `10px` | TableSurface와 standalone data surface |
| `card` | `12px` | 일반 Card surface |
| `overlay` | `14px` | Dialog/전체 작업 overlay. Card와 구분되는 최대 surface radius |
| `pill` | `9999px` / `full` | Tabs, Badge, 상태 표시처럼 pill 의미가 있는 요소만 |

`control`, `surface`, `card`, `overlay`는 semantic alias로 소비한다. `radius-md`, `radius-xl` 같은 preset primitive 이름을 화면에서 직접 선택해 의미를 추론하지 않는다. 현재 `globals.css`에는 Tailwind `@theme`의 radius 재정의와 기존 `.ui-table-shell`/`.ui-data-surface`의 `radius-xl` 사용이 함께 존재하므로, 구현 phase에서 semantic alias로 수렴한다. 이 문서의 값은 현재 CSS를 소급해 주장하는 값이 아니라 migration target이다.

## Density and spacing

| Token | Canonical value | Usage |
| --- | ---: | --- |
| `table-header-height` | `40px` | standalone table header |
| `standalone-row-height` | `44px` | 조회형 dense row |
| `editable-row-min-height` | `48px` | 입력·검증·행 액션을 포함한 EditableTable |
| `cell-padding-x` | `16px` | table header/cell 좌우 inset |
| `control-group-gap` | `8px` | 같은 control group 내부 |
| `surface-control-gap` | `12px` | controls와 TableSurface 사이 |
| `section-gap` | `24px` | page hierarchy의 큰 구획 |
| `toolbar-row-gap` | `8px` | Action Row와 Query Row 사이 |
| `plot-inset-x` | `16px` | dashboard chart plot 좌우 inset |

값은 CSS custom property 또는 기존 spacing scale에 매핑하고, 컴포넌트에서 임의 숫자를 만들지 않는다. mobile tap target은 기존 접근성 계약대로 최소 44px을 유지한다. `scrollbar-gutter: stable`을 사용해 Column/Popover overlay가 열릴 때 body width가 변하지 않도록 한다.

## Column minimums

의미 기반 최소 너비는 table 내부 가로 스크롤과 column visibility의 기준이다.

| Semantic column kind | Minimum |
| --- | ---: |
| `identity` (상품/SKU/주문번호) | `220px` |
| `numeric` (수량/금액) | `96px` |
| `status` | `104px` |

화면은 우선순위가 낮은 열을 먼저 숨기고, 남은 overflow만 TableSurface 내부에서 scroll한다. 페이지 body에 table 때문에 horizontal scroll을 만들지 않는다.

## Migration notes

- `DESIGN.md`의 shadcn preset 선택, semantic color, Inter, motion 원칙은 유지한다.
- 현재 `globals.css`의 `--radius-md: 8px`는 `control`과 정렬되지만, `--radius-xl: 16px`를 table surface에 쓰는 부분은 `surface=10px`으로 옮긴다.
- 현재 `.ui-control-sm`의 작은 radius, pill이 아닌 일부 control, table/data surface의 `radius-xl`은 구현 phase의 migration 대상이다.
- 이 문서에 새로운 색상 팔레트나 페이지 전용 token을 추가하지 않는다. 색상은 shadcn semantic token을 사용한다.
