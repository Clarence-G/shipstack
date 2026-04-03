import { GetObjectCommand, HeadObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { ORPCError } from '@orpc/server'
import { and, eq } from 'drizzle-orm'
import { db } from '../db'
import { file } from '../db/schema'
import { S3_BUCKET, s3 } from '../lib/s3'
import { authMiddleware, os } from '../orpc'

const UPLOAD_EXPIRY = 600 // 10 minutes
const DOWNLOAD_EXPIRY = 3600 // 1 hour

export const storageRouter = {
  /**
   * Request a presigned upload URL for a new file.
   * Creates a pending file record and returns a presigned PUT URL.
   */
  requestUploadUrl: os.storage.requestUploadUrl
    .use(authMiddleware)
    .handler(async ({ input, context }) => {
      const fileKey = `${context.user.id}/${crypto.randomUUID()}-${input.filename}`

      await db.insert(file).values({
        userId: context.user.id,
        fileKey,
        filename: input.filename,
        contentType: input.contentType,
        status: 'pending',
      })

      const command = new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: fileKey,
        ContentType: input.contentType,
      })

      const uploadUrl = await getSignedUrl(s3, command, {
        expiresIn: UPLOAD_EXPIRY,
      })

      return { uploadUrl, fileKey }
    }),

  /**
   * Confirm that a file has been uploaded and persist its metadata.
   * Verifies the file exists in S3 via HeadObject, updates the DB record.
   */
  confirmUpload: os.storage.confirmUpload
    .use(authMiddleware)
    .handler(async ({ input, context }) => {
      try {
        const head = await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: input.fileKey }))

        const [updated] = await db
          .update(file)
          .set({
            status: 'confirmed',
            size: head.ContentLength?.toString(),
          })
          .where(and(eq(file.fileKey, input.fileKey), eq(file.userId, context.user.id)))
          .returning()

        if (!updated) {
          throw new ORPCError('NOT_FOUND', {
            message: 'File record not found',
          })
        }

        const downloadCommand = new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: input.fileKey,
        })
        const url = await getSignedUrl(s3, downloadCommand, {
          expiresIn: DOWNLOAD_EXPIRY,
        })

        return {
          id: updated.id,
          fileKey: updated.fileKey,
          filename: updated.filename,
          contentType: updated.contentType,
          url,
          createdAt: updated.createdAt,
        }
      } catch (error) {
        if (error instanceof ORPCError) throw error
        const isNotFound = error instanceof Error && 'name' in error && error.name === 'NotFound'
        throw new ORPCError(isNotFound ? 'NOT_FOUND' : 'INTERNAL_SERVER_ERROR', {
          message: isNotFound ? 'File not found in storage' : 'Storage service error',
        })
      }
    }),

  /**
   * Get a presigned download URL for an existing confirmed file.
   * Verifies ownership and confirmed status before generating the URL.
   */
  getDownloadUrl: os.storage.getDownloadUrl
    .use(authMiddleware)
    .handler(async ({ input, context }) => {
      const [record] = await db
        .select()
        .from(file)
        .where(
          and(
            eq(file.fileKey, input.fileKey),
            eq(file.userId, context.user.id),
            eq(file.status, 'confirmed'),
          ),
        )

      if (!record) {
        throw new ORPCError('NOT_FOUND', { message: 'File not found' })
      }

      const command = new GetObjectCommand({
        Bucket: S3_BUCKET,
        Key: input.fileKey,
      })

      const downloadUrl = await getSignedUrl(s3, command, {
        expiresIn: DOWNLOAD_EXPIRY,
      })

      return { downloadUrl }
    }),
}
