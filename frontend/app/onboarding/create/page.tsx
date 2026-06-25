'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/hooks/useToast'

const G = {
  glass: 'rgba(255,255,255,0.07)', glassBorder: 'rgba(255,255,255,0.10)',
  accent: '#00D68F', t1: '#F0F4FF', t2: 'rgba(240,244,255,0.55)', t3: 'rgba(240,244,255,0.30)',
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

export default function CreateTeamPage() {
  const router = useRouter()
  const { setAuthData, user, role } = useAuth()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!name.trim()) { setError('Vui lòng nhập tên đội'); return }
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(`${API_URL}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Lỗi tạo đội')

      // Update auth context with new team + owner role + all teams
      setAuthData(data.token, user!, data.team, 'owner', data.teams || [])
      toast(`Đã tạo đội "${data.team.name}" 🎉`, 'success')
      router.push('/app/finance')
    } catch (e: any) {
      setError(e?.message || 'Lỗi tạo đội')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 16px', borderRadius: '12px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)', border: `1px solid ${G.glassBorder}`,
    color: G.t1, fontSize: '15px', outline: 'none',
  }

  return (
    <div style={{ minHeight: '100dvh', background: '#070B14', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', color: G.t1 }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <button onClick={() => router.back()} style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, color: G.t1, borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '16px', marginBottom: '28px' }}>‹ Quay lại</button>

        <h1 style={{ fontSize: '26px', fontWeight: 300, fontFamily: 'serif', margin: '0 0 8px' }}>Tạo đội mới</h1>
        <p style={{ color: G.t2, fontSize: '14px', margin: '0 0 32px' }}>Bạn sẽ là chủ đội và nhận mã mời để chia sẻ.</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '12px', color: G.t3, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Tên đội *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="VD: AFC Phoenix" style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: '12px', color: G.t3, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '8px' }}>Mô tả (tuỳ chọn)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Giới thiệu về đội..." style={{ ...inputStyle, resize: 'none' }} />
          </div>

          {error && <p style={{ color: '#FF6B6B', fontSize: '13px', margin: 0 }}>{error}</p>}

          <button type="submit" disabled={loading} style={{
            padding: '16px', borderRadius: '14px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #00D68F, #00A36C)',
            color: '#070B14', fontWeight: 700, fontSize: '15px',
            boxShadow: '0 4px 24px rgba(0,214,143,0.3)',
            opacity: loading ? 0.6 : 1, marginTop: '8px',
          }}>
            {loading ? 'Đang tạo...' : '✓ Tạo đội'}
          </button>
        </form>
      </div>
    </div>
  )
}
