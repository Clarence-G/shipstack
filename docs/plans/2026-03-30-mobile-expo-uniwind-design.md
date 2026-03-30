# Mobile App Design: Expo + Uniwind + oRPC

**Date:** 2026-03-30
**Status:** Approved

## Goal

Add an `apps/mobile` Expo project to the monorepo, using Uniwind for Tailwind CSS styling and reusing the shared oRPC contract for type-safe API calls.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Location | `apps/mobile` | Matches `apps/*` workspace pattern |
| Template | `create-expo-app -e with-router-uniwind` | SDK 54, Uniwind + Expo Router pre-configured |
| Navigation | Expo Router (file-based) | Zero config, aligns with frontend's react-router concept |
| Styling | Uniwind (Tailwind v4 for RN) | 2x faster than NativeWind, no Babel preset, Tailwind v4 |
| API Client | oRPC + `@myapp/contract` | Same type-safe pattern as frontend |
| Auth | Better Auth client | Reuse `throwOnError` pattern from frontend |
| Initial pages | Login, Register, Home | Minimal auth flow + landing page |

## Architecture

```
packages/contract ──► apps/mobile (oRPC client, same types)
                  ──► apps/frontend (existing)
                  ──► apps/backend (existing)
```

## Directory Structure

```
apps/mobile/
├── app/                    # Expo Router file routes
│   ├── _layout.tsx         # Root Layout (QueryProvider, AuthGuard)
│   ├── index.tsx           # Home (user info, logout)
│   └── auth/
│       ├── _layout.tsx     # Auth layout (no auth required)
│       ├── login.tsx       # Email/password login
│       └── register.tsx    # Email/password register
├── src/
│   ├── lib/
│   │   ├── orpc.ts         # oRPC client (reuses contract)
│   │   └── auth-client.ts  # Better Auth client (throwOnError pattern)
│   └── global.css          # @import 'tailwindcss'; @import 'uniwind';
├── metro.config.js         # withUniwindConfig (outermost wrapper)
├── app.json                # Expo config
├── tsconfig.json           # Extends base, adds path aliases
└── package.json            # @myapp/mobile
```

## oRPC Client

Same pattern as frontend, adapted for Expo environment variables:

```ts
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

const link = new RPCLink({
  url: `${API_URL}/rpc`,
  fetch: (url, options) => fetch(url, { ...options, credentials: 'include' }),
})

export const client = createORPCClient(link)
```

TanStack Query integration via `@orpc/tanstack-query` for React hooks.

## Better Auth Client

```ts
import { createAuthClient } from 'better-auth/react'

const authClient = createAuthClient({
  baseURL: process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001',
})

export const { useSession } = authClient
// + throwOnError wrappers for signIn, signUp, signOut
```

## Monorepo Integration

- Workspace name: `@myapp/mobile`
- Root `package.json`: add `dev:mobile` script
- `global.css`: add `@source '../../packages/contract'` for Tailwind scanning
- Root `dev` script updated to include mobile option

## Environment Variables

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Backend URL (default: `http://localhost:3001`) |

## Out of Scope (YAGNI)

- AI chat (EventIterator needs RN adapter, add later)
- Offline storage / local caching
- Push notifications
- Custom native navigation animations
- Deep linking configuration
