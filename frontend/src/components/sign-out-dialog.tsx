import { useState } from 'react'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'
import { handleServerError } from '@/lib/handle-server-error'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { revokeSession } from '@/features/auth/data/session'

interface SignOutDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SignOutDialog({ open, onOpenChange }: SignOutDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { auth } = useAuthStore()

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      if (auth.refreshToken) await revokeSession(auth.refreshToken)
    } catch (error) {
      handleServerError(error)
    } finally {
      auth.reset()
      await navigate({
        to: '/sign-in',
        search: { redirect: location.href },
        replace: true,
      })
      setIsLoading(false)
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title='Sign out'
      desc='Are you sure you want to sign out? You will need to sign in again to access your account.'
      confirmText='Sign out'
      destructive
      isLoading={isLoading}
      handleConfirm={handleSignOut}
      className='sm:max-w-sm'
    />
  )
}
