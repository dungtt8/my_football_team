'use client'

import React from 'react'
import { Badge } from '@/components/Common/Badge'
import { Transaction } from '@/hooks/useFinance'

interface TransactionItemProps {
  transaction: Transaction
  onClick?: (id: string) => void
  showApprovalButtons?: boolean
  onApprove?: (id: string) => void
  onReject?: (id: string) => void
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

const getAmountColor = (status: string): string => {
  switch (status) {
    case 'approved':
      return 'text-pale-green'
    case 'rejected':
      return 'text-pale-red'
    case 'pending':
      return 'text-pale-yellow'
    default:
      return 'text-black'
  }
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
  transaction,
  onClick,
  showApprovalButtons = false,
  onApprove,
  onReject,
}) => {
  const statusVariant = getStatusVariant(transaction.status)

  return (
    <div
      className="p-lg border border-light-gray rounded-card bg-white hover:bg-bone transition-colors cursor-pointer flex items-center justify-between gap-lg"
      onClick={() => onClick?.(transaction.id)}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-md mb-md">
          <p className="font-bold text-black truncate">
            {transaction.description}
          </p>
          {transaction.category && (
            <Badge variant="info">{transaction.category}</Badge>
          )}
        </div>
        <p className="text-caption text-gray">
          {formatDate(transaction.createdAt)}
        </p>
      </div>

      <div className="flex items-center gap-lg">
        <div className="text-right">
          <p className={`text-lg font-bold ${getAmountColor(transaction.status)}`}>
            {formatCurrency(transaction.amount)}
          </p>
          <Badge variant={statusVariant}>
            {transaction.status.charAt(0).toUpperCase() +
              transaction.status.slice(1)}
          </Badge>
        </div>

        {showApprovalButtons && transaction.status === 'pending' && (
          <div className="flex gap-sm ml-lg">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onApprove?.(transaction.id)
              }}
              className="p-md bg-pale-green text-black rounded-card hover:bg-opacity-50 transition-colors text-sm font-medium"
              title="Approve"
            >
              ✓
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onReject?.(transaction.id)
              }}
              className="p-md bg-pale-red text-black rounded-card hover:bg-opacity-50 transition-colors text-sm font-medium"
              title="Reject"
            >
              ✗
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
