import { os } from '../orpc'
import { authRouter } from './auth.router'
import { aiRouter } from './ai.router'

/**
 * Root router — assembled from all domain routers.
 * os.router() ensures full contract enforcement at runtime.
 */
export const router = os.router({
  auth: authRouter,
  ai: aiRouter,
})

export type AppRouter = typeof router
