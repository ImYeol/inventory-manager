# Step 7: first-upload-mapping-review-and-promotion-ui

Finish child issue #14 after the failed outer behavioral proof. Read steps 5-6 and the existing inventory/sourcing/product-management surfaces. Tests first. This step owns the reachable first-upload workflow and the remaining migration-proof defects only; do not implement allocation splitting or receipt variance.

## Database proof corrections

- Fix `20260719070000_import_revision_proof_and_review_hardening.sql` so it drops every prior read/manage policy before recreating it. The complete legacy → canonical → mapping → import → hardening chain currently fails because `Users read own factory arrivals` already exists.
- Legacy duplicate hashes must be reconciled before `20260719060000...` creates the unique user/hash index. Move the conservative rank/null/exception operation to the earlier migration at the correct point, and seed/prove duplicate legacy hashes in the disposable fixture. A later migration cannot repair an index-creation failure.
- Fix the behavioral SQL session variables to use valid custom parameter names and make failure flags reset between independent assertions. Extend proof for two-user hash isolation, direct-insert revocation, immutable revisions/source rows, mapping blockers/forged ids, raw quantity, repeated rows, exact one-to-one promotion, and post-receipt rejection.
- Make `supabase/schema.sql` an executable equivalent of the installed RPCs, not only columns/indexes/policies plus a commented historical pseudo-block. A fresh schema bootstrap must expose the same trusted register/promote behavior and grants as the forward migrations.

## Reachable first-upload workflow

- In the existing inbound registration sheet, show every parsed row in original order, including repeated external SKUs. For an unmapped exact SKU, provide an existing ProductVariant selector and an explicit short action that calls `confirmSupplierSkuMapping`. When one SKU is confirmed, update every repeated row with that exact normalized supplier SKU in the local review; preserve case/zeros/internal spaces/punctuation rules.
- Supply ProductVariant choices from the existing InventoryWorkspace data, with understandable product/size/color/SKU labels derived from existing model data. Reuse shared Select/Button/table primitives. Add a concise link/action to 상품 관리 for creating a missing product; returning and re-previewing must pick up the newly created exact mapping.
- Do not accept immutable revision evidence while any row is invalid or unmapped. Registration must ignore forged client ProductVariant ids and resolve exact active mappings in the trusted RPC, as step 6 began doing.
- Keep warehouse assignment as a visibly separate second stage. Before evidence save, the primary action is review/save. After successful revision registration, keep the sheet open, reveal/select the default warehouse, then call `promoteInboundImportRevision`. Close/callback only after promotion succeeds. Do not select per-row destination or split quantities here.
- A successful promotion must be visible in the existing canonical arrival/incoming loader. Do not redirect to a legacy-only draft view or claim success while no FactoryArrival exists.
- Keep storage compensation ownership-safe and error messages distinct for exact duplicate hash, logical revision conflict, mapping blocker, and post-receipt supersession.

## Acceptance

- Component/action tests execute the full first-upload path: preview repeated rows, map one exact external SKU to an existing ProductVariant, all identical rows update, invalid/unmapped save is blocked, evidence save succeeds, second-stage warehouse appears, promotion succeeds, and callback closes only afterward.
- Tests cover product-management escape/return affordance, preserved exact matching semantics, forged ids ignored, duplicate error messages, and storage cleanup.
- The outer `npm run test:inbound-behavioral` must pass against the dedicated disposable Docker database after a fresh legacy reset. Also run focused/full tests, Prisma validation, lint, build, and `git diff --check`.

