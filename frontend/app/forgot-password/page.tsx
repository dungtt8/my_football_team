'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function ForgotPasswordPage() {
    const router = useRouter()
    const [phone, setPhone] = useState('')
    const [code, setCode] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [step, setStep] = useState<'request' | 'verify' | 'reset'>('request')
    const [loading, setLoading] = useState(false)
    const [notice, setNotice] = useState<{ type: 'error' | 'success'; text: string } | null>(null)

    useEffect(() => {
        if (!notice) return
        const timeoutId = window.setTimeout(() => setNotice(null), 4000)
        return () => window.clearTimeout(timeoutId)
    }, [notice])

    const requestCode = async (event: FormEvent) => {
        event.preventDefault()
        setNotice(null)
        setLoading(true)

        try {
            const response = await fetch(`${API_URL}/auth/password-reset/request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Không thể gửi mã xác nhận')

            setNotice({ type: 'success', text: data.message })
            if (data.sent) setStep('verify')
        } catch (err) {
            setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Không thể gửi mã xác nhận' })
        } finally {
            setLoading(false)
        }
    }

    const verifyCode = async (event: FormEvent) => {
        event.preventDefault()
        setNotice(null)
        setLoading(true)

        try {
            const response = await fetch(`${API_URL}/auth/password-reset/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone, code }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Không thể xác minh mã')

            setNotice({ type: 'success', text: data.message })
            setStep('reset')
        } catch (err) {
            setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Không thể xác minh mã' })
        } finally {
            setLoading(false)
        }
    }

    const resetPassword = async (event: FormEvent) => {
        event.preventDefault()
        setNotice(null)

        if (newPassword !== confirmPassword) {
            setNotice({ type: 'error', text: 'Mật khẩu xác nhận không khớp' })
            return
        }

        setLoading(true)

        try {
            const response = await fetch(`${API_URL}/auth/password-reset/confirm`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone,
                    code,
                    new_password: newPassword,
                    new_password_confirm: confirmPassword,
                }),
            })
            const data = await response.json()
            if (!response.ok) throw new Error(data.error || 'Không thể đổi mật khẩu')

            router.replace('/login')
        } catch (err) {
            setNotice({ type: 'error', text: err instanceof Error ? err.message : 'Không thể đổi mật khẩu' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-[100dvh] flex items-center justify-center" style={{ background: 'var(--background)', padding: '24px' }}>
            <section className="card w-full" style={{ maxWidth: '420px', padding: '32px' }}>
                <p className="eyebrow">Tài khoản</p>
                <h1 style={{ fontSize: '1.75rem', marginTop: '8px', marginBottom: '16px' }}>Quên mật khẩu</h1>

                {notice && (
                    <p
                        className="text-sm"
                        role="status"
                        style={{ color: notice.type === 'error' ? 'var(--danger)' : 'var(--brand-600)', marginBottom: '16px' }}
                    >
                        {notice.text}
                    </p>
                )}

                {step === 'request' ? (
                    <form onSubmit={requestCode} style={{ display: 'grid', gap: '16px' }}>
                        <label className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
                            Số điện thoại liên kết Zalo
                            <input
                                type="tel"
                                value={phone}
                                onChange={(event) => setPhone(event.target.value)}
                                placeholder="0901 234 567"
                                required
                                className="w-full bg-transparent focus:outline-none text-base"
                                style={{ border: '1px solid var(--line)', borderRadius: '8px', marginTop: '8px', padding: '12px' }}
                            />
                        </label>
                        <button type="submit" disabled={loading} className="btn btn-primary btn-block">
                            {loading ? 'Đang gửi mã...' : 'Gửi mã qua Zalo'}
                        </button>
                    </form>
                ) : step === 'verify' ? (
                    <form onSubmit={verifyCode} style={{ display: 'grid', gap: '16px' }}>
                        <label className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
                            Mã xác nhận
                            <input
                                inputMode="numeric"
                                pattern="[0-9]{6}"
                                maxLength={6}
                                value={code}
                                onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                                placeholder="6 chữ số"
                                required
                                className="w-full bg-transparent focus:outline-none text-base"
                                style={{ border: '1px solid var(--line)', borderRadius: '8px', marginTop: '8px', padding: '12px' }}
                            />
                        </label>
                        <button type="submit" disabled={loading || code.length !== 6} className="btn btn-primary btn-block">
                            {loading ? 'Đang xác minh...' : 'Xác nhận mã'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-block"
                            onClick={() => {
                                setStep('request')
                                setCode('')
                                setNotice(null)
                            }}
                        >
                            Gửi lại mã
                        </button>
                    </form>
                ) : (
                    <form onSubmit={resetPassword} style={{ display: 'grid', gap: '16px' }}>
                        <label className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
                            Nhập mật khẩu mới
                            <input
                                type="password"
                                minLength={8}
                                value={newPassword}
                                onChange={(event) => setNewPassword(event.target.value)}
                                placeholder="Tối thiểu 8 ký tự"
                                required
                                className="w-full bg-transparent focus:outline-none text-base"
                                style={{ border: '1px solid var(--line)', borderRadius: '8px', marginTop: '8px', padding: '12px' }}
                            />
                        </label>
                        <label className="text-sm font-semibold" style={{ color: 'var(--ink-2)' }}>
                            Xác nhận mật khẩu mới
                            <input
                                type="password"
                                minLength={8}
                                value={confirmPassword}
                                onChange={(event) => setConfirmPassword(event.target.value)}
                                placeholder="Nhập lại mật khẩu mới"
                                required
                                className="w-full bg-transparent focus:outline-none text-base"
                                style={{ border: '1px solid var(--line)', borderRadius: '8px', marginTop: '8px', padding: '12px' }}
                            />
                        </label>
                        <button type="submit" disabled={loading} className="btn btn-primary btn-block">
                            {loading ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
                        </button>
                        <button type="button" className="btn btn-ghost btn-block" onClick={() => setStep('verify')}>
                            Nhập lại mã xác nhận
                        </button>
                    </form>
                )}

                <p className="text-center text-sm" style={{ color: 'var(--ink-3)', marginTop: '24px' }}>
                    <Link href="/login" style={{ color: 'var(--brand-600)', fontWeight: 600 }}>Quay lại đăng nhập</Link>
                </p>
            </section>
        </main>
    )
}
