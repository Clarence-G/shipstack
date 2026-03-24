import { os, authMiddleware } from '../orpc'

export const authRouter = {
  /**
   * Get the currently authenticated user's profile.
   * Delegates to Better Auth session data already in context.
   */
  me: os.auth.me
    .use(authMiddleware)
    .handler(async ({ context }) => {
      return {
        id: context.user.id,
        email: context.user.email,
        name: context.user.name,
        createdAt: context.user.createdAt,
      }
    }),
}
