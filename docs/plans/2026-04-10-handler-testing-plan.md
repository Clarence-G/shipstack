# Handler Testing Infrastructure — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add handler-level testing to `apps/backend` with PGLite in-memory DBs, bun test, and `createRouterClient`.

**Architecture:** Each test file gets its own PGLite instance (file-level isolation). `createTestEnv()` handles PGLite creation, Drizzle migration, seedBase, module mocking (db + auth), and returns a typed oRPC client. Tests call the client as if it were a real RPC client but everything runs in-process.

**Tech Stack:** `bun:test`, `@electric-sql/pglite` (already installed), `drizzle-orm/pglite`, `@orpc/server` `createRouterClient`

**Design doc:** `docs/plans/2026-04-10-handler-testing-design.md`

---

### Task 1: Add bunfig.toml and package.json test scripts

**Files:**
- Create: `apps/backend/bunfig.toml`
- Modify: `apps/backend/package.json` (add `test` and `test:watch` scripts)
- Modify: `package.json` (root — add `test` and `test:backend` scripts)

**Step 1: Create `apps/backend/bunfig.toml`**

```toml
[test]
root = "./src"
```

**Step 2: Add test scripts to `apps/backend/package.json`**

Add to the `"scripts"` section:

```json
"test": "bun test",
"test:watch": "bun test --watch"
```

**Step 3: Add root-level proxy script to `package.json`**

Add to root `"scripts"`:

```json
"test": "bun run --filter @myapp/backend test",
"test:backend": "bun run --filter @myapp/backend test"
```

**Step 4: Verify bun test discovers no tests yet**

Run: `cd apps/backend && bun test`
Expected: Output says "0 tests" or "no tests found" — no crash.

**Step 5: Commit**

```
feat(backend): add bun test configuration
```

---

### Task 2: Create seed-base.ts and refactor seed.ts

**Files:**
- Create: `apps/backend/src/db/seed-base.ts`
- Modify: `apps/backend/src/db/seed.ts`

**Step 1: Create `apps/backend/src/db/seed-base.ts`**

This function receives a Drizzle DB instance and inserts required base data. Currently empty (no enum/config tables yet), but the extension point is ready.

```ts
import type { PgDatabase } from 'drizzle-orm/pg-core'

/**
 * Seed base data required by the application.
 * Called by both dev seed (seed.ts) and test setup (test/setup.ts).
 *
 * Add required enum/config data here as schema grows:
 * roles, categories, settings, etc.
 */
export async function seedBase(_db: PgDatabase<any>) {
  // No enum/config tables yet. Add base data here as schema grows.
  // Example:
  // await db.insert(role).values([
  //   { id: 'admin', name: 'Admin' },
  //   { id: 'user', name: 'User' },
  // ]).onConflictDoNothing()
}
```

**Step 2: Refactor `apps/backend/src/db/seed.ts` to call seedBase**

Replace the full file content with:

```ts
import { auth } from '../lib/auth'
import { db } from './index'
import { seedBase } from './seed-base'

const TEST_USER = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123',
}

// Seed base data first (roles, configs, etc.)
await seedBase(db)

console.log(`Seeding test user: ${TEST_USER.email}`)

try {
  const result = await auth.api.signUpEmail({ body: TEST_USER })
  if (result.user) {
    console.log(`Test user created: ${result.user.email} (id: ${result.user.id})`)
  }
} catch (_err) {
  console.log('Test user already exists, skipping creation')
}

console.log(`\nLogin credentials:`)
console.log(`  Email:    ${TEST_USER.email}`)
console.log(`  Password: ${TEST_USER.password}`)

process.exit(0)
```

**Step 3: Verify dev seed still works**

Run: `cd apps/backend && bun run db:seed`
Expected: Same output as before — "Test user created" or "already exists".

**Step 4: Commit**

```
feat(backend): add seed-base.ts, refactor seed.ts to use it
```

---

### Task 3: Create test fixtures (factory functions)

**Files:**
- Create: `apps/backend/src/test/fixtures.ts`

**Step 1: Create `apps/backend/src/test/fixtures.ts`**

Factory functions that generate test data matching the DB schema exactly. Every field matches `apps/backend/src/db/schema.ts` columns.

```ts
/**
 * Test data factory functions.
 * All return plain objects matching Drizzle schema insert types.
 */

export function createTestUser(overrides?: Partial<ReturnType<typeof createTestUser>>) {
  return {
    id: crypto.randomUUID(),
    name: 'Test User',
    email: `test-${crypto.randomUUID().slice(0, 8)}@example.com`,
    emailVerified: false,
    image: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

export function createTestSession(userId: string, overrides?: Partial<ReturnType<typeof createTestSession>>) {
  return {
    id: crypto.randomUUID(),
    token: crypto.randomUUID(),
    expiresAt: new Date(Date.now() + 86_400_000), // +24h
    userId,
    ipAddress: '127.0.0.1',
    userAgent: 'bun-test',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}
```

**Step 2: Verify TypeScript compiles**

Run: `cd apps/backend && bunx tsc --noEmit src/test/fixtures.ts`
Expected: No errors.

**Step 3: Commit**

```
feat(backend): add test fixture factory functions
```

---

### Task 4: Create createTestEnv() — the core test setup utility

This is the most critical file. It creates an in-memory PGLite, runs migrations, seeds base data, inserts a test user, mocks the `db` and `auth` modules, dynamically imports the router, and returns a typed client.

**Files:**
- Create: `apps/backend/src/test/setup.ts`

**Step 1: Create `apps/backend/src/test/setup.ts`**

```ts
import { mock } from 'bun:test'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '../db/schema'
import { seedBase } from '../db/seed-base'
import { createTestSession, createTestUser } from './fixtures'

interface TestEnvOptions {
  /** Override the default test user */
  userOverrides?: Parameters<typeof createTestUser>[0]
  /** Additional seed function run after base seed + user insert */
  seedFn?: (db: ReturnType<typeof drizzle<typeof schema>>) => Promise<void>
}

/**
 * Create an isolated test environment with its own PGLite database.
 *
 * Usage in test files:
 * ```ts
 * import { createTestEnv } from '../test/setup'
 * const env = await createTestEnv()
 * afterAll(() => env.cleanup())
 * ```
 */
export async function createTestEnv(options?: TestEnvOptions) {
  // 1. Create in-memory PGLite + Drizzle + run migrations
  const pgClient = new PGlite()
  const db = drizzle({ client: pgClient, schema })
  await migrate(db, { migrationsFolder: './drizzle' })

  // 2. Seed base data (roles, configs, etc.)
  await seedBase(db)

  // 3. Create test user + session via direct Drizzle insert
  const testUser = createTestUser(options?.userOverrides)
  const testSession = createTestSession(testUser.id)
  await db.insert(schema.user).values(testUser)

  // 4. Run optional test-specific seed
  if (options?.seedFn) {
    await options.seedFn(db)
  }

  // 5. Mock the db module — all routers import from '../db' or '../db/index'
  //    Bun resolves mock paths relative to THIS file (src/test/setup.ts)
  //    ../db resolves to src/db — same as routers' ../db from src/routers/
  mock.module('../db', () => ({ db }))
  mock.module('../db/index', () => ({ db }))

  // 6. Mock the auth module — bypass Better Auth, return our test user
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

  // 7. Mock env module to avoid Zod validation errors in test context
  mock.module('../lib/env', () => ({
    env: {
      ENV: 'dev',
      PORT: 4001,
      LOG_LEVEL: 'error',
      FRONTEND_URL: 'http://localhost:4000',
      MOBILE_URL: 'http://localhost:8082',
      BETTER_AUTH_SECRET: 'test-secret',
      BETTER_AUTH_URL: 'http://localhost:4001',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_REGION: 'us-east-1',
      S3_ACCESS_KEY: 'test',
      S3_SECRET_KEY: 'test',
      S3_BUCKET: 'test-bucket',
    },
  }))

  // 8. Dynamic import router AFTER mocks are registered
  const { router } = await import('../routers/index')
  const { createRouterClient } = await import('@orpc/server')

  const client = createRouterClient(router, {
    context: { headers: new Headers() },
  })

  return {
    db,
    client,
    testUser,
    testSession,
    cleanup: () => pgClient.close(),
  }
}
```

**Key details for the implementer:**
- `mock.module` MUST be called before `import('../routers/index')`. The routers have top-level imports of `../db` and `../lib/auth` — these must be intercepted before the module is loaded.
- Path `../db` from `src/test/setup.ts` resolves to `src/db` (same target as `../db` from `src/routers/*.ts`).
- The `env` module also needs mocking because `auth.ts` imports `env` and it calls `process.env` parsing at module load time.
- `createRouterClient` is the oRPC official server-side testing utility — it runs the full middleware chain in-process without HTTP.

**Step 2: Verify TypeScript compiles**

Run: `cd apps/backend && bunx tsc --noEmit src/test/setup.ts`
Expected: No errors (may need to check if there are type issues with the `drizzle` return type — adjust if needed).

**Step 3: Commit**

```
feat(backend): add createTestEnv() — one-line test setup
```

---

### Task 5: Write auth.router.test.ts — first real test

**Files:**
- Create: `apps/backend/src/routers/auth.router.test.ts`

**Step 1: Write the test file**

```ts
import { afterAll, describe, expect, it } from 'bun:test'
import { createTestEnv } from '../test/setup'

const env = await createTestEnv()
afterAll(() => env.cleanup())

describe('auth.me', () => {
  it('returns the authenticated user profile', async () => {
    const result = await env.client.auth.me({})

    expect(result.id).toBe(env.testUser.id)
    expect(result.email).toBe(env.testUser.email)
    expect(result.name).toBe(env.testUser.name)
    expect(result.createdAt).toBeInstanceOf(Date)
  })

  it('includes image field (nullable)', async () => {
    const result = await env.client.auth.me({})
    expect(result.image).toBeNull()
  })
})
```

**Step 2: Run the test**

Run: `cd apps/backend && bun test src/routers/auth.router.test.ts`
Expected: 2 tests pass.

**This is the critical validation step.** If mock.module path resolution doesn't work, or the PGLite migrations fail, or createRouterClient has type issues — we'll know here. Debug and fix before proceeding.

**Possible issues and fixes:**
- If `mock.module` paths don't match: try absolute paths using `import.meta.dir` resolution
- If PGLite migration fails: check that `./drizzle` path resolves correctly from the test CWD (should be `apps/backend/`)
- If `createRouterClient` type errors: check that `context` matches `InitialContext` shape
- If the router dynamic import fails: ensure all transitive imports (s3, ai, logger) are also mocked or don't have side effects

**Step 3: Run `bun run lint` to check for Biome issues**

Run: `cd /Users/bytedance/Projects/orpc_template && bun run lint`
Expected: No new errors from test files.

**Step 4: Commit**

```
feat(backend): add auth.router tests — first handler test
```

---

### Task 6: Write storage.router.test.ts — test with external service mocks

This task demonstrates the pattern for tests that need additional mocks beyond db + auth (in this case: S3 and getSignedUrl).

**Files:**
- Create: `apps/backend/src/routers/storage.router.test.ts`

**Step 1: Write the test file**

```ts
import { afterAll, describe, expect, it, mock } from 'bun:test'

// Mock S3 and presigner BEFORE createTestEnv (which dynamic-imports the router)
mock.module('@aws-sdk/client-s3', () => ({
  PutObjectCommand: class {},
  HeadObjectCommand: class {},
  GetObjectCommand: class {},
}))

mock.module('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: async () => 'https://test-s3.example.com/signed-url',
}))

mock.module('../lib/s3', () => ({
  s3: {
    send: async () => ({ ContentLength: 1024 }),
  },
  S3_BUCKET: 'test-bucket',
}))

import { createTestEnv } from '../test/setup'
import { file } from '../db/schema'

const env = await createTestEnv()
afterAll(() => env.cleanup())

describe('storage.requestUploadUrl', () => {
  it('creates a pending file record and returns a signed upload URL', async () => {
    const result = await env.client.storage.requestUploadUrl({
      filename: 'test.png',
      contentType: 'image/png',
    })

    expect(result.uploadUrl).toBe('https://test-s3.example.com/signed-url')
    expect(result.fileKey).toContain(env.testUser.id)
    expect(result.fileKey).toContain('test.png')

    // Verify file record was created in the DB
    const records = await env.db.select().from(file)
    expect(records).toHaveLength(1)
    expect(records[0].status).toBe('pending')
    expect(records[0].userId).toBe(env.testUser.id)
  })
})

describe('storage.confirmUpload', () => {
  it('confirms an uploaded file and returns metadata with download URL', async () => {
    // Seed a pending file
    const fileKey = `${env.testUser.id}/test-confirm.txt`
    await env.db.insert(file).values({
      userId: env.testUser.id,
      fileKey,
      filename: 'test-confirm.txt',
      contentType: 'text/plain',
      status: 'pending',
    })

    const result = await env.client.storage.confirmUpload({ fileKey })

    expect(result.fileKey).toBe(fileKey)
    expect(result.filename).toBe('test-confirm.txt')
    expect(result.url).toBe('https://test-s3.example.com/signed-url')
  })
})

describe('storage.getDownloadUrl', () => {
  it('returns a signed download URL for a confirmed file', async () => {
    // Seed a confirmed file
    const fileKey = `${env.testUser.id}/test-download.txt`
    await env.db.insert(file).values({
      userId: env.testUser.id,
      fileKey,
      filename: 'test-download.txt',
      contentType: 'text/plain',
      status: 'confirmed',
    })

    const result = await env.client.storage.getDownloadUrl({ fileKey })
    expect(result.downloadUrl).toBe('https://test-s3.example.com/signed-url')
  })

  it('throws NOT_FOUND for non-existent file', async () => {
    await expect(
      env.client.storage.getDownloadUrl({ fileKey: 'nonexistent' })
    ).rejects.toThrow()
  })
})
```

**Step 2: Run the test**

Run: `cd apps/backend && bun test src/routers/storage.router.test.ts`
Expected: 4 tests pass.

**Step 3: Run all tests together**

Run: `cd apps/backend && bun test`
Expected: Both auth + storage test files pass (6 total tests). They run in parallel with separate PGLite instances — no interference.

**Step 4: Run lint**

Run: `cd /Users/bytedance/Projects/orpc_template && bun run lint`
Expected: Clean.

**Step 5: Commit**

```
feat(backend): add storage.router tests — S3 mock pattern
```

---

### Task 7: Update CLAUDE.md and docs with testing instructions

**Files:**
- Modify: `CLAUDE.md` (root — add testing section to Commands table)
- Modify: `docs/backend.md` (add Testing section)

**Step 1: Add test commands to root CLAUDE.md Commands table**

Add these rows:

```
| `bun run test` | Run all backend tests |
| `bun run test:backend` | Run all backend tests (explicit) |
```

**Step 2: Add Testing section to `docs/backend.md`**

Add a new `## Testing` section after `## Error Handling`. Content:

```markdown
## Testing

Uses `bun test` with PGLite in-memory databases. Each test file gets a fresh DB instance.

### Running tests

\`\`\`bash
bun run test              # all backend tests
bun run test:backend      # same (from root)
cd apps/backend && bun test --watch  # watch mode
\`\`\`

### Writing a handler test

\`\`\`ts
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
\`\`\`

`createTestEnv()` provides:
- `env.client` — typed oRPC client (runs full middleware chain in-process)
- `env.db` — Drizzle instance for seeding test data
- `env.testUser` — pre-inserted test user
- `env.testSession` — mock session for the test user
- `env.cleanup()` — close PGLite (call in `afterAll`)

### Test-specific seed data

Insert directly with `env.db` after `createTestEnv()`:

\`\`\`ts
const env = await createTestEnv()
await env.db.insert(todo).values({
  title: 'Test todo',
  userId: env.testUser.id,
})
\`\`\`

### Mocking external services

Mock before `createTestEnv()` (which dynamic-imports routers):

\`\`\`ts
import { mock } from 'bun:test'

mock.module('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: async () => 'https://mock-url',
}))

import { createTestEnv } from '../test/setup'
const env = await createTestEnv()
\`\`\`

### Seed architecture

| File | Purpose | When |
|------|---------|------|
| `src/db/seed-base.ts` | Base enums/configs | Auto — every test + dev seed |
| `src/db/seed.ts` | Dev user via Better Auth | Manual — `bun run db:seed` |
| Test file | Test-specific data | Manual — each test's responsibility |
```

**Step 3: Commit**

```
docs: add testing guide to CLAUDE.md and backend docs
```

---

### Task 8: Final verification — run all tests from root

**Step 1: Run all tests from project root**

Run: `cd /Users/bytedance/Projects/orpc_template && bun run test`
Expected: All tests pass (6 total across 2 files).

**Step 2: Run lint from root**

Run: `bun run lint`
Expected: Clean.

**Step 3: Verify dev seed still works**

Run: `bun run db:seed`
Expected: Existing seed behavior unchanged.

**Step 4: Final commit if any remaining changes**

```
chore(backend): testing infrastructure complete
```
