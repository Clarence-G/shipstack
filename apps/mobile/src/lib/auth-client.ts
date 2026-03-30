import { createAuthClient } from 'better-auth/react'
import { expoClient } from '@better-auth/expo/client'
import * as SecureStore from 'expo-secure-store'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4001'

const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: [
    expoClient({
      scheme: 'myapp',
      storagePrefix: 'myapp',
      storage: SecureStore,
    }),
  ],
})

/**
 * Better Auth session hook — use in components for auth state.
 */
export const { useSession } = authClient

/**
 * Get stored cookie header for authenticated fetch requests (oRPC, etc.).
 */
export const getCookie = authClient.getCookie

/**
 * Wrap a Better Auth method so it throws on error instead of returning { data, error }.
 * This unifies error handling: both oRPC (throws ORPCError) and Better Auth use try/catch.
 */
function throwOnError<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
) {
  return async (...args: TArgs) => {
    const result = await fn(...args)
    if (
      result &&
      typeof result === 'object' &&
      'error' in result &&
      (result as any).error
    ) {
      throw new Error((result as any).error.message ?? 'Unknown error')
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
