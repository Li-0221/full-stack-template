import type { QueryClient } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import type { NavGroup, NavItem } from '@/components/layout/types'
import {
  currentUserQueryOptions,
  type CurrentUser,
} from '@/features/auth/data/current-user-api'

export type RouteAccessRule = {
  requiresSuperuser?: boolean
}

export const routeAccessRules = {
  users: {
    requiresSuperuser: true,
  },
} as const satisfies Record<string, RouteAccessRule>

function isAccessAllowed(
  rule: RouteAccessRule | undefined,
  user: CurrentUser | undefined
) {
  if (!rule) return true
  if (!user) return false

  return !rule.requiresSuperuser || user.isSuperuser
}

function filterNavigationItem(
  item: NavItem,
  user: CurrentUser | undefined
): NavItem | null {
  if (!isAccessAllowed(item.access, user)) return null
  if (!item.items) return item

  const items = item.items.filter((child) =>
    isAccessAllowed(child.access, user)
  )
  return items.length > 0 ? { ...item, items } : null
}

export function filterNavigationByAccess(
  groups: NavGroup[],
  user: CurrentUser | undefined
) {
  return groups.flatMap((group) => {
    const items = group.items.flatMap((item) => {
      const filteredItem = filterNavigationItem(item, user)
      return filteredItem ? [filteredItem] : []
    })

    return items.length > 0 ? [{ ...group, items }] : []
  })
}

export async function requireRouteAccess(
  queryClient: QueryClient,
  rule: RouteAccessRule
) {
  const user = await queryClient.ensureQueryData(currentUserQueryOptions())
  if (!isAccessAllowed(rule, user)) throw redirect({ to: '/403' })
}
