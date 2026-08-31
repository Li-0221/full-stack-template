import { useId, useState } from 'react'
import { format, isValid } from 'date-fns'
import { formatDate } from '@/lib/date-time'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Label } from '@/components/ui/label'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ChevronDownIcon } from '@/components/icons'
import { TimePicker } from '@/components/time-picker'

interface DateTimePickerProps {
  id?: string
  label: string
  showFieldLabels?: boolean
  value?: Date
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  displayLocale?: Intl.LocalesArgument
  onChange: (value: Date) => void
  onBlur?: () => void
}

function validDate(value?: Date): value is Date {
  return Boolean(value && isValid(value))
}

/** @public Reusable date and time picker for application forms. */
export function DateTimePicker({
  id,
  label,
  showFieldLabels = true,
  value,
  disabled = false,
  invalid = false,
  describedBy,
  displayLocale,
  onChange,
  onBlur,
}: DateTimePickerProps) {
  const generatedId = useId()
  const pickerId = id ?? generatedId
  const [open, setOpen] = useState(false)
  const selectedDate = validDate(value) ? value : undefined

  function selectDate(date?: Date) {
    if (!date) return
    const next = selectedDate ? new Date(selectedDate) : new Date(date)
    next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
    onChange(next)
    setOpen(false)
  }

  function selectTime(time: string) {
    if (!selectedDate) return
    const [hours, minutes, seconds] = time.split(':').map(Number)
    if (
      !Number.isInteger(hours) ||
      !Number.isInteger(minutes) ||
      !Number.isInteger(seconds)
    ) {
      return
    }

    const next = new Date(selectedDate)
    next.setHours(hours, minutes, seconds, 0)
    onChange(next)
  }

  return (
    <div
      role='group'
      aria-label={label}
      aria-describedby={describedBy}
      className='grid min-w-0 grid-cols-[minmax(0,1fr)_8.5rem] gap-2'
    >
      <div className='grid min-w-0 gap-2'>
        {showFieldLabels ? (
          <Label htmlFor={`${pickerId}-date`}>Date</Label>
        ) : null}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              id={`${pickerId}-date`}
              type='button'
              variant='outline'
              data-empty={!selectedDate}
              aria-label={`${label} date`}
              aria-invalid={invalid}
              aria-describedby={describedBy}
              disabled={disabled}
              className='w-full justify-between font-normal data-[empty=true]:text-muted-foreground'
              onBlur={onBlur}
            >
              {selectedDate
                ? formatDate(selectedDate, { locale: displayLocale })
                : 'Select date'}
              <ChevronDownIcon data-icon='inline-end' aria-hidden='true' />
            </Button>
          </PopoverTrigger>
          <PopoverContent className='w-auto overflow-hidden p-0' align='start'>
            <Calendar
              mode='single'
              selected={selectedDate}
              defaultMonth={selectedDate}
              captionLayout='dropdown'
              onSelect={selectDate}
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className='grid gap-2'>
        {showFieldLabels ? (
          <Label htmlFor={`${pickerId}-time`}>Time</Label>
        ) : null}
        <TimePicker
          id={`${pickerId}-time`}
          value={selectedDate ? format(selectedDate, 'HH:mm:ss') : ''}
          aria-label={`${label} time`}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          disabled={disabled || !selectedDate}
          onBlur={onBlur}
          onValueChange={selectTime}
        />
      </div>
    </div>
  )
}
