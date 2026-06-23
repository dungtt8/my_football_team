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
    <div className="min-h-screen bg-cream flex flex-col items-center justify-center px-lg py-4xl md:py-5xl relative overflow-hidden">
      {/* Background decoration - modern ambient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-sage/8 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-forest/6 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-stone/5 rounded-full blur-2xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Title Section - Dramatic typography */}
        <div className="text-center mb-5xl animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-smooth">
          <h1 className="text-6xl md:text-7xl font-serif text-slate mb-md font-light">
            Football<br />Team
          </h1>
          <p className="text-lg text-stone">
            Manage your team with intelligence
          </p>
        </div>

        {/* Login Card - Double-Bezel architecture */}
        <Card className="py-5xl px-3xl shadow-deep animate-in fade-in slide-in-from-bottom-12 duration-1000 ease-smooth delay-100">
          <form onSubmit={handlePhoneLogin} className="space-y-4xl">
            {/* Main CTA */}
            <div className="space-y-xl animate-in fade-in duration-700 delay-200">
              <h2 className="text-4xl font-serif text-slate text-center font-light">
                Welcome
              </h2>
              <p className="text-body text-stone text-center">
                Sign in with your phone number
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-errorRed/10 text-errorRed text-body px-lg py-md rounded-full border border-errorRed/20 animate-in fade-in slide-in-from-top-4 duration-300">
                {error}
              </div>
            )}

            {/* Full Name Input */}
            <div className="space-y-xs animate-in fade-in duration-500 delay-300">
              <label className="text-caption font-medium text-slate block">Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-lg py-md border border-slate/15 rounded-lg focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/30 transition-all bg-cream text-slate placeholder-stone/50"
                required
              />
            </div>

            {/* Phone Input */}
            <div className="space-y-xs animate-in fade-in duration-500 delay-400">
              <label className="text-caption font-medium text-slate block">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +84 9 1234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-lg py-md border border-slate/15 rounded-lg focus:outline-none focus:border-sage focus:ring-2 focus:ring-sage/30 transition-all bg-cream text-slate placeholder-stone/50"
                required
              />
            </div>

            {/* Login Button */}
            <Button
              variant="primary"
              size="md"
              type="submit"
              isLoading={isPhoneLoading}
              className="w-full flex items-center justify-center gap-md group animate-in fade-in duration-500 delay-500"
            >
              <span>Sign In</span>
              <ArrowRight size={20} weight="bold" className="group-hover:translate-x-1 transition-transform" />
            </Button>

            {/* Divider */}
            <div className="flex items-center gap-lg animate-in fade-in duration-500 delay-600">
              <div className="flex-1 h-px bg-slate/10" />
              <span className="text-caption text-stone/60">features</span>
              <div className="flex-1 h-px bg-slate/10" />
            </div>

            {/* Features - Staggered reveal */}
            <div className="space-y-lg">
              <div className="flex gap-lg animate-in fade-in slide-in-from-left-4 duration-500 delay-700">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-sage/20">
                    <span className="text-sage font-bold">✓</span>
                  </div>
                </div>
                <div>
                  <p className="text-body font-medium text-slate">Finance Tracking</p>
                  <p className="text-caption text-stone/70">Manage team expenses with ease</p>
                </div>
              </div>

              <div className="flex gap-lg animate-in fade-in slide-in-from-left-4 duration-500 delay-800">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-sage/20">
                    <span className="text-sage font-bold">✓</span>
                  </div>
                </div>
                <div>
                  <p className="text-body font-medium text-slate">Campaigns</p>
                  <p className="text-caption text-stone/70">Organize team activities</p>
                </div>
              </div>

              <div className="flex gap-lg animate-in fade-in slide-in-from-left-4 duration-500 delay-900">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-10 w-10 rounded-full bg-sage/20">
                    <span className="text-sage font-bold">✓</span>
                  </div>
                </div>
                <div>
                  <p className="text-body font-medium text-slate">Attendance & Rewards</p>
                  <p className="text-caption text-stone/70">Gamified team engagement</p>
                </div>
              </div>
            </div>
          </form>
        </Card>

        {/* Footer */}
        <div className="mt-4xl text-center animate-in fade-in duration-700 delay-1000">
          <p className="text-caption text-stone/60">
            © 2026 Football Team Management. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
