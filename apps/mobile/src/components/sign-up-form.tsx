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
    <View className="w-full max-w-sm gap-6">
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
              <Label nativeID="name">Name</Label>
              <Input
                aria-labelledby="name"
                value={name}
                onChangeText={setName}
                placeholder="John Doe"
                autoComplete="name"
                onSubmitEditing={onNameSubmitEditing}
                returnKeyType="next"
              />
            </View>
            <View className="gap-1.5">
              <Label nativeID="email">Email</Label>
              <Input
                ref={emailInputRef}
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
                autoComplete="new-password"
                returnKeyType="send"
                onSubmitEditing={handleSubmit}
              />
            </View>
            <Button className="w-full" onPress={handleSubmit} disabled={loading}>
              <Text>{loading ? "Creating account..." : "Create Account"}</Text>
            </Button>
          </View>
          <View className="flex-row items-center justify-center gap-1">
            <Text className="text-center text-sm">Already have an account?</Text>
            <Pressable onPress={onNavigateToSignIn}>
              <Text className="text-sm underline underline-offset-4">Sign in</Text>
            </Pressable>
          </View>
        </CardContent>
      </Card>
    </View>
  )
}
