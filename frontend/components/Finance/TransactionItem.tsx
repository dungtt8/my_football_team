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

const STATUS_DOT: Record<string, string> = {
    approved: '#12B76A',
    rejected: '#F04438',
    pending: '#F5A623',
}

const STATUS_LABEL: Record<string, string> = {
    approved: 'Đã duyệt',
    rejected: 'Từ chối',
    pending: 'Chờ duyệt',
}

export const TransactionItem: React.FC<TransactionItemProps> = ({
    transaction,
    onClick,
    showApprovalButtons = false,
    onApprove,
    onReject,
}) => {
    const statusVariant = getStatusVariant(transaction.status)
    const dotColor = STATUS_DOT[transaction.status] || '#7A8699'

    return (
        <div
            className="group flex items-center gap-5 px-6 py-5 rounded-2xl cursor-pointer transition-all duration-200 hover:-translate-y-px"
            style={{
                background: '#FFFFFF',
                boxShadow: '0 1px 4px rgba(15, 14, 12, 0.06), 0 0 0 1px rgba(15, 14, 12, 0.04)',
            }}
            onClick={() => onClick?.(transaction.id)}
        >
            {/* Status dot */}
            <div
                className="flex-shrink-0 w-2 h-2 rounded-full"
                style={{ background: dotColor }}
            />

            {/* Description + date */}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: '#0B1220' }}>
                    {transaction.description}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs" style={{ color: '#7A8699' }}>
                        {formatDate(transaction.transaction_date || transaction.created_at || '')}
                    </p>
                    {transaction.transaction_type && (
                        <Badge variant="info">{transaction.transaction_type === 'income' ? 'Thu' : 'Chi'}</Badge>
                    )}
                </div>
            </div>

            {/* Amount + status */}
            <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                    <p className="text-sm font-semibold" style={{ color: '#0B1220' }}>
                        {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-[11px] font-medium mt-0.5" style={{ color: dotColor }}>
                        {STATUS_LABEL[transaction.status] || transaction.status}
                    </p>
                </div>

                {showApprovalButtons && transaction.status === 'pending' && (
                    <div className="flex gap-1.5">
                        <button
                            onClick={(e) => { e.stopPropagation(); onApprove?.(transaction.id) }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all active:scale-95"
                            style={{ background: '#D1F0E0', color: '#12B76A' }}
                            title="Approve"
                        >
                            ✓
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); onReject?.(transaction.id) }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold transition-all active:scale-95"
                            style={{ background: '#FEECEB', color: '#F04438' }}
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
