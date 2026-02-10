# BrewPlan — Phase 1 Implementation Plan

> Phase 1 = Core Brewing Loop + Materials Planning (MVP)
> Goal: Enter recipes, manage ingredients, plan and track brews, see what you need to order.

---

## Tech Stack

| Layer | Choice | Why |
|-------|--------|-----|
| Language | TypeScript (strict) everywhere | One language, shared types, best agent tooling |
| Runtime | Node.js | Fly.io support, SQLite bindings |
| Framework | Remix (React Router v7, framework mode) | Loaders/actions eliminate API boilerplate. Nested routes map to brewery workflows. Data loads with the page. |
| Database | SQLite via better-sqlite3 | Single-file, zero-ops, fast. Litestream for backups to Tigris. |
| ORM | Drizzle | Type-safe, SQL-first, excellent SQLite support, generates migrations |
| Validation | Zod | Runtime validation + static types from one schema |
| Styling | Tailwind CSS 4 + shadcn/ui | Mobile-first. 44px touch targets. Cards replace tables on small screens. |
| Monorepo | pnpm workspaces + turborepo | Parallel builds, shared deps, clean boundaries for sub-agents |
| Deployment | Fly.io (single machine) | SQLite lives on one disk. $2–3/month. Litestream streams WAL to Tigris. |
| File Storage | Tigris (S3-compatible on Fly) | Recipe photos, attachments. Free tier is generous. |

### Why Remix?

BrewPlan is a CRUD-heavy internal tool. Remix's loader/action pattern eliminates an entire layer of plumbing that a plain React + API setup would require:

- **No REST API to build or maintain.** Loaders fetch data server-side, actions handle mutations. The route file *is* the API.
- **No API client layer.** No fetch wrappers, no response typing, no error handling boilerplate on the client.
- **No loading spinners for initial page loads.** Data arrives with the HTML. Critical when you're checking inventory with wet hands in a brewery.
- **Nested routes = nested layouts.** Batch list → batch detail → fermentation log maps directly to Remix's route hierarchy.
- **Forms just work.** Remix `<Form>` + `action` handles validation, submission, error display, and revalidation. No `useState` + `onSubmit` + `fetch` + `setLoading` + `setError` chains.
- **Progressive enhancement.** Forms work before JS loads. Good for reliability on a brewery floor.

If a mobile app or external API is ever needed, Remix resource routes (returning JSON) can serve that without a rewrite.

### Why not separate React + API?

The original plan split into `packages/api` (Hono) + `apps/web` (React) to avoid file conflicts between sub-agents. But that argument doesn't hold — Remix routes are already separated by module. An agent working on `routes/recipes/` never touches `routes/brewing/`. File conflicts are solved by *domain boundaries*, not by splitting into separate packages.

The separate API approach would have required building and maintaining: REST routes, request/response types, a fetch client, loading states, error handling on both sides, and cache invalidation. Remix gives all of that for free.

---

## Monorepo Structure

```
brewplan/
├── package.json                  # pnpm workspace root
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
│
├── packages/
│   ├── shared/                   # ← AGENT 0 (built first, referenced by all)
│   │   ├── src/
│   │   │   ├── enums.ts              # All domain enums
│   │   │   ├── types.ts              # TypeScript interfaces for every entity
│   │   │   ├── validation.ts         # Zod schemas for create/update operations
│   │   │   ├── constants.ts          # Prefixes, defaults, business constants
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── db/                       # ← AGENT 1
│       ├── src/
│       │   ├── schema/               # Drizzle table definitions
│       │   │   ├── recipes.ts
│       │   │   ├── inventory.ts
│       │   │   ├── brewing.ts
│       │   │   ├── vessels.ts
│       │   │   └── index.ts
│       │   ├── queries/              # Query functions grouped by module
│       │   │   ├── recipes.ts
│       │   │   ├── inventory.ts
│       │   │   ├── brewing.ts
│       │   │   ├── vessels.ts
│       │   │   ├── planning.ts       # Derived calculations
│       │   │   └── index.ts
│       │   ├── migrations/
│       │   ├── seed.ts
│       │   ├── client.ts             # DB connection singleton
│       │   └── index.ts
│       ├── drizzle.config.ts
│       ├── package.json
│       └── tsconfig.json
│
└── apps/
    └── web/                      # ← AGENTS 2 + 3 (split by domain module)
        ├── app/
        │   ├── root.tsx              # Root layout, sidebar nav, Tailwind
        │   ├── routes/               # Remix file-based routing
        │   │   │
        │   │   │   # ── Auth (Scaffolding) ─────────────────────
        │   │   ├── login.tsx                  # GET/POST → login form + verify
        │   │   ├── logout.tsx                 # POST → destroy session
        │   │   │
        │   │   │   # ── Recipes (Agent 2) ──────────────────────
        │   │   ├── recipes.tsx                # Layout: header + outlet
        │   │   ├── recipes._index.tsx         # GET  → loader: list recipes
        │   │   ├── recipes.new.tsx            # GET/POST → loader/action: create recipe
        │   │   ├── recipes.$id.tsx            # Layout: recipe header + tabs
        │   │   ├── recipes.$id._index.tsx     # GET  → loader: recipe detail + ingredients
        │   │   ├── recipes.$id.edit.tsx       # GET/POST → loader/action: edit recipe
        │   │   ├── recipes.$id.ingredients.tsx # POST → action: add/edit/remove ingredients
        │   │   │
        │   │   │   # ── Inventory (Agent 2) ────────────────────
        │   │   ├── inventory.tsx              # Layout
        │   │   ├── inventory._index.tsx       # GET  → loader: list with position calcs
        │   │   ├── inventory.new.tsx          # GET/POST → create item
        │   │   ├── inventory.$id.tsx          # Layout: item header + tabs
        │   │   ├── inventory.$id._index.tsx   # GET  → loader: detail + lots + position
        │   │   ├── inventory.$id.edit.tsx     # GET/POST → edit item
        │   │   ├── inventory.$id.lots.tsx     # GET/POST → view/add lots
        │   │   ├── inventory.$id.movements.tsx # GET/POST → movement log + record
        │   │   │
        │   │   │   # ── Brewing (Agent 3) ──────────────────────
        │   │   ├── batches.tsx                # Layout
        │   │   ├── batches._index.tsx         # GET  → loader: list batches
        │   │   ├── batches.new.tsx            # GET/POST → create batch from recipe
        │   │   ├── batches.$id.tsx            # Layout: batch header + status bar
        │   │   ├── batches.$id._index.tsx     # GET  → loader: full batch detail
        │   │   ├── batches.$id.transition.tsx  # POST → action: status transition
        │   │   ├── batches.$id.consumption.tsx # GET/POST → ingredient consumption
        │   │   ├── batches.$id.fermentation.tsx # GET/POST → fermentation log
        │   │   │
        │   │   │   # ── Vessels (Agent 3) ──────────────────────
        │   │   ├── vessels.tsx                # Layout
        │   │   ├── vessels._index.tsx         # GET  → loader: list with status
        │   │   ├── vessels.new.tsx            # GET/POST → create vessel
        │   │   ├── vessels.$id.tsx            # GET/POST → detail + edit
        │   │   │
        │   │   │   # ── Planning (Agent 3) ─────────────────────
        │   │   ├── planning.tsx               # Layout
        │   │   ├── planning._index.tsx        # GET  → loader: overview/dashboard
        │   │   ├── planning.materials.tsx     # GET  → loader: materials requirements
        │   │   ├── planning.schedule.tsx      # GET  → loader: brew schedule
        │   │   │
        │   │   │   # ── Dashboard ──────────────────────────────
        │   │   └── _index.tsx                 # Home: quick stats + upcoming brews
        │   │
        │   ├── components/
        │   │   ├── ui/                   # shadcn/ui primitives
        │   │   ├── layout/               # Shell, Sidebar, Header
        │   │   └── shared/               # StatusBadge, UnitDisplay, PositionBar, etc.
        │   │
        │   └── lib/
        │       ├── auth.server.ts        # Session storage + requireUser helper
        │       ├── db.server.ts          # Re-export db client (server-only)
        │       └── utils.ts              # Formatting, date helpers
        │
        ├── public/
        ├── vite.config.ts
        ├── tailwind.config.ts
        ├── package.json
        └── tsconfig.json
```

---

## Sub-Agent Strategy

Agents are split by **domain module**, not by architectural layer. Each agent owns a vertical slice of routes and never touches another agent's routes.

### Dependency Graph

```
  ┌──────────────┐
  │  AGENT 0     │   ← Build first (30 min). Defines the contract.
  │  shared/     │      Enums, types, Zod schemas.
  └──────┬───────┘
         │
    ┌────┴────────────────────┐
    │                         │
    ▼                         ▼
┌────────┐    ┌──────────────────────────────┐
│AGENT 1 │    │  AGENT 2         AGENT 3     │
│  db/   │    │  Recipes +       Brewing +   │
│        │    │  Inventory       Vessels +    │
│ schema │    │  routes          Planning     │
│ queries│    │                  routes       │
│ seed   │    │                              │
└────┬───┘    └──────────────────────────────┘
     │              ▲               ▲
     │              │               │
     └──────────────┴───────────────┘
           (agents 2+3 import db queries)
```

### Why This Split Works Without Conflicts

Each agent owns **entire route files**. Remix's file-based routing means:
- Agent 2 owns every file starting with `recipes.` and `inventory.`
- Agent 3 owns every file starting with `batches.`, `vessels.`, and `planning.`
- They never edit the same file

Shared UI components (`components/ui/`, `components/shared/`) are set up during scaffolding before agents start. If an agent needs a new shared component, they create it in their own feature directory first — promote to shared later.

The only shared file agents both touch is `root.tsx` for sidebar nav links — handle this in scaffolding by adding all nav items upfront.

### Agent 0 — Shared Types (do first, ~30 min)

**Owns:** `packages/shared/`

Translates DOMAIN.md into TypeScript. This is the contract everything depends on.

Deliverables:
- All enums: `RecipeStatus`, `BatchStatus`, `InventoryCategory`, `UsageStage`, `PackageFormat`, `MovementType`, `Unit`, `VesselType`, `VesselStatus`
- Entity interfaces matching DOMAIN.md tables
- Zod schemas for every create/update operation
- Constants: number prefixes, default values

### Agent 1 — Database (~2 hours)

**Owns:** `packages/db/`
**Reads:** `packages/shared/`

Deliverables:
- Drizzle schema matching DOMAIN.md + `User` table (id, email, password_hash, name, created_at)
- Generated migrations
- Query functions for every operation:

```
# Auth
auth.getUserById(id)             → User | null
auth.getUserByEmail(email)       → User | null
auth.verifyLogin(email, pw)      → User | null
auth.createUser(data)            → User

# Recipes
recipes.list(filters?)           → Recipe[]
recipes.get(id)                  → Recipe
recipes.getWithIngredients(id)   → Recipe & { ingredients: (RecipeIngredient & item name)[] }
recipes.create(data)             → Recipe
recipes.update(id, data)         → Recipe
recipes.setStatus(id, status)    → Recipe

# Inventory
inventory.list(filters?)         → InventoryItem[]
inventory.get(id)                → InventoryItem
inventory.getPosition(id)        → { on_hand, allocated, available, on_order, projected }
inventory.getPositionAll()       → (InventoryItem & position)[]
inventory.create / update
inventory.getLots(itemId)        → InventoryLot[]
inventory.createLot(data)        → InventoryLot
inventory.recordMovement(data)   → StockMovement

# Brewing
batches.list(filters?)           → BrewBatch[]
batches.get(id)                  → BrewBatch
batches.getWithDetails(id)       → BrewBatch & recipe & consumption & fermentation log
batches.create(data)             → BrewBatch
batches.update(id, data)         → BrewBatch
batches.transition(id, toStatus) → BrewBatch (guards + side effects)
batches.recordConsumption(data)  → BrewIngredientConsumption
batches.addFermentationEntry(data) → FermentationLogEntry

# Vessels
vessels.list(filters?)           → Vessel[]
vessels.get(id)                  → Vessel & current batch info
vessels.create / update

# Planning
planning.getMaterialsRequirements() → { item, needed, on_hand, allocated, available, shortfall }[]
planning.getBrewSchedule()          → planned batches with estimated dates + vessel availability
```

- Seed data: initial admin user (email + hashed password from env vars), 2–3 recipes with ingredients, a dozen inventory items with lots, 3–4 vessels, a couple of batches in various states
- Tests for derived calculations and batch state transitions

### Agent 2 — Recipes + Inventory Routes (~2 hours)

**Owns:** `app/routes/recipes.*`, `app/routes/inventory.*`
**Reads:** `packages/shared/`, `packages/db/`

Each route file is a self-contained unit: loader fetches data, action handles mutations, default export renders the UI.

Example pattern — `recipes.$id._index.tsx`:
```tsx
import { useLoaderData } from "react-router";
import { queries } from "@brewplan/db";

export async function loader({ params }: Route.LoaderArgs) {
  const recipe = await queries.recipes.getWithIngredients(params.id!);
  if (!recipe) throw new Response("Not found", { status: 404 });
  return { recipe };
}

export default function RecipeDetail() {
  const { recipe } = useLoaderData<typeof loader>();
  // render recipe detail with ingredient table
}
```

No API layer. No fetch client. No loading state management. The loader *is* the data layer.

Deliverables:
- Full recipe CRUD: list, create, view detail with ingredients, edit, archive/activate
- Ingredient management: add, edit, remove ingredients from a recipe (inline or modal)
- Inventory CRUD: list with position columns, create, view detail with lots
- Lot management: view lots, manual lot creation
- Stock movements: log view, record adjustments

### Agent 3 — Brewing + Vessels + Planning Routes (~2 hours)

**Owns:** `app/routes/batches.*`, `app/routes/vessels.*`, `app/routes/planning.*`
**Reads:** `packages/shared/`, `packages/db/`

Deliverables:
- Batch CRUD: list (filterable by status), create from recipe (select recipe + vessel + date)
- Batch detail: full view with recipe info, consumption records, fermentation log
- Status transitions: buttons that POST to the transition action with guard validation and error display
- Ingredient consumption: record actual ingredients used, select specific lots
- Fermentation logging: add gravity/temp/pH entries, display as sortable table
- Vessel list: card or table view showing status, current batch, capacity
- Vessel CRUD: create, edit, set maintenance status
- Planning — materials requirements: table showing all planned batches' ingredient needs vs stock position
- Planning — brew schedule: list/calendar of planned and in-progress batches with estimated dates

---

## Phase 1 Scope (from DOMAIN.md)

### Entities to Implement

| Entity | Notes |
|--------|-------|
| **User** | Auth, seeded via CLI. Single user Phase 1. |
| **Recipe** | All fields including time estimates |
| **RecipeIngredient** | Nested under Recipe |
| **InventoryItem** | Material master with derived position |
| **InventoryLot** | Lot tracking |
| **StockMovement** | Immutable log |
| **BrewBatch** | All fields including estimated_ready_date |
| **BrewIngredientConsumption** | Lot-level traceability |
| **FermentationLogEntry** | Time-series data |
| **Vessel** | Capacity planning |

### State Machine

Only **BrewBatch** in Phase 1:

```
planned → brewing → fermenting → conditioning → ready_to_package
```

With all guards and side effects per DOMAIN.md. `ready_to_package` is effectively terminal for Phase 1 (packaging runs come in Phase 2).

### Derived Calculations

- `quantity_on_hand` — sum of lots
- `quantity_allocated` — from planned/brewing batches × recipe ingredients
- `quantity_available` — on_hand − allocated
- `quantity_on_order` — returns 0 in Phase 1 (no purchase orders yet), but the query exists
- Materials requirements — for all planned batches, ingredients needed vs available

### Not in Phase 1 (implemented in Phase 2)

- ~~Packaging, finished goods, orders, customers, purchasing, suppliers~~ → Phase 2
- Quality checks, settings, recipe versioning, file uploads → Phase 3
- Multi-user / roles (auth is in, but single user only) → Phase 3
- Brewfather import → Phase 3

---

## Screen Designs

### Navigation

```
┌─────────────────┐
│  🍺 BrewPlan    │
│                 │
│  📋 Recipes     │
│  📦 Inventory   │
│  🍺 Batches     │
│  🏭 Vessels     │
│  📊 Planning    │
└─────────────────┘
```

### Key Screens

**Recipe Detail:**
- Header: name, style, status badge, version
- Targets: OG / FG / ABV / IBU / SRM / batch size
- Time estimates: brew + fermentation + conditioning = total days
- Ingredient table grouped by usage_stage
- Footer: estimated cost, cost/litre
- Actions: Edit, Create Batch, Archive

**Batch Detail:**
- Header: batch number, recipe name, status badge
- Status transition buttons (contextual — only valid next states shown)
- Dates: planned → brew → estimated ready
- Vessel assignment with capacity bar
- Measured values: OG / FG / ABV / volume / efficiency
- Tabs or sections: Consumption | Fermentation Log
- Inline forms for adding entries

**Inventory List:**
- Table: name, category, on_hand, allocated, available, reorder_point
- Colour: red if available < 0, amber if below reorder point
- Category filter tabs

**Materials Requirements (Planning):**
- All planned batches listed at top
- Table: ingredient, total needed, on hand, allocated, available, shortfall
- Shortfall highlighted red
- This is the screen that answers "do I need to order anything before next week's brew?"

---

## Build Sequence

### Step 0: Scaffolding (~20 min)

Set up the monorepo skeleton before any agent starts:
- pnpm workspace + turborepo config
- Package stubs with tsconfig
- Remix app with Vite, Tailwind, shadcn/ui installed
- `root.tsx` with sidebar nav (all links, even to empty pages)
- `components/ui/` populated with shadcn primitives (Button, Input, Table, Card, Badge, Dialog, Form, Select, Tabs)
- `components/shared/StatusBadge.tsx`, `UnitDisplay.tsx` stubs
- `lib/auth.server.ts` — cookie session storage + `requireUser` helper
- `lib/db.server.ts` re-exporting the db client
- `routes/login.tsx` + `routes/logout.tsx`

### Step 1: Shared Types — Agent 0 (~30 min)

Translate DOMAIN.md → TypeScript enums, interfaces, Zod schemas.

### Step 2: Parallel Work — Agents 1, 2, 3 (~2 hours)

| Agent | Owns | Blocked by |
|-------|------|------------|
| **Agent 1** | `packages/db/` — schema, queries, seed | Agent 0 (shared types) |
| **Agent 2** | `routes/recipes.*`, `routes/inventory.*` | Agent 0, then Agent 1 for queries |
| **Agent 3** | `routes/batches.*`, `routes/vessels.*`, `routes/planning.*` | Agent 0, then Agent 1 for queries |

Agents 2 and 3 can start building route UI with hardcoded mock data while Agent 1 finishes queries. Once queries land, they swap `const recipe = MOCK_RECIPE` for `queries.recipes.getWithIngredients(id)` in their loaders.

### Step 3: Integration + Polish (~1 hour)

- Swap any remaining mocks for real queries
- End-to-end flow: create recipe → add inventory → plan batch → brew → ferment → check materials
- Error handling, empty states, form validation messages
- Responsive check for tablet

---

## Deployment

### Fly.io

```toml
# fly.toml
app = "brewplan"
primary_region = "syd"

[build]
  dockerfile = "Dockerfile"

[mounts]
  source = "brewplan_data"
  destination = "/data"

[env]
  DATABASE_URL = "/data/brewplan.db"
  NODE_ENV = "production"

[http_service]
  internal_port = 3000
  force_https = true
```

### Litestream

```yaml
dbs:
  - path: /data/brewplan.db
    replicas:
      - type: s3
        endpoint: fly.storage.tigris.dev
        bucket: brewplan-backups
        path: db
```

### Dockerfile

Single container:
1. Litestream (background — continuous WAL streaming)
2. Drizzle migrations (on startup)
3. Remix server (serves everything — SSR pages + static assets)

---

## Phase 2 — Commercial Operations + Full Planning

> Phase 2 = Packaging, suppliers, purchasing, customers, orders, and demand-driven planning views.
> Completed and committed. All Phase 2 entities, routes, schemas, and queries are implemented.

### Phase 2 Entities

7 new database tables (schema files in `packages/db/src/schema/`):

| Table | Schema File | Notes |
|-------|-------------|-------|
| `Supplier` | `suppliers.ts` | Maltsters, hop merchants, yeast labs, packaging suppliers |
| `PurchaseOrder` | `purchasing.ts` | POs with state machine (draft → sent → acknowledged → partially_received → received) |
| `PurchaseOrderLine` | `purchasing.ts` | Line items on POs, tracks quantity_ordered vs quantity_received |
| `Customer` | `customers.ts` | Venues, bottle shops, distributors, taproom |
| `Order` | `orders.ts` | Orders with state machine (draft → confirmed → picking → dispatched → delivered → invoiced → paid) |
| `OrderLine` | `orders.ts` | Forward order support: recipe_id + format, finished_goods_id linked at picking |
| `PackagingRun` | `packaging.ts` | Keg/can/bottle runs from fermented batches |
| `FinishedGoodsStock` | `packaging.ts` | Packaged beer available for sale |

### Phase 2 Query Files

5 new query modules in `packages/db/src/queries/`:

- `packaging.ts` — packaging runs, finished goods stock CRUD
- `suppliers.ts` — supplier CRUD
- `purchasing.ts` — PO lifecycle, line management, receiving flow with lot creation
- `customers.ts` — customer CRUD
- `orders.ts` — order lifecycle, line management, stock picking/reservation

### Phase 2 Route Map

35 new route files in `apps/web/app/routes/`:

**Suppliers** (6 routes):
- `suppliers.tsx` — layout
- `suppliers._index.tsx` — list
- `suppliers.new.tsx` — create
- `suppliers.$id.tsx` — detail layout
- `suppliers.$id._index.tsx` — detail view
- `suppliers.$id.edit.tsx` — edit

**Purchasing** (8 routes):
- `purchasing.tsx` — layout
- `purchasing._index.tsx` — PO list
- `purchasing.new.tsx` — create PO
- `purchasing.$id.tsx` — PO detail layout
- `purchasing.$id._index.tsx` — PO detail view
- `purchasing.$id.lines.tsx` — manage PO lines
- `purchasing.$id.transition.tsx` — PO status transitions
- `purchasing.$id.receive.tsx` — receive goods against PO

**Customers** (6 routes):
- `customers.tsx` — layout
- `customers._index.tsx` — list
- `customers.new.tsx` — create
- `customers.$id.tsx` — detail layout
- `customers.$id._index.tsx` — detail view
- `customers.$id.edit.tsx` — edit

**Orders** (8 routes):
- `orders.tsx` — layout
- `orders._index.tsx` — order list
- `orders.new.tsx` — create order
- `orders.$id.tsx` — order detail layout
- `orders.$id._index.tsx` — order detail view
- `orders.$id.lines.tsx` — manage order lines
- `orders.$id.transition.tsx` — order status transitions
- `orders.$id.pick.tsx` — pick/allocate finished goods to order lines

**Finished Goods Stock** (3 routes):
- `stock.tsx` — layout
- `stock._index.tsx` — stock list
- `stock.$id.tsx` — stock detail

**Batch Packaging** (1 route):
- `batches.$id.packaging.tsx` — create packaging runs from a batch

**Planning** (3 new routes):
- `planning.demand.tsx` — demand view: what orders are due, unfulfillable orders
- `planning.packaging.tsx` — packaging priority: what to keg/can first
- `planning.purchasing.tsx` — purchase timing: what to order and when

### Phase 2 State Machines

Two new state machines added (per DOMAIN.md):

- **Order**: `draft` → `confirmed` → `picking` → `dispatched` → `delivered` → `invoiced` → `paid` (with cancellation from draft/confirmed)
- **Purchase Order**: `draft` → `sent` → `acknowledged` → `partially_received` → `received` (with cancellation from any pre-received state)

Both include guards, side effects, and shortcut transitions as defined in DOMAIN.md.

---

## E2E Testing

Playwright E2E test suite covering all modules across both phases.

### Setup

- **Framework:** Playwright (`@playwright/test`)
- **Config:** `apps/web/e2e/playwright.config.ts`
- **Global setup/teardown:** `e2e/global-setup.ts` / `e2e/global-teardown.ts` — seeds a test database, authenticates a test user
- **Auth helper:** `e2e/helpers/auth.ts` — shared auth storage at `e2e/.auth/user.json`
- **Test database:** Isolated SQLite DB at `e2e/brewplan-test.db`
- **Browser:** Chromium only, sequential execution (`workers: 1`, `fullyParallel: false`)
- **Web server:** Auto-starts dev server on port 5173

### Running Tests

```bash
pnpm test:e2e             # Run all E2E tests (headless)
pnpm test:e2e -- --ui     # Open Playwright UI mode
pnpm test:e2e:headed      # Run tests with visible browser
```

### Test Files

12 spec files, 38 tests total in `apps/web/e2e/tests/`:

| Spec File | Module |
|-----------|--------|
| `auth.spec.ts` | Login/logout |
| `dashboard.spec.ts` | Home dashboard |
| `recipes.spec.ts` | Recipe CRUD + ingredients |
| `inventory.spec.ts` | Inventory items, lots, movements |
| `batches.spec.ts` | Batch lifecycle + transitions |
| `vessels.spec.ts` | Vessel CRUD |
| `planning.spec.ts` | Planning views |
| `suppliers.spec.ts` | Supplier CRUD |
| `purchasing.spec.ts` | Purchase orders + receiving |
| `customers.spec.ts` | Customer CRUD |
| `orders.spec.ts` | Order lifecycle + picking |
| `stock.spec.ts` | Finished goods stock |

---

## Current State

### Completed

- **Phase 1** (Core Brewing Loop): Auth, recipes, inventory, brew batches, vessels, materials planning. All implemented and tested.
- **Phase 2** (Commercial Operations): Packaging, suppliers, purchasing, customers, orders, demand/packaging/purchasing planning views. All implemented and tested.
- **Phase 3** (Quality, Settings, Versioning, Import, Export, RBAC): Quality checks, brewery settings, recipe versioning + process steps, Brewfather import, CSV exports, invoice PDFs, production summary, multi-user RBAC. All implemented and tested.
- **Phase 4** (Deployment Readiness): Enhanced dashboard (orders pending, revenue, upcoming deliveries, quick links), reporting aggregates (top products, top customers, revenue by period, pending deliveries), batch `planned → fermenting` shortcut transition, Dockerfile, fly.toml, Litestream config, startup script, deployment docs.
- **E2E Tests**: 68 tests across 16 spec files covering all modules.

---

## Design Decisions

### Auth — Ship from Day One

Remix cookie-based sessions. No third-party provider, no OAuth.

- `createCookieSessionStorage` with a server-side secret
- `User` table: `id`, `email`, `password_hash`, `name`, `created_at`
- Password hashing via `bcrypt`
- `requireUser(request)` helper — every loader/action calls this first. Returns the user or redirects to `/login`.
- Login route: `routes/login.tsx` — email + password form
- Logout route: `routes/logout.tsx` — POST destroys session
- Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, 7-day expiry

Single user for Phase 1 (you), but the pattern supports adding users later without rearchitecting. No registration flow — seed the first user via CLI or migration.

Adds to Agent 1 scope: `User` table in schema, `auth.verifyLogin()` and `auth.getUserById()` queries.
Adds to scaffolding: `lib/auth.server.ts` (session storage + `requireUser` helper), `routes/login.tsx`, `routes/logout.tsx`.

### Mobile-First — Large Touch Targets from Day One

Primary use is on a phone or tablet in the brewery. Design constraints:

- **Minimum touch target: 44×44px** (Apple HIG). All buttons, table rows, form inputs.
- **Base font: 16px minimum** on inputs (prevents iOS zoom on focus).
- **Sidebar collapses** to bottom nav or hamburger on mobile.
- **Forms stack vertically** on small screens — no multi-column form layouts below `md` breakpoint.
- **Status transition buttons are large and prominent** — you're tapping these with wet hands.
- **Tables become cards on mobile** — inventory list and batch list switch to stacked card layout below `sm`.
- **Fermentation log entry** is optimised for quick one-handed input: gravity, temp, pH, note, submit.

Tailwind breakpoints: design for `sm` (640px) first, enhance for `lg` (1024px+). Not the other way around.

### Units — Metric Only

No imperial support. All weights in grams/kilograms, volumes in millilitres/litres, temperatures in Celsius. Simplifies every display component and removes the need for conversion logic.

### Batch Numbering

Auto-incrementing `{prefix}-{year}-{sequence}` format.
Example: `BP-2026-001`, `BP-2026-002`, etc.
Sequence resets each calendar year.

### Brewfather Import

Not in Phase 1. When it happens, Brewfather exports JSON with recipe data that maps reasonably well to BrewPlan's recipe model. Plan for a future `routes/recipes.import.tsx` route that accepts a Brewfather JSON export and maps it to `Recipe` + `RecipeIngredient` records.
