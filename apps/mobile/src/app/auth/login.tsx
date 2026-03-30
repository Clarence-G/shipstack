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
