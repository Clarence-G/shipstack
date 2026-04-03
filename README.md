# oRPC Full-Stack Template

A monorepo scaffold for building **type-safe full-stack applications** with oRPC contract-first development. Includes Web (React), Mobile (Expo), and Backend (Hono) — all sharing a single API contract.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Bun workspaces |
| Contract | oRPC + Zod (contract-first, shared types) |
| Backend | Hono + oRPC server + Bun runtime |
| Auth | Better Auth (email/password, session cookies, Expo plugin) |
| Database | Drizzle ORM + PostgreSQL |
| AI | AI SDK with OpenAI-compatible providers |
| Storage | S3 presigned URLs (MinIO for dev, AWS S3/R2/OSS for prod) |
| Frontend | React 19 + Vite + Tailwind CSS v4 + shadcn/ui |
| Mobile | Expo + React Native + Uniwind (Tailwind v4) + RN Reusables |
| Data Fetching | oRPC client + TanStack Query |
| Logging | Pino (structured JSON in prod, pretty-print in dev) |
| Linting | Biome (lint + format + import sorting) |
| API Docs | OpenAPI spec + Scalar UI |
| Git Hooks | Lefthook (pre-commit Biome check) |

## Project Structure

```
├── packages/
│   └── contract/            # API contract — single source of truth for types
│       └── src/
│           ├── auth.contract.ts
│           ├── ai.contract.ts
│           ├── storage.contract.ts
│           └── index.ts
├── apps/
│   ├── backend/             # Hono server (port 4001)
│   │   └── src/
│   │       ├── index.ts     # Entry: CORS, auth, oRPC, OpenAPI, Scalar UI
│   │       ├── orpc.ts      # implement(contract) + auth middleware
│   │       ├── routers/     # Route handlers (auth, ai, storage)
│   │       ├── db/          # Drizzle schema + migrations + seed
│   │       └── lib/         # auth, ai, s3, logger, env, openapi
│   ├── frontend/            # React SPA (port 5173)
│   │   └── src/
│   │       ├── lib/         # oRPC client, auth client, logger, utils
│   │       ├── pages/       # Route pages (home, login, register, 404)
│   │       ├── layouts/     # Root layout with nav + dark mode toggle
│   │       └── components/
│   │           ├── ui/      # shadcn/ui components (20+)
│   │           ├── block/   # Page-level blocks (login-form, signup-form)
│   │           ├── biz/     # Business components (chat)
│   │           └── shared/  # ErrorBoundary, ThemeProvider, ThemeToggle
│   └── mobile/              # React Native app (Expo)
│       └── src/
│           ├── app/         # Expo Router file routes
│           ├── lib/         # oRPC client, auth client
│           ├── components/
│           │   ├── ui/      # RN Reusables components (30+)
│           │   └── block/   # Block components (sign-in, sign-up, user-menu)
│           └── global.css   # Tailwind + Uniwind entry
├── biome.json               # Biome linter/formatter config
├── lefthook.yml             # Git hooks (pre-commit lint)
├── docker-compose.yml       # MinIO for local S3
├── package.json             # Workspace scripts
└── .env.example             # Environment variables template
```

## How Type Safety Works

```
packages/contract (Zod schemas + oRPC contract)
       │
       ├──► apps/backend:  implement(contract) enforces handler types
       ├──► apps/frontend: ContractRouterClient<typeof contract> enforces client types
       └──► apps/mobile:   ContractRouterClient<typeof contract> enforces client types
```

The contract package defines every API procedure's input/output using Zod. Both sides import the contract **source** directly (via TypeScript path aliases) — no build step needed. If a backend handler returns the wrong shape or a frontend call passes the wrong args, `tsc` catches it.

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) (v1.1+)
- PostgreSQL database
- Docker (optional, for MinIO S3)

### Setup

```bash
# 1. Install dependencies (also installs git hooks via lefthook)
bun install

# 2. Configure environment
cp .env.example apps/backend/.env
# Edit apps/backend/.env with your DATABASE_URL, BETTER_AUTH_SECRET, etc.

# 3. Create database (first time only)
bun run db:create

# 4. Run database migrations
bun run db:generate
bun run db:migrate

# 5. Seed test user (optional)
bun run db:seed
# → test@example.com / password123

# 6. Start MinIO for file storage (optional)
docker compose up -d
# Create "uploads" bucket at http://localhost:9001 (minioadmin/minioadmin)

# 7. Start development
bun run dev
```

This starts:
- Backend at `http://localhost:4001`
- Frontend at `http://localhost:5173` (proxies `/api` and `/rpc` to backend)
- API docs at `http://localhost:4001/docs` (Scalar UI)
- OpenAPI spec at `http://localhost:4001/openapi.json`

### All Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start both frontend and backend |
| `bun run dev:backend` | Start backend only |
| `bun run dev:frontend` | Start frontend only |
| `bun run dev:mobile` | Start mobile Expo dev server |
| `bun run db:create` | Create the PostgreSQL database |
| `bun run db:generate` | Generate Drizzle migration files |
| `bun run db:migrate` | Apply database migrations |
| `bun run db:seed` | Insert test user (test@example.com / password123) |
| `bun run lint` | Check lint + format with Biome |
| `bun run lint:fix` | Auto-fix lint + format issues |
| `bun run format` | Format all files |

## Features

### Env Validation

Backend validates all environment variables at startup with Zod. Missing or invalid vars produce clear error messages and exit immediately — no cryptic runtime crashes.

```ts
import { env } from './lib/env'
// env.DATABASE_URL, env.PORT, etc. — fully typed, validated at boot
```

### Structured Logging (Pino)

- **Backend**: Pretty-printed in dev, JSON in prod. HTTP request middleware auto-logs method/path/status/ms. Control level via `LOG_LEVEL` env var.
- **Frontend**: Pino browser mode. Integrated with TanStack Query mutation error handler.

```ts
import { logger } from './lib/logger'
logger.info({ userId }, 'user logged in')
logger.error({ err }, 'upload failed')
```

### Dark Mode

Built-in ThemeProvider (shadcn Vite pattern) with Sun/Moon toggle in the header. Supports `light`, `dark`, and `system` modes. Persisted to localStorage.

### Error Handling

- **Error Boundary** wraps the entire app — catches render errors with a friendly fallback UI
- **404 page** via catch-all route
- **Global toast** for unhandled mutation errors (Sonner)
- **oRPC errors** use `ORPCError` with standard codes (`NOT_FOUND`, `UNAUTHORIZED`, etc.)

### File Storage (S3 Presigned URLs)

```
Client → requestUploadUrl → Backend (signs URL) → Client
Client → PUT file → S3 (direct upload)
Client → confirmUpload → Backend (verifies + saves metadata)
```

Works with MinIO (dev), AWS S3, Cloudflare R2, or Aliyun OSS. Pre-built `useUpload` hooks for both Web and Mobile.

### OpenAPI Docs

Auto-generated from the oRPC contract. Visit `http://localhost:4001/docs` for interactive Scalar API reference.

### Code Quality

- **Biome** — lint, format, import sorting in a single tool
- **Lefthook** — pre-commit hook runs Biome on staged files
- **Git hooks auto-install** via `prepare` script on `bun install`

## Architecture Decisions

### Contract-First oRPC

All API types live in `packages/contract`. The backend **implements** the contract, the frontend **consumes** it. Neither imports from the other.

### Authentication Split

- **Better Auth** handles login/register/logout via its own HTTP endpoints (`/api/auth/*`)
- **oRPC** only exposes `auth.me` for fetching the current user
- Auth middleware bridges Better Auth sessions into oRPC context for protected procedures

### AI Integration

Uses AI SDK with a configurable OpenAI-compatible provider. Set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` in `.env`. The `ai.chat` procedure streams responses via oRPC's EventIterator, consumed on the frontend with `useChat` from `@ai-sdk/react`.

### Frontend oRPC Usage

```ts
import { client, orpc } from '@/lib/orpc'

// Direct call (outside React)
const user = await client.auth.me({})

// TanStack Query (inside React)
const { data } = useQuery(orpc.auth.me.queryOptions({ input: {} }))
const { mutate } = useMutation(orpc.todo.create.mutationOptions())
```

### Mobile (Expo + RN Reusables)

The mobile app mirrors the frontend's component structure using [RN Reusables](https://rnr-docs.vercel.app/) — a React Native port of shadcn/ui. Key differences from Web are documented in `docs/mobile.md`.

## Environment Variables

Copy `.env.example` to `apps/backend/.env` and configure:

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | — | Session encryption secret |
| `BETTER_AUTH_URL` | Yes | — | Backend URL (e.g. `http://localhost:4001`) |
| `PORT` | No | `4001` | Server port |
| `LOG_LEVEL` | No | `info` | Pino log level (debug/info/warn/error) |
| `FRONTEND_URL` | No | `http://localhost:4000` | Frontend origin (CORS) |
| `AI_API_KEY` | For AI | — | API key for OpenAI-compatible provider |
| `AI_BASE_URL` | For AI | — | Provider base URL |
| `AI_MODEL` | No | `gpt-4o-mini` | Model identifier |
| `S3_ENDPOINT` | No | `http://localhost:9000` | S3-compatible endpoint |
| `S3_ACCESS_KEY` | No | `minioadmin` | S3 access key |
| `S3_SECRET_KEY` | No | `minioadmin` | S3 secret key |
| `S3_BUCKET` | No | `uploads` | S3 bucket name |

## Extending the Scaffold

### Adding a New API Procedure

1. **Define contract** in `packages/contract/src/`
2. **Add to root contract** in `packages/contract/src/index.ts`
3. **Implement handler** in `apps/backend/src/routers/`
4. **Register router** in `apps/backend/src/routers/index.ts`
5. **Use on frontend** — the client is automatically typed

See `docs/backend.md` for detailed examples.

### Adding Database Tables

```bash
# 1. Define table in apps/backend/src/db/schema.ts
# 2. Generate and apply migration
bun run db:generate
bun run db:migrate
```

## Documentation

Detailed guides for coding agents and developers:

- `docs/backend.md` — Backend patterns, DB queries, auth, streaming, logging, storage
- `docs/frontend.md` — Frontend patterns, oRPC client, components, styling, error handling
- `docs/mobile.md` — Mobile setup, RN Reusables vs shadcn differences, Uniwind
- `docs/orpc.md` — oRPC usage reference
