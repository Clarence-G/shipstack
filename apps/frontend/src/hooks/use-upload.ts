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
