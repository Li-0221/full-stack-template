import { useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Check, ChevronsUpDown, LoaderCircle, X } from '@/components/icons'
import { LongText } from '@/components/long-text'

/** @public Reusable option contract for searchable selects. */
export interface SearchableSelectOption {
  value: string
  label: string
  description?: string
  leading?: ReactNode
  keywords?: string[]
  disabled?: boolean
}

export interface RemoteSelectSearch {
  value: string
  isPending: boolean
  error: boolean
  loadingText: string
  errorText: string
  onValueChange: (value: string) => void
  onRetry: () => void
}

function commandValue(option: SearchableSelectOption) {
  return `${option.label} ${option.value}`
}

interface SearchableSelectProps extends Omit<
  React.ComponentProps<typeof Button>,
  'children' | 'onChange' | 'onSelect' | 'value'
> {
  value: string | null
  options: SearchableSelectOption[]
  onValueChange: (value: string | null) => void
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  loading?: boolean
  clearable?: boolean
  remoteSearch?: RemoteSelectSearch
  contentClassName?: string
}

/** @public Reusable local or remote searchable select. */
export function SearchableSelect({
  value,
  options,
  onValueChange,
  placeholder,
  searchPlaceholder = 'Search...',
  emptyText = 'No matching options.',
  loading = false,
  clearable = true,
  remoteSearch,
  contentClassName,
  disabled,
  className,
  ...triggerProps
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [activeValue, setActiveValue] = useState<string>()
  const selectedOption = options.find((option) => option.value === value)

  function select(nextValue: string | null) {
    onValueChange(nextValue)
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          setActiveValue(
            selectedOption ? commandValue(selectedOption) : undefined
          )
        }
        if (!nextOpen && remoteSearch?.value) remoteSearch.onValueChange('')
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type='button'
          variant='outline'
          role='combobox'
          aria-expanded={open}
          disabled={disabled || loading}
          className={cn(
            'w-full min-w-0 justify-between font-normal',
            className
          )}
          {...triggerProps}
        >
          <span
            title={selectedOption?.label}
            className={cn(
              'min-w-0 flex-1 truncate text-start',
              !selectedOption && 'text-muted-foreground'
            )}
          >
            {loading ? 'Loading...' : (selectedOption?.label ?? placeholder)}
          </span>
          {loading ? (
            <LoaderCircle
              data-icon='inline-end'
              aria-hidden='true'
              className='animate-spin'
            />
          ) : (
            <ChevronsUpDown
              data-icon='inline-end'
              aria-hidden='true'
              className='opacity-50'
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align='start'
        className={cn(
          'w-[28rem] max-w-[var(--radix-popover-content-available-width)] p-0',
          contentClassName
        )}
      >
        <Command
          shouldFilter={!remoteSearch}
          value={activeValue}
          onValueChange={setActiveValue}
        >
          <CommandInput
            value={remoteSearch?.value}
            maxLength={255}
            placeholder={searchPlaceholder}
            onValueChange={remoteSearch?.onValueChange}
          />
          <CommandList>
            {remoteSearch?.isPending ? (
              <div
                role='status'
                className='flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground'
              >
                <LoaderCircle aria-hidden='true' className='animate-spin' />
                {remoteSearch.loadingText}
              </div>
            ) : remoteSearch?.error ? (
              <div
                role='alert'
                className='flex flex-col items-center gap-2 px-4 py-6 text-center text-sm text-muted-foreground'
              >
                <span>{remoteSearch.errorText}</span>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  onClick={remoteSearch.onRetry}
                >
                  Retry
                </Button>
              </div>
            ) : (
              <>
                {remoteSearch && options.length === 0 ? (
                  <div className='py-6 text-center text-sm'>{emptyText}</div>
                ) : (
                  <>
                    <CommandEmpty>{emptyText}</CommandEmpty>
                    <CommandGroup>
                      {clearable && value ? (
                        <CommandItem
                          value='Clear selection'
                          onSelect={() => select(null)}
                        >
                          <X aria-hidden='true' />
                          Clear selection
                        </CommandItem>
                      ) : null}
                      {options.map((option) => (
                        <CommandItem
                          key={option.value}
                          value={commandValue(option)}
                          keywords={option.keywords}
                          disabled={option.disabled}
                          onSelect={() => select(option.value)}
                        >
                          <Check
                            aria-hidden='true'
                            className={cn(
                              option.value === value
                                ? 'opacity-100'
                                : 'opacity-0'
                            )}
                          />
                          {option.leading}
                          <div className='min-w-0 flex-1'>
                            <LongText className='font-medium'>
                              {option.label}
                            </LongText>
                            {option.description ? (
                              <div className='truncate text-xs text-muted-foreground'>
                                {option.description}
                              </div>
                            ) : null}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
