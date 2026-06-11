// @vitest-environment node
import { describe, it, expect } from 'vitest'

import { E2E_BASE as BASE, e2eEnabled, e2eFetch } from './e2e-fetch'

describe.skipIf(!e2eEnabled)('Items API', () => {
  let projectId: number

  it('creates a project first (prerequisite)', async () => {
    const res = await e2eFetch(`${BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Item Test Project' }),
    })
    const body = await res.json()
    projectId = body.id
  })

  it('POST /api/items creates an item with projectId', async () => {
    const res = await e2eFetch(`${BASE}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, name: 'Test Item' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('id')
    expect(body.projectId).toBe(projectId)
    expect(body.name).toBe('Test Item')
  })

  it('PUT /api/items/[id] updates html and css', async () => {
    const createRes = await e2eFetch(`${BASE}/api/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, name: 'Updatable Item' }),
    })
    const item = await createRes.json()

    const res = await e2eFetch(`${BASE}/api/items/${item.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: '<h1>{{title}}</h1>',
        css: 'h1 { color: red; }',
      }),
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.html).toBe('<h1>{{title}}</h1>')
    expect(body.css).toBe('h1 { color: red; }')
  })
})
