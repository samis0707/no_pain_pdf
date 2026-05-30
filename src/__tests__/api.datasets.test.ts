import { describe, it, expect } from 'vitest'

const BASE = process.env.TEST_API_URL || 'http://localhost:3000'

describe('Datasets API', () => {
  let projectId: number
  let itemId: number

  it('creates project and item (prerequisites)', async () => {
    const pRes = await fetch(`${BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Dataset Test Project' }),
    })
    const project = await pRes.json()
    projectId = project.id

    const iRes = await fetch(`${BASE}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, name: 'Dataset Test Item' }),
    })
    const item = await iRes.json()
    itemId = item.id
  })

  it('POST /api/items/[id]/datasets uploads CSV and returns parsed DataSet', async () => {
    const csvContent = 'name,email,age\nAlice,alice@test.com,30\nBob,bob@test.com,25'
    const formData = new FormData()
    formData.append('file', new Blob([csvContent], { type: 'text/csv' }), 'test.csv')

    const res = await fetch(`${BASE}/api/items/${itemId}/datasets`, {
      method: 'POST',
      body: formData,
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('id')
    expect(body.columns).toEqual(['name', 'email', 'age'])
    expect(body.rowCount).toBe(2)
  })

  it('GET /api/items/[id]/datasets lists datasets', async () => {
    const res = await fetch(`${BASE}/api/items/${itemId}/datasets`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
