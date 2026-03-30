import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import { Platform } from 'react-native'
import type { ContractRouterClient } from '@orpc/contract'
import type { contract } from '@myapp/contract'

import { getCookie } from './auth-client'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4001'

const link = new RPCLink({
  url: `${API_URL}/rpc`,
  // Native: send cookie header from SecureStore
  ...(Platform.OS !== 'web' && {
    headers: async () => ({
      cookie: await getCookie(),
    }),
  }),
  // Web: let the browser send cookies automatically
  fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
})

/**
 * Type-safe oRPC client — typed from contract only, zero server dependency.
 */
export const client: ContractRouterClient<typeof contract> = createORPCClient(link)

/**
 * TanStack Query utils — use orpc.xxx.queryOptions() / mutationOptions() in components.
 */
export const orpc = createTanstackQueryUtils(client)
