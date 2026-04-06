# S3 Presigned URL File Storage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a universal file storage service using S3-compatible presigned URLs, with oRPC contract shared between Web frontend and Expo mobile.

**Architecture:** Backend generates presigned PUT/GET URLs via `@aws-sdk/s3-request-presigner`. Clients upload directly to S3-compatible storage (MinIO for dev, S3/R2 for prod). File metadata tracked in PostgreSQL via Drizzle. Three oRPC procedures: `requestUploadUrl`, `confirmUpload`, `getDownloadUrl`. All protected by `authMiddleware`.

**Tech Stack:** `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`, Drizzle ORM, oRPC contract, MinIO (Docker for dev)

---

### Task 1: Add MinIO to Docker Compose for local dev

**Files:**
- Create: `docker-compose.yml`

**Step 1: Create `docker-compose.yml` at project root**

```yaml
services:
  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    command: server /data --console-address ":9001"
    volumes:
      - minio-data:/data

volumes:
  minio-data:
```

**Step 2: Start MinIO and create default bucket**

Run:
```bash
docker compose up -d
# Wait for MinIO to start, then create the default bucket
curl -s http://localhost:9000/minio/health/live
```

Expected: MinIO running on :9000 (API) and :9001 (console).

Create the bucket via MinIO client:
```bash
docker compose exec minio mc alias set local http://localhost:9000 minioadmin minioadmin
docker compose exec minio mc mb local/uploads
docker compose exec minio mc anonymous set download local/uploads
```

Note: If `mc` is not available inside the container, use the MinIO console at http://localhost:9001 (login: minioadmin/minioadmin) to create a bucket named `uploads`.

**Step 3: Commit**

```bash
git add docker-compose.yml
git commit -m "infra: add MinIO docker-compose for local S3-compatible storage"
```

---

### Task 2: Install S3 SDK in backend

**Files:**
- Modify: `apps/backend/package.json`

**Step 1: Install dependencies**

```bash
bun add --cwd apps/backend @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
```

**Step 2: Verify installation**

Run: `grep "@aws-sdk" apps/backend/package.json`
Expected: Both `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` listed.

**Step 3: Commit**

```bash
git add apps/backend/package.json bun.lock
git commit -m "deps: add AWS S3 SDK for presigned URL file storage"
```

---

### Task 3: Add S3 client lib

**Files:**
- Create: `apps/backend/src/lib/s3.ts`

**Step 1: Create the S3 client module**

```typescript
import { S3Client } from '@aws-sdk/client-s3'

export const s3 = new S3Client({
  region: process.env.S3_REGION ?? 'us-east-1',
  endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  forcePathStyle: true, // Required for MinIO and most S3-compatible services
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY ?? 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_KEY ?? 'minioadmin',
  },
})

export const S3_BUCKET = process.env.S3_BUCKET ?? 'uploads'
```

**Step 2: Add env vars to `.env`**

Append to `apps/backend/.env`:
```
# S3-compatible storage (MinIO for dev)
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET=uploads
```

**Step 3: Commit**

```bash
git add apps/backend/src/lib/s3.ts
git commit -m "feat: add S3 client lib with MinIO defaults"
```

---

### Task 4: Add file metadata DB schema

**Files:**
- Modify: `apps/backend/src/db/schema.ts`

**Step 1: Add `file` table to schema**

Append after the `chatMessage` table definition:

```typescript
export const file = pgTable('file', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  fileKey: text('file_key').notNull().unique(),
  filename: text('filename').notNull(),
  contentType: text('content_type').notNull(),
  size: text('size'), // Populated after upload confirmation
  status: text('status').notNull().default('pending'), // pending | confirmed
  createdAt: timestamp('created_at').notNull().defaultNow(),
})
```

**Step 2: Generate migration**

Run: `bun run db:generate`
Expected: New migration file created in `apps/backend/drizzle/`

**Step 3: Apply migration**

Run: `bun run db:migrate`
Expected: Migration applied successfully.

**Step 4: Commit**

```bash
git add apps/backend/src/db/schema.ts apps/backend/drizzle/
git commit -m "feat: add file metadata table for storage tracking"
```

---

### Task 5: Define storage contract

**Files:**
- Create: `packages/contract/src/storage.contract.ts`
- Modify: `packages/contract/src/index.ts`

**Step 1: Create the storage contract**

```typescript
import { oc } from '@orpc/contract'
import { z } from 'zod'

export const FileSchema = z.object({
  id: z.string(),
  fileKey: z.string(),
  filename: z.string(),
  contentType: z.string(),
  url: z.string(),
  createdAt: z.date(),
})

export const storageContract = {
  requestUploadUrl: oc
    .input(
      z.object({
        filename: z.string().min(1),
        contentType: z.string().min(1),
      }),
    )
    .output(
      z.object({
        uploadUrl: z.string(),
        fileKey: z.string(),
      }),
    ),

  confirmUpload: oc
    .input(
      z.object({
        fileKey: z.string().min(1),
      }),
    )
    .output(FileSchema),

  getDownloadUrl: oc
    .input(
      z.object({
        fileKey: z.string().min(1),
      }),
    )
    .output(
      z.object({
        downloadUrl: z.string(),
      }),
    ),
}
```

**Step 2: Register in contract index**

Modify `packages/contract/src/index.ts`:

```typescript
export { authContract, UserSchema } from './auth.contract'
export { aiContract } from './ai.contract'
export { storageContract, FileSchema } from './storage.contract'

export const contract = {
  auth: authContract,
  ai: aiContract,
  storage: storageContract,
}
```

**Step 3: Verify TypeScript compiles**

Run: `cd packages/contract && bunx tsc --noEmit`
Expected: No errors.

**Step 4: Commit**

```bash
git add packages/contract/src/storage.contract.ts packages/contract/src/index.ts
git commit -m "feat: add storage contract with presigned URL procedures"
```

---

### Task 6: Implement storage router

**Files:**
- Create: `apps/backend/src/routers/storage.router.ts`
- Modify: `apps/backend/src/routers/index.ts`

**Step 1: Create the storage router**

```typescript
import { PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { ORPCError } from '@orpc/server'
import { eq, and } from 'drizzle-orm'
import { os, authMiddleware } from '../orpc'
import { s3, S3_BUCKET } from '../lib/s3'
import { db } from '../db'
import { file } from '../db/schema'

const UPLOAD_EXPIRY = 600 // 10 minutes
const DOWNLOAD_EXPIRY = 3600 // 1 hour

export const storageRouter = {
  requestUploadUrl: os.storage.requestUploadUrl
    .use(authMiddleware)
    .handler(async ({ input, context }) => {
      const fileKey = `${context.user.id}/${crypto.randomUUID()}-${input.filename}`

      // Create pending file record
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

      const uploadUrl = await getSignedUrl(s3, command, { expiresIn: UPLOAD_EXPIRY })

      return { uploadUrl, fileKey }
    }),

  confirmUpload: os.storage.confirmUpload
    .use(authMiddleware)
    .handler(async ({ input, context }) => {
      // Verify file exists in S3
      try {
        const head = await s3.send(
          new HeadObjectCommand({ Bucket: S3_BUCKET, Key: input.fileKey }),
        )

        // Update file record
        const [updated] = await db
          .update(file)
          .set({
            status: 'confirmed',
            size: head.ContentLength?.toString(),
          })
          .where(
            and(
              eq(file.fileKey, input.fileKey),
              eq(file.userId, context.user.id),
            ),
          )
          .returning()

        if (!updated) {
          throw new ORPCError('NOT_FOUND', { message: 'File record not found' })
        }

        // Generate download URL
        const downloadCommand = new GetObjectCommand({
          Bucket: S3_BUCKET,
          Key: input.fileKey,
        })
        const url = await getSignedUrl(s3, downloadCommand, { expiresIn: DOWNLOAD_EXPIRY })

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
        throw new ORPCError('NOT_FOUND', { message: 'File not found in storage' })
      }
    }),

  getDownloadUrl: os.storage.getDownloadUrl
    .use(authMiddleware)
    .handler(async ({ input, context }) => {
      // Verify ownership
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

      const downloadUrl = await getSignedUrl(s3, command, { expiresIn: DOWNLOAD_EXPIRY })

      return { downloadUrl }
    }),
}
```

**Step 2: Register in root router**

Modify `apps/backend/src/routers/index.ts`:

```typescript
import { os } from '../orpc'
import { authRouter } from './auth.router'
import { aiRouter } from './ai.router'
import { storageRouter } from './storage.router'

export const router = os.router({
  auth: authRouter,
  ai: aiRouter,
  storage: storageRouter,
})

export type AppRouter = typeof router
```

**Step 3: Verify backend starts**

Run: `cd apps/backend && bun run --hot src/index.ts`
Expected: Server starts on port 4001 without errors. Stop with Ctrl+C.

**Step 4: Commit**

```bash
git add apps/backend/src/routers/storage.router.ts apps/backend/src/routers/index.ts
git commit -m "feat: implement storage router with presigned URL handlers"
```

---

### Task 7: Add `useUpload` hook for frontend (Web)

**Files:**
- Create: `apps/frontend/src/hooks/use-upload.ts`

**Step 1: Create the hook**

```typescript
import { useState } from 'react'
import { client } from '@/lib/orpc'

interface UploadResult {
  id: string
  fileKey: string
  filename: string
  contentType: string
  url: string
  createdAt: Date
}

interface UseUploadReturn {
  upload: (file: File) => Promise<UploadResult>
  isUploading: boolean
  progress: number
  error: Error | null
}

export function useUpload(): UseUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  async function upload(file: File): Promise<UploadResult> {
    setIsUploading(true)
    setProgress(0)
    setError(null)

    try {
      // 1. Get presigned upload URL
      const { uploadUrl, fileKey } = await client.storage.requestUploadUrl({
        filename: file.name,
        contentType: file.type,
      })

      // 2. Upload directly to S3
      const xhr = await uploadWithProgress(uploadUrl, file, setProgress)

      if (xhr.status < 200 || xhr.status >= 300) {
        throw new Error(`Upload failed with status ${xhr.status}`)
      }

      // 3. Confirm upload
      const result = await client.storage.confirmUpload({ fileKey })

      setProgress(100)
      return result
    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error('Upload failed')
      setError(uploadError)
      throw uploadError
    } finally {
      setIsUploading(false)
    }
  }

  return { upload, isUploading, progress, error }
}

function uploadWithProgress(
  url: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<XMLHttpRequest> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', file.type)

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 95)) // Reserve 5% for confirm
      }
    })

    xhr.addEventListener('load', () => resolve(xhr))
    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

    xhr.send(file)
  })
}
```

**Step 2: Commit**

```bash
git add apps/frontend/src/hooks/use-upload.ts
git commit -m "feat: add useUpload hook for Web frontend"
```

---

### Task 8: Add `useUpload` hook for mobile (Expo)

**Files:**
- Create: `apps/mobile/src/hooks/use-upload.ts`

**Step 1: Create the hook**

```typescript
import { useState } from 'react'
import { client } from '@/lib/orpc'

interface UploadResult {
  id: string
  fileKey: string
  filename: string
  contentType: string
  url: string
  createdAt: Date
}

interface UseUploadReturn {
  upload: (asset: { uri: string; fileName?: string; mimeType?: string }) => Promise<UploadResult>
  isUploading: boolean
  progress: number
  error: Error | null
}

export function useUpload(): UseUploadReturn {
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | null>(null)

  async function upload(asset: {
    uri: string
    fileName?: string
    mimeType?: string
  }): Promise<UploadResult> {
    setIsUploading(true)
    setProgress(0)
    setError(null)

    const filename = asset.fileName ?? asset.uri.split('/').pop() ?? 'file'
    const contentType = asset.mimeType ?? 'application/octet-stream'

    try {
      // 1. Get presigned upload URL
      const { uploadUrl, fileKey } = await client.storage.requestUploadUrl({
        filename,
        contentType,
      })
      setProgress(10)

      // 2. Upload directly to S3
      const blob = await fetch(asset.uri).then((r) => r.blob())
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: blob,
      })

      if (!response.ok) {
        throw new Error(`Upload failed with status ${response.status}`)
      }
      setProgress(80)

      // 3. Confirm upload
      const result = await client.storage.confirmUpload({ fileKey })

      setProgress(100)
      return result
    } catch (err) {
      const uploadError = err instanceof Error ? err : new Error('Upload failed')
      setError(uploadError)
      throw uploadError
    } finally {
      setIsUploading(false)
    }
  }

  return { upload, isUploading, progress, error }
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/hooks/use-upload.ts
git commit -m "feat: add useUpload hook for Expo mobile"
```

---

### Task 9: Update documentation

**Files:**
- Modify: `docs/backend.md`

**Step 1: Add storage section to backend docs**

Append a new section to `docs/backend.md`:

```markdown
## File Storage (S3 Presigned URLs)

### Architecture

Client-side uploads using S3 presigned URLs. Backend only generates URLs and tracks metadata.

```
Client → requestUploadUrl → Backend (signs URL) → Client
Client → PUT file → S3 (direct upload)
Client → confirmUpload → Backend (verifies + saves metadata)
Client → getDownloadUrl → Backend (signs URL) → Client
```

### Environment Variables

| Variable | Default (dev) | Description |
|----------|---------------|-------------|
| `S3_ENDPOINT` | `http://localhost:9000` | S3-compatible endpoint |
| `S3_REGION` | `us-east-1` | Region |
| `S3_ACCESS_KEY` | `minioadmin` | Access key |
| `S3_SECRET_KEY` | `minioadmin` | Secret key |
| `S3_BUCKET` | `uploads` | Bucket name |

### Local Development

```bash
docker compose up -d    # Start MinIO
# Console: http://localhost:9001 (minioadmin/minioadmin)
```

### Contract Procedures

| Procedure | Input | Output |
|-----------|-------|--------|
| `storage.requestUploadUrl` | `{ filename, contentType }` | `{ uploadUrl, fileKey }` |
| `storage.confirmUpload` | `{ fileKey }` | `FileSchema` (id, url, etc.) |
| `storage.getDownloadUrl` | `{ fileKey }` | `{ downloadUrl }` |

### Client Usage

```tsx
// Web
import { useUpload } from '@/hooks/use-upload'
const { upload, isUploading, progress } = useUpload()
const result = await upload(file) // File object

// Mobile
import { useUpload } from '@/hooks/use-upload'
const { upload, isUploading, progress } = useUpload()
const result = await upload(imagePickerAsset) // { uri, fileName, mimeType }
```

### Production Config

Replace env vars to point at any S3-compatible service:
- **AWS S3**: Set `S3_ENDPOINT` to empty or omit, set region/keys
- **Cloudflare R2**: Set `S3_ENDPOINT` to R2 endpoint
- **Aliyun OSS**: Set `S3_ENDPOINT` to OSS endpoint with `forcePathStyle: true`
```

**Step 2: Commit**

```bash
git add docs/backend.md
git commit -m "docs: add file storage section to backend guide"
```

---

### Task 10: End-to-end verification

**Step 1: Start all services**

```bash
docker compose up -d           # MinIO
bun run dev:backend            # Backend on :4001
```

**Step 2: Create bucket if not exists**

Open http://localhost:9001, login with minioadmin/minioadmin, create bucket `uploads` if not already present.

**Step 3: Test via curl**

```bash
# Login first (get session cookie)
curl -c cookies.txt -X POST http://localhost:4001/api/auth/sign-in/email \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123"}'

# Request upload URL
curl -b cookies.txt -X POST http://localhost:4001/rpc/storage/requestUploadUrl \
  -H 'Content-Type: application/json' \
  -d '{"json":{"filename":"test.txt","contentType":"text/plain"}}'
# Expected: { "json": { "uploadUrl": "http://localhost:9000/uploads/...", "fileKey": "..." } }

# Upload a file (use the uploadUrl from previous response)
echo "hello world" | curl -X PUT "<uploadUrl>" -H 'Content-Type: text/plain' --data-binary @-
# Expected: 200 OK

# Confirm upload (use the fileKey from previous response)
curl -b cookies.txt -X POST http://localhost:4001/rpc/storage/confirmUpload \
  -H 'Content-Type: application/json' \
  -d '{"json":{"fileKey":"<fileKey>"}}'
# Expected: { "json": { "id": "...", "url": "...", "filename": "test.txt", ... } }
```

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete S3 presigned URL file storage"
```
