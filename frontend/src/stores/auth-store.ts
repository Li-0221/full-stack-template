import type { AuthTokens } from '@/types/api'
import { create } from 'zustand'

const AUTH_SESSION_STORAGE_KEY = 'full_stack_admin_session_v3'
const AUTH_SESSION_STORAGE_VERSION = 3

interface PersistedAuthSession extends AuthTokens {
  version: typeof AUTH_SESSION_STORAGE_VERSION
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

function clearPersistedAuthSession() {
  try {
    getLocalStorage()?.removeItem(AUTH_SESSION_STORAGE_KEY)
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
      parsed.accessToken.length > 0 &&
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

function readPersistedAuthSession(): AuthTokens {
  try {
    const persistedSession = parseAuthSession(
      getLocalStorage()?.getItem(AUTH_SESSION_STORAGE_KEY) ?? null
    )
    if (persistedSession) return persistedSession
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
