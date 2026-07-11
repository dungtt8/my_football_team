'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useCampaign, Campaign, CampaignReport } from '@/hooks/useCampaign'
import { useToast } from '@/hooks/useToast'
import { CampaignForm } from '@/components/Campaign/CampaignForm'

type CampaignFormData = { name: string; amount_per_member: number; deadline?: string; description?: string }

export default function CampaignsPage() {
    const router = useRouter()
    const { user, role, isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const { listCampaigns, createCampaign, getReport } = useCampaign()
    const isManager = role === 'manager' || role === 'co_manager' || role === 'owner'

    const [campaigns, setCampaigns] = useState<Campaign[]>([])
    const [reports, setReports] = useState<Record<string, CampaignReport>>({})
    const [showForm, setShowForm] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    const loadCampaigns = useCallback(async () => {
        try {
            const res = await listCampaigns({})
            const list: Campaign[] = (res as any)?.data || res || []
            setCampaigns(list)

            const active = list.filter(c => c.status === 'active')
            const entries = await Promise.all(
                active.map(async c => {
                    try { return [c.id, await getReport(c.id)] as const }
                    catch { return null }
                })
            )
            const map: Record<string, CampaignReport> = {}
            entries.forEach(e => { if (e) map[e[0]] = e[1] })
            setReports(map)
        } catch { toast('Không thể tải khoản thu', 'error') }
    }, [listCampaigns, getReport, toast])

    useEffect(() => {
        if (!authLoading) loadCampaigns()
    }, [authLoading, loadCampaigns])

    const handleCreate = async (data: CampaignFormData) => {
        setIsCreating(true)
        try {
            await createCampaign(data)
            toast('Đã tạo khoản thu mới', 'success')
            setShowForm(false)
            await loadCampaigns()
        } catch (e: any) { toast(e?.message || 'Lỗi tạo khoản thu', 'error') }
        finally { setIsCreating(false) }
    }

    const fmtMoney = (n: number) => (n || 0).toLocaleString('vi-VN') + 'đ'
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })

    const myAssignment = (c: Campaign) => c.assignments?.find(a => a.user_id === user?.id)
    const needsToPay = (c: Campaign) => {
        const mine = myAssignment(c)
        return c.status === 'active' && mine && mine.status !== 'approved' && mine.status !== 'exempt'
    }

    const activeCampaigns = campaigns.filter(c => c.status === 'active')
    const highlight = activeCampaigns.find(c => needsToPay(c))

    // Payment history: user's approved assignments across campaigns.
    const history = campaigns
        .map(c => ({ campaign: c, a: c.assignments?.find(x => x.user_id === user?.id && x.status === 'approved') }))
        .filter(h => h.a)

    const goDetail = (id: string) => router.push(`/app/campaigns/${id}`)

    // ---- Reusable pieces ----

    const highlightEl = highlight && (
        <div className="card pad" style={{ border: '1.5px solid var(--danger)', background: 'linear-gradient(180deg,var(--danger-050),#fff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="chip" style={{ background: 'var(--danger)', color: '#fff' }}>CẦN ĐÓNG</span>
                <b className="amt-neg" style={{ fontSize: 20 }}>{fmtMoney(highlight.amount_per_member)}</b>
            </div>
            <div className="match-title" style={{ fontSize: 16 }}>{highlight.name}</div>
            <div className="meta">⏰&nbsp;Hạn đóng: {highlight.deadline ? fmtDate(highlight.deadline) : 'Không giới hạn'}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 15 }}>
                <button className="btn btn-primary" style={{ flex: 1, padding: 13 }} onClick={() => goDetail(highlight.id)}>Chuyển khoản QR</button>
                <button className="btn btn-ghost" style={{ padding: '13px 16px' }} onClick={() => goDetail(highlight.id)}>Tiền mặt</button>
            </div>
        </div>
    )

    const runningCampaignsEl = (
        <div>
            <div className="sec-title" style={{ marginBottom: 12 }}>Chiến dịch đang chạy</div>
            {activeCampaigns.length === 0 ? (
                <div className="card empty">Chưa có chiến dịch nào đang chạy</div>
            ) : (
                activeCampaigns.map(c => {
                    const r = reports[c.id]
                    const collected = r?.collected_amount ?? 0
                    const expected = r?.expected_amount ?? (c.amount_per_member * (r?.total_members ?? c.assignments?.length ?? 0))
                    const total = r?.total_members ?? c.assignments?.length ?? 0
                    const approved = r?.approved ?? c.assignments?.filter(a => a.status === 'approved').length ?? 0
                    const percent = expected > 0 ? Math.round((collected / expected) * 100) : 0
                    const unpaid = needsToPay(c)

                    return (
                        <div key={c.id} className="card pad" style={{ marginBottom: 12, cursor: 'pointer' }} onClick={() => goDetail(c.id)}>
                            <div className="prog-head">
                                <b style={{ fontFamily: 'var(--font-head)', fontSize: 15 }}>{c.name}</b>
                                {unpaid
                                    ? <span className="badge pend">Bạn chưa đóng</span>
                                    : <span className="badge ok">{percent}%</span>}
                            </div>
                            <div className="meta" style={{ margin: '8px 0 2px' }}>{approved} / {total} thành viên đã đóng</div>
                            <div className="bar"><i style={{ width: `${percent}%` }} /></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                                <small style={{ color: 'var(--ink-3)' }}>Đã thu <b style={{ color: 'var(--brand-600)' }}>{fmtMoney(collected)}</b></small>
                                {unpaid
                                    ? <button className="btn btn-primary btn-sm" onClick={e => { e.stopPropagation(); goDetail(c.id) }}>Đóng {fmtMoney(c.amount_per_member)}</button>
                                    : <small style={{ color: 'var(--ink-3)' }}>Mục tiêu <b>{fmtMoney(expected)}</b></small>}
                            </div>
                        </div>
                    )
                })
            )}
        </div>
    )

    const historyEl = history.length > 0 && (
        <div>
            <div className="sec-title" style={{ marginBottom: 12 }}>Lịch sử đóng của bạn</div>
            <div className="card">
                {history.map(({ campaign, a }) => (
                    <div key={campaign.id} className="row">
                        <div className="lead" style={{ background: 'var(--brand-050)' }}>✅</div>
                        <div className="rc">
                            <b>{campaign.name}</b>
                            <small>{a?.updated_at ? fmtDate(a.updated_at) : ''} · Chuyển khoản</small>
                        </div>
                        <span className="amt-pos">{fmtMoney(campaign.amount_per_member)}</span>
                    </div>
                ))}
            </div>
        </div>
    )

    const createButtonEl = isManager && (
        <button className="btn btn-ghost btn-block" onClick={() => setShowForm(true)}>+ Tạo khoản thu mới</button>
    )

    return (
        <div className="screen-body" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>

            {/* Mobile header — matches mockup M.collect */}
            <div className="md:hidden">
                <div className="eyebrow">Khoản thu</div>
                <div className="sec-title" style={{ fontSize: 22, marginTop: 4 }}>Đóng quỹ &amp; chiến dịch</div>
            </div>

            {/* Desktop header — matches mockup D.collect .page-h */}
            <div className="hidden md:block page-h">
                <h1>Khoản thu &amp; chiến dịch</h1>
                <p>Theo dõi các khoản đóng góp của bạn và tiến độ chung.</p>
            </div>

            {/* Mobile layout — matches mockup M.collect: highlight, running campaigns, history */}
            <div className="md:hidden">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {highlightEl}
                    {runningCampaignsEl}
                    {historyEl}
                    {createButtonEl}
                </div>
            </div>

            {/* Desktop layout — matches mockup D.collect: highlight+running (left) | history (right) */}
            <div className="hidden md:block">
                <div className="dgrid">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {highlightEl}
                        {runningCampaignsEl}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {historyEl}
                        {createButtonEl}
                    </div>
                </div>
            </div>

            {/* Create modal */}
            {showForm && (
                <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 'var(--content-left-offset, 0px)', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
                    onClick={() => setShowForm(false)}>
                    <div style={{ background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 600, margin: '0 auto', maxHeight: '90vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 600 }}>Tạo khoản thu mới</h2>
                        <CampaignForm onSubmit={handleCreate} isLoading={isCreating} onCancel={() => setShowForm(false)} />
                    </div>
                </div>
            )}
        </div>
    )
}
