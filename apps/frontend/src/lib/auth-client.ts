import { createAuthClient } from 'better-auth/react'

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? '',
})

/**
 * Better Auth client hooks & methods.
 * Login/register/logout go through Better Auth directly (not oRPC).
 */
export const { signIn, signUp, signOut, useSession } = authClient
