# BrewPlan Post-Fix Review: Ongoing and New Considerations

Date: 2026-02-10  
Reviewer: Codex

## Review Context

This pass reviewed:

1. `RESPONSE.md` implementation claims
2. Commit `87ca329` code changes
3. Current runtime checks

Validation rerun in this workspace:

1. `pnpm typecheck` passed
2. `pnpm build` passed
3. `pnpm --filter @brewplan/web test:e2e -- --list` failed with `EMFILE`

Only ongoing/new concerns are listed below.

## Findings (Ordered by Severity)

### 1) [High] Transaction logic still has TOCTOU windows from pre-transaction reads

Evidence:

1. `orders.transition` reads `order` and `currentStatus` before opening transaction:
`packages/db/src/queries/orders.ts:354-365`.
2. `purchasing.receiveLine` reads PO line + PO + computes `newQtyReceived` before opening transaction:
`packages/db/src/queries/purchasing.ts:336-361`.
3. `brewing.transition` reads `batch` and `currentStatus` before opening transaction:
`packages/db/src/queries/brewing.ts:247-258`.

Why it matters:

1. These checks can become stale between read and write in multi-process or concurrent-writer scenarios.
2. Result: transition/receiving decisions may be made against outdated state.

Recommendation:

1. Move initial reads and transition/guard validation inside transaction callbacks.
2. Use a single in-transaction snapshot for all validations and writes.
3. For high-contention writes, consider `BEGIN IMMEDIATE` semantics or explicit retry on conflict.

---

### 2) [High] Count-based sequence generation still risks collisions under concurrent writers

Evidence:

1. Sequence generation remains `count(*) + 1`:
`packages/db/src/queries/orders.ts:107-121`,
`packages/db/src/queries/orders.ts:336-350`,
`packages/db/src/queries/purchasing.ts:100-114`,
`packages/db/src/queries/brewing.ts:141-155`.
2. There is still no retry path on unique constraint failure.

Why it matters:

1. Transaction wrapping reduces but does not fully eliminate collision risk across concurrent writers/processes.
2. Failures surface as runtime write errors at business-critical points (order/PO/batch/invoice creation).

Recommendation:

1. Replace count-based sequences with an atomic counter table per sequence key/year.
2. Add retry-on-unique-conflict guards where sequence-based inserts occur.
3. Add targeted concurrency tests for number generation.

---

### 3) [Medium] E2E stability issue remains unresolved in this environment

Evidence:

1. Playwright still starts `react-router dev` as web server:
`apps/web/e2e/playwright.config.ts:30`.
2. Reproduced failure:
`pnpm --filter @brewplan/web test:e2e -- --list` -> `EMFILE: too many open files, watch`.

Why it matters:

1. Test suite availability is environment-sensitive and can fail before tests execute.
2. This weakens CI reliability and makes verification claims hard to reproduce consistently.

Recommendation:

1. Use production-mode server for CI E2E (`react-router build` + `react-router-serve`) to avoid watcher limits.
2. Keep dev-server mode optional for local interactive debugging.
3. Document expected `ulimit` and fallback strategy.

---

### 4) [Medium] Some multi-step write paths are still not atomic

Evidence:

1. `inventory.createLot` performs lot insert and movement insert without transaction:
`packages/db/src/queries/inventory.ts:282-312`.
2. `orders.addLine` and `purchasing.addLine` write line then recalc totals as separate operations:
`packages/db/src/queries/orders.ts:226-250`,
`packages/db/src/queries/purchasing.ts:184-199`.

Why it matters:

1. Partial write failures can still leave inconsistent aggregates/audit trails in these paths.
2. Atomicity improvements are uneven across the data layer.

Recommendation:

1. Wrap each multi-step mutation path in one transaction.
2. Keep write + dependent aggregate updates in the same unit of work.

---

### 5) [Medium] DB-level invariants are still mostly unenforced (app-level checks only)

Evidence:

1. `finished_goods_stock` has no `CHECK` constraints for nonnegative quantities:
`packages/db/src/schema/packaging.ts:55-56`.
2. Similar lack of schema-level constraints for inventory lot and PO quantity invariants.

Why it matters:

1. App-layer guards do not protect against direct SQL, migration bugs, or future code regressions.
2. Invalid values (negative stock/reservations, inconsistent received quantities) remain structurally possible.

Recommendation:

1. Add schema `CHECK` constraints for:
`quantity_on_hand >= 0`, `quantity_reserved >= 0`, and `quantity_received >= 0`.
2. Add business checks where feasible, e.g. `quantity_received <= quantity_ordered`.
3. Add data cleanup migration steps before enabling strict checks.

---

### 6) [Medium] PO line updates can create invalid over-received states

Evidence:

1. `purchasing.updateLine` allows lowering `quantityOrdered` without validating existing `quantityReceived`:
`packages/db/src/queries/purchasing.ts:206-235`.

Why it matters:

1. A line can become logically over-received after edit.
2. Downstream `quantityOrdered - quantityReceived` computations can go negative and distort planning.

Recommendation:

1. Enforce `newQuantityOrdered >= quantityReceived` in `updateLine`.
2. Add schema constraint and/or defensive normalization for on-order calculations.

---

### 7) [Low] Session secret hardening still checks presence, not quality

Evidence:

1. Production guard enforces only non-empty secret:
`apps/web/app/lib/auth.server.ts:5-9`.

Why it matters:

1. Weak secrets remain possible in production and reduce session security posture.

Recommendation:

1. Enforce minimum secret strength in production (length/entropy policy).
2. Optionally reject known weak/default values explicitly.

---

### 8) [Low] `.gitignore` rule for errors is overly broad

Evidence:

1. Current ignore rule: `errors.*`:
`.gitignore:15`.

Why it matters:

1. This can accidentally hide legitimate source files named like `errors.tsx` in any directory.

Recommendation:

1. Narrow to the specific artifact path/pattern (for example, scoped path in `apps/web`), rather than global `errors.*`.

---

### 9) [Low] Lint coverage is still missing

Evidence:

1. Repository still has no package-level lint scripts or ESLint configuration.

Why it matters:

1. Static quality checks rely heavily on typecheck only.
2. Style and common correctness patterns are not automatically enforced.

Recommendation:

1. Add ESLint with package-level `lint` scripts and CI gating.

---

### 10) [Low] Known N+1 query patterns remain

Evidence:

1. Recipe detail loader performs per-ingredient item lookup:
`apps/web/app/routes/recipes.$id._index.tsx:47-53`.
2. Batch consumption loader performs per-item lot lookup:
`apps/web/app/routes/batches.$id.consumption.tsx:37-43`.

Why it matters:

1. Performance scales poorly with data growth.

Recommendation:

1. Convert these to set-based queries/joins in query-layer functions.
