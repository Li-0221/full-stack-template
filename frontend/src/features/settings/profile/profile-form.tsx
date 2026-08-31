import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
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
import { Input } from '@/components/ui/input'
import { Loader2 } from '@/components/icons'
import {
  currentUserQueryKey,
  updateCurrentUser,
  type CurrentUser,
} from '../data/current-user-api'

const profileFormSchema = z.object({
  fullName: z.string().max(255, 'Name must not be longer than 255 characters.'),
  email: z
    .email('Please enter a valid email address.')
    .max(255, 'Email must not be longer than 255 characters.'),
})

type ProfileFormValues = z.infer<typeof profileFormSchema>

export function ProfileForm({ user }: { user: CurrentUser }) {
  const queryClient = useQueryClient()
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      fullName: user.fullName ?? '',
      email: user.email,
    },
  })
  const updateMutation = useMutation({
    mutationFn: updateCurrentUser,
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(currentUserQueryKey, updatedUser)
      form.reset({
        fullName: updatedUser.fullName ?? '',
        email: updatedUser.email,
      })
      toast.success('Profile updated.')
    },
  })

  function onSubmit(values: ProfileFormValues) {
    updateMutation.mutate({
      email: values.email.trim(),
      fullName: values.fullName.trim() || null,
    })
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='fullName'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder='Your name' autoComplete='name' {...field} />
              </FormControl>
              <FormDescription>
                Leave this empty if you prefer to use your email as the display
                name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='email'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type='email'
                  placeholder='name@example.com'
                  autoComplete='email'
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This email is used to sign in to your account.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit' disabled={updateMutation.isPending}>
          {updateMutation.isPending ? (
            <Loader2 className='animate-spin' />
          ) : null}
          {updateMutation.isPending ? 'Saving...' : 'Save profile'}
        </Button>
      </form>
    </Form>
  )
}
