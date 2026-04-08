import { createAuthClient } from 'better-auth/react'
import { Platform } from 'react-native'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4001'

function createPlugins() {
  if (Platform.OS === 'web') return []
  // expo-secure-store crashes on Web — only load on native
  const { expoClient } = require('@better-auth/expo/client')
  const SecureStore = require('expo-secure-store')
  return [
    expoClient({
      scheme: 'myapp',
      storagePrefix: 'myapp',
      storage: SecureStore,
    }),
  ]
}

const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: createPlugins(),
})

/**
 * Better Auth session hook — use in components for auth state.
 */
export const { useSession } = authClient

/**
 * Get stored cookie header for authenticated fetch requests (native only).
 * On Web, returns undefined — browser manages cookies automatically.
 */
export const getCookie = Platform.OS !== 'web' ? authClient.getCookie : async () => undefined

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
