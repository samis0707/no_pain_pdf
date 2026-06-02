import { describe, it, expect } from 'vitest'

const BASE = process.env.TEST_API_URL || 'http://localhost:3000'

describe('PrintItem API pageFormatId integration', () => {
  let projectId: number
  let itemId: number

  it('creates a project first (prerequisite)', async () => {
    const res = await fetch(`${BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Page Format Test Project' }),
    })
    const body = await res.json()
    projectId = body.id
  })

  it('creates a test item', async () => {
    const res = await fetch(`${BASE}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, name: 'Page Format Test Item' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    itemId = body.id
  })

  it('GET /api/items/[id] returns pageFormat as a relation object', async () => {
    const res = await fetch(`${BASE}/api/items/${itemId}`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('pageFormat')
    expect(typeof body.pageFormat).toBe('object')
  })

  it('pageFormat is null when no format is assigned', async () => {
    const res = await fetch(`${BASE}/api/items/${itemId}`)
    const body = await res.json()
    expect(body.pageFormat).toBeNull()
  })

  it('GET /api/items/[id] includes pageFormatId field', async () => {
    const res = await fetch(`${BASE}/api/items/${itemId}`)
    const body = await res.json()
    expect(body).toHaveProperty('pageFormatId')
  })

  it('pageFormatId is null when no format is assigned', async () => {
    const res = await fetch(`${BASE}/api/items/${itemId}`)
    const body = await res.json()
    expect(body.pageFormatId).toBeNull()
  })

  it('PUT /api/items/[id] accepts pageFormatId', async () => {
    const res = await fetch(`${BASE}/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageFormatId: 1 }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('pageFormatId')
    expect(body.pageFormatId).toBe(1)
  })

  it('GET /api/items/[id] returns the updated pageFormatId', async () => {
    const res = await fetch(`${BASE}/api/items/${itemId}`)
    const body = await res.json()
    expect(body.pageFormatId).toBe(1)
  })

  it('GET /api/items/[id] returns the pageFormat relation with full details', async () => {
    const res = await fetch(`${BASE}/api/items/${itemId}`)
    const body = await res.json()
    expect(body.pageFormat).not.toBeNull()
    expect(body.pageFormat).toHaveProperty('id', 1)
    expect(body.pageFormat).toHaveProperty('name')
    expect(body.pageFormat).toHaveProperty('widthMm')
    expect(body.pageFormat).toHaveProperty('heightMm')
    expect(body.pageFormat).toHaveProperty('category')
    expect(body.pageFormat).toHaveProperty('isPreset')
  })

  it('PUT /api/items/[id] accepts pageFormatId null to clear it', async () => {
    const res = await fetch(`${BASE}/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageFormatId: null }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.pageFormatId).toBeNull()
  })

  it('updating pageFormatId on an item changes the associated format', async () => {
    const res = await fetch(`${BASE}/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageFormatId: 1 }),
    })
    expect(res.status).toBe(200)

    const getRes = await fetch(`${BASE}/api/items/${itemId}`)
    const body = await getRes.json()
    expect(body.pageFormat).not.toBeNull()
    expect(body.pageFormat.name).toBe('A4')

    await fetch(`${BASE}/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageFormatId: 3 }),
    })

    const getRes2 = await fetch(`${BASE}/api/items/${itemId}`)
    const body2 = await getRes2.json()
    expect(body2.pageFormat).not.toBeNull()
    expect(body2.pageFormat.name).toBe('Letter')
  })

  it('PUT /api/items/[id] accepts exportSettings and persists it', async () => {
    const exportSettings = { margins: 'narrow', scale: 1.0 }
    const res = await fetch(`${BASE}/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exportSettings }),
    })
    expect(res.status).toBe(200)

    const getRes = await fetch(`${BASE}/api/items/${itemId}`)
    const body = await getRes.json()
    expect(body.exportSettings).toBe(JSON.stringify(exportSettings))
  })

  it('PUT /api/items/[id] rejects invalid pageFormatId with 404', async () => {
    const res = await fetch(`${BASE}/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pageFormatId: 99999 }),
    })
    expect(res.status).toBe(404)
  })
})
