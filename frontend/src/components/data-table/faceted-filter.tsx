import * as React from 'react'
import { CheckIcon, PlusCircledIcon } from '@radix-ui/react-icons'
import { type Column } from '@tanstack/react-table'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { LoaderCircle } from '@/components/icons'
import { LongText } from '@/components/long-text'
import type { RemoteSelectSearch } from '@/components/searchable-select'

type DataTableFacetedFilterProps<TData, TValue> = {
  column?: Column<TData, TValue>
  title?: string
  multiple?: boolean
  contentClassName?: string
  options: {
    label: string
    value: string
    icon?: React.ComponentType<{ className?: string }>
  }[]
  remoteSearch?: RemoteSelectSearch
}

export function DataTableFacetedFilter<TData, TValue>({
  column,
  title,
  multiple = true,
  contentClassName,
  options,
  remoteSearch,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const facets = column?.getFacetedUniqueValues()
  const filterValue = column?.getFilterValue()
  const selectedValues = new Set(
    Array.isArray(filterValue)
      ? filterValue
      : typeof filterValue === 'string'
        ? [filterValue]
        : []
  )
  const selectedOptions = options.filter((option) =>
    selectedValues.has(option.value)
  )
  const hasUnresolvedSelections = selectedOptions.length < selectedValues.size

  return (
    <Popover
      onOpenChange={(open) => {
        if (!open && remoteSearch?.value) remoteSearch.onValueChange('')
      }}
    >
      <PopoverTrigger asChild>
        <Button variant='outline' size='sm' className='border-dashed'>
          <PlusCircledIcon data-icon='inline-start' />
          {title}
          {selectedValues?.size > 0 && (
            <>
              <Separator orientation='vertical' className='mx-2 h-4' />
              <Badge
                variant='neutral'
                className='rounded-sm px-1 font-normal lg:hidden'
              >
                {selectedValues.size}
              </Badge>
              <div className='hidden gap-1 lg:flex'>
                {selectedValues.size > 2 || hasUnresolvedSelections ? (
                  <Badge
                    variant='neutral'
                    className='rounded-sm px-1 font-normal'
                  >
                    {selectedValues.size} selected
                  </Badge>
                ) : (
                  selectedOptions.map((option) => (
                    <Badge
                      variant='neutral'
                      key={option.value}
                      className='rounded-sm px-1 font-normal'
                    >
                      {option.label}
                    </Badge>
                  ))
                )}
              </div>
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          remoteSearch ? 'w-[28rem]' : 'w-50',
          'p-0',
          contentClassName
        )}
        align='start'
      >
        <Command shouldFilter={!remoteSearch}>
          <CommandInput
            value={remoteSearch?.value}
            maxLength={255}
            placeholder={`Search ${title?.toLowerCase() ?? ''}...`}
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
            ) : remoteSearch && options.length === 0 ? (
              <div className='py-6 text-center text-sm'>No results found.</div>
            ) : (
              <>
                <CommandEmpty>No results found.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => {
                    const isSelected = selectedValues.has(option.value)
                    return (
                      <CommandItem
                        key={option.value}
                        onSelect={() => {
                          if (!multiple) {
                            column?.setFilterValue(
                              isSelected ? undefined : option.value
                            )
                          } else if (isSelected) {
                            selectedValues.delete(option.value)
                          } else {
                            selectedValues.add(option.value)
                          }
                          if (!multiple) return
                          const filterValues = Array.from(selectedValues)
                          column?.setFilterValue(
                            filterValues.length ? filterValues : undefined
                          )
                        }}
                      >
                        <div
                          className={cn(
                            'flex size-4 items-center justify-center rounded-sm border border-primary',
                            isSelected
                              ? 'bg-primary text-primary-foreground'
                              : 'opacity-50 [&_svg]:invisible'
                          )}
                        >
                          <CheckIcon className='size-4 text-background' />
                        </div>
                        {option.icon && <option.icon />}
                        <LongText
                          className='min-w-0 flex-1'
                          contentClassName='max-w-96 text-pretty'
                        >
                          {option.label}
                        </LongText>
                        {facets?.get(option.value) && (
                          <span className='ms-auto flex size-4 items-center justify-center font-mono text-xs'>
                            {facets.get(option.value)}
                          </span>
                        )}
                      </CommandItem>
                    )
                  })}
                </CommandGroup>
              </>
            )}
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => column?.setFilterValue(undefined)}
                    className='justify-center text-center'
                  >
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
