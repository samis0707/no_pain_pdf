// @vitest-environment node
import { describe, it, expect } from 'vitest'

import { E2E_BASE as BASE, e2eEnabled, e2eFetch } from './e2e-fetch'

describe.skipIf(!e2eEnabled)('miscText persistence through API', () => {
  let projectId: number
  let itemId: number

  it('creates a project first (prerequisite)', async () => {
    const res = await e2eFetch(`${BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'MiscText Test Project' }),
    })
    const body = await res.json()
    projectId = body.id
  })

  it('creates a test item', async () => {
    const res = await e2eFetch(`${BASE}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, name: 'MiscText Test Item' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    itemId = body.id
  })

  it('GET returns default miscText as empty JSON object', async () => {
    const res = await e2eFetch(`${BASE}/api/items/${itemId}`)
    const body = await res.json()
    expect(body).toHaveProperty('miscText')
    expect(body.miscText).toBe('{}')
  })

  it('PUT /api/items/[id] with miscText saves it (verify via GET)', async () => {
    const miscText = JSON.stringify({ author: 'Test User', notes: 'Created via test' })
    const putRes = await e2eFetch(`${BASE}/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ miscText }),
    })
    expect(putRes.status).toBe(200)

    const getRes = await e2eFetch(`${BASE}/api/items/${itemId}`)
    const body = await getRes.json()
    expect(body.miscText).toBe(miscText)
  })

  it('PUT /api/items/[id] without miscText keeps existing miscText', async () => {
    const putRes = await e2eFetch(`${BASE}/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: '<p>Updated</p>' }),
    })
    expect(putRes.status).toBe(200)

    const getRes = await e2eFetch(`${BASE}/api/items/${itemId}`)
    const body = await getRes.json()
    expect(body.miscText).toBe(JSON.stringify({ author: 'Test User', notes: 'Created via test' }))
  })

  it('PUT /api/items/[id] with customHelpers in miscText saves correctly', async () => {
    const miscText = JSON.stringify({
      customHelpers: {
        formatDate: { params: ['date', 'format'], code: 'return new Date(date).toLocaleDateString()' },
        uppercase: { params: ['str'], code: 'return str.toUpperCase()' },
      },
    })
    const putRes = await e2eFetch(`${BASE}/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ miscText }),
    })
    expect(putRes.status).toBe(200)

    const getRes = await e2eFetch(`${BASE}/api/items/${itemId}`)
    const body = await getRes.json()
    expect(body.miscText).toBe(miscText)

    const parsed = JSON.parse(body.miscText)
    expect(parsed).toHaveProperty('customHelpers')
    expect(parsed.customHelpers).toHaveProperty('formatDate')
    expect(parsed.customHelpers).toHaveProperty('uppercase')
  })

  it('PUT with miscText alongside other fields works correctly', async () => {
    const miscText = JSON.stringify({ version: 2, migrated: true })
    const putRes = await e2eFetch(`${BASE}/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: '<h1>New Template</h1>',
        css: 'h1 { color: blue; }',
        name: 'Updated Item',
        miscText,
      }),
    })
    expect(putRes.status).toBe(200)

    const getRes = await e2eFetch(`${BASE}/api/items/${itemId}`)
    const body = await getRes.json()
    expect(body.html).toBe('<h1>New Template</h1>')
    expect(body.css).toBe('h1 { color: blue; }')
    expect(body.name).toBe('Updated Item')
    expect(body.miscText).toBe(miscText)
  })

  it('PUT with malformed miscText is handled gracefully', async () => {
    const putRes = await e2eFetch(`${BASE}/api/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ miscText: 'not-valid-json' }),
    })
    expect(putRes.status).toBe(200)

    const getRes = await e2eFetch(`${BASE}/api/items/${itemId}`)
    const body = await getRes.json()
    expect(body.miscText).toBe('not-valid-json')
  })
})
