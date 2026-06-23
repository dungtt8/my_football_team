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
        throw new Error('Vui lòng nhập đầy đủ thông tin')
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
      const response = await fetch(`${apiUrl}/auth/phone/login`, {
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
        <div className="text-center mb-12 animate-fade-up">
          <h1 className="text-6xl md:text-7xl font-serif font-light leading-tight mb-4" style={{ color: '#0F0E0C' }}>
            Football<br />Team
          </h1>
          <p className="text-base font-light" style={{ color: '#6B6660' }}>
            Quản lý đội bóng thông minh
          </p>
        </div>

        {/* Login Card - Premium styling */}
        <div className="rounded-2xl p-8 md:p-10 animate-fade-up" style={{ background: '#FFFFFF', boxShadow: '0 20px 48px rgba(15, 14, 12, 0.18)' }}>
          <form onSubmit={handlePhoneLogin} className="space-y-6">
            {/* Main CTA */}
            <div className="space-y-1 mb-6">
              <h2 className="text-3xl md:text-4xl font-serif font-light" style={{ color: '#0F0E0C' }}>
                Chào mừng
              </h2>
              <p className="text-sm font-light" style={{ color: '#6B6660' }}>
                Đăng nhập bằng số điện thoại
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="px-4 py-3 rounded-lg text-sm font-medium animate-pulse" style={{ background: '#FFE8E8', color: '#D64545', border: '1px solid #D64545' }}>
                {error}
              </div>
            )}

            {/* Full Name Input */}
            <div className="space-y-2">
              <label className="text-xs font-medium block uppercase tracking-wide" style={{ color: '#0F0E0C' }}>Họ và tên</label>
              <input
                type="text"
                placeholder="Nhập họ và tên"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm"
                style={{ borderColor: '#D9D4D0', background: '#FFFCF9', color: '#0F0E0C' }}
                onFocus={(e) => { e.target.style.borderColor = '#7FA89F'; e.target.style.boxShadow = '0 0 0 3px rgba(127, 168, 159, 0.1)' }}
                onBlur={(e) => { e.target.style.borderColor = '#D9D4D0'; e.target.style.boxShadow = 'none' }}
                required
              />
            </div>

            {/* Phone Input */}
            <div className="space-y-2">
              <label className="text-xs font-medium block uppercase tracking-wide" style={{ color: '#0F0E0C' }}>Số điện thoại</label>
              <input
                type="tel"
                placeholder="Ví dụ: +84 901 234 567"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all text-sm"
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
              className="w-full px-6 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-95 mt-8"
              style={{ background: '#3D5A50', color: '#FFFFFF', opacity: isPhoneLoading ? 0.7 : 1 }}
            >
              <span>{isPhoneLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
              {!isPhoneLoading && <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="15" y2="12" /><polyline points="8 9 15 12 8 15" /></svg>}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-xs" style={{ color: '#9F9A93' }}>
            © 2026 Quản lý đội bóng. Bảo lưu mọi quyền.
          </p>
        </div>
      </div>
    </div>
  )
}
