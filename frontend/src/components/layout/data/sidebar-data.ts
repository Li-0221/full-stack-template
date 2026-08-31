import { appConfig } from '@/config/app'
import { Logo } from '@/assets/logo'
import {
  LayoutDashboard,
  Monitor,
  Palette,
  Settings,
  Wrench,
  UserCog,
  Users,
} from '@/components/icons'
import { type SidebarData } from '../types'

export const sidebarData: SidebarData = {
  user: appConfig.defaultUser,
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
              title: 'Account',
              url: '/settings/account',
              icon: Wrench,
            },
            {
              title: 'Appearance',
              url: '/settings/appearance',
              icon: Palette,
            },
            {
              title: 'Display',
              url: '/settings/display',
              icon: Monitor,
            },
          ],
        },
      ],
    },
  ],
}
