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

## Architecture Quick Reference

Do NOT explore the project structure with Glob/Grep. The complete structure is documented below. Read the relevant guide for the area you're working in, then start coding.

### Backend (`apps/backend/src/`)

```
├── index.ts              — Hono entry: CORS, auth routes (/api/auth/*), oRPC handler (/rpc/*)
├── orpc.ts               — implement(contract), InitialContext, authMiddleware, optionalAuthMiddleware
├── routers/
│   ├── index.ts          — Root router (assembles all domain routers)
│   ├── auth.router.ts    — auth.me handler
│   └── ai.router.ts      — ai.chat streaming handler
├── db/
│   ├── index.ts          — Drizzle client (postgres.js + schema)
│   ├── schema.ts         — All table definitions (Better Auth + business)
│   ├── seed-base.ts      — Base seed data (used by tests and dev seed)
│   └── seed.ts           — Dev seed script
├── lib/
│   ├── auth.ts           — Better Auth config (drizzle adapter, expo plugin)
│   ├── ai.ts             — AI model factory (OpenAI-compatible)
│   ├── env.ts            — Env var validation (Zod schema)
│   ├── logger.ts         — Pino logger (pretty dev, JSON prod)
│   └── s3.ts             — S3 client (MinIO/AWS/R2)
└── test/
    ├── setup.ts          — createTestEnv() — PGLite + typed oRPC client
    └── fixtures.ts       — createTestUser(), createTestSession()
```

### Frontend (`apps/frontend/src/`)

```
├── main.tsx              — ReactDOM root, QueryClient, BrowserRouter, Toaster
├── app.tsx               — Route definitions
├── app.css               — Tailwind v4 + OKLCH theme variables
├── layouts/
│   └── root.layout.tsx   — Header nav + <Outlet />
├── pages/                — Route pages (thin wrappers around blocks)
├── components/
│   ├── ui/               — shadcn/ui primitives (MUST use — see convention 9)
│   ├── block/            — Page-level blocks (login-form, signup-form)
│   ├── biz/              — Business components (chat)
│   └── shared/           — Shared reusable components
├── hooks/                — Custom hooks (use-upload, etc.)
└── lib/
    ├── orpc.ts           — oRPC client + TanStack Query utils
    ├── auth-client.ts    — Better Auth browser client (throwOnError wrappers)
    ├── logger.ts         — Pino browser logger
    └── utils.ts          — cn() helper (clsx + tailwind-merge)
```

### Mobile (`apps/mobile/src/`)

```
├── global.css            — Uniwind Tailwind v4 + OKLCH theme variables
├── app/                  — Expo Router file routes
│   ├── _layout.tsx       — Root: ThemeProvider + QueryProvider + SheetProvider + Toaster + PortalHost
│   ├── index.tsx         — Home screen (auth guard)
│   └── auth/             — Auth group (login, register)
├── components/
│   ├── ui/               — RN Reusables components (MUST use — see convention 9)
│   └── block/            — Block components (sign-in-form, sign-up-form, user-menu)
├── hooks/
│   └── use-upload.ts     — File upload hook (presigned URL + S3)
└── lib/
    ├── orpc.ts           — oRPC client (cookie-based auth via getCookie())
    ├── auth-client.ts    — Better Auth Expo client (SecureStore sessions)
    ├── theme.ts          — Navigation theme colors
    └── utils.ts          — cn() helper (clsx + tailwind-merge)
```

### Contract (`packages/contract/src/`)

```
├── index.ts              — Root contract { auth, ai, storage }
├── auth.contract.ts      — Auth procedures (me)
├── ai.contract.ts        — AI procedures (chat streaming)
└── storage.contract.ts   — File storage (requestUploadUrl, confirmUpload, getDownloadUrl)
```

## Development Guides

Read the relevant guide BEFORE writing any code in that area. The guides contain implementation patterns, code examples, and component APIs that you MUST follow.

| Area | Guide | When to read |
|------|-------|-------------|
| Backend | @docs/backend.md | Implementing handlers, adding DB tables, auth, AI, tests |
| Frontend | @docs/frontend.md | Any UI work in `apps/frontend/` — includes full UI component list with imports |
| Mobile | @docs/mobile.md | Any UI work in `apps/mobile/` — includes full UI component list with imports |
| oRPC | @docs/orpc.md | Client setup, streaming, error handling, TanStack Query |
| Testing | @docs/testing.md | Writing or modifying tests |

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

9. **Use pre-installed UI components. Do NOT hand-write equivalents.** Frontend uses shadcn/ui, mobile uses React Native Reusables — both in `@/components/ui/`. Check the installed component list in the relevant guide (@docs/frontend.md or @docs/mobile.md) BEFORE writing any UI. If a component is not installed, add it via CLI (`bunx shadcn@latest add <name>` for frontend, `npx @react-native-reusables/cli@latest add <name> --yes` for mobile). Never hand-write a Card, Button, Dialog, Input, Select, etc. when the library provides one.

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
