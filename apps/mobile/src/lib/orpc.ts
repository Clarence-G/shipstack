import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { ContractRouterClient } from '@orpc/contract'
import type { contract } from '@myapp/contract'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

const link = new RPCLink({
  url: `${API_URL}/rpc`,
  fetch: (url, options) => fetch(url, { ...options, credentials: 'include' }),
})

/**
 * Type-safe oRPC client — typed from contract only, zero server dependency.
 */
export const client: ContractRouterClient<typeof contract> = createORPCClient(link)

/**
 * TanStack Query utils — use orpc.xxx.queryOptions() / mutationOptions() in components.
 */
export const orpc = createTanstackQueryUtils(client)
