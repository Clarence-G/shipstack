import { defineConfig } from 'drizzle-kit'

// In dev mode (ENV=dev), migrations run automatically at startup via PGlite.
// This config is used for `db:generate` (schema diff → SQL) and
// `db:migrate` / `db:push` against a real PostgreSQL in prod.
const isDev = process.env.ENV === 'dev'

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  ...(isDev
    ? {} // dev: no DB connection needed for generate
    : { dbCredentials: { url: process.env.DATABASE_URL! } }),
})
