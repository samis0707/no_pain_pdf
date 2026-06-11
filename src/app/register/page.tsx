'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { authClient } from '@/lib/auth-client'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      const { error: signUpError } = await authClient.signUp.email({ name, email, password })
      if (signUpError) {
        setError(signUpError.message ?? 'Registration failed')
        return
      }
      router.push('/projects')
    } catch {
      setError('Registration failed — please try again')
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
        <h1 className="text-xl font-semibold text-zinc-900">Create account</h1>

        {error && (
          <div data-testid="auth-error" className="text-sm text-red-600">
            {error}
          </div>
        )}

        <label className="flex flex-col gap-1 text-sm text-zinc-700">
          Name
          <input
            data-testid="name-input"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="px-3 py-2 border rounded-md"
          />
        </label>

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
            minLength={8}
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
          {isSubmitting ? 'Creating…' : 'Create account'}
        </button>

        <p className="text-xs text-zinc-500">
          Already registered?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  )
}
