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
