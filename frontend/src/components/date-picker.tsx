import { useRef, useState, type ComponentProps, type ReactNode } from 'react'
import type { DateRange, Matcher } from 'react-day-picker'
import { formatDate } from '@/lib/date-time'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Calendar as CalendarIcon } from '@/components/icons'

interface DatePickerBaseProps {
  id?: string
  placeholder?: string
  triggerLabel?: string
  ariaLabel?: string
  ariaDescribedBy?: string
  ariaInvalid?: boolean
  className?: string
  disabled?: boolean
  iconPosition?: 'start' | 'end'
  onBlur?: ComponentProps<typeof Button>['onBlur']
  size?: ComponentProps<typeof Button>['size']
  disabledDates?: Matcher | Matcher[]
  captionLayout?: ComponentProps<typeof Calendar>['captionLayout']
  popoverAlign?: ComponentProps<typeof PopoverContent>['align']
  displayLocale?: Intl.LocalesArgument
}

interface DatePickerQuickAction {
  label: string
  icon?: ReactNode
}

interface DatePickerQuickDate extends DatePickerQuickAction {
  date: Date
}

interface DatePickerQuickRange extends DatePickerQuickAction {
  range: DateRange
}

interface SingleDatePickerProps extends DatePickerBaseProps {
  mode?: 'single'
  selected: Date | undefined
  onSelect: (date: Date | undefined) => void
  quickDates?: readonly DatePickerQuickDate[]
}

interface RangeDatePickerProps extends DatePickerBaseProps {
  mode: 'range'
  selected: DateRange | undefined
  onSelect: (range: DateRange | undefined) => void
  numberOfMonths?: number
  quickDates?: never
  quickRanges?: readonly DatePickerQuickRange[]
  closeOnSelect?: boolean
  onDaySelect?: (date: Date) => boolean | void
}

type DatePickerProps = SingleDatePickerProps | RangeDatePickerProps

function formatRange(
  range: DateRange | undefined,
  placeholder: string,
  locale?: Intl.LocalesArgument
) {
  if (!range?.from) return placeholder

  const from = formatDate(range.from, { locale })
  if (!range.to) return from

  return `${from} - ${formatDate(range.to, { locale })}`
}

export function DatePicker(props: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const rangeSelectionStarted = useRef(false)
  const previewRootRef = useRef<HTMLDivElement>(null)
  const placeholder = props.placeholder ?? 'Pick a date'
  const isRange = props.mode === 'range'
  const selectedLabel = isRange
    ? formatRange(props.selected, placeholder, props.displayLocale)
    : props.selected
      ? formatDate(props.selected, { locale: props.displayLocale })
      : placeholder
  const label = props.triggerLabel ?? selectedLabel
  const hasValue = isRange
    ? Boolean(props.selected?.from)
    : Boolean(props.selected)
  const ariaLabel =
    props.ariaLabel ??
    `${isRange ? 'Choose date range' : 'Choose date'}, ${label}`
  const iconPosition = props.iconPosition ?? 'start'

  function clearRangePreview() {
    previewRootRef.current
      ?.querySelectorAll('[data-range-preview], [data-range-preview-end]')
      .forEach((element) => {
        element.removeAttribute('data-range-preview')
        element.removeAttribute('data-range-preview-end')
      })
  }

  function showRangePreview(end: Date) {
    if (props.mode !== 'range' || !rangeSelectionStarted.current) return
    const start = props.selected?.from
    if (!start) return
    const from = Math.min(start.getTime(), end.getTime())
    const to = Math.max(start.getTime(), end.getTime())

    previewRootRef.current
      ?.querySelectorAll<HTMLButtonElement>('[data-day]')
      .forEach((button) => {
        const value = new Date(button.dataset.day ?? '').getTime()
        const isStart = value === start.getTime()
        const isEnd = value === end.getTime() && !isStart
        const isPreview = value >= from && value <= to && !isStart
        if (isPreview) button.setAttribute('data-range-preview', 'true')
        else button.removeAttribute('data-range-preview')
        if (isEnd) button.setAttribute('data-range-preview-end', 'true')
        else button.removeAttribute('data-range-preview-end')
      })
  }

  function selectSingle(date: Date | undefined) {
    if (props.mode === 'range') return

    props.onSelect(date)
    if (date) setOpen(false)
  }

  function selectRange(range: DateRange | undefined) {
    if (props.mode !== 'range') return

    props.onSelect(range)
    if (
      props.closeOnSelect &&
      rangeSelectionStarted.current &&
      range?.from &&
      range.to
    ) {
      clearRangePreview()
      rangeSelectionStarted.current = false
      setOpen(false)
      return
    }
    rangeSelectionStarted.current = Boolean(range?.from)
  }

  function selectQuickRange(range: DateRange) {
    if (props.mode !== 'range') return

    props.onSelect(range)
    clearRangePreview()
    rangeSelectionStarted.current = false
    if (props.closeOnSelect) setOpen(false)
  }

  function selectRangeDay(date: Date) {
    if (props.mode !== 'range' || !props.onDaySelect) return

    clearRangePreview()
    const shouldClose = props.onDaySelect(date)
    rangeSelectionStarted.current = shouldClose === false
    if (props.closeOnSelect && shouldClose !== false) setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) {
          rangeSelectionStarted.current =
            props.mode === 'range' &&
            Boolean(props.selected?.from && !props.selected.to)
        } else {
          clearRangePreview()
        }
        setOpen(nextOpen)
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={props.id}
          type='button'
          variant='outline'
          data-empty={!hasValue}
          className={cn(
            'max-w-full min-w-48 justify-start font-medium data-[empty=true]:text-muted-foreground',
            iconPosition === 'end' && 'justify-between',
            props.className
          )}
          aria-label={ariaLabel}
          aria-describedby={props.ariaDescribedBy}
          aria-invalid={props.ariaInvalid}
          disabled={props.disabled}
          onBlur={props.onBlur}
          size={props.size}
        >
          {iconPosition === 'start' ? (
            <CalendarIcon data-icon='inline-start' aria-hidden='true' />
          ) : null}
          <span className='min-w-0 truncate'>{label}</span>
          {iconPosition === 'end' ? (
            <CalendarIcon data-icon='inline-end' aria-hidden='true' />
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className='w-auto overflow-hidden p-0'
        align={props.popoverAlign ?? 'start'}
      >
        {props.mode === 'range' ? (
          <div ref={previewRootRef} onMouseLeave={clearRangePreview}>
            <Calendar
              mode='range'
              selected={props.selected}
              defaultMonth={props.selected?.from}
              onSelect={props.onDaySelect ? () => undefined : selectRange}
              onDayClick={props.onDaySelect ? selectRangeDay : undefined}
              onDayMouseEnter={(date, modifiers) => {
                if (!modifiers.disabled) showRangePreview(date)
              }}
              numberOfMonths={props.numberOfMonths ?? 2}
              captionLayout={props.captionLayout}
              disabled={props.disabledDates}
            />
          </div>
        ) : (
          <Calendar
            mode='single'
            selected={props.selected}
            defaultMonth={props.selected}
            onSelect={selectSingle}
            captionLayout={props.captionLayout}
            disabled={props.disabledDates}
          />
        )}
        {props.mode !== 'range' && props.quickDates?.length ? (
          <div className='flex justify-center gap-1 border-t p-2'>
            {props.quickDates.map((quickDate) => (
              <Button
                key={quickDate.label}
                type='button'
                variant='outline'
                size='sm'
                className={cn(quickDate.icon ? 'size-8 p-0' : 'min-w-24 px-3')}
                aria-label={quickDate.icon ? quickDate.label : undefined}
                title={quickDate.icon ? quickDate.label : undefined}
                onClick={() => selectSingle(quickDate.date)}
              >
                {quickDate.icon ?? quickDate.label}
              </Button>
            ))}
          </div>
        ) : null}
        {props.mode === 'range' && props.quickRanges?.length ? (
          <div className='grid grid-cols-3 gap-1 border-t bg-muted/20 p-2'>
            {props.quickRanges.map((quickRange) => {
              const isSelected =
                props.selected?.from?.getTime() ===
                  quickRange.range.from?.getTime() &&
                props.selected?.to?.getTime() === quickRange.range.to?.getTime()
              return (
                <Button
                  key={quickRange.label}
                  type='button'
                  variant={isSelected ? 'secondary' : 'outline'}
                  size='sm'
                  className={cn(
                    quickRange.icon
                      ? 'size-8 p-0'
                      : 'w-full min-w-0 px-1 text-xs'
                  )}
                  aria-label={quickRange.icon ? quickRange.label : undefined}
                  aria-pressed={isSelected}
                  title={quickRange.icon ? quickRange.label : undefined}
                  onClick={() => selectQuickRange(quickRange.range)}
                >
                  {quickRange.icon ?? quickRange.label}
                </Button>
              )
            })}
          </div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}
