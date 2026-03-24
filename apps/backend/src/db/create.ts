import postgres from 'postgres'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
  console.error('DATABASE_URL is not set')
  process.exit(1)
}

const url = new URL(databaseUrl)
const dbName = url.pathname.slice(1)
url.pathname = '/postgres'

const sql = postgres(url.toString())
await sql
  .unsafe(`CREATE DATABASE "${dbName}"`)
  .then(() => console.log(`Database "${dbName}" created`))
  .catch((err: any) => {
    if (err.code === '42P04') console.log(`Database "${dbName}" already exists`)
    else throw err
  })
await sql.end()
