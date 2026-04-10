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
