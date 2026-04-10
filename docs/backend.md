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
        ├── ai.ts                # AI model factory (OpenAI-compatible)
        ├── logger.ts            # Pino logger (pretty dev, JSON prod)
        └── s3.ts                # S3 client (MinIO/AWS/R2)
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

### Optional Auth Middleware

Use when a procedure works for both authenticated and anonymous users (e.g., public feed that shows like-status for logged-in users):

```ts
import { optionalAuthMiddleware } from '../orpc'

export const postRouter = {
  list: os.post.list
    .use(optionalAuthMiddleware)
    .handler(async ({ context }) => {
      const userId = context.user?.id  // undefined if not logged in
      // ... return posts, conditionally include like status
    }),
}
```

After `optionalAuthMiddleware`, context contains:
- `context.user` — user object if authenticated, `undefined` if anonymous
- `context.session` — session object if authenticated, `undefined` if anonymous

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
- `file` — id, userId, fileKey, filename, contentType, size, status, createdAt

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

### Advanced Query Patterns

**Dynamic conditions array:**

```ts
import type { SQL } from 'drizzle-orm'
import { eq, and, ilike, gte } from 'drizzle-orm'

// Build conditions at runtime, then apply with and()
const conditions: SQL[] = []
if (input.userId) conditions.push(eq(todo.userId, input.userId))
if (input.search) conditions.push(ilike(todo.title, `%${input.search}%`))
if (input.since) conditions.push(gte(todo.createdAt, input.since))

const results = await db.select().from(todo)
  .where(conditions.length > 0 ? and(...conditions) : undefined)
```

**Batch lookup with `inArray`:**

```ts
import { inArray } from 'drizzle-orm'

// Never use sql`id = ANY(${ids})` — use inArray() instead
const users = await db.select().from(user).where(inArray(user.id, userIds))
```

**Increment / decrement a counter:**

```ts
import { sql } from 'drizzle-orm'

// Atomic increment — never read-then-write
await db.update(post)
  .set({ commentsCount: sql`${post.commentsCount} + 1` })
  .where(eq(post.id, postId))
```



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

## Logging (Pino)

### Setup (`src/lib/logger.ts`)

```ts
import { logger } from './lib/logger'
```

- **Dev:** Pretty-printed colored logs via `pino-pretty`
- **Production:** Structured JSON (machine-parseable, compatible with Datadog/Loki/CloudWatch)
- **Level:** Controlled by `LOG_LEVEL` env var (default: `info`)

### HTTP Request Logging

All requests are automatically logged by the Hono middleware in `src/index.ts`:

```
INFO  request                { method: "POST", path: "/rpc/auth/me", status: 200, ms: 12 }
WARN  request client error   { method: "POST", path: "/rpc/todo/list", status: 401, ms: 3 }
ERROR request error          { method: "POST", path: "/rpc/ai/chat", status: 500, ms: 45 }
```

- `status >= 500` → `logger.error`
- `status >= 400` → `logger.warn`
- otherwise → `logger.info`

### oRPC Error Logging

All unhandled errors in oRPC handlers are captured by the global `onError` interceptor and logged as:

```
ERROR rpc error  { err: { message: "...", stack: "..." } }
```

### Using the Logger in Handlers

```ts
import { logger } from '../lib/logger'

export const todoRouter = {
  create: os.todo.create
    .use(authMiddleware)
    .handler(async ({ input, context }) => {
      logger.info({ userId: context.user.id, title: input.title }, 'creating todo')

      const [created] = await db.insert(todo).values({ ... }).returning()

      logger.info({ todoId: created.id }, 'todo created')
      return created
    }),
}
```

### Logging Conventions

| Level | When to Use | Example |
|-------|-------------|---------|
| `error` | Unexpected failures, caught exceptions | `logger.error({ err }, 's3 upload failed')` |
| `warn` | Expected but notable issues | `logger.warn({ fileKey }, 'file not found in S3')` |
| `info` | Key business events, request lifecycle | `logger.info({ userId }, 'user logged in')` |
| `debug` | Detailed troubleshooting data | `logger.debug({ query }, 'db query')` |

**Rules:**
1. Always pass structured data as first arg, message as second: `logger.info({ key: value }, 'message')`
2. Use `{ err }` key for Error objects — Pino serializes stack traces automatically
3. Never log sensitive data (passwords, tokens, full request bodies)
4. Use `debug` for data you only need when troubleshooting — it's hidden in production by default

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

## Testing

Uses `bun test` with PGLite in-memory databases. Each test file gets a fresh DB instance.

### Running tests

```bash
bun run test              # all backend tests
bun run test:backend      # same (from root)
cd apps/backend && bun test --watch  # watch mode
```

### Writing a handler test

```ts
import { afterAll, describe, expect, it } from 'bun:test'
import { createTestEnv } from '../test/setup'

const env = await createTestEnv()
afterAll(() => env.cleanup())

describe('todo.list', () => {
  it('returns empty list for new user', async () => {
    const result = await env.client.todo.list({})
    expect(result).toEqual([])
  })
})
```

`createTestEnv()` provides:
- `env.client` — typed oRPC client (runs full middleware chain in-process)
- `env.db` — Drizzle instance for seeding test data
- `env.testUser` — pre-inserted test user
- `env.testSession` — mock session for the test user
- `env.cleanup()` — close PGLite (call in `afterAll`)

### Test-specific seed data

Insert directly with `env.db` after `createTestEnv()`:

```ts
const env = await createTestEnv()
await env.db.insert(todo).values({
  title: 'Test todo',
  userId: env.testUser.id,
})
```

### Mocking external services

Mock before `createTestEnv()` (which dynamic-imports routers):

```ts
import { mock } from 'bun:test'

mock.module('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: async () => 'https://mock-url',
}))

import { createTestEnv } from '../test/setup'
const env = await createTestEnv()
```

### Seed architecture

| File | Purpose | When |
|------|---------|------|
| `src/db/seed-base.ts` | Base enums/configs | Auto — every test + dev seed |
| `src/db/seed.ts` | Dev user via Better Auth | Manual — `bun run db:seed` |
| Test file | Test-specific data | Manual — each test's responsibility |

## Environment Variables

Configured in `apps/backend/.env` (copy from root `.env.example`):

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | — | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Yes | — | Session encryption secret |
| `BETTER_AUTH_URL` | Yes | — | Backend URL (e.g. `http://localhost:4001`) |
| `LOG_LEVEL` | No | `info` | Pino log level (`debug`, `info`, `warn`, `error`) |
| `PORT` | No | `4001` | Server port |
| `FRONTEND_URL` | No | `http://localhost:5173` | Web client origin (CORS + trusted origins) |
| `MOBILE_URL` | No | `http://localhost:8082` | Mobile web client origin |
| `AI_API_KEY` | For AI | — | API key for OpenAI-compatible provider |
| `AI_BASE_URL` | For AI | — | Provider base URL |
| `AI_MODEL` | No | `gpt-4o-mini` | Model identifier |
| `S3_ENDPOINT` | No | `http://localhost:9000` | S3-compatible storage endpoint |
| `S3_REGION` | No | `us-east-1` | S3 region |
| `S3_ACCESS_KEY` | No | `minioadmin` | S3 access key |
| `S3_SECRET_KEY` | No | `minioadmin` | S3 secret key |
| `S3_BUCKET` | No | `uploads` | S3 bucket name |

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
| Log events | `logger.info({ key: value }, 'message')` |
| Stream responses | `streamToEventIterator(result.toUIMessageStream())` |
| Add table | Define in `schema.ts`, run `db:generate` + `db:migrate` |
| Auth routes | Handled by Better Auth on `/api/auth/*`, not oRPC |

## File Storage (S3 Presigned URLs)

### Architecture

Client-side uploads using S3 presigned URLs. Backend only generates URLs and tracks metadata.

```
Client → requestUploadUrl → Backend (signs URL) → Client
Client → PUT file → S3 (direct upload)
Client → confirmUpload → Backend (verifies + saves metadata)
Client → getDownloadUrl → Backend (signs URL) → Client
```

### Environment Variables

| Variable | Default (dev) | Description |
|----------|---------------|-------------|
| `S3_ENDPOINT` | `http://localhost:9000` | S3-compatible endpoint |
| `S3_REGION` | `us-east-1` | Region |
| `S3_ACCESS_KEY` | `minioadmin` | Access key |
| `S3_SECRET_KEY` | `minioadmin` | Secret key |
| `S3_BUCKET` | `uploads` | Bucket name |

### Local Development

```bash
docker compose up -d    # Start MinIO
# Console: http://localhost:9001 (minioadmin/minioadmin)
# Create bucket "uploads" via console on first run
```

### Contract Procedures

| Procedure | Input | Output |
|-----------|-------|--------|
| `storage.requestUploadUrl` | `{ filename, contentType }` | `{ uploadUrl, fileKey }` |
| `storage.confirmUpload` | `{ fileKey }` | `FileSchema` (id, fileKey, filename, contentType, url, createdAt) |
| `storage.getDownloadUrl` | `{ fileKey }` | `{ downloadUrl }` |

### Client Usage

```tsx
// Web (apps/frontend)
import { useUpload } from '@/hooks/use-upload'
const { upload, isUploading, progress } = useUpload()
const result = await upload(file) // File object from <input type="file">

// Mobile (apps/mobile)
import { useUpload } from '@/hooks/use-upload'
const { upload, isUploading, progress } = useUpload()
const result = await upload(imagePickerAsset) // { uri, fileName, mimeType }
```

### Production Config

Replace env vars to point at any S3-compatible service:
- **AWS S3**: Omit `S3_ENDPOINT` (uses AWS default), set `S3_REGION`/`S3_ACCESS_KEY`/`S3_SECRET_KEY`
- **Cloudflare R2**: Set `S3_ENDPOINT` to R2 endpoint URL
- **Aliyun OSS**: Set `S3_ENDPOINT` to OSS endpoint (forcePathStyle already enabled)
