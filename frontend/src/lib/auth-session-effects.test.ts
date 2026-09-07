import { QueryClient } from '@tanstack/react-query'
import { UsersService } from '@/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { useAuthStore } from '@/stores/auth-store'
import { currentUserQueryKey } from '@/features/auth/data/current-user-api'
import { bindAuthSessionEffects } from './auth-session-effects'
import { requireRouteAccess, routeAccessRules } from './router-access'

vi.mock('@/client', () => ({ UsersService: { getCurrentUser: vi.fn() } }))

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 10_000 } },
})
const router = { invalidate: vi.fn(async () => {}) }
let unbind: () => void
const tokens = {
  accessToken: 'access',
  refreshToken: 'refresh',
  accessExpiresAt: Date.now() + 60_000,
  refreshExpiresAt: Date.now() + 600_000,
}

beforeEach(() => {
  localStorage.clear()
  useAuthStore.getState().auth.reset()
  unbind = bindAuthSessionEffects(queryClient, router)
})
afterEach(() => {
  unbind()
  queryClient.clear()
  vi.clearAllMocks()
})

it('loads the new identity before deciding administrator access after login changes', async () => {
  useAuthStore.getState().auth.establishSession(tokens)
  queryClient.setQueryData(currentUserQueryKey, {
    id: 'admin',
    isSuperuser: true,
  })
  queryClient.setQueryData(['users'], ['private cached rows'])
  useAuthStore.getState().auth.reset()
  expect(queryClient.getQueryData(['users'])).toBeUndefined()
  useAuthStore
    .getState()
    .auth.establishSession({ ...tokens, accessToken: 'normal-access' })
  vi.mocked(UsersService.getCurrentUser).mockResolvedValue({
    data: {
      code: 0,
      data: { id: 'normal', isSuperuser: false },
      message: 'success',
    },
  } as never)
  await expect(
    requireRouteAccess(queryClient, routeAccessRules.users)
  ).rejects.toMatchObject({ options: { to: '/403' } })
  expect(UsersService.getCurrentUser).toHaveBeenCalledOnce()
})

it('preserves cached data on normal rotation and clears it on a cross-tab account change', () => {
  useAuthStore.getState().auth.establishSession(tokens)
  router.invalidate.mockClear()
  queryClient.setQueryData(['users'], ['rows'])
  useAuthStore.getState().auth.refreshSession({
    ...tokens,
    accessToken: 'new-access',
    refreshToken: 'new-refresh',
  })
  expect(queryClient.getQueryData(['users'])).toEqual(['rows'])
  expect(router.invalidate).not.toHaveBeenCalled()
  localStorage.clear()
  useAuthStore.getState().auth.syncFromStorage()
  expect(queryClient.getQueryData(['users'])).toBeUndefined()
  expect(router.invalidate).toHaveBeenCalledOnce()
})

it('clears the old identity before rechecking routes and stops observing after cleanup', () => {
  queryClient.setQueryData(currentUserQueryKey, { id: 'old-admin' })
  router.invalidate.mockImplementationOnce(async () => {
    expect(queryClient.getQueryData(currentUserQueryKey)).toBeUndefined()
  })
  useAuthStore.getState().auth.establishSession(tokens)
  expect(router.invalidate).toHaveBeenCalledOnce()

  unbind()
  router.invalidate.mockClear()
  queryClient.setQueryData(['public'], ['retained'])
  useAuthStore.getState().auth.reset()
  expect(router.invalidate).not.toHaveBeenCalled()
  expect(queryClient.getQueryData(['public'])).toEqual(['retained'])
})

it('cancels a pending query so a late result cannot refill the cache', async () => {
  useAuthStore.getState().auth.establishSession(tokens)
  let complete!: (value: string) => void
  let signal: AbortSignal | undefined
  const pending = queryClient
    .fetchQuery({
      queryKey: ['private'],
      queryFn: (context) => {
        signal = context.signal
        return new Promise<string>((resolve) => {
          complete = resolve
        })
      },
    })
    .catch(() => undefined)
  useAuthStore.getState().auth.reset()
  expect(signal?.aborted).toBe(true)
  complete('old data')
  await pending
  expect(queryClient.getQueryData(['private'])).toBeUndefined()
})
