import { prisma } from '@/lib/prisma'

export interface FederationResult {
  ok: boolean
  created?: boolean
  linked?: boolean
}

/**
 * Lazy migration from the legacy Supabase-auth app: when a local sign-in
 * fails, the login flow calls this with the submitted credentials. If the
 * existing Supabase project accepts them, the user is provisioned (or
 * linked) locally with the SAME password stored as a Better Auth scrypt
 * credential — their next login is fully local. Dropping Supabase later
 * just means deleting this module.
 *
 * An existing local credential is never overwritten: reaching this path
 * with one means the local password simply didn't match.
 */
export async function federateSupabaseUser(
  email: string,
  password: string
): Promise<FederationResult> {
  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY
  if (!url || !anonKey) return { ok: false }

  const { createClient } = await import('@supabase/supabase-js')
  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data?.user) return { ok: false }

  const supabaseUser = data.user
  const { hashPassword } = await import('better-auth/crypto')

  const existing = await prisma.user.findFirst({
    where: { OR: [{ supabaseUserId: supabaseUser.id }, { email }] },
  })

  if (existing) {
    const credential = await prisma.account.findFirst({
      where: { userId: existing.id, providerId: 'credential' },
    })
    if (credential) return { ok: false }

    await prisma.user.update({
      where: { id: existing.id },
      data: { supabaseUserId: supabaseUser.id, emailVerified: true },
    })
    await prisma.account.create({
      data: {
        userId: existing.id,
        providerId: 'credential',
        accountId: String(existing.id),
        password: await hashPassword(password),
      },
    })
    return { ok: true, linked: true }
  }

  const created = await prisma.user.create({
    data: {
      email,
      name:
        (supabaseUser.user_metadata?.name as string | undefined) ??
        email.split('@')[0],
      emailVerified: true,
      supabaseUserId: supabaseUser.id,
    },
  })
  await prisma.account.create({
    data: {
      userId: created.id,
      providerId: 'credential',
      accountId: String(created.id),
      password: await hashPassword(password),
    },
  })
  return { ok: true, created: true }
}
