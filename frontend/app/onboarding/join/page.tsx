'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

const G = {
  glass: 'rgba(255,255,255,0.07)', glassBorder: 'rgba(255,255,255,0.10)',
  accent: '#00D68F', t1: '#F0F4FF', t2: 'rgba(240,244,255,0.55)', t3: 'rgba(240,244,255,0.30)',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

function JoinTeamFormContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setAuthData, user, isLoading: authLoading, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Auto-fill invite code from URL parameter & redirect to login if needed
  useEffect(() => {
    const codeFromUrl = searchParams.get('code')
    if (codeFromUrl) {
      setCode(codeFromUrl.toUpperCase())
    }

    // Only redirect after auth loading is complete
    if (authLoading) return

    // If not authenticated, redirect to login with preserved invite link
    if (!isAuthenticated) {
      const inviteUrl = `/onboarding/join?code=${codeFromUrl || ''}`
      const loginUrl = `/login?redirect=${encodeURIComponent(inviteUrl)}`
      router.replace(loginUrl) // Use replace to avoid back button issues
    }
  }, [searchParams, authLoading, isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!code.trim()) { setError('Vui lòng nhập mã mời'); return }
    if (!user) { setError('Vui lòng đăng nhập trước'); return }
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      if (!token) {
        setError('Token không hợp lệ. Vui lòng đăng nhập lại')
        return
      }
      const res = await fetch(`${API_URL}/teams/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ invite_code: code.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Mã mời không hợp lệ')

      setAuthData(data.token, user, data.team, data.role)
      toast(`Đã tham gia đội "${data.team.name}" 🎉`, 'success')
      router.push('/app/attendance')
    } catch (e: any) {
      setError(e?.message || 'Lỗi tham gia đội')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#070B14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', color: G.t1 }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {authLoading ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '16px', color: G.t2 }}>Đang tải thông tin đăng nhập...</p>
          </div>
        ) : (
          <>
            <button onClick={() => router.back()} style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, color: G.t1, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '16px', marginBottom: '28px' }}>‹ Quay lại</button>

            <h1 style={{ fontSize: '26px', fontWeight: 300, fontFamily: 'serif', margin: '0 0 8px' }}>Tham gia đội</h1>
            <p style={{ color: G.t2, fontSize: '14px', margin: '0 0 32px' }}>Nhập mã mời 7 ký tự từ chủ đội của bạn.</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '12px', color: G.t3, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Mã mời</label>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}
                  placeholder="VD: ABC1234"
                  maxLength={7}
                  style={{
                    width: '100%', padding: '18px 16px', borderRadius: '12px', boxSizing: 'border-box',
                    background: 'rgba(255,255,255,0.05)', border: `1px solid ${G.glassBorder}`,
                    color: G.accent, fontSize: '28px', fontWeight: 700, letterSpacing: '0.25em',
                    outline: 'none', textAlign: 'center',
                  }}
                />
              </div>

              {error && <p style={{ color: '#FF6B6B', fontSize: '13px', margin: 0 }}>{error}</p>}

              <button type="submit" disabled={loading} style={{
                padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer',
                background: 'linear-gradient(135deg, #00D68F, #00A36C)',
                color: '#070B14', fontWeight: 700, fontSize: '15px',
                boxShadow: '0 4px 24px rgba(0,214,143,0.3)',
                opacity: loading ? 0.6 : 1, marginTop: '8px',
              }}>
                {loading ? 'Đang xử lý...' : '→ Tham gia'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function JoinTeamPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100dvh', background: '#070B14', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.2)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    }>
      <JoinTeamFormContent />
    </Suspense>
  )
}
