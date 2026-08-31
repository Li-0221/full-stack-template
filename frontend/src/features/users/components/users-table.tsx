import type { PageData } from '@/types/api'
import type { NavigateFn } from '@/hooks/use-table-url-state'
import { ServerDataTable } from '@/components/data-table'
import type { User } from '../data/users-api'
import { usersColumns } from './users-columns'

type UsersTableProps = {
  pageData?: PageData<User>
  search: Record<string, unknown>
  navigate: NavigateFn
  isLoading: boolean
  isRefreshing: boolean
  isPlaceholderData: boolean
  error: unknown
  onRetry: () => void
  onRefresh: () => void
}

export function UsersTable({
  pageData,
  search,
  navigate,
  isLoading,
  isRefreshing,
  isPlaceholderData,
  error,
  onRetry,
  onRefresh,
}: UsersTableProps) {
  return (
    <ServerDataTable<User, unknown>
      pageData={pageData}
      columns={usersColumns}
      search={search}
      navigate={navigate}
      isLoading={isLoading}
      isRefreshing={isRefreshing}
      isPlaceholderData={isPlaceholderData}
      error={error}
      loadingLabel='Loading users...'
      errorLabel='Unable to load users.'
      emptyLabel='No users found.'
      ariaLabel='Users'
      onRetry={onRetry}
      onRefresh={onRefresh}
      getRowId={(user) => user.id}
    />
  )
}
