'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/Common/Button'
import { Card } from '@/components/Common/Card'
import { ArrowRight } from 'phosphor-react'

export default function LoginPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading } = useAuth()
  const [phone, setPhone] = useState('')
  const [fullName, setFullName] = useState('')
  const [isPhoneLoading, setIsPhoneLoading] = useState(false)
  const [error, setError] = useState('')

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/app/finance')
    }
  }, [isAuthenticated, isLoading, router])

  const handlePhoneLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsPhoneLoading(true)

    try {
      if (!phone || !fullName) {
        throw new Error('Phone and name are required')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/phone/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, full_name: fullName }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Login failed')
      }

      // Store auth data
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('team', JSON.stringify(data.team))
      localStorage.setItem('role', data.user.role)

      // Redirect to app
      router.push('/app/finance')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      console.error('Phone login error:', err)
      setIsPhoneLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="animate-fade-in">
          <p className="text-body text-taupe">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-lg py-4xl md:py-5xl">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-10 right-10 w-96 h-96 bg-sage/5 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-10 w-96 h-96 bg-tan/5 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Title Section */}
        <div className="text-center mb-5xl">
          <h1 className="text-hero font-serif text-espresso mb-lg">
            Football Team
          </h1>
          <p className="text-body text-taupe">
            Manage your team with intelligence
          </p>
        </div>

        {/* Login Card */}
        <Card className="py-4xl px-2xl">
          <form onSubmit={handlePhoneLogin} className="space-y-4xl">
            {/* Main CTA */}
            <div className="space-y-xl">
              <h2 className="text-heading-1 font-serif text-espresso text-center">
                Welcome
              </h2>
              <p className="text-body text-taupe text-center">
                Sign in with your phone number
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-error-red/10 text-error-red text-body px-lg py-md rounded-full border border-error-red/20">
                {error}
              </div>
            )}

            {/* Full Name Input */}
            <div className="space-y-xs">
              <label className="text-caption font-medium text-espresso block">Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-lg py-md border border-espresso/20 rounded-lg focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all bg-cream text-espresso placeholder-taupe/50"
                required
              />
            </div>

            {/* Phone Input */}
            <div className="space-y-xs">
              <label className="text-caption font-medium text-espresso block">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +84 9 1234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-lg py-md border border-espresso/20 rounded-lg focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/20 transition-all bg-cream text-espresso placeholder-taupe/50"
                required
              />
            </div>

            {/* Login Button */}
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isPhoneLoading}
              className="w-full flex items-center justify-center gap-md"
            >
              <span>Sign In</span>
              <ArrowRight size={20} weight="bold" />
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-lg">
              <div className="flex-1 h-px bg-espresso/10" />
              <span className="text-caption text-taupe/60">features</span>
              <div className="flex-1 h-px bg-espresso/10" />
            </div>

            {/* Features */}
            <div className="space-y-lg">
              <div className="flex gap-lg">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-sage/20">
                    <span className="text-sage font-bold">✓</span>
                  </div>
                </div>
                <div>
                  <p className="text-body font-medium text-espresso">Finance Tracking</p>
                  <p className="text-caption text-taupe/70">Manage team expenses with ease</p>
                </div>
              </div>

              <div className="flex gap-lg">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-sage/20">
                    <span className="text-sage font-bold">✓</span>
                  </div>
                </div>
                <div>
                  <p className="text-body font-medium text-espresso">Campaigns</p>
                  <p className="text-caption text-taupe/70">Organize team activities</p>
                </div>
              </div>

              <div className="flex gap-lg">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-sage/20">
                    <span className="text-sage font-bold">✓</span>
                  </div>
                </div>
                <div>
                  <p className="text-body font-medium text-espresso">Attendance & Rewards</p>
                  <p className="text-caption text-taupe/70">Gamified team engagement</p>
                </div>
              </div>
            </div>
          </form>
        </Card>

        {/* Footer */}
        <div className="mt-4xl text-center">
          <p className="text-caption text-taupe/60">
            © 2026 Football Team Management. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
