import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatDateTime,
  formatTime,
  formatWeekdayDate,
} from './date-time'

describe('date and time formatting', () => {
  it('uses an English month-first date format by default', () => {
    expect(formatDate(new Date(2026, 6, 22))).toBe('Jul 22, 2026')
    expect(formatDate('2026-10-31')).toBe('Oct 31, 2026')
  })

  it('allows callers to select a display locale', () => {
    expect(formatDate('2026-10-31', { locale: 'en-GB' })).toBe('31 Oct 2026')
  })

  it('uses locale defaults and honors the requested timezone', () => {
    const value = '2026-07-22T13:05:00Z'

    expect(formatDateTime(value, { timeZone: 'UTC' })).toBe(
      'Jul 22, 2026, 1:05 PM'
    )
    expect(formatTime(value, { timeZone: 'UTC' })).toBe('1:05 PM')
  })

  it('formats an instant as the requested local weekday and date', () => {
    const value = '2026-08-05T16:00:00Z'

    expect(formatWeekdayDate(value, { timeZone: 'America/Los_Angeles' })).toBe(
      'Wed, Aug 5'
    )
    expect(formatWeekdayDate(value, { timeZone: 'Asia/Shanghai' })).toBe(
      'Thu, Aug 6'
    )
  })

  it('keeps invalid values visible for diagnosis', () => {
    expect(formatDateTime('not-a-date')).toBe('not-a-date')
  })
})
