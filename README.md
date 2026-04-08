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
- **Auth included** — Better Auth with email/password. Expo SecureStore sessions on mobile. Ready to extend.
- **AI + Storage ready** — Streaming AI chat via AI SDK. S3 presigned uploads (MinIO for dev, AWS/R2/OSS for prod).
- **AI coding ready** — `CLAUDE.md` + per-area docs. Coding agents know the stack on first load.

## Stack

| Layer | Technology |
|-------|-----------|
| Monorepo | Bun workspaces |
| Contract | oRPC + Zod |
| Backend | Hono + Bun |
| Auth | Better Auth |
| Database | Drizzle ORM + PostgreSQL |
| AI | AI SDK (OpenAI-compatible) |
| Storage | S3 presigned URLs |
| Frontend | React 19 + Vite + Tailwind v4 + shadcn/ui |
| Mobile | Expo + React Native + Uniwind + RN Reusables |
| Data Fetching | TanStack Query + oRPC client |

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
# Edit apps/backend/.env — set DATABASE_URL and BETTER_AUTH_SECRET

# 3. Set up database
bun run db:create
bun run db:migrate

# 4. Start dev servers
bun run dev
```

Or click **"Use this template"** on GitHub to create your repo from the web.

- Backend: `http://localhost:4001`
- Frontend: `http://localhost:4000`

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start backend + frontend |
| `bun run dev:backend` | Backend only |
| `bun run dev:frontend` | Frontend only |
| `bun run dev:mobile` | Expo mobile dev server |
| `bun run db:create` | Create PostgreSQL database (first time) |
| `bun run db:generate` | Generate migrations after schema change |
| `bun run db:migrate` | Apply migrations |
| `bun run db:seed` | Seed test user (test@example.com / password123) |
| `bun run lint` | Check with Biome |
| `bun run lint:fix` | Auto-fix lint + format |

## Documentation

- `docs/backend.md` — Backend patterns, DB, auth, streaming, storage
- `docs/frontend.md` — Frontend patterns, oRPC client, components, styling
- `docs/mobile.md` — Mobile setup, RN Reusables, Uniwind
- `docs/orpc.md` — oRPC usage reference
