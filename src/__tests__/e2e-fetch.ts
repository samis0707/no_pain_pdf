/**
 * Helper for live API tests. They run only when TEST_API_URL points at a
 * running server (e.g. TEST_API_URL=http://localhost:3010 with the dev
 * server started as BETTER_AUTH_URL=http://localhost:3010 PORT=3010).
 * Authenticates a dedicated test user once and sends its session cookie
 * with every request.
 */
export const E2E_BASE = process.env.TEST_API_URL ?? ''
export const e2eEnabled = E2E_BASE !== ''

const E2E_EMAIL = 'e2e-suite@example.com'
const E2E_PASSWORD = 'e2e-suite-password-1'

let cookiePromise: Promise<string> | null = null

function extractCookies(res: Response): string {
  const setCookies =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : ([res.headers.get('set-cookie')].filter(Boolean) as string[])
  return setCookies.map((c) => c.split(';')[0]).join('; ')
}

async function authenticate(): Promise<string> {
  const authHeaders = { 'Content-Type': 'application/json', Origin: E2E_BASE }

  let res = await fetch(`${E2E_BASE}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD }),
  })

  if (!res.ok) {
    res = await fetch(`${E2E_BASE}/api/auth/sign-up/email`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'E2E Suite', email: E2E_EMAIL, password: E2E_PASSWORD }),
    })
  }

  if (!res.ok) {
    // Parallel workers race the first sign-up — whoever lost just signs in.
    res = await fetch(`${E2E_BASE}/api/auth/sign-in/email`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ email: E2E_EMAIL, password: E2E_PASSWORD }),
    })
  }

  if (!res.ok) {
    throw new Error(`e2e auth failed: ${res.status} ${await res.text()}`)
  }
  return extractCookies(res)
}

export async function e2eFetch(url: string, init: RequestInit = {}): Promise<Response> {
  cookiePromise ??= authenticate()
  const cookie = await cookiePromise
  return fetch(url, {
    ...init,
    headers: { ...(init.headers ?? {}), cookie, Origin: E2E_BASE },
  })
}
