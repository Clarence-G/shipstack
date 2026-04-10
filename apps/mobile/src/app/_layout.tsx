import '../global.css'

import { ThemeProvider } from '@react-navigation/native'
import { PortalHost } from '@rn-primitives/portal'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useState } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Toaster, toast } from 'sonner-native'
import { useUniwind } from 'uniwind'
import { SheetProvider } from '@/components/ui/sheet'
import { NAV_THEME } from '@/lib/theme'

export default function RootLayout() {
  const { theme } = useUniwind()
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
          },
          mutations: {
            onError(error) {
              toast.error(error.message ?? 'Something went wrong')
            },
          },
        },
      }),
  )

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={NAV_THEME[theme]}>
        <QueryClientProvider client={queryClient}>
          <SheetProvider>
            <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
            <Stack>
              <Stack.Screen name="index" options={{ title: 'Home' }} />
              <Stack.Screen name="auth" options={{ headerShown: false }} />
            </Stack>
            <PortalHost />
            <Toaster position="top-center" richColors theme={theme} />
          </SheetProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  )
}
