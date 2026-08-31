import { beforeEach, describe, expect, it } from 'vitest'
import { createAuthStore } from './auth-store'

const AUTH_STORAGE_KEY = 'full_stack_admin_session_v3'
const tokens = {
  accessToken: 'access-token',
  accessExpiresAt: Date.now() + 15 * 60 * 1000,
  refreshToken: 'refresh-token',
  refreshExpiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
}

describe('useAuthStore', () => {
  beforeEach(() => {
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

  it('reset clears memory and the persisted session', () => {
    const useAuthStore = createAuthStore()
    useAuthStore.getState().auth.establishSession(tokens)

    useAuthStore.getState().auth.reset()

    expect(useAuthStore.getState().auth).toMatchObject({
      accessToken: '',
      refreshToken: '',
      isSessionExpired: false,
    })
    expect(localStorage.getItem(AUTH_STORAGE_KEY)).toBeNull()
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
})
