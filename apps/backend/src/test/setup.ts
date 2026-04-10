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
  // biome-ignore lint/suspicious/noExplicitAny: drizzle/pglite return type varies by version
  seedFn?: (db: any) => Promise<void>
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
