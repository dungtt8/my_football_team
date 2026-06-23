'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useCampaign, Campaign } from '@/hooks/useCampaign'
import { useToast } from '@/hooks/useToast'
import { CampaignForm } from '@/components/Campaign/CampaignForm'

type CampaignFormData = { name: string; amount_per_member: number; deadline?: string; description?: string }

const G = {
    glass: 'rgba(255,255,255,0.07)', glassBorder: 'rgba(255,255,255,0.10)',
    accent: '#00D68F', accentDim: 'rgba(0,214,143,0.12)',
    t1: '#F0F4FF', t2: 'rgba(240,244,255,0.55)', t3: 'rgba(240,244,255,0.30)',
}

type TabType = 'all' | 'active' | 'ended'

export default function CampaignsPage() {
    const router = useRouter()
    const { user, role } = useAuth()
    const { toast } = useToast()
    const { listCampaigns, createCampaign, loading } = useCampaign()
    const isManager = role === 'manager' || role === 'co_manager'

    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [tab, setTab] = useState<TabType>('all')
    const [showForm, setShowForm] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    useEffect(() => {
        const load = async () => {
            try {
                const status = tab === 'active' ? 'active' : tab === 'ended' ? 'closed' : undefined
                const res = await listCampaigns({ status })
                setCampaigns((res as any)?.data || res || [])
            } catch { toast('Không thể tải chiến dịch', 'error') }
        }
        load()
    }, [tab])

    const handleCreate = async (data: CampaignFormData) => {
        setIsCreating(true)
        try {
            await createCampaign(data)
            toast('Đã tạo chiến dịch mới', 'success')
            setShowForm(false)
            const res = await listCampaigns({})
            setCampaigns((res as any)?.data || res || [])
        } catch (e: any) { toast(e?.message || 'Lỗi tạo chiến dịch', 'error') }
        finally { setIsCreating(false) }
    }

    const fmtMoney = (n: number) => n?.toLocaleString('vi-VN') + '₫'
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

    return (
        <div style={{ minHeight: '100vh', padding: '24px 20px', color: G.t1, width: '100%', boxSizing: 'border-box' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.accent, marginBottom: '6px' }}>Cộng đồng</p>
                    <h1 style={{ fontSize: '32px', fontWeight: 300, fontFamily: 'serif', color: G.t1, margin: 0 }}>Chiến Dịch</h1>
                </div>
                {isManager && (
                    <button onClick={() => setShowForm(true)} style={{
                        padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                        background: G.accent, color: '#070B14', border: 'none',
                        boxShadow: '0 0 20px rgba(0,214,143,0.3)',
                    }}>+ Tạo mới</button>
                )}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                {([['all', 'Tất cả'], ['active', 'Đang mở'], ['ended', 'Đã kết']] as [TabType, string][]).map(([t, l]) => (
                    <button key={t} onClick={() => setTab(t)} style={{
                        padding: '8px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none',
                        background: tab === t ? G.accent : G.glass,
                        color: tab === t ? '#070B14' : G.t2,
                        boxShadow: tab === t ? '0 0 14px rgba(0,214,143,0.3)' : 'none',
                        backdropFilter: 'blur(8px)',
                    }}>{l}</button>
                ))}
            </div>

            {/* Campaign list */}
            {campaigns.length === 0 ? (
                <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '16px', padding: '36px', textAlign: 'center' }}>
                    <p style={{ color: G.t3, fontSize: '14px', margin: 0 }}>Chưa có chiến dịch nào</p>
                    {isManager && <button onClick={() => setShowForm(true)} style={{ marginTop: '14px', padding: '10px 20px', borderRadius: '10px', background: G.accentDim, color: G.accent, border: `1px solid rgba(0,214,143,0.25)`, fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>+ Tạo chiến dịch đầu tiên</button>}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {campaigns.map((c: Campaign) => (
                        <button key={c.id} onClick={() => router.push(`/app/campaigns/${c.id}`)} style={{
                            display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px',
                            padding: '18px', background: G.glass, border: `1px solid ${G.glassBorder}`,
                            borderRadius: '18px', cursor: 'pointer', textAlign: 'left', width: '100%',
                            backdropFilter: 'blur(12px)', transition: 'all 0.15s ease',
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                    <span style={{ fontSize: '16px', fontWeight: 700, color: G.t1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
                                    <span style={{
                                        flexShrink: 0, fontSize: '10px', fontWeight: 600, padding: '3px 8px', borderRadius: '10px',
                                        background: c.status === 'active' ? G.accentDim : 'rgba(255,255,255,0.07)',
                                        color: c.status === 'active' ? G.accent : G.t3,
                                        border: `1px solid ${c.status === 'active' ? 'rgba(0,214,143,0.25)' : G.glassBorder}`,
                                    }}>{c.status === 'active' ? 'Đang mở' : 'Kết thúc'}</span>
                                </div>
                                {c.description && <p style={{ margin: '0 0 8px', fontSize: '12px', color: G.t3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</p>}
                                <p style={{ margin: 0, fontSize: '11px', color: G.t3 }}>Hạn: {c.deadline ? fmtDate(c.deadline) : 'Không giới hạn'}</p>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                <p style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: G.accent }}>{fmtMoney(c.amount_per_member)}</p>
                                <p style={{ margin: '2px 0 0', fontSize: '11px', color: G.t3 }}>/người</p>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {/* Create modal */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
                    onClick={() => setShowForm(false)}>
                    <div style={{ background: '#0E1628', border: `1px solid ${G.glassBorder}`, borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '600px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 600, color: G.t1 }}>Tạo chiến dịch mới</h2>
                        <CampaignForm onSubmit={handleCreate} isLoading={isCreating} onCancel={() => setShowForm(false)} />
                    </div>
                </div>
            )}
        </div>
    )
}
