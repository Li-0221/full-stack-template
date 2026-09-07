import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { appConfig } from '@/config/app'
import { Logo } from '@/assets/logo'
import { filterNavigationByAccess } from '@/lib/router-access'
import { useLayout } from '@/context/layout-provider'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar'
import { currentUserQueryOptions } from '@/features/auth/data/current-user-api'
import { sidebarData } from './data/sidebar-data'
import { NavGroup } from './nav-group'
import { NavUser } from './nav-user'

export function AppSidebar() {
  const { collapsible, variant } = useLayout()
  const { setOpenMobile } = useSidebar()
  const currentUserQuery = useQuery(currentUserQueryOptions())
  const navGroups = filterNavigationByAccess(
    sidebarData.navGroups,
    currentUserQuery.data
  )
  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size='lg' asChild>
              <Link to='/' onClick={() => setOpenMobile(false)}>
                <div className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground'>
                  <Logo
                    className='size-4 text-sidebar-primary-foreground'
                    aria-hidden='true'
                  />
                </div>
                <div className='grid min-w-0 flex-1 text-start text-sm leading-tight'>
                  <span className='truncate font-semibold'>
                    {appConfig.name}
                  </span>
                  <span className='truncate text-xs'>
                    {appConfig.description}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((props) => (
          <NavGroup key={props.title} {...props} />
        ))}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
