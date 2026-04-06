# oRPC Usage Reference

System prompt for coding agents. Covers the non-obvious oRPC syntax that models frequently get wrong. For standard Zod / TanStack Query patterns, refer to their own documentation.

## Contract-First Architecture

```
packages/contract/  →  defines all API types (Zod + oc)
apps/backend/       →  implement(contract) enforces handler types
apps/frontend/      →  ContractRouterClient<typeof contract> types the client
apps/mobile/        →  same as frontend
```

The contract is the single source of truth. Frontend and mobile import contract source directly via TypeScript path aliases — no build step.

## Defining Contracts

```ts
import { oc } from '@orpc/contract'
import { z } from 'zod'

// Single procedure contract
export const findPlanet = oc
  .input(z.object({ id: z.string() }))
  .output(PlanetSchema)

// Contract router — plain object, NOT a function call
export const contract = {
  planet: {
    find: findPlanet,
    list: listPlanet,
    create: createPlanet,
  },
}
```

**Streaming procedures** (EventIterator) omit `.output()` — the return type is inferred from the handler's generator:

```ts
export const chatContract = oc
  .input(z.object({
    chatId: z.string(),
    messages: z.custom<UIMessage[]>(),
  }))
  // NO .output() — EventIterator type is inferred
```

## Implementing Contracts (Server)

```ts
import { implement, ORPCError } from '@orpc/server'
import { contract } from '@myapp/contract'

// `os` replaces the generic os from @orpc/server — it is contract-bound
const os = implement(contract).$context<InitialContext>()
```

**Handler pattern:**

```ts
// os.{domain}.{procedure} — NOT os.procedure() or os.create()
export const planetRouter = {
  find: os.planet.find
    .use(authMiddleware)       // chain middleware with .use()
    .handler(async ({ input, context }) => {
      return { id: input.id, name: 'Earth' }
    }),
}
```

**Root router — MUST use `os.router()` for contract enforcement:**

```ts
export const router = os.router({
  planet: planetRouter,
  auth: authRouter,
})
```

## Middleware

**Defining reusable middleware:**

```ts
import { os as baseOs, ORPCError } from '@orpc/server'

// Use baseOs (not the contract-bound os) for shared middleware
export const authMiddleware = baseOs
  .$context<InitialContext>()    // declare what context this middleware needs
  .middleware(async ({ context, next }) => {
    const session = await getSession(context.headers)
    if (!session) throw new ORPCError('UNAUTHORIZED')

    return next({
      context: { user: session.user, session: session.session },
    })
  })
```

**Key rules:**
- Middleware receives `{ context, next, path }` and an optional `input` param
- `next()` MUST be called with `{ context: {...} }` to inject new context (merged, not replaced)
- The return value of `next()` MUST be returned from the middleware
- After `authMiddleware`, `context.user` and `context.session` are available in handlers

**Inline middleware:**

```ts
os.planet.find
  .use(async ({ context, next }) => {
    console.log('before')
    const result = await next()
    console.log('after')
    return result
  })
  .handler(...)
```

**Built-in lifecycle middleware:**

```ts
import { onStart, onSuccess, onError, onFinish } from '@orpc/server'

os.planet.create
  .use(onStart(() => { /* before handler */ }))
  .use(onSuccess(() => { /* handler succeeded */ }))
  .use(onError(() => { /* handler failed */ }))
  .use(onFinish(() => { /* always, after handler */ }))
  .handler(...)
```

## Error Handling (Server)

```ts
import { ORPCError } from '@orpc/server'

// Standard approach — throw with code
throw new ORPCError('NOT_FOUND')
throw new ORPCError('BAD_REQUEST', { message: 'Title required' })
throw new ORPCError('UNAUTHORIZED')
throw new ORPCError('FORBIDDEN')
throw new ORPCError('INTERNAL_SERVER_ERROR')

// With data (CAUTION: data is sent to client, no secrets)
throw new ORPCError('RATE_LIMITED', {
  message: 'Too many requests',
  data: { retryAfter: 60 },
})
```

**Type-safe errors (advanced):**

```ts
const base = os.errors({
  RATE_LIMITED: {
    data: z.object({ retryAfter: z.number() }),
  },
  NOT_FOUND: {
    message: 'Resource not found',  // default message
  },
})

// In handler — use `errors` from context
base.handler(async ({ input, errors }) => {
  throw errors.NOT_FOUND()
  throw errors.RATE_LIMITED({ data: { retryAfter: 60 } })
})
```

## Client Setup

```ts
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { ContractRouterClient } from '@orpc/contract'
import type { contract } from '@myapp/contract'

const link = new RPCLink({
  url: `${API_URL}/rpc`,
  // Web: browser sends cookies
  fetch: (input, init) => fetch(input, { ...init, credentials: 'include' }),
  // Native (React Native): send cookie header manually
  // headers: async () => ({ cookie: await getCookie() }),
})

const client: ContractRouterClient<typeof contract> = createORPCClient(link)
const orpc = createTanstackQueryUtils(client)
```

## Calling Procedures (Direct)

```ts
// Input is the first argument — NOT wrapped in { input: ... }
const planet = await client.planet.find({ id: '123' })
const todos = await client.todo.list({})
await client.todo.create({ title: 'Buy milk' })
```

## TanStack Query Integration

### queryOptions

```ts
// input is wrapped in { input: ... } for queryOptions (different from direct call!)
const { data, isPending } = useQuery(
  orpc.planet.find.queryOptions({ input: { id: '123' } })
)

// No input needed
const { data } = useQuery(orpc.planet.list.queryOptions({ input: {} }))

// With client context
const { data } = useQuery(orpc.planet.find.queryOptions({
  input: { id: '123' },
  context: { cache: true },
}))
```

### mutationOptions

```ts
const { mutate } = useMutation(orpc.planet.create.mutationOptions({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: orpc.planet.key() })
  },
}))

// Input goes in mutate(), NOT in mutationOptions()
mutate({ name: 'Earth' })
```

### infiniteOptions

**IMPORTANT:** `input` is a FUNCTION that receives `pageParam` and returns the query input. You MUST type the `pageParam` parameter.

```ts
const query = useInfiniteQuery(
  orpc.post.feed.infiniteOptions({
    input: (cursor: string | undefined) => ({ cursor, limit: 20 }),
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
)
```

With `skipToken`:

```ts
const query = useInfiniteQuery(
  orpc.post.feed.infiniteOptions({
    input: search
      ? (cursor: string | undefined) => ({ cursor, limit: 20, search })
      : skipToken,
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
  })
)
```

### streamedOptions (Event Iterator queries)

```ts
const query = useQuery(
  orpc.live.experimental_streamedOptions({
    input: { id: '123' },
    queryFnOptions: {
      refetchMode: 'reset',
      maxChunks: 3,
    },
    retry: true,
  })
)
```

### Query / Mutation Keys

```ts
const queryClient = useQueryClient()

// .key() = PARTIAL match — for invalidation, reset, remove
queryClient.invalidateQueries({ queryKey: orpc.planet.key() })          // all planet
queryClient.invalidateQueries({ queryKey: orpc.planet.list.key() })     // all planet.list
queryClient.invalidateQueries({
  queryKey: orpc.planet.find.key({ input: { id: '123' } })              // specific
})

// Filter by operation type
queryClient.invalidateQueries({
  queryKey: orpc.planet.key({ type: 'query' })   // only regular queries, not infinite
})

// .queryKey() = EXACT match — for setQueryData / getQueryData
queryClient.setQueryData(
  orpc.planet.find.queryKey({ input: { id: '123' } }),
  (old) => ({ ...old, name: 'Updated' })
)

// Other exact-match keys
orpc.planet.list.infiniteKey({ ... })   // for infinite queries
orpc.planet.list.streamedKey({ ... })   // for streamed queries
orpc.planet.create.mutationKey({ ... }) // for mutations
```

**Summary table:**

| Operation | Use | Match type |
|-----------|-----|------------|
| `invalidateQueries` | `.key()` | Partial |
| `resetQueries` / `removeQueries` | `.key()` | Partial |
| `setQueryData` / `getQueryData` | `.queryKey()` | Exact |
| `isMutating` | `.mutationKey()` | Exact |

### skipToken

Use `skipToken` to conditionally disable a query. Do NOT combine with `enabled`.

```ts
// Correct
useQuery(orpc.user.find.queryOptions({
  input: userId ? { id: userId } : skipToken,
}))

// WRONG — skipToken and enabled conflict
useQuery(orpc.user.find.queryOptions({
  input: userId ? { id: userId } : skipToken,
  enabled: !!userId,
}))
```

### .call() — alias for direct client call

```ts
const planet = await orpc.planet.find.call({ id: '123' })
// equivalent to: await client.planet.find({ id: '123' })
```

## Error Handling (Client)

```ts
import { isDefinedError, safe } from '@orpc/client'

// Option 1: isDefinedError in TanStack Query callbacks
const mutation = useMutation(orpc.planet.create.mutationOptions({
  onError: (error) => {
    if (isDefinedError(error)) {
      // error.code and error.data are typed from .errors() definitions
      console.log(error.code, error.data)
    }
  },
}))

// Option 2: safe() wrapper — tuple or object destructuring
const [error, data, isDefined] = await safe(client.planet.find({ id: '123' }))
// or: const { error, data, isDefined } = await safe(...)

if (isDefined) {
  // known error from .errors()
} else if (error) {
  // unknown error
} else {
  // success
}
```

## Event Iterator (Streaming)

### Server — producing streams

```ts
import { streamToEventIterator } from '@orpc/server'
import { streamText, convertToModelMessages } from 'ai'

os.ai.chat.use(authMiddleware).handler(async ({ input }) => {
  const result = streamText({
    model: getModel(),
    messages: await convertToModelMessages(input.messages),
  })
  return streamToEventIterator(result.toUIMessageStream())
})
```

**Custom generator:**

```ts
os.live.handler(async function* ({ input, lastEventId }) {
  // lastEventId is provided when client reconnects
  while (true) {
    yield { message: 'tick' }
    await new Promise(r => setTimeout(r, 1000))
  }
})
```

**With event metadata (for reconnection):**

```ts
import { withEventMeta } from '@orpc/server'

yield withEventMeta({ message: 'tick' }, { id: 'evt-123', retry: 10_000 })
```

### Client — consuming streams

```ts
// Basic iteration
const iterator = await client.live.stream()
for await (const event of iterator) {
  console.log(event.message)
}

// With abort
const controller = new AbortController()
const iterator = await client.live.stream(undefined, { signal: controller.signal })
controller.abort() // or: await iterator.return()

// AI SDK integration — use eventIteratorToUnproxiedDataStream (NOT eventIteratorToStream)
import { eventIteratorToUnproxiedDataStream } from '@orpc/client'

const { messages, sendMessage } = useChat({
  transport: {
    async sendMessages(options) {
      return eventIteratorToUnproxiedDataStream(
        await client.ai.chat(
          { chatId: options.chatId, messages: options.messages },
          { signal: options.abortSignal },
        )
      )
    },
    reconnectToStream() {
      throw new Error('Unsupported')
    },
  },
})
```

## Common Pitfalls

### 1. Mutations don't auto-invalidate queries
Always add `onSuccess` with `invalidateQueries`. Put it in hook-level `onSuccess`, not `mutate()` callback.

### 2. Client context is excluded from query keys
Two queries with same input but different `context` share a cache entry. Override `queryKey` manually if context affects the response.

### 3. `safe()` return value
`safe()` returns a tuple `[error, data, isDefined]` OR an object `{ error, data, isDefined }`. It does NOT throw.

### 4. `eventIteratorToUnproxiedDataStream` vs `eventIteratorToStream`
Always use `eventIteratorToUnproxiedDataStream` with AI SDK — it strips oRPC proxies that break `structuredClone`.

### 5. RPC wire format
The `/rpc` handler expects `{"json": {...}}`, NOT `{"input": {...}}`:
```bash
curl -X POST http://localhost:4001/rpc/todo/list \
  -H "Content-Type: application/json" \
  -d '{"json": {}}'
```

### 6. Contract router is a plain object
```ts
// Correct — plain object
export const contract = { planet: { find: findContract } }

// WRONG — not a function
export const contract = oc.router({ ... })  // oc.router does NOT exist
```

### 7. `implement()` replaces `os`
After `const os = implement(contract)`, always use this `os` — never import `os` from `@orpc/server` for building routers.

### 8. Handler input is NOT wrapped
```ts
// In handler — input is direct
.handler(async ({ input }) => {
  input.id  // correct
})

// Direct client call — input is direct
await client.planet.find({ id: '123' })

// TanStack queryOptions — input IS wrapped in { input: ... }
orpc.planet.find.queryOptions({ input: { id: '123' } })
```
