import type { contract } from '@myapp/contract'
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import type { ContractRouterClient } from '@orpc/contract'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'

const link = new RPCLink({
  url: `${import.meta.env.VITE_API_URL ?? window.location.origin}/rpc`,
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
