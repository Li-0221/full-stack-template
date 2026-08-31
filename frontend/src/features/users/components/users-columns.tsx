import { format } from 'date-fns'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { LongText } from '@/components/long-text'
import type { User } from '../data/users-api'
import { DataTableRowActions } from './data-table-row-actions'

export const usersColumns: ColumnDef<User>[] = [
  {
    accessorKey: 'fullName',
    header: 'Name',
    cell: ({ row }) => (
      <LongText className='max-w-56 font-medium'>
        {row.original.fullName || 'Not provided'}
      </LongText>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'email',
    header: 'Email',
    cell: ({ row }) => (
      <LongText className='max-w-72'>{row.original.email}</LongText>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
        {row.original.isActive ? 'Active' : 'Inactive'}
      </Badge>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'isSuperuser',
    header: 'Access',
    cell: ({ row }) => (
      <Badge variant='outline'>
        {row.original.isSuperuser ? 'Administrator' : 'User'}
      </Badge>
    ),
    enableSorting: false,
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    cell: ({ row }) => (
      <span className='text-nowrap text-muted-foreground'>
        {format(new Date(row.original.createdAt), 'PP p')}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: 'actions',
    cell: DataTableRowActions,
    enableHiding: false,
  },
]
