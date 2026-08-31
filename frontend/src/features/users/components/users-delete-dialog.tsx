import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { AlertTriangle, Loader2 } from '@/components/icons'
import { deleteUser, usersQueryKey, type User } from '../data/users-api'

type UserDeleteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: User
}

export function UsersDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: UserDeleteDialogProps) {
  const [confirmation, setConfirmation] = useState('')
  const queryClient = useQueryClient()
  const deleteMutation = useMutation({
    mutationFn: () => deleteUser(currentRow.id),
  })
  const isConfirmed = confirmation.trim() === currentRow.email

  function handleOpenChange(nextOpen: boolean) {
    if (deleteMutation.isPending) return
    if (!nextOpen) setConfirmation('')
    onOpenChange(nextOpen)
  }

  async function handleDelete() {
    if (!isConfirmed || deleteMutation.isPending) return

    try {
      await deleteMutation.mutateAsync()
      await queryClient.invalidateQueries({ queryKey: usersQueryKey })
      toast.success('User deleted.')
      setConfirmation('')
      onOpenChange(false)
    } catch (error) {
      handleServerError(error)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      form='users-delete-form'
      disabled={!isConfirmed}
      isLoading={deleteMutation.isPending}
      title={
        <span className='text-destructive'>
          <AlertTriangle
            aria-hidden='true'
            className='me-1 inline-block stroke-destructive'
            size={18}
          />{' '}
          Delete user
        </span>
      }
      desc={
        <form
          id='users-delete-form'
          onSubmit={(event) => {
            event.preventDefault()
            void handleDelete()
          }}
          className='space-y-4'
        >
          <p>
            This permanently deletes{' '}
            <span className='font-semibold text-foreground'>
              {currentRow.email}
            </span>{' '}
            and cannot be undone.
          </p>

          <Label className='grid gap-2'>
            Type the email to confirm
            <Input
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              placeholder={currentRow.email}
              autoComplete='off'
              autoFocus
            />
          </Label>

          <Alert variant='destructive'>
            <AlertTriangle aria-hidden='true' />
            <AlertTitle>Permanent action</AlertTitle>
            <AlertDescription>
              Existing sessions and access for this account will be removed.
            </AlertDescription>
          </Alert>
        </form>
      }
      confirmText={
        <>
          {deleteMutation.isPending ? (
            <Loader2 aria-hidden='true' className='animate-spin' />
          ) : null}
          {deleteMutation.isPending ? 'Deleting...' : 'Delete user'}
        </>
      }
      destructive
    />
  )
}
