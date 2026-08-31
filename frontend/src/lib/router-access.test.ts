import { QueryClient } from '@tanstack/react-query'
import { describe, expect, it } from 'vitest'
import { sidebarData } from '@/components/layout/data/sidebar-data'
import {
  currentUserQueryKey,
  type CurrentUser,
} from '@/features/auth/data/current-user-api'
import {
  filterNavigationByAccess,
  requireRouteAccess,
  routeAccessRules,
} from './router-access'

const admin: CurrentUser = {
  id: '57cc5265-a519-4bee-94de-52e440a6e4ca',
  email: 'admin@example.com',
  fullName: 'Admin User',
  isActive: true,
  isSuperuser: true,
  createdAt: '2026-08-31T02:00:00+00:00',
  updatedAt: '2026-08-31T02:00:00+00:00',
}

const user: CurrentUser = {
  ...admin,
  id: '1a1b01d0-476b-48c4-a394-b3d1fd79b601',
  email: 'user@example.com',
  fullName: 'Standard User',
  isSuperuser: false,
}

function visibleUrls(currentUser: CurrentUser | undefined) {
  return filterNavigationByAccess(sidebarData.navGroups, currentUser).flatMap(
    (group) =>
      group.items.flatMap((item) =>
        item.items ? item.items.map((child) => child.url) : [item.url]
      )
  )
}

function queryClientWithUser(currentUser: CurrentUser) {
  const queryClient = new QueryClient()
  queryClient.setQueryData(currentUserQueryKey, currentUser)
  return queryClient
}

describe('route access', () => {
  it('shows Users only to administrators', () => {
    expect(visibleUrls(admin)).toContain('/users')
    expect(visibleUrls(user)).not.toContain('/users')
    expect(visibleUrls(undefined)).not.toContain('/users')
  })

  it('allows administrators to enter Users', async () => {
    await expect(
      requireRouteAccess(queryClientWithUser(admin), routeAccessRules.users)
    ).resolves.toBeUndefined()
  })

  it('redirects standard users away from Users', async () => {
    await expect(
      requireRouteAccess(queryClientWithUser(user), routeAccessRules.users)
    ).rejects.toMatchObject({ options: { to: '/403' } })
  })
})
