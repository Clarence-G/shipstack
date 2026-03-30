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
