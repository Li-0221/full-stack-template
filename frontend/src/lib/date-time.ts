/** @public Default locale for the shared date-time formatters. */
export const DEFAULT_DATE_TIME_LOCALE = 'en-US'

type DateTimeValue = Date | number | string

/** @public Locale and timezone options for shared date-time formatters. */
export interface DateTimeFormatOptions {
  locale?: Intl.LocalesArgument
  timeZone?: string
}

const dateFormatters = new Map<string, Intl.DateTimeFormat>()
const dateTimeFormatters = new Map<string, Intl.DateTimeFormat>()
const timeFormatters = new Map<string, Intl.DateTimeFormat>()
const weekdayDateFormatters = new Map<string, Intl.DateTimeFormat>()
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/

function toDate(value: DateTimeValue) {
  return value instanceof Date ? value : new Date(value)
}

function localeKey(locale: NonNullable<Intl.LocalesArgument>) {
  return String(locale)
}

function getFormatter(
  cache: Map<string, Intl.DateTimeFormat>,
  formatOptions: Intl.DateTimeFormatOptions,
  { locale = DEFAULT_DATE_TIME_LOCALE, timeZone }: DateTimeFormatOptions = {}
) {
  const resolvedLocale = locale ?? DEFAULT_DATE_TIME_LOCALE
  const key = `${localeKey(resolvedLocale)}|${timeZone ?? ''}`
  const cached = cache.get(key)
  if (cached) return cached

  let formatter: Intl.DateTimeFormat
  try {
    formatter = new Intl.DateTimeFormat(resolvedLocale, {
      ...formatOptions,
      timeZone,
    })
  } catch {
    formatter = new Intl.DateTimeFormat(DEFAULT_DATE_TIME_LOCALE, formatOptions)
  }
  cache.set(key, formatter)
  return formatter
}

export function formatDate(
  value: DateTimeValue,
  options: DateTimeFormatOptions = {}
) {
  const isDateOnly = typeof value === 'string' && isoDatePattern.test(value)
  const date = toDate(isDateOnly ? `${value}T00:00:00Z` : value)
  if (Number.isNaN(date.getTime())) return String(value)

  return getFormatter(
    dateFormatters,
    { dateStyle: 'medium' },
    {
      ...options,
      timeZone: isDateOnly ? 'UTC' : options.timeZone,
    }
  ).format(date)
}

export function formatDateTime(
  value: DateTimeValue,
  options: DateTimeFormatOptions = {}
) {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return getFormatter(
    dateTimeFormatters,
    { dateStyle: 'medium', timeStyle: 'short' },
    options
  ).format(date)
}

export function formatTime(
  value: DateTimeValue,
  options: DateTimeFormatOptions = {}
) {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return getFormatter(
    timeFormatters,
    { hour: 'numeric', minute: '2-digit' },
    options
  ).format(date)
}

export function formatWeekdayDate(
  value: DateTimeValue,
  options: DateTimeFormatOptions = {}
) {
  const date = toDate(value)
  if (Number.isNaN(date.getTime())) return String(value)

  return getFormatter(
    weekdayDateFormatters,
    { weekday: 'short', month: 'short', day: 'numeric' },
    options
  ).format(date)
}
