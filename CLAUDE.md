# BrewPlan

Brewery management app for Someday Somehow Brewing (gluten-free brewery, Vasse WA). Built by a single developer with AI coding agents.

## Architecture

- **Framework:** Remix (React Router v7, framework mode) with Vite
- **Database:** SQLite via better-sqlite3 + Drizzle ORM
- **Validation:** Zod schemas in `packages/shared/`
- **Styling:** Tailwind CSS 4 + shadcn/ui, mobile-first (44px touch targets)
- **Auth:** Cookie sessions, `requireUser()` in every loader/action
- **Monorepo:** pnpm workspaces + turborepo
- **Deploy:** Fly.io Sydney, Litestream → Tigris for SQLite backups

## Key Files

- `docs/DOMAIN.md` — Full domain model. Source of truth for entities, enums, state machines, planning views.
- `docs/PLAN.md` — Implementation plan, route map, agent strategy, build sequence.
- `packages/shared/` — Enums, TypeScript interfaces, Zod schemas. Shared contract.
- `packages/db/` — Drizzle schema, query functions, migrations, seed.
- `apps/web/` — Remix app. Routes split by domain module.
- `apps/web/e2e/` — Playwright E2E tests. 12 spec files, 38 tests.

## Conventions

- TypeScript strict mode everywhere. No `any`.
- Metric units only (g, kg, ml, L, °C). No imperial.
- All route loaders call `requireUser(request)` first.
- Zod schemas validate all mutations (actions). Never trust form data directly.
- Database queries live in `packages/db/src/queries/`, not in route files.
- Route files contain: loader, action (if mutations), default export (UI component).
- Mobile-first: design for 640px, enhance for 1024px+. Tables become cards on small screens.
- Batch numbers: `BP-{year}-{sequence}` (e.g. BP-2026-001).
- PO numbers: `PO-{year}-{sequence}` (e.g. PO-2026-001).
- Order numbers: `ORD-{year}-{sequence}` (e.g. ORD-2026-001).

## Agent Boundaries

The Phase 1 build used a parallel agent strategy (Agent 0–3 split by domain module). Phase 2 and onward are built by a single developer — agent boundaries are no longer enforced. All files are fair game.

If you are a sub-agent, coordinate with the lead on which files you own for the current task.

## Commands

```bash
pnpm install          # Install all deps
pnpm dev              # Dev server (from apps/web)
pnpm build            # Build all packages + app
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed dev data
pnpm test:e2e         # Run Playwright E2E tests (headless)
pnpm test:e2e -- --ui # Open Playwright UI mode
```
