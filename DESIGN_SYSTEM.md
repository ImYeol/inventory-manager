# Design System

This project uses a light, token-driven design system. The goal is consistency across inventory, history, master data, shipping, analytics, settings, and setup screens.

## Source Of Truth

- Tokens live in [`src/app/globals.css`](src/app/globals.css).
- Shared UI presets live in [`src/app/components/ui.tsx`](src/app/components/ui.tsx).
- Screen-level composition uses reusable shells such as [`PageHeader`](src/app/components/ui.tsx) and route-specific views under `src/app/(protected)/`.

## Tokens

Use CSS variables instead of raw colors for new work.

- `--background`: app background.
- `--foreground`: primary text and strong UI chrome.
- `--surface`: card and panel background.
- `--surface-muted`: subtle section background.
- `--surface-strong`: stronger subtle surface for emphasis.
- `--border`: default border color.
- `--border-strong`: stronger border for emphasis.
- `--accent`: primary action or active state color.
- `--accent-foreground`: text on accent surfaces.
- `--focus-ring`: focus outline color.
- `--shadow`: shared surface shadow.

## Typography

- Use the app font stack defined in [`src/app/layout.tsx`](src/app/layout.tsx): Geist Sans for body and Geist Mono for numeric or code-like data.
- Use `PageHeader` for page titles and descriptions instead of inventing new title blocks.
- Use mono styling from `ui.number` for IDs, quantities, and tracking-like values.
- Keep headings compact and balanced; avoid oversized hero typography unless the screen is intentionally promotional.

## Spacing And Radius

- Prefer the existing spacing scale already used by `ui.shell`, `surface`, `ui-control`, and `ui-button`.
- Keep cards and interactive surfaces rounded with the project defaults: `surface` and `ui-control` are the baseline shape.
- Use `surface-body` and `surface-header` to structure cards rather than mixing padding and borders ad hoc.

## Component Usage

- Use `ui.panel`, `ui.panelHeader`, and `ui.panelBody` for sectioned surfaces.
- Use `ui.buttonPrimary`, `ui.buttonSecondary`, and `ui.buttonGhost` for actions.
- Use `ui.control` and `ui.controlSm` for inputs and selects.
- Use `ui.tab` and `ui.tabActive` for tab-like navigation.
- Use `ui.pill` and `ui.pillMuted` for compact status labels.
- Use `ui.tableShell`, `ui.tableHeadCell`, and `ui.tableCell` for tabular data.
- Use `ui.emptyState` for empty states instead of custom centered blocks.

## Layout Patterns

- Keep pages inside `ui.shell` or `ui.shellNarrow` depending on density.
- Prefer a single top-level `PageHeader`, then stacked `surface` sections below it.
- For data-heavy screens, use a dense table shell with clear filters and action rows.
- For setup or settings flows, keep the primary action visible and group supporting copy above the form.

## Shipping And Upload UIs

- Shipping pages should keep the upload CTA and status summary above the order tables.
- File upload areas should use a full-width `surface` section with a clear title, helper text, and status chips.
- Use button text that names the task, not the file type alone, when the action is ambiguous.

## Accessibility

- Keep focus-visible styles aligned with the existing `--focus-ring`.
- Preserve semantic landmarks and headings.
- Link labels to controls and avoid icon-only controls without an accessible name.

## React And Next.js

- Follow the current app pattern from `src/app/(protected)/page.tsx`, `src/app/(protected)/history/page.tsx`, and `src/app/(protected)/shipping/page.tsx`: server page shells plus small client components.
- Keep derived state local and avoid `useEffect` for state synchronization when a derived value or event handler is enough.
- Reuse existing shared primitives before adding new local components.

## Figma And Cross-Tool Rules

- When translating to Figma or back from Figma, keep the screen aligned with the tokens above instead of introducing a second visual language.
- Map new patterns back into `src/app/components/ui.tsx` or `src/app/globals.css` before spreading them across individual screens.
