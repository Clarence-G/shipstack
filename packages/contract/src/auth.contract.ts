import { oc } from '@orpc/contract'
import { z } from 'zod'

/**
 * User schema — shared output type for auth procedures.
 */
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  image: z.string().nullable().optional(),
  createdAt: z.date(),
})

/**
 * Auth contract.
 *
 * Login/register/logout are handled by Better Auth's own HTTP endpoints (/api/auth/*).
 * The oRPC contract only exposes `me` for fetching the current user in a type-safe way.
 */
export const authContract = {
  /**
   * Get the currently authenticated user's profile.
   * Requires a valid session (authMiddleware).
   */
  me: oc.input(z.object({})).output(UserSchema),
}
