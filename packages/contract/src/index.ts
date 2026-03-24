export { authContract, UserSchema } from './auth.contract'
export { aiContract } from './ai.contract'

import { authContract } from './auth.contract'
import { aiContract } from './ai.contract'

/**
 * Root contract — the single source of truth for all API types.
 *
 * Backend: `implement(contract)` to create type-safe handlers.
 * Frontend: `ContractRouterClient<typeof contract>` for typed client.
 */
export const contract = {
  auth: authContract,
  ai: aiContract,
}
