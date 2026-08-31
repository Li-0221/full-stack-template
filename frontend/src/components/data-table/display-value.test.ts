import { describe, expect, it } from 'vitest'
import { displayTableValue } from './display-value'

describe('displayTableValue', () => {
  it.each([null, undefined, '', '   '])('renders %s as a dash', (value) => {
    expect(displayTableValue(value)).toBe('-')
  })

  it('preserves recorded values', () => {
    expect(displayTableValue('Recorded')).toBe('Recorded')
    expect(displayTableValue(0)).toBe(0)
  })
})
