# oRPC Full-Stack Template

A monorepo scaffold for building **type-safe full-stack applications** with oRPC contract-first development. Designed as a starting point for AI-assisted project generation and rapid prototyping.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Bun workspaces |
| Contract | oRPC + Zod (contract-first, shared types) |
| Backend | Hono + oRPC server + Bun runtime |
| Auth | Better Auth (email/password, session cookies) |
| Database | Drizzle ORM + PostgreSQL |
| AI | AI SDK with OpenAI-compatible providers |
| Frontend | React 19 + Vite + Tailwind CSS v4 + shadcn/ui |
| Data Fetching | oRPC client + TanStack Query |

## Project Structure

```
├── packages/
│   └── contract/            # API contract — single source of truth for types
│       └── src/
│           ├── auth.contract.ts
│           ├── ai.contract.ts
│           └── index.ts
├── apps/
│   ├── backend/             # Hono server (port 3001)
│   │   └── src/
│   │       ├── index.ts     # Entry: CORS, Better Auth, oRPC handler
│   │       ├── orpc.ts      # implement(contract) + auth middleware
│   │       ├── routers/     # Route handlers (auth, ai)
│   │       ├── db/          # Drizzle schema + connection
│   │       └── lib/         # Auth config, AI model setup
│   └── frontend/            # React SPA (port 5173)
│       └── src/
│           ├── lib/         # oRPC client, auth client, utils
│           ├── pages/       # Route pages (home, login, register)
│           ├── layouts/     # Root layout with nav
│           └── components/
│               ├── ui/      # shadcn/ui components
│               ├── biz/     # Business components (chat)
│               └── shared/  # Shared components
├── package.json             # Workspace scripts
├── tsconfig.base.json       # Shared TypeScript config
└── .env.example             # Environment variables template
```

## How Type Safety Works

```
packages/contract (Zod schemas + oRPC contract)
       │
       ├──► apps/backend:  implement(contract) enforces handler types
       │
       └──► apps/frontend: ContractRouterClient<typeof contract> enforces client types
```

The contract package defines every API procedure's input/output using Zod. Both sides import the contract **source** directly (via TypeScript path aliases) — no build step needed. If a backend handler returns the wrong shape or a frontend call passes the wrong args, `tsc` catches it.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) (v1.1+)
- PostgreSQL database

### Setup

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example apps/backend/.env
# Edit apps/backend/.env with your DATABASE_URL, BETTER_AUTH_SECRET, etc.

# Run database migrations
bun run db:generate
bun run db:migrate

# Start development
bun run dev
```

This starts:
- Backend at `http://localhost:3001`
- Frontend at `http://localhost:5173` (proxies `/api` and `/rpc` to backend)

### All Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start both frontend and backend |
| `bun run dev:backend` | Start backend only |
| `bun run dev:frontend` | Start frontend only |
| `bun run db:generate` | Generate Drizzle migration files |
| `bun run db:migrate` | Apply database migrations |

## Architecture Decisions

### Contract-First oRPC

All API types live in `packages/contract`. The backend **implements** the contract, the frontend **consumes** it. Neither imports from the other.

### Authentication Split

- **Better Auth** handles login/register/logout via its own HTTP endpoints (`/api/auth/*`) and client SDK (`signIn.email()`, `signUp.email()`, `signOut()`).
- **oRPC** only exposes `auth.me` for fetching the current user in a type-safe way.
- Auth middleware bridges Better Auth sessions into oRPC context for protected procedures.

### AI Integration

The backend uses AI SDK with a configurable OpenAI-compatible provider. Set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` in `.env` to point to OpenAI, DeepSeek, Ollama, or any compatible endpoint. The `ai.chat` procedure streams responses via oRPC's EventIterator, consumed on the frontend with `useChat` from `@ai-sdk/react`.

### No Build Step in Development

- **Backend**: Bun runs TypeScript directly (`bun run --hot src/index.ts`)
- **Frontend**: Vite handles TypeScript natively
- **Type checking**: `tsc --noEmit` reads contract source via path aliases — no `composite` or project references needed

## Environment Variables

Copy `.env.example` to `apps/backend/.env` and configure:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | Session encryption secret |
| `BETTER_AUTH_URL` | Yes | Backend URL (e.g. `http://localhost:3001`) |
| `FRONTEND_URL` | No | Frontend URL for CORS (default: `http://localhost:5173`) |
| `AI_API_KEY` | For AI | API key for OpenAI-compatible provider |
| `AI_BASE_URL` | For AI | Provider base URL (default: OpenAI) |
| `AI_MODEL` | No | Model identifier (default: `gpt-4o-mini`) |

## Extending the Scaffold

### Adding a New API Procedure

1. **Define contract** in `packages/contract/src/`:
   ```ts
   // packages/contract/src/todo.contract.ts
   import { oc } from '@orpc/contract'
   import { z } from 'zod'

   export const todoContract = {
     list: oc.input(z.object({})).output(z.array(TodoSchema)),
     create: oc.input(CreateTodoSchema).output(TodoSchema),
   }
   ```

2. **Add to root contract** in `packages/contract/src/index.ts`:
   ```ts
   export const contract = {
     auth: authContract,
     ai: aiContract,
     todo: todoContract,  // add here
   }
   ```

3. **Implement handler** in `apps/backend/src/routers/`:
   ```ts
   // apps/backend/src/routers/todo.router.ts
   import { os, authMiddleware } from '../orpc'

   export const todoRouter = {
     list: os.todo.list.use(authMiddleware).handler(async ({ context }) => {
       // implementation
     }),
   }
   ```

4. **Register router** in `apps/backend/src/routers/index.ts`:
   ```ts
   export const router = os.router({
     auth: authRouter,
     ai: aiRouter,
     todo: todoRouter,  // add here
   })
   ```

5. **Use on frontend** — the client is automatically typed:
   ```ts
   // Anywhere in frontend
   const todos = await client.todo.list({})
   // Or with TanStack Query
   const { data } = useQuery(orpc.todo.list.queryOptions({ input: {} }))
   ```

### Adding Database Tables

Define tables in `apps/backend/src/db/schema.ts` using Drizzle's `pgTable`, then run:
```bash
bun run db:generate   # generates migration SQL
bun run db:migrate    # applies to database
```
