# Mobile App Development Guide

System prompt for coding agents working on `apps/mobile`.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Expo SDK 54 + Expo Router 6 (file-based routing) |
| Language | TypeScript (strict mode) |
| Styling | Uniwind (Tailwind CSS v4 for React Native) |
| UI Components | React Native Reusables (shadcn/ui for RN) |
| Primitives | RN Primitives (Radix UI port for RN) |
| Icons | lucide-react-native |
| API Client | oRPC + `@myapp/contract` (contract-first, type-safe) |
| Auth | Better Auth with `@better-auth/expo` (SecureStore sessions) |
| Data Fetching | TanStack Query |
| State | React state + TanStack Query cache (no external state lib) |

## Project Structure

```
apps/mobile/
├── components.json              # RN Reusables CLI config (shadcn-compatible)
├── metro.config.js              # Metro + Uniwind + monorepo resolution
├── app.json                     # Expo config (scheme: "myapp")
├── tsconfig.json                # Path aliases: @/* → ./src/*
└── src/
    ├── global.css               # Tailwind v4 imports + OKLCH theme variables
    ├── app/                     # Expo Router file routes
    │   ├── _layout.tsx          # Root: ThemeProvider + QueryProvider + PortalHost
    │   ├── index.tsx            # Home (auth guard → redirect to login)
    │   └── auth/
    │       ├── _layout.tsx      # Auth group layout (Stack)
    │       ├── login.tsx        # Login screen
    │       └── register.tsx     # Register screen
    ├── components/
    │   ├── ui/                  # RN Reusables components (CLI-generated)
    │   │   ├── button.tsx
    │   │   ├── card.tsx
    │   │   ├── input.tsx
    │   │   ├── label.tsx
    │   │   ├── separator.tsx
    │   │   └── text.tsx
    │   ├── sign-in-form.tsx     # Auth form (uses ui/ components)
    │   └── sign-up-form.tsx
    └── lib/
        ├── orpc.ts              # oRPC client + TanStack Query utils
        ├── auth-client.ts       # Better Auth client (Expo SecureStore)
        ├── theme.ts             # NAV_THEME for @react-navigation/native
        └── utils.ts             # cn() helper (clsx + tailwind-merge)
```

## Path Aliases

```
@/*            → ./src/*
@myapp/contract → ../../packages/contract/src
```

Use `@/` for all imports within the mobile app:

```ts
import { Button } from '@/components/ui/button'
import { client, orpc } from '@/lib/orpc'
import { useSession } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
```

## Routing (Expo Router)

File-based routing under `src/app/`. The directory structure IS the route structure.

**Adding a new screen:**

```
src/app/todos.tsx         → /todos
src/app/todos/[id].tsx    → /todos/:id
src/app/settings/index.tsx → /settings
```

**Navigation:**

```ts
import { useRouter, Link } from 'expo-router'

// Programmatic
const router = useRouter()
router.push('/todos')           // push onto stack
router.replace('/auth/login')   // replace current (no back)

// Declarative
<Link href="/todos">Go to Todos</Link>
```

**Layout groups** use `_layout.tsx`:

```tsx
// src/app/settings/_layout.tsx
import { Stack } from 'expo-router'

export default function SettingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Settings" }} />
      <Stack.Screen name="profile" options={{ title: "Profile" }} />
    </Stack>
  )
}
```

## Styling (Uniwind / Tailwind CSS v4)

Uniwind enables `className` on all React Native components. Use Tailwind utility classes directly:

```tsx
<View className="flex-1 items-center justify-center px-6">
  <Text className="text-3xl font-bold text-foreground">Hello</Text>
</View>
```

**Key differences from web Tailwind:**

- No CSS cascade — every element must be styled directly, `Text` cannot inherit from parent `View`
- Use `active:` instead of `hover:` (no hover on mobile)
- Dark mode: use semantic tokens (`text-foreground`, `bg-background`) that auto-switch, or explicit `dark:` prefix
- `contentContainerClassName` for `ScrollView`/`FlatList` content container styling
- `placeholderClassName` for `TextInput` placeholder color

**Semantic color tokens** (from `global.css`, auto-switch light/dark):

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

**`cn()` utility** — use when conditionally combining classes:

```ts
import { cn } from '@/lib/utils'

<View className={cn('rounded-lg p-4', isActive && 'bg-accent', className)} />
```

**Dark mode detection:**

```ts
import { useUniwind } from 'uniwind'

const { theme } = useUniwind()  // 'light' | 'dark'
```

## UI Components (React Native Reusables)

Components live in `src/components/ui/`. They are source files you own (not a library), copied by the CLI.

### Using existing components

```tsx
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
```

**Button** — wraps `Pressable` with variants:

```tsx
<Button onPress={handleSave} disabled={loading}>
  <Text>Save</Text>
</Button>

<Button variant="outline" onPress={handleCancel}>
  <Text>Cancel</Text>
</Button>

<Button variant="destructive" onPress={handleDelete}>
  <Text>Delete</Text>
</Button>
```

Button variants: `default`, `destructive`, `outline`, `secondary`, `ghost`, `link`
Button sizes: `default`, `sm`, `lg`, `icon`

**IMPORTANT:** Button children must use the `Text` component from `@/components/ui/text`, NOT `Text` from `react-native`. The Button uses `TextClassContext` to inject text styles into its children.

**Input** — wraps `TextInput` with themed styling:

```tsx
<Input
  value={email}
  onChangeText={setEmail}
  placeholder="you@example.com"
  keyboardType="email-address"
  autoComplete="email"
  autoCapitalize="none"
/>
```

**Label + Input pattern:**

```tsx
<View className="gap-1.5">
  <Label nativeID="email">Email</Label>
  <Input aria-labelledby="email" value={email} onChangeText={setEmail} />
</View>
```

Use `nativeID` on Label and `aria-labelledby` on Input for accessibility linking.

**Card:**

```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description text</CardDescription>
  </CardHeader>
  <CardContent className="gap-4">
    {/* content */}
  </CardContent>
</Card>
```

**Text** — use instead of RN's `Text` when inside RN Reusables components:

```tsx
import { Text } from '@/components/ui/text'

<Text>Default text</Text>
<Text variant="h1">Heading 1</Text>
<Text variant="muted">Subtle text</Text>
```

Text variants: `default`, `h1`, `h2`, `h3`, `h4`, `p`, `lead`, `large`, `small`, `muted`, `blockquote`, `code`

### Adding new components

Use the RN Reusables CLI from the `apps/mobile` directory:

```bash
cd apps/mobile
npx @react-native-reusables/cli@latest add dialog dropdown-menu avatar --yes
```

The CLI auto-detects Uniwind, downloads component source to `src/components/ui/`, and installs required `@rn-primitives/*` packages.

Available components (35+): accordion, alert, alert-dialog, aspect-ratio, avatar, badge, button, card, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, input, label, menubar, popover, progress, radio-group, select, separator, skeleton, switch, tabs, text, textarea, toggle, toggle-group, tooltip.

**IMPORTANT:** After adding components that use overlays (dialog, dropdown-menu, popover, tooltip), ensure `<PortalHost />` is in the root layout (it already is).

### Icons

```tsx
import { ChevronRight, Plus, Trash2 } from 'lucide-react-native'

<Plus className="text-foreground" size={20} />

// Inside a Button
<Button size="icon" variant="ghost">
  <Trash2 className="text-destructive" size={16} />
</Button>
```

## oRPC Client

The client is in `src/lib/orpc.ts`. It uses the shared `@myapp/contract` for type safety and sends auth cookies via `getCookie()` from the Better Auth Expo plugin.

```ts
import { client, orpc } from '@/lib/orpc'
```

### Direct calls (outside React)

```ts
const user = await client.auth.me({})
const todos = await client.todo.list({})
await client.todo.create({ title: 'Buy milk' })
```

### TanStack Query (inside React components)

```ts
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

```ts
const { data: session } = useSession()
const { data } = useQuery({
  ...orpc.todo.list.queryOptions({ input: {} }),
  enabled: !!session,
})
```

**Cache invalidation:**

```ts
// .key() = partial match — invalidate all variants of a query
queryClient.invalidateQueries({ queryKey: orpc.todo.key() })

// .queryKey() = exact match — set/get specific cache entry
queryClient.setQueryData(orpc.todo.find.queryKey({ input: { id } }), updated)
```

### Pitfalls

- **Mutations don't auto-invalidate.** Always add `onSuccess` with `invalidateQueries`.
- **Don't combine `skipToken` with `enabled`** — skipToken internally sets `enabled: false`.
- **Don't copy query data into `useState`** — use `data` from `useQuery` directly.

## Authentication

Auth is handled by Better Auth with the Expo plugin (`@better-auth/expo`). Sessions are stored in `expo-secure-store`.

### Auth client (`src/lib/auth-client.ts`)

```ts
import { useSession, signIn, signUp, signOut, getCookie } from '@/lib/auth-client'
```

- `useSession()` — React hook, returns `{ data: session, isPending }`
- `signIn.email({ email, password })` — throws on error
- `signUp.email({ email, password, name })` — throws on error
- `signOut()` — throws on error
- `getCookie()` — returns stored cookie header for oRPC requests

All auth methods are wrapped in `throwOnError` — they throw `Error` on failure, NOT return `{ data, error }`. Use `try/catch`:

```ts
try {
  await signIn.email({ email, password })
  router.replace('/')
} catch (err) {
  Alert.alert('Login Failed', err instanceof Error ? err.message : 'Unknown error')
}
```

### Auth guard pattern

Protect screens by checking session and redirecting:

```tsx
import { useSession } from '@/lib/auth-client'

export default function ProtectedScreen() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/auth/login')
    }
  }, [session, isPending])

  if (isPending) return <ActivityIndicator />
  if (!session) return null

  return <View>{/* protected content */}</View>
}
```

## Building a New Screen — Full Pattern

Example: adding a Todo list screen.

### 1. Create the route file

```tsx
// src/app/todos.tsx
import { useEffect } from 'react'
import { View, FlatList, Alert, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from '@/lib/auth-client'
import { orpc } from '@/lib/orpc'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'
import { Card, CardContent } from '@/components/ui/card'

export default function TodosScreen() {
  const { data: session, isPending: authPending } = useSession()
  const router = useRouter()
  const queryClient = useQueryClient()

  // Auth guard
  useEffect(() => {
    if (!authPending && !session) router.replace('/auth/login')
  }, [session, authPending])

  // Fetch todos (only when authenticated)
  const { data: todos, isPending } = useQuery({
    ...orpc.todo.list.queryOptions({ input: {} }),
    enabled: !!session,
  })

  // Create mutation with cache invalidation
  const { mutate: createTodo } = useMutation(orpc.todo.create.mutationOptions({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: orpc.todo.key() })
    },
  }))

  if (authPending || isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  return (
    <View className="flex-1 p-4 gap-4">
      <Button onPress={() => createTodo({ title: 'New todo' })}>
        <Text>Add Todo</Text>
      </Button>
      <FlatList
        data={todos}
        contentContainerClassName="gap-2"
        renderItem={({ item }) => (
          <Card>
            <CardContent className="py-3">
              <Text>{item.title}</Text>
            </CardContent>
          </Card>
        )}
        keyExtractor={(item) => item.id}
      />
    </View>
  )
}
```

### 2. Register in parent layout

```tsx
// src/app/_layout.tsx — add to Stack
<Stack.Screen name="todos" options={{ title: "Todos" }} />
```

### 3. Navigate to it

```tsx
router.push('/todos')
// or
<Link href="/todos">My Todos</Link>
```

## Building a Form Component

Follow the existing pattern in `src/components/sign-in-form.tsx`:

1. **Props:** accept `onSubmit` callback (with typed params), `loading`, and navigation callbacks
2. **State:** local `useState` for form fields
3. **Refs:** use `useRef<TextInput>` + `onSubmitEditing` to chain field focus
4. **Layout:** `Card > CardHeader + CardContent`, fields use `Label + Input` in a `View className="gap-1.5"`
5. **Submit:** use RN Reusables `Button` + `Text`, disable when loading

```tsx
// Screen uses the form:
<SignInForm
  onSubmit={handleSignIn}
  onNavigateToSignUp={() => router.push('/auth/register')}
  loading={loading}
/>
```

Page handles auth logic + navigation + error display (`Alert.alert`). Form component handles UI + field state only.

## Keyboard Handling

Wrap form screens with:

```tsx
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  className="flex-1"
>
  <ScrollView
    keyboardShouldPersistTaps="handled"
    contentContainerClassName="flex-1 items-center justify-center p-4"
    keyboardDismissMode="interactive"
  >
    {/* form content */}
  </ScrollView>
</KeyboardAvoidingView>
```

## Environment Variables

Mobile uses `EXPO_PUBLIC_` prefix (Expo convention):

| Variable | Default | Description |
|----------|---------|-------------|
| `EXPO_PUBLIC_API_URL` | `http://localhost:4001` | Backend URL |

Access: `process.env.EXPO_PUBLIC_API_URL`

## Metro Config Notes

`metro.config.js` is configured for:
- **Monorepo resolution** — watches entire monorepo, resolves `node_modules` from both project and root
- **Uniwind** — `withUniwindConfig` wraps the config (must be outermost wrapper)
- **Package exports** — `unstable_enablePackageExports: true` (needed for `@better-auth/expo/client`)

## Key Differences from Frontend (Web)

| Aspect | Frontend | Mobile |
|--------|----------|--------|
| UI library | shadcn/ui | React Native Reusables |
| Add component | `bunx shadcn add X` | `npx @react-native-reusables/cli add X` |
| Styling engine | Tailwind CSS v4 (web) | Uniwind (Tailwind v4 for RN) |
| Router | react-router-dom | expo-router (file-based) |
| Auth storage | Browser cookies | expo-secure-store |
| oRPC auth | `credentials: 'include'` | `headers: { cookie: getCookie() }` |
| Error display | `toast` (sonner) | `Alert.alert()` |
| Hover states | `hover:` | `active:` (no hover on touch) |
| Text inheritance | CSS cascade | Must style each `Text` directly |
| Scroll container | Native scroll | `ScrollView` / `FlatList` with `contentContainerClassName` |
