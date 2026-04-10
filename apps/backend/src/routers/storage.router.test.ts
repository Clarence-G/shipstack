import { afterAll, describe, expect, it, mock } from 'bun:test'

// Mock S3 and presigner BEFORE createTestEnv (which dynamic-imports the router)
mock.module('@aws-sdk/client-s3', () => ({
  S3Client: class {},
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

import { eq } from 'drizzle-orm'
import { file } from '../db/schema'
import { createTestEnv } from '../test/setup'

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

    // Verify the exact file record in DB
    const [record] = await env.db.select().from(file).where(eq(file.fileKey, result.fileKey))
    expect(record).toBeDefined()
    expect(record.status).toBe('pending')
    expect(record.userId).toBe(env.testUser.id)
  })
})

describe('storage.confirmUpload', () => {
  it('confirms an uploaded file and returns metadata with download URL', async () => {
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
    await expect(env.client.storage.getDownloadUrl({ fileKey: 'nonexistent' })).rejects.toThrow()
  })
})
