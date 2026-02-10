# Code Review Response

Date: 2026-02-10
Reviewer: Codex | Implementer: Claude

## Overview

All high-priority and most medium-priority findings from RECOMMENDATIONS.md have been addressed. The changes span type safety, data integrity, security hardening, and build pipeline enforcement.

---

## Implemented Findings

### Finding #1 [High] — Release pipeline allows shipping with broken TypeScript

**Root cause:** `turbo build` did not depend on `typecheck`, so broken types could ship.

**Fix:** Added `"typecheck"` to `build.dependsOn` in `turbo.json`. Now `pnpm build` runs all three package typechecks before any build step proceeds. A type error anywhere will fail the build.

**Files:** `turbo.json`

---

### Finding #2 [High] — Multi-step state transitions are not transactional

**Root cause:** Complex mutations in orders, purchasing, brewing, and inventory performed multiple writes without transaction boundaries. A failure mid-operation could leave inconsistent state.

**Fix:** Wrapped all multi-step mutations in `db.transaction()`:

- `orders.create()` and `orders.transition()` — sequence generation + insert/updates atomic
- `purchasing.create()` and `purchasing.receiveLine()` — PO line update, lot creation, stock movement, and status evaluation atomic
- `brewing.create()` and `brewing.transition()` — vessel updates, stock movements, finished goods creation atomic
- `inventory.recordMovement()` — movement insert + lot quantity update atomic

Cross-module calls (`recordMovement` from brewing, `createFinishedGoods`/`listByBatch` from packaging) accept an optional `DbTransaction` handle so they participate in the caller's transaction rather than opening a separate one.

**Files:** `packages/db/src/client.ts`, `packages/db/src/queries/orders.ts`, `packages/db/src/queries/purchasing.ts`, `packages/db/src/queries/brewing.ts`, `packages/db/src/queries/inventory.ts`, `packages/db/src/queries/packaging.ts`

---

### Finding #3 [High] — Receiving and consumption allow invalid stock states

**Root cause:** Server-side validation was insufficient — over-receipt, negative stock, and consuming from empty lots were all possible.

**Fix:** Three server-side guards added:

1. **Over-receipt prevention** (`purchasing.receiveLine`): Throws if `newQtyReceived > quantityOrdered`, reporting the remaining allowable quantity.
2. **Negative stock prevention** (`inventory.recordMovement`): Throws if `lot.quantityOnHand + delta < 0`, reporting current stock and requested reduction.
3. **Consumption lot availability** (`brewing.recordConsumption`): Validates lot exists and has sufficient `quantityOnHand` before recording the consumption.

**Files:** `packages/db/src/queries/purchasing.ts`, `packages/db/src/queries/inventory.ts`, `packages/db/src/queries/brewing.ts`

---

### Finding #4 [High] — Sequence generation is race-prone and invoice numbers are not uniquely constrained

**Root cause:** Count-based ID generation (`count(*) + 1`) was not inside a transaction with the insert, and `orders.invoice_number` had no unique constraint.

**Fix:**

1. All four sequence generators (`generateOrderNumber`, `generatePoNumber`, `generateBatchNumber`, `generateInvoiceNumber`) now accept a `DbTransaction` handle and run inside the same transaction as their corresponding insert. The count and insert are atomic.
2. Added `.unique()` constraint on `orders.invoiceNumber` in the schema.
3. Generated migration `0006_right_young_avengers.sql` which creates the unique index.

**Files:** `packages/db/src/schema/orders.ts`, `packages/db/src/queries/orders.ts`, `packages/db/src/queries/purchasing.ts`, `packages/db/src/queries/brewing.ts`, `packages/db/src/migrations/0006_right_young_avengers.sql`

---

### Finding #5 [High] — Session secret has insecure fallback in production path

**Root cause:** `SESSION_SECRET` fell back to `"dev-secret-change-me"` unconditionally, including in production.

**Fix:** Added a production guard that throws at startup if `SESSION_SECRET` is not set when `NODE_ENV === "production"`. The dev fallback is preserved only for local development.

**Files:** `apps/web/app/lib/auth.server.ts`

---

### Finding #6 [Medium] — Supplier list route expects fields not returned by query

**Root cause:** Route consumed `supplier.itemCount` but `queries.suppliers.list()` returned plain supplier columns with no aggregate.

**Fix:** Updated `suppliers.list()` to left-join `inventoryItems` and return a `count(inventoryItems.id)` aggregate as `itemCount`, grouped by supplier.

**Files:** `packages/db/src/queries/suppliers.ts`

---

### Finding #7 [Medium] — Invoice route uses fields and types that do not match data contracts

**Root cause:** `order.customer.billingAddress` did not exist in the customer schema. `renderToBuffer` result had a type mismatch with `Response`.

**Fix:**

1. Added `formatBillingAddress()` helper that builds a formatted address string from the customer's `addressLine1`, `addressLine2`, `city`, `state`, `postcode`, and `country` fields.
2. Fixed `renderToBuffer` type with `Parameters<typeof renderToBuffer>[0]` cast.
3. Fixed `Response` body with `new Uint8Array(buffer)` for `BodyInit` compatibility.

**Files:** `apps/web/app/routes/orders.$id.invoice.tsx`

---

### Finding #8 [Medium] — Profile and user-detail action data typing is not discriminated

**Root cause:** `useActionData<typeof action>()` returned a broad union that TypeScript couldn't narrow by `intent`, causing compile errors on `.name`, `.email`, `.currentPassword`, etc.

**Fix:** Defined explicit `ProfileActionData` and `UserActionData` discriminated union types keyed by `intent`. Cast `useActionData()` result to the discriminated union, enabling proper narrowing in the component.

**Files:** `apps/web/app/routes/profile.tsx`, `apps/web/app/routes/users.$id.tsx`

---

### Finding #10 [Medium] — Missing foreign key for consumption lot references

**Root cause:** `brewIngredientConsumptions.inventoryLotId` was plain text with no FK constraint. Orphaned rows could exist and disappear from detail views due to inner join behavior.

**Fix:** Added `.references(() => inventoryLots.id)` to the schema. Migration recreates the table with the FK constraint, preserving all existing data.

**Files:** `packages/db/src/schema/brewing.ts`, `packages/db/src/migrations/0006_right_young_avengers.sql`

---

### Finding #12 [Low] — Stray artifact file contains internal debug output

**Root cause:** `apps/web/errors.*}` was a debug dump containing local paths and stack traces.

**Fix:** Removed the file and added `errors.*` to `.gitignore` to prevent re-commit.

**Files:** `.gitignore` (removed `apps/web/errors.*}`)

---

## Deferred Findings

### Finding #9 [Medium] — E2E harness is unstable in constrained environments

The EMFILE issue occurs in CI/constrained environments due to dev-server file watchers. This requires CI infrastructure changes (switching to production-mode server for E2E in CI). Deferred as it doesn't affect local development or correctness.

### Finding #11 [Low] — Lint command does not lint application code today

Adding ESLint with package-level `lint` scripts is a separate tooling initiative. The typecheck gate now provides the most critical static analysis coverage.

### Finding #13 [Low] — Several loaders/exports use avoidable N+1 query patterns

The N+1 patterns in `recipes.$id._index`, `batches.$id.consumption`, and `getInventoryForCsvExport` will become performance concerns as dataset grows. Deferred to a focused performance optimization pass.

---

## Verification

All changes verified against:
- `pnpm typecheck` — 0 errors across all 3 packages
- `pnpm build` — successful (now gated on typecheck)
- `pnpm test:e2e` — 68/68 tests passing
