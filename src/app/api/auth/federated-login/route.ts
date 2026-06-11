import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { federateSupabaseUser } from '@/lib/supabase-federation'

/**
 * Fallback called by the login page after a failed local sign-in. Validates
 * the credentials against the legacy Supabase project, provisions/links the
 * local account (lazy migration), then signs the user in locally and
 * forwards the session cookie.
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.email || !body.password) {
    return Response.json({ error: 'email and password are required' }, { status: 400 })
  }

  const result = await federateSupabaseUser(body.email, body.password)
  if (!result.ok) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 })
  }

  const { headers, response } = await auth.api.signInEmail({
    body: { email: body.email, password: body.password },
    returnHeaders: true,
  })

  return Response.json(
    { user: response.user, migrated: result.created ?? false, linked: result.linked ?? false },
    { headers }
  )
}
