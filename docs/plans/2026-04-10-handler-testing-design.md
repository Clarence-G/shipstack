# Handler Testing Infrastructure Design

## Goal

Add handler-level testing to `apps/backend` using PGLite in-memory databases, with automatic scaffold setup so each test file only needs to seed its own test data.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Test runner | `bun test` | Zero deps, native Bun support, Jest-compatible API |
| DB isolation | PGLite per test file | Full isolation, parallel-safe, ~200-400ms startup |
| RPC testing | `createRouterClient` | oRPC official server-side client, runs full middleware chain without HTTP |
| Auth strategy | Mock `auth` module | `mock.module()` replaces Better Auth's `getSession` — no real sessions needed |
| DB injection | Mock `db` module | `mock.module()` replaces the DB singleton — no production code changes |
| Seed architecture | `seedBase()` + per-test seed | Base data (enums/configs) auto-loaded, test-specific data manual |
| Test file location | Co-located (`*.test.ts` next to `*.ts`) | Easiest to navigate during development |
| External services | Per-test mock | S3, AI mocked individually by tests that need them |

## Architecture

```
bun test
  └── each .test.ts file (parallel)
      ├── createTestEnv()              ← one-line setup
      │   ├── new PGlite()            ← in-memory, no file path
      │   ├── drizzle migrate          ← auto-create all tables
      │   ├── seedBase(db)             ← insert enums/configs
      │   ├── insert test user         ← direct Drizzle insert
      │   ├── mock.module('../db')     ← swap DB singleton
      │   ├── mock.module('../lib/auth') ← fake getSession
      │   └── createRouterClient(router) ← typed client
      ├── test-specific seed data      ← handler test's responsibility
      └── describe/it/expect
```

## File Structure

```
apps/backend/
├── bunfig.toml                    # [test] config
├── src/
│   ├── test/
│   │   ├── setup.ts               # createTestEnv() — core utility
│   │   └── fixtures.ts            # createTestUser(), createTestSession()
│   ├── db/
│   │   ├── seed-base.ts           # seedBase(db) — required base data
│   │   └── seed.ts                # dev seed (calls seedBase + creates user via BA)
│   └── routers/
│       ├── auth.router.ts
│       ├── auth.router.test.ts    # co-located test
│       ├── storage.router.ts
│       └── storage.router.test.ts
```

## Core Components

### 1. `createTestEnv()` — One-Line Test Setup

Located at `src/test/setup.ts`. Returns everything a test file needs:

```ts
export async function createTestEnv(options?: { seedFn?: (db) => Promise<void> }) {
  // 1. Create PGLite in-memory + migrate
  const pgClient = new PGlite()
  const db = drizzle({ client: pgClient, schema })
  await migrate(db, { migrationsFolder: './drizzle' })

  // 2. Seed base data
  await seedBase(db)

  // 3. Create test user (direct Drizzle insert, not Better Auth)
  const testUser = createTestUser()
  const testSession = createTestSession(testUser.id)
  await db.insert(userTable).values(testUser)

  // 4. Mock db module (before router import)
  mock.module('../db', () => ({ db }))
  mock.module('../db/index', () => ({ db }))

  // 5. Mock auth module (bypass Better Auth)
  mock.module('../lib/auth', () => ({
    auth: {
      api: {
        getSession: async () => ({
          user: testUser,
          session: testSession,
        }),
      },
    },
  }))

  // 6. Run optional test-specific seed
  if (options?.seedFn) await options.seedFn(db)

  // 7. Dynamic import router AFTER mocks are set
  const { router } = await import('../routers/index')
  const { createRouterClient } = await import('@orpc/server')
  const client = createRouterClient(router, {
    context: { headers: new Headers() },
  })

  return { db, client, testUser, testSession, cleanup: () => pgClient.close() }
}
```

**Why dynamic imports?** `mock.module()` must be called before the mocked module is loaded. Since routers import `db` and `auth` at the top level, we mock first, then dynamically import.

**Path resolution:** From `src/test/setup.ts`, `../db` resolves to `src/db` — the same module routers import via their `../db`. Bun matches mocks by resolved absolute path.

### 2. `fixtures.ts` — Factory Functions

```ts
export function createTestUser(overrides?) {
  return {
    id: crypto.randomUUID(),
    name: 'Test User',
    email: `test-${Date.now()}@example.com`,
    emailVerified: false,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestSession(userId: string, overrides?) {
  return {
    id: crypto.randomUUID(),
    token: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 86_400_000),
    userId,
    ipAddress: '127.0.0.1',
    userAgent: 'bun-test',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}
```

### 3. `seed-base.ts` — Base Required Data

```ts
export async function seedBase(db: DrizzleDb) {
  // Currently no enum/config tables in schema.
  // As schema grows, add required base data here:
  //
  // await db.insert(role).values([
  //   { id: 'admin', name: 'Admin' },
  //   { id: 'user', name: 'User' },
  // ]).onConflictDoNothing()
}
```

Also integrate into existing `seed.ts` for development consistency.

### 4. Test File Pattern

```ts
// routers/auth.router.test.ts
import { describe, it, expect, afterAll } from 'bun:test'
import { createTestEnv } from '../test/setup'

const env = await createTestEnv()
afterAll(() => env.cleanup())

describe('auth.me', () => {
  it('returns the authenticated user profile', async () => {
    const result = await env.client.auth.me({})
    expect(result.id).toBe(env.testUser.id)
    expect(result.email).toBe(env.testUser.email)
    expect(result.name).toBe(env.testUser.name)
  })
})
```

### 5. Tests with Extra Seed Data

```ts
// routers/storage.router.test.ts
import { describe, it, expect, afterAll } from 'bun:test'
import { mock } from 'bun:test'
import { createTestEnv } from '../test/setup'

// Mock S3 before createTestEnv (which dynamically imports storage router)
mock.module('../lib/s3', () => ({
  s3: { send: async (cmd) => ({ ContentLength: 1024 }) },
  S3_BUCKET: 'test-bucket',
}))

// Mock getSignedUrl
mock.module('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: async () => 'https://test-s3.example.com/signed-url',
}))

const env = await createTestEnv({
  seedFn: async (db) => {
    // Test-specific seed: pre-existing files for download tests
    await db.insert(file).values({
      userId: env.testUser.id, // hmm, circular — see note below
      fileKey: 'test-user/test-file.txt',
      filename: 'test-file.txt',
      contentType: 'text/plain',
      status: 'confirmed',
    })
  },
})
afterAll(() => env.cleanup())
```

**Note:** For test-specific seed that references `testUser`, either:
- Use a known fixed user ID: `createTestEnv({ userId: 'fixed-test-id' })`
- Or seed after `createTestEnv` returns: `await env.db.insert(...)`

## Configuration

### `bunfig.toml`

```toml
[test]
root = "./src"
```

### `package.json` scripts

```json
{
  "test": "bun test",
  "test:watch": "bun test --watch"
}
```

## Seed Architecture

```
seed-base.ts          ← base enums/configs (shared by dev + test)
     │
     ├── seed.ts      ← dev: seedBase() + create user via Better Auth API
     └── setup.ts     ← test: seedBase() + insert user via Drizzle
```

## What's NOT in Scope

- **Frontend/mobile testing** — this design covers `apps/backend` only
- **E2E HTTP tests** — no Hono server startup, purely in-process RPC
- **CI pipeline** — `bun test` command ready, CI config left to user
- **Coverage** — can be added later with `bun test --coverage`
- **AI handler tests** — AI SDK mocking is complex, deferred to when needed

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| `mock.module` path resolution between `test/` and `routers/` | Both `../db` paths resolve to same absolute `src/db`. Verify in first test. |
| PGLite startup time (~200-400ms/file) | Acceptable for handler tests. If slow, consider shared instance later. |
| Bun `mock.module` API stability | Bun test is stable as of Bun 1.x. API mirrors Jest's `jest.mock()`. |
| Dynamic import caching | Each test file runs in its own module context in Bun test. |
