# Step 0: formalize card composition contract

## Read first

- AGENTS.md
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/UI_GUIDE.md
- docs/COMPONENTS.md
- docs/DESIGN.md
- docs/MOTION.md
- docs/ADR.md
- src/app/globals.css
- src/app/components/ui.tsx
- src/components/ui/card.tsx
- src/components/ui/store-connection-row.tsx
- tests/settings-view.test.ts
- tests/ui-token-presets.test.ts
- .codex/hooks/ui-review-guard.sh
- .codex/hooks/test_hooks.py
- phases/card-divider-rhythm-guardrail/step0.md

## Goal

Replace the prose-only `Card divider rhythm` rule with a reusable, machine-readable card composition contract. The contract must describe the same component/variant names that a Figma library can use, and the React Card primitive plus harness checks must consume or verify it. A divided card must guarantee token-based body inset by default; a deliberately continuous data surface must opt in explicitly.

## Required sequence

1. Write focused regression tests before implementation. Include a contract validation test that fails when a contract token reference does not exist in `src/app/globals.css`, and a Card primitive test that proves the default divided composition keeps the body inset while continuous composition is an explicit variant.
2. Add one vendor-neutral, machine-readable design contract artifact under a stable design-system path. It must use references to existing CSS tokens only, not duplicate literal token values. Include Figma-facing component/variant/property names (`Card`, `surface`, `contentLayout`) so a Figma library can mirror it without a second naming system.
3. Extend the shared Card primitive with a semantic composition API. Preserve current default behavior and preserve an explicit continuous/flush opt-in for data surfaces. Do not allow individual settings screens to encode divider spacing through local padding overrides.
4. Migrate the store connection surface to the semantic divided composition. Migrate existing intentional `CardContent` flush usages only where necessary so the rendered UI remains unchanged.
5. Add a repository-local, deterministic design-contract check that validates token references and Card composition API/contract alignment. Wire it into `npm run test` or an existing focused test without requiring network or Figma credentials.
6. Update DESIGN.md, COMPONENTS.md, UI_GUIDE.md, ARCHITECTURE.md, and ADR.md to reference the contract artifact and establish the rule: documentation explains intent; the contract artifact defines component composition; code and harness verify it. Avoid duplicating individual component cases in prose.
7. Update the UI review harness message and its regression test so UI changes must check the composition contract rather than enumerate divider cases.

## Constraints

- Do not add literal spacing, color, radius, or duration values to the new contract. Reason: `src/app/globals.css` remains the value source of truth.
- Do not introduce a Figma API integration, plugin, credentials, or generated Figma file. Reason: this repository needs a portable contract that is ready for Figma mapping without external-state dependencies.
- Do not alter server actions, credential masking/deletion behavior, provider API logic, or database schema. Reason: this is design-system and harness scope only.
- Do not add page-local `pt-*`, `p-*`, border, or background patches to solve card composition. Reason: the semantic Card API must own this relationship.
- Do not change `src/app/globals.css`. Reason: the existing token source is sufficient; this step formalizes composition, not token values.

## Acceptance

    npm run test -- --run tests/design-contracts.test.ts tests/settings-view.test.ts tests/ui-token-presets.test.ts
    python3 .codex/hooks/test_hooks.py
    npm run lint
    npm run build

Record results in `step0-output.json` and update the phase index.
