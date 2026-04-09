# CLAUDE.md Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a `CLAUDE.md` at the repo root so AI coding tools auto-load project context on session start.

**Architecture:** Single `CLAUDE.md` at repo root acts as a navigation layer — it covers project overview, architecture, key conventions, and commands, then routes the AI to the appropriate `docs/*.md` for detailed patterns. Existing docs are not modified.

**Tech Stack:** Markdown only. No code changes.

---

### Task 1: Write CLAUDE.md

**Files:**
- Create: `CLAUDE.md`

**Step 1: Create the file**

Create `CLAUDE.md` at repo root with the following content:

```markdown
# oRPC Full-Stack Template

A monorepo scaffold for type-safe full-stack apps. Three apps share one API contract:

- `apps/backend` — Hono server, port 4001
- `apps/frontend` — React SPA, port 5173
- `apps/mobile` — Expo React Native app, port 8081
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

## Key Conventions

These apply everywhere — know them before writing any code:

1. **Contract first.** Any new API procedure must be defined in `packages/contract/src/` before implementing the handler or calling it from the client.

2. **No raw fetch.** Use the oRPC client (`client.*` or `orpc.*` for TanStack Query) in frontend and mobile. Never use `fetch` directly for API calls.

3. **Biome, not ESLint/Prettier.** Run `bun run lint` to check. Run `bun run lint:fix` to auto-fix. Config is in `biome.json`.

4. **Drizzle for all DB access.** No raw SQL strings. Schema lives in `apps/backend/src/db/schema.ts`. After changing schema: `bun run db:generate` then `bun run db:migrate`.

5. **Zod validation in the contract.** Input/output schemas belong in `packages/contract`, not in route handlers.

6. **Environment variables are validated at startup.** Add new vars to `apps/backend/src/lib/env.ts` (Zod schema) and `.env.example`. Never access `process.env` directly.

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start backend + frontend together |
| `bun run dev:backend` | Backend only |
| `bun run dev:frontend` | Frontend only |
| `bun run dev:mobile` | Expo mobile dev server |
| `bun run db:generate` | Generate Drizzle migration files after schema change |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:seed` | Insert test user (test@example.com / password123) |
| `bun run lint` | Check with Biome |
| `bun run lint:fix` | Auto-fix lint + format |
```

**Step 2: Verify the file exists and looks correct**

```bash
cat CLAUDE.md
```

Expected: full file content printed, no truncation.

**Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "feat: add CLAUDE.md for AI coding agent context"
```

---

### Task 2: Verify @file references work in Claude Code

**Files:**
- Read: `CLAUDE.md`

**Step 1: Confirm @docs/ paths are correct**

Check that every `@docs/*.md` reference in CLAUDE.md points to a file that exists:

```bash
ls docs/backend.md docs/frontend.md docs/mobile.md docs/orpc.md
```

Expected: all four files listed with no errors.

**Step 2: No further action needed**

Claude Code resolves `@docs/backend.md` relative to the repo root automatically. No config required.
