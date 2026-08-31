import { Button } from '@/components/ui/button'
import { UserPlus } from '@/components/icons'
import { useUsers } from './users-provider'

export function UsersPrimaryButtons() {
  const { setOpen } = useUsers()
  return (
    <Button onClick={() => setOpen('add')}>
      <UserPlus aria-hidden='true' />
      Add user
    </Button>
  )
}
