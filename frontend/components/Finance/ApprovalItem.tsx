'use client'

import React from 'react'
import { Approval } from '@/hooks/useFinance'

interface ApprovalItemProps {
  approval: Approval
  onApprove: (id: string) => void | Promise<void>
  onReject: (id: string, reason: string) => void | Promise<void>
  isLoading?: boolean
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
    month: 'short',
    day: 'numeric',
  })
}

export const ApprovalItem: React.FC<ApprovalItemProps> = ({
  approval,
  onApprove,
  onReject,
  isLoading = false,
}) => {
  const [isRejectingWithReason, setIsRejectingWithReason] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState('')

  const handleApprove = () => {
    if (isLoading) return
    onApprove(approval.id)
  }

  const handleRejectClick = () => {
    if (isLoading) return
    if (isRejectingWithReason) {
      if (!rejectReason.trim()) return // reason is required
      onReject(approval.id, rejectReason.trim())
      setIsRejectingWithReason(false)
      setRejectReason('')
    } else {
      setIsRejectingWithReason(true)
    }
  }

  return (
    <div className="p-lg border border-light-gray rounded-card bg-white hover:bg-bone transition-colors">
      <div className="flex items-start justify-between mb-md">
        <div>
          <h4 className="font-bold text-black mb-sm">{approval.description}</h4>
          <p className="text-small text-gray">{approval.submitted_by_name || approval.submitted_by}</p>
        </div>
        <p className="text-lg font-bold text-black">{formatCurrency(approval.amount)}</p>
      </div>

      <p className="text-caption text-gray mb-lg">{formatDate(approval.transaction_date || approval.created_at || '')}</p>

      {isRejectingWithReason && (
        <div className="mb-md p-md bg-pale-red border border-light-gray rounded-card">
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="Rejection reason (required)..."
            rows={2}
            className="w-full px-sm py-sm border border-light-gray rounded-card text-small focus:outline-none focus:border-black resize-none"
          />
        </div>
      )}

      <div className="flex gap-sm">
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className="flex-1 py-md px-sm bg-pale-green text-black rounded-card hover:bg-opacity-70 transition-colors font-medium text-small disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✓ Approve
        </button>
        <button
          onClick={handleRejectClick}
          disabled={isLoading || (isRejectingWithReason && !rejectReason.trim())}
          className="flex-1 py-md px-sm bg-pale-red text-black rounded-card hover:bg-opacity-70 transition-colors font-medium text-small disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRejectingWithReason ? '✗ Confirm Reject' : '✗ Reject'}
        </button>
      </div>
    </div>
  )
}
