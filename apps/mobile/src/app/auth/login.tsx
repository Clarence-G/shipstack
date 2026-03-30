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
