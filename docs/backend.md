# Backend Development Guide

System prompt for coding agents working on `apps/backend`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Bun (runs TypeScript directly, no build step) |
| Server | Hono (lightweight HTTP framework) |
| RPC | oRPC (contract-first, type-safe procedures) |
| Auth | Better Auth (email/password, session cookies, Expo plugin) |
| Database | Drizzle ORM + PostgreSQL |
| AI | AI SDK with OpenAI-compatible providers |
| Validation | Zod (via oRPC contract) |

## Project Structure

```
apps/backend/
├── drizzle.config.ts            # Drizzle Kit config (schema path, dialect)
├── drizzle/                     # Generated migration SQL files
├── package.json
├── tsconfig.json                # Path alias: @myapp/contract
└── src/
    ├── index.ts                 # Entry: Hono app, CORS, auth routes, oRPC handler
    ├── orpc.ts                  # implement(contract), InitialContext, authMiddleware
    ├── routers/
    │   ├── index.ts             # Root router (assembles all domain routers)
    │   ├── auth.router.ts       # auth.me handler
    │   └── ai.router.ts         # ai.chat streaming handler
    ├── db/
    │   ├── index.ts             # Drizzle client (postgres.js + schema)
    │   ├── schema.ts            # All table definitions (Better Auth + business)
    │   ├── create.ts            # Script: CREATE DATABASE
    │   └── seed.ts              # Script: seed test user
    └── lib/
        ├── auth.ts              # Better Auth config (drizzle adapter, expo plugin)
        └── ai.ts                # AI model factory (OpenAI-compatible)
```

## How the Server Boots

`src/index.ts` creates a Hono app with three layers:

1. **CORS middleware** — reflects request origin for multi-client support (web, mobile, sandbox)
2. **Better Auth routes** (`/api/auth/*`) — handles login, register, logout, session
3. **oRPC handler** (`/rpc/*`) — all contract-defined procedures

```ts
export default {
  hostname: '0.0.0.0',
  port: Number(process.env.PORT ?? 4001),
  fetch: app.fetch,
}
```

Run with: `bun run --hot src/index.ts` (hot reload on file changes)

## Contract-First oRPC

All API types live in `packages/contract/`. The backend **implements** the contract — it never defines its own input/output types.

### The Contract (`packages/contract/src/`)

```ts
// packages/contract/src/index.ts
export const contract = {
  auth: authContract,
  ai: aiContract,
}
```

Each domain contract uses `oc` (oRPC contract builder) with Zod schemas:

```ts
import { oc } from '@orpc/contract'
import { z } from 'zod'

export const authContract = {
  me: oc
    .input(z.object({}))
    .output(UserSchema),
}
```

### The Implementer (`src/orpc.ts`)

```ts
import { implement } from '@orpc/server'
import { contract } from '@myapp/contract'

export const os = implement(contract).$context<InitialContext>()
```

`os` replaces the generic `os` from `@orpc/server`. It is contract-bound and context-typed. All routers use `os.{domain}.{procedure}` to access the implementer.

### InitialContext

Every request gets an `InitialContext` injected by the Hono handler:

```ts
export interface InitialContext {
  headers: Headers
}
```

The Hono handler passes it:

```ts
rpcHandler.handle(c.req.raw, {
  prefix: '/rpc',
  context: { headers: c.req.raw.headers },
})
```

### Auth Middleware

Bridges Better Auth sessions into oRPC context. Use on any procedure that requires authentication:

```ts
import { authMiddleware } from '../orpc'

export const todoRouter = {
  list: os.todo.list
    .use(authMiddleware)
    .handler(async ({ context }) => {
      // context.user and context.session are now available
      const userId = context.user.id
    }),
}
```

After `authMiddleware`, context contains:
- `context.user` — `{ id, name, email, emailVerified, image, createdAt, updatedAt }`
- `context.session` — `{ id, token, expiresAt, userId, ... }`

If no valid session: throws `ORPCError('UNAUTHORIZED')`.

## Adding a New API Procedure

### Step 1: Define the contract

```ts
// packages/contract/src/todo.contract.ts
import { oc } from '@orpc/contract'
import { z } from 'zod'

export const TodoSchema = z.object({
  id: z.string(),
  title: z.string(),
  completed: z.boolean(),
  userId: z.string(),
  createdAt: z.date(),
})

export const todoContract = {
  list: oc
    .input(z.object({}))
    .output(z.array(TodoSchema)),

  create: oc
    .input(z.object({ title: z.string().min(1) }))
    .output(TodoSchema),

  update: oc
    .input(z.object({
      id: z.string(),
      title: z.string().min(1).optional(),
      completed: z.boolean().optional(),
    }))
    .output(TodoSchema),

  delete: oc
    .input(z.object({ id: z.string() }))
    .output(z.object({ success: z.boolean() })),
}
```

### Step 2: Register in root contract

```ts
// packages/contract/src/index.ts
import { todoContract } from './todo.contract'

export const contract = {
  auth: authContract,
  ai: aiContract,
  todo: todoContract,  // add here
}
```

### Step 3: Implement the router

```ts
// apps/backend/src/routers/todo.router.ts
import { eq, and } from 'drizzle-orm'
import { os, authMiddleware } from '../orpc'
import { db } from '../db'
import { todo } from '../db/schema'

export const todoRouter = {
  list: os.todo.list
    .use(authMiddleware)
    .handler(async ({ context }) => {
      return db.select().from(todo)
        .where(eq(todo.userId, context.user.id))
    }),

  create: os.todo.create
    .use(authMiddleware)
    .handler(async ({ input, context }) => {
      const [created] = await db.insert(todo).values({
        title: input.title,
        userId: context.user.id,
      }).returning()
      return created
    }),

  update: os.todo.update
    .use(authMiddleware)
    .handler(async ({ input, context }) => {
      const [updated] = await db.update(todo)
        .set({ title: input.title, completed: input.completed })
        .where(and(eq(todo.id, input.id), eq(todo.userId, context.user.id)))
        .returning()
      if (!updated) throw new ORPCError('NOT_FOUND')
      return updated
    }),

  delete: os.todo.delete
    .use(authMiddleware)
    .handler(async ({ input, context }) => {
      await db.delete(todo)
        .where(and(eq(todo.id, input.id), eq(todo.userId, context.user.id)))
      return { success: true }
    }),
}
```

### Step 4: Register the router

```ts
// apps/backend/src/routers/index.ts
import { todoRouter } from './todo.router'

export const router = os.router({
  auth: authRouter,
  ai: aiRouter,
  todo: todoRouter,  // add here
})
```

That's it — the frontend and mobile clients are automatically typed via the contract.

## Database (Drizzle ORM)

### Schema (`src/db/schema.ts`)

Tables are defined with Drizzle's `pgTable`. The schema currently includes:

**Better Auth tables** (required, do not modify structure):
- `user` — id, name, email, emailVerified, image, createdAt, updatedAt
- `session` — id, expiresAt, token, ipAddress, userAgent, userId
- `account` — id, accountId, providerId, userId, tokens, password
- `verification` — id, identifier, value, expiresAt

**Business tables:**
- `chatMessage` — id, chatId, userId, role, content, createdAt

### Adding a new table

```ts
// Add to src/db/schema.ts
export const todo = pgTable('todo', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  completed: boolean('completed').notNull().default(false),
  userId: text('user_id').notNull().references(() => user.id),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

Then generate and apply migration:

```bash
bun run db:generate   # generates SQL in drizzle/
bun run db:migrate    # applies to database
```

### Querying

```ts
import { db } from '../db'
import { todo } from '../db/schema'
import { eq, and, or, desc, asc } from 'drizzle-orm'

// Select all
const todos = await db.select().from(todo)

// Where clause (single condition)
const mine = await db.select().from(todo).where(eq(todo.userId, userId))

// Multiple conditions — use and()
const active = await db.select().from(todo)
  .where(and(eq(todo.userId, userId), eq(todo.completed, false)))

// OR conditions
const flagged = await db.select().from(todo)
  .where(or(eq(todo.priority, 'high'), eq(todo.overdue, true)))

// Order
const recent = await db.select().from(todo).orderBy(desc(todo.createdAt))

// Insert
const [created] = await db.insert(todo).values({ title, userId }).returning()

// Update
const [updated] = await db.update(todo)
  .set({ completed: true })
  .where(eq(todo.id, id))
  .returning()

// Delete
await db.delete(todo).where(eq(todo.id, id))
```

**Important:** `where()` accepts a single condition. Use `and()` / `or()` to combine multiple.

## Authentication (Better Auth)

### Config (`src/lib/auth.ts`)

```ts
export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  emailAndPassword: { enabled: true },
  plugins: [expo()],
  trustedOrigins: [
    process.env.FRONTEND_URL ?? 'http://localhost:5173',
    process.env.MOBILE_URL ?? 'http://localhost:8082',
    'myapp://',
  ],
})
```

- The `expo()` plugin enables session token exchange for mobile clients via `expo-secure-store`
- `trustedOrigins` must include all client origins (web, mobile, custom scheme)

### Auth routes (handled by Better Auth, NOT oRPC)

Better Auth exposes its own HTTP endpoints on `/api/auth/*`:

- `POST /api/auth/sign-up/email` — register
- `POST /api/auth/sign-in/email` — login
- `POST /api/auth/sign-out` — logout
- `GET /api/auth/get-session` — get current session

These are mounted in `src/index.ts`:

```ts
app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))
```

**Do NOT create oRPC procedures for login/register/logout.** Better Auth handles those. Only use oRPC for business logic that needs the session context (e.g., `auth.me`).

### Using auth in oRPC handlers

```ts
import { os, authMiddleware } from '../orpc'

// Protected route — requires session
os.todo.list.use(authMiddleware).handler(async ({ context }) => {
  const userId = context.user.id  // guaranteed to exist
})

// Public route — no middleware
os.health.check.handler(async () => {
  return { status: 'ok' }
})
```

## AI Integration

### Config (`src/lib/ai.ts`)

Uses AI SDK with a configurable OpenAI-compatible provider:

```ts
import { createOpenAI } from '@ai-sdk/openai'

const openai = createOpenAI({
  apiKey: process.env.AI_API_KEY,
  baseURL: process.env.AI_BASE_URL,
})

export function getModel() {
  return openai(process.env.AI_MODEL ?? 'gpt-4o-mini')
}
```

Works with OpenAI, DeepSeek, Ollama, or any OpenAI-format API.

### Streaming pattern

oRPC streams responses via `EventIterator`. The existing `ai.chat` handler shows the pattern:

```ts
import { streamText, convertToModelMessages } from 'ai'
import { streamToEventIterator } from '@orpc/server'

os.ai.chat.use(authMiddleware).handler(async ({ input }) => {
  const result = streamText({
    model: getModel(),
    system: 'You are a helpful assistant.',
    messages: await convertToModelMessages(input.messages),
  })
  return streamToEventIterator(result.toUIMessageStream())
})
```

The contract for streaming procedures omits `.output()` — the EventIterator type is inferred.

## Error Handling

### oRPC errors

Throw `ORPCError` with standard HTTP-like codes:

```ts
import { ORPCError } from '@orpc/server'

throw new ORPCError('NOT_FOUND')
throw new ORPCError('UNAUTHORIZED')
throw new ORPCError('FORBIDDEN')
throw new ORPCError('BAD_REQUEST', { message: 'Title is required' })
throw new ORPCError('INTERNAL_SERVER_ERROR')
```

### Global error logging

The oRPC handler has a global error interceptor in `src/index.ts`:

```ts
const rpcHandler = new RPCHandler(router, {
  interceptors: [
    onError((error) => {
      console.error(error)
    }),
  ],
})
```

### Input validation

Zod validation happens automatically via the contract. If a client sends invalid input, oRPC returns a `BAD_REQUEST` error with Zod's error details. You do NOT need manual validation in handlers.

## Environment Variables

Configured in `apps/backend/.env` (copy from root `.env.example`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | — | Session encryption secret |
| `BETTER_AUTH_URL` | Yes | — | Backend URL (e.g. `http://localhost:4001`) |
| `PORT` | No | `4001` | Server port |
| `FRONTEND_URL` | No | `http://localhost:5173` | Web client origin (CORS + trusted origins) |
| `MOBILE_URL` | No | `http://localhost:8082` | Mobile web client origin |
| `AI_API_KEY` | For AI | — | API key for OpenAI-compatible provider |
| `AI_BASE_URL` | For AI | — | Provider base URL |
| `AI_MODEL` | No | `gpt-4o-mini` | Model identifier |

## Testing oRPC Endpoints

The `/rpc` handler expects input wrapped in `{"json": {...}}`:

```bash
# Public endpoint
curl -X POST http://localhost:4001/rpc/health/check \
  -H "Content-Type: application/json" \
  -d '{"json": {}}'

# Protected endpoint (returns UNAUTHORIZED without session)
curl -X POST http://localhost:4001/rpc/auth/me \
  -H "Content-Type: application/json" \
  -d '{"json": {}}'

# With auth cookie
curl -X POST http://localhost:4001/rpc/todo/list \
  -H "Content-Type: application/json" \
  -b "better-auth.session_token=<token>" \
  -d '{"json": {}}'
```

## Key Patterns Summary

| Pattern | How |
|---------|-----|
| Define API types | Contract in `packages/contract/src/` with `oc` + Zod |
| Implement handler | `os.{domain}.{proc}.use(authMiddleware).handler(...)` |
| Access user | `context.user.id` after `authMiddleware` |
| Query database | `db.select().from(table).where(eq(...))` |
| Throw errors | `throw new ORPCError('NOT_FOUND')` |
| Stream responses | `streamToEventIterator(result.toUIMessageStream())` |
| Add table | Define in `schema.ts`, run `db:generate` + `db:migrate` |
| Auth routes | Handled by Better Auth on `/api/auth/*`, not oRPC |
