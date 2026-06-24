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
    glass: 'rgba(255,255,255,0.07)', glassBorder: 'rgba(255,255,255,0.10)',
    glassStrong: 'rgba(255,255,255,0.11)',
    accent: '#00D68F', accentDim: 'rgba(0,214,143,0.12)', blue: '#4A7CFF',
    red: '#FF6B6B', redDim: 'rgba(255,107,107,0.12)',
    t1: '#F0F4FF', t2: 'rgba(240,244,255,0.55)', t3: 'rgba(240,244,255,0.30)',
}

const statusLabel = (s: string) => ({ pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Từ chối' }[s] || s)
const statusColor = (s: string) => s === 'approved' ? G.accent : s === 'rejected' ? G.red : '#F5A623'
const statusBg = (s: string) => s === 'approved' ? G.accentDim : s === 'rejected' ? G.redDim : 'rgba(245,166,35,0.12)'

export default function FinancePage() {
    const router = useRouter()
    const { user, role, isLoading: authLoading } = useAuth()
    const { toast } = useToast()
    const { listTransactions, getFinanceBalance, getPendingApprovals, approveTransaction, rejectTransaction, submitTransaction, loading } = useFinance()
    const isManager = role === 'manager' || role === 'co_manager' || role === 'owner'

    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [approvals, setApprovals] = useState<Approval[]>([])
    const [balance, setBalance] = useState<FinanceBalance | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [showForm, setShowForm] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [rejectModal, setRejectModal] = useState<{ id: string } | null>(null)
    const [rejectReason, setRejectReason] = useState('')

    useEffect(() => {
        // Only load data after auth has finished loading
        if (authLoading) return

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
    }, [isManager, authLoading, getFinanceBalance, listTransactions, getPendingApprovals])

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
        try {
            await approveTransaction(id)
            toast('Đã duyệt', 'success')
            const [app, bal] = await Promise.all([getPendingApprovals(), getFinanceBalance()])
            setApprovals(app); setBalance(bal)
        } catch (e: any) { toast(e?.message || 'Lỗi', 'error') }
    }

    const handleRejectConfirm = async () => {
        if (!rejectModal || !rejectReason.trim()) { toast('Nhập lý do từ chối', 'error'); return }
        try {
            await rejectTransaction(rejectModal.id, rejectReason.trim())
            toast('Đã từ chối', 'success')
            setRejectModal(null); setRejectReason('')
            setApprovals(await getPendingApprovals())
        } catch (e: any) { toast(e?.message || 'Lỗi', 'error') }
    }

    const fmtMoney = (n: number) => n?.toLocaleString('vi-VN') + '₫'
    const fmtDate = (d: string | undefined) => d ? new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : ''

    return (
        <div style={{ minHeight: '100vh', padding: '24px 20px', color: G.t1, width: '100%', boxSizing: 'border-box' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                    <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', color: G.accent, marginBottom: '6px' }}>Quản lý</p>
                    <h1 style={{ fontSize: '32px', fontWeight: 300, fontFamily: 'serif', color: G.t1, margin: 0 }}>Tài Chính</h1>
                </div>
                <button onClick={() => setShowForm(true)} style={{
                    padding: '10px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.08)', color: G.t1, border: `1px solid rgba(255,255,255,0.12)`,
                }}>+ Báo cáo</button>
            </div>

            {/* Payment QR Display - Show when payment deadline is active */}
            <PaymentQRDisplay />

            {/* QR Code Settings - Show for owners */}
            {role === 'owner' && <QRCodeSettings isOwner={role === 'owner'} />}

            {/* Balance stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '28px' }}>
                {[
                    { label: 'Số dư', value: balance?.totalBalance != null ? fmtMoney(balance.totalBalance) : '—', accent: true },
                    { label: 'Tháng này', value: balance?.monthlySpent != null ? fmtMoney(balance.monthlySpent) : '—', accent: false },
                    { label: 'Chờ duyệt', value: balance?.pendingCount ?? '—', accent: false },
                ].map(s => (
                    <div key={s.label} style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '16px', padding: '16px 12px', backdropFilter: 'blur(12px)' }}>
                        <p style={{ fontSize: '11px', color: G.t3, margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</p>
                        <p style={{ fontSize: s.accent ? '18px' : '22px', fontWeight: 700, color: s.accent ? G.accent : G.t1, margin: 0 }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Approval queue (managers) */}
            {isManager && approvals.length > 0 && (
                <div style={{ marginBottom: '28px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: G.t2, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '14px' }}>
                        Chờ duyệt ({approvals.length})
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {approvals.map((a: any) => (
                            <div key={a.id} style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '16px', padding: '16px', backdropFilter: 'blur(12px)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                    <div>
                                        <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: G.t1 }}>{a.description || 'Báo cáo chi tiêu'}</p>
                                        <p style={{ margin: '3px 0 0', fontSize: '12px', color: G.t3 }}>{(a as any).user_name || (a as any).submitted_by || a.submittedBy || 'Thành viên'} · {fmtDate((a as any).transaction_date || a.createdAt)}</p>
                                    </div>
                                    <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: G.accent }}>{fmtMoney(a.amount)}</p>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => handleApprove(a.id)} style={{ flex: 1, padding: '9px', borderRadius: '10px', background: G.accentDim, color: G.accent, fontWeight: 600, fontSize: '13px', cursor: 'pointer', border: `1px solid rgba(0,214,143,0.25)` } as React.CSSProperties}>Duyệt</button>
                                    <button onClick={() => { setRejectModal({ id: a.id }); setRejectReason('') }} style={{ flex: 1, padding: '9px', borderRadius: '10px', border: `1px solid rgba(255,107,107,0.25)`, background: G.redDim, color: G.red, fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>Từ chối</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Transactions list */}
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <p style={{ fontSize: '13px', fontWeight: 600, color: G.t2, textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Gần đây</p>
                    <button onClick={() => router.push('/app/finance?view=all')} style={{ fontSize: '12px', color: G.accent, background: 'none', border: 'none', cursor: 'pointer' }}>Xem tất cả →</button>
                </div>
                {isLoading ? (
                    <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                        <p style={{ color: G.t3, fontSize: '13px', margin: 0 }}>Đang tải...</p>
                    </div>
                ) : transactions.length === 0 ? (
                    <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '16px', padding: '24px', textAlign: 'center' }}>
                        <p style={{ color: G.t3, fontSize: '13px', margin: 0 }}>Chưa có giao dịch nào</p>
                    </div>
                ) : (
                    <div style={{ background: G.glass, border: `1px solid ${G.glassBorder}`, borderRadius: '16px', overflow: 'hidden', backdropFilter: 'blur(12px)' }}>
                        {transactions.map((tx, i) => (
                            <div key={tx.id} onClick={() => router.push(`/app/finance/${tx.id}`)} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '14px 16px', borderBottom: i < transactions.length - 1 ? `1px solid rgba(255,255,255,0.05)` : 'none',
                                cursor: 'pointer',
                            }}>
                                <div>
                                    <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: G.t1 }}>{tx.description || 'Chi tiêu'}</p>
                                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: G.t3 }}>{fmtDate((tx as any).transaction_date || tx.createdAt)}</p>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: G.t1 }}>{fmtMoney(tx.amount)}</p>
                                    <span style={{ fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px', background: statusBg(tx.status), color: statusColor(tx.status) }}>
                                        {statusLabel(tx.status)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Submit expense modal */}
            {showForm && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'flex-end' }}
                    onClick={() => setShowForm(false)}>
                    <div style={{ background: '#0E1628', border: `1px solid ${G.glassBorder}`, borderRadius: '24px 24px 0 0', padding: '24px', width: '100%', maxWidth: '600px', margin: '0 auto', maxHeight: '90vh', overflowY: 'auto' }}
                        onClick={e => e.stopPropagation()}>
                        <h2 style={{ margin: '0 0 20px', fontSize: '20px', fontWeight: 600, color: G.t1 }}>Báo cáo chi tiêu</h2>
                        <TransactionForm onSubmit={handleSubmit} isLoading={isSubmitting} onCancel={() => setShowForm(false)} />
                    </div>
                </div>
            )}

            {/* Reject modal */}
            {rejectModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(7,11,20,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
                    onClick={() => setRejectModal(null)}>
                    <div style={{ background: '#0E1628', border: `1px solid ${G.glassBorder}`, borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '400px' }}
                        onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600, color: G.t1 }}>Lý do từ chối</h3>
                        <textarea rows={3} value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                            placeholder="Nhập lý do..." style={{ width: '100%', padding: '12px', borderRadius: '12px', border: `1px solid ${G.glassBorder}`, background: 'rgba(255,255,255,0.05)', color: G.t1, fontSize: '14px', resize: 'none', boxSizing: 'border-box', outline: 'none' }} />
                        <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                            <button onClick={() => setRejectModal(null)} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: `1px solid ${G.glassBorder}`, background: 'transparent', color: G.t2, fontWeight: 500, cursor: 'pointer' }}>Huỷ</button>
                            <button onClick={handleRejectConfirm} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: 'none', background: G.red, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Từ chối</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
