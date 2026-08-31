import type { ComponentProps } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'

type TimePickerProps = Omit<
  ComponentProps<typeof Input>,
  'defaultValue' | 'onChange' | 'step' | 'type' | 'value'
> & {
  value: string
  onValueChange: (value: string) => void
  step?: number
}

function normalizeTime(value: string) {
  return /^\d{2}:\d{2}$/.test(value) ? `${value}:00` : value
}

export function TimePicker({
  value,
  onValueChange,
  step = 1,
  className,
  ...props
}: TimePickerProps) {
  return (
    <Input
      type='time'
      step={step}
      value={value}
      className={cn(
        'appearance-none bg-background [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none',
        className
      )}
      onChange={(event) => onValueChange(normalizeTime(event.target.value))}
      {...props}
    />
  )
}
