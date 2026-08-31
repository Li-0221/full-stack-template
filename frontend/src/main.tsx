import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { isAxiosError } from 'axios'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { appConfig } from '@/config/app'
import { ACCESS_TOKEN_EXPIRED_CODE } from '@/types/api'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { configureTokenRefresh, isApiError } from '@/lib/api-client'
import { setupAppVersionNotification } from '@/lib/app-version-notification'
import { env } from '@/lib/env'
import { handleServerError } from '@/lib/handle-server-error'
import { refreshSession } from '@/features/auth/data/session'
import { DirectionProvider } from './context/direction-provider'
import { FontProvider } from './context/font-provider'
import { ThemeProvider } from './context/theme-provider'
// Generated Routes
import { routeTree } from './routeTree.gen'
// Styles
import './styles/index.css'

document.title = appConfig.name
document
  .querySelector('meta[name="description"]')
  ?.setAttribute('content', appConfig.description)

configureTokenRefresh(refreshSession)

function getErrorStatus(error: unknown) {
  if (isApiError(error)) return error.status
  if (isAxiosError(error)) return error.response?.status

  return undefined
}

function isAuthenticationError(error: unknown) {
  if (getErrorStatus(error) === 401) return true
  if (!isApiError(error)) return false

  return error.code === ACCESS_TOKEN_EXPIRED_CODE
}

function handleAuthenticationError(error: unknown) {
  if (!isAuthenticationError(error)) return false

  toast.error('Session expired!')
  useAuthStore.getState().auth.reset()
  const redirect = `${router.history.location.href}`
  router.navigate({ to: '/sign-in', search: { redirect } })
  return true
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 3 && import.meta.env.PROD) return false

        if (isApiError(error)) return false

        return ![401, 403].includes(getErrorStatus(error) ?? 0)
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 10 * 1000, // 10s
    },
    mutations: {
      onError: (error) => {
        if (handleAuthenticationError(error)) return

        handleServerError(error)

        if (getErrorStatus(error) === 304) {
          toast.error('Content not modified!')
        }
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (handleAuthenticationError(error)) return

      const status = getErrorStatus(error)
      if (status === 500) {
        toast.error('Internal Server Error!')
        // Only navigate to error page in production to avoid disrupting HMR in development
        if (import.meta.env.PROD) {
          router.navigate({ to: '/500' })
        }
      }
      if (status === 403) {
        // router.navigate("/forbidden", { replace: true });
      }
    },
  }),
})

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  basepath: env.appBasePath,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <FontProvider>
            <DirectionProvider>
              <RouterProvider router={router} />
            </DirectionProvider>
          </FontProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}

setupAppVersionNotification()
