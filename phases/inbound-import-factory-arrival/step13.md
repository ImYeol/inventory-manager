# Step 13: arrival-progressive-disclosure-and-visual-quality

Finish the arrivals workspace visual and interaction correction after Step 12. Tests first.

Keep the arrival list as the full-width primary surface. Open exactly one shared `FixedSheet` for the selected arrival and represent allocation, receipt, shortage, follow-up, and correction as one discriminated active operation; never render every editor at once. Preserve the selected operation and its drafts on a scoped server error, and close/reset it only after success or explicit cancellation.

Use the documented shared primitives, component budget, filter vocabulary, and design/motion tokens. Remove page-local raw controls, hard-coded sizes, duplicate state labels, unnecessary cards, and unstable wrapping toolbars. Fix the `FixedSheet` API contract rather than passing unsupported props. Every control must have an accessible name, focus must enter/return correctly, keyboard and Escape behavior must work, and scoped errors must use accessible live feedback.

Browser-check the real primary route at desktop and mobile widths after a production build: sourcing navigation reaches `/sourcing/arrivals`, list hierarchy is clear, the sheet does not overflow, each operation is reachable, drafts survive validation errors, successful mutations refresh canonical data, and empty/loading/missing-schema states remain usable. Do not claim browser verification from static inspection alone.
