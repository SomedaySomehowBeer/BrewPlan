# BrewPlan Code Review Recommendations

Date: 2026-02-10  
Reviewer: Codex

## Scope and Method

This review covered:

1. Monorepo scripts and quality gates (`package.json`, `turbo.json`)
2. Core web routes (`apps/web/app/routes/**`)
3. Auth/session setup (`apps/web/app/lib/auth.server.ts`)
4. Data layer and schema (`packages/db/src/queries/**`, `packages/db/src/schema/**`)
5. E2E harness (`apps/web/e2e/**`)

Commands executed:

1. `pnpm typecheck` (failed)
2. `pnpm lint` (passed but did not actually lint app code)
3. `pnpm build` (passed)
4. `pnpm --filter @brewplan/web test:e2e -- --list` (failed during web server startup with `EMFILE`)

## Executive Summary

The most serious issues are:

1. Type safety is currently broken in `apps/web`, and the release build does not enforce typecheck success.
2. Several critical data mutations are non-transactional, allowing partial writes and inconsistent business state.
3. Inventory and receiving flows allow impossible states (over-receipt, negative stock) because server-side validation is insufficient.
4. Identifier generation (`BP/PO/ORD/INV`) is race-prone under concurrency.
5. Session secret handling has an insecure production fallback.

## Findings and Recommendations

### 1) [High] Release pipeline allows shipping with broken TypeScript

Evidence:

1. `pnpm typecheck` fails with many TS errors in:
`apps/web/app/routes/orders.$id.invoice.tsx`, `apps/web/app/routes/profile.tsx`, `apps/web/app/routes/users.$id.tsx`, `apps/web/app/routes/suppliers._index.tsx`.
2. Root build script is only `turbo build`: `package.json:5`.
3. Web build script is only `react-router build` (no typecheck): `apps/web/package.json:8`.
4. `pnpm build` still passes despite `pnpm typecheck` failure.

Why it matters:

1. Runtime regressions can be released while static contracts are already known-bad.
2. This increases production defect risk and slows future refactors.

Recommendation:

1. Make typecheck a hard gate in CI and in release builds.
2. Update root scripts so `build` runs typecheck first or ensure CI enforces `pnpm typecheck`.
3. Consider changing web build script to include `react-router typegen && tsc --noEmit` before `react-router build`.

---

### 2) [High] Multi-step state transitions are not transactional

Evidence:

1. `packages/db/src/queries/orders.ts:352-521` performs multi-table side effects without a transaction.
2. `packages/db/src/queries/purchasing.ts:327-425` updates PO line quantities, creates lots, writes movements, and updates PO status without transaction boundaries.
3. `packages/db/src/queries/brewing.ts:245-483` updates batches, vessels, movements, and finished goods without transaction boundaries.
4. `packages/db/src/queries/inventory.ts:323-376` writes movement then updates lot quantity with separate calls.
5. No DB transactions are used anywhere in `packages/db/src` (`rg "transaction\\("` returned no matches).

Why it matters:

1. Partial commit risk: failures in the middle of these flows can leave data inconsistent.
2. Inconsistent stock, reservation, or status state will corrupt planning and fulfillment decisions.

Recommendation:

1. Wrap each multi-step mutation in `db.transaction(...)`.
2. Ensure all validation reads and writes occur inside the same transaction.
3. Add regression tests that simulate failures mid-operation and assert rollback behavior.

---

### 3) [High] Receiving and consumption allow invalid stock states

Evidence:

1. `receiveLine` increments `quantityReceived` without bounding to `quantityOrdered`: `packages/db/src/queries/purchasing.ts:355-358`.
2. `receivePoLineSchema` only checks positive quantity, not remaining allowable quantity: `packages/shared/src/validation.ts:324-330`.
3. UI sets an HTML `max` attribute client-side (`apps/web/app/routes/purchasing.$id.receive.tsx:142`) but server logic does not enforce it.
4. `recordMovement` updates lot quantity blindly and can push negative on-hand: `packages/db/src/queries/inventory.ts:355-369`.
5. `recordConsumption` accepts positive quantities but does not validate against lot availability: `packages/db/src/queries/brewing.ts:487-529` and `packages/shared/src/validation.ts:211-219`.

Why it matters:

1. Negative stock and over-receipt break core inventory correctness.
2. Downstream planning, purchasing, and costing become unreliable.

Recommendation:

1. Enforce `newQtyReceived <= quantityOrdered` server-side within transaction.
2. Enforce `lot.quantityOnHand + movementDelta >= 0` server-side.
3. Add DB `CHECK` constraints for non-negative fields (`quantity_on_hand`, `quantity_reserved`, `quantity_received`).
4. Return structured validation errors for these domain violations.

---

### 4) [High] Sequence generation is race-prone and invoice numbers are not uniquely constrained

Evidence:

1. Count-based ID sequences:
`packages/db/src/queries/brewing.ts:141-155`,
`packages/db/src/queries/purchasing.ts:100-114`,
`packages/db/src/queries/orders.ts:107-121`,
`packages/db/src/queries/orders.ts:334-348`.
2. `orders.invoiceNumber` lacks unique constraint: `packages/db/src/schema/orders.ts:38`.

Why it matters:

1. Concurrent writes can compute same next sequence value.
2. Unique collisions can produce intermittent 500s.
3. Invoice numbering can duplicate under race conditions because schema does not enforce uniqueness.

Recommendation:

1. Replace count-based numbering with a dedicated sequence table or atomic increment row.
2. Add unique index on `orders.invoice_number` (if business rules require uniqueness).
3. Add retry logic on unique constraint conflicts.

---

### 5) [High] Session secret has insecure fallback in production path

Evidence:

1. `apps/web/app/lib/auth.server.ts:5` sets `SESSION_SECRET` fallback to `"dev-secret-change-me"`.

Why it matters:

1. If environment config is missing in production, sessions become forgeable.
2. This is an account/session compromise risk.

Recommendation:

1. In production, fail fast when `SESSION_SECRET` is missing or weak.
2. Require minimum entropy/length.
3. Keep fallback only for explicit local development mode.

---

### 6) [Medium] Supplier list route expects fields not returned by query

Evidence:

1. Route consumes `supplier.itemCount`: `apps/web/app/routes/suppliers._index.tsx:76`, `:79`, `:124`.
2. `queries.suppliers.list()` only returns supplier columns and no aggregate `itemCount`: `packages/db/src/queries/suppliers.ts:8-18`.
3. This mismatch is part of the current typecheck failure.

Why it matters:

1. Broken contract between data layer and UI.
2. Causes compile failures and incorrect supplier UX.

Recommendation:

1. Update `suppliers.list()` to left-join inventory items and return `itemCount`.
2. Add typed return contracts for query functions to catch these mismatches earlier.

---

### 7) [Medium] Invoice route uses fields and types that do not match data contracts

Evidence:

1. References `order.customer.billingAddress`, which does not exist in customer schema/query shape: `apps/web/app/routes/orders.$id.invoice.tsx:251-256`.
2. `renderToBuffer` result is passed directly to `Response` and fails TS typing: `apps/web/app/routes/orders.$id.invoice.tsx:422` and `:427`.
3. Route is currently in typecheck error set.

Why it matters:

1. Invoice generation path is brittle and currently not type-safe.
2. Billing address output can be incorrect or omitted.

Recommendation:

1. Build invoice address from existing customer fields (`addressLine1`, `addressLine2`, `city`, `state`, `postcode`, `country`) in query or route.
2. Normalize buffer handling for `Response` body type compatibility.
3. Add focused tests for invoice loader and PDF generation.

---

### 8) [Medium] Profile and user-detail action data typing is not discriminated

Evidence:

1. Property access on unioned `errors` object causes compile errors in:
`apps/web/app/routes/profile.tsx:158-249` and
`apps/web/app/routes/users.$id.tsx:157-231`.
2. The action return shape is varied, but consumer code assumes narrow shapes by `intent` without strong typing.

Why it matters:

1. Core account-management pages are currently type-broken.
2. This pattern is fragile and easy to regress.

Recommendation:

1. Define explicit `ActionData` discriminated unions keyed by `intent`.
2. Return consistent payload shapes per intent.
3. Add lightweight component tests for error rendering.

---

### 9) [Medium] E2E harness is unstable in constrained environments

Evidence:

1. Playwright config starts dev server with watchers: `apps/web/e2e/playwright.config.ts:30`.
2. Running `pnpm --filter @brewplan/web test:e2e -- --list` failed with:
`Error: EMFILE: too many open files, watch`.

Why it matters:

1. E2E test execution can fail before tests even start.
2. Reduces confidence in CI signal and developer feedback loop.

Recommendation:

1. Use production mode web server for E2E in CI (`react-router build` + `react-router-serve`) to avoid watch overhead.
2. Keep dev-server mode only for local interactive runs.
3. Consider splitting smoke tests for faster, deterministic CI.

---

### 10) [Medium] Missing foreign key for consumption lot references

Evidence:

1. `brewIngredientConsumptions.inventoryLotId` is plain text and not FK-constrained:
`packages/db/src/schema/brewing.ts:51`.
2. Query logic assumes valid lot linkage via inner join:
`packages/db/src/queries/brewing.ts:93-103`.

Why it matters:

1. Orphaned consumption rows can exist and disappear from detail views due inner join behavior.
2. Data integrity is not enforced at the DB layer.

Recommendation:

1. Add FK reference from `brew_ingredient_consumptions.inventory_lot_id` to `inventory_lots.id`.
2. Add migration to backfill/clean invalid rows before enabling constraint.

---

### 11) [Low] Lint command does not lint application code today

Evidence:

1. Root lint script is `turbo lint`: `package.json:7`.
2. `turbo.json` lint task has only dependency config and no outputs: `turbo.json:12-14`.
3. Packages do not define `lint` scripts, so `pnpm lint` effectively does not run static linting for app code.

Why it matters:

1. Style and bug-prone patterns are not systematically detected.
2. Increases review burden and inconsistency.

Recommendation:

1. Add ESLint with package-level `lint` scripts.
2. Gate CI on both `pnpm lint` and `pnpm typecheck`.

---

### 12) [Low] Stray artifact file contains internal debug output and local paths

Evidence:

1. `apps/web/errors.*}` is an HTML/debug dump containing local filesystem paths and stack traces:
`apps/web/errors.*}:1-88`.

Why it matters:

1. Repository hygiene issue.
2. Avoidable disclosure of local machine paths and internal stack data in source control.

Recommendation:

1. Remove this file from repository history if possible.
2. Add ignore pattern to prevent accidental re-commit of debug dumps.

---

### 13) [Low] Several loaders/exports use avoidable N+1 query patterns

Evidence:

1. `recipes.$id._index` loops ingredients and fetches inventory one-by-one: `apps/web/app/routes/recipes.$id._index.tsx:47-53`.
2. `batches.$id.consumption` loops inventory items and fetches lots one-by-one: `apps/web/app/routes/batches.$id.consumption.tsx:37-43`.
3. `getInventoryForCsvExport` loops inventory items and queries lots per item:
`packages/db/src/queries/reporting.ts:124-145`.

Why it matters:

1. Performance degrades as dataset grows.
2. Page/report latency will scale poorly.

Recommendation:

1. Replace per-item lookups with set-based joins/aggregates.
2. Keep domain calculations in SQL where possible.

## Recommended Implementation Order

1. Fix release gating: enforce typecheck in CI and build process.
2. Add transaction boundaries to `orders.transition`, `purchasing.receiveLine`, `brewing.transition`, and `inventory.recordMovement`.
3. Implement strict server-side stock/receiving constraints.
4. Replace count-based numbering with safe sequence generation and enforce invoice uniqueness.
5. Fix active compile errors (`invoice`, `profile`, `users`, `suppliers`) and add targeted tests.
6. Harden auth secret handling.
7. Stabilize E2E harness and then expand regression coverage around transitions/inventory invariants.
