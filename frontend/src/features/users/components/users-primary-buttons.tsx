import { Button } from '@/components/ui/button'
import { UserPlus } from '@/components/icons'
import { useUsers } from './users-provider'

export function UsersPrimaryButtons() {
  const { setDialog } = useUsers()
  return (
    <Button onClick={() => setDialog({ type: 'add' })}>
      <UserPlus aria-hidden='true' />
      Add user
    </Button>
  )
}
