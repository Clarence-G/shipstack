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
    <View className="w-full max-w-sm gap-6">
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
              <Label nativeID="email">Email</Label>
              <Input
                aria-labelledby="email"
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
              <Label nativeID="password">Password</Label>
              <Input
                ref={passwordInputRef}
                aria-labelledby="password"
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
          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-center text-sm">Don't have an account?</Text>
            <Pressable onPress={onNavigateToSignUp}>
              <Text className="text-sm underline underline-offset-4">Register</Text>
            </Pressable>
          </View>
        </CardContent>
      </Card>
    </View>
  )
}
