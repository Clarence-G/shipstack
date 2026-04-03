import { contract } from '@myapp/contract'
import { os as baseOs, implement, ORPCError } from '@orpc/server'
import { auth } from './lib/auth'

/**
 * Initial context type — injected by the Hono handler on every request.
 */
export interface InitialContext {
  headers: Headers
}

/**
 * oRPC implementer — created from the contract with typed initial context.
 * Replaces `os` from @orpc/server in contract-first mode.
 */
export const os = implement(contract).$context<InitialContext>()

/**
 * Auth middleware — bridges Better Auth session into oRPC context.
 * Validates session from request headers, injects user + session into context.
 */
export const authMiddleware = baseOs
  .$context<InitialContext>()
  .middleware(async ({ context, next }) => {
    const sessionData = await auth.api.getSession({
      headers: context.headers,
    })

    if (!sessionData?.session || !sessionData?.user) {
      throw new ORPCError('UNAUTHORIZED')
    }

    return next({
      context: {
        session: sessionData.session,
        user: sessionData.user,
      },
    })
  })
