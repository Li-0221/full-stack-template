import axios, {
  isAxiosError,
  type AxiosRequestConfig,
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
  skipAuth?: boolean
  skipAuthRefresh?: boolean
}

interface ApiRequestConfig<
  TRequestData = unknown,
> extends AxiosRequestConfig<TRequestData> {
  skipAuth?: boolean
  skipAuthRefresh?: boolean
}

interface AuthenticatedFetchInit extends RequestInit {
  retryAuth?: boolean
}

type TokenRefreshHandler = (refreshToken: string) => Promise<AuthTokens>

export class ApiError extends Error {
  readonly code: number
  readonly data: unknown
  readonly status: number
  readonly response: AxiosResponse<ApiResponse<unknown>>

  constructor(response: AxiosResponse<ApiResponse<unknown>>) {
    super(response.data.message || 'Request failed')
    this.name = 'ApiError'
    this.code = response.data.code
    this.data = response.data.data
    this.status = response.status
    this.response = response
  }
}

export class ApiResponseError extends Error {
  readonly status: number
  readonly response: AxiosResponse<unknown>

  constructor(response: AxiosResponse<unknown>) {
    super('Invalid API response')
    this.name = 'ApiResponseError'
    this.status = response.status
    this.response = response
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

/** @public Narrows errors rejected because their auth session is inactive. */
export function isStaleAuthSessionError(
  error: unknown
): error is StaleAuthSessionError {
  return error instanceof StaleAuthSessionError
}

/** @public Reads the auth-session epoch attached to a request error. */
export function getAuthSessionEpoch(error: unknown) {
  if (isStaleAuthSessionError(error)) return error.sessionEpoch

  const config = isApiError(error)
    ? error.response.config
    : isAxiosError(error)
      ? error.config
      : undefined
  const sessionEpoch = (config as AuthAwareRequestConfig | undefined)
    ?._authSessionEpoch

  return typeof sessionEpoch === 'number' ? sessionEpoch : undefined
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

publicApiClient.interceptors.response.use(undefined, (error: unknown) =>
  Promise.reject(normalizeRequestError(error))
)

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: 30_000,
})

apiClient.interceptors.request.use((config) => {
  const authConfig = config as AuthAwareRequestConfig
  const auth = useAuthStore.getState().auth

  if (!authConfig.skipAuth) {
    authConfig._authSessionEpoch ??= auth.sessionEpoch
    authConfig._authRefreshToken ??=
      getPersistedRefreshToken() ?? auth.refreshToken
    const accessToken = getPersistedAccessToken() ?? auth.accessToken
    if (accessToken) {
      config.headers.set('Authorization', `Bearer ${accessToken}`)
    }
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

  if (config.skipAuthRefresh || config._authRetry) return null

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

    return response
  },
  async (error: unknown) => {
    const retryResponse = await retryUnauthorizedRequest(error)
    if (retryResponse) return retryResponse

    return Promise.reject(normalizeRequestError(error))
  }
)

export async function request<TData, TRequestData = unknown>(
  config: ApiRequestConfig<TRequestData>
): Promise<TData> {
  const response = await apiClient.request<
    ApiResponse<TData>,
    AxiosResponse<ApiResponse<TData>>,
    TRequestData
  >(config)

  if (!isApiResponse(response.data)) {
    throw new ApiResponseError(response)
  }

  if (response.data.code !== API_SUCCESS_CODE) {
    throw new ApiError(response)
  }

  return response.data.data
}

export async function authenticatedFetch(
  path: string,
  init: AuthenticatedFetchInit = {}
): Promise<Response> {
  const { retryAuth = true, ...requestInit } = init
  const auth = useAuthStore.getState().auth
  const sessionEpoch = auth.sessionEpoch
  const sessionRefreshToken = getPersistedRefreshToken() ?? auth.refreshToken
  const accessToken = getPersistedAccessToken() ?? auth.accessToken
  const headers = new Headers(requestInit.headers)
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`)
  const url = env.apiBaseUrl ? new URL(path, env.apiBaseUrl) : path
  const response = await fetch(url, {
    ...requestInit,
    headers,
  })
  if (!retryAuth || !(await isUnauthorizedFetchResponse(response))) {
    return response
  }

  const currentAuth = useAuthStore.getState().auth
  const currentRefreshToken =
    getPersistedRefreshToken() ?? currentAuth.refreshToken
  if (
    sessionEpoch !== currentAuth.sessionEpoch ||
    sessionRefreshToken !== currentRefreshToken
  ) {
    throw new StaleAuthSessionError(sessionEpoch)
  }

  const currentAccessToken =
    getPersistedAccessToken() ?? currentAuth.accessToken
  if (currentAccessToken && currentAccessToken !== accessToken) {
    const retryHeaders = new Headers(headers)
    retryHeaders.set('Authorization', `Bearer ${currentAccessToken}`)
    return authenticatedFetch(path, {
      ...requestInit,
      headers: retryHeaders,
      retryAuth: false,
    })
  }

  if (!currentRefreshToken || !tokenRefreshHandler) {
    currentAuth.expire()
    return response
  }
  if (!(await getRefreshPromise(currentRefreshToken))) return response

  const refreshedAuth = useAuthStore.getState().auth
  if (refreshedAuth.sessionEpoch !== sessionEpoch) {
    throw new StaleAuthSessionError(sessionEpoch)
  }
  const refreshedAccessToken =
    getPersistedAccessToken() ?? refreshedAuth.accessToken
  const retryHeaders = new Headers(headers)
  retryHeaders.set('Authorization', `Bearer ${refreshedAccessToken}`)
  return authenticatedFetch(path, {
    ...requestInit,
    headers: retryHeaders,
    retryAuth: false,
  })
}

async function isUnauthorizedFetchResponse(response: Response) {
  if (response.status === 401) return true
  if (!response.headers.get('Content-Type')?.includes('application/json')) {
    return false
  }

  const body: unknown = await response
    .clone()
    .json()
    .catch(() => null)
  return isApiResponse(body) && body.code === ACCESS_TOKEN_EXPIRED_CODE
}
