'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const destination = searchParams.get('redirect') || '/projects'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const { error: localError } = await authClient.signIn.email({ email, password })
      if (!localError) {
        router.push(destination)
        return
      }

      // Local sign-in failed — try the legacy Supabase account. On success
      // the account is migrated to a local credential transparently.
      const res = await fetch('/api/auth/federated-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })

      if (res.ok) {
        router.push(destination)
        return
      }

      setError('Invalid email or password')
    } catch {
      setError('Login failed — please try again')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm flex flex-col gap-4 p-8 bg-white border rounded-xl shadow-sm"
      >
        <h1 className="text-xl font-semibold text-zinc-900">Sign in</h1>

        {error && (
          <div data-testid="auth-error" className="text-sm text-red-600">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Email
          <input
            data-testid="email-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Password
          <input
            data-testid="password-input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </label>

        <button
          data-testid="submit-button"
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 hover:bg-zinc-700 disabled:bg-zinc-400 rounded-md"
        >
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="text-xs text-zinc-500">
          No account yet?{' '}
          <Link href="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </p>
      </form>
    </main>
  )
}
