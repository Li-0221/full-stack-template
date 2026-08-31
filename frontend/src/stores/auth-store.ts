import type { AuthTokens } from '@/types/api'
import { create } from 'zustand'
import { removeCookie } from '@/lib/cookies'

const AUTH_SESSION_STORAGE_KEY = 'full_stack_admin_session_v3'
const LEGACY_REFRESH_STORAGE_KEY = 'full_stack_admin_refresh_session_v2'
const LEGACY_TAB_STORAGE_KEY = 'full_stack_admin_session_v1'
const LEGACY_AUTH_SESSION_COOKIE = 'full_stack_admin_session'
const AUTH_SESSION_STORAGE_VERSION = 3
const LEGACY_REFRESH_STORAGE_VERSION = 2
const LEGACY_TAB_STORAGE_VERSION = 1

interface PersistedAuthSession extends AuthTokens {
  version: typeof AUTH_SESSION_STORAGE_VERSION
}

interface PersistedRefreshSession {
  version: number
  refreshToken: string
  refreshExpiresAt: number
}

interface AuthSessionState extends AuthTokens {
  sessionEpoch: number
  isSessionExpired: boolean
  establishSession: (tokens: AuthTokens) => void
  refreshSession: (tokens: AuthTokens) => void
  expire: () => void
  reset: () => void
}

interface AuthState {
  auth: AuthSessionState
}

const EMPTY_TOKENS: AuthTokens = {
  accessToken: '',
  accessExpiresAt: 0,
  refreshToken: '',
  refreshExpiresAt: 0,
}

function getLocalStorage() {
  if (typeof window === 'undefined') return null

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function getSessionStorage() {
  if (typeof window === 'undefined') return null

  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function clearLegacyPersistedSessions() {
  try {
    getLocalStorage()?.removeItem(LEGACY_REFRESH_STORAGE_KEY)
    getSessionStorage()?.removeItem(LEGACY_TAB_STORAGE_KEY)
  } catch {
    // Storage can be unavailable under restrictive browser privacy settings.
  }
}

function clearPersistedAuthSession() {
  try {
    getLocalStorage()?.removeItem(AUTH_SESSION_STORAGE_KEY)
    clearLegacyPersistedSessions()
  } catch {
    // Storage can be unavailable under restrictive browser privacy settings.
  }
}

function persistAuthSession(tokens: AuthTokens) {
  const storage = getLocalStorage()
  if (!storage) return

  const value: PersistedAuthSession = {
    version: AUTH_SESSION_STORAGE_VERSION,
    ...tokens,
  }
  try {
    storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(value))
    clearLegacyPersistedSessions()
  } catch {
    // The in-memory session remains usable when persistence is unavailable.
  }
}

function parseAuthSession(value: string | null): AuthTokens | null {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<PersistedAuthSession>
    if (
      parsed.version === AUTH_SESSION_STORAGE_VERSION &&
      typeof parsed.accessToken === 'string' &&
      typeof parsed.accessExpiresAt === 'number' &&
      Number.isFinite(parsed.accessExpiresAt) &&
      parsed.accessExpiresAt >= 0 &&
      typeof parsed.refreshToken === 'string' &&
      parsed.refreshToken.length > 0 &&
      typeof parsed.refreshExpiresAt === 'number' &&
      Number.isFinite(parsed.refreshExpiresAt) &&
      parsed.refreshExpiresAt > Date.now()
    ) {
      return {
        accessToken: parsed.accessToken,
        accessExpiresAt: parsed.accessExpiresAt,
        refreshToken: parsed.refreshToken,
        refreshExpiresAt: parsed.refreshExpiresAt,
      }
    }
  } catch {
    // Invalid persisted state is cleared by the caller.
  }

  return null
}

function parseRefreshSession(value: string | null, version: number) {
  if (!value) return null

  try {
    const parsed = JSON.parse(value) as Partial<PersistedRefreshSession>
    if (
      parsed.version === version &&
      typeof parsed.refreshToken === 'string' &&
      parsed.refreshToken.length > 0 &&
      typeof parsed.refreshExpiresAt === 'number' &&
      Number.isFinite(parsed.refreshExpiresAt) &&
      parsed.refreshExpiresAt > Date.now()
    ) {
      return {
        ...EMPTY_TOKENS,
        refreshToken: parsed.refreshToken,
        refreshExpiresAt: parsed.refreshExpiresAt,
      }
    }
  } catch {
    // Invalid persisted state is cleared by the caller.
  }

  return null
}

function readPersistedAuthSession(): AuthTokens {
  try {
    const persistedSession = parseAuthSession(
      getLocalStorage()?.getItem(AUTH_SESSION_STORAGE_KEY) ?? null
    )
    if (persistedSession) {
      clearLegacyPersistedSessions()
      return persistedSession
    }

    const legacyRefreshSession = parseRefreshSession(
      getLocalStorage()?.getItem(LEGACY_REFRESH_STORAGE_KEY) ?? null,
      LEGACY_REFRESH_STORAGE_VERSION
    )
    if (legacyRefreshSession) {
      persistAuthSession(legacyRefreshSession)
      return legacyRefreshSession
    }

    const legacyTabSession = parseRefreshSession(
      getSessionStorage()?.getItem(LEGACY_TAB_STORAGE_KEY) ?? null,
      LEGACY_TAB_STORAGE_VERSION
    )
    if (legacyTabSession) {
      persistAuthSession(legacyTabSession)
      return legacyTabSession
    }
  } catch {
    return EMPTY_TOKENS
  }

  clearPersistedAuthSession()
  return EMPTY_TOKENS
}

export function getPersistedAccessToken() {
  const storage = getLocalStorage()
  if (!storage) return undefined

  try {
    return (
      parseAuthSession(storage.getItem(AUTH_SESSION_STORAGE_KEY))
        ?.accessToken ?? ''
    )
  } catch {
    return undefined
  }
}

export function getPersistedRefreshToken() {
  const storage = getLocalStorage()
  if (!storage) return undefined

  try {
    return (
      parseAuthSession(storage.getItem(AUTH_SESSION_STORAGE_KEY))
        ?.refreshToken ?? ''
    )
  } catch {
    return undefined
  }
}

export function isPersistedAuthSessionCurrent(refreshToken: string) {
  const persistedRefreshToken = getPersistedRefreshToken()
  return (
    persistedRefreshToken === undefined ||
    persistedRefreshToken === refreshToken
  )
}

export function createAuthStore() {
  return create<AuthState>()((set) => {
    removeCookie(LEGACY_AUTH_SESSION_COOKIE)
    const persistedSession = readPersistedAuthSession()

    const clearSession = (isSessionExpired: boolean) =>
      set((state) => {
        clearPersistedAuthSession()
        return {
          ...state,
          auth: {
            ...state.auth,
            ...EMPTY_TOKENS,
            isSessionExpired,
          },
        }
      })

    return {
      auth: {
        ...persistedSession,
        sessionEpoch: 0,
        isSessionExpired: false,
        establishSession: (tokens) =>
          set((state) => {
            persistAuthSession(tokens)
            return {
              ...state,
              auth: {
                ...state.auth,
                ...tokens,
                sessionEpoch: state.auth.sessionEpoch + 1,
                isSessionExpired: false,
              },
            }
          }),
        refreshSession: (tokens) =>
          set((state) => {
            persistAuthSession(tokens)
            return {
              ...state,
              auth: {
                ...state.auth,
                ...tokens,
                isSessionExpired: false,
              },
            }
          }),
        expire: () => clearSession(true),
        reset: () => clearSession(false),
      },
    }
  })
}

export const useAuthStore = createAuthStore()
