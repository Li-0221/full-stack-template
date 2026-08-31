import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Loader2 } from '@/components/icons'
import { PasswordInput } from '@/components/password-input'
import { changeCurrentUserPassword } from '@/features/auth/data/current-user-api'

const passwordSchema = z
  .object({
    currentPassword: z
      .string()
      .min(8, 'Current password must be at least 8 characters.')
      .max(128, 'Current password must not exceed 128 characters.'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters.')
      .max(128, 'New password must not exceed 128 characters.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

type PasswordFormValues = z.infer<typeof passwordSchema>

export function SecurityForm() {
  const navigate = useNavigate()
  const { auth } = useAuthStore()
  const form = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  })
  const passwordMutation = useMutation({
    mutationFn: changeCurrentUserPassword,
    onSuccess: async () => {
      auth.reset()
      toast.success('Password updated. Sign in again.')
      await navigate({ to: '/sign-in', replace: true })
    },
  })

  function onSubmit(values: PasswordFormValues) {
    passwordMutation.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='currentPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete='current-password' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='newPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete='new-password' {...field} />
              </FormControl>
              <FormDescription>
                Use between 8 and 128 characters.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='confirmPassword'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <PasswordInput autoComplete='new-password' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' disabled={passwordMutation.isPending}>
          {passwordMutation.isPending ? (
            <Loader2 className='animate-spin' />
          ) : null}
          {passwordMutation.isPending ? 'Updating...' : 'Update password'}
        </Button>
      </form>
    </Form>
  )
}
