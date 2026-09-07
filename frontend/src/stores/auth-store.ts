import type { AuthTokens } from '@/types/api'
import { create } from 'zustand'

export const AUTH_SESSION_STORAGE_KEY = 'full_stack_admin_session_v3'
const AUTH_SESSION_STORAGE_VERSION = 3

interface PersistedAuthSession extends AuthTokens {
  version: typeof AUTH_SESSION_STORAGE_VERSION
  sessionId: string
}

interface AuthSessionState extends AuthTokens {
  sessionId: string
  sessionEpoch: number
  isSessionExpired: boolean
  establishSession: (tokens: AuthTokens) => void
  refreshSession: (tokens: AuthTokens) => void
  expire: () => void
  reset: () => void
  syncFromStorage: () => AuthSessionState
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

function persistAuthSession(tokens: AuthTokens, sessionId: string) {
  const storage = getLocalStorage()
  if (!storage) return

  const value: PersistedAuthSession = {
    version: AUTH_SESSION_STORAGE_VERSION,
    ...tokens,
    sessionId,
  }
  try {
    storage.setItem(AUTH_SESSION_STORAGE_KEY, JSON.stringify(value))
  } catch {
    // The in-memory session remains usable when persistence is unavailable.
  }
}

function parseAuthSession(
  value: string | null
): (AuthTokens & { sessionId: string }) | null {
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
      parsed.refreshExpiresAt > Date.now() &&
      (parsed.sessionId === undefined ||
        (typeof parsed.sessionId === 'string' && parsed.sessionId.length > 0))
    ) {
      return {
        accessToken: parsed.accessToken,
        accessExpiresAt: parsed.accessExpiresAt,
        refreshToken: parsed.refreshToken,
        refreshExpiresAt: parsed.refreshExpiresAt,
        // Existing v3 sessions adopt their current token as a stable ID once.
        sessionId: parsed.sessionId ?? parsed.refreshToken,
      }
    }
  } catch {
    // Invalid persisted state is cleared by the caller.
  }

  return null
}

function readPersistedAuthSession():
  | (AuthTokens & { sessionId: string })
  | undefined {
  try {
    const persistedSession = parseAuthSession(
      getLocalStorage()?.getItem(AUTH_SESSION_STORAGE_KEY) ?? null
    )
    if (persistedSession) return persistedSession
  } catch {
    return undefined
  }

  clearPersistedAuthSession()
  return { ...EMPTY_TOKENS, sessionId: '' }
}

export function createAuthStore() {
  return create<AuthState>()((set, get) => {
    const persistedSession = readPersistedAuthSession() ?? {
      ...EMPTY_TOKENS,
      sessionId: '',
    }

    const clearSession = (isSessionExpired: boolean) =>
      set((state) => {
        clearPersistedAuthSession()
        return {
          ...state,
          auth: {
            ...state.auth,
            ...EMPTY_TOKENS,
            sessionId: '',
            sessionEpoch: state.auth.sessionEpoch + 1,
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
            // Keep the initial token as the ID throughout subsequent rotations.
            const sessionId = tokens.refreshToken
            persistAuthSession(tokens, sessionId)
            return {
              ...state,
              auth: {
                ...state.auth,
                ...tokens,
                sessionId,
                sessionEpoch: state.auth.sessionEpoch + 1,
                isSessionExpired: false,
              },
            }
          }),
        refreshSession: (tokens) =>
          set((state) => {
            persistAuthSession(tokens, state.auth.sessionId)
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
        syncFromStorage: () => {
          if (!getLocalStorage()) return get().auth
          const session = readPersistedAuthSession()
          if (!session) return get().auth
          const auth = get().auth
          if (
            session.sessionId === auth.sessionId &&
            session.accessToken === auth.accessToken
          )
            return auth
          set({
            auth: {
              ...auth,
              ...session,
              sessionEpoch:
                auth.sessionEpoch +
                (session.sessionId === auth.sessionId ? 0 : 1),
              isSessionExpired: false,
            },
          })
          return get().auth
        },
      },
    }
  })
}

export const useAuthStore = createAuthStore()
