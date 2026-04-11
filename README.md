# shipstack

The opinionated full-stack starter for indie hackers.  
Type-safe from contract to client. Web + Mobile + Backend in one repo.

![Bun](https://img.shields.io/badge/Bun-black?logo=bun&logoColor=white)
![Hono](https://img.shields.io/badge/Hono-E36002?logo=hono&logoColor=white)
![oRPC](https://img.shields.io/badge/oRPC-6366f1?logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle-C5F74F?logo=drizzle&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?logo=react&logoColor=black)
![Expo](https://img.shields.io/badge/Expo-000020?logo=expo&logoColor=white)

## Why

- **Contract-first API** — One Zod schema shared across backend, web, and mobile. If types don't match, `tsc` catches it at build time.
- **Three apps, one repo** — React Web + Expo Mobile + Hono Backend. Clone and start building, not configuring.
- **Zero-config dev** — PGLite embedded database in dev mode. No PostgreSQL install, no Docker, no setup. Just `bun run dev`.
- **Auth included** — Better Auth with email/password. Expo SecureStore sessions on mobile. Ready to extend.
- **AI + Storage ready** — Streaming AI chat via AI SDK. S3 presigned uploads (MinIO for dev, AWS/R2/OSS for prod).
- **AI coding ready** — `CLAUDE.md` + per-area docs (`docs/`). Coding agents know the stack on first load.

## Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Bun workspaces |
| Contract | oRPC + Zod |
| Backend | Hono + Bun |
| Auth | Better Auth (email/password, Expo SecureStore) |
| Database | Drizzle ORM + PGLite (dev) / PostgreSQL (prod) |
| AI | AI SDK (OpenAI-compatible) |
| Storage | S3 presigned URLs (MinIO / AWS / R2 / OSS) |
| Frontend | React 19 + Vite + Tailwind CSS v4 + shadcn/ui |
| Mobile | Expo SDK 54 + React Native + Uniwind + RN Reusables |
| Data Fetching | TanStack Query + oRPC client |
| Linting | Biome (lint + format) |
| Git Hooks | Lefthook (pre-commit: biome + typecheck) |
| Testing | bun:test + PGLite (in-memory, per-file isolation) |

## Architecture

```
packages/contract  (Zod schemas + oRPC procedures)
       │
       ├──► apps/backend   implement(contract) — type-checked handlers
       ├──► apps/frontend  ContractRouterClient<typeof contract> — type-checked calls
       └──► apps/mobile    ContractRouterClient<typeof contract> — type-checked calls
```

The contract is imported directly via TypeScript path aliases — no build step. Frontend and mobile never import from backend.

## Quick Start

```bash
# 1. Create your repo from the template
gh repo create my-app --template Clarence-G/shipstack --clone --private
cd my-app
bun install

# 2. Configure environment
cp .env.example apps/backend/.env
# Edit apps/backend/.env — at minimum set BETTER_AUTH_SECRET

# 3. Start dev servers (PGLite — no database setup needed)
bun run dev
```

Or click **"Use this template"** on GitHub to create your repo from the web.

- Frontend: `http://localhost:4000`
- Backend: `http://localhost:4001`

> **Dev mode uses PGLite** — an embedded PostgreSQL running in-process. No external database needed.  
> Set `ENV=prod` and `DATABASE_URL` in `.env` when deploying to production with a real PostgreSQL.

### Optional: Seed test user

```bash
bun run db:seed
# Creates: test@example.com / password123
```

### Optional: S3 file uploads (MinIO)

```bash
docker compose up -d
# MinIO console: http://localhost:9001 (minioadmin/minioadmin)
# Create an "uploads" bucket via the console
```

## Project Structure

```
.
├── packages/
│   └── contract/src/          # Zod schemas + oRPC procedure definitions
│       ├── index.ts           # Root contract { auth, ai, storage }
│       ├── auth.contract.ts
│       ├── ai.contract.ts
│       └── storage.contract.ts
├── apps/
│   ├── backend/src/           # Hono server (port 4001)
│   │   ├── index.ts           # Entry: CORS, auth routes, oRPC handler
│   │   ├── orpc.ts            # implement(contract), auth middleware
│   │   ├── routers/           # Domain routers (auth, ai, ...)
│   │   ├── db/                # Drizzle schema, migrations, seed
│   │   ├── lib/               # Auth, AI, S3, env, logger
│   │   └── test/              # Test setup (PGLite + fixtures)
│   ├── frontend/src/          # React SPA (port 4000)
│   │   ├── pages/             # Route pages
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui primitives
│   │   │   ├── block/         # Page-level blocks (login, signup)
│   │   │   ├── biz/           # Business components (chat)
│   │   │   └── shared/        # Shared components (theme, error boundary)
│   │   └── lib/               # oRPC client, auth client, utils
│   └── mobile/src/            # Expo app (Metro: 8081)
│       ├── app/               # Expo Router file routes
│       ├── components/
│       │   ├── ui/            # RN Reusables primitives
│       │   └── block/         # Block components (sign-in, sign-up)
│       └── lib/               # oRPC client, auth client, utils
├── docs/                      # Per-area development guides
├── scripts/                   # Typecheck, test utilities
├── lefthook.yml               # Pre-commit: biome + typecheck
├── biome.json                 # Linter + formatter config
└── docker-compose.yml         # MinIO for local S3
```

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start backend + frontend together |
| `bun run dev:backend` | Backend only |
| `bun run dev:frontend` | Frontend only |
| `bun run dev:mobile` | Expo mobile dev server |
| `bun run db:generate` | Generate Drizzle migrations after schema change |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:seed` | Seed test user (test@example.com / password123) |
| `bun run test` | Run all backend tests |
| `bun run typecheck` | TypeScript check across all apps |
| `bun run lint` | Check with Biome |
| `bun run lint:fix` | Auto-fix lint + format |

## Environment Variables

Copy `.env.example` to `apps/backend/.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| `ENV` | `dev` | `dev` = PGLite (no DB setup), `prod` = PostgreSQL |
| `DATABASE_URL` | — | PostgreSQL URL (required when `ENV=prod`) |
| `BETTER_AUTH_SECRET` | — | Session encryption secret (32+ chars) |
| `BETTER_AUTH_URL` | `http://localhost:4001` | Backend URL |
| `FRONTEND_URL` | `http://localhost:4000` | Frontend origin (CORS) |
| `AI_API_KEY` | — | OpenAI-compatible API key |
| `AI_BASE_URL` | `https://api.openai.com/v1` | Provider URL (OpenAI / DeepSeek / Ollama) |
| `AI_MODEL` | `gpt-4o-mini` | Model identifier |

## Documentation

Detailed development guides for each area:

| Guide | Covers |
|-------|--------|
| [`docs/backend.md`](docs/backend.md) | Handlers, DB, auth middleware, AI streaming, S3, logging |
| [`docs/frontend.md`](docs/frontend.md) | React patterns, oRPC client, shadcn/ui components, styling |
| [`docs/mobile.md`](docs/mobile.md) | Expo Router, RN Reusables, Uniwind, auth, forms |
| [`docs/orpc.md`](docs/orpc.md) | Contract definitions, TanStack Query, streaming, error handling |
| [`docs/testing.md`](docs/testing.md) | Test setup, PGLite isolation, mocking, assertion patterns |

## License

MIT
