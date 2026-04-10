import type { PgDatabase } from 'drizzle-orm/pg-core'

/**
 * Seed base data required by the application.
 * Called by both dev seed (seed.ts) and test setup (test/setup.ts).
 *
 * Add required enum/config data here as schema grows:
 * roles, categories, settings, etc.
 */
// biome-ignore lint/suspicious/noExplicitAny: accepts any Drizzle PG instance regardless of schema type
export async function seedBase(_db: PgDatabase<any>) {
  // No enum/config tables yet. Add base data here as schema grows.
}
