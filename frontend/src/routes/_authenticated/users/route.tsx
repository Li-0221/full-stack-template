import { createFileRoute } from '@tanstack/react-router'
import { requireRouteAccess, routeAccessRules } from '@/lib/router-access'

export const Route = createFileRoute('/_authenticated/users')({
  beforeLoad: ({ context }) =>
    requireRouteAccess(context.queryClient, routeAccessRules.users),
})
