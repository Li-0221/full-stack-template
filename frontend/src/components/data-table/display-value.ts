/** @public Shared placeholder for empty table cells. */
export const EMPTY_TABLE_CELL = '-'

/** @public Checks whether a table value should use the empty placeholder. */
export function isEmptyTableValue(value: unknown) {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && !value.trim())
  )
}

/** @public Formats nullable primitive values for display in table cells. */
export function displayTableValue(value: string | number | null | undefined) {
  return isEmptyTableValue(value) ? EMPTY_TABLE_CELL : value
}
