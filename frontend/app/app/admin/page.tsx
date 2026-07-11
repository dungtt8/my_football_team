'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useFinance, Approval } from '@/hooks/useFinance'
import { useTeam } from '@/hooks/useTeam'
import { useToast } from '@/hooks/useToast'

const GRADS = [
    'linear-gradient(135deg,#7A5AF8,#2E7CF6)',
    'linear-gradient(135deg,#12B76A,#027A48)',
    'linear-gradient(135deg,#F04438,#F5A623)',
    'linear-gradient(135deg,#2E7CF6,#12B76A)',
]

const initials = (name?: string) =>
    String(name || '?')
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(-2)
        .join('')
        .toUpperCase() || '?'

// Compact money for the stat tile: "12.4tr" for millions, else full đ.
const fmtCompact = (n?: number) => {
    const v = n || 0
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, '')}tr`
    return `${v.toLocaleString('vi-VN')}đ`
}

const fmtMoney = (n?: number) => `${(n || 0).toLocaleString('vi-VN')}đ`

const fmtDate = (d?: string) =>
    d ? new Date(d).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : ''

const MANAGER_ROLES = ['owner', 'co_manager', 'manager']

export default function AdminPage() {
    const router = useRouter()
    const { role, isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const { getPendingApprovals, approveTransaction, rejectTransaction, getFinanceBalance } = useFinance()
    const { listMembers } = useTeam()

    const [pending, setPending] = useState<Approval[]>([])
    const [memberCount, setMemberCount] = useState(0)
    const [balance, setBalance] = useState(0)
    const [busy, setBusy] = useState<string | null>(null)

    const allowed = !!role && MANAGER_ROLES.includes(role)

    useEffect(() => {
        if (authLoading || !allowed) return
        const load = async () => {
            try { setPending(await getPendingApprovals()) } catch { }
            try { setMemberCount((await listMembers()).length) } catch { }
            try { setBalance((await getFinanceBalance())?.totalBalance || 0) } catch { }
        }
        load()
    }, [authLoading, allowed])

    if (!authLoading && !allowed) {
        return (
            <div className="screen-body" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
                <div className="empty">
                    <div className="e-ic">🔒</div>
                    Không có quyền truy cập
                </div>
            </div>
        )
    }

    const handleApprove = async (id: string) => {
        setBusy(id)
        try {
            await approveTransaction(id)
            setPending((prev) => prev.filter((p) => p.id !== id))
            toast('✅ Đã duyệt khoản đóng quỹ', 'success')
        } catch (e: any) {
            toast(e?.message || 'Lỗi khi duyệt', 'error')
        } finally {
            setBusy(null)
        }
    }

    const handleReject = async (id: string) => {
        const reason = typeof window !== 'undefined' ? window.prompt('Lý do từ chối (tuỳ chọn):') : ''
        setBusy(id)
        try {
            await rejectTransaction(id, reason || '')
            setPending((prev) => prev.filter((p) => p.id !== id))
            toast('Đã từ chối khoản đóng quỹ', 'success')
        } catch (e: any) {
            toast(e?.message || 'Lỗi khi từ chối', 'error')
        } finally {
            setBusy(null)
        }
    }

    return (
        <div className="screen-body" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
            {/* Header */}
            <div>
                <div className="eyebrow">Ban quản lý</div>
                <div className="sec-title" style={{ fontSize: 22, marginTop: 4 }}>Hàng chờ duyệt</div>
            </div>

            {/* Stat tiles */}
            <div className="tiles">
                <div className="tile">
                    <div className="n" style={{ color: 'var(--accent)' }}>{pending.length}</div>
                    <div className="l">Chờ duyệt</div>
                </div>
                <div className="tile">
                    <div className="n">{memberCount}</div>
                    <div className="l">Thành viên</div>
                </div>
                <div className="tile">
                    <div className="n" style={{ color: 'var(--brand-600)' }}>{fmtCompact(balance)}</div>
                    <div className="l">Quỹ</div>
                </div>
            </div>

            {/* Pending approvals */}
            <div>
                <div className="sec-title" style={{ marginBottom: 12 }}>Chờ xác nhận đóng quỹ</div>
                <div className="card">
                    {pending.length === 0 ? (
                        <div className="empty">
                            <div className="e-ic">✅</div>
                            Không có khoản nào chờ duyệt
                        </div>
                    ) : (
                        pending.map((p, i) => (
                            <div className="row" key={p.id}>
                                <div
                                    className="avatar"
                                    style={{ width: 42, height: 42, borderRadius: 13, background: GRADS[i % GRADS.length] }}
                                >
                                    {initials(p.submitted_by_name)}
                                </div>
                                <div className="rc">
                                    <b>{p.submitted_by_name || 'Thành viên'}</b>
                                    <small>{p.description} · {fmtMoney(p.amount)} · {fmtDate(p.transaction_date || p.created_at)}</small>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button
                                        className="btn btn-primary btn-sm"
                                        disabled={busy === p.id}
                                        onClick={() => handleApprove(p.id)}
                                    >
                                        Duyệt
                                    </button>
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        style={{ color: 'var(--danger)' }}
                                        disabled={busy === p.id}
                                        onClick={() => handleReject(p.id)}
                                    >
                                        Từ chối
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Bottom action */}
            <button className="btn btn-ghost btn-block" style={{ padding: 14 }} onClick={() => router.push('/app/finance')}>
                + Tạo khoản thu / lịch mới
            </button>
        </div>
    )
}
