'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

function LoginFormContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { isAuthenticated, isLoading, setAuthData } = useAuth()
    const [phone, setPhone] = useState('')
    const [fullName, setFullName] = useState('')
    const [isPhoneLoading, setIsPhoneLoading] = useState(false)
    const [error, setError] = useState('')
    const [focusedField, setFocusedField] = useState<string | null>(null)

    // Auto-redirect if already authenticated (from previous session)
    useEffect(() => {
        if (!isLoading && isAuthenticated) {
            const redirect = searchParams.get('redirect') || searchParams.get('from')
            router.push(redirect || '/')
        }
    }, [isAuthenticated, isLoading, router, searchParams])

    const handlePhoneLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsPhoneLoading(true)

        try {
            if (!phone || !fullName) {
                throw new Error('Vui lòng nhập đầy đủ thông tin')
            }

            console.log('[Login] Starting phone authentication...')

            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'
            const response = await fetch(`${apiUrl}/auth/phone/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, full_name: fullName }),
            })

            const data = await response.json()
            console.log('[Login] API Response:', { status: response.status, hasToken: !!data.token, hasUser: !!data.user })

            if (!response.ok) {
                throw new Error(data.error || 'Login failed')
            }

            if (!data.token || !data.user) {
                throw new Error('Invalid response: missing token or user')
            }

            console.log('[Login] Setting auth data...')
            // setAuthData writes the token to localStorage and sets the auth cookie
            // synchronously (before touching React state), so by the time this call
            // returns, both the cookie (read by middleware) and localStorage (read by
            // AuthContext on next mount) are already durably updated. We no longer
            // need an arbitrary setTimeout "to let context settle" before navigating —
            // navigating immediately is safe since the underlying storage is already
            // consistent, and middleware.ts reads the cookie directly regardless of
            // React state timing.
            // Pass teams array if available from login response
            setAuthData(data.token, data.user, data.team ?? null, data.user.role, data.teams || [])

            console.log('[Login] Auth data set, redirecting...')
            try {
                let targetUrl = '/'

                // Priority 1: If user doesn't have team → go to onboarding
                if (data.has_team === false) {
                    targetUrl = '/onboarding'
                    console.log('[Login] User has no team, redirecting to onboarding')
                } else {
                    // Priority 2: If there's a redirect param and user has team → use it
                    const redirect = searchParams.get('redirect') || searchParams.get('from')
                    if (redirect && redirect !== '/login') {
                        targetUrl = redirect
                        console.log('[Login] Using redirect param:', targetUrl)
                    }
                }

                console.log('[Login] Final redirect to:', targetUrl)
                router.push(targetUrl)
            } catch (redirectErr) {
                console.error('[Login] Redirect error:', redirectErr)
                setError('Redirect failed, please try again')
                setIsPhoneLoading(false)
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed'
            console.error('[Login] Error:', message, err)
            setError(message)
            setIsPhoneLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F4F7FB' }}>
                <div className="w-6 h-6 border-2 border-[#D1F0E0] border-t-[#12B76A] rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-[100dvh] flex flex-col md:flex-row">

            {/* ── Left panel: Branding (hidden on mobile) ─────────── */}
            <div
                className="hidden md:flex md:w-5/12 lg:w-1/3 flex-col justify-between relative overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #0C2A20 0%, #0F3D2C 55%, #12B76A 140%)', padding: '20px 50px' }}
            >
                {/* Decorative pitch lines */}
                <svg
                    className="absolute inset-0 w-full h-full opacity-[0.04]"
                    viewBox="0 0 500 700"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="xMidYMid slice"
                >
                    <rect x="40" y="40" width="420" height="620" rx="8" stroke="white" strokeWidth="3" />
                    <line x1="40" y1="350" x2="460" y2="350" stroke="white" strokeWidth="2" />
                    <circle cx="250" cy="350" r="70" stroke="white" strokeWidth="2" />
                    <rect x="140" y="40" width="220" height="90" stroke="white" strokeWidth="2" />
                    <rect x="190" y="40" width="120" height="45" stroke="white" strokeWidth="2" />
                    <rect x="140" y="570" width="220" height="90" stroke="white" strokeWidth="2" />
                    <rect x="190" y="615" width="120" height="45" stroke="white" strokeWidth="2" />
                    <circle cx="250" cy="40" r="10" stroke="white" strokeWidth="2" />
                    <circle cx="250" cy="660" r="10" stroke="white" strokeWidth="2" />
                    <circle cx="250" cy="350" r="5" fill="white" />
                </svg>

                {/* Glow orb */}
                <div
                    className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
                    style={{ background: 'radial-gradient(circle, rgba(18,183,106,0.15) 0%, transparent 70%)' }}
                />

                {/* Top: Logo mark */}
                <div className="relative z-10 flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)' }}
                    >
                        ⚽
                    </div>
                    <span className="text-sm font-bold tracking-tight" style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'var(--font-head)' }}>
                        My Football Team
                    </span>
                </div>

                {/* Center: Headline */}
                <div className="relative z-10 space-y-7">
                    <p
                        className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                        style={{ color: '#4FE0A3' }}
                    >
                        Nền tảng quản lý
                    </p>
                    <h1
                        className="font-extrabold leading-[1.05]"
                        style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', color: '#FFFFFF', fontFamily: 'var(--font-head)', letterSpacing: '-0.02em' }}
                    >
                        Quản lý đội bóng<br />
                        <em style={{ color: '#4FE0A3', fontStyle: 'normal' }}>thông minh</em>
                    </h1>
                    <p className="text-base font-light leading-relaxed max-w-xs" style={{ color: 'rgba(255,255,255,0.72)' }}>
                        Theo dõi tài chính, điểm danh và khoản thu — tất cả trong một nơi.
                    </p>
                </div>

                {/* Bottom: Stats strip */}
                <div className="relative z-10 flex items-center gap-12">
                    {[
                        { value: '11+', label: 'Cầu thủ' },
                        { value: '100%', label: 'Minh bạch' },
                        { value: '24/7', label: 'Trực tuyến' },
                    ].map((s) => (
                        <div key={s.label}>
                            <p className="text-xl font-bold" style={{ color: '#FFFFFF', fontFamily: 'var(--font-head)' }}>{s.value}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right panel: Form ────────────────────────────────── */}
            <div
                className="flex-1 flex flex-col items-center justify-center px-10 py-16 md:py-0 relative overflow-hidden"
                style={{ background: '#FFFFFF' }}
            >
                {/* Subtle ambient background */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div
                        className="absolute -top-32 -right-32 w-80 h-80 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(18,183,106,0.10) 0%, transparent 70%)' }}
                    />
                    <div
                        className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(61,90,80,0.06) 0%, transparent 70%)' }}
                    />
                </div>

                <div className="relative z-10 w-full max-w-sm md:px-6">

                    {/* Mobile-only logo */}
                    <div className="flex md:hidden items-center gap-2.5 mb-14">
                        <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-base"
                            style={{ background: '#027A48' }}
                        >
                            ⚽
                        </div>
                        <span className="text-sm font-semibold" style={{ color: '#0B1220' }}>My Football Team</span>
                    </div>

                    {/* Form header */}
                    <div className="mb-14">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: '#7A8699' }}>
                            Bắt đầu
                        </p>
                        <h2 className="font-extrabold" style={{ fontSize: '2.2rem', color: '#0B1220', lineHeight: 1.1, fontFamily: 'var(--font-head)', letterSpacing: '-0.02em' }}>
                            Đăng nhập
                        </h2>
                    </div>

                    {/* Error */}
                    {error && (
                        <div
                            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm mb-6"
                            style={{ background: '#FEECEB', color: '#F04438', border: '1px solid rgba(214,69,69,0.15)' }}
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="6" stroke="#F04438" strokeWidth="1.5" />
                                <path d="M7 4v3.5M7 10h.01" stroke="#F04438" strokeWidth="1.5" strokeLinecap="round" />
                            </svg>
                            {error}
                        </div>
                    )}

                    {/* Fields */}
                    <form onSubmit={handlePhoneLogin} className="space-y-10">
                        {/* Name */}
                        <div>
                            <label
                                className="block text-sm font-semibold uppercase tracking-[0.16em] mb-2"
                                style={{ color: '#7A8699' }}
                            >
                                Họ và tên
                            </label>
                            <div
                                className="relative rounded-2xl transition-all duration-200"
                                style={{
                                    background: focusedField === 'name' ? '#FFFFFF' : '#F4F7FB',
                                    border: `1.5px solid ${focusedField === 'name' ? '#12B76A' : 'transparent'}`,
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
                                    style={{ color: '#0B1220', padding: '20px 24px' }}
                                    required
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label
                                className="block text-sm font-semibold uppercase tracking-[0.16em] mb-2"
                                style={{ color: '#7A8699' }}
                            >
                                Số điện thoại
                            </label>
                            <div
                                className="relative rounded-2xl transition-all duration-200"
                                style={{
                                    background: focusedField === 'phone' ? '#FFFFFF' : '#F4F7FB',
                                    border: `1.5px solid ${focusedField === 'phone' ? '#12B76A' : 'transparent'}`,
                                    boxShadow: focusedField === 'phone' ? '0 0 0 3px rgba(18,183,106,0.12)' : 'none',
                                }}
                            >
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-medium select-none" style={{ color: '#7A8699' }}>
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
                                    style={{ color: '#0B1220', padding: '20px 24px 20px 48px' }}
                                    required
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isPhoneLoading}
                            className="group w-full rounded-2xl font-semibold text-base flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-[0.98]"
                            style={{
                                padding: '18px 28px', marginTop: '12px',
                                background: isPhoneLoading ? '#039855' : '#027A48',
                                color: '#FFFFFF',
                                boxShadow: isPhoneLoading ? 'none' : '0 4px 16px rgba(61, 90, 80, 0.35)',
                            }}
                        >
                            {isPhoneLoading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Đang đăng nhập...</span>
                                </>
                            ) : (
                                <>
                                    <span>Đăng nhập</span>
                                    <span
                                        className="w-6 h-6 rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5"
                                        style={{ background: '#DDE3EC' }}
                                    >
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M2 6h8M6 2l4 4-4 4" />
                                        </svg>
                                    </span>
                                </>
                            )}
                        </button>
                    </form>

                    {/* Footer */}
                    <p className="text-center text-[11px] mt-12" style={{ color: '#A9B4C2' }}>
                        © 2026 My Football Team
                    </p>
                </div>
            </div>

        </div>
    )
}

export default function LoginPage() {
    return (
        <Suspense fallback={
            <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#F4F7FB' }}>
                <div className="w-6 h-6 border-2 border-[#D1F0E0] border-t-[#12B76A] rounded-full animate-spin" />
            </div>
        }>
            <LoginFormContent />
        </Suspense>
    )
}
