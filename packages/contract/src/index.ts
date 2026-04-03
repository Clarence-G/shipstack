export { aiContract } from './ai.contract'
export { authContract, UserSchema } from './auth.contract'
export { FileSchema, storageContract } from './storage.contract'

import { aiContract } from './ai.contract'
import { authContract } from './auth.contract'
import { storageContract } from './storage.contract'

/**
 * Root contract — the single source of truth for all API types.
 *
 * Backend: `implement(contract)` to create type-safe handlers.
 * Frontend: `ContractRouterClient<typeof contract>` for typed client.
 */
export const contract = {
  auth: authContract,
  ai: aiContract,
  storage: storageContract,
}
