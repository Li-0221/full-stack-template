import { appConfig } from '@/config/app'
import { Logo } from '@/assets/logo'
import { routeAccessRules } from '@/lib/router-access'
import {
  LayoutDashboard,
  Settings,
  Wrench,
  UserCog,
  Users,
} from '@/components/icons'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  teams: [
    {
      name: appConfig.defaultOrganization.name,
      logo: Logo,
      plan: appConfig.defaultOrganization.description,
    },
  ],
  navGroups: [
    {
      title: 'General',
      items: [
        {
          title: 'Dashboard',
          url: '/',
          icon: LayoutDashboard,
        },
        {
          title: 'Users',
          url: '/users',
          icon: Users,
          access: routeAccessRules.users,
        },
      ],
    },
    {
      title: 'Other',
      items: [
        {
          title: 'Settings',
          icon: Settings,
          items: [
            {
              title: 'Profile',
              url: '/settings',
              icon: UserCog,
            },
            {
              title: 'Security',
              url: '/settings/security',
              icon: Wrench,
            },
          ],
        },
      ],
    },
  ],
}
