# Design System

This document tracks both the current token system and the shipped warehouse-operations UI direction. The contract here should stay aligned with the implemented route ownership, shared primitives, and token usage.

## Source Of Truth

- Tokens live in [`src/app/globals.css`](src/app/globals.css).
- Shared class presets and page-level helpers live in [`src/app/components/ui.tsx`](src/app/components/ui.tsx).
- Reusable UI primitives live under [`src/components/ui`](src/components/ui) as the canonical component directory.
- Project planning and IA decisions live in [`docs/UI_GUIDE.md`](docs/UI_GUIDE.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- Phase execution scope lives under [`phases/warehouse-ops-redesign`](phases/warehouse-ops-redesign) and [`phases/ops-ui-consistency-pass`](phases/ops-ui-consistency-pass).
- Codex harness behavior lives in [`.codex/config.toml`](.codex/config.toml), [`.codex/hooks.json`](.codex/hooks.json), and [`.agents/skills`](.agents/skills).

### Component Path Note
- This repository already has a `src` alias via `@/*`, so the practical shadcn-style default path is `src/components/ui`, not root-level `/components/ui`.
- If a new shared component such as `badge-1.tsx` is added, place it in `src/components/ui` so menu, table, and form primitives stay in one tree.
- Creating a second root-level `/components/ui` tree would split ownership further and make the current duplication problem worse.

## Product Character

- This is an operations console, not a marketing SaaS dashboard.
- Warehouse, sourcing, shipping, analytics, and store connections should feel like one tool.
- Dense tables, clear status semantics, and fast action paths matter more than ornamental visuals.

## Tokens

Use CSS variables instead of raw colors for new work.

- `--background`: app background
- `--foreground`: primary text and strong UI chrome
- `--surface`: card and panel background
- `--surface-muted`: quiet section background
- `--surface-strong`: emphasized section background
- `--border`: default border color
- `--border-strong`: emphasized border color
- `--accent`: primary action or active state color
- `--accent-foreground`: text on accent surfaces
- `--focus-ring`: focus outline color
- `--shadow`: shared surface shadow

### Theme Direction
- Base: cool neutral slate surfaces
- Accent: safety orange for actions and active states
- Status colors: green / amber / red / blue by semantics
- Avoid purple-dominant branding and glassmorphism patterns

## Typography

- Current baseline is Geist Sans + Geist Mono.
- Typography direction favors a Korean-friendly UI font such as `SUIT Variable` or `Pretendard Variable`, while keeping a mono font for codes and quantities.
- Use `PageHeader` for titles and descriptions instead of ad hoc hero blocks.
- Use `ui.number` or equivalent mono treatment for IDs, quantities, warehouse references, and tracking-like values.

## Reference Breakdown

- The reference screenshot is useful because it is table-first, not card-first.
- It uses a quiet neutral canvas, thin borders, one strong CTA, and row-level status pills instead of stacked explanation cards.
- The sidebar is readable because icons and labels are paired, indentation is shallow, and there is only one active emphasis at a time.
- The toolbar is compact. Search, filter, sort, and overflow actions are visually secondary to the primary create action.
- The table carries the status semantics. Header copy explains only what the user needs to know before acting.
- We should borrow that structural discipline, not its purple branding or generic SaaS styling.

## Status And Action Semantics

- Use shared badge variants for `neutral`, `info`, `success`, `warning`, and `danger`.
- Badges must carry text, not color alone.
- Status badges belong in tables, row summaries, provider summaries, and validation result blocks.
- Prefer subtle status badges over large alert cards when the information is contextual rather than blocking.
- Buttons should default to icon + text when the action is repeated across tables, menus, and toolbars.
- Each surface should normally have one filled primary button. Secondary, ghost, and icon buttons handle navigation, reveal, reset, and utility actions.
- Menu items should use icons to improve scan speed, but the label remains mandatory.

## Navigation Patterns

- Desktop navigation should become a mixed sidebar with direct items and expandable groups.
- Only sections with 2 or more child screens should be expandable.
- `재고 운영`, `운송장`, `분석`, `스토어 연결`, `설정` are expected to be direct items.
- `소싱` is the primary expandable group in the current plan.
- Do not introduce singleton category headers for `운송장` or `분석` unless those domains gain real subnavigation.
- Mobile should use a drawer or sheet instead of the current fixed bottom nav.
- Navigation styles must be centralized rather than hard-coded inside route components.

## Layout Patterns

- Keep pages inside `ui.shell` or `ui.shellNarrow`.
- Operations pages should be table-first by default. Use the page header and filters to support the table, and add summary cards only when a page genuinely needs a glanceable KPI layer.
- For heavy operations pages, keep action buttons within the same visual zone as the filter toolbar.
- `재고 운영` should behave like one workspace with internal tab or segmented views, not several disconnected pages.
- Creation and edit actions should prefer a shared overlay pattern: desktop dialog, mobile full-height sheet.
- Page chrome is title-first. Do not add kicker text, stacked tags, context labels, or extra explanatory paragraphs above the title unless a page genuinely cannot be understood without them.
- Tabs should be self-describing by label alone. Default to no helper sentence beneath tabs, and move supporting copy into the active panel only when it changes behavior.
- Tables should default to live/actionable columns. Put static metadata, long explanations, and audit-only fields behind details drawers or secondary views.
- Utility and filter bars should stay compact. If the bar becomes taller than the table header feels necessary, the page has already drifted.
- Tabs and buttons inside workspaces should default to compact dimensions. Large button treatments are reserved for one primary page action or explicit exception.
- Excessive surface and card nesting is a design failure mode. Prefer one surface boundary per section, then tables, inline disclosure, or drawers inside it rather than repeated nested cards.

## Core Components

- `ui.panel`, `ui.panelHeader`, `ui.panelBody`: section shells
- `ui.buttonPrimary`, `ui.buttonSecondary`, `ui.buttonGhost`: actions
- `ui.iconButton`: compact utility actions such as search, filter, sort, overflow
- `ui.control`, `ui.controlSm`: form controls
- `ui.tab`, `ui.tabActive`: segmented choices
- `ui.pill`, `ui.pillMuted`: compact statuses
- `ui.tableShell`, `ui.tableHeadCell`, `ui.tableCell`: dense tables
- `ui.emptyState`: empty states
- `Badge` / `StatusBadge` in `src/components/ui/*`: reusable semantic badges
- `MenuLink` / `MenuSection` in `src/components/ui/*`: icon-capable navigation primitives

### Shared Primitives and Gaps
- Sidebar item / section / submenu primitives
- Filter toolbar shell
- Workspace tab switcher
- Status badge variants for `neutral`, `info`, `success`, `warning`, `danger`
- Table row action cluster
- Icon button and toolbar action cluster primitives
- CSV upload dropzone and validation summary block
- Store connection status card
- Store connection readiness strip for `/shipping`
- Quick entry overlay shell
- Line-item editor for multi-row manual entry
- Responsive table-to-card fallback
- Header copy budget helper
- Table column priority presets for action-first views

## Screen Rules

### Inventory Operations
- Warehouse-first visibility
- Table-first layout
- One warehouse context should drive overview, inbound, outbound, csv, and history states
- Status pills and quantity columns should be scannable at a glance
- Filters must stay close to the table
- Manual inbound/outbound should optimize for 2 to 20 row entry without forcing CSV
- Keep `재고 운영` as one first-level route, but decompose its implementation into smaller sections and secondary detail surfaces rather than repeating header and CTA zones in every tab.

### Sourcing
- Separate factory management from arrival operations
- Residual quantity and arrival status should always be visible

### Store Connections
- Show provider state, masked credentials summary, and last update time
- Keep the visual language aligned with shipping, but distinguish setup from execution
- This route owns credential inputs and masked summaries.

### Shipping
- Keep upload CTA and provider status summary above the order tables
- Do not let redesign work disrupt the existing upload-preview-match-send flow
- Shipping only needs compact connection readiness feedback plus a link to store connections; full provider forms and duplicate summaries do not belong here.

### Settings
- Settings owns master-data and admin surfaces.
- Store connection forms should not be duplicated here once `/integrations` is the canonical connection route.

## Accessibility

- Preserve focus-visible styles using `--focus-ring`.
- Keep semantic headings and labels.
- Avoid icon-only controls without accessible names.
- Status should never be color-only; include text labels.
- Keep tap targets 44px or larger on mobile-sized interactive controls.

## Mobile Baseline

- Body text should stay at 14px to 15px.
- Default horizontal page padding should stay around 16px.
- Card and section spacing should stay in the 12px to 16px range.
- Dense desktop tables should collapse into compact priority-column lists or cards on mobile.

## Implementation Note

- New visual patterns should be documented here before they are spread across multiple screens.
- Shared token or primitive changes should happen before page-specific restyling.
- If a new page chrome pattern appears in one screen and is likely to be reused, record it here first so later screens do not invent their own headers, tab helper copy, or table density rules.
- If a new shared component is introduced from an external example, adapt it to this token system and directory structure before spreading it.
- The provided `badge-1.tsx` example should be adapted into `src/components/ui/badge-1.tsx` or a semantic wrapper component, and its variants should map to this repo's status semantics rather than unrelated marketing variants.
