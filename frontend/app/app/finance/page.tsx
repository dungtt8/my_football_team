'use client'

import React, { useEffect, useState } from 'react'
import { useFinance, Transaction, Approval, FinanceBalance } from '@/hooks/useFinance'
import { StatsBar } from '@/components/Finance/StatsBar'
import { TransactionList } from '@/components/Finance/TransactionList'
import { ApprovalQueue } from '@/components/Finance/ApprovalQueue'
import { Button } from '@/components/Common/Button'

export default function FinancePage() {
    const {
        listTransactions,
        getFinanceBalance,
        getPendingApprovals,
        approveTransaction,
        rejectTransaction,
        loading,
    } = useFinance()

    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [approvals, setApprovals] = useState<Approval[]>([])
    const [balance, setBalance] = useState<FinanceBalance | null>(null)
    const [transactionsLoading, setTransactionsLoading] = useState(false)
    const [approvalsLoading, setApprovalsLoading] = useState(false)
    const [balanceLoading, setBalanceLoading] = useState(false)

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch balance
                setBalanceLoading(true)
                const balanceData = await getFinanceBalance()
                setBalance(balanceData)
            } catch (error) {
                console.error('Error fetching balance:', error)
            } finally {
                setBalanceLoading(false)
            }

            try {
                // Fetch recent transactions
                setTransactionsLoading(true)
                const txData = await listTransactions({ limit: 10 })
                setTransactions(txData)
            } catch (error) {
                console.error('Error fetching transactions:', error)
            } finally {
                setTransactionsLoading(false)
            }

            try {
                // Fetch pending approvals
                setApprovalsLoading(true)
                const appData = await getPendingApprovals()
                setApprovals(appData)
            } catch (error) {
                console.error('Error fetching approvals:', error)
            } finally {
                setApprovalsLoading(false)
            }
        }

        fetchData()
    }, [])

    const handleApprove = async (id: string) => {
        try {
            await approveTransaction(id)
            // Refresh approvals and balance
            const updatedApprovals = await getPendingApprovals()
            setApprovals(updatedApprovals)
            const updatedBalance = await getFinanceBalance()
            setBalance(updatedBalance)
        } catch (error) {
            console.error('Error approving transaction:', error)
        }
    }

    const handleReject = async (id: string, reason?: string) => {
        try {
            await rejectTransaction(id, reason || '')
            // Refresh approvals
            const updatedApprovals = await getPendingApprovals()
            setApprovals(updatedApprovals)
        } catch (error) {
            console.error('Error rejecting transaction:', error)
        }
    }

    return (
        <div className="min-h-screen">
            <div className="px-6 pt-10 pb-16 md:px-12 md:pt-12 space-y-10">
                {/* Header Section */}
                <div className="flex items-center justify-between pb-4">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest mb-1.5" style={{ color: '#9F9A93' }}>Quản lý</p>
                        <h1 className="text-3xl md:text-4xl font-serif font-light leading-tight" style={{ color: '#0F0E0C' }}>Tài Chính</h1>
                    </div>
                    <Button variant="primary" size="sm">
                        + Báo cáo
                    </Button>
                </div>

                {/* Stats Section */}
                <StatsBar
                    totalBalance={balance?.totalBalance || 0}
                    monthlySpent={balance?.monthlySpent || 0}
                    pendingCount={balance?.pendingCount || 0}
                    isLoading={balanceLoading}
                />

                {/* Two-Column Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Left Column - Recent Transactions */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-lg font-semibold" style={{ color: '#0F0E0C' }}>Giao dịch gần đây</h2>
                            <a href="#" className="text-xs font-medium" style={{ color: '#7FA89F' }}>
                                Xem tất cả →
                            </a>
                        </div>
                        <TransactionList
                            transactions={transactions}
                            isLoading={transactionsLoading}
                            emptyMessage="Không có giao dịch"
                        />
                    </div>

                    {/* Right Column - Approval Queue */}
                    <div>
                        <ApprovalQueue
                            approvals={approvals}
                            isLoading={approvalsLoading}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            emptyMessage="Đã hoàn tất!"
                        />
                    </div>
                </div>

                {/* Quick Actions */}
                <section className="pt-8" style={{ borderTop: '1px solid rgba(15, 14, 12, 0.06)' }}>
                    <h2 className="text-base font-semibold mb-5" style={{ color: '#0F0E0C' }}>Hành động nhanh</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { icon: '📊', label: 'Tải báo cáo' },
                            { icon: '📜', label: 'Xem lịch sử' },
                            { icon: '⚙️', label: 'Cài đặt' },
                        ].map((item) => (
                            <button
                                key={item.label}
                                className="flex flex-col items-center gap-3 py-7 rounded-2xl transition-all active:scale-95"
                                style={{
                                    background: '#FFFFFF',
                                    boxShadow: '0 1px 4px rgba(15, 14, 12, 0.06)',
                                    border: '1px solid rgba(15, 14, 12, 0.04)',
                                }}
                            >
                                <span className="text-xl">{item.icon}</span>
                                <p className="text-xs font-medium" style={{ color: '#0F0E0C' }}>{item.label}</p>
                            </button>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    )
}
