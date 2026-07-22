# Domain docs

This is a single-context repository. Existing documents are authoritative; this file only routes readers to them and does not duplicate their rules.

## Layout

- Domain vocabulary: `CONTEXT.md`
- Product scope: `docs/product/`
- Architecture: `docs/architecture/`
- UI and design system: `docs/design/`
- External integrations: `docs/integrations/`
- Decisions: `docs/adr/`

## Read by task

- All changes: `AGENTS.md`
- Product scope and acceptance criteria: `docs/product/prd.md`
- Inbound import, mapping, allocation, and receipt flow: `docs/product/inbound-receiving.md`
- Ownership, routes, and data boundaries: `docs/architecture/overview.md`
- UI behavior and composition: `docs/design/ui-guide.md`
- Visual system rationale: `docs/design/DESIGN.md`
- Shared primitive reuse: `docs/design/components.md`
- External Naver integration: `docs/integrations/naver-commerce-api.md`
- Prior decisions: relevant entries in `docs/adr/`

Read only the files relevant to the change. If a proposal conflicts with an ADR, identify the conflict and seek a deliberate decision rather than silently overriding it.

`CONTEXT.md` is the concise glossary for stable domain terms. Do not copy existing product, architecture, UI, or ADR content into it. `CONTEXT-MAP.md` is unnecessary unless this becomes a multi-context repository.
