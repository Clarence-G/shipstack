import { oc } from '@orpc/contract'
import { z } from 'zod'

/**
 * File schema — shared output type for storage procedures.
 */
export const FileSchema = z.object({
  id: z.string(),
  fileKey: z.string(),
  filename: z.string(),
  contentType: z.string(),
  url: z.string(),
  createdAt: z.date(),
})

/**
 * Storage contract.
 *
 * Provides S3-compatible file upload/download via presigned URLs.
 */
export const storageContract = {
  /**
   * Request a presigned upload URL for a new file.
   */
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

  /**
   * Confirm that a file has been uploaded and persist its metadata.
   */
  confirmUpload: oc
    .input(
      z.object({
        fileKey: z.string().min(1),
      }),
    )
    .output(FileSchema),

  /**
   * Get a presigned download URL for an existing file.
   */
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
