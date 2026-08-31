import { z } from 'zod'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { UserCreateRequest, UserPutRequest } from '@/client'
import { toast } from 'sonner'
import { handleServerError } from '@/lib/handle-server-error'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Switch } from '@/components/ui/switch'
import { Loader2 } from '@/components/icons'
import { PasswordInput } from '@/components/password-input'
import {
  createUser,
  updateUser,
  usersQueryKey,
  type User,
} from '../data/users-api'

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters long.')
  .max(128, 'Password must be at most 128 characters long.')

const commonFields = {
  email: z
    .email({
      error: (issue) =>
        issue.input === '' ? 'Email is required.' : 'Enter a valid email.',
    })
    .max(255, 'Email must be at most 255 characters long.'),
  fullName: z.string().max(255, 'Name must be at most 255 characters long.'),
  confirmPassword: z.string(),
  isActive: z.boolean(),
  isSuperuser: z.boolean(),
}

const userFormSchema = z
  .discriminatedUnion('mode', [
    z.object({
      mode: z.literal('create'),
      ...commonFields,
      password: passwordSchema,
    }),
    z.object({
      mode: z.literal('edit'),
      ...commonFields,
      password: z.union([z.literal(''), passwordSchema]),
    }),
  ])
  .superRefine((values, context) => {
    if (values.password !== values.confirmPassword) {
      context.addIssue({
        code: 'custom',
        message: "Passwords don't match.",
        path: ['confirmPassword'],
      })
    }
  })

type UserForm = z.infer<typeof userFormSchema>

type UserActionDialogProps = {
  currentRow?: User
  open: boolean
  onOpenChange: (open: boolean) => void
}

function getDefaultValues(currentRow?: User): UserForm {
  if (currentRow) {
    return {
      mode: 'edit',
      email: currentRow.email,
      fullName: currentRow.fullName ?? '',
      password: '',
      confirmPassword: '',
      isActive: currentRow.isActive,
      isSuperuser: currentRow.isSuperuser,
    }
  }

  return {
    mode: 'create',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    isActive: true,
    isSuperuser: false,
  }
}

function normalizeFullName(value: string) {
  return value.trim() || null
}

export function UsersActionDialog({
  currentRow,
  open,
  onOpenChange,
}: UserActionDialogProps) {
  const isEdit = Boolean(currentRow)
  const queryClient = useQueryClient()
  const form = useForm<UserForm>({
    resolver: zodResolver(userFormSchema),
    defaultValues: getDefaultValues(currentRow),
  })
  const saveMutation = useMutation({
    mutationFn: async (values: UserForm) => {
      if (values.mode === 'create') {
        const request: UserCreateRequest = {
          email: values.email,
          fullName: normalizeFullName(values.fullName),
          password: values.password,
          isActive: values.isActive,
          isSuperuser: values.isSuperuser,
        }
        return createUser(request)
      }

      if (!currentRow) throw new Error('The user being edited is unavailable')
      const request: UserPutRequest = {
        email: values.email,
        fullName: normalizeFullName(values.fullName),
        isActive: values.isActive,
        isSuperuser: values.isSuperuser,
        ...(values.password ? { password: values.password } : {}),
      }
      return updateUser(currentRow.id, request)
    },
  })

  async function onSubmit(values: UserForm) {
    try {
      await saveMutation.mutateAsync(values)
      await queryClient.invalidateQueries({ queryKey: usersQueryKey })
      toast.success(isEdit ? 'User updated.' : 'User created.')
      form.reset(getDefaultValues(currentRow))
      onOpenChange(false)
    } catch (error) {
      handleServerError(error)
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    if (saveMutation.isPending) return
    if (!nextOpen) form.reset(getDefaultValues(currentRow))
    onOpenChange(nextOpen)
  }

  const password = useWatch({ control: form.control, name: 'password' })

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle>{isEdit ? 'Edit user' : 'Add user'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update account details and access settings.'
              : 'Create an account with its initial access settings.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='user-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='grid gap-4 overflow-y-auto px-0.5 py-1'
          >
            <FormField
              control={form.control}
              name='fullName'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Alex Morgan'
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
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
                      placeholder='alex@example.com'
                      autoComplete='off'
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className='grid grid-cols-2 gap-4'>
              <FormField
                control={form.control}
                name='password'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder={
                          isEdit
                            ? 'Keep current password'
                            : 'Minimum 8 characters'
                        }
                        autoComplete='new-password'
                        {...field}
                      />
                    </FormControl>
                    {isEdit ? (
                      <FormDescription>Leave blank to keep it.</FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='confirmPassword'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <PasswordInput
                        placeholder='Repeat password'
                        autoComplete='new-password'
                        disabled={!password}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className='grid gap-3 rounded-md border p-4'>
              <FormField
                control={form.control}
                name='isActive'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between gap-4'>
                    <div className='grid gap-1'>
                      <FormLabel>Active account</FormLabel>
                      <FormDescription>
                        Allow this user to sign in.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name='isSuperuser'
                render={({ field }) => (
                  <FormItem className='flex items-center justify-between gap-4'>
                    <div className='grid gap-1'>
                      <FormLabel>Administrator access</FormLabel>
                      <FormDescription>
                        Allow this user to manage other users.
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <DialogFooter>
          <Button
            type='button'
            variant='outline'
            disabled={saveMutation.isPending}
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type='submit'
            form='user-form'
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 aria-hidden='true' className='animate-spin' />
            ) : null}
            {saveMutation.isPending ? 'Saving...' : 'Save user'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
