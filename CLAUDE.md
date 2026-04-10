# oRPC Full-Stack Template

A monorepo scaffold for type-safe full-stack apps. Three apps share one API contract:

- `apps/backend` — Hono server, port 4001
- `apps/frontend` — React SPA, port 4000
- `apps/mobile` — Expo React Native app (Metro default: 8081)
- `packages/contract` — oRPC + Zod contract (source of truth for all API types)

## Architecture

```
packages/contract  (Zod schemas + oRPC procedures)
       │
       ├──► apps/backend   implement(contract) — type-checked handlers
       ├──► apps/frontend  ContractRouterClient<typeof contract> — type-checked calls
       └──► apps/mobile    ContractRouterClient<typeof contract> — type-checked calls
```

The contract package is imported directly via TypeScript path aliases — no build step.
Frontend and mobile never import from backend, and vice versa. All shared types flow through the contract.

## Development Guides

Before working on any area, read the relevant guide:

- **Backend** (`apps/backend`): @docs/backend.md
- **Frontend** (`apps/frontend`): @docs/frontend.md
- **Mobile** (`apps/mobile`): @docs/mobile.md
- **oRPC patterns** (client, streaming, errors): @docs/orpc.md
- **Testing** (writing & running tests): @docs/testing.md

## Key Conventions

These apply everywhere — know them before writing any code:

1. **Contract first.** Any new API procedure must be defined in `packages/contract/src/` before implementing the handler or calling it from the client.

2. **No raw fetch.** Use the oRPC client (`client.*` or `orpc.*` for TanStack Query) in frontend and mobile. Never use `fetch` directly for API calls.

3. **Biome, not ESLint/Prettier.** Run `bun run lint` to check. Run `bun run lint:fix` to auto-fix. Config is in `biome.json`.

4. **Drizzle for all DB access.** No raw SQL strings — this applies everywhere, including `seed.ts`. Schema lives in `apps/backend/src/db/schema.ts`. After changing schema: `bun run db:generate` then `bun run db:migrate`.

5. **Zod validation in the contract.** Input/output schemas belong in `packages/contract`, not in route handlers.

6. **Environment variables are validated at startup.** Add new vars to `apps/backend/src/lib/env.ts` (Zod schema) and `.env.example`. Never access `process.env` directly.

7. **`as unknown as` and `as any` are red flags.** If you need these in implementation code, you're using the wrong API — stop and find the correct approach. For genuine third-party type incompatibilities, use `biome-ignore` with an explanation. Never use casts to silence a type error you don't understand.

8. **Interactive elements must have correct semantics.** Clickable areas → `<button type="button">`. Navigation → `<Link>` or `<a>`. Never bind `onClick` to `<div>` or `<span>` — keyboard users and screen readers won't be able to trigger them.

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start backend + frontend together |
| `bun run dev:backend` | Backend only |
| `bun run dev:frontend` | Frontend only |
| `bun run dev:mobile` | Expo mobile dev server |
| `bun run db:create` | Create the PostgreSQL database (first time only) |
| `bun run db:generate` | Generate Drizzle migration files after schema change |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:seed` | Insert test user (test@example.com / password123) |
| `bun run lint` | Check with Biome |
| `bun run lint:fix` | Auto-fix lint + format |
| `bun run format` | Format all files with Biome |
| `bun run test` | Run all backend tests |
| `bun run test:backend` | Run all backend tests (explicit) |
| `cd apps/backend && bun test src/routers/foo.test.ts` | Run a single test file |
| `bunx biome check apps/backend/src/routers/foo.ts` | Lint a single file |
| `bunx biome check --write apps/backend/src/routers/foo.ts` | Auto-fix a single file |
