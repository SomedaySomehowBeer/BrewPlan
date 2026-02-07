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

## Conventions

- TypeScript strict mode everywhere. No `any`.
- Metric units only (g, kg, ml, L, °C). No imperial.
- All route loaders call `requireUser(request)` first.
- Zod schemas validate all mutations (actions). Never trust form data directly.
- Database queries live in `packages/db/src/queries/`, not in route files.
- Route files contain: loader, action (if mutations), default export (UI component).
- Mobile-first: design for 640px, enhance for 1024px+. Tables become cards on small screens.
- Batch numbers: `BP-{year}-{sequence}` (e.g. BP-2026-001).

## Agent Boundaries

If you are working as a sub-agent, check which files you own:

| Agent | Owns | Don't Touch |
|-------|------|-------------|
| Agent 0 | `packages/shared/**` | Everything else |
| Agent 1 | `packages/db/**` | Routes, components |
| Agent 2 | `apps/web/app/routes/recipes.*`, `apps/web/app/routes/inventory.*` | Other routes |
| Agent 3 | `apps/web/app/routes/batches.*`, `apps/web/app/routes/vessels.*`, `apps/web/app/routes/planning.*` | Other routes |

Shared components in `apps/web/app/components/` are set up during scaffolding. If you need a new shared component, create it in your route directory first.

## Commands

```bash
pnpm install          # Install all deps
pnpm dev              # Dev server (from apps/web)
pnpm build            # Build all packages + app
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed dev data
```
