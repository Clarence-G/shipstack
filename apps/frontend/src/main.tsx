import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'
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
        toast.error(error.message ?? 'Something went wrong')
      },
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
        <Toaster />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
