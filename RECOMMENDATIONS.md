# BrewPlan Post-Fix Review (Round 3): Ongoing Considerations

Date: 2026-02-10
Reviewer: Codex

## Review Context

This pass reviewed:

1. `RESPONSE.md` (round 2 implementation rationale)
2. Commit `65fd2ec` code changes
3. Current runtime checks in this workspace

Validation rerun in this workspace:

1. `pnpm typecheck` passed
2. `pnpm build` passed
3. `pnpm --filter @brewplan/web test:e2e -- --list` failed with `EMFILE: too many open files, watch`

Round 2 fixes were largely implemented correctly. Only remaining concerns are listed below.

## Findings (Ordered by Severity)

### 1) [Medium] E2E harness is still unstable in watcher-limited environments

Evidence:

1. Playwright web server still uses dev mode watcher startup: `apps/web/e2e/playwright.config.ts:30`.
2. Reproduced failure in this environment:
`pnpm --filter @brewplan/web test:e2e -- --list` -> `EMFILE: too many open files, watch`.

Why it matters:

1. E2E can fail before test execution, so test health becomes environment-dependent.
2. This undermines confidence in regression checks and makes CI reproducibility brittle.

Recommendation:

1. Use production-mode server for CI E2E (`react-router build` + `react-router-serve`).
2. Keep `react-router dev` only for local debugging paths.
3. Document minimum `ulimit` and a fallback profile.

---

### 2) [Medium] Identifier generation still relies on `count(*) + 1` with no conflict retry

Evidence:

1. Sequence logic still uses count-based derivation:
`packages/db/src/queries/orders.ts:107-121`,
`packages/db/src/queries/orders.ts:347-361`,
`packages/db/src/queries/purchasing.ts:100-114`,
`packages/db/src/queries/brewing.ts:141-155`.
2. No retry logic exists for unique-conflict insertion failures.

Why it matters:

1. In current single-process assumptions this is usually safe, but it remains fragile under multi-writer/process scaling.
2. Failure mode is hard insert errors in core business flows (order/PO/batch/invoice creation).

Recommendation:

1. Replace count-based sequencing with a dedicated atomic counter table keyed by `{sequence_type, year}`.
2. Add bounded retry-on-unique-conflict for sequence consumers.
3. Add concurrency tests that simulate parallel creators across independent connections.

---

### 3) [Medium] DB constraints are improved but still miss key cross-field business invariants

Evidence:

1. Added checks are non-negativity only:
`packages/db/src/schema/purchasing.ts:49-50`,
`packages/db/src/schema/packaging.ts:64-65`,
`packages/db/src/schema/inventory.ts:55`.
2. No schema-level checks currently enforce:
`quantity_received <= quantity_ordered` (PO lines) or
`quantity_reserved <= quantity_on_hand` (finished goods).

Why it matters:

1. App-level guards reduce risk but do not protect against direct SQL writes, future regressions, or migration/backfill mistakes.
2. Invalid states can still exist structurally and later break planning, dispatch, and inventory calculations.

Recommendation:

1. Add cross-field `CHECK` constraints for:
`purchase_order_lines(quantity_received <= quantity_ordered)` and
`finished_goods_stock(quantity_reserved <= quantity_on_hand)`.
2. Add a pre-migration data audit step to detect and remediate violating rows before enforcing stricter constraints.

---

### 4) [Low] Transaction callbacks still return entities via global `get(...)` calls

Evidence:

1. Multiple transaction callbacks return `get(id)!` (global `db`) instead of selecting via `tx`:
`packages/db/src/queries/orders.ts:161`,
`packages/db/src/queries/orders.ts:532`,
`packages/db/src/queries/purchasing.ts:144`,
`packages/db/src/queries/purchasing.ts:347`,
`packages/db/src/queries/brewing.ts:210`,
`packages/db/src/queries/brewing.ts:479`.

Why it matters:

1. It works with current single-connection SQLite behavior, but couples correctness to connection-level transaction semantics.
2. This pattern is harder to port and reason about if database/client behavior changes.

Recommendation:

1. Prefer in-transaction return reads (`tx.select...`) for deterministic transaction boundaries.
2. Keep external `get` helpers for non-transaction call paths only.

---

### 5) [Low] Lint coverage is still absent

Evidence:

1. No repository-level ESLint configuration and no package `lint` scripts are currently enforced in CI.

Why it matters:

1. Type checking catches type safety issues but misses many maintainability and correctness patterns.
2. As the codebase grows, inconsistency and preventable defects become harder to control.

Recommendation:

1. Add ESLint with package-level `lint` scripts and CI gating.
2. Start with core rules (`no-floating-promises`, `eqeqeq`, `no-implicit-coercion`, import hygiene) and expand incrementally.

---

### 6) [Low] Previously identified N+1 query patterns remain

Evidence:

1. Recipe detail loader still does per-ingredient inventory lookups:
`apps/web/app/routes/recipes.$id._index.tsx:47-53`.
2. Batch consumption loader still does per-item lot fetches:
`apps/web/app/routes/batches.$id.consumption.tsx:37-43`.

Why it matters:

1. Runtime cost scales linearly with related rows and can degrade noticeably with larger data sets.

Recommendation:

1. Replace per-item query loops with set-based query-layer joins/batched lookups.
