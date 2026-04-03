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
