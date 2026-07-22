# Component Inventory

이 문서는 Seleccase Inventory의 컴포넌트 재사용을 위한 canonical source of truth([ADR-028](../adr/0028-component-inventory-source-of-truth.md))다. 시각 토큰 값과 원칙은 [DESIGN.md](./DESIGN.md), UI 원칙과 경로 규칙은 [UI_GUIDE.md](./ui-guide.md)의 [Shared Primitive](./ui-guide.md#shared-primitive) 및 [컴포넌트 경로 규칙](./ui-guide.md#컴포넌트-경로-규칙)을 따른다.

## 계층 경계

`src/app/components/ui.tsx`의 `ui.*`는 layout과 tokenized className을 연결하는 preset이다. 상태, event handler, portal, 접근성 상호작용을 소유하지 않으며, 화면 또는 primitive가 조합할 className만 둔다.

`src/components/ui/*`는 상태·동작·접근성 또는 반복 가능한 구조를 포함하는 React primitive다. 새 shared behavior와 reusable markup은 이 계층에 둔다. 화면별 업무 로직, server/external API 호출, 한 화면만을 위한 조립물은 두 계층 모두에 두지 않는다.

## Primitive 카탈로그

| 컴포넌트 | 파일 | 용도 | 주요 variant/props | 언제 쓰는가 | 하지 말 것 |
| --- | --- | --- | --- | --- | --- |
| `Badge`, `StatusBadge`, `BadgeTone` | `badge-1.tsx` | 짧은 상태/분류 표시 | `tone`: `neutral`, `info`, `success`, `warning`, `danger`; `icon` | 표 셀 또는 compact 상태 | 화면별 상태 chip을 새로 조립하지 않는다. |
| `ChannelBadge`, `Channel`, `ChannelListingStatus` | `channel-badge.tsx` | 채널명과 판매/동기화 상태를 함께 노출하는 canonical badge | `channel`: `naver` \| `coupang`; `listingStatus`: `active` \| `unregistered` \| `paused` \| `sync-error`; 선택 `compact` | 주문, 상품 관리, 채널 동기화의 channel/listing 상태 | page-local channel chip 또는 채널 색만으로 상태를 만들지 않는다. |
| `ProductVariantCombobox` | `product-variant-combobox.tsx` | `Popover`(`@radix-ui/react-popover`) + `Command`(`cmdk`, `shouldFilter={false}`) 기반 검색·명시 선택 combobox. 화살표 키 탐색·`aria-activedescendant`·focus restore는 두 라이브러리가 제공 | `variants`, `value`, `onValueChange` | 미연결 채널 상품의 수동 variant 연결 | 상품명으로 자동 선택하거나 free-text 상품 생성을 넣지 않는다. exact-match 필터링 로직을 `cmdk`의 기본 fuzzy filter로 대체하지 않는다. |
| `Button`, `buttonVariants`, `ButtonProps` | `button.tsx` | shadcn 표준 — 문서화 불필요 | — | — | — |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | `card.tsx` | shadcn 표준형 + `Card.surface`(`default`/`muted`/`strong`) 확장 | `Card.surface`, `CardContent.contentLayout`(`inset`/`continuous`) | [card composition contract](../../design-system/contracts/card.composition.json) 준수 | 화면에서 divider/body spacing을 className으로 재정의하지 않는다. |
| `DropdownMenu` 계열 | `dropdown-menu.tsx` | shadcn 표준 — 문서화 불필요 | — | — | — |
| `Input` | `input.tsx` | shadcn 표준 — 문서화 불필요 | — | — | — |
| `Select` 계열 | `select.tsx` | shadcn 표준 — 문서화 불필요 | — | — | — |
| `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableHead`, `TableRow`, `TableCell`, `TableCaption` | `table.tsx` | shadcn 표준 — 문서화 불필요 | — | `DataTable` 내부 및 `EditableTable`/`FactoriesView`처럼 `DataTable`로 표현할 수 없는 table 구성 | — |
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | `tabs.tsx` | shadcn 표준 — 문서화 불필요 | — | 같은 page의 상위 view switch | filter chip 또는 action toggle로 쓰지 않는다. |
| `Badge`, `StatusBadge`, `BadgeTone` | `badge-1.tsx` | 짧은 상태/분류 표시 | `tone`: `neutral`, `info`, `success`, `warning`, `danger`; `icon` | 표 셀 또는 compact 상태 | 화면별 상태 chip을 새로 조립하지 않는다. |
| `ChannelBadge`, `Channel`, `ChannelListingStatus` | `channel-badge.tsx` | 채널명과 판매/동기화 상태를 함께 노출하는 canonical badge | `channel`: `naver` \| `coupang`; `listingStatus`: `active` \| `unregistered` \| `paused` \| `sync-error`; 선택 `compact` | 주문, 상품 관리, 채널 동기화의 channel/listing 상태 | page-local channel chip 또는 채널 색만으로 상태를 만들지 않는다. |
| `ProductVariantCombobox` | `product-variant-combobox.tsx` | `Popover`(`@radix-ui/react-popover`) + `Command`(`cmdk`, `shouldFilter={false}`) 기반 검색·명시 선택 combobox | `variants`, `value`, `onValueChange` | 미연결 채널 상품의 수동 variant 연결 | 상품명 자동 매칭, exact-match 필터링을 `cmdk` 기본 fuzzy filter로 대체 금지. |
| `ColumnVisibilityMenu`, `ColumnOption` | `column-visibility-menu.tsx` | 컬럼 토글 dropdown | `columns`, `visibleColumns`, `onToggle` | `DataTable`이 소비하는 컬럼 표시 control | 화면별 컬럼 토글 dropdown을 새로 만들지 않는다. |
| `DataTable`, `DataTableProps` | `data-table.tsx` | `@tanstack/react-table` 기반 canonical 조회 table — 정렬 없이 정적 시트/모달 중첩 table(`bare`)부터 정렬·컬럼 가시성·페이지네이션까지 한 primitive로 표현 | `columns`(TanStack `ColumnDef`), `rows`, `emptyState`; 선택적으로 `onRowClick`, `rowAriaLabel`, `getRowClassName`, `bare`, `toolbarStart`, `toolbarEnd`, `pageSizeOptions` | 모든 조회·preview table. `bare`는 자체 toolbar/footer/border를 빼고 `TableSurface`/`Modal`/`Sheet` 안에서 seamless하게 쓴다 | 편집 input table이나 화면별 `<table>`을 만들지 않는다. `basic-data-table.tsx`/`inventory-data-table.tsx`/`inventory-table-toolbar.tsx`는 이슈 #25에서 삭제된 primitive — 재유입 금지. |
| `EditableTable`, `EditableTableColumn`, `EditableTableProps` | `editable-table.tsx` | compact editable input table chrome | `columns`, `rows`, `getRowKey`, `renderCell` 등 | 소비자가 도메인 셀을 렌더하는 다건 입력 table | 조회 table의 정렬·컬럼 가시성·empty-state 역할을 중복하지 않는다. |
| `FileDropInput` | `file-drop-input.tsx` | 파일 선택 canonical drag-and-drop 입력 | `ariaLabel`, `accept`, `onFile`, 선택 `hint`, `description` | 모든 화면의 파일 업로드 필드 | bare `<Input type="file">`을 새로 만들지 않는다. |
| `FilterToolbar` | `filter-toolbar.tsx` | data-surface toolbar의 filter/meta layout | `children`, `className` | `TableSurface`의 toolbar slot 안 좌측 filter/우측 meta cluster | 독립 filter 박스로 쓰거나 별도 surface로 띄우지 않는다. |
| `FixedSheet` | `fixed-sheet.tsx` | portal 기반 고정형 입력 overlay. Sheet(side right)로 교체 예정(티켓 #27) | `open`, `title`, `description`, `onClose`, `children`, `className` | 긴 form 또는 viewport 고정 overlay | 짧은 edit flow에는 사용하지 않는다. |
| `MenuLink`, `MenuSection` | `menu.tsx` | navigation link와 접히는 menu section | link/section props | sidebar/menu navigation | data mutation action을 navigation item으로 표현하지 않는다. |
| `Modal` | `modal.tsx` | `@radix-ui/react-dialog`(`modal={false}`) 기반 짧은 form/edit overlay — **일탈**: focus trap/restore를 수동 Tab-keydown 트랩으로 자체 구현 | `open`, `title`, `description`, `onOpenChange`, `children`, `footer`, `className` | short-lived form/edit flow. 두 개 이상의 `Modal` 중첩에도 안전 | `Dialog.Root`를 `modal={true}`(기본값)로 되돌리지 않는다 — Radix 기본 FocusScope가 중첩 `Select`/`Popover`와 충돌해 무한 루프·조기 close 회귀를 일으킨다(실제 확인됨). |
| `ParseTemplateBuilder` | `parse-template-builder.tsx` | 파일 → 시트/헤더 행 선택 → 컬럼-역할 매핑 → 미리보기 공유 파싱 primitive([ADR-034](../adr/0034-parse-template-shared-primitive.md), [ADR-035](../adr/0035-inbound-supplier-is-shipping-list-issuer.md)) | `roles`, `sample`, `sheetName`/`headerRowNumber`/`mapping`, `presets` 등 | 입고·주문 송장 파일-파싱 화면, 입고처 상세 modal 템플릿 관리 | 화면별로 시트/헤더/컬럼 매핑 UI를 다시 구현하지 않는다. |
| `ShippingClassificationBadge`, `ShippingClassification` | `shipping-classification-badge.tsx` | 업로드 행의 channel classification | `classification`: `naver`, `coupang`, `unclassified`, `ambiguous` | shipping preview의 분류 상태 | provider 분류 badge를 화면에서 재구현하지 않는다. |
| `SplitButton` | `split-button.tsx` | 주 동작 1개 + caret 메뉴(부가 동작 cluster)로 구성된 단일 action group | `label`, `onClick`, `menuLabel`, `children`, `variant`, `size` | 흔한 동작 하나 + 덜 쓰는 동작 여럿을 한 toolbar 슬롯으로 묶을 때 | 4개 이상 나열된 동일 크기 버튼, 화면별 caret 버튼 재조립을 하지 않는다. |
| `StoreConnectionRow` | `store-connection-row.tsx` | provider 연결 요약과 action surface | `provider`, `configured`, `summary`, `updatedAt`, `action`, `children` | settings의 store connection row | shipping에 연결 설명 card를 중복하지 않는다. |
| `StoreConnectionStatus` | `store-connection-status.tsx` | 연결 dot + label 상태 | `configured`, `compact`, `framed`, `disconnectedTone` | settings/shipping의 provider 연결 상태 | 페이지별 연결 상태 표현을 만들지 않는다. |
| `TableSurface` | `table-surface.tsx` | filter toolbar + table을 하나로 묶는 통합 data surface | `toolbar`, `children`, `footer`, `className`, `scrollClassName` | 조회 화면의 canonical shell | filter 박스와 table shell을 별도 카드 2개로 쌓지 않는다. |
| `TagInput` | `tag-input.tsx` | 값을 하나씩 입력해 removable chip으로 쌓는 다건 입력 | `value: string[]`, `onChange`, `placeholder`, `ariaLabel`, `validate` | 사이즈·색상처럼 순서 없는 다건 옵션 값 입력 | 줄바꿈/쉼표 구분 textarea로 되돌리지 않는다. |
| `ActionToolbar`, `ToolbarLinkAction`, `ToolbarButtonAction`, `ToolbarIconButton` | `toolbar.tsx` | compact action rail | link/button/icon button props | 인접 surface에 붙는 navigation/data action group | navigation과 data mutation을 같은 element 역할로 섞지 않는다. |

## Button 크기 역할 계층

`Button`의 `size`는 임의 선택이 아니라 액션의 역할을 나타내는 계층이다. 화면의 모든 버튼을 `size="sm"`으로 통일하면 무엇이 중요한 동작인지 구분되지 않는다([ui-guide.md 강조 예산](./ui-guide.md#인지그룹핑-원칙) 참고).

| 역할 | `size` | 높이 토큰 (SoT: `globals.css`, 참고: [DESIGN.md](./DESIGN.md)) | 예시 |
| --- | --- | --- | --- |
| 주 동작 (primary/main action) | `default` (`md`) | `--control-h` (44px) | `저장`, `등록`, `입고` |
| 보조 동작 (secondary action) | `sm` | `--control-h-md` (40px) | `취소`, `필터`, 보조 CTA |
| 부가 동작 (tertiary/low-emphasis) | `variant="ghost"` (size는 `sm` 또는 `default` 그대로 유지) | 동일 높이, 배경/보더 없음 | 아이콘 액션, 목록 내 저노이즈 버튼 |

- 한 surface(카드/toolbar/시트) 안에서 filled primary 버튼은 최대 1개다.
- `ghost`는 배경/보더를 없애 강조를 낮추는 variant이며 `size`와 독립적으로 조합한다.
- 기존 화면을 이 규칙에 맞춰 한 번에 재작성할 필요는 없다. 새로 만들거나 고치는 화면부터 이 계층을 따른다.
- 이 규칙은 [ADR-018](../adr/0018-ui-system-checks.md) UI-system-check가 `tests/ui-token-presets.test.ts`로 강제한다.

## Preset 카탈로그

`ui`는 `src/app/components/ui.tsx`에서 export하는 className preset object이고, `cx`와 `PageHeader`도 같은 파일에서 export한다. 아래 그룹은 실제 키를 용도별로 묶은 것이다.

| 그룹 | `ui.*` 키 | 대응 primitive | 용도 |
| --- | --- | --- | --- |
| shell/surface | `shell`, `shellNarrow`, `surface`, `surfaceMuted`, `surfaceStrong`, `panel`, `panelHeader`, `panelBody` | `Card`, `FilterToolbar`, `FixedSheet`, `Modal` | page layout과 tokenized surface bridge |
| card | `card`, `cardMuted`, `cardStrong`, `cardHeader`, `cardBody`, `cardFooter` | `Card` family | shared card variant과 구조 |
| control/button | `label`, `control`, `controlSm`, `button`, `buttonPrimary`, `buttonSuccess`, `buttonSecondary`, `buttonWarning`, `buttonOutline`, `buttonGhost`, `buttonDanger`, `buttonLink`, `buttonDense`, `iconButton` | `Input`, `Select`, `Button`, toolbar actions | control 및 action style bridge |
| select/menu | `selectTrigger`, `selectContent`, `selectViewport`, `selectItem`, `selectLabel`, `selectSeparator`, `selectScrollButton` | `Select` family; `DropdownMenu` family | selection trigger와 menu surface |
| toolbar/status | `toolbar`, `toolbarDense`, `toolbarAction`, `actionGroupDense`, `statusPillDense`, `badge`, `pill`, `pillMuted` | `FilterToolbar`, `ActionToolbar`, `Badge`, `StoreConnectionStatus` | compact filter/action/status cluster |
| data surface | `dataSurface`, `dataToolbar`, `dataScroll`, `dataFooter`, `dataMeta` | `TableSurface`, `FilterToolbar` | filter toolbar + table을 하나로 묶는 통합 surface strip/scroll/footer/meta |
| tabs/table | `tab`, `tabActive`, `tabsList`, `tabsTrigger`, `tabsTriggerActive`, `tabsContent`, `tableShell`, `tableHeadCell`, `tableCell`, `emptyState` | `Tabs` family, `Table` family, `DataTable` | view switch와 table structure |
| page typography | `pageKicker`, `pageTitle`, `pageLead`, `number`, `helpText` | `PageHeader` | page title, supporting copy, numeric text |
| navigation | `navSectionButton`, `navItem`, `navItemActive`, `navSubItem`, `desktopSidebar`, `mobileTopbar`, `mobileDrawerScrim`, `mobileDrawer` | `MenuLink`, `MenuSection` | desktop/mobile navigation layout |
| modal | `modal`, `modalOverlay`, `modalContent`, `modalHeader`, `modalBody`, `modalFooter` | `Modal`, `FixedSheet` | overlay and dialog structure |

`PageHeader`는 `title`, 선택 `description`·`actions`·`className`을 받는 page-level header component이며, `kicker` type prop은 현재 렌더링하지 않는다. `cx`는 `cn`을 위임하는 className helper다.

## Coverage 상태

| 상태 | 항목 | 현황 | 해소 예정 step |
| --- | --- | --- | --- |
| canonical | `DataTable` | 조회/preview table의 단일 shared primitive(`bare` 모드로 정렬 없는 중첩 table까지 흡수) | 해당 없음 |
| canonical | `ColumnVisibilityMenu` | `DataTable`의 실제 소비처를 확인했으며, primitive는 canonical 유지 | 해당 없음 |
| resolved | 편집형 입력 table | `EditableTable`이 tokenized chrome, 행 action, 행 추가, inline validation을 소유하며 소비자가 셀을 렌더 | Step 3 |

| 완료된 hand-roll `<table>` 흡수 | 이전 역할 | 수렴 primitive | 해소 step |
| --- | --- | --- | --- |
| `ShippingView` | 분류 preview | `DataTable` + `ShippingClassificationBadge` | Step 7 (resolved) |
| `InOutForm` | 편집형 입력 table | `EditableTable` | Step 6 (resolved) |
| `InboundRegistrationSheet`, `FactoriesView`(파싱 템플릿 목록), `tracking-import-workspace`, `ParseTemplateBuilder`(미리보기) | `BasicDataTable` 소비 | `DataTable`(`bare`) | 이슈 #25 (resolved) |
| `InventoryWorkspace` | `InventoryDataTable` | `DataTable` | 이슈 #25 (resolved) |

현재 남은 hand-roll 조회/입력 `<table>`은 없다. `InventoryView`(재고 매트릭스 화면)는 어느 route에도 연결되지 않은 dead view file이라 Step 5에서 삭제됐고, 실 사용되는 재고 조회 table은 `InventoryWorkspace`가 `DataTable` primitive로 렌더한다. `basic-data-table.tsx`, `inventory-data-table.tsx`, `inventory-table-toolbar.tsx`는 이슈 #25에서 소비처가 0으로 수렴해 삭제됐다. dead primitive 또는 dead view는 남아 있지 않다.

## 사용 규칙

새 화면이나 기능은 hand-roll 전에 이 카탈로그에서 canonical primitive를 먼저 찾는다. 없으면 새 primitive를 바로 만들지 말고 기존 variant 또는 props 확장을 우선 검토한다. 운영 surface와 action 배치는 [UI_GUIDE.md §17](./ui-guide.md#핵심-원칙) 및 [§22](./ui-guide.md#핵심-원칙)를 따른다.
