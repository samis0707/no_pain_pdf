import { describe, it, expect } from 'vitest'
import { parseCsvMetadata } from '@/utils/csvParser'

describe('parseCsvMetadata', () => {
  it('returns columns, row count, and rows from CSV string', () => {
    const csv = 'name,email,age\nAlice,alice@test.com,30\nBob,bob@test.com,25'
    const result = parseCsvMetadata(csv)
    expect(result.columns).toEqual(['name', 'email', 'age'])
    expect(result.rowCount).toBe(2)
    expect(result.rows).toHaveLength(2)
    expect(result.rows[0]).toEqual({ name: 'Alice', email: 'alice@test.com', age: '30' })
  })

  it('handles empty CSV', () => {
    expect(parseCsvMetadata('')).toEqual({ rowCount: 0, columns: [], rows: [] })
  })

  it('handles CSV with only headers', () => {
    const csv = 'name,email'
    const result = parseCsvMetadata(csv)
    expect(result.columns).toEqual(['name', 'email'])
    expect(result.rowCount).toBe(0)
    expect(result.rows).toHaveLength(0)
  })
})
