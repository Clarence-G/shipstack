import { os } from '../orpc'
import { aiRouter } from './ai.router'
import { authRouter } from './auth.router'
import { storageRouter } from './storage.router'

/**
 * Root router — assembled from all domain routers.
 * os.router() ensures full contract enforcement at runtime.
 */
export const router = os.router({
  auth: authRouter,
  ai: aiRouter,
  storage: storageRouter,
})

export type AppRouter = typeof router
