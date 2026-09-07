import type { QueryClient } from '@tanstack/react-query'
import type { AnyRouter } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'

export function bindAuthSessionEffects(
  queryClient: QueryClient,
  router: Pick<AnyRouter, 'invalidate'>
) {
  return useAuthStore.subscribe((state, previous) => {
    if (state.auth.sessionEpoch !== previous.auth.sessionEpoch) {
      // clear() also cancels pending queries before their results can be reused.
      queryClient.clear()
      void router.invalidate()
    }
  })
}
