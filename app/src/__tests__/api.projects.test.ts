import { describe, it, expect } from 'vitest'

// RED/GREEN pattern for API route testing.
// These tests assume a running dev server (or test server) on port 3000.
// In CI, the Next.js test server starts before this suite.
//
// Once the API routes are implemented, set BASE to the test server URL
// and run with: npx vitest run

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
