'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useCampaign, Campaign, CampaignReport } from '@/hooks/useCampaign'
import { useApi } from '@/hooks/useApi'
import { useToast } from '@/hooks/useToast'
import { ArrowLeft, ArrowClockwise } from 'phosphor-react'

export default function CampaignDetailPage() {
    const router = useRouter()
    const params = useParams()
    const { user, role, isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const id = params.id as string

    const {
        getCampaign,
        uploadBillImage,
        memberConfirm,
        memberReject,
        coManagerApprove,
        coManagerReject,
        coManagerExempt,
        closeCampaign,
        remindCampaign,
        getMissingMembers,
        syncAssignments,
        getReport,
    } = useCampaign()
    const { request } = useApi()

    const isManager = role === 'co_manager' || role === 'manager' || role === 'owner'

    const [campaign, setCampaign] = useState<Campaign | null>(null)
    const [report, setReport] = useState<CampaignReport | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isActing, setIsActing] = useState(false)
    const [billFile, setBillFile] = useState<File | null>(null)
    const [billPreview, setBillPreview] = useState<string | null>(null)
    const [isUploading, setIsUploading] = useState(false)
    // "Add missing members" modal — lists active team members without an
    // assignment yet (e.g. joined after this campaign was created).
    const [showAddMembersModal, setShowAddMembersModal] = useState(false)
    const [missingMembers, setMissingMembers] = useState<{ user_id: string; full_name: string }[]>([])
    const [selectedMissingIds, setSelectedMissingIds] = useState<Set<string>>(new Set())
    const [isLoadingMissing, setIsLoadingMissing] = useState(false)
    const [isAddingMembers, setIsAddingMembers] = useState(false)
    // Team's payment QR code, shown next to the payment request so members
    // can scan-and-pay without leaving the confirmation card.
    const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null)
    // Per-member editable amount shown next to "Duyệt" — lets a manager charge
    // a different amount than the campaign default (teams don't always
    // collect the same amount from every member).
    const [approveAmounts, setApproveAmounts] = useState<Record<string, string>>({})

    useEffect(() => {
        if (authLoading) return
        loadData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, authLoading])

    const loadData = async () => {
        setIsLoading(true)
        try {
            const data = await getCampaign(id)
            setCampaign(data)
            if (isManager) {
                try { setReport(await getReport(id)) } catch { /* non-fatal */ }
            }
        } catch {
            toast('Không thể tải khoản thu', 'error')
            router.push('/app/campaigns')
        } finally { setIsLoading(false) }

        try {
            const settings = await request<any>('/team/settings', 'GET')
            setQrCodeUrl(settings?.fund?.qr_code_url || null)
        } catch { /* non-fatal — QR code is optional */ }
    }

    const myAssignment = campaign?.assignments?.find((a) => a.user_id === user?.id)

    // fund_month (YYYY-MM) is only set for auto-created team_fund campaigns;
    // fall back to the campaign's created_at month for any other campaign type.
    const campaignMonthLabel = (c: Campaign) => {
        if (c.fund_month) {
            const [year, month] = c.fund_month.split('-')
            return `${month}/${year}`
        }
        if (c.created_at) {
            const d = new Date(c.created_at)
            return `${d.getMonth() + 1}/${d.getFullYear()}`
        }
        return ''
    }

    const act = async (fn: () => Promise<unknown>, successMsg: string) => {
        setIsActing(true)
        try { await fn(); toast(successMsg, 'success'); loadData() }
        catch (e: any) { toast(e?.message || 'Lỗi', 'error') }
        finally { setIsActing(false) }
    }

    const getApproveAmount = (userId: string) =>
        approveAmounts[userId] ?? String(campaign?.amount_per_member ?? '')

    const handleOpenAddMembersModal = async () => {
        setShowAddMembersModal(true)
        setIsLoadingMissing(true)
        try {
            const members = await getMissingMembers(id)
            setMissingMembers(members)
            setSelectedMissingIds(new Set(members.map(m => m.user_id)))
        } catch (e: any) {
            toast(e?.message || 'Không thể tải danh sách thành viên', 'error')
            setShowAddMembersModal(false)
        } finally {
            setIsLoadingMissing(false)
        }
    }

    const toggleMissingMember = (userId: string) => {
        setSelectedMissingIds(prev => {
            const next = new Set(prev)
            if (next.has(userId)) next.delete(userId)
            else next.add(userId)
            return next
        })
    }

    const handleConfirmAddMembers = async () => {
        if (selectedMissingIds.size === 0) {
            toast('Chọn ít nhất 1 thành viên', 'error')
            return
        }
        setIsAddingMembers(true)
        try {
            const res = await syncAssignments(id, Array.from(selectedMissingIds))
            setShowAddMembersModal(false)
            await loadData()
            toast(`Đã thêm ${res.added} thành viên vào danh sách phân công`, 'success')
        } catch (e: any) {
            toast(e?.message || 'Lỗi thêm thành viên', 'error')
        } finally {
            setIsAddingMembers(false)
        }
    }

    const handleRemindCampaign = async () => {
        setIsActing(true)
        try {
            const res = await remindCampaign(id)
            toast(`Đã nhắc ${res?.successful ?? 0}/${res?.total ?? 0} thành viên chưa đóng quỹ`, 'success')
        } catch (e: any) {
            toast(e?.message || 'Lỗi', 'error')
        } finally {
            setIsActing(false)
        }
    }

    const handleApprove = (userId: string) => {
        const raw = getApproveAmount(userId)
        const amount = parseFloat(raw)
        if (isNaN(amount) || amount <= 0) {
            toast('Số tiền phải lớn hơn 0', 'error')
            return
        }
        act(() => coManagerApprove(id, userId, amount), 'Đã duyệt')
    }

    const assignmentLabel = (s: string) => ({
        pending_confirmation: 'Chờ xác nhận',
        pending_approval: 'Chờ duyệt',
        rejected: 'Từ chối',
        approved: 'Đã duyệt',
        exempt: 'Miễn',
    }[s] || s)

    const assignmentBadgeClass = (s: string) => ({
        approved: 'badge ok',
        rejected: 'badge',
        exempt: 'badge closed',
        pending_confirmation: 'badge pend',
        pending_approval: 'badge pend',
    }[s] || 'badge pend')

    const initials = (name?: string) =>
        (name || '?').trim().split(/\s+/).slice(-2).map(w => w[0]).join('').toUpperCase().slice(0, 2)

    const handleSelectBillFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        // Revoke any previously created object URL before creating a new one,
        // so switching the selected file doesn't leak the old blob URL.
        setBillPreview(prev => {
            if (prev) URL.revokeObjectURL(prev)
            return URL.createObjectURL(file)
        })
        setBillFile(file)
    }

    // Revoke the object URL on unmount (or whenever it changes) so it isn't
    // leaked if the user navigates away without submitting/clearing the form.
    useEffect(() => {
        return () => {
            if (billPreview) URL.revokeObjectURL(billPreview)
        }
    }, [billPreview])

    const handleConfirmWithBill = async () => {
        if (!billFile) { toast('Vui lòng chọn ảnh hoá đơn/chuyển khoản', 'error'); return }
        setIsActing(true)
        setIsUploading(true)
        try {
            const url = await uploadBillImage(billFile)
            setIsUploading(false)
            await memberConfirm(id, user!.id, url)
            toast('Đã xác nhận đóng quỹ', 'success')
            setBillFile(null)
            setBillPreview(null)
            loadData()
        } catch (e: any) {
            toast(e?.message || 'Lỗi', 'error')
        } finally {
            setIsActing(false)
            setIsUploading(false)
        }
    }

    const fmtDate = (d: string) =>
        new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
    const fmtMoney = (n?: number | string) => {
        const num = Number(n) || 0;
        return num.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' });
    };

    if (isLoading) return (
        <div className="screen-body" style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
            <div className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ height: 20, width: '40%', background: 'var(--surface-2)', borderRadius: 8 }} />
                <div style={{ height: 14, width: '70%', background: 'var(--surface-2)', borderRadius: 8 }} />
                <div style={{ height: 14, width: '100%', background: 'var(--surface-2)', borderRadius: 8 }} />
            </div>
        </div>
    )

    if (!campaign) return null

    const expected = report?.expected_total ?? (campaign.amount_per_member * (campaign.assignments?.length ?? 0))
    const collected = report?.approved_total ?? 0
    const percent = expected > 0 ? Math.round((collected / expected) * 100) : 0
    const breakdown = report?.status_breakdown

    return (
        <div className="screen-body" style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>

            <button onClick={() => router.back()} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', gap: 8 }}>
                <ArrowLeft size={16} weight="bold" />Quay lại
            </button>

            {/* Hero */}
            <div className="card pad">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div className="crest">💰</div>
                        <div>
                            <div className="eyebrow">Khoản thu</div>
                            <h1 style={{ fontSize: 21, marginTop: 2 }}>{campaign.name}</h1>
                        </div>
                    </div>
                    <span className={campaign.status === 'active' ? 'chip live' : 'chip soft'}>
                        {campaign.status === 'active' && <i className="live-dot" />}
                        {campaign.status === 'active' ? 'Đang hoạt động' : 'Đã đóng'}
                    </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 16 }}>
                    <span className="chip gold">{fmtMoney(campaign.amount_per_member)} / thành viên</span>
                    {campaign.deadline && <span className="chip blue">⏰ Hạn: {fmtDate(campaign.deadline)}</span>}
                </div>

                {campaign.description && (
                    <p style={{ marginTop: 14, color: 'var(--ink-3)', fontSize: 14, lineHeight: 1.6 }}>{campaign.description}</p>
                )}

                {isManager && report && (
                    <div style={{ marginTop: 20 }}>
                        <div className="prog-head">
                            <span className="big">{fmtMoney(collected)}</span>
                            <small style={{ color: 'var(--ink-3)' }}>Mục tiêu {fmtMoney(expected)}</small>
                        </div>
                        <div className="bar"><i style={{ width: `${percent}%` }} /></div>
                    </div>
                )}
            </div>

            {/* Stats */}
            {isManager && breakdown && (
                <div className="tiles">
                    {[
                        { label: 'Đã duyệt', value: breakdown.approved, bg: 'var(--brand-050)', color: 'var(--brand-700)' },
                        { label: 'Chờ duyệt', value: breakdown.pending_approval, bg: 'var(--accent-050)', color: 'var(--accent)' },
                        { label: 'Chờ xác nhận', value: breakdown.pending_confirmation, bg: 'var(--surface-2)', color: 'var(--ink-3)' },
                        { label: 'Từ chối', value: breakdown.rejected, bg: 'var(--danger-050)', color: 'var(--danger)' },
                        { label: 'Miễn', value: breakdown.exempt, bg: 'var(--blue-050)', color: 'var(--blue)' },
                        { label: 'Tỷ lệ duyệt', value: report?.approval_rate, bg: 'var(--surface-2)', color: 'var(--ink)' },
                    ].map((s) => (
                        <div key={s.label} className="tile">
                            <div className="n" style={{ color: s.color }}>{s.value}</div>
                            <div className="l">{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Own payment confirmation — shown to EVERY member with an assignment,
                including co_manager/owner, since managers are also auto-assigned
                to team_fund campaigns and must confirm their own payment just
                like anyone else. This is independent of the manager-only admin
                panel below (a manager sees both). */}
            {myAssignment?.status === 'pending_confirmation' && (
                <div className="checkin">
                    <span className="chip warn">CẦN ĐÓNG</span>
                    <p className="match-title" style={{ fontSize: 15 }}>
                        Yêu cầu đóng quỹ tháng {campaignMonthLabel(campaign)}
                    </p>
                    {qrCodeUrl && (
                        <div style={{ textAlign: 'center', margin: '12px 0' }}>
                            <img
                                src={qrCodeUrl}
                                alt="Mã QR chuyển khoản"
                                style={{
                                    maxWidth: 200, maxHeight: 200, border: '1px solid var(--line)',
                                    borderRadius: 12, padding: 8, background: 'var(--surface)', display: 'inline-block',
                                }}
                            />
                        </div>
                    )}
                    <p className="meta" style={{ marginBottom: 14 }}>{fmtMoney(campaign.amount_per_member)} cần đóng góp</p>

                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-3)', marginBottom: 8 }}>
                        Ảnh hoá đơn / minh chứng chuyển khoản
                    </label>
                    <label
                        htmlFor="bill-image-input"
                        style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            borderRadius: 'var(--r)', border: '1.5px dashed var(--brand-100)', cursor: 'pointer',
                            marginBottom: 14, overflow: 'hidden', minHeight: 120, background: 'var(--surface)',
                        }}
                    >
                        {billPreview ? (
                            <img src={billPreview} alt="Xem trước hoá đơn" style={{ width: '100%', maxHeight: 220, objectFit: 'contain' }} />
                        ) : (
                            <span style={{ fontSize: 13, color: 'var(--ink-3)', padding: '32px 0' }}>📎 Chạm để chọn ảnh từ máy</span>
                        )}
                    </label>
                    <input
                        id="bill-image-input"
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleSelectBillFile}
                        className="hidden"
                    />

                    <div style={{ display: 'flex', gap: 10 }}>
                        <button disabled={isActing || !billFile} onClick={handleConfirmWithBill}
                            className="btn btn-primary" style={{ flex: 1, padding: '12px 0', opacity: (isActing || !billFile) ? 0.6 : 1 }}>
                            {isUploading ? 'Đang tải ảnh lên...' : isActing ? 'Đang xác nhận...' : 'Xác nhận đã đóng quỹ'}
                        </button>
                        <button disabled={isActing} onClick={() => act(() => memberReject(id, user!.id), 'Đã từ chối')}
                            className="btn btn-ghost" style={{ padding: '12px 18px', color: 'var(--danger)' }}>
                            Từ chối
                        </button>
                    </div>
                </div>
            )}

            {myAssignment && myAssignment.status !== 'pending_confirmation' && (
                <div className="card pad" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Trạng thái của bạn</span>
                    <span className={assignmentBadgeClass(myAssignment.status)}>{assignmentLabel(myAssignment.status)}</span>
                </div>
            )}

            {/* Assignments list — manager only */}
            {isManager && campaign.assignments && campaign.assignments.length > 0 && (
                <div>
                    <div className="sec-title" style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                        Danh sách phân công
                        <button
                            onClick={handleOpenAddMembersModal}
                            title="Thêm thành viên chưa có trong danh sách"
                            style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                width: 26, height: 26, borderRadius: 8, border: 'none', background: 'transparent',
                                cursor: 'pointer', color: 'var(--ink-3)', padding: 0,
                            }}
                        >
                            <ArrowClockwise size={16} weight="bold" />
                        </button>
                    </div>
                    <div className="card">
                        {campaign.assignments.map((a) => (
                            <div key={a.user_id} className="row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                                    <div className="lead" style={{ background: 'var(--brand-050)', color: 'var(--brand-700)', fontSize: 14, fontWeight: 700 }}>
                                        {initials(a.full_name)}
                                    </div>
                                    <div className="rc">
                                        <b>{a.full_name || a.user_id}</b>
                                        <small>
                                            <span className={assignmentBadgeClass(a.status)}>{assignmentLabel(a.status)}</span>
                                            {a.status === 'approved' && a.approved_amount != null && (
                                                <span style={{ marginLeft: 8, color: 'var(--brand-600)', fontWeight: 700 }}>
                                                    {fmtMoney(a.approved_amount)}
                                                </span>
                                            )}
                                            {a.bill_image_url && (
                                                <a href={a.bill_image_url} target="_blank" rel="noopener noreferrer"
                                                    style={{ marginLeft: 8, color: 'var(--brand-600)', fontWeight: 600 }}>
                                                    Xem hoá đơn
                                                </a>
                                            )}
                                        </small>
                                    </div>
                                </div>
                                {a.status === 'pending_approval' && (
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                                        <input
                                            type="number"
                                            min="0"
                                            value={getApproveAmount(a.user_id)}
                                            onChange={(e) => setApproveAmounts(prev => ({ ...prev, [a.user_id]: e.target.value }))}
                                            title="Số tiền duyệt cho thành viên này"
                                            style={{
                                                width: 92, padding: '7px 8px', fontSize: 12.5, fontWeight: 600,
                                                border: '1.5px solid var(--line)', borderRadius: 10, background: 'var(--surface-2)', color: 'var(--ink)',
                                            }}
                                        />
                                        <button disabled={isActing} onClick={() => handleApprove(a.user_id)}
                                            className="btn btn-primary btn-sm">Duyệt</button>
                                        <button disabled={isActing} onClick={() => act(() => coManagerExempt(id, a.user_id), 'Đã miễn')}
                                            className="btn btn-ghost btn-sm">Miễn</button>
                                        <button disabled={isActing} onClick={() => act(() => coManagerReject(id, a.user_id), 'Đã từ chối')}
                                            className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }}>Từ chối</button>
                                    </div>
                                )}
                                {a.status === 'pending_confirmation' && (
                                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                        <button disabled={isActing} onClick={() => act(() => coManagerExempt(id, a.user_id), 'Đã miễn')}
                                            className="btn btn-ghost btn-sm">Miễn</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {isManager && campaign.status === 'active' && (breakdown?.pending_confirmation ?? 0) > 0 && (
                <button disabled={isActing} onClick={handleRemindCampaign}
                    className="btn btn-ghost btn-block">
                    🔔 Nhắc đóng quỹ ({breakdown?.pending_confirmation} chưa đóng)
                </button>
            )}

            {isManager && campaign.status === 'active' && (
                <button disabled={isActing} onClick={() => act(closeCampaign.bind(null, id), 'Đã đóng khoản thu')}
                    className="btn btn-ghost btn-block" style={{ color: 'var(--danger)', borderColor: 'var(--danger-050)' }}>
                    Đóng khoản thu
                </button>
            )}

            {/* Add missing members modal */}
            {showAddMembersModal && (
                <div
                    style={{
                        position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 20,
                    }}
                    onClick={() => !isAddingMembers && setShowAddMembersModal(false)}
                >
                    <div
                        className="card pad"
                        style={{ width: '100%', maxWidth: 420, maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                            <h2 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Thêm thành viên</h2>
                            <button onClick={() => setShowAddMembersModal(false)} className="btn btn-ghost btn-sm" style={{ padding: '4px 8px' }}>✕</button>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 14 }}>
                            Thành viên active trong đội nhưng chưa có trong danh sách phân công của khoản thu này.
                        </p>

                        {isLoadingMissing ? (
                            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>Đang tải...</div>
                        ) : missingMembers.length === 0 ? (
                            <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
                                Không có thành viên nào thiếu — danh sách đã đầy đủ.
                            </div>
                        ) : (
                            <div style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                                {missingMembers.map((m) => (
                                    <label
                                        key={m.user_id}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                                            border: '1px solid var(--line)', borderRadius: 10, cursor: 'pointer',
                                            background: selectedMissingIds.has(m.user_id) ? 'var(--brand-050)' : 'transparent',
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectedMissingIds.has(m.user_id)}
                                            onChange={() => toggleMissingMember(m.user_id)}
                                        />
                                        <span style={{ fontSize: 14, fontWeight: 600 }}>{m.full_name}</span>
                                    </label>
                                ))}
                            </div>
                        )}

                        {missingMembers.length > 0 && (
                            <button
                                disabled={isAddingMembers || selectedMissingIds.size === 0}
                                onClick={handleConfirmAddMembers}
                                className="btn btn-primary btn-block"
                                style={{ opacity: (isAddingMembers || selectedMissingIds.size === 0) ? 0.6 : 1 }}
                            >
                                {isAddingMembers ? 'Đang thêm...' : `Thêm ${selectedMissingIds.size} thành viên đã chọn`}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
