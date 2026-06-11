// @vitest-environment node
import { describe, it, expect } from 'vitest'

import { E2E_BASE as BASE, e2eEnabled, e2eFetch } from './e2e-fetch'

describe.skipIf(!e2eEnabled)('Projects API', () => {
  it('POST /api/projects creates a project', async () => {
    const res = await e2eFetch(`${BASE}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Project' }),
    })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toHaveProperty('id')
    expect(body.name).toBe('Test Project')
  })

  it('GET /api/projects returns project list', async () => {
    const res = await e2eFetch(`${BASE}/api/projects`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
