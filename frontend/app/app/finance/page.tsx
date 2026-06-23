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
      <div className="px-4 py-8 md:px-8 md:py-12 space-y-8">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-5xl md:text-6xl font-serif font-light" style={{ color: '#0F0E0C' }}>Tài Chính</h1>
            <p className="text-base font-light mt-2" style={{ color: '#6B6660' }}>Quản lý chi phí & duyệt duyệt</p>
          </div>
          <Button variant="primary" size="md">
            + Báo cáo chi phí
          </Button>
        </div>

        {/* Stats Section */}
        <section className="py-8">
          <StatsBar
            totalBalance={balance?.totalBalance || 0}
            monthlySpent={balance?.monthlySpent || 0}
            pendingCount={balance?.pendingCount || 0}
            isLoading={balanceLoading}
          />
        </section>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Recent Transactions (60%) */}
          <div className="lg:col-span-2">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-3xl font-serif font-light" style={{ color: '#0F0E0C' }}>Giao dịch gần đây</h2>
              <a
                href="#"
                className="font-medium transition-colors duration-300" style={{ color: '#7FA89F' }}
              >
                Xem tất cả →
              </a>
            </div>
            <TransactionList
              transactions={transactions}
              isLoading={transactionsLoading}
              emptyMessage="Không có giao dịch"
            />
          </div>

          {/* Right Column - Approval Queue (40%) */}
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

        {/* Bottom Section - Quick Actions */}
        <section className="mt-12 pt-12" style={{ borderTop: '1px solid #D9D4D0' }}>
          <h2 className="text-2xl font-serif font-light mb-6" style={{ color: '#0F0E0C' }}>Hành động nhanh</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-lg border border-light-gray rounded-card bg-white hover:bg-bone transition-colors text-center">
              <span className="text-lg mb-md block">📊</span>
              <p className="text-body font-medium text-black">Tải báo cáo</p>
            </button>
            <button className="p-lg border border-light-gray rounded-card bg-white hover:bg-bone transition-colors text-center">
              <span className="text-lg mb-md block">📜</span>
              <p className="text-body font-medium text-black">Xem lịch sử</p>
            </button>
            <button className="p-lg border border-light-gray rounded-card bg-white hover:bg-bone transition-colors text-center">
              <span className="text-lg mb-md block">⚙️</span>
              <p className="text-body font-medium text-black">Cài đặt</p>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
