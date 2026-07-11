'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

const G = {
  glass: '#FFFFFF', glassBorder: '#E7ECF3',
  accent: '#12B76A', t1: '#0B1220', t2: 'rgba(11,18,32,0.55)', t3: 'rgba(11,18,32,0.30)',
}

export default function OnboardingPage() {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100dvh', background: '#FFFFFF', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 24px', color: G.t1, position: 'relative', overflow: 'hidden' }}>
      {/* Background blobs */}
      <div style={{ position: 'absolute', top: '-100px', right: '-80px', width: '350px', height: '350px', background: 'radial-gradient(circle, rgba(18,183,106,0.10) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '80px', left: '-80px', width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(46,124,246,0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, #12B76A, #039855)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px', margin: '0 auto 20px', boxShadow: '0 0 40px rgba(18,183,106,0.3)' }}>⚽</div>
          <h1 style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'var(--font-head)', color: G.t1, margin: '0 0 8px' }}>Chào mừng!</h1>
          <p style={{ fontSize: '15px', color: G.t2, margin: 0 }}>Bạn chưa có đội bóng nào.<br />Hãy tạo mới hoặc tham gia đội có sẵn.</p>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <button onClick={() => router.push('/onboarding/create')} style={{
            padding: '20px 24px', borderRadius: '18px', border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #12B76A, #039855)',
            color: '#FFFFFF', textAlign: 'left', boxShadow: '0 0 30px rgba(18,183,106,0.3)',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 700 }}>⚽ Tạo đội mới</p>
            <p style={{ margin: 0, fontSize: '13px', opacity: 0.75 }}>Bạn sẽ là chủ đội và quản lý mọi thứ</p>
          </button>

          <button onClick={() => router.push('/onboarding/join')} style={{
            padding: '20px 24px', borderRadius: '18px', cursor: 'pointer',
            background: G.glass, border: `1px solid ${G.glassBorder}`,
            color: G.t1, textAlign: 'left', backdropFilter: 'blur(12px)',
          }}>
            <p style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 700 }}>🔗 Tham gia đội</p>
            <p style={{ margin: 0, fontSize: '13px', color: G.t2 }}>Nhập mã mời từ chủ đội của bạn</p>
          </button>
        </div>
      </div>
    </div>
  )
}
