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
    <div className="min-h-screen bg-white">
      <div className="p-lg md:p-2xl space-y-xl2">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-section-title font-bold text-black mb-md">Finance</h1>
            <p className="text-body text-gray">Manage team expenses & approvals</p>
          </div>
          <Button variant="primary" size="md">
            + Submit Expense
          </Button>
        </div>

        {/* Stats Section */}
        <section>
          <StatsBar
            totalBalance={balance?.totalBalance || 0}
            monthlySpent={balance?.monthlySpent || 0}
            pendingCount={balance?.pendingCount || 0}
            isLoading={balanceLoading}
          />
        </section>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-xl2">
          {/* Left Column - Recent Transactions (60%) */}
          <div className="lg:col-span-2">
            <div className="mb-lg flex items-center justify-between">
              <h2 className="text-heading-3 font-bold text-black">Recent Transactions</h2>
              <a
                href="#"
                className="text-small text-black hover:text-charcoal transition-colors font-medium"
              >
                View All →
              </a>
            </div>
            <TransactionList
              transactions={transactions}
              isLoading={transactionsLoading}
              emptyMessage="No transactions yet"
            />
          </div>

          {/* Right Column - Approval Queue (40%) */}
          <div>
            <ApprovalQueue
              approvals={approvals}
              isLoading={approvalsLoading}
              onApprove={handleApprove}
              onReject={handleReject}
              emptyMessage="All caught up!"
            />
          </div>
        </div>

        {/* Bottom Section - Quick Actions */}
        <section className="mt-xl2 pt-xl2 border-t border-light-gray">
          <h2 className="text-heading-3 font-bold text-black mb-lg">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
            <button className="p-lg border border-light-gray rounded-card bg-white hover:bg-bone transition-colors text-center">
              <span className="text-lg mb-md block">📊</span>
              <p className="text-body font-medium text-black">Download Report</p>
            </button>
            <button className="p-lg border border-light-gray rounded-card bg-white hover:bg-bone transition-colors text-center">
              <span className="text-lg mb-md block">📜</span>
              <p className="text-body font-medium text-black">View History</p>
            </button>
            <button className="p-lg border border-light-gray rounded-card bg-white hover:bg-bone transition-colors text-center">
              <span className="text-lg mb-md block">⚙️</span>
              <p className="text-body font-medium text-black">Settings</p>
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
