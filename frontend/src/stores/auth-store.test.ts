import { clearCookies } from '@/test-utils/cookies'
import { beforeEach, describe, expect, it } from 'vitest'
import { createAuthStore } from './auth-store'

const LEGACY_STORAGE_KEY = 'full_stack_admin_session_v1'
const REFRESH_ONLY_STORAGE_KEY = 'full_stack_admin_refresh_session_v2'
const AUTH_STORAGE_KEY = 'full_stack_admin_session_v3'
const tokens = {
  accessToken: 'access-token',
  accessExpiresAt: Date.now() + 15 * 60 * 1000,
  refreshToken: 'refresh-token',
  refreshExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
}

describe('useAuthStore', () => {
  beforeEach(() => {
    clearCookies()
    sessionStorage.clear()
    localStorage.clear()
  })

  it('starts with an anonymous in-memory session when nothing is persisted', () => {
    const useAuthStore = createAuthStore()

    expect(useAuthStore.getState().auth).toMatchObject({
      accessToken: '',
      refreshToken: '',
      sessionEpoch: 0,
      isSessionExpired: false,
    })
  })

  it('persists the complete token session for reuse by new tabs', () => {
    const useAuthStore = createAuthStore()
    useAuthStore.getState().auth.establishSession(tokens)

    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? '')).toEqual({
      version: 3,
      ...tokens,
    })
    expect(sessionStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull()

    const useAuthStoreAfterReload = createAuthStore()

    expect(useAuthStoreAfterReload.getState().auth).toMatchObject({
      ...tokens,
      sessionEpoch: 0,
    })
  })

  it('refreshes access without changing the current session epoch', () => {
    const useAuthStore = createAuthStore()
    const auth = useAuthStore.getState().auth
    auth.establishSession(tokens)
    const sessionEpoch = useAuthStore.getState().auth.sessionEpoch

    useAuthStore.getState().auth.refreshSession({
      ...tokens,
      accessToken: 'refreshed-access-token',
    })

    expect(useAuthStore.getState().auth).toMatchObject({
      accessToken: 'refreshed-access-token',
      refreshToken: 'refresh-token',
      sessionEpoch,
    })
  })

  it('reset clears memory and every persisted auth format', () => {
    const useAuthStore = createAuthStore()
    useAuthStore.getState().auth.establishSession(tokens)

    useAuthStore.getState().auth.reset()

    expect(useAuthStore.getState().auth).toMatchObject({
      accessToken: '',
      refreshToken: '',
      isSessionExpired: false,
    })
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem(REFRESH_ONLY_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull()
  })

  it('drops an expired persisted token session', () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        accessToken: 'expired-access-token',
        accessExpiresAt: Date.now() - 1,
        refreshToken: 'expired-refresh-token',
        refreshExpiresAt: Date.now() - 1,
      })
    )

    const useAuthStore = createAuthStore()

    expect(useAuthStore.getState().auth.refreshToken).toBe('')
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
  })

  it('migrates the refresh-only local session into complete storage', () => {
    localStorage.setItem(
      REFRESH_ONLY_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        refreshToken: tokens.refreshToken,
        refreshExpiresAt: tokens.refreshExpiresAt,
      })
    )

    const useAuthStore = createAuthStore()

    expect(useAuthStore.getState().auth).toMatchObject({
      accessToken: '',
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: tokens.refreshExpiresAt,
    })
    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? '')).toEqual({
      version: 3,
      accessToken: '',
      accessExpiresAt: 0,
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: tokens.refreshExpiresAt,
    })
    expect(localStorage.getItem(REFRESH_ONLY_STORAGE_KEY)).toBeNull()
  })

  it('migrates the legacy tab refresh session into complete storage', () => {
    sessionStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        refreshToken: tokens.refreshToken,
        refreshExpiresAt: tokens.refreshExpiresAt,
      })
    )

    const useAuthStore = createAuthStore()

    expect(useAuthStore.getState().auth).toMatchObject({
      accessToken: '',
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: tokens.refreshExpiresAt,
    })
    expect(JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY) ?? '')).toEqual({
      version: 3,
      accessToken: '',
      accessExpiresAt: 0,
      refreshToken: tokens.refreshToken,
      refreshExpiresAt: tokens.refreshExpiresAt,
    })
    expect(sessionStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull()
  })

  it('removes stale legacy formats when complete storage already exists', () => {
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        version: 3,
        ...tokens,
      })
    )
    localStorage.setItem(
      REFRESH_ONLY_STORAGE_KEY,
      JSON.stringify({
        version: 2,
        refreshToken: 'stale-refresh-token',
        refreshExpiresAt: tokens.refreshExpiresAt,
      })
    )
    sessionStorage.setItem(
      LEGACY_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        refreshToken: 'stale-tab-refresh-token',
        refreshExpiresAt: tokens.refreshExpiresAt,
      })
    )

    createAuthStore()

    expect(localStorage.getItem(REFRESH_ONLY_STORAGE_KEY)).toBeNull()
    expect(sessionStorage.getItem(LEGACY_STORAGE_KEY)).toBeNull()
  })

  it('removes the legacy JavaScript cookie during migration', () => {
    document.cookie =
      'full_stack_admin_session={"accessToken":"legacy","refreshToken":"legacy"}; path=/'

    createAuthStore()

    expect(document.cookie).not.toContain('full_stack_admin_session=')
  })
})
