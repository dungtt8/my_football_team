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
    <div className="min-h-screen bg-cream">
      <div className="px-lg py-4xl md:px-2xl md:py-5xl space-y-4xl">
        {/* Header Section */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-hero font-serif text-espresso mb-lg">Finance</h1>
            <p className="text-body text-taupe">Manage team expenses & approvals</p>
          </div>
          <Button variant="primary" size="md">
            + Submit Expense
          </Button>
        </div>

        {/* Stats Section */}
        <section className="py-4xl">
          <StatsBar
            totalBalance={balance?.totalBalance || 0}
            monthlySpent={balance?.monthlySpent || 0}
            pendingCount={balance?.pendingCount || 0}
            isLoading={balanceLoading}
          />
        </section>

        {/* Two-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4xl">
          {/* Left Column - Recent Transactions (60%) */}
          <div className="lg:col-span-2">
            <div className="mb-2xl flex items-center justify-between">
              <h2 className="text-heading-1 font-serif text-espresso">Recent Transactions</h2>
              <a
                href="#"
                className="text-body text-sage hover:text-sage-dark transition-colors duration-300 ease-smooth font-medium"
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
