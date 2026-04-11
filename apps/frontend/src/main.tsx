import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { ErrorBoundary } from '@/components/shared/error-boundary'
import { ThemeProvider } from '@/components/shared/theme-provider'
import { Toaster } from '@/components/ui/sonner'
import { logger } from '@/lib/logger'
import { App } from './app'
import './app.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry(failureCount, error) {
        // Don't retry auth errors — session state will resolve them
        if (error.message?.includes('UNAUTHORIZED')) return false
        return failureCount < 1
      },
    },
    mutations: {
      onError(error) {
        logger.error({ err: error.message }, 'mutation error')
        toast.error(error.message ?? 'Something went wrong')
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <App />
            <Toaster />
          </BrowserRouter>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)
