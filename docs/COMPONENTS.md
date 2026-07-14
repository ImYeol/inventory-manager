# Component Inventory

이 문서는 Seleccase Inventory의 컴포넌트 재사용을 위한 canonical source of truth다. 시각 토큰 값과 스케일은 [DESIGN.md](./DESIGN.md), UI 원칙과 경로 규칙은 [UI_GUIDE.md](./UI_GUIDE.md)의 [Shared Primitive](./UI_GUIDE.md#shared-primitive) 및 [컴포넌트 경로 규칙](./UI_GUIDE.md#컴포넌트-경로-규칙)을 따른다.

## 계층 경계

`src/app/components/ui.tsx`의 `ui.*`는 layout과 tokenized className을 연결하는 preset이다. 상태, event handler, portal, 접근성 상호작용을 소유하지 않으며, 화면 또는 primitive가 조합할 className만 둔다.

`src/components/ui/*`는 상태·동작·접근성 또는 반복 가능한 구조를 포함하는 React primitive다. 새 shared behavior와 reusable markup은 이 계층에 둔다. 화면별 업무 로직, server/external API 호출, 한 화면만을 위한 조립물은 두 계층 모두에 두지 않는다.

## Primitive 카탈로그

| 컴포넌트 | 파일 | 용도 | 주요 variant/props | 언제 쓰는가 | 하지 말 것 |
| --- | --- | --- | --- | --- | --- |
| `Badge`, `StatusBadge`, `BadgeTone` | `badge-1.tsx` | 짧은 상태/분류 표시 | `tone`: `neutral`, `info`, `success`, `warning`, `danger`; `icon` | 표 셀 또는 compact 상태 | 화면별 상태 chip을 새로 조립하지 않는다. |
| `BasicDataTable` | `basic-data-table.tsx` | generic 조회·preview table | `columns`, `rows`, `rowKey`, `renderCell`, `emptyState`; 선택적으로 `onRowClick`, `rowAriaLabel`, `getRowClassName` | 열과 셀 렌더러를 화면이 제공하는 조회 table | 편집 input table이나 화면별 `<table>`을 만들지 않는다. |
| `Button`, `buttonVariants`, `ButtonProps` | `button.tsx` | tokenized action/button | `variant`: `default`, `success`, `warning`, `destructive`, `outline`, `secondary`, `ghost`, `link`; `size`: `default`, `sm`, `lg`, `icon`; `asChild` | 링크/행동을 구분한 모든 공용 버튼 | page-local 색상·border 버튼을 만들지 않는다. |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | `card.tsx` | bordered surface 구조 | `Card.variant`: `default`, `muted`, `strong` | 필요한 card/surface와 header-body-footer 구조 | 설명용 wrapper card를 기본 레이아웃으로 쓰지 않는다. |
| `ColumnVisibilityMenu`, `ColumnOption` | `column-visibility-menu.tsx` | 컬럼 토글 dropdown | `columns`, `visibleColumns`, `onToggle` | `InventoryTableToolbar`의 재고 조회 컬럼 표시 control | 화면별 컬럼 토글 dropdown을 새로 만들지 않는다. |
| `DropdownMenu`, `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuGroup`, `DropdownMenuPortal`, `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuRadioGroup`, `DropdownMenuShortcut` | `dropdown-menu.tsx` | Radix 기반 action/selection menu | Radix props; 일부 item/label/sub-trigger는 `inset`; content는 `sideOffset` | menu, checkbox/radio 선택, sub-menu | native menu 또는 페이지별 popup menu를 만들지 않는다. |
| `EditableTable`, `EditableTableColumn`, `EditableTableProps` | `editable-table.tsx` | compact editable input table chrome | `columns`, `rows`, `getRowKey`, `renderCell`; 선택적으로 add/duplicate/delete, `rowError`, `minRows`, `disabled` | 소비자가 도메인 셀을 렌더하는 다건 입력 table | 조회 table의 정렬·컬럼 가시성·empty-state 역할을 중복하지 않는다. |
| `FilterToolbar` | `filter-toolbar.tsx` | compact filter/action container | `children`, `className` | 조회 조건과 action cluster의 toolbar | 독립 설명 card로 대체하거나 업무 상태를 과도하게 쌓지 않는다. |
| `FixedSheet` | `fixed-sheet.tsx` | 고정형 입력 overlay | `open`, `title`, `description`, `onClose`, `children`, `className` | 긴 form 또는 viewport 고정 overlay | 짧은 edit flow에는 사용하지 않는다. |
| `Input` | `input.tsx` | 공용 text/input control | native `<input>` props | 검색과 text/date/number 입력 | 화면별 input class 조합을 만들지 않는다. |
| `InventoryDataTable`, `InventoryDataRow`, `InventoryColumnKey`, `InventoryStatusVariant` | `inventory-data-table.tsx` | visible-column과 row motion을 갖는 재고 조회 table | `rows`, `visibleColumns`; 행은 model/option/warehouse/quantity/latest inbound·outbound/status | 재고 목록의 canonical 조회 table | 편집형 입력 table로 사용하거나 visible-column 동작을 재구현하지 않는다. |
| `InventoryTableToolbar` | `inventory-table-toolbar.tsx` | 재고 목록의 warehouse/search/status/column/action toolbar | warehouses, selected warehouse, search, status filter, columns, inbound/outbound callbacks | `InventoryDataTable`와 짝인 재고 조회 toolbar | 다른 도메인의 toolbar를 copy-paste하지 않는다. |
| `MenuLink`, `MenuSection` | `menu.tsx` | navigation link와 접히는 menu section | link: `href`, `label`, `icon`, `active`, `compact`, `onClick`; section: `title`, `open`, `onToggle`, `children` | sidebar/menu navigation | data mutation action을 navigation item으로 표현하지 않는다. |
| `Modal` | `modal.tsx` | portal 기반 짧은 form/edit overlay | `open`, `title`, `description`, `onOpenChange`, `children`, `footer`, `className` | short-lived form 또는 edit flow | 긴 입력 workspace를 억지로 넣지 않는다. |
| `Select`, `SelectGroup`, `SelectValue`, `SelectTrigger`, `SelectContent`, `SelectLabel`, `SelectItem`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton` | `select.tsx` | Radix 기반 selection input | Radix select props; content 기본 `position='popper'`, `sideOffset=4` | 모든 console dropdown selection input | native `<select>` 또는 화면별 dropdown을 새로 만들지 않는다. |
| `ShippingClassificationBadge`, `ShippingClassification` | `shipping-classification-badge.tsx` | 업로드 행의 channel classification | `classification`: `naver`, `coupang`, `unclassified`, `ambiguous` | shipping preview의 분류 상태 | provider 분류 badge를 화면에서 재구현하지 않는다. |
| `StoreConnectionRow` | `store-connection-row.tsx` | provider 연결 요약과 action surface | `provider`, `configured`, `summary`, `updatedAt`, `action`, `children` | settings의 store connection row | shipping에 연결 설명 card를 중복하지 않는다. |
| `StoreConnectionStatus` | `store-connection-status.tsx` | 연결 dot + label 상태 | `configured`, `compact`, `framed`, `disconnectedTone` | settings/shipping의 provider 연결 상태 | 페이지별 연결 상태 표현을 만들지 않는다. |
| `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption` | `table.tsx` | semantic table building blocks | 해당 native table element props와 `className` | `BasicDataTable`/`InventoryDataTable`로 표현할 수 없는 table 구성 | surface·empty state·row behavior를 화면별로 중복 조립하지 않는다. |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `tabs.tsx` | Radix view switch | Radix tabs props와 `className` | 같은 page의 상위 view switch | filter chip 또는 action toggle로 쓰지 않는다. |
| `ActionToolbar`, `ToolbarLinkAction`, `ToolbarButtonAction`, `ToolbarIconButton` | `toolbar.tsx` | compact action rail | link: `href`; button: button props; icon button: `label`, `icon` | 인접 surface에 붙는 navigation/data action group | navigation과 data mutation을 같은 element 역할로 섞지 않는다. |

## Preset 카탈로그

`ui`는 `src/app/components/ui.tsx`에서 export하는 className preset object이고, `cx`와 `PageHeader`도 같은 파일에서 export한다. 아래 그룹은 실제 키를 용도별로 묶은 것이다.

| 그룹 | `ui.*` 키 | 대응 primitive | 용도 |
| --- | --- | --- | --- |
| shell/surface | `shell`, `shellNarrow`, `surface`, `surfaceMuted`, `surfaceStrong`, `panel`, `panelHeader`, `panelBody` | `Card`, `FilterToolbar`, `FixedSheet`, `Modal` | page layout과 tokenized surface bridge |
| card | `card`, `cardMuted`, `cardStrong`, `cardHeader`, `cardBody`, `cardFooter` | `Card` family | shared card variant과 구조 |
| control/button | `label`, `control`, `controlSm`, `button`, `buttonPrimary`, `buttonSuccess`, `buttonSecondary`, `buttonWarning`, `buttonOutline`, `buttonGhost`, `buttonDanger`, `buttonLink`, `buttonDense`, `iconButton` | `Input`, `Select`, `Button`, toolbar actions | control 및 action style bridge |
| select/menu | `selectTrigger`, `selectContent`, `selectViewport`, `selectItem`, `selectLabel`, `selectSeparator`, `selectScrollButton` | `Select` family; `DropdownMenu` family | selection trigger와 menu surface |
| toolbar/status | `toolbar`, `toolbarDense`, `toolbarAction`, `actionGroupDense`, `statusPillDense`, `badge`, `pill`, `pillMuted` | `FilterToolbar`, `ActionToolbar`, `Badge`, `StoreConnectionStatus` | compact filter/action/status cluster |
| tabs/table | `tab`, `tabActive`, `tabsList`, `tabsTrigger`, `tabsTriggerActive`, `tabsContent`, `tableShell`, `tableHeadCell`, `tableCell`, `emptyState` | `Tabs` family, `Table` family, `BasicDataTable`, `InventoryDataTable` | view switch와 table structure |
| page typography | `pageKicker`, `pageTitle`, `pageLead`, `number`, `helpText` | `PageHeader` | page title, supporting copy, numeric text |
| navigation | `navSectionButton`, `navItem`, `navItemActive`, `navSubItem`, `desktopSidebar`, `mobileTopbar`, `mobileDrawerScrim`, `mobileDrawer` | `MenuLink`, `MenuSection` | desktop/mobile navigation layout |
| modal | `modal`, `modalOverlay`, `modalContent`, `modalHeader`, `modalBody`, `modalFooter` | `Modal`, `FixedSheet` | overlay and dialog structure |

`PageHeader`는 `title`, 선택 `description`·`actions`·`className`을 받는 page-level header component이며, `kicker` type prop은 현재 렌더링하지 않는다. `cx`는 `cn`을 위임하는 className helper다.

## Coverage 상태

| 상태 | 항목 | 현황 | 해소 예정 step |
| --- | --- | --- | --- |
| canonical | `BasicDataTable` | generic 조회/preview table의 shared primitive | 해당 없음 |
| canonical, 저활용 | `InventoryDataTable` | 재고 조회형 canonical이나 현재 사용처는 1곳 | Step 5–11에서 hand-roll 조회 table 흡수 |
| resolved | `ColumnVisibilityMenu` dead 표기 | `InventoryTableToolbar`의 실제 소비처를 확인해 dead 오탐을 정정; primitive는 canonical 유지 | Step 4 |
| resolved | 편집형 입력 table | `EditableTable`이 tokenized chrome, 행 action, 행 추가, inline validation을 소유하며 소비자가 셀을 렌더 | Step 3 |

| 현재 hand-roll `<table>` | 현재 역할 | 흡수 대상 primitive | 해소 예정 step |
| --- | --- | --- | --- |
| `InventoryView` | 조회형 재고 table | `InventoryDataTable` | Step 5–11 |
| `ShippingView` | 분류 preview | `BasicDataTable` + `ShippingClassificationBadge` | Step 5–11 |
| `InOutForm` | 편집형 입력 table | `EditableTable` | Step 6 |

## 사용 규칙

새 화면이나 기능은 hand-roll 전에 이 카탈로그에서 canonical primitive를 먼저 찾는다. 없으면 새 primitive를 바로 만들지 말고 기존 variant 또는 props 확장을 우선 검토한다. 운영 surface와 action 배치는 [UI_GUIDE.md §17](./UI_GUIDE.md#핵심-원칙) 및 [§22](./UI_GUIDE.md#핵심-원칙)를 따른다.
