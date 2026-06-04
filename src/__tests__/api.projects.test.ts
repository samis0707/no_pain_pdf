// @vitest-environment node
import { describe, it, expect } from 'vitest'

const BASE = process.env.TEST_API_URL || 'http://localhost:3000'

describe('Projects API', () => {
  it('POST /api/projects creates a project', async () => {
    const res = await fetch(`${BASE}/api/projects`, {
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
    const res = await fetch(`${BASE}/api/projects`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})
