# Step 11: completion-integrity-and-ui-ownership-correction

Correct the false completion evidence and the highest-impact UI ownership regressions found after Step 10. Read `docs/product/inbound-receiving.md`, ADR-032, ADR-033, the failed/pending `step0`, `step9`, and `step10` outputs, and the harness/review runtime tests.

- Reject a non-zero child process even if it writes `completed`.
- Preserve immutable per-attempt output, run structured acceptance commands outside the child, and reject phase finalization when latest evidence is stale or failed.
- Resolve the current feature branch in the review helper and validate phase outputs without calling a nonexistent command.
- Expose sourcing child navigation, default `/sourcing` to arrivals, keep supplier import owned by arrivals, restore direct manual inventory inbound, move legacy manual arrival creation behind secondary disclosure, and remove the competing paste-CSV surface.
- Persist the agreed inbound terminology and decisions in committed docs and provide a pointer-only Claude entry point. Do not put product contracts in personal memory.

The Harness must execute the `acceptance_commands` declared in the phase index. Do not mark this step complete from conversation output.
The child session must not mark the step blocked only because its own restricted sandbox cannot run an acceptance command. Record the implementation outcome; the outer Harness-owned acceptance runner is the authoritative command gate.
