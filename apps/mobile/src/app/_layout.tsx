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
