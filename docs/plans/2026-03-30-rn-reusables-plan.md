# React Native Reusables Integration Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate React Native Reusables into `apps/mobile` and replace hand-written auth screens with component-library-based forms.

**Architecture:** Install RN Reusables dependencies, set up the theme system (global.css variables + theme.ts + components.json), use CLI to add base UI components, then adapt the auth blocks to use our Better Auth client instead of the default Clerk/social connections pattern.

**Tech Stack:** React Native Reusables CLI, Uniwind, RN Primitives, Lucide React Native, class-variance-authority

---

### Task 1: Install dependencies and create components.json

**Files:**
- Modify: `apps/mobile/package.json`
- Create: `apps/mobile/components.json`

**Step 1: Install required dependencies**

```bash
cd /Users/bytedance/Projects/orpc_template
bun add --cwd apps/mobile react-native-reanimated react-native-svg @rn-primitives/portal @rn-primitives/slot lucide-react-native class-variance-authority clsx tailwind-merge tw-animate-css @react-navigation/native
```

Note: `react-native-safe-area-context` and `react-native-screens` should already be transitive deps of expo-router. If not, the CLI will tell us.

**Step 2: Create `apps/mobile/components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/global.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

**Step 3: Commit**

```bash
git add apps/mobile/package.json apps/mobile/components.json bun.lock
git commit -m "feat: add RN Reusables dependencies and components.json"
```

---

### Task 2: Set up theme system (global.css + theme.ts + utils.ts)

**Files:**
- Modify: `apps/mobile/src/global.css`
- Create: `apps/mobile/src/lib/utils.ts`
- Create: `apps/mobile/src/lib/theme.ts`

**Step 1: Replace `apps/mobile/src/global.css` with full theme**

```css
@import "tailwindcss";
@import "uniwind";

@import "tw-animate-css";

@source "../../packages/contract";

@theme {
  --radius: 10px;
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);

  --spacing-hairline: hairlineWidth();
}

@layer theme {
  :root {
    @variant light {
      --color-background: oklch(1 0 0);
      --color-foreground: oklch(0.145 0 0);
      --color-card: oklch(1 0 0);
      --color-card-foreground: oklch(0.145 0 0);
      --color-popover: oklch(1 0 0);
      --color-popover-foreground: oklch(0.145 0 0);
      --color-primary: oklch(0.205 0 0);
      --color-primary-foreground: oklch(0.985 0 0);
      --color-secondary: oklch(0.97 0 0);
      --color-secondary-foreground: oklch(0.205 0 0);
      --color-muted: oklch(0.97 0 0);
      --color-muted-foreground: oklch(0.556 0 0);
      --color-accent: oklch(0.97 0 0);
      --color-accent-foreground: oklch(0.205 0 0);
      --color-destructive: oklch(0.577 0.245 27.325);
      --color-border: oklch(0.922 0 0);
      --color-input: oklch(0.922 0 0);
      --color-ring: oklch(0.708 0 0);
    }

    @variant dark {
      --color-background: oklch(0.145 0 0);
      --color-foreground: oklch(0.985 0 0);
      --color-card: oklch(0.205 0 0);
      --color-card-foreground: oklch(0.985 0 0);
      --color-popover: oklch(0.205 0 0);
      --color-popover-foreground: oklch(0.985 0 0);
      --color-primary: oklch(0.922 0 0);
      --color-primary-foreground: oklch(0.205 0 0);
      --color-secondary: oklch(0.269 0 0);
      --color-secondary-foreground: oklch(0.985 0 0);
      --color-muted: oklch(0.269 0 0);
      --color-muted-foreground: oklch(0.708 0 0);
      --color-accent: oklch(0.269 0 0);
      --color-accent-foreground: oklch(0.985 0 0);
      --color-destructive: oklch(0.704 0.191 22.216);
      --color-border: oklch(1 0 0 / 10%);
      --color-input: oklch(1 0 0 / 15%);
      --color-ring: oklch(0.556 0 0);
    }
  }
}
```

**Step 2: Create `apps/mobile/src/lib/utils.ts`**

```ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

**Step 3: Create `apps/mobile/src/lib/theme.ts`**

This provides HSL colors for `@react-navigation/native`'s `ThemeProvider` (it doesn't support OKLCH). Values match the OKLCH tokens in global.css.

```ts
import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native'

export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      background: 'hsl(0 0% 100%)',
      border: 'hsl(0 0% 89.8%)',
      card: 'hsl(0 0% 100%)',
      notification: 'hsl(0 84.2% 60.2%)',
      primary: 'hsl(0 0% 9%)',
      text: 'hsl(0 0% 3.9%)',
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      background: 'hsl(0 0% 3.9%)',
      border: 'hsl(0 0% 14.9%)',
      card: 'hsl(0 0% 3.9%)',
      notification: 'hsl(0 70.9% 59.4%)',
      primary: 'hsl(0 0% 98%)',
      text: 'hsl(0 0% 98%)',
    },
  },
}
```

**Step 4: Commit**

```bash
git add apps/mobile/src/global.css apps/mobile/src/lib/utils.ts apps/mobile/src/lib/theme.ts
git commit -m "feat: add RN Reusables theme system (CSS variables, cn utility, nav theme)"
```

---

### Task 3: Add UI components via CLI

**Files:**
- Create: `apps/mobile/src/components/ui/` (multiple files, CLI-generated)

**Step 1: Use CLI to add the base UI components needed for auth forms**

Run from the `apps/mobile` directory. The CLI auto-detects Uniwind via `uniwind-types.d.ts`. Use `--yes` to skip confirmation prompts.

```bash
cd /Users/bytedance/Projects/orpc_template/apps/mobile
npx @react-native-reusables/cli@latest add button card input label separator text --yes
```

This will create files under `src/components/ui/`. The CLI may also install additional `@rn-primitives/*` packages as needed.

**Step 2: Verify generated files exist**

Check that these files were created:
- `apps/mobile/src/components/ui/button.tsx`
- `apps/mobile/src/components/ui/card.tsx`
- `apps/mobile/src/components/ui/input.tsx`
- `apps/mobile/src/components/ui/label.tsx`
- `apps/mobile/src/components/ui/separator.tsx`
- `apps/mobile/src/components/ui/text.tsx`

**Step 3: If CLI fails, install components manually**

If the CLI has issues with SDK 54, manually copy the Uniwind versions from the registry. Check the error output and fix accordingly.

**Step 4: Commit**

```bash
git add apps/mobile/src/components/ apps/mobile/package.json bun.lock
git commit -m "feat: add RN Reusables UI components (button, card, input, label, separator, text)"
```

---

### Task 4: Update root layout with ThemeProvider and PortalHost

**Files:**
- Modify: `apps/mobile/src/app/_layout.tsx`

**Step 1: Replace root layout**

The layout needs: `ThemeProvider` (for navigation colors), `PortalHost` (for overlays), `useUniwind()` (for theme detection), plus the existing `QueryClientProvider`.

```tsx
import "../global.css"

import { NAV_THEME } from "@/lib/theme"
import { ThemeProvider } from "@react-navigation/native"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { PortalHost } from "@rn-primitives/portal"
import { Stack } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { useState } from "react"
import { useUniwind } from "uniwind"

export default function RootLayout() {
  const { theme } = useUniwind()
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
    <ThemeProvider value={NAV_THEME[theme]}>
      <QueryClientProvider client={queryClient}>
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
        <Stack>
          <Stack.Screen name="index" options={{ title: "Home" }} />
          <Stack.Screen name="auth" options={{ headerShown: false }} />
        </Stack>
        <PortalHost />
      </QueryClientProvider>
    </ThemeProvider>
  )
}
```

**Step 2: Commit**

```bash
git add apps/mobile/src/app/_layout.tsx
git commit -m "feat: add ThemeProvider, PortalHost, and StatusBar to root layout"
```

---

### Task 5: Create adapted auth forms and update screens

**Files:**
- Create: `apps/mobile/src/components/sign-in-form.tsx`
- Create: `apps/mobile/src/components/sign-up-form.tsx`
- Modify: `apps/mobile/src/app/auth/login.tsx`
- Modify: `apps/mobile/src/app/auth/register.tsx`

The official auth blocks include `SocialConnections` (Clerk OAuth buttons) and `useColorScheme` from `nativewind`. Since we use Better Auth (not Clerk) and Uniwind (not NativeWind), we adapt the blocks:
- Remove `SocialConnections` and the "or" separator
- Wire `onSubmit` to accept callbacks from the parent screen
- Keep the Card-based layout, Input/Label/Button components

**Step 1: Create `apps/mobile/src/components/sign-in-form.tsx`**

```tsx
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Text } from "@/components/ui/text"
import * as React from "react"
import { Pressable, type TextInput, View } from "react-native"

interface SignInFormProps {
  onSubmit: (email: string, password: string) => void
  onNavigateToSignUp: () => void
  loading?: boolean
}

export function SignInForm({ onSubmit, onNavigateToSignUp, loading }: SignInFormProps) {
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const passwordInputRef = React.useRef<TextInput>(null)

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus()
  }

  function handleSubmit() {
    onSubmit(email, password)
  }

  return (
    <View className="gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-xl">Sign in to your account</CardTitle>
          <CardDescription className="text-center">
            Welcome back! Please sign in to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                onSubmitEditing={onEmailSubmitEditing}
                returnKeyType="next"
              />
            </View>
            <View className="gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                ref={passwordInputRef}
                id="password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="password"
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />
            </View>
            <Button className="w-full" onPress={handleSubmit} disabled={loading}>
              <Text>{loading ? "Signing in..." : "Sign In"}</Text>
            </Button>
          </View>
          <Text className="text-center text-sm">
            Don&apos;t have an account?{" "}
            <Pressable onPress={onNavigateToSignUp}>
              <Text className="text-sm underline underline-offset-4">Register</Text>
            </Pressable>
          </Text>
        </CardContent>
      </Card>
    </View>
  )
}
```

**Step 2: Create `apps/mobile/src/components/sign-up-form.tsx`**

```tsx
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Text } from "@/components/ui/text"
import * as React from "react"
import { Pressable, type TextInput, View } from "react-native"

interface SignUpFormProps {
  onSubmit: (name: string, email: string, password: string) => void
  onNavigateToSignIn: () => void
  loading?: boolean
}

export function SignUpForm({ onSubmit, onNavigateToSignIn, loading }: SignUpFormProps) {
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const emailInputRef = React.useRef<TextInput>(null)
  const passwordInputRef = React.useRef<TextInput>(null)

  function onNameSubmitEditing() {
    emailInputRef.current?.focus()
  }

  function onEmailSubmitEditing() {
    passwordInputRef.current?.focus()
  }

  function handleSubmit() {
    onSubmit(name, email, password)
  }

  return (
    <View className="gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-center text-xl">Create your account</CardTitle>
          <CardDescription className="text-center">
            Welcome! Please fill in the details to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="gap-6">
          <View className="gap-6">
            <View className="gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                autoComplete="name"
                onSubmitEditing={onNameSubmitEditing}
                returnKeyType="next"
              />
            </View>
            <View className="gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                ref={emailInputRef}
                id="email"
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                keyboardType="email-address"
                autoComplete="email"
                autoCapitalize="none"
                onSubmitEditing={onEmailSubmitEditing}
                returnKeyType="next"
              />
            </View>
            <View className="gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                ref={passwordInputRef}
                id="password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoComplete="new-password"
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />
            </View>
            <Button className="w-full" onPress={handleSubmit} disabled={loading}>
              <Text>{loading ? "Creating account..." : "Create Account"}</Text>
            </Button>
          </View>
          <Text className="text-center text-sm">
            Already have an account?{" "}
            <Pressable onPress={onNavigateToSignIn}>
              <Text className="text-sm underline underline-offset-4">Sign in</Text>
            </Pressable>
          </Text>
        </CardContent>
      </Card>
    </View>
  )
}
```

**Step 3: Replace `apps/mobile/src/app/auth/login.tsx`**

```tsx
import { useState } from "react"
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { signIn } from "@/lib/auth-client"
import { SignInForm } from "@/components/sign-in-form"

export default function LoginScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignIn = async (email: string, password: string) => {
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
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="flex-1 items-center justify-center p-4"
        keyboardDismissMode="interactive"
      >
        <SignInForm
          onSubmit={handleSignIn}
          onNavigateToSignUp={() => router.push("/auth/register")}
          loading={loading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
```

**Step 4: Replace `apps/mobile/src/app/auth/register.tsx`**

```tsx
import { useState } from "react"
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { signUp } from "@/lib/auth-client"
import { SignUpForm } from "@/components/sign-up-form"

export default function RegisterScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSignUp = async (name: string, email: string, password: string) => {
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
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="flex-1 items-center justify-center p-4"
        keyboardDismissMode="interactive"
      >
        <SignUpForm
          onSubmit={handleSignUp}
          onNavigateToSignIn={() => router.push("/auth/login")}
          loading={loading}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
```

**Step 5: Commit**

```bash
git add apps/mobile/src/components/sign-in-form.tsx apps/mobile/src/components/sign-up-form.tsx apps/mobile/src/app/auth/
git commit -m "feat: replace auth screens with RN Reusables component-based forms"
```

---

### Task 6: Verify the app starts and fix issues

**Step 1: Start Metro and check for errors**

```bash
cd /Users/bytedance/Projects/orpc_template/apps/mobile
bunx expo start
```

Expected: Metro bundler starts without errors.

**Step 2: Common issues to check**

- If `@react-navigation/native` is missing: `bun add --cwd apps/mobile @react-navigation/native`
- If `useUniwind` is not found: ensure `uniwind` is installed and metro.config.js uses `withUniwindConfig`
- If `@rn-primitives/*` packages are missing: the CLI should have installed them in Task 3, but manually install if needed
- If `contentContainerClassName` is not recognized on `ScrollView`: this is a Uniwind-specific prop, verify it works

**Step 3: Fix any issues and commit**

```bash
git add -A
git commit -m "fix: resolve any startup issues after RN Reusables integration"
```

Only create this commit if fixes were needed.
