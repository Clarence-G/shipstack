# Mobile App (Expo + Uniwind + oRPC) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an `apps/mobile` Expo project to the monorepo with Uniwind styling and oRPC type-safe API integration.

**Architecture:** Use the `with-router-uniwind` Expo template as base, then add oRPC client + Better Auth client (same patterns as frontend), wire up TanStack Query, and create Login/Register/Home screens with Expo Router file-based routing.

**Tech Stack:** Expo SDK 54, Expo Router 6, Uniwind 1.0, Tailwind CSS v4, oRPC, Better Auth, TanStack Query, React Native

---

### Task 1: Scaffold Expo project from Uniwind template

**Files:**
- Create: `apps/mobile/` (entire directory via template)

**Step 1: Create Expo project using the Uniwind template**

```bash
cd /Users/bytedance/Projects/orpc_template/apps
npx create-expo-app@latest mobile -e with-router-uniwind --no-install
```

The `--no-install` flag skips npm install since we'll use bun from the monorepo root.

**Step 2: Update `apps/mobile/package.json` for monorepo**

Replace the generated `package.json` with monorepo-compatible version:

```json
{
  "name": "@myapp/mobile",
  "version": "0.0.1",
  "private": true,
  "main": "expo-router/entry",
  "scripts": {
    "dev": "expo start",
    "dev:ios": "expo start --ios",
    "dev:android": "expo start --android",
    "dev:web": "expo start --web"
  },
  "dependencies": {
    "@myapp/contract": "workspace:*",
    "@orpc/client": "latest",
    "@orpc/contract": "latest",
    "@orpc/tanstack-query": "latest",
    "@tanstack/react-query": "latest",
    "better-auth": "latest",
    "expo": "~54.0.22",
    "expo-router": "~6.0.14",
    "expo-status-bar": "~3.0.8",
    "react": "~19.1.0",
    "react-native": "0.81.5",
    "tailwindcss": "~4.1.16",
    "uniwind": "~1.0.0"
  },
  "devDependencies": {
    "@types/react": "~19.1.0",
    "typescript": "~5.9.2"
  }
}
```

**Step 3: Update root `package.json` with mobile scripts**

Add to root `package.json` scripts:

```json
"dev:mobile": "bun run --filter @myapp/mobile dev"
```

**Step 4: Install dependencies from monorepo root**

```bash
cd /Users/bytedance/Projects/orpc_template
bun install
```

**Step 5: Verify template files exist**

Check that these files exist after scaffold:
- `apps/mobile/metro.config.js`
- `apps/mobile/app.json`
- `apps/mobile/tsconfig.json`
- `apps/mobile/src/global.css`
- `apps/mobile/src/app/_layout.tsx`
- `apps/mobile/src/app/index.tsx`

**Step 6: Commit**

```bash
git add apps/mobile/ package.json bun.lock
git commit -m "feat: scaffold Expo mobile app from with-router-uniwind template"
```

---

### Task 2: Configure monorepo integration (tsconfig, metro, global.css)

**Files:**
- Modify: `apps/mobile/tsconfig.json`
- Modify: `apps/mobile/metro.config.js`
- Modify: `apps/mobile/src/global.css`
- Modify: `apps/mobile/app.json`

**Step 1: Update `tsconfig.json` with path aliases**

Replace `apps/mobile/tsconfig.json`:

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "paths": {
      "@/*": ["./src/*"],
      "@myapp/contract": ["../../packages/contract/src"]
    }
  }
}
```

**Step 2: Update `metro.config.js` for monorepo resolution**

Metro needs to know about the monorepo root for resolving workspace packages. Replace `apps/mobile/metro.config.js`:

```js
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const path = require("path");

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// Monorepo: watch all files in the monorepo
config.watchFolders = [monorepoRoot];

// Monorepo: resolve packages from both project and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./src/global.css",
  dtsFile: "./src/uniwind-types.d.ts",
});
```

**Step 3: Add `@source` directive to `global.css`**

Replace `apps/mobile/src/global.css`:

```css
@import "tailwindcss";
@import "uniwind";

@source "../../packages/contract";
```

**Step 4: Update `app.json` with proper app name**

Replace `apps/mobile/app.json`:

```json
{
  "expo": {
    "name": "MyApp Mobile",
    "slug": "myapp-mobile",
    "scheme": "myapp",
    "userInterfaceStyle": "automatic",
    "orientation": "default",
    "web": {
      "output": "static"
    }
  }
}
```

**Step 5: Commit**

```bash
git add apps/mobile/tsconfig.json apps/mobile/metro.config.js apps/mobile/src/global.css apps/mobile/app.json
git commit -m "feat: configure metro monorepo resolution and Uniwind CSS source"
```

---

### Task 3: Create oRPC client and auth client

**Files:**
- Create: `apps/mobile/src/lib/orpc.ts`
- Create: `apps/mobile/src/lib/auth-client.ts`

**Step 1: Create oRPC client**

Create `apps/mobile/src/lib/orpc.ts`:

```ts
import { createORPCClient } from '@orpc/client'
import { RPCLink } from '@orpc/client/fetch'
import { createTanstackQueryUtils } from '@orpc/tanstack-query'
import type { ContractRouterClient } from '@orpc/contract'
import type { contract } from '@myapp/contract'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

const link = new RPCLink({
  url: `${API_URL}/rpc`,
  fetch: (url, options) => fetch(url, { ...options, credentials: 'include' }),
})

/**
 * Type-safe oRPC client — typed from contract only, zero server dependency.
 */
export const client: ContractRouterClient<typeof contract> = createORPCClient(link)

/**
 * TanStack Query utils — use orpc.xxx.queryOptions() / mutationOptions() in components.
 */
export const orpc = createTanstackQueryUtils(client)
```

**Step 2: Create Better Auth client**

Create `apps/mobile/src/lib/auth-client.ts`:

```ts
import { createAuthClient } from 'better-auth/react'

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001'

const authClient = createAuthClient({
  baseURL: API_URL,
})

/**
 * Better Auth session hook — use in components for auth state.
 */
export const { useSession } = authClient

/**
 * Wrap a Better Auth method so it throws on error instead of returning { data, error }.
 * This unifies error handling: both oRPC (throws ORPCError) and Better Auth use try/catch.
 */
function throwOnError<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
) {
  return async (...args: TArgs) => {
    const result = await fn(...args)
    if (
      result &&
      typeof result === 'object' &&
      'error' in result &&
      (result as any).error
    ) {
      throw new Error((result as any).error.message ?? 'Unknown error')
    }
    return result
  }
}

export const signIn = {
  email: throwOnError(authClient.signIn.email),
}

export const signUp = {
  email: throwOnError(authClient.signUp.email),
}

export const signOut = throwOnError(authClient.signOut)
```

**Step 3: Commit**

```bash
git add apps/mobile/src/lib/
git commit -m "feat: add oRPC client and Better Auth client for mobile"
```

---

### Task 4: Set up root layout with QueryProvider

**Files:**
- Modify: `apps/mobile/src/app/_layout.tsx`

**Step 1: Replace root layout with QueryProvider and auth-aware navigation**

Replace `apps/mobile/src/app/_layout.tsx`:

```tsx
import "../global.css"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Stack } from "expo-router"
import { useState } from "react"

export default function RootLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Home" }} />
        <Stack.Screen
          name="auth"
          options={{ headerShown: false }}
        />
      </Stack>
    </QueryClientProvider>
  )
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/app/_layout.tsx
git commit -m "feat: add root layout with QueryClient provider"
```

---

### Task 5: Create auth screens (Login + Register)

**Files:**
- Create: `apps/mobile/src/app/auth/_layout.tsx`
- Create: `apps/mobile/src/app/auth/login.tsx`
- Create: `apps/mobile/src/app/auth/register.tsx`

**Step 1: Create auth layout**

Create `apps/mobile/src/app/auth/_layout.tsx`:

```tsx
import { Stack } from "expo-router"

export default function AuthLayout() {
  return (
    <Stack>
      <Stack.Screen name="login" options={{ title: "Login" }} />
      <Stack.Screen name="register" options={{ title: "Register" }} />
    </Stack>
  )
}
```

**Step 2: Create login screen**

Create `apps/mobile/src/app/auth/login.tsx`:

```tsx
import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useRouter, Link } from "expo-router"
import { signIn } from "@/lib/auth-client"

export default function LoginScreen() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    setLoading(true)
    try {
      await signIn.email({ email, password })
      router.replace("/")
    } catch (err) {
      Alert.alert(
        "Login Failed",
        err instanceof Error ? err.message : "Invalid email or password"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <View className="flex-1 justify-center px-6">
        <View className="mb-8">
          <Text className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
            Login
          </Text>
          <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
            Enter your credentials to sign in
          </Text>
        </View>

        <View className="gap-4">
          <View className="gap-1">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              className="rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 dark:border-gray-600 dark:text-gray-100 dark:bg-gray-800"
              placeholderTextColorClassName="text-gray-400"
            />
          </View>

          <View className="gap-1">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="password"
              className="rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 dark:border-gray-600 dark:text-gray-100 dark:bg-gray-800"
              placeholderTextColorClassName="text-gray-400"
            />
          </View>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            className="mt-2 items-center rounded-lg bg-blue-600 py-3 active:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-white">
                Sign In
              </Text>
            )}
          </Pressable>
        </View>

        <View className="mt-6 flex-row justify-center gap-1">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Don't have an account?
          </Text>
          <Link href="/auth/register" className="text-sm font-medium text-blue-600">
            Register
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
```

**Step 3: Create register screen**

Create `apps/mobile/src/app/auth/register.tsx`:

```tsx
import { useState } from "react"
import {
  View,
  Text,
  TextInput,
  Pressable,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useRouter, Link } from "expo-router"
import { signUp } from "@/lib/auth-client"

export default function RegisterScreen() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Error", "Please fill in all fields")
      return
    }

    setLoading(true)
    try {
      await signUp.email({ email, password, name })
      router.replace("/")
    } catch (err) {
      Alert.alert(
        "Registration Failed",
        err instanceof Error ? err.message : "Registration failed. Please try again."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1"
    >
      <View className="flex-1 justify-center px-6">
        <View className="mb-8">
          <Text className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
            Register
          </Text>
          <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
            Create your account
          </Text>
        </View>

        <View className="gap-4">
          <View className="gap-1">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Name
            </Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="John Doe"
              autoComplete="name"
              className="rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 dark:border-gray-600 dark:text-gray-100 dark:bg-gray-800"
              placeholderTextColorClassName="text-gray-400"
            />
          </View>

          <View className="gap-1">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              className="rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 dark:border-gray-600 dark:text-gray-100 dark:bg-gray-800"
              placeholderTextColorClassName="text-gray-400"
            />
          </View>

          <View className="gap-1">
            <Text className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
              autoComplete="new-password"
              className="rounded-lg border border-gray-300 px-4 py-3 text-base text-gray-900 dark:border-gray-600 dark:text-gray-100 dark:bg-gray-800"
              placeholderTextColorClassName="text-gray-400"
            />
          </View>

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            className="mt-2 items-center rounded-lg bg-blue-600 py-3 active:bg-blue-700 disabled:opacity-50"
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-base font-semibold text-white">
                Create Account
              </Text>
            )}
          </Pressable>
        </View>

        <View className="mt-6 flex-row justify-center gap-1">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            Already have an account?
          </Text>
          <Link href="/auth/login" className="text-sm font-medium text-blue-600">
            Login
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}
```

**Step 4: Commit**

```bash
git add apps/mobile/src/app/auth/
git commit -m "feat: add login and register screens for mobile"
```

---

### Task 6: Create home screen with auth guard

**Files:**
- Modify: `apps/mobile/src/app/index.tsx`

**Step 1: Replace index with auth-aware home screen**

Replace `apps/mobile/src/app/index.tsx`:

```tsx
import { useEffect } from "react"
import { View, Text, Pressable, ActivityIndicator } from "react-native"
import { useRouter } from "expo-router"
import { useSession, signOut } from "@/lib/auth-client"

export default function HomeScreen() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/auth/login")
    }
  }, [session, isPending])

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    )
  }

  if (!session) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    router.replace("/auth/login")
  }

  return (
    <View className="flex-1 px-6 pt-12">
      <View className="gap-2">
        <Text className="text-3xl font-bold text-gray-900 dark:text-gray-100">
          Welcome, {session.user.name}
        </Text>
        <Text className="text-base text-gray-500 dark:text-gray-400">
          You are logged in as {session.user.email}.
        </Text>
      </View>

      <Pressable
        onPress={handleSignOut}
        className="mt-8 items-center rounded-lg border border-gray-300 py-3 active:bg-gray-100 dark:border-gray-600 dark:active:bg-gray-800"
      >
        <Text className="text-base font-medium text-gray-700 dark:text-gray-300">
          Sign Out
        </Text>
      </Pressable>
    </View>
  )
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/app/index.tsx
git commit -m "feat: add home screen with auth guard and sign out"
```

---

### Task 7: Verify the app starts

**Step 1: Start the Expo dev server**

```bash
cd /Users/bytedance/Projects/orpc_template/apps/mobile
bunx expo start
```

Expected: Metro bundler starts, shows QR code and URL. No build errors.

If there are TypeScript or Metro resolution errors, fix them before proceeding.

**Step 2: Verify in iOS Simulator or Expo Go (manual)**

Open in Expo Go or simulator. Expected behavior:
- App loads, redirects to login screen (no session)
- Login form is visible with Uniwind styling
- Can navigate to register screen via link
- After login with test user (test@example.com / password123), redirects to home
- Home shows user name and email
- Sign out returns to login

**Step 3: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve any startup issues for mobile app"
```

---

### Task 8: Update README and .env.example

**Files:**
- Modify: `README.md` (root)
- Modify: `.env.example` (if applicable)

**Step 1: Add mobile section to root README**

Add to the project structure section in README.md, after the frontend entry:

```markdown
│   └── mobile/              # React Native app (Expo, port 8081)
│       └── src/
│           ├── app/          # Expo Router file routes
│           ├── lib/          # oRPC client, auth client
│           └── global.css    # Tailwind + Uniwind entry
```

Add to the commands table:

```markdown
| `bun run dev:mobile` | Start mobile Expo dev server |
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add mobile app to README"
```
