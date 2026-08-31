import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { UsersDialogs } from './components/users-dialogs'
import { UsersPrimaryButtons } from './components/users-primary-buttons'
import { UsersProvider } from './components/users-provider'
import { UsersTable } from './components/users-table'
import { usersQueryOptions } from './data/users-api'

const route = getRouteApi('/_authenticated/users/')

export function Users() {
  const search = route.useSearch()
  const navigate = route.useNavigate()
  const page = search.page ?? 1
  const pageSize = search.pageSize ?? 20
  const usersQuery = useQuery(usersQueryOptions({ page, pageSize }))

  return (
    <UsersProvider>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-4 sm:gap-6'>
        <div className='flex flex-wrap items-end justify-between gap-2'>
          <div>
            <h2 className='text-2xl font-bold tracking-tight'>User List</h2>
            <p className='text-muted-foreground'>
              Manage user accounts and administrator access.
            </p>
          </div>
          <UsersPrimaryButtons />
        </div>
        <UsersTable
          pageData={usersQuery.data}
          search={search}
          navigate={navigate}
          isLoading={usersQuery.isLoading}
          isRefreshing={usersQuery.isFetching && !usersQuery.isLoading}
          isPlaceholderData={usersQuery.isPlaceholderData}
          error={usersQuery.error}
          onRetry={() => void usersQuery.refetch()}
          onRefresh={() => void usersQuery.refetch()}
        />
      </Main>

      <UsersDialogs />
    </UsersProvider>
  )
}
