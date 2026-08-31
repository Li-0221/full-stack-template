import {
  AxiosError,
  AxiosHeaders,
  type AxiosAdapter,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import type { AuthTokens } from '@/types/api'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import {
  ApiError,
  ApiResponseError,
  StaleAuthSessionError,
  authenticatedFetch,
  configureTokenRefresh,
  request,
} from './api-client'

const AUTH_STORAGE_KEY = 'tripguru_admin_session_v3'

function authTokens(accessToken: string, refreshToken: string): AuthTokens {
  return {
    accessToken,
    accessExpiresAt: Date.now() + 15 * 60 * 1000,
    refreshToken,
    refreshExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  }
}

function createResponse<TData>(
  config: InternalAxiosRequestConfig,
  data: TData,
  status = 200
): AxiosResponse<TData> {
  return {
    config,
    data,
    headers: new AxiosHeaders(),
    status,
    statusText: status === 200 ? 'OK' : 'Unauthorized',
  }
}

function unauthorized(config: InternalAxiosRequestConfig) {
  const response = createResponse(
    config,
    { code: 40101, data: {}, message: 'Session expired' },
    401
  )

  return new AxiosError(
    'Request failed with status code 401',
    AxiosError.ERR_BAD_REQUEST,
    config,
    undefined,
    response
  )
}

function createDeferred<TValue>() {
  let resolve!: (value: TValue) => void
  const promise = new Promise<TValue>((promiseResolve) => {
    resolve = promiseResolve
  })

  return { promise, resolve }
}

describe('request', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    useAuthStore.getState().auth.reset()
    configureTokenRefresh(null)
  })

  it('returns data from a successful code 0 response', async () => {
    const adapter: AxiosAdapter = async (config) =>
      createResponse(config, {
        code: 0,
        data: { id: 'item-1' },
        message: 'success',
      })

    await expect(
      request<{ id: string }>({ url: '/items/1', adapter })
    ).resolves.toEqual({ id: 'item-1' })
  })

  it('throws ApiError when the HTTP request succeeds with a non-zero code', async () => {
    const adapter: AxiosAdapter = async (config) =>
      createResponse(config, {
        code: 1001,
        data: { field: 'name' },
        message: 'Validation failed',
      })

    const promise = request({ url: '/items', adapter })

    await expect(promise).rejects.toMatchObject({
      name: 'ApiError',
      code: 1001,
      data: { field: 'name' },
      message: 'Validation failed',
    })
  })

  it('rejects responses that do not match the common envelope', async () => {
    const adapter: AxiosAdapter = async (config) =>
      createResponse(config, { id: 'item-1' })

    await expect(request({ url: '/items/1', adapter })).rejects.toBeInstanceOf(
      ApiResponseError
    )
  })

  it('adds the current access token as a bearer header', async () => {
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('access-token', 'refresh-token'))
    const adapter: AxiosAdapter = vi.fn(async (config) => {
      expect(config.headers.get('Authorization')).toBe('Bearer access-token')
      return createResponse(config, { code: 0, data: {}, message: 'success' })
    })

    await request({ url: '/items', adapter })

    expect(adapter).toHaveBeenCalledOnce()
  })

  it('reads the latest access token written by another tab', async () => {
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('memory-access', 'memory-refresh'))
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        ...authTokens('shared-access', 'shared-refresh'),
      })
    )
    const adapter: AxiosAdapter = vi.fn(async (config) => {
      expect(config.headers.get('Authorization')).toBe('Bearer shared-access')
      return createResponse(config, { code: 0, data: {}, message: 'success' })
    })

    await request({ url: '/items', adapter })

    expect(adapter).toHaveBeenCalledOnce()
  })

  it('can explicitly skip the bearer header for public auth requests', async () => {
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('access-token', 'refresh-token'))
    const adapter: AxiosAdapter = async (config) => {
      expect(config.headers.get('Authorization')).toBeUndefined()
      return createResponse(config, { code: 0, data: {}, message: 'success' })
    }

    await request({
      url: '/auth/refresh',
      adapter,
      skipAuth: true,
      skipAuthRefresh: true,
    })
  })

  it('refreshes once and retries a request with the new access token', async () => {
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('expired-access', 'current-refresh'))
    const refresh = vi.fn(async () =>
      authTokens('new-access', 'current-refresh')
    )
    configureTokenRefresh(refresh)

    const authorizationHeaders: unknown[] = []
    let attempts = 0
    const adapter: AxiosAdapter = async (config) => {
      attempts += 1
      authorizationHeaders.push(config.headers.get('Authorization'))
      if (attempts === 1) throw unauthorized(config)

      return createResponse(config, {
        code: 0,
        data: { recovered: true },
        message: 'success',
      })
    }

    await expect(
      request<{ recovered: boolean }>({ url: '/protected', adapter })
    ).resolves.toEqual({ recovered: true })
    expect(refresh).toHaveBeenCalledOnce()
    expect(refresh).toHaveBeenCalledWith('current-refresh')
    expect(authorizationHeaders).toEqual([
      'Bearer expired-access',
      'Bearer new-access',
    ])
    expect(useAuthStore.getState().auth).toMatchObject({
      accessToken: 'new-access',
      refreshToken: 'current-refresh',
    })
  })

  it('refreshes with the latest refresh token written by another tab', async () => {
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('memory-access', 'memory-refresh'))
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        ...authTokens('shared-expired-access', 'shared-refresh'),
      })
    )
    const refresh = vi.fn(async () =>
      authTokens('shared-new-access', 'shared-refresh')
    )
    configureTokenRefresh(refresh)

    let attempts = 0
    const adapter: AxiosAdapter = async (config) => {
      attempts += 1
      if (attempts === 1) throw unauthorized(config)
      expect(config.headers.get('Authorization')).toBe(
        'Bearer shared-new-access'
      )
      return createResponse(config, { code: 0, data: {}, message: 'success' })
    }

    await request({ url: '/protected', adapter })

    expect(refresh).toHaveBeenCalledOnce()
    expect(refresh).toHaveBeenCalledWith('shared-refresh')
  })

  it('also refreshes when the backend returns custom code 40111', async () => {
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('expired-access', 'current-refresh'))
    const refresh = vi.fn(async () =>
      authTokens('new-access', 'current-refresh')
    )
    configureTokenRefresh(refresh)

    let attempts = 0
    const adapter: AxiosAdapter = async (config) => {
      attempts += 1
      if (attempts === 1) {
        return createResponse(config, {
          code: 40111,
          data: {},
          message: 'Access token expired',
        })
      }

      expect(config.headers.get('Authorization')).toBe('Bearer new-access')
      return createResponse(config, {
        code: 0,
        data: { recovered: true },
        message: 'success',
      })
    }

    await expect(
      request<{ recovered: boolean }>({ url: '/protected', adapter })
    ).resolves.toEqual({ recovered: true })
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('shares one refresh attempt across concurrent expired requests', async () => {
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('expired-access', 'current-refresh'))

    const refreshAttempt = createDeferred<AuthTokens>()
    const refresh = vi.fn(() => refreshAttempt.promise)
    configureTokenRefresh(refresh)

    const adapter: AxiosAdapter = async (config) => {
      if (config.headers.get('Authorization') === 'Bearer expired-access') {
        return createResponse(config, {
          code: 40111,
          data: {},
          message: 'Access token expired',
        })
      }

      return createResponse(config, {
        code: 0,
        data: { recovered: true },
        message: 'success',
      })
    }

    const requests = Promise.all([
      request<{ recovered: boolean }>({ url: '/protected/1', adapter }),
      request<{ recovered: boolean }>({ url: '/protected/2', adapter }),
    ])

    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    refreshAttempt.resolve(authTokens('new-access', 'current-refresh'))

    await expect(requests).resolves.toEqual([
      { recovered: true },
      { recovered: true },
    ])
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('does not restore a persisted session removed while refresh is in flight', async () => {
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('expired-access', 'current-refresh'))
    const refreshAttempt = createDeferred<AuthTokens>()
    const refresh = vi.fn(() => refreshAttempt.promise)
    configureTokenRefresh(refresh)
    const adapter: AxiosAdapter = async (config) =>
      createResponse(config, {
        code: 40111,
        data: {},
        message: 'Access token expired',
      })

    const protectedRequest = request({ url: '/protected', adapter })
    await vi.waitFor(() => expect(refresh).toHaveBeenCalledOnce())
    localStorage.removeItem(AUTH_STORAGE_KEY)
    refreshAttempt.resolve(authTokens('late-access', 'current-refresh'))

    await expect(protectedRequest).rejects.toBeInstanceOf(ApiError)
    expect(useAuthStore.getState().auth.accessToken).toBe('expired-access')
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('does not refresh again for an expired response that arrives after rotation', async () => {
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('expired-access', 'current-refresh'))
    const refresh = vi.fn(async () =>
      authTokens('new-access', 'current-refresh')
    )
    configureTokenRefresh(refresh)

    const delayedResponse = createDeferred<void>()
    const adapter: AxiosAdapter = async (config) => {
      const authorization = config.headers.get('Authorization')
      if (
        config.url === '/protected/slow' &&
        authorization === 'Bearer expired-access'
      ) {
        await delayedResponse.promise
      }

      if (authorization === 'Bearer expired-access') {
        return createResponse(config, {
          code: 40111,
          data: {},
          message: 'Access token expired',
        })
      }

      return createResponse(config, {
        code: 0,
        data: { recovered: true },
        message: 'success',
      })
    }

    const slowRequest = request<{ recovered: boolean }>({
      url: '/protected/slow',
      adapter,
    })
    await expect(
      request<{ recovered: boolean }>({
        url: '/protected/fast',
        adapter,
      })
    ).resolves.toEqual({ recovered: true })

    delayedResponse.resolve()
    await expect(slowRequest).resolves.toEqual({ recovered: true })
    expect(refresh).toHaveBeenCalledOnce()
  })

  it('clears the session when a 401 cannot be refreshed', async () => {
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('expired-access', 'refresh-token'))
    const adapter: AxiosAdapter = async (config) => {
      throw unauthorized(config)
    }

    await expect(
      request({ url: '/protected', adapter })
    ).rejects.toBeInstanceOf(ApiError)
    expect(useAuthStore.getState().auth).toMatchObject({
      accessToken: '',
      refreshToken: '',
      isSessionExpired: true,
    })
  })

  it('preserves the persisted session after a transient refresh failure', async () => {
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('expired-access', 'current-refresh'))
    configureTokenRefresh(vi.fn().mockRejectedValue(new Error('Network error')))
    const adapter: AxiosAdapter = async (config) => {
      throw unauthorized(config)
    }

    await expect(request({ url: '/protected', adapter })).rejects.toThrow(
      'Network error'
    )
    expect(useAuthStore.getState().auth).toMatchObject({
      accessToken: 'expired-access',
      refreshToken: 'current-refresh',
      isSessionExpired: false,
    })
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toContain('current-refresh')
  })

  it('never replays a stale request after a new session is established', async () => {
    const auth = useAuthStore.getState().auth
    auth.establishSession(authTokens('old-access', 'old-refresh'))
    const oldResponse = createDeferred<void>()
    const requestStarted = createDeferred<void>()
    const refresh = vi.fn(async () =>
      authTokens('unused-access', 'unused-refresh')
    )
    configureTokenRefresh(refresh)

    const adapter: AxiosAdapter = vi.fn(async (config) => {
      requestStarted.resolve()
      await oldResponse.promise
      throw unauthorized(config)
    })
    const requestFromOldSession = request({ url: '/protected', adapter })

    await requestStarted.promise
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('new-access', 'new-refresh'))
    oldResponse.resolve()

    await expect(requestFromOldSession).rejects.toBeInstanceOf(
      StaleAuthSessionError
    )
    expect(adapter).toHaveBeenCalledOnce()
    expect(refresh).not.toHaveBeenCalled()
    expect(useAuthStore.getState().auth).toMatchObject({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    })
  })

  it('never replays a stale request after another tab replaces the session', async () => {
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('old-access', 'old-refresh'))
    const oldResponse = createDeferred<void>()
    const requestStarted = createDeferred<void>()
    const refresh = vi.fn(async () =>
      authTokens('unused-access', 'unused-refresh')
    )
    configureTokenRefresh(refresh)

    const adapter: AxiosAdapter = vi.fn(async (config) => {
      requestStarted.resolve()
      if (config.headers.get('Authorization') === 'Bearer old-access') {
        await oldResponse.promise
        throw unauthorized(config)
      }
      return createResponse(config, { code: 0, data: {}, message: 'success' })
    })
    const requestFromOldSession = request({ url: '/protected', adapter })

    await requestStarted.promise
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        ...authTokens('new-access', 'new-refresh'),
      })
    )
    oldResponse.resolve()

    await expect(requestFromOldSession).rejects.toBeInstanceOf(
      StaleAuthSessionError
    )
    expect(adapter).toHaveBeenCalledOnce()
    expect(refresh).not.toHaveBeenCalled()
  })
})

describe('authenticatedFetch', () => {
  beforeEach(() => {
    sessionStorage.clear()
    localStorage.clear()
    useAuthStore.getState().auth.reset()
    configureTokenRefresh(null)
    vi.restoreAllMocks()
  })

  it('refreshes a custom 40111 response and retries with the new access token', async () => {
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('expired-access', 'current-refresh'))
    const refresh = vi.fn(async () =>
      authTokens('new-access', 'current-refresh')
    )
    configureTokenRefresh(refresh)
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        Response.json(
          { code: 40111, data: {}, message: 'Access token expired' },
          { status: 200 }
        )
      )
      .mockResolvedValueOnce(new Response('stream', { status: 200 }))

    await expect(authenticatedFetch('/stream')).resolves.toMatchObject({
      status: 200,
    })

    expect(refresh).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(
      new Headers(fetchMock.mock.calls[0]?.[1]?.headers).get('Authorization')
    ).toBe('Bearer expired-access')
    expect(
      new Headers(fetchMock.mock.calls[1]?.[1]?.headers).get('Authorization')
    ).toBe('Bearer new-access')
  })

  it('never replays a delayed 401 after another session is established', async () => {
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('old-access', 'old-refresh'))
    const oldResponse = createDeferred<Response>()
    const refresh = vi.fn(async () =>
      authTokens('unused-access', 'unused-refresh')
    )
    configureTokenRefresh(refresh)
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(() => oldResponse.promise)

    const requestFromOldSession = authenticatedFetch('/stream')
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    useAuthStore
      .getState()
      .auth.establishSession(authTokens('new-access', 'new-refresh'))
    oldResponse.resolve(new Response(null, { status: 401 }))

    await expect(requestFromOldSession).rejects.toBeInstanceOf(
      StaleAuthSessionError
    )
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(refresh).not.toHaveBeenCalled()
  })
})
