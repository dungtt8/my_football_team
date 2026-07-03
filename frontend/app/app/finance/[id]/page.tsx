'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useFinance, Transaction } from '@/hooks/useFinance'
import { Button } from '@/components/Common/Button'
import { Badge } from '@/components/Common/Badge'

export default function TransactionDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const { getTransactionDetail, approveTransaction, rejectTransaction } =
    useFinance()

  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    const fetchTransaction = async () => {
      try {
        setIsLoading(true)
        const data = await getTransactionDetail(id)
        setTransaction(data)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to load transaction'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    if (id) {
      fetchTransaction()
    }
  }, [id, getTransactionDetail])

  const handleApprove = async () => {
    if (!transaction) return
    try {
      await approveTransaction(transaction.id)
      const updated = await getTransactionDetail(id)
      setTransaction(updated)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to approve'
      setError(message)
    }
  }

  const handleRejectSubmit = async () => {
    if (!transaction) return
    try {
      await rejectTransaction(transaction.id, rejectReason)
      const updated = await getTransactionDetail(id)
      setTransaction(updated)
      setShowRejectForm(false)
      setRejectReason('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reject'
      setError(message)
    }
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusVariant = (
    status: string
  ): 'pending' | 'approved' | 'rejected' | 'info' => {
    switch (status) {
      case 'approved':
        return 'approved'
      case 'rejected':
        return 'rejected'
      case 'pending':
        return 'pending'
      default:
        return 'info'
    }
  }

  if (isLoading) {
    return (
      <div className="p-lg md:p-2xl">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-lg"
        >
          ← Back
        </Button>
        <div className="space-y-lg">
          <div className="h-8 bg-bone rounded animate-pulse w-1/3"></div>
          <div className="h-32 bg-bone rounded animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="p-lg md:p-2xl">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-lg"
        >
          ← Back
        </Button>
        <div className="p-lg border border-light-gray rounded-card bg-pale-red text-center">
          <p className="text-body text-black">
            {error || 'Transaction not found'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-lg md:p-2xl">
      <Button
        variant="ghost"
        onClick={() => router.back()}
        className="mb-lg"
      >
        ← Back
      </Button>

      <div className="max-w-2xl mx-auto space-y-xl">
        {/* Transaction Header */}
        <div className="p-xl border border-light-gray rounded-card bg-white">
          <div className="flex items-start justify-between mb-lg">
            <div>
              <h1 className="text-section-title font-bold text-black mb-md">
                {transaction.description}
              </h1>
              <p className="text-body text-gray">
                Submitted by: {transaction.submitted_by_name || 'Unknown'}
              </p>
            </div>
            <Badge variant={getStatusVariant(transaction.status)}>
              {transaction.status.charAt(0).toUpperCase() +
                transaction.status.slice(1)}
            </Badge>
          </div>

          <div className="bg-bone p-lg rounded-card mb-lg">
            <p className="text-caption text-gray mb-md">Amount</p>
            <p className="text-hero font-bold text-black">
              {formatCurrency(transaction.amount)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-lg mb-lg">
            <div>
              <p className="text-caption text-gray mb-md">Loại giao dịch</p>
              <p className="text-body font-medium text-black">
                {transaction.transaction_type === 'income' ? 'Thu' : 'Chi'}
              </p>
            </div>
            <div>
              <p className="text-caption text-gray mb-md">Date Submitted</p>
              <p className="text-body font-medium text-black">
                {formatDate(transaction.transaction_date || transaction.created_at || '')}
              </p>
            </div>
          </div>
        </div>

        {/* Actions - Only show if pending */}
        {transaction.status === 'pending' && (
          <div className="p-xl border border-light-gray rounded-card bg-white">
            <h2 className="text-heading-3 font-bold text-black mb-lg">Actions</h2>

            <div className="space-y-lg">
              <button
                onClick={handleApprove}
                className="w-full py-lg px-lg bg-pale-green text-black rounded-card hover:bg-opacity-70 transition-colors font-bold text-body"
              >
                ✓ Approve Expense
              </button>

              {!showRejectForm ? (
                <button
                  onClick={() => setShowRejectForm(true)}
                  className="w-full py-lg px-lg bg-pale-red text-black rounded-card hover:bg-opacity-70 transition-colors font-bold text-body"
                >
                  ✗ Reject Expense
                </button>
              ) : (
                <div className="space-y-md p-lg border border-light-gray rounded-card bg-bone">
                  <label className="block">
                    <p className="text-caption text-gray mb-md font-medium">
                      Reason for rejection
                    </p>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Please provide a reason..."
                      rows={3}
                      className="w-full px-md py-md border border-light-gray rounded-card text-body focus:outline-none focus:border-black resize-none"
                    />
                  </label>
                  <div className="flex gap-md">
                    <Button
                      variant="secondary"
                      onClick={() => setShowRejectForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      onClick={handleRejectSubmit}
                      className="flex-1"
                    >
                      Confirm Rejection
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Info */}
        {transaction.status !== 'pending' && (
          <div
            className={`p-lg border rounded-card ${
              transaction.status === 'approved'
                ? 'border-pale-green bg-pale-green bg-opacity-30'
                : 'border-pale-red bg-pale-red bg-opacity-30'
            }`}
          >
            <p className="text-body font-medium text-black">
              {transaction.status === 'approved'
                ? '✓ This expense has been approved'
                : '✗ This expense has been rejected'}
            </p>
            {transaction.status === 'rejected' && transaction.rejection_reason && (
              <p className="text-small text-gray mt-md">Lý do: {transaction.rejection_reason}</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
