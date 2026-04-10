/**
 * Test data factory functions.
 * All return plain objects matching Drizzle schema insert types.
 */

export function createTestUser(overrides?: {
  id?: string
  name?: string
  email?: string
  emailVerified?: boolean
  image?: string | null
  createdAt?: Date
  updatedAt?: Date
}) {
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

export function createTestSession(
  userId: string,
  overrides?: {
    id?: string
    token?: string
    expiresAt?: Date
    userId?: string
    ipAddress?: string
    userAgent?: string
    createdAt?: Date
    updatedAt?: Date
  },
) {
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
