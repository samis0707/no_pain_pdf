import { describe, it, expect } from 'vitest'

// RED: This test will fail until we implement the function
// GREEN: Implement parseCsvMetadata to make it pass

function parseCsvMetadata(raw: string): { rowCount: number; columns: string[] } {
  const lines = raw.trim().split('\n')
  if (lines.length < 1) return { rowCount: 0, columns: [] }
  const columns = lines[0].split(',').map(c => c.trim())
  const rowCount = lines.length - 1
  return { rowCount, columns }
}

describe('parseCsvMetadata', () => {
  it('returns columns and row count from CSV string', () => {
    const csv = 'name,email,age\nAlice,alice@test.com,30\nBob,bob@test.com,25'
    const result = parseCsvMetadata(csv)
    expect(result.columns).toEqual(['name', 'email', 'age'])
    expect(result.rowCount).toBe(2)
  })

  it('handles empty CSV', () => {
    expect(parseCsvMetadata('')).toEqual({ rowCount: 0, columns: [] })
  })

  it('handles CSV with only headers', () => {
    const csv = 'name,email'
    const result = parseCsvMetadata(csv)
    expect(result.columns).toEqual(['name', 'email'])
    expect(result.rowCount).toBe(0)
  })
})
