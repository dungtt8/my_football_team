'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useFinance, Transaction, Approval, FinanceBalance } from '@/hooks/useFinance'
import { useToast } from '@/hooks/useToast'
import { TransactionForm, TransactionFormData } from '@/components/Finance/TransactionForm'
import { PaymentQRDisplay } from '@/components/Finance/PaymentQRDisplay'
import { QRCodeSettings } from '@/components/Finance/QRCodeSettings'

const G = {
    glass: '#FFFFFF', glassBorder: '#E7ECF3',
    accent: '#12B76A', accentDim: 'rgba(18,183,106,0.12)',
    red: '#F04438', redDim: 'rgba(240,68,56,0.12)',
    t1: '#0B1220', t2: 'rgba(11,18,32,0.55)', t3: 'rgba(11,18,32,0.30)',
}

export default function FinancePage() {
    const router = useRouter()
    const { user, team, role, isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const { listTransactions, getFinanceBalance, getPendingApprovals, approveTransaction, rejectTransaction, submitTransaction } = useFinance()
    const isManager = role === 'manager' || role === 'co_manager' || role === 'owner'

    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [approvals, setApprovals] = useState<Approval[]>([])
    const [balance, setBalance] = useState<FinanceBalance | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [processingId, setProcessingId] = useState<string | null>(null)
    const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all')

    useEffect(() => {
        // Only load data after auth has finished loading and user is authenticated
        if (authLoading) return
        if (!user) return

        // Reset local state so stale data from a previous team isn't shown
        // while the new team's data is loading.
        setTransactions([])
        setApprovals([])
        setBalance(null)

        const load = async () => {
            setIsLoading(true)
            try {
                const [bal, txs] = await Promise.all([getFinanceBalance(), listTransactions({ limit: 10 })])
                setBalance(bal || null)
                setTransactions(Array.isArray(txs) ? txs : [])
                if (isManager) {
                    try {
                        const approvalList = await getPendingApprovals()
                        setApprovals(Array.isArray(approvalList) ? approvalList : [])
                    } catch (approvalErr) {
                        console.error('Failed to load approvals:', approvalErr)
                        setApprovals([])
                    }
                }
            } catch (err) {
                console.error('Failed to load finance data:', err)
                setTransactions([])
                setApprovals([])
            } finally {
                setIsLoading(false)
            }
        }
        load()
    }, [isManager, authLoading, user, team?.id])

    const handleSubmit = async (data: TransactionFormData) => {
        setIsSubmitting(true)
        try {
            await submitTransaction(data)
            toast('Đã gửi báo cáo chi tiêu', 'success')
            setShowForm(false)
            setTransactions(await listTransactions({ limit: 10 }))
        } catch (e: any) { toast(e?.message || 'Lỗi', 'error') }
        finally { setIsSubmitting(false) }
    }

    const handleApprove = async (id: string) => {
        if (processingId) return // guard against double-submit while another request is in flight
        setProcessingId(id)
        try {
            await approveTransaction(id)
            toast('Đã duyệt', 'success')
            const [app, bal] = await Promise.all([getPendingApprovals(), getFinanceBalance()])
            setApprovals(app); setBalance(bal)
        } catch (e: any) { toast(e?.message || 'Lỗi', 'error') }
        finally { setProcessingId(null) }
    }

    const handleRejectConfirm = async () => {
        if (!rejectModal || processingId) return
        if (!rejectReason.trim()) { toast('Nhập lý do từ chối', 'error'); return }
        setProcessingId(rejectModal.id)
        try {
            await rejectTransaction(rejectModal.id, rejectReason.trim())
            toast('Đã từ chối', 'success')
            setRejectModal(null); setRejectReason('')
            setApprovals(await getPendingApprovals())
        } catch (e: any) { toast(e?.message || 'Lỗi', 'error') }
        finally { setProcessingId(null) }
    }

    const fmtMoney = (n: number) => (n?.toLocaleString('vi-VN') ?? '0') + 'đ'
    const fmtDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''

    const filteredTransactions = transactions.filter(tx =>
        filter === 'all' ? true : tx.transaction_type === filter
    )

    // ---- Reusable pieces ----

    const heroEl = (
        <div className="hero" style={{ background: 'linear-gradient(135deg,#0C2A20,#0F3D2C 55%,#12B76A 140%)' }}>
            <div className="pitch-lines" />
            <div className="sub" style={{ position: 'relative', zIndex: 2 }}>Số dư quỹ hiện tại</div>
            <h2 style={{ fontSize: 32, position: 'relative', zIndex: 2, color: '#ffb923' }}>
                {balance?.totalBalance != null ? fmtMoney(balance.totalBalance) : '—'}
            </h2>
            <div className="hero-stats">
                <div className="hstat">
                    <div className="n" style={{ fontSize: 16 }}>{balance?.totalIncome != null ? '+' + fmtMoney(balance.totalIncome) : '—'}</div>
                    <div className="l">Thu tháng này</div>
                </div>
                <div className="hstat">
                    <div className="n" style={{ fontSize: 16 }}>{balance?.totalExpense != null ? '-' + fmtMoney(balance.totalExpense) : '—'}</div>
                    <div className="l">Chi tháng này</div>
                </div>
            </div>
        </div>
    )

    const statCardsEl = (
        <div className="dgrid-3">
            <div className="hero" style={{ background: 'linear-gradient(135deg,#0C2A20,#0F3D2C 55%,#12B76A 140%)', padding: 20 }}>
                <div className="sub" style={{ position: 'relative', zIndex: 2 }}>Số dư quỹ</div>
                <h2 style={{ fontSize: 28, position: 'relative', zIndex: 2, marginTop: 2, color: '#ffb923' }}>{balance?.totalBalance != null ? fmtMoney(balance.totalBalance) : '—'}</h2>
            </div>
            <div className="card pad">
                <div className="l" style={{ color: 'var(--ink-3)', fontWeight: 600 }}>Thu tháng này</div>
                <div className="n" style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 26, color: 'var(--brand-600)', marginTop: 6 }}>{balance?.totalIncome != null ? '+' + fmtMoney(balance.totalIncome) : '—'}</div>
            </div>
            <div className="card pad">
                <div className="l" style={{ color: 'var(--ink-3)', fontWeight: 600 }}>Chi tháng này</div>
                <div className="n" style={{ fontFamily: 'var(--font-head)', fontWeight: 800, fontSize: 26, color: 'var(--danger)', marginTop: 6 }}>{balance?.totalExpense != null ? '-' + fmtMoney(balance.totalExpense) : '—'}</div>
            </div>
        </div>
    )

    const pillsEl = (
        <div className="pills">
            <div className={`pill${filter === 'all' ? ' on' : ''}`} onClick={() => setFilter('all')}>Tất cả</div>
            <div className={`pill${filter === 'income' ? ' on' : ''}`} onClick={() => setFilter('income')}>Thu</div>
            <div className={`pill${filter === 'expense' ? ' on' : ''}`} onClick={() => setFilter('expense')}>Chi</div>
        </div>
    )

    const approvalQueueEl = isManager && approvals.length > 0 && (
        <div>
            <div className="sec-title" style={{ marginBottom: 12 }}>Chờ duyệt ({approvals.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {approvals.map((a: any) => (
                    <div key={a.id} className="card pad">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                            <div>
                                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: G.t1 }}>{a.description || 'Báo cáo chi tiêu'}</p>
                                <p style={{ margin: '3px 0 0', fontSize: 12, color: G.t3 }}>{a.submitted_by_name || 'Thành viên'} · {fmtDate(a.transaction_date || a.created_at)}</p>
                            </div>
                            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: G.accent }}>{fmtMoney(a.amount)}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button disabled={processingId === a.id} onClick={() => handleApprove(a.id)} style={{ flex: 1, padding: 9, borderRadius: 10, background: G.accentDim, color: G.accent, fontWeight: 600, fontSize: 13, cursor: processingId === a.id ? 'not-allowed' : 'pointer', border: `1px solid rgba(18,183,106,0.25)`, opacity: processingId === a.id ? 0.6 : 1 } as React.CSSProperties}>
                                {processingId === a.id ? 'Đang xử lý...' : 'Duyệt'}
                            </button>
                            <button disabled={processingId === a.id} onClick={() => { setRejectModal({ id: a.id }); setRejectReason('') }} style={{ flex: 1, padding: 9, borderRadius: 10, border: `1px solid rgba(240,68,56,0.25)`, background: G.redDim, color: G.red, fontWeight: 600, fontSize: 13, cursor: processingId === a.id ? 'not-allowed' : 'pointer', opacity: processingId === a.id ? 0.6 : 1 }}>Từ chối</button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )

    const transactionsListEl = isLoading ? (
        <div className="card pad" style={{ textAlign: 'center', color: G.t3, fontSize: 13 }}>Đang tải...</div>
    ) : filteredTransactions.length === 0 ? (
        <div className="card pad" style={{ textAlign: 'center', color: G.t3, fontSize: 13 }}>Chưa có giao dịch nào</div>
    ) : (
        <div className="card">
            {filteredTransactions.map(tx => {
                const isIncome = tx.transaction_type === 'income'
                return (
                    <div key={tx.id} className="row" onClick={() => router.push(`/app/finance/${tx.id}`)} style={{ cursor: 'pointer' }}>
                        <div className="lead" style={{ background: isIncome ? 'var(--brand-050)' : 'var(--danger-050)' }}>{isIncome ? '⬇️' : '⬆️'}</div>
                        <div className="rc">
                            <b>{tx.description || 'Chi tiêu'}</b>
                            <small>{fmtDate(tx.transaction_date || tx.created_at)}{tx.submitted_by_name ? ` · ${tx.submitted_by_name}` : ''}</small>
                        </div>
                        <span className={isIncome ? 'amt-pos' : 'amt-neg'}>{isIncome ? '+' : '-'}{fmtMoney(tx.amount)}</span>
                    </div>
                )
            })}
        </div>
    )

    const createButtonEl = (
        <button className="btn btn-ghost btn-block" onClick={() => setShowForm(true)}>+ Báo cáo khoản chi</button>
    )

    return (
        <div className="screen-body" style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>

            {/* Mobile header — matches mockup M.finance */}
            <div className="md:hidden">
                <div className="eyebrow">Tài chính đội</div>
                <div className="sec-title" style={{ fontSize: 22, marginTop: 4 }}>Minh bạch thu chi</div>
            </div>

            {/* Desktop header — matches mockup D.finance .page-h */}
            <div className="hidden md:block page-h">
                <h1>Tài chính đội</h1>
                <p>Thu chi minh bạch — mọi thành viên đều xem được.</p>
            </div>

            {/* Payment QR Display - Show when payment deadline is active */}
            <PaymentQRDisplay />

            {/* QR Code Settings - Show for owners */}
            {role === 'owner' && <QRCodeSettings isOwner={role === 'owner'} />}

            {/* Mobile layout — matches mockup M.finance: hero, pills, approvals, transactions */}
            <div className="md:hidden">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {heroEl}
                    {pillsEl}
                    {approvalQueueEl}
                    {transactionsListEl}
                    {createButtonEl}
                </div>
            </div>

            {/* Desktop layout — matches mockup D.finance: 3 stat cards, then full-width transactions */}
            <div className="hidden md:block">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {statCardsEl}
                    {pillsEl}
                    {approvalQueueEl}
                    {transactionsListEl}
                    {createButtonEl}
                </div>
            </div>

            {/* Submit expense modal */}
            {showForm && (
                <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 'var(--content-left-offset, 0px)', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
                    onClick={() => setShowForm(false)}>
                    <div style={{ background: '#F4F7FB', border: `1px solid ${G.glassBorder}`, borderTop: '1px solid #E7ECF3', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: '600px', margin: '0 auto', maxHeight: '92vh', display: 'flex', flexDirection: 'column', animation: 'slideUp 0.25s cubic-bezier(0.34,1.56,0.64,1)', boxShadow: '0 -8px 40px rgba(0,0,0,0.6)' }}
                        onClick={e => e.stopPropagation()}>
                        {/* Handle bar */}
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px', flexShrink: 0 }}>
                            <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: '#DDE3EC' }} />
                        </div>
                        {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px', flexShrink: 0 }}>
                            <div>
                                <p style={{ margin: 0, fontSize: '11px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#F5A623' }}>Chi tiêu</p>
                                <h2 style={{ margin: '2px 0 0', fontSize: '20px', fontWeight: 800, fontFamily: 'var(--font-head)', color: G.t1 }}>Báo cáo khoản chi</h2>
                            </div>
                            <button onClick={() => setShowForm(false)} style={{ width: '34px', height: '34px', borderRadius: '10px', border: `1px solid ${G.glassBorder}`, background: G.glass, color: G.t2, cursor: 'pointer', fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                        </div>
                        {/* Scrollable content */}
                        <div style={{ overflowY: 'auto', flex: 1, padding: '0 20px 32px' }}>
                            <TransactionForm onSubmit={handleSubmit} isLoading={isSubmitting} onCancel={() => setShowForm(false)} />
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
            `}</style>

            {/* Reject modal */}
            {rejectModal && (
                <div style={{ position: 'fixed', top: 0, right: 0, bottom: 0, left: 'var(--content-left-offset, 0px)', background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                    onClick={() => setRejectModal(null)}>
                    <div style={{ background: '#F4F7FB', border: `1px solid ${G.glassBorder}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px' }}
                        onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: G.t1 }}>Lý do từ chối</h3>
                        <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            placeholder="Nhập lý do..." style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${G.glassBorder}`, background: '#F8FAFC', color: G.t1, fontSize: '14px', resize: 'none', boxSizing: 'border-box', outline: 'none' }} />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                            <button disabled={!!processingId} onClick={() => setRejectModal(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${G.glassBorder}`, background: 'transparent', color: G.t2, fontWeight: 500, cursor: processingId ? 'not-allowed' : 'pointer' }}>Huỷ</button>
                            <button disabled={!rejectReason.trim() || !!processingId} onClick={handleRejectConfirm} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: G.red, color: '#fff', fontWeight: 600, cursor: (!rejectReason.trim() || processingId) ? 'not-allowed' : 'pointer', opacity: (!rejectReason.trim() || processingId) ? 0.6 : 1 }}>
                                {processingId ? 'Đang xử lý...' : 'Từ chối'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
