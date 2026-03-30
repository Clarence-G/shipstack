# Frontend Development Guide

System prompt for coding agents working on `apps/frontend`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + Vite |
| Router | React Router DOM v7 |
| Styling | Tailwind CSS v4 (OKLCH color tokens) |
| UI Components | shadcn/ui (Radix Nova style) |
| Icons | lucide-react |
| API Client | oRPC + `@myapp/contract` (contract-first, type-safe) |
| Auth | Better Auth (browser cookies) |
| Data Fetching | TanStack Query |
| Toasts | Sonner |
| Font | Geist Variable |

## Project Structure

```
apps/frontend/
├── components.json              # shadcn/ui CLI config
├── vite.config.ts               # Vite + Tailwind plugin, proxy, path alias
├── tsconfig.json                # Path aliases: @/*, @myapp/contract
├── index.html                   # SPA entry
└── src/
    ├── main.tsx                 # ReactDOM root, QueryClient, BrowserRouter, Toaster
    ├── app.tsx                  # Route definitions
    ├── app.css                  # Tailwind v4 + OKLCH theme variables
    ├── vite-env.d.ts            # VITE_API_URL type
    ├── layouts/
    │   └── root.layout.tsx      # Header nav + <Outlet />
    ├── pages/
    │   ├── home.tsx             # Home (auth guard)
    │   └── auth/
    │       ├── login.tsx        # Login form
    │       └── register.tsx     # Register form
    ├── components/
    │   ├── ui/                  # shadcn/ui components (CLI-generated)
    │   │   ├── button.tsx
    │   │   ├── input.tsx
    │   │   ├── card.tsx
    │   │   └── sonner.tsx
    │   ├── biz/                 # Business components
    │   │   └── chat.tsx         # AI chat (oRPC streaming)
    │   └── shared/              # Shared components
    └── lib/
        ├── orpc.ts              # oRPC client + TanStack Query utils
        ├── auth-client.ts       # Better Auth client (throwOnError wrappers)
        └── utils.ts             # cn() helper (clsx + tailwind-merge)
```

## Path Aliases

```
@/*            → ./src/*
@myapp/contract → ../../packages/contract/src
```

Use `@/` for all imports:

```ts
import { Button } from '@/components/ui/button'
import { client, orpc } from '@/lib/orpc'
import { useSession } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
```

## Vite Dev Server

```ts
// vite.config.ts
server: {
  host: '0.0.0.0',
  port: 4000,
  strictPort: true,
  proxy: {
    '/api': 'http://localhost:4001',
    '/rpc': 'http://localhost:4001',
  },
}
```

- Frontend: `http://localhost:4000`
- All `/api/*` and `/rpc/*` requests are proxied to the backend
- `strictPort: true` — fails if port 4000 is occupied

## Routing (React Router v7)

Routes are defined in `src/app.tsx`:

```tsx
import { Routes, Route } from 'react-router-dom'

export function App() {
  return (
    <Routes>
      <Route element={<RootLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
      </Route>
    </Routes>
  )
}
```

**Adding a new route:**

1. Create the page in `src/pages/`
2. Add `<Route>` in `src/app.tsx`

**Navigation:**

```tsx
import { useNavigate, Link } from 'react-router-dom'

// Programmatic
const navigate = useNavigate()
navigate('/')              // push
navigate('/auth/login', { replace: true })  // replace

// Declarative
<Link to="/todos">Todos</Link>
```

**Layout** — `RootLayout` renders a header with nav and `<Outlet />` for child routes.

## Styling (Tailwind CSS v4)

Uses `@tailwindcss/vite` plugin. Styles defined in `src/app.css`.

**Theme tokens** — OKLCH color space, light/dark via `.dark` class:

```
bg-background, text-foreground        # page background / text
bg-card, text-card-foreground         # card surfaces
bg-primary, text-primary-foreground   # primary buttons
bg-secondary, text-secondary-foreground
bg-muted, text-muted-foreground       # subtle text
bg-accent, text-accent-foreground
bg-destructive                        # error/delete
border-border, border-input           # borders
```

**`cn()` utility** — conditionally combine Tailwind classes:

```ts
import { cn } from '@/lib/utils'

<div className={cn('rounded-lg p-4', isActive && 'bg-accent', className)} />
```

**Dark mode** — managed by `next-themes` via `.dark` class on `<html>`.

## UI Components (shadcn/ui)

Components live in `src/components/ui/`. Style: `radix-nova`, base color: `neutral`.

### Installed components

**Button** — CVA-based with variants and sizes:

```tsx
import { Button } from '@/components/ui/button'

<Button>Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Delete</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>
<Button variant="secondary">Secondary</Button>

<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><PlusIcon /></Button>
```

Variants: `default`, `outline`, `secondary`, `ghost`, `destructive`, `link`
Sizes: `default`, `xs`, `sm`, `lg`, `icon`, `icon-xs`, `icon-sm`, `icon-lg`

**Button as link** — use `asChild`:

```tsx
<Button asChild variant="outline">
  <Link to="/products">Browse Products</Link>
</Button>
```

`asChild` merges Button styles onto the child element via Radix Slot.

**Input:**

```tsx
import { Input } from '@/components/ui/input'

<Input type="email" placeholder="you@example.com" />
```

**Card:**

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from '@/components/ui/card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
    <CardAction><Button size="icon-sm"><MoreHorizontal /></Button></CardAction>
  </CardHeader>
  <CardContent>Content here</CardContent>
  <CardFooter>Footer</CardFooter>
</Card>

<Card size="sm">{/* compact variant */}</Card>
```

**Toasts (Sonner):**

```tsx
import { toast } from 'sonner'

toast.success('Saved!')
toast.error('Something went wrong')
toast.info('FYI...')
toast.warning('Watch out')
```

The `<Toaster />` is already mounted in `src/main.tsx`. Global mutation errors auto-toast via QueryClient config.

### Adding new components

```bash
cd apps/frontend
bunx shadcn@latest add dialog table dropdown-menu
```

Config is in `components.json`. Components are generated into `src/components/ui/`.

## oRPC Client

The client is in `src/lib/orpc.ts`. Uses browser cookies for auth (`credentials: 'include'`).

```ts
import { client, orpc } from '@/lib/orpc'
```

### Direct calls (outside React)

```ts
const user = await client.auth.me({})
const todos = await client.todo.list({})
```

### TanStack Query (inside React components)

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

// Query
const { data, isPending } = useQuery(orpc.todo.list.queryOptions({ input: {} }))

// Mutation with cache invalidation
const queryClient = useQueryClient()
const { mutate } = useMutation(orpc.todo.create.mutationOptions({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: orpc.todo.key() })
  },
}))
mutate({ title: 'Buy milk' })
```

**Protected queries** — gate on session:

```tsx
const { data: session } = useSession()
const { data } = useQuery({
  ...orpc.todo.list.queryOptions({ input: {} }),
  enabled: !!session,
})
```

**Cache invalidation:**

```ts
// .key() = partial match — invalidate all variants
queryClient.invalidateQueries({ queryKey: orpc.todo.key() })
queryClient.invalidateQueries({ queryKey: orpc.todo.list.key() })

// .queryKey() = exact match — direct cache update
queryClient.setQueryData(
  orpc.todo.find.queryKey({ input: { id: '123' } }),
  updatedTodo,
)
```

| Operation | Use | Why |
|-----------|-----|-----|
| `invalidateQueries` | `.key()` | Partial match — all variants |
| `setQueryData` / `getQueryData` | `.queryKey()` | Exact match — precise cache entry |

### Pitfalls

**Mutations don't auto-invalidate.** Always invalidate in `onSuccess`:

```ts
const { mutate } = useMutation(orpc.todo.create.mutationOptions({
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: orpc.todo.key() })
  },
}))
```

Put invalidation in hook-level `onSuccess`, not `mutate()` callback — the latter won't fire if the component unmounts.

**Don't combine `skipToken` with `enabled`:**

```ts
// Correct — skipToken alone
useQuery(orpc.user.find.queryOptions({
  input: userId ? { id: userId } : skipToken,
}))

// Wrong — conflict
useQuery(orpc.user.find.queryOptions({
  input: userId ? { id: userId } : skipToken,
  enabled: !!userId,  // conflicts with skipToken
}))
```

**Don't copy query data into `useState`:**

```ts
// Wrong — stale after background refetch
const { data } = useQuery(orpc.user.me.queryOptions({}))
const [user, setUser] = useState(data)

// Correct — always fresh
const { data: user } = useQuery(orpc.user.me.queryOptions({}))
```

**Global `onError` toast may duplicate.** The QueryClient has a global `mutations.onError` that toasts. If you add local `onError`, both fire. Handle known errors locally and let unknown ones fall through.

**`staleTime` is 60s globally.** Override per-query:

```ts
useQuery(orpc.messages.queryOptions({ staleTime: 0 }))             // realtime
useQuery(orpc.settings.queryOptions({ staleTime: 5 * 60 * 1000 })) // rarely changes
```

## Authentication

Auth is handled by Better Auth with browser cookies. The Vite proxy forwards `/api/auth/*` to the backend.

### Auth client (`src/lib/auth-client.ts`)

```ts
import { useSession, signIn, signUp, signOut } from '@/lib/auth-client'
```

- `useSession()` — React hook, returns `{ data: session, isPending }`
- `signIn.email({ email, password })` — throws on error
- `signUp.email({ email, password, name })` — throws on error
- `signOut()` — throws on error

All wrapped in `throwOnError` — use `try/catch`:

```ts
try {
  await signIn.email({ email, password })
  navigate('/')
} catch (err) {
  setError(err instanceof Error ? err.message : 'Login failed')
}
```

### Auth guard pattern

```tsx
export function ProtectedPage() {
  const { data: session, isPending } = useSession()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isPending && !session) navigate('/auth/login')
  }, [session, isPending, navigate])

  if (isPending) return <div>Loading...</div>
  if (!session) return null

  return <div>Protected content for {session.user.name}</div>
}
```

## Error Handling

All errors unified to `try/catch`:

- **Better Auth** — wrapped in `throwOnError`, throws `Error`
- **oRPC** — throws `ORPCError` natively
- **Global fallback** — `QueryClient` `mutations.onError` toasts via Sonner

**Type-safe error handling:**

```ts
import { isDefinedError } from '@orpc/client'

onError: (error) => {
  if (isDefinedError(error)) {
    // error.code and error.data are fully typed
  }
}
```

## AI Chat Integration

The `Chat` component (`src/components/biz/chat.tsx`) uses AI SDK's `useChat` with oRPC streaming:

```tsx
import { useChat } from '@ai-sdk/react'
import { eventIteratorToUnproxiedDataStream } from '@orpc/client'
import { client } from '@/lib/orpc'

const { messages, sendMessage, status } = useChat({
  transport: {
    async sendMessages(options) {
      const iter = await client.ai.chat(
        { chatId, messages: options.messages },
        { signal: options.abortSignal },
      )
      return eventIteratorToUnproxiedDataStream(iter as any)
    },
    reconnectToStream() {
      throw new Error('Unsupported')
    },
  },
})
```

Requires authenticated session and `AI_API_KEY` on backend.

## Building a New Page — Full Pattern

Example: adding a Todos page.

### 1. Create the page

```tsx
// src/pages/todos.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/lib/auth-client'
import { orpc } from '@/lib/orpc'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'

export function TodosPage() {
  const { data: session, isPending: authPending } = useSession()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!authPending && !session) navigate('/auth/login')
  }, [session, authPending, navigate])

  const { data: todos, isPending } = useQuery({
    ...orpc.todo.list.queryOptions({ input: {} }),
    enabled: !!session,
  })

  const { mutate: createTodo } = useMutation(orpc.todo.create.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.todo.key() })
    },
  }))

  if (authPending || isPending) return <div>Loading...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Todos</h1>
        <Button onClick={() => createTodo({ title: 'New todo' })}>Add Todo</Button>
      </div>
      <div className="space-y-2">
        {todos?.map((todo) => (
          <Card key={todo.id}>
            <CardContent className="py-3">
              <span>{todo.title}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

### 2. Add the route

```tsx
// src/app.tsx
import { TodosPage } from './pages/todos'

<Route path="/todos" element={<TodosPage />} />
```

### 3. Add nav link (optional)

```tsx
// src/layouts/root.layout.tsx — inside nav
<Link to="/todos" className="text-sm hover:underline">Todos</Link>
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `http://localhost:3001` | Backend URL (only used outside proxy) |

In development the Vite proxy handles `/api` and `/rpc` routing, so `VITE_API_URL` can be empty. In production, set it to the actual backend URL.

Access: `import.meta.env.VITE_API_URL`

## QueryClient Configuration

Configured in `src/main.tsx`:

```ts
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,           // 60s before refetch
      retry(failureCount, error) {
        if (error.message?.includes('UNAUTHORIZED')) return false
        return failureCount < 1        // retry once for non-auth errors
      },
    },
    mutations: {
      onError(error) {
        toast.error(error.message ?? 'Something went wrong')  // global toast
      },
    },
  },
})
```

## Key Differences from Mobile

| Aspect | Frontend (Web) | Mobile |
|--------|---------------|--------|
| UI library | shadcn/ui | React Native Reusables |
| Add component | `bunx shadcn add X` | `npx @react-native-reusables/cli add X` |
| Router | react-router-dom v7 | expo-router (file-based) |
| Auth storage | Browser cookies (auto) | expo-secure-store |
| oRPC auth | `credentials: 'include'` | `headers: { cookie: getCookie() }` |
| Error display | `toast()` (Sonner) | `Alert.alert()` |
| Dark mode | `.dark` class (next-themes) | `useUniwind()` theme |
| Proxy | Vite proxy `/api` + `/rpc` | Direct to backend URL |
