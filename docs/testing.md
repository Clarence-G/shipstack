# Testing Guide

System prompt for coding agents writing and running tests in `apps/backend`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Test Runner | `bun test` (Jest-compatible API: `describe`, `it`, `expect`) |
| Database | PGLite in-memory (per-test-file isolation) |
| RPC Client | `createRouterClient` from `@orpc/server` (in-process, no HTTP) |
| Mocking | `mock.module()` from `bun:test` (module-level replacement) |
| Assertions | Bun built-in `expect` (Jest-compatible matchers) |

## Running Tests

```bash
# From project root
bun run test              # all backend tests
bun run test:backend      # same, explicit

# From apps/backend/
bun test                  # all tests
bun test --watch          # re-run on file change
bun test src/routers/auth.router.test.ts   # single file
```

## Project Structure

```
apps/backend/
├── bunfig.toml                       # [test] root = "./src"
├── drizzle/                          # Migration SQL files (applied in each test)
└── src/
    ├── test/
    │   ├── setup.ts                  # createTestEnv() — one-line test bootstrap
    │   └── fixtures.ts               # createTestUser(), createTestSession()
    ├── db/
    │   ├── seed-base.ts              # seedBase(db) — base data for all tests
    │   └── schema.ts                 # Table definitions (read this to know column names)
    └── routers/
        ├── auth.router.ts
        ├── auth.router.test.ts       # co-located test
        ├── storage.router.ts
        └── storage.router.test.ts
```

Test files live next to the source file they test: `foo.router.ts` → `foo.router.test.ts`.

## Architecture

```
bun test (runs each .test.ts file in parallel)
  └── per file:
      createTestEnv()
        ├── new PGlite()            ← in-memory, no disk
        ├── drizzle migrate          ← creates all tables
        ├── seedBase(db)             ← base enums/configs
        ├── insert test user         ← via Drizzle (not Better Auth)
        ├── mock.module('../db')     ← swap DB singleton
        ├── mock.module('../lib/auth')  ← fake getSession → test user
        ├── mock.module('../lib/env')   ← fake env vars
        └── createRouterClient(router)  ← typed oRPC client, in-process
```

Each test file gets its own PGLite instance. Files run in parallel. No shared state, no interference.

## Writing a Test — Step by Step

### 1. Create the test file

Co-locate with the router: `src/routers/<domain>.router.test.ts`.

### 2. Minimal template

```ts
import { afterAll, describe, expect, it } from 'bun:test'
import { createTestEnv } from '../test/setup'

const env = await createTestEnv()
afterAll(() => env.cleanup())

describe('<domain>.<procedure>', () => {
  it('does something', async () => {
    const result = await env.client.<domain>.<procedure>({ /* input */ })
    expect(result.field).toBe('expected')
  })
})
```

### 3. What `createTestEnv()` returns

| Property | Type | Description |
|----------|------|-------------|
| `client` | Typed oRPC client | Call any procedure: `client.auth.me({})`, `client.storage.requestUploadUrl({...})` |
| `db` | Drizzle instance | Insert/query/delete test data: `db.insert(table).values({...})` |
| `testUser` | `{ id, name, email, ... }` | Pre-inserted user in DB, matches `user` table schema |
| `testSession` | `{ id, token, userId, ... }` | Mock session returned by auth middleware |
| `cleanup` | `() => void` | Closes PGLite. Always call in `afterAll`. |

The `client` runs through the **full middleware chain** (including `authMiddleware`) — it's not a mock. The auth middleware calls `auth.api.getSession()`, which is mocked to return `testUser` + `testSession`.

**Limitation:** The auth mock always returns a valid session. You cannot test `UNAUTHORIZED` flows with the current setup. If needed in the future, make the mock configurable.

### 4. Run it

```bash
cd apps/backend && bun test src/routers/<domain>.router.test.ts
```

## createTestEnv Options

```ts
const env = await createTestEnv({
  // Override test user fields
  userOverrides: { name: 'Admin', email: 'admin@test.com' },
})
```

## Seeding Test Data

### Schema reference

Know the column names before inserting. Tables are defined in `src/db/schema.ts`:

| Table | Required columns (no default) | Has default |
|-------|------|-------------|
| `user` | `id`, `name`, `email` | `emailVerified`=false, `createdAt`, `updatedAt` |
| `session` | `id`, `expiresAt`, `token`, `userId` | `createdAt`, `updatedAt` |
| `chatMessage` | `chatId`, `userId`, `role`, `content` | `id`=UUID, `createdAt` |
| `file` | `userId`, `fileKey`, `filename`, `contentType` | `id`=UUID, `status`='pending', `createdAt` |

`createTestEnv()` automatically calls `seedBase(db)` to insert base data required by the backend (roles, enums, configs), and inserts one test user. Your test file only needs to insert its own test-specific data.

### Insert pattern

```ts
import { chatMessage, file } from '../db/schema'

// Single row
await env.db.insert(file).values({
  userId: env.testUser.id,
  fileKey: 'user-1/photo.jpg',
  filename: 'photo.jpg',
  contentType: 'image/jpeg',
  status: 'confirmed',
})

// Multiple rows
await env.db.insert(chatMessage).values([
  { chatId: 'chat-1', userId: env.testUser.id, role: 'user', content: 'Hello' },
  { chatId: 'chat-1', userId: env.testUser.id, role: 'assistant', content: 'Hi!' },
])
```

### Query for assertions

```ts
import { eq } from 'drizzle-orm'
import { file } from '../db/schema'

const records = await env.db.select().from(file).where(eq(file.userId, env.testUser.id))
expect(records).toHaveLength(1)
expect(records[0].status).toBe('confirmed')
```

## Mocking External Services

`createTestEnv()` auto-mocks: **db**, **auth**, **env**. Other services (S3, AI, etc.) must be mocked by the test file.

### Rule: mock BEFORE `createTestEnv()`

`createTestEnv()` dynamically imports the router. The router imports S3/AI modules at the top level. If your mock isn't registered before the import, the real module loads instead.

```ts
import { afterAll, describe, expect, it, mock } from 'bun:test'

// 1. Mock external services FIRST
mock.module('@aws-sdk/client-s3', () => ({
  S3Client: class {},
  PutObjectCommand: class {},
  HeadObjectCommand: class {},
  GetObjectCommand: class {},
}))

mock.module('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: async () => 'https://mock-s3.example.com/signed-url',
}))

mock.module('../lib/s3', () => ({
  s3: { send: async () => ({ ContentLength: 1024 }) },
  S3_BUCKET: 'test-bucket',
}))

// 2. THEN import setup and schema
import { createTestEnv } from '../test/setup'
import { file } from '../db/schema'

// 3. THEN create env
const env = await createTestEnv()
afterAll(() => env.cleanup())
```

### AI SDK mocking (if needed)

```ts
mock.module('../lib/ai', () => ({
  getModel: () => ({
    // Minimal AI model mock
  }),
}))

mock.module('ai', () => ({
  streamText: () => ({
    toUIMessageStream: () => new ReadableStream(),
  }),
  convertToModelMessages: async (msgs: unknown[]) => msgs,
}))
```

## Assertion Patterns

### Basic value checks

```ts
expect(result.id).toBe(env.testUser.id)
expect(result.name).toBe('Test User')
expect(result.image).toBeNull()
expect(result.createdAt).toBeInstanceOf(Date)
```

### Array/object

```ts
expect(result).toEqual([])
expect(result).toHaveLength(3)
expect(result).toContainEqual(expect.objectContaining({ id: 'abc' }))
```

### Error cases

```ts
// Procedure throws (ORPCError wraps into a rejection)
await expect(
  env.client.storage.getDownloadUrl({ fileKey: 'nonexistent' })
).rejects.toThrow()

// Specific error message
await expect(
  env.client.storage.getDownloadUrl({ fileKey: 'nonexistent' })
).rejects.toThrow(/NOT_FOUND/)
```

### DB state verification

```ts
// Verify a side effect in the database
const records = await env.db.select().from(file)
expect(records).toHaveLength(1)
expect(records[0].status).toBe('pending')
```

## Complete Example — New Router Test

Say you added a `todo` router with `list`, `create`, `delete` procedures:

```ts
// src/routers/todo.router.test.ts
import { afterAll, describe, expect, it } from 'bun:test'
import { eq } from 'drizzle-orm'
import { todo } from '../db/schema'
import { createTestEnv } from '../test/setup'

const env = await createTestEnv()
afterAll(() => env.cleanup())

describe('todo.list', () => {
  it('returns empty list for new user', async () => {
    const result = await env.client.todo.list({})
    expect(result).toEqual([])
  })

  it('returns todos for the authenticated user', async () => {
    await env.db.insert(todo).values([
      { title: 'Buy milk', userId: env.testUser.id },
      { title: 'Walk dog', userId: env.testUser.id },
    ])

    const result = await env.client.todo.list({})
    expect(result).toHaveLength(2)
    expect(result[0].title).toBe('Buy milk')
  })
})

describe('todo.create', () => {
  it('creates a todo and returns it', async () => {
    const result = await env.client.todo.create({ title: 'New task' })

    expect(result.title).toBe('New task')
    expect(result.userId).toBe(env.testUser.id)
    expect(result.completed).toBe(false)
    expect(result.id).toBeDefined()
  })
})

describe('todo.delete', () => {
  it('deletes a todo owned by the user', async () => {
    const [inserted] = await env.db
      .insert(todo)
      .values({ title: 'Delete me', userId: env.testUser.id })
      .returning()

    const result = await env.client.todo.delete({ id: inserted.id })
    expect(result.success).toBe(true)

    // Verify gone from DB
    const remaining = await env.db.select().from(todo).where(eq(todo.id, inserted.id))
    expect(remaining).toHaveLength(0)
  })

  it('throws NOT_FOUND for another user\'s todo', async () => {
    const [other] = await env.db
      .insert(todo)
      .values({ title: 'Not mine', userId: 'other-user-id' })
      .returning()

    await expect(
      env.client.todo.delete({ id: other.id })
    ).rejects.toThrow()
  })
})
```

**Note:** Tests within the same file share a DB instance. The `todo.list` test that expects an empty list must run before any insert. If your tests might run in a different order, either use unique data per test or reset with `await env.db.delete(table)` in `beforeEach`.

## Checklist for New Test Files

1. File name: `<domain>.router.test.ts`, co-located with the router
2. External service mocks registered BEFORE `createTestEnv()` is called
3. `const env = await createTestEnv()` at top level
4. `afterAll(() => env.cleanup())` — always
5. Test-specific seed data via `env.db.insert()`
6. All calls go through `env.client.<domain>.<procedure>(input)` — never import handlers directly
7. Assert both return values AND DB side effects where relevant
8. Run `bun test src/routers/<file>` to validate, then `bun test` for the full suite

## Troubleshooting

### `mock.module` path doesn't match

Bun resolves mock paths relative to the file calling `mock.module`. From `src/test/setup.ts`:
- `../db` → `src/db`
- `../lib/auth` → `src/lib/auth`

From `src/routers/storage.router.test.ts`:
- `../lib/s3` → `src/lib/s3`

If a mock isn't taking effect, check that your relative path resolves to the same absolute module as the production import.

### PGLite migration fails

`migrate(db, { migrationsFolder: './drizzle' })` resolves `./drizzle` relative to CWD. Tests must run from `apps/backend/` (which `bunfig.toml` ensures). If you run `bun test` from the project root via `bun run test`, it delegates to the backend workspace — CWD is correct.

### Module side effects at import time

Some modules run code at import time (e.g., `env.ts` parses `process.env`). If a router transitively imports such a module, mock it in `setup.ts` or your test file before the dynamic import.

### Tests interfere with each other

Each test file gets its own PGLite. But tests within the same file share a DB. If test order matters, either:
- Seed unique data per test (use unique fileKeys, IDs, etc.)
- Reset with `await env.db.delete(table)` in `beforeEach`

### New env variable breaks tests

When you add a new variable to `src/lib/env.ts`, also add it to the env mock in `src/test/setup.ts`. Otherwise tests will see `undefined` for the new variable.

### Type errors with `env.client`

The client is typed from the contract. If a procedure was just added to the contract but the router isn't implemented yet, `env.client.<domain>.<proc>` will exist (typed) but throw at runtime. Implement the handler first.
