import { S3Client } from '@aws-sdk/client-s3'
import { env } from './env'

export const s3 = new S3Client({
  region: env.S3_REGION,
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: true, // Required for MinIO and most S3-compatible services
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
})

export const S3_BUCKET = env.S3_BUCKET
