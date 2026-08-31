import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { type Collapsible, useLayout } from '@/context/layout-provider'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { useSidebar } from '@/components/ui/sidebar'
import { SelectDropdown } from '@/components/select-dropdown'

const displayFormSchema = z.object({
  sidebar: z.enum(['inset', 'floating', 'sidebar']),
  navigation: z.enum(['default', 'compact', 'offcanvas']),
})

type DisplayFormValues = z.infer<typeof displayFormSchema>

const sidebarOptions = [
  { label: 'Inset', value: 'inset' },
  { label: 'Floating', value: 'floating' },
  { label: 'Standard', value: 'sidebar' },
]

const navigationOptions = [
  { label: 'Expanded', value: 'default' },
  { label: 'Compact icons', value: 'compact' },
  { label: 'Off-canvas', value: 'offcanvas' },
]

export function DisplayForm() {
  const { open, setOpen } = useSidebar()
  const { collapsible, setCollapsible, setVariant, variant } = useLayout()
  const form = useForm<DisplayFormValues>({
    resolver: zodResolver(displayFormSchema),
    defaultValues: {
      sidebar: variant,
      navigation: open
        ? 'default'
        : collapsible === 'offcanvas'
          ? 'offcanvas'
          : 'compact',
    },
  })

  function onSubmit(values: DisplayFormValues) {
    setVariant(values.sidebar)
    if (values.navigation === 'default') {
      setOpen(true)
    } else {
      const nextCollapsible: Collapsible =
        values.navigation === 'compact' ? 'icon' : 'offcanvas'
      setCollapsible(nextCollapsible)
      setOpen(false)
    }
    toast.success('Display preferences updated.')
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className='space-y-8'>
        <FormField
          control={form.control}
          name='sidebar'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Sidebar style</FormLabel>
              <SelectDropdown
                isControlled
                defaultValue={field.value}
                onValueChange={field.onChange}
                items={sidebarOptions}
                className='w-64'
              />
              <FormDescription>
                Choose how the sidebar is framed within the application shell.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='navigation'
          render={({ field }) => (
            <FormItem>
              <FormLabel>Navigation layout</FormLabel>
              <SelectDropdown
                isControlled
                defaultValue={field.value}
                onValueChange={field.onChange}
                items={navigationOptions}
                className='w-64'
              />
              <FormDescription>
                Keep navigation expanded or reduce it to save workspace.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type='submit'>Save display preferences</Button>
      </form>
    </Form>
  )
}
