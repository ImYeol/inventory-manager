# Design System

This document tracks both the current token system and the planned warehouse-operations redesign direction. Implementation has not happened yet; this file is the design contract future code should follow.

## Source Of Truth

- Tokens live in [`src/app/globals.css`](src/app/globals.css).
- Shared UI presets live in [`src/app/components/ui.tsx`](src/app/components/ui.tsx).
- Project planning and IA decisions live in [`docs/UI_GUIDE.md`](docs/UI_GUIDE.md) and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
- Phase execution scope lives under [`phases/warehouse-ops-redesign`](phases/warehouse-ops-redesign).
- Codex harness behavior lives in [`.codex/config.toml`](.codex/config.toml), [`.codex/hooks.json`](.codex/hooks.json), and [`.agents/skills`](.agents/skills).

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

### Planned Theme Direction
- Base: cool neutral slate surfaces
- Accent: safety orange for actions and active states
- Status colors: green / amber / red / blue by semantics
- Avoid purple-dominant branding and glassmorphism patterns

## Typography

- Current baseline is Geist Sans + Geist Mono.
- Planned redesign may move body typography toward a Korean-friendly UI font such as `SUIT Variable` or `Pretendard Variable`, while keeping a mono font for codes and quantities.
- Use `PageHeader` for titles and descriptions instead of ad hoc hero blocks.
- Use `ui.number` or equivalent mono treatment for IDs, quantities, warehouse references, and tracking-like values.

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
- Prefer a single page header, then summary cards, then filters, then primary table.
- For heavy operations pages, keep action buttons within the same visual zone as the filter toolbar.
- `재고 운영` should behave like one workspace with internal tab or segmented views, not several disconnected pages.
- Creation and edit actions should prefer a shared overlay pattern: desktop dialog, mobile full-height sheet.

## Core Components

- `ui.panel`, `ui.panelHeader`, `ui.panelBody`: section shells
- `ui.buttonPrimary`, `ui.buttonSecondary`, `ui.buttonGhost`: actions
- `ui.control`, `ui.controlSm`: form controls
- `ui.tab`, `ui.tabActive`: segmented choices
- `ui.pill`, `ui.pillMuted`: compact statuses
- `ui.tableShell`, `ui.tableHeadCell`, `ui.tableCell`: dense tables
- `ui.emptyState`: empty states

### Planned Shared Additions
- Sidebar item / section / submenu primitives
- Filter toolbar shell
- Workspace tab switcher
- Status pill variants for `normal`, `warning`, `danger`, `incoming`
- Table row action cluster
- CSV upload dropzone and validation summary block
- Store connection status card
- Quick entry overlay shell
- Line-item editor for multi-row manual entry
- Responsive table-to-card fallback

## Screen Rules

### Inventory Operations
- Warehouse-first visibility
- One warehouse context should drive overview, inbound, outbound, csv, and history states
- Status pills and quantity columns should be scannable at a glance
- Filters must stay close to the table
- Manual inbound/outbound should optimize for 2 to 20 row entry without forcing CSV

### Sourcing
- Separate factory management from arrival operations
- Residual quantity and arrival status should always be visible

### Store Connections
- Show provider state, masked credentials summary, and last update time
- Keep the visual language aligned with shipping, but distinguish setup from execution

### Shipping
- Keep upload CTA and provider status summary above the order tables
- Do not let redesign work disrupt the existing upload-preview-match-send flow

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
