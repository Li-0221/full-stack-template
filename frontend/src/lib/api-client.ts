import axios, {
  isAxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import {
  ACCESS_TOKEN_EXPIRED_CODE,
  API_SUCCESS_CODE,
  type ApiResponse,
  type AuthTokens,
} from '@/types/api'
import {
  getPersistedAccessToken,
  getPersistedRefreshToken,
  isPersistedAuthSessionCurrent,
  useAuthStore,
} from '@/stores/auth-store'
import { env } from './env'

interface AuthAwareRequestConfig extends InternalAxiosRequestConfig {
  _authRetry?: boolean
  _authRefreshToken?: string
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

async function refreshSession(refreshToken: string) {
  const handler = tokenRefreshHandler
  if (!handler) return false

  try {
    const tokens = await handler(refreshToken)
    if (!tokens.accessToken || !tokens.refreshToken) {
      throw new Error('Token refresh returned an incomplete session')
    }

    const auth = useAuthStore.getState().auth
    if (!isPersistedAuthSessionCurrent(refreshToken)) {
      return false
    }

    auth.refreshSession(tokens)
    return true
  } catch (error) {
    const auth = useAuthStore.getState().auth
    if (
      isPersistedAuthSessionCurrent(refreshToken) &&
      isRefreshSessionInvalid(error)
    ) {
      auth.expire()
      return false
    }
    throw normalizeRequestError(error)
  }
}

function getRefreshPromise(refreshToken: string) {
  if (refreshPromise) return refreshPromise

  const attempt = refreshSession(refreshToken)
  refreshPromise = attempt
  const clearRefreshPromise = () => {
    if (refreshPromise === attempt) refreshPromise = null
  }
  void attempt.then(clearRefreshPromise, clearRefreshPromise)

  return attempt
}

export const publicApiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
})

publicApiClient.interceptors.response.use(
  ensureSuccessfulApiResponse,
  (error: unknown) => Promise.reject(normalizeRequestError(error))
)

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
})

apiClient.interceptors.request.use((config) => {
  const authConfig = config as AuthAwareRequestConfig
  const auth = useAuthStore.getState().auth

  authConfig._authSessionEpoch ??= auth.sessionEpoch
  authConfig._authRefreshToken ??=
    getPersistedRefreshToken() ?? auth.refreshToken
  const accessToken = getPersistedAccessToken() ?? auth.accessToken
  if (accessToken) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }

  return config
})

async function retryUnauthorizedRequest(error: unknown) {
  if (!isAxiosError(error) || error.response?.status !== 401 || !error.config) {
    return null
  }

  return retryWithFreshSession(error.config as AuthAwareRequestConfig)
}

async function retryWithFreshSession(config: AuthAwareRequestConfig) {
  const auth = useAuthStore.getState().auth
  const refreshToken = getPersistedRefreshToken() ?? auth.refreshToken
  if (
    typeof config._authSessionEpoch === 'number' &&
    config._authSessionEpoch !== auth.sessionEpoch
  ) {
    throw new StaleAuthSessionError(config._authSessionEpoch)
  }
  if (
    typeof config._authRefreshToken === 'string' &&
    config._authRefreshToken !== refreshToken
  ) {
    throw new StaleAuthSessionError(
      config._authSessionEpoch ?? auth.sessionEpoch
    )
  }

  if (config._authRetry) return null

  const requestAuthorization = config.headers.get('Authorization')
  const currentAccessToken = getPersistedAccessToken() ?? auth.accessToken
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
    config.headers.set('Authorization', currentAuthorization)
    return apiClient.request(config)
  }

  if (!refreshToken || !tokenRefreshHandler) {
    auth.expire()
    return null
  }

  config._authRetry = true
  const refreshed = await getRefreshPromise(refreshToken)
  if (!refreshed) return null

  const accessToken =
    getPersistedAccessToken() ?? useAuthStore.getState().auth.accessToken
  config.headers.set('Authorization', `Bearer ${accessToken}`)
  return apiClient.request(config)
}

apiClient.interceptors.response.use(
  async (response) => {
    if (!isApiResponse(response.data)) return response

    if (response.data.code === ACCESS_TOKEN_EXPIRED_CODE) {
      const retryResponse = await retryWithFreshSession(
        response.config as AuthAwareRequestConfig
      )
      if (retryResponse) return retryResponse
    }

    return ensureSuccessfulApiResponse(response)
  },
  async (error: unknown) => {
    const retryResponse = await retryUnauthorizedRequest(error)
    if (retryResponse) return retryResponse

    return Promise.reject(normalizeRequestError(error))
  }
)
