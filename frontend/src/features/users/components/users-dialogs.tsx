import { UsersActionDialog } from './users-action-dialog'
import { UsersDeleteDialog } from './users-delete-dialog'
import { useUsers } from './users-provider'

export function UsersDialogs() {
  const { dialog, setDialog } = useUsers()
  const onOpenChange = (open: boolean) => {
    if (!open) setDialog(null)
  }
  return (
    <>
      <UsersActionDialog
        key='user-add'
        open={dialog?.type === 'add'}
        onOpenChange={onOpenChange}
      />

      {dialog?.type === 'edit' && (
        <UsersActionDialog
          key={`user-edit-${dialog.user.id}`}
          open
          onOpenChange={onOpenChange}
          currentRow={dialog.user}
        />
      )}
      {dialog?.type === 'delete' && (
        <UsersDeleteDialog
          key={`user-delete-${dialog.user.id}`}
          open
          onOpenChange={onOpenChange}
          currentRow={dialog.user}
        />
      )}
    </>
  )
}
