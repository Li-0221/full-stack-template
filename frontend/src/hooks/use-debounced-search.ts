import { useEffect, useState } from 'react'

/** @public Shared debounced search state for remote selectors and filters. */
export function useDebouncedSearch(delay = 300) {
  const [value, setValue] = useState('')
  const [debouncedValue, setDebouncedValue] = useState('')

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedValue(value), delay)
    return () => window.clearTimeout(timeout)
  }, [delay, value])

  const normalizedValue = value.trim()
  const search = debouncedValue.trim() || null

  return {
    value,
    search,
    isDebouncing: normalizedValue !== (search ?? ''),
    setValue,
    reset: () => {
      setValue('')
      setDebouncedValue('')
    },
  }
}
