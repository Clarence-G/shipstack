import { env } from '../lib/env'
import { logger } from '../lib/logger'
import * as schema from './schema'

async function createDb() {
  if (env.ENV === 'dev') {
    const { drizzle } = await import('drizzle-orm/pglite')
    const { migrate } = await import('drizzle-orm/pglite/migrator')
    const { PGlite } = await import('@electric-sql/pglite')
    const client = new PGlite('./pgdata')
    const db = drizzle({ client, schema })
    await migrate(db, { migrationsFolder: './drizzle' })
    logger.info('pglite ready (dev mode, ./pgdata)')
    return db
  }

  const { drizzle } = await import('drizzle-orm/postgres-js')
  const { default: postgres } = await import('postgres')
  return drizzle(postgres(env.DATABASE_URL!), { schema })
}

export const db = await createDb()
