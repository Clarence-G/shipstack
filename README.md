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
│   ├── frontend/            # React SPA (port 5173)
│   │   └── src/
│   │       ├── lib/         # oRPC client, auth client, utils
│   │       ├── pages/       # Route pages (home, login, register)
│   │       ├── layouts/     # Root layout with nav
│   │       └── components/
│   │           ├── ui/      # shadcn/ui components
│   │           ├── biz/     # Business components (chat)
│   │           └── shared/  # Shared components
│   └── mobile/              # React Native app (Expo, port 8081)
│       └── src/
│           ├── app/          # Expo Router file routes
│           ├── lib/          # oRPC client, auth client
│           └── global.css    # Tailwind + Uniwind entry
├── package.json             # Workspace scripts
├── tsconfig.base.json       # Shared TypeScript config
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

### Setup

```bash
# 1. Install dependencies
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

# 6. Start development
bun run dev
```

This starts:
- Backend at `http://localhost:3001`
- Frontend at `http://localhost:5173` (strict port — errors if occupied, proxies `/api` and `/rpc` to backend)

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

## Architecture Decisions

### Contract-First oRPC

All API types live in `packages/contract`. The backend **implements** the contract, the frontend **consumes** it. Neither imports from the other.

> **Testing oRPC endpoints with curl:** The `/rpc` handler expects input wrapped in `{"json": {...}}`, not plain `{"input": {...}}`.
> ```bash
> # Without session (returns UNAUTHORIZED for protected routes)
> curl -X POST http://localhost:3001/rpc/todo/list \
>   -H "Content-Type: application/json" \
>   -d '{"json": {}}'
>
> # With auth cookie
> curl -X POST http://localhost:3001/rpc/todo/list \
>   -H "Content-Type: application/json" \
>   -b "session_token=<token>" \
>   -d '{"json": {}}'
> ```

### Authentication Split

- **Better Auth** handles login/register/logout via its own HTTP endpoints (`/api/auth/*`) and client SDK (`signIn.email()`, `signUp.email()`, `signOut()`).
- **oRPC** only exposes `auth.me` for fetching the current user in a type-safe way.
- Auth middleware bridges Better Auth sessions into oRPC context for protected procedures.

### AI Integration

The backend uses AI SDK with a configurable OpenAI-compatible provider. Set `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` in `.env` to point to OpenAI, DeepSeek, Ollama, or any compatible endpoint. The `ai.chat` procedure streams responses via oRPC's EventIterator, consumed on the frontend with `useChat` from `@ai-sdk/react`.

### Frontend oRPC Usage

The frontend client lives in `src/lib/orpc.ts` and exposes two objects:

```ts
import { client, orpc } from '@/lib/orpc'
```

**`client` — direct async call, use anywhere:**
```ts
// One-shot fetch (no caching)
const user = await client.auth.me({})
```

**`orpc` — TanStack Query integration, use inside React components:**
```ts
import { useQuery, useMutation } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

// Query (GET-style, with caching + refetch)
const { data, isPending } = useQuery(orpc.auth.me.queryOptions({ input: {} }))

// Mutation (POST-style, triggers on user action)
const { mutate } = useMutation(orpc.todo.create.mutationOptions())
mutate({ title: 'Buy milk' })
```

**When to use which:**

| Scenario | Use |
|----------|-----|
| Component needs data + loading state | `useQuery(orpc.xxx.queryOptions(...))` |
| User action triggers a write | `useMutation(orpc.xxx.mutationOptions())` |
| Outside React (loaders, utils) | `await client.xxx({})` |

**Protected queries** — gate on session to avoid UNAUTHORIZED errors being cached:
```ts
const { data: session } = useSession()
const { data } = useQuery({
  ...orpc.todo.list.queryOptions({ input: {} }),
  enabled: !!session,  // only fetch when logged in
})
```

**Cache invalidation & direct updates** — `.key()` and `.queryKey()` serve different purposes:

```ts
const queryClient = useQueryClient()

// .key() = partial match — use for invalidateQueries (bulk invalidation)
queryClient.invalidateQueries({ queryKey: orpc.todo.key() })           // all todo queries
queryClient.invalidateQueries({ queryKey: orpc.todo.list.key() })      // all todo.list queries

// .queryKey() = exact match — use for setQueryData (direct cache update)
queryClient.setQueryData(
  orpc.todo.find.queryKey({ input: { id: '123' } }),
  updatedTodo,
)
```

| Operation | Use | Why |
|-----------|-----|-----|
| `invalidateQueries` | `.key()` | Partial match — invalidates all variants of a query |
| `setQueryData` / `getQueryData` | `.queryKey()` | Exact match — must hit the precise cache entry |
| `resetQueries` / `removeQueries` | `.key()` | Partial match — bulk operations |

### TanStack Query + oRPC Pitfalls

#### Mutations don't auto-invalidate queries

After a successful mutation, related queries are NOT refetched. You must invalidate manually:

```ts
const mutation = useMutation(orpc.todo.create.mutationOptions({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: orpc.todo.key() })
  },
}))
```

Put invalidation in the **hook-level** `onSuccess`, not in `mutate()` callback — the latter won't fire if the component unmounts before the mutation completes.

#### `skipToken` vs `enabled` — don't combine them

oRPC exposes `skipToken` to conditionally disable a query when input isn't ready. It internally sets `enabled: false`. Combining both causes errors:

```ts
// ✅ Correct — use skipToken alone
useQuery(orpc.user.find.queryOptions({
  input: userId ? { id: userId } : skipToken,
}))

// ❌ Wrong — skipToken + enabled conflict
useQuery(orpc.user.find.queryOptions({
  input: userId ? { id: userId } : skipToken,
  enabled: !!userId,  // conflicts with skipToken
}))
```

#### Client context is excluded from query keys

oRPC does NOT include the `context` parameter in generated query keys. Two queries with the same input but different `context` share a cache entry:

```ts
// These two share the same query key — only one request fires
orpc.data.queryOptions({ input: { id: 1 }, context: { cache: true } })
orpc.data.queryOptions({ input: { id: 1 }, context: { cache: false } })

// Fix: manually override queryKey if context affects the response
```

#### Type-safe error handling requires `isDefinedError`

oRPC errors are typed broadly as `Error`. To access `.code` and `.data` from contract-defined errors, narrow with `isDefinedError`:

```ts
import { isDefinedError } from '@orpc/client'

onError: (error) => {
  if (isDefinedError(error)) {
    // error.code and error.data are now fully typed
  }
}
```

#### Global `onError` toast may duplicate with local handlers

The scaffold sets a global `mutations.onError` toast. If you also add `onError` on a specific mutation, **both fire**. Handle known errors locally and let unknown errors fall through to the global toast.

#### Don't copy query data into `useState`

```ts
// ❌ Copies once, never updates from background refetches
const { data } = useQuery(orpc.user.me.queryOptions({}))
const [user, setUser] = useState(data)

// ✅ Use data directly from the query
const { data: user } = useQuery(orpc.user.me.queryOptions({}))
```

#### `staleTime` and `refetchOnWindowFocus`

The scaffold sets `staleTime: 60s` globally. During that window, switching browser tabs won't trigger refetches. After 60s, `refetchOnWindowFocus` (enabled by default) fires on every tab switch. Override per-query if needed:

```ts
// Near-realtime data
useQuery(orpc.messages.queryOptions({ staleTime: 0 }))

// Rarely changes
useQuery(orpc.settings.queryOptions({ staleTime: 5 * 60 * 1000 }))
```

### Error Handling

All errors are unified to `try/catch` — both oRPC and Better Auth throw on failure:

- **Better Auth** (`signIn.email`, `signUp.email`, `signOut`): wrapped in `throwOnError` in `src/lib/auth-client.ts`, converting `{ data, error }` returns into thrown `Error`
- **oRPC**: throws `ORPCError` natively
- **Global fallback**: `QueryClient` `mutations.onError` displays a toast via [sonner](https://sonner.emilkowal.dev/) for any unhandled mutation error

```ts
// Both use the same pattern in page code:
try {
  await signIn.email({ email, password })   // Better Auth — throws on failure
  await client.todo.create({ title })       // oRPC — throws on failure
} catch (err) {
  // handle error
}
```

### shadcn/ui

The frontend uses [shadcn/ui](https://ui.shadcn.com) for UI components. Config is in `apps/frontend/components.json`.

**Pre-installed components** (`src/components/ui/`):
- `button` — Button with variants (default, outline, secondary, ghost, destructive, link)
- `input` — Form input with aria-invalid states
- `card` — Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- `sonner` — Toast notifications (used by global error handler)

**Adding more components:**
```bash
cd apps/frontend
bunx shadcn@latest add dialog table dropdown-menu
```

**Using in page code:**
```ts
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
```

**Showing toasts manually:**
```ts
import { toast } from 'sonner'

toast.success('Saved!')
toast.error('Something went wrong')
toast.info('FYI...')
```

**Button as link — use `asChild`:**
```tsx
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

<Button asChild variant="outline">
  <Link to="/products">Browse Products</Link>
</Button>
```

`asChild` merges Button's styles onto the child element (via Radix Slot). Use it whenever you need a `<Link>`, `<a>`, or other element to look like a button.

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

**Drizzle query tips:**

`where()` accepts a single condition. Use `and()` / `or()` from `drizzle-orm` to combine multiple conditions:

```ts
import { eq, and, or } from 'drizzle-orm'

// Multiple conditions — wrap in and()
db.select().from(products)
  .where(and(eq(products.categoryId, catId), eq(products.active, true)))

// OR conditions
db.select().from(products)
  .where(or(eq(products.status, 'sale'), eq(products.featured, true)))
```
