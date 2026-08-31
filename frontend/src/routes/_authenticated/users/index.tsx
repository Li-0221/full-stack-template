import { createFileRoute } from '@tanstack/react-router'
import { paginationSearchSchema } from '@/components/data-table'
import { Users } from '@/features/users'

const usersSearchSchema = paginationSearchSchema.partial()

export const Route = createFileRoute('/_authenticated/users/')({
  validateSearch: usersSearchSchema,
  component: Users,
})
