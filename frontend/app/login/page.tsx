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
            const redirect = searchParams.get('redirect')
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

            // Update AuthContext state + localStorage atomically
            // Pass teams array if available from login response
            setAuthData(data.token, data.user, data.team ?? null, data.user.role, data.teams || [])

            // Redirect after context update completes
            // Use setTimeout to ensure context state updates before navigation
            setTimeout(() => {
                const redirect = searchParams.get('redirect')
                if (redirect) {
                    // Redirect to the preserved invite link (with code param)
                    router.push(redirect)
                } else {
                    // No redirect param: check team status
                    router.push(data.has_team === false ? '/onboarding' : '/')
                }
            }, 0)
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Login failed'
            setError(message)
            setIsPhoneLoading(false)
        }
    }

    if (isLoading) {
        return (
            <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#0F1A17' }}>
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        )
    }

    return (
        <div className="min-h-[100dvh] flex flex-col md:flex-row">

            {/* ── Left panel: Branding (hidden on mobile) ─────────── */}
            <div
                className="hidden md:flex md:w-5/12 lg:w-1/3 flex-col justify-between relative overflow-hidden"
                style={{ background: 'linear-gradient(160deg, #1B3A30 0%, #0F2318 60%, #091810 100%)', padding: '20px 50px' }}
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
                    style={{ background: 'radial-gradient(circle, rgba(127,168,159,0.15) 0%, transparent 70%)' }}
                />

                {/* Top: Logo mark */}
                <div className="relative z-10 flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{ background: 'rgba(127, 168, 159, 0.15)', border: '1px solid rgba(127,168,159,0.2)' }}
                    >
                        ⚽
                    </div>
                    <span className="text-sm font-semibold tracking-tight" style={{ color: 'rgba(255,252,249,0.7)' }}>
                        My Football Team
                    </span>
                </div>

                {/* Center: Headline */}
                <div className="relative z-10 space-y-7">
                    <p
                        className="text-[10px] font-semibold uppercase tracking-[0.2em]"
                        style={{ color: '#7FA89F' }}
                    >
                        Nền tảng quản lý
                    </p>
                    <h1
                        className="font-serif font-light leading-[1.05]"
                        style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', color: '#FFFCF9' }}
                    >
                        Quản lý đội bóng<br />
                        <em style={{ color: '#7FA89F' }}>thông minh</em>
                    </h1>
                    <p className="text-base font-light leading-relaxed max-w-xs" style={{ color: 'rgba(255,252,249,0.5)' }}>
                        Theo dõi tài chính, điểm danh và chiến dịch — tất cả trong một nơi.
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
                            <p className="text-xl font-semibold" style={{ color: '#FFFCF9' }}>{s.value}</p>
                            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,252,249,0.4)' }}>{s.label}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Right panel: Form ────────────────────────────────── */}
            <div
                className="flex-1 flex flex-col items-center justify-center px-10 py-16 md:py-0 relative overflow-hidden"
                style={{ background: '#FFFCF9' }}
            >
                {/* Subtle ambient background */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div
                        className="absolute -top-32 -right-32 w-80 h-80 rounded-full"
                        style={{ background: 'radial-gradient(circle, rgba(127,168,159,0.10) 0%, transparent 70%)' }}
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
                            style={{ background: '#3D5A50' }}
                        >
                            ⚽
                        </div>
                        <span className="text-sm font-semibold" style={{ color: '#0F0E0C' }}>My Football Team</span>
                    </div>

                    {/* Form header */}
                    <div className="mb-14">
                        <p className="text-xs font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: '#9F9A93' }}>
                            Bắt đầu
                        </p>
                        <h2 className="font-serif font-light" style={{ fontSize: '2.5rem', color: '#0F0E0C', lineHeight: 1.1 }}>
                            Đăng nhập
                        </h2>
                    </div>

                    {/* Error */}
                    {error && (
                        <div
                            className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm mb-6"
                            style={{ background: '#FFF0F0', color: '#D64545', border: '1px solid rgba(214,69,69,0.15)' }}
                        >
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <circle cx="7" cy="7" r="6" stroke="#D64545" strokeWidth="1.5" />
                                <path d="M7 4v3.5M7 10h.01" stroke="#D64545" strokeWidth="1.5" strokeLinecap="round" />
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
                                style={{ color: '#9F9A93' }}
                            >
                                Họ và tên
                            </label>
                            <div
                                className="relative rounded-2xl transition-all duration-200"
                                style={{
                                    background: focusedField === 'name' ? '#FFFFFF' : '#F5F3F0',
                                    border: `1.5px solid ${focusedField === 'name' ? '#7FA89F' : 'transparent'}`,
                                    boxShadow: focusedField === 'name' ? '0 0 0 3px rgba(127,168,159,0.12)' : 'none',
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
                                    style={{ color: '#0F0E0C', padding: '20px 24px' }}
                                    required
                                />
                            </div>
                        </div>

                        {/* Phone */}
                        <div>
                            <label
                                className="block text-sm font-semibold uppercase tracking-[0.16em] mb-2"
                                style={{ color: '#9F9A93' }}
                            >
                                Số điện thoại
                            </label>
                            <div
                                className="relative rounded-2xl transition-all duration-200"
                                style={{
                                    background: focusedField === 'phone' ? '#FFFFFF' : '#F5F3F0',
                                    border: `1.5px solid ${focusedField === 'phone' ? '#7FA89F' : 'transparent'}`,
                                    boxShadow: focusedField === 'phone' ? '0 0 0 3px rgba(127,168,159,0.12)' : 'none',
                                }}
                            >
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-medium select-none" style={{ color: '#9F9A93' }}>
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
                                    style={{ color: '#0F0E0C', padding: '20px 24px 20px 48px' }}
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
                                background: isPhoneLoading ? '#6A9289' : '#3D5A50',
                                color: '#FFFCF9',
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
                                        style={{ background: 'rgba(255,255,255,0.15)' }}
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
                    <p className="text-center text-[11px] mt-12" style={{ color: '#C5C0BB' }}>
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
            <div className="min-h-[100dvh] flex items-center justify-center" style={{ background: '#0F1A17' }}>
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
        }>
            <LoginFormContent />
        </Suspense>
    )
}
