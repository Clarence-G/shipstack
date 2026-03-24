# oRPC Full-Stack Scaffold Design

**Date:** 2026-03-24
**Status:** Approved
**Stack:** Bun + React + Hono + oRPC + Better Auth + Drizzle ORM + AI SDK

---

## Overview

A monorepo scaffold/template optimized for AI-generated full-stack projects. The AI reads this scaffold, understands the conventions, and generates new projects that follow the same patterns.

**Core principle:** Contract-first. The `packages/contract` package is the single source of truth for all API types. Backend implements the contract; frontend consumes only types — zero runtime dependency on backend code.

---

## Monorepo Structure

```
orpc-template/
├── package.json                    ← Bun workspaces root
├── tsconfig.base.json              ← Shared TS config
├── .env.example
├── docs/
│   └── plans/                      ← Design docs live here
│
├── packages/
│   └── contract/                   ← @myapp/contract
│       ├── package.json            ← composite: true
│       ├── tsconfig.json
│       └── src/
│           ├── auth.contract.ts
│           ├── ai.contract.ts
│           └── index.ts
│
└── apps/
    ├── backend/                    ← @myapp/backend
    │   ├── package.json
    │   ├── tsconfig.json           ← references: ["../../packages/contract"]
    │   └── src/
    │       ├── index.ts            ← Hono app entry
    │       ├── db/
    │       │   ├── index.ts        ← Drizzle client
    │       │   └── schema.ts       ← Better Auth tables + chat_messages
    │       ├── lib/
    │       │   ├── auth.ts         ← Better Auth init (Drizzle adapter)
    │       │   └── ai.ts           ← AI SDK util (createOpenAI + streamText)
    │       ├── middlewares/
    │       │   └── auth.middleware.ts  ← Better Auth session → oRPC context
    │       └── routers/
    │           ├── auth.router.ts
    │           ├── ai.router.ts
    │           └── index.ts
    │
    └── frontend/                   ← @myapp/frontend
        ├── package.json
        ├── tsconfig.json           ← references: ["../../packages/contract"]
        ├── vite.config.ts
        ├── tailwind.config.ts
        └── src/
            ├── main.tsx
            ├── lib/
            │   └── orpc.ts         ← RPCLink + createTanstackQueryUtils
            ├── components/
            │   ├── ui/             ← shadcn: button, input, form, card, toast
            │   ├── shared/         ← Generic business components
            │   └── biz/
            │       └── chat.tsx    ← AI chat component (optional)
            ├── layouts/
            │   └── root.layout.tsx
            └── pages/
                ├── home.tsx
                └── auth/
                    ├── login.tsx
                    └── register.tsx
```

---

## Package Dependency Graph

```
@myapp/contract  ←── @myapp/backend   (implements contract via implement())
      ↑
      └────────── @myapp/frontend      (import type only, zero runtime dep)
```

TypeScript project references enforce this at compile time. Frontend's tsconfig `references` the contract package; it never imports implementation code.

---

## Contract API Surface (packages/contract)

### auth.contract.ts
| Procedure | Input | Output | Auth required |
|-----------|-------|--------|---------------|
| `auth.register` | `{ email, password, name }` | `{ user: { id, email, name } }` | No |
| `auth.login` | `{ email, password }` | `{ user: { id, email, name } }` | No |
| `auth.logout` | `{}` | `{ success: true }` | No |
| `auth.me` | `{}` | `{ id, email, name, createdAt }` | Yes |

### ai.contract.ts
| Procedure | Input | Output | Auth required |
|-----------|-------|--------|---------------|
| `ai.chat` | `{ chatId: string, messages: UIMessage[] }` | `EventIterator<UIMessageStreamPart>` | Yes |

---

## Data Flow

### Standard Request
```
Frontend (useQuery/useMutation)
  → orpc.xxx.queryOptions()         ← @orpc/tanstack-query
  → RPCLink → POST /rpc             ← HTTP to Hono
  → RPCHandler
  → authMiddleware (if required)    ← Better Auth session → context.user
  → router handler
  → Better Auth API / Drizzle / AI SDK
  → typed response
```

### AI Streaming
```
Frontend useChat
  → eventIteratorToUnproxiedDataStream(client.ai.chat(...))
  → POST /rpc
  → RPCHandler → ai.router handler
  → createChatStream() → streamToEventIterator()
  → SSE stream back to client
```

---

## Backend Details

### Hono Mount Points
| Path | Handler | Description |
|------|---------|-------------|
| `/api/auth/*` | Better Auth | Session, OAuth, email/password |
| `/rpc/*` | oRPC RPCHandler | All business procedures |
| `/scalar` | Scalar UI | OpenAPI docs (dev only) |

### Context Types
```ts
// Initial context (injected by Hono)
type InitialContext = { headers: Headers }

// Authenticated context (expanded by authMiddleware)
type AuthContext = InitialContext & {
  user: { id: string; email: string; name: string }
}
```

### Predefined Errors (on base builder)
- `UNAUTHORIZED` — accessing protected procedure without valid session
- `VALIDATION_ERROR` — Zod input validation failure (handled automatically)

### Drizzle Schema
- Better Auth required tables: `user`, `session`, `account`, `verification`
- Business table: `chat_messages` (for AI chat history)

### AI Util (src/lib/ai.ts)
Uses `@ai-sdk/openai` with `createOpenAI({ apiKey, baseURL })`. Compatible with any OpenAI-format provider (OpenAI, DeepSeek, Azure, Ollama, etc.). Model configured via env var.

---

## Frontend Details

### Routing (React Router v6)
```
/                → root.layout.tsx (shell with nav)
├── /            → home.tsx
├── /auth/login  → auth/login.tsx
└── /auth/register → auth/register.tsx
```

Auth guard at router level using `orpc.auth.me` query result.

### oRPC Client (src/lib/orpc.ts)
```ts
const link = new RPCLink({ url: `${import.meta.env.VITE_API_URL}/rpc` })
export const client = createORPCClient<AppRouter>(link)
export const orpc = createTanstackQueryUtils(client)
```

### Tailwind Theme
CSS variables following shadcn/ui design token conventions (`--background`, `--foreground`, `--primary`, etc.). AI-generated pages use tokens only — no hardcoded color values.

### Preinstalled shadcn Components
`button`, `input`, `form`, `card`, `toast` — minimal baseline. Others added by AI on demand.

### AI Chat Component (components/biz/chat.tsx)
Optional component using `useChat` from `@ai-sdk/react` with custom transport:
```ts
transport: {
  sendMessages: (options) =>
    eventIteratorToUnproxiedDataStream(
      await client.ai.chat({ chatId, messages: options.messages },
        { signal: options.abortSignal })
    )
}
```

---

## Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/myapp
BETTER_AUTH_SECRET=your-secret-here
BETTER_AUTH_URL=http://localhost:3001

# AI - compatible with any OpenAI-format provider
AI_API_KEY=your-api-key-here
AI_BASE_URL=https://api.openai.com/v1   # DeepSeek: https://api.deepseek.com/v1
AI_MODEL=gpt-4o-mini                    # DeepSeek: deepseek-chat
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
```

---

## Key Packages

### packages/contract
- `@orpc/contract` — contract-first procedure definitions
- `zod` — schema validation

### apps/backend
- `hono` — web framework
- `@orpc/server` — oRPC server + RPCHandler
- `@orpc/openapi` — OpenAPI spec generation
- `better-auth` — authentication
- `drizzle-orm`, `postgres` — database ORM
- `ai`, `@ai-sdk/openai` — AI SDK v5

### apps/frontend
- `react`, `react-dom`, `react-router-dom`
- `@orpc/client`, `@orpc/tanstack-query`
- `@tanstack/react-query`
- `@ai-sdk/react` — useChat hook
- `tailwindcss`, shadcn/ui components
- `vite`
