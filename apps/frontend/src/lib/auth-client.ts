import { createAuthClient } from 'better-auth/react'

const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_API_URL ?? '',
})

/**
 * Better Auth session hook — use in components for auth state.
 */
export const { useSession } = authClient

/**
 * Wrap a Better Auth method so it throws on error instead of returning { data, error }.
 * This unifies error handling: both oRPC (throws ORPCError) and Better Auth use try/catch.
 */
function throwOnError<TArgs extends unknown[], TReturn>(fn: (...args: TArgs) => Promise<TReturn>) {
  return async (...args: TArgs) => {
    const result = await fn(...args)
    if (result && typeof result === 'object' && 'error' in result) {
      const err = (result as { error: { message?: string } | null }).error
      if (err) throw new Error(err.message ?? 'Unknown error')
    }
    return result
  }
}

export const signIn = {
  email: throwOnError(authClient.signIn.email),
}

export const signUp = {
  email: throwOnError(authClient.signUp.email),
}

export const signOut = throwOnError(authClient.signOut)
