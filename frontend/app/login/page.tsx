'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

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
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12 md:py-20 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FFFCF9 0%, #F5F3F0 100%)' }}>
      {/* Background decoration - modern ambient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-teal-200/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-emerald-100/20 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-gradient-to-br from-gray-200/10 to-transparent rounded-full blur-2xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo/Title Section - Dramatic typography */}
        <div className="text-center mb-16 animate-fade-up">
          <h1 className="text-7xl md:text-8xl font-serif font-light leading-tight mb-2" style={{ color: '#0F0E0C' }}>
            Football<br />Team
          </h1>
          <p className="text-xl font-light mt-4" style={{ color: '#5F5A54' }}>
            Manage your team with intelligence
          </p>
        </div>

        {/* Login Card - Premium styling */}
        <div className="rounded-2xl p-8 md:p-10 mb-8 animate-fade-up" style={{ background: '#FFFFFF', boxShadow: '0 20px 48px rgba(15, 14, 12, 0.18)' }}>
          <form onSubmit={handlePhoneLogin} className="space-y-6">
            {/* Main CTA */}
            <div className="space-y-2 mb-8">
              <h2 className="text-4xl md:text-5xl font-serif font-light" style={{ color: '#0F0E0C' }}>
                Welcome
              </h2>
              <p className="text-lg font-light" style={{ color: '#6B6660' }}>
                Sign in with your phone number
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-6 py-4 rounded-full text-center font-medium animate-pulse" style={{ background: '#FFE8E8', color: '#D64545', border: '1px solid #D64545' }}>
                {error}
              </div>
            )}

            {/* Full Name Input */}
            <div className="space-y-2 animate-fade-up">
              <label className="text-sm font-medium block" style={{ color: '#0F0E0C' }}>Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all"
                style={{ borderColor: '#D9D4D0', background: '#FFFCF9', color: '#0F0E0C' }}
                onFocus={(e) => { e.target.style.borderColor = '#7FA89F'; e.target.style.boxShadow = '0 0 0 3px rgba(127, 168, 159, 0.1)' }}
                onBlur={(e) => { e.target.style.borderColor = '#D9D4D0'; e.target.style.boxShadow = 'none' }}
                required
              />
            </div>

            {/* Phone Input */}
            <div className="space-y-2 animate-fade-up">
              <label className="text-sm font-medium block" style={{ color: '#0F0E0C' }}>Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +84 9 1234 5678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all"
                style={{ borderColor: '#D9D4D0', background: '#FFFCF9', color: '#0F0E0C' }}
                onFocus={(e) => { e.target.style.borderColor = '#7FA89F'; e.target.style.boxShadow = '0 0 0 3px rgba(127, 168, 159, 0.1)' }}
                onBlur={(e) => { e.target.style.borderColor = '#D9D4D0'; e.target.style.boxShadow = 'none' }}
                required
              />
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isPhoneLoading}
              className="w-full px-6 py-3 rounded-full font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-95 mt-6"
              style={{ background: '#3D5A50', color: '#FFFFFF', opacity: isPhoneLoading ? 0.7 : 1 }}
            >
              <span>{isPhoneLoading ? 'Signing in...' : 'Sign In'}</span>
              {!isPhoneLoading && <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="15" y2="12" /><polyline points="8 9 15 12 8 15" /></svg>}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-8">
              <div className="flex-1 h-px" style={{ background: '#D9D4D0' }} />
              <span className="text-xs font-medium" style={{ color: '#9F9A93' }}>FEATURES</span>
              <div className="flex-1 h-px" style={{ background: '#D9D4D0' }} />
            </div>

            {/* Features - Staggered reveal */}
            <div className="space-y-4">
              <div className="flex gap-3 animate-fade-up">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#E8F5F2' }}>
                  <span style={{ color: '#3D5A50' }}>✓</span>
                </div>
                <div>
                  <p className="font-medium" style={{ color: '#0F0E0C' }}>Finance Tracking</p>
                  <p className="text-sm" style={{ color: '#9F9A93' }}>Manage team expenses with ease</p>
                </div>
              </div>

              <div className="flex gap-3 animate-fade-up">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#E8F5F2' }}>
                  <span style={{ color: '#3D5A50' }}>✓</span>
                </div>
                <div>
                  <p className="font-medium" style={{ color: '#0F0E0C' }}>Campaigns</p>
                  <p className="text-sm" style={{ color: '#9F9A93' }}>Organize team activities</p>
                </div>
              </div>

              <div className="flex gap-3 animate-fade-up">
                <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#E8F5F2' }}>
                  <span style={{ color: '#3D5A50' }}>✓</span>
                </div>
                <div>
                  <p className="font-medium" style={{ color: '#0F0E0C' }}>Attendance & Rewards</p>
                  <p className="text-sm" style={{ color: '#9F9A93' }}>Gamified team engagement</p>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs" style={{ color: '#9F9A93' }}>
            © 2026 Football Team Management. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
