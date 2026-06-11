import { NextRequest, NextResponse } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

// Optimistic cookie check: blocks anonymous traffic early. API routes still
// validate the session for real via requireUserId().
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  const isPublic =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname.startsWith('/api/auth/')

  if (isPublic) return NextResponse.next()

  const sessionCookie = getSessionCookie(request)
  if (!sessionCookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|pdf.worker.min.mjs|.*\\.(?:png|jpg|jpeg|svg|woff2?)$).*)'],
}
