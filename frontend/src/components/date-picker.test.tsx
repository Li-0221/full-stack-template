import { useState } from 'react'
import { format } from 'date-fns'
import '@/styles/index.css'
import type { DateRange } from 'react-day-picker'
import { describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import { userEvent } from 'vitest/browser'
import { DatePicker } from './date-picker'

interface RangePickerHarnessProps {
  onSelect: (range: DateRange | undefined) => void
}

function RangePickerHarness({ onSelect }: RangePickerHarnessProps) {
  const [selected, setSelected] = useState<DateRange>()

  function handleSelect(range: DateRange | undefined) {
    setSelected(range)
    onSelect(range)
  }

  return <DatePicker mode='range' selected={selected} onSelect={handleSelect} />
}

function CustomRangePickerHarness({ initial }: { initial: DateRange }) {
  const [selected, setSelected] = useState<DateRange | undefined>(initial)
  const [selectingEnd, setSelectingEnd] = useState(false)

  function handleDaySelect(date: Date) {
    if (!selectingEnd || !selected?.from) {
      setSelected({ from: date })
      setSelectingEnd(true)
      return false
    }
    setSelected({
      from: date < selected.from ? date : selected.from,
      to: date < selected.from ? selected.from : date,
    })
    setSelectingEnd(false)
    return true
  }

  return (
    <DatePicker
      mode='range'
      selected={selected}
      closeOnSelect
      onSelect={setSelected}
      onDaySelect={handleDaySelect}
    />
  )
}

describe('DatePicker', () => {
  it('supports an input-style trigger with the calendar icon at the end', async () => {
    const screen = await render(
      <DatePicker
        id='starts-on'
        selected={new Date(2026, 7, 5)}
        ariaLabel='From'
        ariaDescribedBy='starts-on-message'
        ariaInvalid
        iconPosition='end'
        onSelect={vi.fn()}
      />
    )
    const trigger = screen.getByRole('button', { name: 'From' })

    expect(trigger).toHaveAttribute('id', 'starts-on')
    expect(trigger).toHaveAttribute('aria-describedby', 'starts-on-message')
    expect(trigger).toHaveAttribute('aria-invalid', 'true')
    expect(trigger.element().firstElementChild).toBeInstanceOf(HTMLSpanElement)
    expect(trigger.element().lastElementChild).toBeInstanceOf(SVGElement)
  })

  it('formats the selected date with a caller-provided locale', async () => {
    const screen = await render(
      <DatePicker
        selected={new Date(2026, 7, 5)}
        displayLocale='en-GB'
        onSelect={vi.fn()}
      />
    )

    await expect.element(screen.getByText('5 Aug 2026')).toBeVisible()
  })

  it('supports single selection and closes after choosing a date', async () => {
    const onSelect = vi.fn<(date: Date | undefined) => void>()
    const screen = await render(
      <DatePicker selected={new Date(2026, 6, 1)} onSelect={onSelect} />
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Choose date, Jul 1, 2026' })
    )
    const selectedDate = screen.getByRole('button', {
      name: 'Friday, July 10th, 2026',
    })
    await userEvent.click(selectedDate)

    expect(onSelect).toHaveBeenCalledWith(new Date(2026, 6, 10))
    await expect.element(selectedDate).not.toBeInTheDocument()
  })

  it('supports range selection and displays the selected range', async () => {
    const onSelect = vi.fn<(range: DateRange | undefined) => void>()
    const current = new Date()
    const from = new Date(current.getFullYear(), current.getMonth(), 10)
    const to = new Date(current.getFullYear(), current.getMonth(), 15)
    const screen = await render(<RangePickerHarness onSelect={onSelect} />)

    await userEvent.click(
      screen.getByRole('button', { name: 'Choose date range, Pick a date' })
    )
    await userEvent.click(
      screen.getByRole('button', { name: format(from, 'EEEE, MMMM do, yyyy') })
    )
    await userEvent.click(
      screen.getByRole('button', { name: format(to, 'EEEE, MMMM do, yyyy') })
    )

    expect(onSelect).toHaveBeenLastCalledWith({ from, to })
    await expect
      .element(
        screen.getByText(
          `${format(from, 'MMM d, yyyy')} - ${format(to, 'MMM d, yyyy')}`
        )
      )
      .toBeVisible()
  })

  it('previews a pending range while hovering the end date', async () => {
    const current = new Date()
    const initialFrom = new Date(current.getFullYear(), current.getMonth(), 1)
    const initialTo = new Date(current.getFullYear(), current.getMonth(), 20)
    const from = new Date(current.getFullYear(), current.getMonth(), 10)
    const middle = new Date(current.getFullYear(), current.getMonth(), 12)
    const to = new Date(current.getFullYear(), current.getMonth(), 15)
    const screen = await render(
      <CustomRangePickerHarness
        initial={{ from: initialFrom, to: initialTo }}
      />
    )

    await userEvent.click(
      screen.getByRole('button', { name: /Choose date range/ })
    )
    const startButton = screen.getByRole('button', {
      name: format(from, 'EEEE, MMMM do, yyyy'),
    })
    await userEvent.click(startButton)
    const endButton = screen.getByRole('button', {
      name: format(to, 'EEEE, MMMM do, yyyy'),
    })
    const middleButton = screen.getByRole('button', {
      name: format(middle, 'EEEE, MMMM do, yyyy'),
    })
    await userEvent.hover(endButton)

    expect(startButton).toHaveAttribute('data-selected-single', 'true')
    expect(endButton).toHaveAttribute('data-range-preview-end', 'true')
    expect(middleButton).toHaveAttribute('data-range-preview', 'true')
    expect(
      parseFloat(getComputedStyle(middleButton.element()).borderRadius)
    ).toBe(0)
    expect(
      parseFloat(getComputedStyle(endButton.element()).borderRadius)
    ).toBeGreaterThan(0)
    expect(getComputedStyle(endButton.element()).boxShadow).toBe('none')
  })

  it('selects a quick date and closes the calendar', async () => {
    const onSelect = vi.fn<(date: Date | undefined) => void>()
    const quickDate = new Date(2026, 6, 22)
    const screen = await render(
      <DatePicker
        selected={new Date(2026, 6, 1)}
        quickDates={[{ label: 'Today', date: quickDate }]}
        onSelect={onSelect}
      />
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Choose date, Jul 1, 2026' })
    )
    await userEvent.click(
      screen.getByRole('button', { name: 'Today', exact: true })
    )

    expect(onSelect).toHaveBeenCalledWith(quickDate)
    await expect
      .element(screen.getByRole('button', { name: 'Today', exact: true }))
      .not.toBeInTheDocument()
  })

  it('selects a quick range and closes when configured', async () => {
    const onSelect = vi.fn<(range: DateRange | undefined) => void>()
    const range = {
      from: new Date(2026, 6, 20),
      to: new Date(2026, 6, 26),
    }
    const screen = await render(
      <DatePicker
        mode='range'
        selected={range}
        quickRanges={[{ label: 'This week', range }]}
        closeOnSelect
        onSelect={onSelect}
      />
    )

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Choose date range, Jul 20, 2026 - Jul 26, 2026',
      })
    )
    const quickRange = screen.getByRole('button', { name: 'This week' })
    expect(quickRange).toHaveAttribute('aria-pressed', 'true')
    await userEvent.click(quickRange)

    expect(onSelect).toHaveBeenCalledWith(range)
    await expect
      .element(screen.getByRole('button', { name: 'This week' }))
      .not.toBeInTheDocument()
  })

  it('keeps a closing range picker open until both dates are selected', async () => {
    const onSelect = vi.fn<(range: DateRange | undefined) => void>()
    const current = new Date()
    const from = new Date(current.getFullYear(), current.getMonth(), 10)
    const to = new Date(current.getFullYear(), current.getMonth(), 12)
    const screen = await render(
      <DatePicker
        mode='range'
        selected={undefined}
        closeOnSelect
        onSelect={onSelect}
      />
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Choose date range, Pick a date' })
    )
    const fromButton = screen.getByRole('button', {
      name: format(from, 'EEEE, MMMM do, yyyy'),
    })
    await userEvent.click(fromButton)
    await expect.element(fromButton).toBeVisible()
    await userEvent.click(
      screen.getByRole('button', {
        name: format(to, 'EEEE, MMMM do, yyyy'),
      })
    )
    await expect.element(fromButton).not.toBeInTheDocument()
  })
})
