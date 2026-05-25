import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { validateCredentials, storeToken } from '../lib/auth'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/jobs'

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const token = validateCredentials(username, password)

    if (token === null) {
      setError('Invalid username or password')
      setLoading(false)
      return
    }

    storeToken(token)
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / title */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontSize: '3rem' }}
            aria-hidden="true"
          >
            precision_manufacturing
          </span>
          <h1 className="text-2xl font-semibold tracking-wide text-on-surface font-sans">
            PrintOS
          </h1>
        </div>

        {/* Glass card */}
        <div className="glass-panel rounded-xl p-8">
          <h2 className="text-lg font-medium text-on-surface mb-6">Sign in</h2>

          <form onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-4">
              {/* Username */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="username"
                  className="text-label-lg text-on-surface-variant"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="
                    w-full rounded-lg px-3 py-2.5
                    bg-surface-container border border-outline-variant
                    text-on-surface text-body-lg
                    placeholder:text-outline
                    focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
                    transition-colors
                  "
                  placeholder="Enter username"
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-label-lg text-on-surface-variant"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="
                    w-full rounded-lg px-3 py-2.5
                    bg-surface-container border border-outline-variant
                    text-on-surface text-body-lg
                    placeholder:text-outline
                    focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary
                    transition-colors
                  "
                  placeholder="Enter password"
                />
              </div>

              {/* Error message */}
              {error && (
                <p
                  role="alert"
                  className="text-error text-body-md"
                >
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="
                  mt-2 w-full rounded-lg px-4 py-2.5
                  bg-primary text-on-primary font-medium text-label-lg
                  hover:opacity-90 active:opacity-80
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-opacity
                  focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-black
                "
              >
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
