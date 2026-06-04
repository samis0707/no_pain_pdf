import { describe, it, expect } from 'vitest'
import { applyFieldMapping } from '@/utils/applyMapping'

describe('applyFieldMapping', () => {
  it('returns rows unchanged when mapping is empty string', () => {
    const rows = [{ name: 'Alice' }, { name: 'Bob' }]
    expect(applyFieldMapping(rows, '')).toEqual(rows)
  })

  it('returns rows unchanged when mapping is DB default "[]"', () => {
    const rows = [{ name: 'Alice' }]
    expect(applyFieldMapping(rows, '[]')).toEqual(rows)
  })

  it('returns rows unchanged when mapping is invalid JSON', () => {
    const rows = [{ name: 'Alice' }]
    expect(applyFieldMapping(rows, 'not-json')).toEqual(rows)
  })

  it('transforms row keys according to mapping', () => {
    const rows = [{ 'Full Name': 'Alice', 'Email Address': 'alice@test.com' }]
    const mapping = JSON.stringify({ 'Full Name': 'fullName', 'Email Address': 'email' })
    const result = applyFieldMapping(rows, mapping)
    expect(result).toEqual([{ fullName: 'Alice', email: 'alice@test.com' }])
  })

  it('keeps unmapped columns under original key', () => {
    const rows = [{ name: 'Alice', age: '30' }]
    const mapping = JSON.stringify({ name: 'fullName' })
    const result = applyFieldMapping(rows, mapping)
    expect(result).toEqual([{ fullName: 'Alice', age: '30' }])
  })

  it('transforms all rows in the array', () => {
    const rows = [
      { 'First': 'Alice', 'Last': 'Smith' },
      { 'First': 'Bob', 'Last': 'Jones' },
    ]
    const mapping = JSON.stringify({ 'First': 'firstName', 'Last': 'lastName' })
    const result = applyFieldMapping(rows, mapping)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ firstName: 'Alice', lastName: 'Smith' })
    expect(result[1]).toEqual({ firstName: 'Bob', lastName: 'Jones' })
  })

  it('handles empty rows array', () => {
    expect(applyFieldMapping([], JSON.stringify({ a: 'b' }))).toEqual([])
  })
})
