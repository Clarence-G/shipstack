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
 * Auth middleware — validates session, injects user + session into context.
 * Throws UNAUTHORIZED if no valid session exists.
 *
 * @example
 * os.todo.list.use(authMiddleware).handler(async ({ context }) => {
 *   const userId = context.user.id  // guaranteed to exist
 * })
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

/**
 * Optional auth middleware — injects user into context if session exists, skips if not.
 * Use on procedures that work for both authenticated and anonymous users.
 *
 * After this middleware, context contains:
 * - `context.user` — user object if authenticated, undefined if not
 * - `context.session` — session object if authenticated, undefined if not
 *
 * @example
 * os.post.list.use(optionalAuthMiddleware).handler(async ({ context }) => {
 *   const userId = context.user?.id  // may be undefined
 * })
 */
export const optionalAuthMiddleware = baseOs
  .$context<InitialContext>()
  .middleware(async ({ context, next }) => {
    const sessionData = await auth.api.getSession({
      headers: context.headers,
    })

    return next({
      context: {
        user: sessionData?.user ?? undefined,
        session: sessionData?.session ?? undefined,
      },
    })
  })
