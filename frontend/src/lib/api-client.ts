import axios, {
  isAxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import {
  API_SUCCESS_CODE,
  type ApiResponse,
  type AuthTokens,
} from '@/types/api'
import { useAuthStore } from '@/stores/auth-store'

interface AuthAwareRequestConfig extends InternalAxiosRequestConfig {
  _authRetry?: boolean
  _authSessionId?: string
  _authSessionEpoch?: number
}

type TokenRefreshHandler = (refreshToken: string) => Promise<AuthTokens>

export class ApiError extends Error {
  readonly code: number
  readonly data: unknown
  readonly status: number

  constructor(response: AxiosResponse<ApiResponse<unknown>>) {
    super(response.data.message || 'Request failed')
    this.name = 'ApiError'
    this.code = response.data.code
    this.data = response.data.data
    this.status = response.status
  }
}

export class StaleAuthSessionError extends Error {
  readonly sessionEpoch: number

  constructor(sessionEpoch: number) {
    super('Request belongs to an inactive authentication session')
    this.name = 'StaleAuthSessionError'
    this.sessionEpoch = sessionEpoch
  }
}

let tokenRefreshHandler: TokenRefreshHandler | null = null
let refreshPromise: Promise<boolean> | null = null
let refreshEpoch: number | null = null

export function configureTokenRefresh(handler: TokenRefreshHandler | null) {
  tokenRefreshHandler = handler
  refreshPromise = null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isApiResponse(value: unknown): value is ApiResponse<unknown> {
  return (
    isRecord(value) &&
    typeof value.code === 'number' &&
    typeof value.message === 'string' &&
    'data' in value
  )
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

function normalizeRequestError(error: unknown) {
  if (
    isAxiosError(error) &&
    error.response &&
    isApiResponse(error.response.data)
  ) {
    return new ApiError(error.response as AxiosResponse<ApiResponse<unknown>>)
  }

  return error instanceof Error ? error : new Error('Unknown request error')
}

function ensureSuccessfulApiResponse(response: AxiosResponse) {
  if (isApiResponse(response.data) && response.data.code !== API_SUCCESS_CODE) {
    throw new ApiError(response as AxiosResponse<ApiResponse<unknown>>)
  }

  return response
}

function isRefreshSessionInvalid(error: unknown) {
  if (isApiError(error)) return error.status === 401
  return isAxiosError(error) && error.response?.status === 401
}

async function refreshSession(refreshToken: string, epoch: number) {
  const handler = tokenRefreshHandler
  if (!handler) return false

  try {
    const tokens = await handler(refreshToken)
    if (!tokens.accessToken || !tokens.refreshToken) {
      throw new Error('Token refresh returned an incomplete session')
    }

    const auth = useAuthStore.getState().auth.syncFromStorage()
    if (auth.sessionEpoch !== epoch || auth.refreshToken !== refreshToken) {
      return false
    }

    auth.refreshSession(tokens)
    return true
  } catch (error) {
    const auth = useAuthStore.getState().auth.syncFromStorage()
    // Another tab may already have consumed this token and persisted its rotation.
    if (isRefreshSessionInvalid(error) && auth.sessionEpoch === epoch) {
      if (auth.refreshToken && auth.refreshToken !== refreshToken) return true
      if (auth.refreshToken === refreshToken) {
        auth.expire()
        return false
      }
    }
    throw normalizeRequestError(error)
  }
}

function getRefreshPromise(refreshToken: string, epoch: number) {
  if (refreshPromise && refreshEpoch === epoch) return refreshPromise

  const attempt = refreshSession(refreshToken, epoch)
  refreshPromise = attempt
  refreshEpoch = epoch
  const clearRefreshPromise = () => {
    if (refreshPromise === attempt) refreshPromise = null
  }
  void attempt.then(clearRefreshPromise, clearRefreshPromise)

  return attempt
}

export const publicApiClient = axios.create({
  baseURL: '/',
  timeout: 30_000,
})

publicApiClient.interceptors.response.use(
  ensureSuccessfulApiResponse,
  (error: unknown) => Promise.reject(normalizeRequestError(error))
)

export const apiClient = axios.create({
  baseURL: '/',
  timeout: 30_000,
})

apiClient.interceptors.request.use((config) => {
  const authConfig = config as AuthAwareRequestConfig
  const auth = assertCurrentSession(authConfig)

  authConfig._authSessionEpoch ??= auth.sessionEpoch
  authConfig._authSessionId ??= auth.sessionId
  const accessToken = auth.accessToken
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  } else {
    config.headers.delete('Authorization')
  }

  return config
})

function assertCurrentSession(config: AuthAwareRequestConfig) {
  const auth = useAuthStore.getState().auth.syncFromStorage()
  if (
    typeof config._authSessionEpoch === 'number' &&
    config._authSessionEpoch !== auth.sessionEpoch
  ) {
    throw new StaleAuthSessionError(config._authSessionEpoch)
  }
  if (
    typeof config._authSessionId === 'string' &&
    config._authSessionId !== auth.sessionId
  ) {
    throw new StaleAuthSessionError(
      config._authSessionEpoch ?? auth.sessionEpoch
    )
  }
  return auth
}

async function retryWithFreshSession(config: AuthAwareRequestConfig) {
  const auth = assertCurrentSession(config)
  const refreshToken = auth.refreshToken

  if (config._authRetry) return null

  const requestAuthorization = config.headers.get('Authorization')
  const currentAccessToken = auth.accessToken
  const currentAuthorization = currentAccessToken
    ? `Bearer ${currentAccessToken}`
    : null

  // A slower request can return an expired-token response after another
  // request has already rotated the session. Retry it with the current access
  // token instead of starting a second refresh.
  if (
    currentAuthorization &&
    typeof requestAuthorization === 'string' &&
    requestAuthorization !== currentAuthorization
  ) {
    config._authRetry = true
    return apiClient.request(config)
  }

  if (!refreshToken || !tokenRefreshHandler) {
    auth.expire()
    return null
  }

  config._authRetry = true
  let refreshed: boolean
  try {
    refreshed = await getRefreshPromise(refreshToken, auth.sessionEpoch)
  } finally {
    if (!useAuthStore.getState().auth.isSessionExpired)
      assertCurrentSession(config)
  }
  if (!refreshed) return null
  return apiClient.request(config)
}

apiClient.interceptors.response.use(
  (response) => {
    assertCurrentSession(response.config as AuthAwareRequestConfig)
    return ensureSuccessfulApiResponse(response)
  },
  async (error: unknown) => {
    if (isAxiosError(error) && error.config) {
      const config = error.config as AuthAwareRequestConfig
      if (error.response?.status === 401) {
        const retryResponse = await retryWithFreshSession(config)
        if (retryResponse) return retryResponse
      } else {
        assertCurrentSession(config)
      }
    }

    return Promise.reject(normalizeRequestError(error))
  }
)
