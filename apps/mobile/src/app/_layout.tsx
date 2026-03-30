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
