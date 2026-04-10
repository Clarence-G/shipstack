import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { ActivityIndicator, Pressable, Text, View } from 'react-native'
import { signOut, useSession } from '@/lib/auth-client'

export default function HomeScreen() {
  const { data: session, isPending } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (!isPending && !session) {
      router.replace('/auth/login')
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
    router.replace('/auth/login')
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
        <Text className="text-base font-medium text-gray-700 dark:text-gray-300">Sign Out</Text>
      </Pressable>
    </View>
  )
}
