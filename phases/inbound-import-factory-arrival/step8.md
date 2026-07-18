# Step 8: executable-import-bootstrap-and-db-proof

Resolve the remaining blocked state for child issue #14. Read steps 5-7 and use the outer Docker failure below as the red test. Tests first. This step is narrowly about executable SQL parity/proof plus making warehouse selection truly second-stage; do not begin issue #15 allocation/receipt work.

## Red test from outer orchestrator

The full disposable chain now reaches the second revision but fails inside `register_inbound_import_revision`:

`column reference "inbound_import_id" is ambiguous`

The function has OUT columns named `inbound_import_id`, `revision_id`, etc. Qualify every table column in SQL statements that can collide with those OUT variables (including `revision_number`) in both installed forward functions and schema bootstrap equivalents. Do not rename the public return contract unless all callers/tests are migrated.

## Required completion

- Make the complete outer command pass after a fresh legacy reset: canonical migration, supplier mapping migration, import migration, hardening migration, and behavioral assertions. Fix each actual SQL error revealed; do not weaken assertions.
- Expand behavioral assertions to include the still-missing two-user same-hash allowance, direct INSERT denial, revision/source-row immutable update/delete, unmapped/invalid/forged ProductVariant rejection, and legacy duplicate-hash migration exception. Seed the minimum representative legacy rows before the unique index so this is executable proof.
- Replace the commented pseudo-schema approach in `supabase/schema.sql`. After all dependent canonical tables are declared, include executable step-5/6 function bodies, composite template constraint, policies, revokes/grants, normalization helper, and indexes equivalent to the final forward migrations. Add a fresh-schema execution proof or a deterministic test that actually feeds `supabase/schema.sql` to PostgreSQL; string containment alone is not sufficient.
- In `InboundRegistrationSheet`, do not require or show warehouse selection to preview/map/save evidence. Reveal the warehouse selector only in `savedRevisionId` stage, then require it for promotion. This is the user-approved separate second step. The preview action must require only supplier, template, and file.
- Ensure successful promotion refreshes the canonical arrival/incoming paths already used by inventory and sourcing.

## Acceptance

- The dedicated `npm run test:inbound-behavioral` passes in the outer Docker environment without edits after Harness completion.
- A PostgreSQL execution of the checked-in `supabase/schema.sql` succeeds on a fresh disposable database and exposes callable authenticated register/promote RPCs with direct table inserts denied.
- Focused component tests prove warehouse absent/not required during preview and review-save, then visible/required only after revision save.
- Run focused/full tests, Prisma validation, lint, build, and `git diff --check`.

