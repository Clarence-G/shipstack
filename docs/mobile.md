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
| Toasts | sonner-native (same API as frontend's sonner) |
| Date Picker | `@react-native-community/datetimepicker` via `DateInput` component |
| Bottom Sheet | `@gorhom/bottom-sheet` via `Sheet` component |
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
    │   ├── _layout.tsx          # Root: ThemeProvider + QueryProvider + SheetProvider + Toaster + PortalHost
    │   ├── index.tsx            # Home (auth guard → redirect to login)
    │   └── auth/
    │       ├── _layout.tsx      # Auth group layout (Stack)
    │       ├── login.tsx        # Login screen
    │       └── register.tsx     # Register screen
    ├── components/
    │   ├── ui/                  # RN Reusables components (CLI-generated, 32 files)
    │   │   ├── accordion, alert, alert-dialog, aspect-ratio
    │   │   ├── avatar, badge, button, card, checkbox, collapsible
    │   │   ├── context-menu, dialog, dropdown-menu, hover-card
    │   │   ├── icon, input, label, menubar
    │   │   ├── native-only-animated-view, popover, progress
    │   │   ├── radio-group, select, separator, skeleton
    │   │   ├── switch, tabs, text, textarea
    │   │   └── toggle, toggle-group, tooltip, date-input, sheet, field
    │   └── block/               # Block-level composed components
    │       ├── sign-in-form.tsx  # Login form (Card + Input + Button)
    │       ├── sign-up-form.tsx  # Register form (Card + Input + Button)
    │       └── user-menu.tsx     # User avatar popover menu (RN Reusables CLI)
    ├── hooks/
    │   └── use-upload.ts        # File upload hook (presigned URL + S3)
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

### Adding Tab Navigation

The scaffold uses a flat `app/index.tsx` as the home screen. If you add tab navigation later, be aware of a route conflict:

**The problem:** `app/index.tsx` and `app/(tabs)/index.tsx` both resolve to `/`. Expo Router groups like `(tabs)` don't add path segments, so both files claim the same route — behavior is unpredictable.

**Migration steps:**

1. Create the tab layout:

```tsx
// src/app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router'

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
```

2. Move tab screens into `(tabs)/`:

```
src/app/(tabs)/explore.tsx    → /explore (default tab)
src/app/(tabs)/profile.tsx    → /profile
```

3. Convert `app/index.tsx` to a redirect:

```tsx
// src/app/index.tsx — only redirects, no UI
import { Redirect } from 'expo-router'
export default function Index() {
  return <Redirect href="/explore" />
}
```

4. Update root `_layout.tsx`:

```tsx
<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
```

### Configuring Screen Headers

`Stack.Screen name` only matches **direct child** route segments. It does not support paths with slashes.

```tsx
// WRONG — name with slash does nothing
<Stack.Screen name="listings/[id]" options={{ title: 'Details' }} />

// CORRECT — configure inside the screen file itself
// src/app/listings/[id].tsx
import { Stack } from 'expo-router'

export default function ListingDetail() {
  return (
    <>
      <Stack.Screen options={{ title: 'Details', headerBackTitle: 'Back' }} />
      {/* screen content */}
    </>
  )
}
```

Alternatively, add a nested `_layout.tsx` in the directory:

```tsx
// src/app/listings/_layout.tsx
import { Stack } from 'expo-router'

export default function ListingsLayout() {
  return (
    <Stack>
      <Stack.Screen name="[id]" options={{ title: 'Details' }} />
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

### Installed Components — Quick Reference

**MANDATORY:** Use these components for ALL UI. Never hand-write Tailwind equivalents. If a component you need is not listed, add it via `npx @react-native-reusables/cli@latest add <name> --yes`.

**Common components (with imports):**

| Component | Import | Key exports |
|-----------|--------|------------|
| button | `from '@/components/ui/button'` | Button (variants: default, destructive, outline, secondary, ghost, link) |
| text | `from '@/components/ui/text'` | Text (variants: default, h1-h4, p, lead, large, small, muted, blockquote, code) — MUST use this inside RN Reusables components, not RN Text |
| input | `from '@/components/ui/input'` | Input |
| label | `from '@/components/ui/label'` | Label |
| card | `from '@/components/ui/card'` | Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter |
| dialog | `from '@/components/ui/dialog'` | Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose |
| alert-dialog | `from '@/components/ui/alert-dialog'` | AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogAction, AlertDialogCancel |
| dropdown-menu | `from '@/components/ui/dropdown-menu'` | DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem |
| select | `from '@/components/ui/select'` | Select, SelectTrigger, SelectValue, SelectContent, SelectItem |
| checkbox | `from '@/components/ui/checkbox'` | Checkbox |
| switch | `from '@/components/ui/switch'` | Switch |
| tabs | `from '@/components/ui/tabs'` | Tabs, TabsList, TabsTrigger, TabsContent |
| avatar | `from '@/components/ui/avatar'` | Avatar, AvatarImage, AvatarFallback |
| badge | `from '@/components/ui/badge'` | Badge |
| separator | `from '@/components/ui/separator'` | Separator |
| skeleton | `from '@/components/ui/skeleton'` | Skeleton |
| progress | `from '@/components/ui/progress'` | Progress |
| tooltip | `from '@/components/ui/tooltip'` | Tooltip, TooltipTrigger, TooltipContent |

**Also installed (same import pattern `from '@/components/ui/<name>'`):**
accordion, alert, aspect-ratio, collapsible, context-menu, hover-card, icon, menubar, native-only-animated-view, popover, radio-group, textarea, toggle, toggle-group

Add more: `cd apps/mobile && npx @react-native-reusables/cli@latest add <name> --yes`

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

Available components (32 files): accordion, alert, alert-dialog, aspect-ratio, avatar, badge, button, card, checkbox, collapsible, context-menu, dialog, dropdown-menu, hover-card, icon, input, label, menubar, native-only-animated-view, popover, progress, radio-group, select, separator, skeleton, switch, tabs, text, textarea, toggle, toggle-group, tooltip.

**IMPORTANT:** After adding components that use overlays (dialog, dropdown-menu, popover, tooltip), ensure `<PortalHost />` is in the root layout (it already is).

### Icons

Package: `lucide-react-native`. All icons are named React components. Under the hood they render SVG via `react-native-svg`.

Browse all available icons at [lucide.dev](https://lucide.dev/icons).

**Import:**

```tsx
import { Plus, Trash2, ChevronRight, Search, Settings, X } from 'lucide-react-native'
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `size` | `number` | `24` | Width and height in dp |
| `color` | `string` | `"currentColor"` | Stroke color — takes precedence over `className` text color |
| `strokeWidth` | `number` | `2` | Stroke width |
| `absoluteStrokeWidth` | `boolean` | `false` | Keep stroke weight constant regardless of `size` |
| `className` | `string` | — | Uniwind classes; `text-*` sets color via `currentColor` |

**Styling with Tailwind className:**

```tsx
// Color via Tailwind token (uses currentColor internally)
<Plus className="text-foreground" size={20} />
<Trash2 className="text-destructive" size={16} />
<Settings className="text-muted-foreground" size={18} />
```

**Explicit `color` prop** overrides `className`:

```tsx
// Explicit color — bypasses className text color
<Plus color="#3b82f6" size={20} />
```

Prefer `className` with semantic tokens so icons auto-adapt to light/dark mode.

**Inside a Button:**

```tsx
// icon size — ghost variant
<Button size="icon" variant="ghost" onPress={handleOpen}>
  <Settings className="text-foreground" size={20} />
</Button>

// Destructive icon action
<Button size="icon" variant="destructive" onPress={handleDelete}>
  <Trash2 size={20} />
</Button>

// icon-sm
<Button size="icon-sm" variant="ghost" onPress={handleClose}>
  <X className="text-muted-foreground" size={16} />
</Button>
```

`Button` from RN Reusables requires children to be `Text` from `@/components/ui/text` for labels — but icons do not need `Text`, pass them directly.

**Inline with text** — wrap in a `View` with flex:

```tsx
<View className="flex-row items-center gap-2">
  <Search className="text-muted-foreground" size={16} />
  <Text className="text-sm text-muted-foreground">Search</Text>
</View>
```

**Stroke width** — default `2` suits most cases:

```tsx
// Large display icon — thinner strokes
<Settings size={48} strokeWidth={1.5} className="text-muted-foreground" />

// absoluteStrokeWidth — consistent visual weight at any size
<Star size={32} absoluteStrokeWidth className="text-primary" />
```

**Loading spinner pattern:**

```tsx
import { Loader2 } from 'lucide-react-native'
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated'

// Simple spin via Reanimated (Loader2 + rotate)
<Button disabled={isPending} onPress={handleSubmit}>
  {isPending
    ? <Loader2 size={16} className="text-primary-foreground" />
    : <Save size={16} className="text-primary-foreground" />}
  <Text>{isPending ? 'Saving...' : 'Save'}</Text>
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
import { View, FlatList, ActivityIndicator } from 'react-native'
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

Page handles auth logic + navigation + error display (`toast.error()`). Form component handles UI + field state only.

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

## Toasts (sonner-native)

Uses `sonner-native` — same API as the frontend's `sonner`. The `<Toaster />` and global mutation error handler are already configured in the root `_layout.tsx`.

```ts
import { toast } from 'sonner-native'

toast.success('Saved!')
toast.error('Something went wrong')
toast.info('FYI...')
toast.warning('Watch out')
toast('Plain message')
```

**In form error handlers** — prefer `toast.error` over `Alert.alert` for non-blocking feedback:

```ts
try {
  await signIn.email({ email, password })
  router.replace('/')
} catch (err) {
  toast.error(err instanceof Error ? err.message : 'Login failed')
}
```

Reserve `Alert.alert()` for destructive confirmations (delete account, discard changes) where the user must explicitly choose.

**Global mutation errors** are auto-toasted via the QueryClient config in `_layout.tsx`. If you add a local `onError`, both fire — handle known errors locally and let unknown ones fall through.

## Date Picker

React Native has no `<input type="date">`. Use the `DateInput` component from `@/components/ui/date-input`:

```tsx
import { useState } from 'react'
import { DateInput } from '@/components/ui/date-input'

const [date, setDate] = useState<Date>()

<DateInput
  value={date}
  onChange={setDate}
  placeholder="Select date"
  mode="date"                    // 'date' | 'time' | 'datetime'
  minimumDate={new Date()}       // optional
  maximumDate={new Date(2030, 0, 1)}  // optional
/>
```

`DateInput` opens the native platform picker (iOS spinner / Android calendar) and renders like `<Input>` when closed.

| Web | Mobile |
|-----|--------|
| `<input type="date">` | `<DateInput mode="date">` |
| `<input type="time">` | `<DateInput mode="time">` |
| `<input type="datetime-local">` | `<DateInput mode="datetime">` |

## File Upload

The upload hook exists at `src/hooks/use-upload.ts`. It handles expo-image-picker assets with the same 3-step flow as the frontend (presigned URL → S3 upload → confirm).

```tsx
import { useUpload } from '@/hooks/use-upload'
import * as ImagePicker from 'expo-image-picker'

const { upload, isUploading, progress, error } = useUpload()

// Pick and upload an image
const result = await ImagePicker.launchImageLibraryAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.8,
})

if (!result.canceled) {
  const asset = result.assets[0]
  const file = await upload({
    uri: asset.uri,
    fileName: asset.fileName ?? undefined,
    mimeType: asset.mimeType ?? undefined,
  })
  // file = { id, fileKey, filename, contentType, url, createdAt }
}
```

| Aspect | Frontend | Mobile |
|--------|----------|--------|
| Input type | `File` object from `<input>` | `{ uri, fileName, mimeType }` from expo-image-picker |
| Upload transport | `XMLHttpRequest` with progress events | `fetch()` with blob conversion |
| Progress tracking | Fine-grained via xhr.upload | Coarse: 10% → 80% → 100% |

## Bottom Sheet

Uses `@gorhom/bottom-sheet` via a wrapper at `@/components/ui/sheet`. The `<SheetProvider>` is already in the root `_layout.tsx`.

```tsx
import { useSheet, Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Text } from '@/components/ui/text'

function FiltersScreen() {
  const { ref, open, close } = useSheet()

  return (
    <>
      <Button onPress={open}><Text>Open Filters</Text></Button>

      <Sheet sheetRef={ref}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>Narrow down your results</SheetDescription>
          </SheetHeader>

          {/* filter controls */}

          <SheetFooter>
            <Button onPress={close}><Text>Apply</Text></Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
```

**With snap points** (for fixed-height sheets):

```tsx
<Sheet sheetRef={ref} snapPoints={['25%', '50%']} enableDynamicSizing={false}>
  <SheetContent>{/* content */}</SheetContent>
</Sheet>
```

**Scrollable content** — use `SheetScrollContent` instead of `SheetContent`:

```tsx
<Sheet sheetRef={ref} snapPoints={['50%', '90%']} enableDynamicSizing={false}>
  <SheetScrollContent>
    {/* long list of items */}
  </SheetScrollContent>
</Sheet>
```

| Web (Frontend) | Mobile |
|----------------|--------|
| `<Sheet>` + `<SheetTrigger>` | `useSheet()` → `open()` / `close()` |
| `<SheetContent side="bottom">` | `<Sheet sheetRef={ref}>` + `<SheetContent>` |
| CSS animation | Native gesture-driven animation |

## Form Field Layout

Use `Field` components from `@/components/ui/field` for consistent form layouts. Mirrors the frontend's `Field` pattern:

```tsx
import { Field, FieldGroup, FieldLabel, FieldDescription, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'

<FieldGroup>
  <Field>
    <FieldLabel nativeID="email">Email</FieldLabel>
    <Input aria-labelledby="email" value={email} onChangeText={setEmail} />
    <FieldDescription>We won't share your email.</FieldDescription>
  </Field>

  <Field>
    <FieldLabel nativeID="password">Password</FieldLabel>
    <Input aria-labelledby="password" secureTextEntry value={password} onChangeText={setPassword} />
    {error && <FieldError>{error}</FieldError>}
  </Field>
</FieldGroup>
```

**With errors array** (from Zod validation):

```tsx
<FieldError errors={[{ message: 'Email is required' }, { message: 'Invalid format' }]} />
```

| Component | Purpose |
|-----------|---------|
| `FieldGroup` | Wrapper for a group of fields (vertical gap-5) |
| `Field` | Single field container (vertical gap-2) |
| `FieldLabel` | Label text, pass `nativeID` for accessibility linking |
| `FieldDescription` | Helper text below input (muted color) |
| `FieldError` | Error text (destructive color), accepts `children` or `errors` array |

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
| Error display | `toast` (sonner) | `toast` (sonner-native) |
| Hover states | `hover:` | `active:` (no hover on touch) |
| Text inheritance | CSS cascade | Must style each `Text` directly |
| Scroll container | Native scroll | `ScrollView` / `FlatList` with `contentContainerClassName` |

## RN Reusables vs shadcn/ui — Key Differences for AI

RN Reusables mirrors shadcn/ui naming and compound component patterns, but has RN-specific behaviors. **Do not blindly copy shadcn/ui web patterns — apply these rules.**

### 1. TextClassContext (no CSS inheritance)

Web CSS inherits `color` from parents. React Native does not. RN Reusables uses `TextClassContext` (React Context) to pass text styles from parent to child `Text` components.

**Rule:** Always use `Text` from `@/components/ui/text` (not `react-native`) inside RN Reusables components like `Button`, `Card`, `DropdownMenuItem`. The ui `Text` reads `TextClassContext` for automatic styling.

```tsx
// CORRECT
import { Text } from '@/components/ui/text'
<Button><Text>Save</Text></Button>

// WRONG — RN Text ignores TextClassContext, won't get button text color
import { Text } from 'react-native'
<Button><Text>Save</Text></Button>
```

### 2. portalHost (overlay components)

Overlay components (Dialog, Select, Tooltip, Popover, DropdownMenu, ContextMenu, AlertDialog, HoverCard) render via `@rn-primitives/portal`. The root `<PortalHost />` in `_layout.tsx` is the default mount point.

**Rule:** Normally no action needed. If opening an overlay **inside a Modal or BottomSheet**, pass `portalHost` to avoid z-index issues:

```tsx
<SelectContent portalHost="modal-portal">
<DialogContent portalHost="sheet-portal">
```

### 3. Animations (Reanimated, not CSS)

Web uses CSS `@keyframes`. RN Reusables uses `react-native-reanimated` (`FadeIn`, `FadeOut`, `SlideInDown`, etc.) wrapped in `NativeOnlyAnimatedView`.

**Rule:** Already handled inside components. No action needed. But ensure `react-native-reanimated` stays installed.

### 4. hitSlop (touch target sizing)

Mobile touch targets must be larger than visual size. Components like `Checkbox`, `DialogClose`, `Switch` set `hitSlop` internally.

**Rule:** Already handled. When building custom touchable components, add `hitSlop={12}` or more on small targets.

### 5. FullWindowOverlay (iOS z-index)

iOS React Native Modals create separate native windows. `zIndex` cannot cross window boundaries. RN Reusables uses `FullWindowOverlay` from `react-native-screens` on iOS for overlays inside modals.

**Rule:** Already handled inside components. Ensure `react-native-screens` stays installed.

### 6. `active:` instead of `hover:`

No hover on touch devices. Use `active:` (Pressable press state) for interaction feedback.

```tsx
// Web
<Button className="hover:bg-primary/90">

// Mobile
<Pressable className="active:bg-primary/90 active:opacity-80">
```

**Components with state support:** `Pressable` (`active:`, `disabled:`, `focus:`), `TextInput` (`focus:`, `disabled:`), `Switch` (`disabled:`), `TouchableOpacity/Highlight` (`active:`, `disabled:`).

### 7. Extra className props (no CSS child selectors)

Web CSS can target children (`button > svg { color: white }`). RN cannot. Some components expose additional `xxxClassName` props for sub-element styling:

| Component | Extra className props |
|-----------|---------------------|
| Checkbox | `checkedClassName`, `indicatorClassName`, `iconClassName` |
| DropdownMenu | `overlayClassName`, `overlayStyle` |
| Select | (portalHost only) |
| SubTrigger | `iconClassName` |

**Rule:** Check the component source in `src/components/ui/` for available props when you need fine-grained styling.

### 8. Platform-conditional rendering

Some components render differently on web vs native:

```tsx
// SelectScrollUpButton/DownButton — return null on native
// FullWindowOverlay — iOS only
// NativeOnlyAnimatedView — renders Animated.View on native, plain View on web
```

**Rule:** Use `Platform.OS` checks when building platform-specific UI. Prefer Uniwind platform selectors (`ios:pt-12 android:pt-6`) over `Platform.select()` for styling.

### 9. Component mapping cheat sheet

| shadcn/ui (Web) | RN Reusables (Mobile) | Notes |
|-----------------|----------------------|-------|
| `<button>` | `<Pressable>` | Use `<Button>` component for styled version |
| `<div>` | `<View>` | |
| `<span>` / `<p>` | `<Text>` from ui/text | Must use ui Text inside Reusables components |
| `<input>` | `<TextInput>` | Use `<Input>` component for styled version |
| `<input type="date">` | `<DateInput>` | From `@/components/ui/date-input` |
| `<Sheet>` | `useSheet()` + `<Sheet>` | From `@/components/ui/sheet`, uses `@gorhom/bottom-sheet` |
| `<Field>` / `<FieldGroup>` | Same names | From `@/components/ui/field`, mirrors frontend pattern |
| `toast()` (sonner) | `toast()` (sonner-native) | Same API: `toast.success()`, `toast.error()` |
| `asChild` + `<Link>` | Direct `onPress` + `router.push()` | RN Reusables supports `asChild` on some components |
| `<TooltipProvider>` | Not needed | Mobile has no global tooltip provider |
| `showCloseButton` (Dialog) | Auto-rendered close button | Mobile Dialog always shows close icon |
| `variant="line"` (Tabs) | Not available | Mobile Tabs has fixed styling |
