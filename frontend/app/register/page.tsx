'use client'

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

function RegisterFormContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { isAuthenticated, isLoading, setAuthData } = useAuth()
    const [phone, setPhone] = useState('')
    const [fullName, setFullName] = useState('')
    const [password, setPassword] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [focusedField, setFocusedField] = useState<string | null>(null)

    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            router.push('/')
        }
    }, [isAuthenticated, isLoading, router])

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsSubmitting(true)

        try {
            if (!phone || !fullName || !password) {
                throw new Error('Vui lòng nhập đầy đủ thông tin')
            }
            if (password.length < 8) {
                throw new Error('Mật khẩu phải có ít nhất 8 ký tự')
            }

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
            const response = await fetch(`${apiUrl}/auth/phone/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, full_name: fullName, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.error || 'Đăng ký thất bại')
            }

            if (!data.token || !data.user) {
                throw new Error('Invalid response: missing token or user')
            }

            setAuthData(data.token, data.user, data.team ?? null, data.user.role, data.teams || [])

            const redirect = searchParams.get('redirect') || searchParams.get('from')
            router.push(data.has_team === false ? '/onboarding' : (redirect && redirect !== '/register' ? redirect : '/'))
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Đăng ký thất bại'
            setError(message)
            setIsSubmitting(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--background)' }}>
                <div className="w-6 h-6 border-2 border-[var(--brand-100)] border-t-[var(--brand)] rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div
            className="min-h-[100dvh] flex items-center justify-center relative overflow-hidden"
            style={{ background: 'linear-gradient(160deg, #0C2A20 0%, #0F3D2C 45%, #12B76A 150%)', padding: '48px 20px' }}
        >
            {/* Decorative pitch lines */}
            <svg
                className="absolute inset-0 w-full h-full opacity-[0.05]"
                viewBox="0 0 800 800"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                preserveAspectRatio="xMidYMid slice"
            >
                <rect x="60" y="60" width="680" height="680" rx="8" stroke="white" strokeWidth="3" />
                <line x1="60" y1="400" x2="740" y2="400" stroke="white" strokeWidth="2" />
                <circle cx="400" cy="400" r="110" stroke="white" strokeWidth="2" />
                <rect x="220" y="60" width="360" height="130" stroke="white" strokeWidth="2" />
                <rect x="220" y="610" width="360" height="130" stroke="white" strokeWidth="2" />
                <circle cx="400" cy="400" r="5" fill="white" />
            </svg>

            {/* Glow orb */}
            <div
                className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[36rem] h-[36rem] rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(79,224,163,0.25) 0%, transparent 70%)' }}
            />

            {/* Card */}
            <div className="card relative z-10 w-full" style={{ maxWidth: '420px', padding: '40px 32px' }}>
                {/* Logo */}
                <div className="flex flex-col items-center text-center" style={{ marginBottom: '36px' }}>
                    <div className="crest flex items-center justify-center" style={{ width: '56px', height: '56px', fontSize: '1.5rem', marginBottom: '16px' }}>⚽</div>
                    <span className="text-sm font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-head)' }}>
                        My Football Team
                    </span>
                    <p className="eyebrow" style={{ marginTop: '20px' }}>Bắt đầu</p>
                    <h1 style={{ fontSize: '1.9rem', marginTop: '8px' }}>Đăng ký</h1>
                    <p className="text-sm" style={{ color: 'var(--ink-3)', marginTop: '8px' }}>
                        Theo dõi tài chính, điểm danh và khoản thu.
                    </p>
                </div>

                {/* Error */}
                {error && (
                    <div
                        className="flex items-center text-sm"
                        style={{ gap: '10px', padding: '12px 16px', borderRadius: '16px', marginBottom: '24px', background: 'var(--danger-050)', color: 'var(--danger)', border: '1px solid rgba(240,68,56,0.15)' }}
                    >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
                            <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M7 4v3.5M7 10h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        {error}
                    </div>
                )}

                {/* Fields */}
                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {/* Name */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--ink-3)', marginBottom: '8px' }}>
                            Họ và tên
                        </label>
                        <div
                            className="relative rounded-2xl transition-all duration-200"
                            style={{
                                background: focusedField === 'name' ? 'var(--surface)' : 'var(--surface-2)',
                                border: `1.5px solid ${focusedField === 'name' ? 'var(--brand)' : 'var(--line)'}`,
                                boxShadow: focusedField === 'name' ? '0 0 0 3px rgba(18,183,106,0.12)' : 'none',
                            }}
                        >
                            <input
                                type="text"
                                placeholder="Nguyễn Văn A"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                onFocus={() => setFocusedField('name')}
                                onBlur={() => setFocusedField(null)}
                                className="w-full bg-transparent focus:outline-none text-base"
                                style={{ color: 'var(--ink)', padding: '14px 18px' }}
                                required
                            />
                        </div>
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--ink-3)', marginBottom: '8px' }}>
                            Số điện thoại
                        </label>
                        <div
                            className="relative rounded-2xl transition-all duration-200"
                            style={{
                                background: focusedField === 'phone' ? 'var(--surface)' : 'var(--surface-2)',
                                border: `1.5px solid ${focusedField === 'phone' ? 'var(--brand)' : 'var(--line)'}`,
                                boxShadow: focusedField === 'phone' ? '0 0 0 3px rgba(18,183,106,0.12)' : 'none',
                            }}
                        >
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-medium select-none" style={{ color: 'var(--ink-3)' }}>
                                🇻🇳
                            </div>
                            <input
                                type="tel"
                                placeholder="0901 234 567"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                onFocus={() => setFocusedField('phone')}
                                onBlur={() => setFocusedField(null)}
                                className="w-full bg-transparent focus:outline-none text-base"
                                style={{ color: 'var(--ink)', padding: '14px 18px 14px 40px' }}
                                required
                            />
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--ink-3)', marginBottom: '8px' }}>
                            Mật khẩu
                        </label>
                        <div
                            className="relative rounded-2xl transition-all duration-200"
                            style={{
                                background: focusedField === 'password' ? 'var(--surface)' : 'var(--surface-2)',
                                border: `1.5px solid ${focusedField === 'password' ? 'var(--brand)' : 'var(--line)'}`,
                                boxShadow: focusedField === 'password' ? '0 0 0 3px rgba(18,183,106,0.12)' : 'none',
                            }}
                        >
                            <input
                                type="password"
                                placeholder="Tối thiểu 8 ký tự"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                className="w-full bg-transparent focus:outline-none text-base"
                                style={{ color: 'var(--ink)', padding: '14px 18px' }}
                                minLength={8}
                                required
                            />
                        </div>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="btn btn-primary btn-block"
                        style={{ marginTop: '8px', opacity: isSubmitting ? 0.85 : 1 }}
                    >
                        {isSubmitting ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Đang đăng ký...</span>
                            </>
                        ) : (
                            <span>Đăng ký</span>
                        )}
                    </button>
                </form>

                {/* Link to login */}
                <p className="text-center text-sm" style={{ color: 'var(--ink-3)', marginTop: '24px' }}>
                    Đã có tài khoản?{' '}
                    <Link
                        href={(() => {
                            const redirect = searchParams.get('redirect') || searchParams.get('from')
                            return redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'
                        })()}
                        style={{ color: 'var(--brand-600)', fontWeight: 600 }}
                    >
                        Đăng nhập
                    </Link>
                </p>

                {/* Footer */}
                <p className="text-center text-[11px]" style={{ color: 'var(--ink-4)', marginTop: '24px' }}>
                    © {new Date().getFullYear()} My Football Team · Bản quyền thuộc về{' '}
                    <a
                        href="https://revonexus.net"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--brand-600)', fontWeight: 600 }}
                    >
                        revonexus.net
                    </a>
                </p>
            </div>
        </div>
    )
}

export default function RegisterPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--background)' }}>
                <div className="w-6 h-6 border-2 border-[var(--brand-100)] border-t-[var(--brand)] rounded-full animate-spin" />
            </div>
        }>
            <RegisterFormContent />
        </Suspense>
    )
}
